const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

// Update truck live location (authenticated - for truck owners)
router.post('/truck/:truckId/location', authenticate, async (req, res) => {
  try {
    const { latitude, longitude, heading, speed } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    // Verify ownership
    const truck = await prisma.truck.findFirst({
      where: { id: req.params.truckId, ownerId: req.user.id }
    });

    if (!truck) {
      return res.status(403).json({ error: 'Not authorized to update this truck' });
    }

    const location = await prisma.truckLiveLocation.upsert({
      where: { truckId: req.params.truckId },
      update: {
        latitude,
        longitude,
        heading,
        speed,
        isActive: true,
        lastUpdated: new Date()
      },
      create: {
        truckId: req.params.truckId,
        latitude,
        longitude,
        heading,
        speed,
        isActive: true
      }
    });

    // Emit to WebSocket clients if available
    const io = req.app.get('io');
    if (io) {
      io.to(`truck-${req.params.truckId}`).emit('location-update', {
        truckId: req.params.truckId,
        latitude,
        longitude,
        heading,
        speed,
        timestamp: new Date().toISOString()
      });

      // Broadcast to nearby subscribers
      io.emit('truck-nearby', {
        truckId: req.params.truckId,
        truckName: truck.name,
        latitude,
        longitude,
        cuisineType: truck.cuisineType
      });
    }

    res.json(location);
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Stop broadcasting location (authenticated)
router.delete('/truck/:truckId/location', authenticate, async (req, res) => {
  try {
    const truck = await prisma.truck.findFirst({
      where: { id: req.params.truckId, ownerId: req.user.id }
    });

    if (!truck) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.truckLiveLocation.updateMany({
      where: { truckId: req.params.truckId },
      data: { isActive: false }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`truck-${req.params.truckId}`).emit('location-stopped', {
        truckId: req.params.truckId
      });
    }

    res.json({ message: 'Location broadcasting stopped' });
  } catch (error) {
    console.error('Stop broadcasting error:', error);
    res.status(500).json({ error: 'Failed to stop broadcasting' });
  }
});

// Get nearby trucks (public)
router.get('/nearby', async (req, res) => {
  try {
    const { latitude, longitude, radius = 10 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const rad = parseFloat(radius);

    // Get all active truck locations
    const locations = await prisma.truckLiveLocation.findMany({
      where: { isActive: true },
      include: {
        truck: {
          select: {
            id: true,
            name: true,
            description: true,
            cuisineType: true,
            logo: true,
            phone: true
          }
        }
      }
    });

    // Filter by distance
    const nearbyTrucks = locations
      .map(loc => ({
        ...loc,
        distance: calculateDistance(lat, lon, loc.latitude, loc.longitude)
      }))
      .filter(loc => loc.distance <= rad)
      .sort((a, b) => a.distance - b.distance);

    res.json(nearbyTrucks);
  } catch (error) {
    console.error('Get nearby trucks error:', error);
    res.status(500).json({ error: 'Failed to get nearby trucks' });
  }
});

// Get current location for a specific truck (public)
router.get('/truck/:truckId/current', async (req, res) => {
  try {
    const location = await prisma.truckLiveLocation.findUnique({
      where: { truckId: req.params.truckId },
      include: {
        truck: {
          select: {
            id: true,
            name: true,
            description: true,
            cuisineType: true,
            logo: true,
            phone: true
          }
        }
      }
    });

    if (!location || !location.isActive) {
      return res.status(404).json({ error: 'Truck is not currently broadcasting' });
    }

    res.json(location);
  } catch (error) {
    console.error('Get truck location error:', error);
    res.status(500).json({ error: 'Failed to get truck location' });
  }
});

// Subscribe to location updates (public)
router.post('/subscribe', async (req, res) => {
  try {
    const { email, phone, pushToken, latitude, longitude, radius } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Location is required' });
    }

    if (!email && !phone && !pushToken) {
      return res.status(400).json({ error: 'At least one contact method is required' });
    }

    const subscription = await prisma.locationSubscription.create({
      data: {
        email,
        phone,
        pushToken,
        latitude,
        longitude,
        radius: radius || 5,
        isActive: true
      }
    });

    res.status(201).json(subscription);
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

// Unsubscribe from notifications
router.delete('/subscription/:id', async (req, res) => {
  try {
    await prisma.locationSubscription.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });

    res.json({ message: 'Unsubscribed successfully' });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

// Get all active broadcasting trucks (public)
router.get('/active', async (req, res) => {
  try {
    const locations = await prisma.truckLiveLocation.findMany({
      where: { isActive: true },
      include: {
        truck: {
          select: {
            id: true,
            name: true,
            description: true,
            cuisineType: true,
            logo: true
          }
        }
      }
    });

    res.json(locations);
  } catch (error) {
    console.error('Get active trucks error:', error);
    res.status(500).json({ error: 'Failed to get active trucks' });
  }
});

module.exports = router;
