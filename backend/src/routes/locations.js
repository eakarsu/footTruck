const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getPaginationParams, paginatedResponse } = require('../utils/pagination');
const { sendCSV, sendPDF } = require('../utils/exportHelpers');
const { exportLimiter } = require('../middleware/rateLimiter');
const prisma = require('../lib/prisma');

const router = express.Router();

// Get all locations (with pagination and search)
router.get('/', authenticate, async (req, res) => {
  try {
    const { page, limit, skip, search } = getPaginationParams(req.query);

    const whereClause = {};
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [locations, total] = await Promise.all([
      prisma.location.findMany({
        where: whereClause,
        include: { truckLocations: { include: { truck: true } } },
        skip,
        take: limit
      }),
      prisma.location.count({ where: whereClause })
    ]);

    res.json(paginatedResponse(locations, total, page, limit));
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({ error: 'Failed to get locations' });
  }
});

// Get single location
router.get('/:id', authenticate, async (req, res) => {
  try {
    const location = await prisma.location.findUnique({
      where: { id: req.params.id },
      include: {
        truckLocations: {
          include: { truck: true }
        },
        events: true
      }
    });

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json(location);
  } catch (error) {
    console.error('Get location error:', error);
    res.status(500).json({ error: 'Failed to get location' });
  }
});

// Create location
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, address, city, state, zipCode, latitude, longitude, type, notes } = req.body;

    const location = await prisma.location.create({
      data: {
        name,
        address,
        city,
        state,
        zipCode,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        type: type || 'STREET',
        notes
      }
    });

    res.status(201).json(location);
  } catch (error) {
    console.error('Create location error:', error);
    res.status(500).json({ error: 'Failed to create location' });
  }
});

// Update location
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, address, city, state, zipCode, latitude, longitude, type, notes } = req.body;

    const location = await prisma.location.update({
      where: { id: req.params.id },
      data: {
        name,
        address,
        city,
        state,
        zipCode,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        type,
        notes
      }
    });

    res.json(location);
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Delete location
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await prisma.location.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Location deleted successfully' });
  } catch (error) {
    console.error('Delete location error:', error);
    res.status(500).json({ error: 'Failed to delete location' });
  }
});

// ==================== TRUCK LOCATIONS (BOOKINGS) ====================

// Get truck location calendar
router.get('/truck/:truckId/calendar', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const whereClause = {
      truckId: req.params.truckId
    };

    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const truckLocations = await prisma.truckLocation.findMany({
      where: whereClause,
      include: { location: true },
      orderBy: { date: 'asc' }
    });

    res.json(truckLocations);
  } catch (error) {
    console.error('Get calendar error:', error);
    res.status(500).json({ error: 'Failed to get calendar' });
  }
});

// Book location for truck
router.post('/truck/:truckId/book', authenticate, async (req, res) => {
  try {
    const { locationId, date, startTime, endTime, notes } = req.body;

    const truckLocation = await prisma.truckLocation.create({
      data: {
        truckId: req.params.truckId,
        locationId,
        date: new Date(date),
        startTime,
        endTime,
        notes,
        status: 'SCHEDULED'
      },
      include: { location: true }
    });

    res.status(201).json(truckLocation);
  } catch (error) {
    console.error('Book location error:', error);
    res.status(500).json({ error: 'Failed to book location' });
  }
});

// Update truck location booking
router.put('/booking/:id', authenticate, async (req, res) => {
  try {
    const { date, startTime, endTime, status, revenue, customerCount, notes } = req.body;

    const booking = await prisma.truckLocation.update({
      where: { id: req.params.id },
      data: {
        date: date ? new Date(date) : undefined,
        startTime,
        endTime,
        status,
        revenue: revenue ? parseFloat(revenue) : undefined,
        customerCount: customerCount ? parseInt(customerCount) : undefined,
        notes
      },
      include: { location: true }
    });

    res.json(booking);
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

// Delete booking
router.delete('/booking/:id', authenticate, async (req, res) => {
  try {
    await prisma.truckLocation.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Delete booking error:', error);
    res.status(500).json({ error: 'Failed to delete booking' });
  }
});

// Get location history with revenue
router.get('/truck/:truckId/history', authenticate, async (req, res) => {
  try {
    const history = await prisma.truckLocation.findMany({
      where: {
        truckId: req.params.truckId,
        status: 'COMPLETED'
      },
      include: { location: true },
      orderBy: { date: 'desc' }
    });

    // Group by location and calculate stats
    const locationStats = {};
    history.forEach(h => {
      const locId = h.locationId;
      if (!locationStats[locId]) {
        locationStats[locId] = {
          location: h.location,
          visits: 0,
          totalRevenue: 0,
          totalCustomers: 0
        };
      }
      locationStats[locId].visits++;
      locationStats[locId].totalRevenue += h.revenue || 0;
      locationStats[locId].totalCustomers += h.customerCount || 0;
    });

    res.json({
      history,
      stats: Object.values(locationStats).map(s => ({
        ...s,
        averageRevenue: s.visits > 0 ? s.totalRevenue / s.visits : 0,
        averageCustomers: s.visits > 0 ? s.totalCustomers / s.visits : 0
      }))
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to get location history' });
  }
});

// ==================== BULK OPERATIONS ====================

// Bulk delete locations
router.delete('/bulk-delete', authenticate, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ error: 'No IDs provided' });
    await prisma.location.deleteMany({ where: { id: { in: ids } } });
    res.json({ message: `${ids.length} locations deleted successfully` });
  } catch (error) {
    console.error('Bulk delete locations error:', error);
    res.status(500).json({ error: 'Failed to bulk delete locations' });
  }
});

// Bulk update locations
router.patch('/bulk-update', authenticate, async (req, res) => {
  try {
    const { ids, data } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ error: 'No IDs provided' });
    await prisma.location.updateMany({ where: { id: { in: ids } }, data });
    res.json({ message: `${ids.length} locations updated successfully` });
  } catch (error) {
    console.error('Bulk update locations error:', error);
    res.status(500).json({ error: 'Failed to bulk update locations' });
  }
});

// Export locations as CSV
router.get('/export/csv', authenticate, exportLimiter, async (req, res) => {
  try {
    const locations = await prisma.location.findMany({ orderBy: { name: 'asc' } });
    const data = locations.map(l => ({
      name: l.name, address: l.address, city: l.city, state: l.state,
      zipCode: l.zipCode, type: l.type, latitude: l.latitude || '', longitude: l.longitude || ''
    }));
    sendCSV(res, data, ['name', 'address', 'city', 'state', 'zipCode', 'type', 'latitude', 'longitude'], 'locations-export');
  } catch (error) {
    res.status(500).json({ error: 'Failed to export locations' });
  }
});

// Export locations as PDF
router.get('/export/pdf', authenticate, exportLimiter, async (req, res) => {
  try {
    const locations = await prisma.location.findMany({ orderBy: { name: 'asc' } });
    const columns = ['Name', 'Address', 'City', 'State', 'Type'];
    const rows = locations.map(l => [l.name, l.address, l.city, l.state, l.type]);
    sendPDF(res, 'Locations Report', columns, rows, 'locations-export');
  } catch (error) {
    res.status(500).json({ error: 'Failed to export locations' });
  }
});

module.exports = router;
