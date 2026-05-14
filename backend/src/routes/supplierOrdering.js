// Supplier ordering agent — auto-PO based on forecast + on-hand.
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const openrouter = require('../services/openrouter');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/ai/supplier-ordering/plan — propose a purchase order.
router.post('/plan', authenticate, async (req, res) => {
  try {
    const { truckId, horizonDays = 7 } = req.body;
    if (!truckId) return res.status(400).json({ error: 'truckId required' });

    const inventory = await prisma.inventoryItem.findMany({ where: { truckId } }).catch(() => []);
    if (!inventory.length) {
      return res.json({ truckId, horizonDays, items: [], note: 'No inventory tracked' });
    }

    // Simple usage estimate: assume reorderLevel ~ daily usage * 2.
    const planned = inventory.map(inv => {
      const dailyUsage = inv.reorderLevel ? inv.reorderLevel / 2 : 1;
      const need = Math.max(0, dailyUsage * horizonDays - (inv.quantity || 0));
      return {
        id: inv.id,
        name: inv.name,
        onHand: inv.quantity,
        reorderLevel: inv.reorderLevel,
        suggestedOrderQty: Math.ceil(need),
        unit: inv.unit || 'unit'
      };
    }).filter(p => p.suggestedOrderQty > 0);

    let aiNotes = '';
    try {
      aiNotes = await openrouter.chat([
        { role: 'system', content: 'You are a procurement assistant. Recommend supplier strategy in 3 bullets.' },
        { role: 'user', content: `Need to order: ${JSON.stringify(planned).slice(0, 1200)}. Horizon ${horizonDays}d.` }
      ], { maxTokens: 300 });
    } catch {}

    res.json({
      truckId,
      horizonDays,
      generatedAt: new Date().toISOString(),
      items: planned,
      totalLineItems: planned.length,
      notes: aiNotes
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/ai/supplier-ordering/submit — persist PO as an AIRecommendation row.
router.post('/submit', authenticate, async (req, res) => {
  try {
    const { truckId, items, supplier } = req.body;
    if (!truckId || !Array.isArray(items)) {
      return res.status(400).json({ error: 'truckId and items[] required' });
    }
    let record = null;
    try {
      record = await prisma.aIRecommendation.create({
        data: {
          truckId,
          type: 'supplier_po',
          content: JSON.stringify({ supplier: supplier || 'TBD', items, submittedAt: new Date() })
        }
      });
    } catch {}
    // TODO: configure credentials for supplier portal API (process.env.SUPPLIER_API_KEY).
    res.json({ ok: true, recordId: record?.id, supplier, itemCount: items.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
