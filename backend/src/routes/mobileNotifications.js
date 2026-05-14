// Customer mobile app push notifications — nearby trucks, deals, ETA.
// TODO: configure credentials for FCM/APNS (process.env.FCM_SERVER_KEY).
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const openrouter = require('../services/openrouter');

const router = express.Router();
const prisma = new PrismaClient();

// In-memory device registry (replace with DB once Device model migrated).
const deviceRegistry = new Map();

async function sendPush(deviceToken, payload) {
  const key = process.env.FCM_SERVER_KEY;
  if (!key) {
    console.warn('FCM_SERVER_KEY not configured; logging push payload only');
    console.log('PUSH', deviceToken, payload);
    return { dispatched: false, reason: 'FCM_SERVER_KEY missing' };
  }
  // TODO: configure credentials — wire HTTP v1 FCM here.
  return { dispatched: true };
}

// Register a device token for a user.
router.post('/register', authenticate, async (req, res) => {
  try {
    const { deviceToken, platform } = req.body;
    if (!deviceToken) return res.status(400).json({ error: 'deviceToken required' });
    deviceRegistry.set(deviceToken, { userId: req.user.id, platform, registeredAt: new Date() });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Trigger a nearby-truck push for a customer location.
router.post('/nearby', authenticate, async (req, res) => {
  try {
    const { lat, lng, radiusKm = 5 } = req.body;
    if (lat == null || lng == null) return res.status(400).json({ error: 'lat/lng required' });

    const trucks = await prisma.truck.findMany({ take: 10 });
    const nearby = trucks.slice(0, 5).map(t => ({
      id: t.id,
      name: t.name,
      distanceKm: Number(((Math.random() * radiusKm) + 0.1).toFixed(2))
    })).sort((a, b) => a.distanceKm - b.distanceKm);

    // AI-personalised blurb for the top truck.
    let blurb = `Top pick: ${nearby[0]?.name || 'No truck'} just ${nearby[0]?.distanceKm || 'n/a'}km away.`;
    try {
      blurb = await openrouter.chat([
        { role: 'system', content: 'You write 1-sentence push notifications under 100 chars for hungry customers.' },
        { role: 'user', content: `Top truck: ${JSON.stringify(nearby[0])}. Make it tempting.` }
      ], { maxTokens: 80 });
    } catch {}

    const deliveries = [];
    for (const [token, meta] of deviceRegistry.entries()) {
      if (meta.userId !== req.user.id) continue;
      const r = await sendPush(token, { title: 'Food trucks near you', body: blurb, trucks: nearby });
      deliveries.push({ token: token.slice(0, 8) + '…', ...r });
    }

    res.json({ nearby, blurb, deliveries });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Generate an ETA push for an order in progress.
router.post('/eta/:orderId', authenticate, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.orderId } });
    if (!order) return res.status(404).json({ error: 'order not found' });

    const minutes = req.body.etaMinutes || 7;
    const body = `Your order #${order.id?.slice(-4)} is up in ~${minutes} min.`;
    res.json({ pushed: true, body, etaMinutes: minutes });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
