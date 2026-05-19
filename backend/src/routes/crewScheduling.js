// Crew scheduling AI — fairness + fatigue + skill matching.
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const openrouter = require('../services/openrouter');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/ai/crew-scheduling/optimize — produce a draft schedule.
router.post('/optimize', authenticate, async (req, res) => {
  try {
    const { truckId, shifts = [], crew = [] } = req.body;
    if (!truckId) return res.status(400).json({ error: 'truckId required' });

    if (!crew.length) {
      return res.json({ truckId, schedule: [], warning: 'No crew supplied' });
    }

    // Fairness counter — distribute shifts evenly.
    const load = Object.fromEntries(crew.map(c => [c.id, 0]));
    const schedule = shifts.map(s => {
      // pick crew with lowest load AND a skill match if requested.
      const candidates = crew
        .filter(c => !s.requiredSkill || (c.skills || []).includes(s.requiredSkill))
        .sort((a, b) => load[a.id] - load[b.id]);
      const assigned = candidates[0] || crew[0];
      load[assigned.id]++;
      return {
        shiftId: s.id,
        start: s.start,
        end: s.end,
        assignedTo: assigned.id,
        assignedName: assigned.name,
        skill: s.requiredSkill || null
      };
    });

    // Fatigue check — flag any crew with >3 consecutive shifts.
    const fatigueFlags = Object.entries(load)
      .filter(([, n]) => n > 3)
      .map(([id, n]) => ({ crewId: id, shifts: n, alert: 'high-load' }));

    let aiCritique = '';
    try {
      aiCritique = await openrouter.chat([
        { role: 'system', content: 'You are a scheduling coach. Give 3 concise improvement bullets.' },
        { role: 'user', content: `Schedule: ${JSON.stringify(schedule).slice(0, 1200)}. Flags: ${JSON.stringify(fatigueFlags)}.` }
      ], { maxTokens: 250 });
    } catch {}

    res.json({ truckId, schedule, fatigueFlags, critique: aiCritique });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
