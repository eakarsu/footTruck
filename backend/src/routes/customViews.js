// Custom Views for Food Truck Operations
// Four endpoints supporting the 4 custom features:
//  - GET /location-map        -> planned + current location per day for the truck
//  - GET /sales-trend         -> daily sales for the last 30 days
//  - POST /daily-sales-pdf    -> stream a PDF with items sold, gross, tax, net for a date
//  - GET/POST /scheduler      -> CRUD for future location time-slots
const express = require('express');
const PDFDocument = require('pdfkit');

const router = express.Router();

// ---- in-memory seed data (deterministic) ---------------------------------
function dayKey(d) {
  return d.toISOString().slice(0, 10);
}

function buildLast30DaysSales() {
  const out = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    // semi-deterministic pseudo-random based on date
    const seed = (d.getDate() * 13 + d.getMonth() * 31 + 7) % 19;
    const orders = 35 + seed * 4;
    const gross = orders * (11 + (seed % 5));
    out.push({
      date: dayKey(d),
      orders,
      gross: Math.round(gross * 100) / 100,
      net: Math.round(gross * 0.91 * 100) / 100,
    });
  }
  return out;
}

function buildLocationDays() {
  // Centered around San Francisco for the demo truck
  const base = { lat: 37.7749, lng: -122.4194 };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today.getTime() + i * 86400000);
    const jitter = i * 0.005;
    days.push({
      date: dayKey(d),
      planned: {
        name: `Planned Stop ${i + 1}`,
        lat: base.lat + jitter,
        lng: base.lng - jitter,
        start: '11:00',
        end: '14:00',
      },
      current: i === 0
        ? { name: 'Current Position', lat: base.lat + 0.002, lng: base.lng - 0.002 }
        : null,
    });
  }
  return days;
}

function buildItemsForDate(date) {
  const items = [
    { name: 'Korean BBQ Tacos', qty: 42, price: 11.5 },
    { name: 'Spicy Pork Burrito', qty: 31, price: 12.0 },
    { name: 'Kimchi Fries', qty: 55, price: 7.5 },
    { name: 'Bulgogi Bowl', qty: 24, price: 13.0 },
    { name: 'Soft Drink', qty: 80, price: 3.0 },
  ];
  const seedNum = date.split('-').reduce((a, b) => a + Number(b), 0);
  return items.map((it, idx) => ({
    ...it,
    qty: it.qty + ((seedNum + idx * 3) % 11),
  }));
}

// ---- module-level scheduler store ----------------------------------------
const scheduledSlots = [
  // sample initial slots
  { id: 1, date: dayKey(new Date(Date.now() + 86400000)), start: '11:00', end: '14:00', location: 'Civic Center Plaza', lat: 37.7793, lng: -122.4193 },
  { id: 2, date: dayKey(new Date(Date.now() + 2 * 86400000)), start: '17:00', end: '21:00', location: 'Mission Dolores Park', lat: 37.7596, lng: -122.4269 },
];
let nextSlotId = scheduledSlots.length + 1;

// ---- routes --------------------------------------------------------------

router.get('/', (_req, res) => {
  res.json({
    name: 'Custom Views',
    endpoints: [
      'GET /api/custom-views/location-map',
      'GET /api/custom-views/sales-trend',
      'POST /api/custom-views/daily-sales-pdf  { date }',
      'GET /api/custom-views/scheduler',
      'POST /api/custom-views/scheduler { date, start, end, location, lat, lng }',
      'DELETE /api/custom-views/scheduler/:id',
    ],
  });
});

// VIZ 1: planned + current location markers per day
router.get('/location-map', (_req, res) => {
  res.json({ truck: 'Demo Food Truck', days: buildLocationDays() });
});

// VIZ 2: daily sales over the last 30 days
router.get('/sales-trend', (_req, res) => {
  res.json({ truck: 'Demo Food Truck', range: 'last_30_days', series: buildLast30DaysSales() });
});

// NON-VIZ 1: daily sales PDF
router.post('/daily-sales-pdf', (req, res) => {
  const date = (req.body && req.body.date) || dayKey(new Date());
  const items = buildItemsForDate(date);
  const gross = items.reduce((s, it) => s + it.qty * it.price, 0);
  const tax = Math.round(gross * 0.0875 * 100) / 100;
  const net = Math.round((gross - tax) * 100) / 100;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="daily-sales-${date}.pdf"`);

  const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
  doc.pipe(res);

  doc.fontSize(20).text('Daily Sales Report', { align: 'center' });
  doc.moveDown(0.4);
  doc.fontSize(12).fillColor('#475569').text(`Truck: Demo Food Truck`, { align: 'center' });
  doc.text(`Date: ${date}`, { align: 'center' });
  doc.moveDown(1);

  doc.fillColor('#111827').fontSize(13).text('Items sold', { underline: true });
  doc.moveDown(0.4);
  doc.fontSize(11);
  doc.text('Item', 50, doc.y, { continued: true });
  doc.text('Qty', 320, doc.y, { continued: true });
  doc.text('Price', 380, doc.y, { continued: true });
  doc.text('Subtotal', 460, doc.y);
  doc.moveTo(50, doc.y + 2).lineTo(560, doc.y + 2).strokeColor('#cbd5e1').stroke();
  doc.moveDown(0.4);
  items.forEach((it) => {
    const subtotal = it.qty * it.price;
    doc.fillColor('#111827');
    doc.text(it.name, 50, doc.y, { continued: true });
    doc.text(String(it.qty), 320, doc.y, { continued: true });
    doc.text(`$${it.price.toFixed(2)}`, 380, doc.y, { continued: true });
    doc.text(`$${subtotal.toFixed(2)}`, 460, doc.y);
  });

  doc.moveDown(1.2);
  doc.fontSize(13).fillColor('#111827').text('Totals', { underline: true });
  doc.moveDown(0.4);
  doc.fontSize(12);
  doc.text(`Gross:    $${gross.toFixed(2)}`);
  doc.text(`Tax 8.75%: $${tax.toFixed(2)}`);
  doc.text(`Net:      $${net.toFixed(2)}`);

  doc.moveDown(2);
  doc.fontSize(9).fillColor('#94a3b8').text('Generated by FoodTruck AI Custom Views', { align: 'center' });

  doc.end();
});

// NON-VIZ 2: location scheduler — list / create / delete
router.get('/scheduler', (_req, res) => {
  res.json({ items: scheduledSlots });
});

router.post('/scheduler', (req, res) => {
  const body = req.body || {};
  if (!body.date || !body.start || !body.end || !body.location) {
    return res.status(400).json({ error: 'date, start, end and location are required' });
  }
  const slot = {
    id: nextSlotId++,
    date: String(body.date),
    start: String(body.start),
    end: String(body.end),
    location: String(body.location),
    lat: typeof body.lat === 'number' ? body.lat : null,
    lng: typeof body.lng === 'number' ? body.lng : null,
  };
  scheduledSlots.push(slot);
  res.status(201).json(slot);
});

router.delete('/scheduler/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = scheduledSlots.findIndex((s) => s.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  const [removed] = scheduledSlots.splice(idx, 1);
  res.json({ removed });
});

module.exports = router;
