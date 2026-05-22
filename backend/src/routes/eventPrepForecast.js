const express = require('express');

const router = express.Router();

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

router.post('/forecast', (req, res) => {
  const {
    eventName = 'Untitled event',
    expectedFootfall = 650,
    serviceHours = 4,
    weather = 'mild',
    menuMix = [
      { item: 'Tacos', share: 45, prepMinutes: 3 },
      { item: 'Bowls', share: 35, prepMinutes: 4 },
      { item: 'Drinks', share: 20, prepMinutes: 1 },
    ],
  } = req.body || {};

  const footfall = Math.max(0, toNumber(expectedFootfall, 650));
  const hours = Math.max(1, toNumber(serviceHours, 4));
  const weatherFactor = String(weather).toLowerCase().includes('rain')
    ? 0.74
    : String(weather).toLowerCase().includes('hot')
      ? 1.14
      : 1;
  const expectedOrders = Math.round(footfall * 0.18 * weatherFactor);
  const peakHourlyOrders = Math.ceil((expectedOrders / hours) * 1.35);

  const items = (Array.isArray(menuMix) ? menuMix : []).map((entry) => {
    const share = Math.max(0, toNumber(entry.share, 0));
    const units = Math.ceil((expectedOrders * share) / 100);
    const prepMinutes = Math.max(1, toNumber(entry.prepMinutes, 2));
    return {
      item: entry.item || 'Menu item',
      units,
      parWithBuffer: Math.ceil(units * 1.12),
      prepLaborMinutes: units * prepMinutes,
    };
  });

  const totalPrepMinutes = items.reduce((sum, item) => sum + item.prepLaborMinutes, 0);
  const crewNeeded = Math.max(2, Math.ceil(peakHourlyOrders / 32));

  res.json({
    eventName,
    expectedOrders,
    peakHourlyOrders,
    crewNeeded,
    prepHours: Number((totalPrepMinutes / 60).toFixed(1)),
    items,
    checklist: [
      `Stage ${Math.ceil(expectedOrders * 0.65)} compostable trays before service.`,
      `Load ${crewNeeded + 1} handheld terminals for peak line coverage.`,
      peakHourlyOrders > 45 ? 'Open an express pickup lane for pre-orders.' : 'Keep one cashier floating between prep and pickup.',
    ],
  });
});

module.exports = router;
