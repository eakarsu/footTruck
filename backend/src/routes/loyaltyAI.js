// Loyalty program with AI personalized offers.
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const openrouter = require('../services/openrouter');

const router = express.Router();
const prisma = new PrismaClient();

// In-memory loyalty ledger (replace with Loyalty model + migration when ready).
const ledger = new Map();

function ensureProfile(customerId) {
  if (!ledger.has(customerId)) {
    ledger.set(customerId, { customerId, points: 0, tier: 'bronze', history: [] });
  }
  return ledger.get(customerId);
}

function tierFor(points) {
  if (points > 500) return 'platinum';
  if (points > 250) return 'gold';
  if (points > 100) return 'silver';
  return 'bronze';
}

// POST /api/ai/loyalty/earn — record points for an order.
router.post('/earn', authenticate, async (req, res) => {
  try {
    const { customerId, orderId, amount } = req.body;
    if (!customerId || amount == null) return res.status(400).json({ error: 'customerId & amount required' });
    const profile = ensureProfile(customerId);
    const earned = Math.floor(amount);
    profile.points += earned;
    profile.tier = tierFor(profile.points);
    profile.history.push({ orderId, amount, earned, at: new Date() });
    res.json({ profile, earned });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/ai/loyalty/personalized-offer — generate a tailored offer.
router.post('/personalized-offer', authenticate, async (req, res) => {
  try {
    const { customerId, truckId } = req.body;
    if (!customerId) return res.status(400).json({ error: 'customerId required' });

    const profile = ensureProfile(customerId);
    const orders = await prisma.order.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 20
    }).catch(() => []);

    const truck = truckId ? await prisma.truck.findUnique({ where: { id: truckId } }).catch(() => null) : null;

    let offer = { headline: '10% off your next order', code: `LOYAL${profile.points}` };
    try {
      const raw = await openrouter.chat([
        {
          role: 'system',
          content: 'You craft 1-paragraph loyalty offers. Return JSON {"headline":string,"body":string,"code":string,"discountPct":number}.'
        },
        {
          role: 'user',
          content: `Customer tier=${profile.tier}, points=${profile.points}. Recent orders: ${orders.slice(0, 5).map(o => o.total).join(',')}. Truck=${truck?.name || 'n/a'}.`
        }
      ], { maxTokens: 280 });
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) offer = JSON.parse(m[0]);
    } catch {}

    res.json({ profile, offer });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/ai/loyalty/:customerId — fetch profile.
router.get('/:customerId', authenticate, async (req, res) => {
  res.json(ensureProfile(req.params.customerId));
});

module.exports = router;
