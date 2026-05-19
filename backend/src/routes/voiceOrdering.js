// Voice ordering through phone / drive-up kiosk.
// TODO: configure credentials for Twilio (process.env.TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN).
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const openrouter = require('../services/openrouter');

const router = express.Router();
const prisma = new PrismaClient();

// In-memory sessions; replace with Redis for production.
const sessions = new Map();

// POST /api/ai/voice-ordering/start — open a new voice order session.
router.post('/start', authenticate, async (req, res) => {
  try {
    const { truckId, channel = 'phone' } = req.body;
    const id = `voice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessions.set(id, { id, truckId, channel, transcript: [], cart: [], createdAt: new Date() });
    res.json({ sessionId: id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/ai/voice-ordering/:sessionId/utterance — caller speaks.
router.post('/:sessionId/utterance', authenticate, async (req, res) => {
  try {
    const session = sessions.get(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'session not found' });

    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });
    session.transcript.push({ role: 'user', text, at: new Date() });

    const menuItems = await prisma.menuItem.findMany({
      where: session.truckId ? { truckId: session.truckId } : {},
      take: 50
    }).catch(() => []);

    let reply = "I'm sorry, the AI is offline. Could you repeat?";
    try {
      reply = await openrouter.chat([
        {
          role: 'system',
          content: `You are a friendly food-truck voice agent. Take orders, confirm items, suggest add-ons.
Menu: ${menuItems.map(m => `${m.name} ($${m.price})`).slice(0, 30).join(', ')}.
Respond conversationally in <=2 sentences.`
        },
        ...session.transcript.slice(-6).map(t => ({ role: t.role, content: t.text }))
      ], { maxTokens: 200 });
    } catch (e) {
      console.error('voice ai error', e.message);
    }
    session.transcript.push({ role: 'assistant', text: reply, at: new Date() });
    res.json({ reply });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/ai/voice-ordering/:sessionId/finalize — commit cart to an order.
router.post('/:sessionId/finalize', authenticate, async (req, res) => {
  try {
    const session = sessions.get(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'session not found' });
    const { cart = session.cart } = req.body;
    let orderId = null;
    try {
      const order = await prisma.order.create({
        data: {
          truckId: session.truckId,
          status: 'PENDING',
          source: 'voice',
          total: cart.reduce((s, c) => s + (c.price || 0) * (c.qty || 1), 0)
        }
      });
      orderId = order.id;
    } catch (e) {
      console.warn('order persist failed:', e.message);
    }
    sessions.delete(req.params.sessionId);
    res.json({ ok: true, orderId, cart });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
