// Dynamic pricing engine — demand × weather × inventory.
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const openrouter = require('../services/openrouter');

const router = express.Router();
const prisma = new PrismaClient();

function pricingMultiplier({ demandScore = 50, weatherFactor = 1, inventoryStress = 0 }) {
  // Demand 0-100 → 0.85-1.20; weather 0-2; inventory 0-1 (1 = nearly out).
  let m = 0.85 + (demandScore / 100) * 0.35;
  m *= weatherFactor;
  m *= 1 + inventoryStress * 0.15;
  return Number(Math.max(0.7, Math.min(1.6, m)).toFixed(3));
}

// POST /api/ai/dynamic-pricing/suggest — get adjusted prices for a menu.
router.post('/suggest', authenticate, async (req, res) => {
  try {
    const { truckId, weatherFactor = 1.0, demandScore } = req.body;
    if (!truckId) return res.status(400).json({ error: 'truckId required' });

    const menuItems = await prisma.menuItem.findMany({ where: { truckId } }).catch(() => []);
    const inventory = await prisma.inventoryItem.findMany({ where: { truckId } }).catch(() => []);

    // crude demand inferrence from recent orders
    const recentOrders = await prisma.order.count({
      where: { truckId, createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60) } }
    }).catch(() => 0);
    const demand = demandScore != null ? demandScore : Math.min(100, recentOrders * 10);

    const stressByItem = new Map();
    for (const inv of inventory) {
      const stress = inv.quantity != null && inv.reorderLevel != null && inv.reorderLevel > 0
        ? Math.max(0, 1 - inv.quantity / Math.max(1, inv.reorderLevel))
        : 0;
      stressByItem.set(inv.name?.toLowerCase?.() || '', stress);
    }

    const adjusted = menuItems.map(item => {
      const stress = stressByItem.get(item.name?.toLowerCase?.() || '') || 0;
      const mult = pricingMultiplier({ demandScore: demand, weatherFactor, inventoryStress: stress });
      return {
        id: item.id,
        name: item.name,
        basePrice: item.price,
        multiplier: mult,
        suggestedPrice: item.price ? Number((item.price * mult).toFixed(2)) : null,
        reason: `demand=${demand}, weather=${weatherFactor}, stress=${stress.toFixed(2)}`
      };
    });

    // Have the LLM summarize the strategy in one paragraph.
    let summary = '';
    try {
      summary = await openrouter.chat([
        { role: 'system', content: 'You are a pricing analyst. Write one short paragraph.' },
        { role: 'user', content: `Adjusted prices: ${JSON.stringify(adjusted).slice(0, 1500)}. Summarise the strategy.` }
      ], { maxTokens: 200 });
    } catch {}

    res.json({ demand, weatherFactor, adjusted, summary });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
