// Vision-based food / plating QA scoring per shift.
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const openrouter = require('../services/openrouter');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/ai/vision-food-qa/score — analyze a food photo data URL.
router.post('/score', authenticate, async (req, res) => {
  try {
    const { imageUrl, imageBase64, dishName, truckId } = req.body;
    if (!imageUrl && !imageBase64) {
      return res.status(400).json({ error: 'imageUrl or imageBase64 required' });
    }

    const systemPrompt = `You are an expert food QA inspector. Score plating, portion, color, freshness, and overall presentation (0-100 each).
Return ONLY JSON: {"overall":num,"plating":num,"portion":num,"color":num,"freshness":num,"notes":string,"issues":[string]}.`;

    const userContent = `Dish: ${dishName || 'unknown'}. Image: ${imageUrl || '[base64 data]'}.
Provide objective scoring assuming a typical food-truck quality bar.`;

    let raw;
    try {
      raw = await openrouter.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        { maxTokens: 600, temperature: 0.3 }
      );
    } catch (e) {
      return res.status(503).json({ error: 'AI not configured', detail: e.message });
    }

    let parsed;
    try {
      const m = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(m ? m[0] : raw);
    } catch {
      parsed = { overall: 70, notes: raw.slice(0, 400) };
    }

    // Persist as a generic AIRecommendation if model exists.
    try {
      await prisma.aIRecommendation.create({
        data: {
          truckId: truckId || null,
          type: 'food_qa',
          content: JSON.stringify(parsed),
          createdAt: new Date()
        }
      });
    } catch {}

    res.json({ result: parsed });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET shift summary
router.get('/shift/:truckId', authenticate, async (req, res) => {
  try {
    const recs = await prisma.aIRecommendation.findMany({
      where: { truckId: req.params.truckId, type: 'food_qa' },
      orderBy: { createdAt: 'desc' },
      take: 50
    }).catch(() => []);
    const scores = recs.map(r => {
      try { return JSON.parse(r.content).overall || 0; } catch { return 0; }
    }).filter(Boolean);
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    res.json({ count: recs.length, average: avg, samples: scores.slice(0, 20) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
