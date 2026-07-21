const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireTruckAccess } = require('../middleware/truckAccess');
const prisma = require('../lib/prisma');

const router = express.Router();
// Get all trucks for user
router.get('/', authenticate, async (req, res) => {
  try {
    const trucks = await prisma.truck.findMany({
      where: {
        OR: [
          { ownerId: req.user.id },
          { memberships: { some: { userId: req.user.id, isActive: true } } }
        ]
      },
      include: {
        locations: {
          include: { location: true },
          take: 5,
          orderBy: { date: 'desc' }
        },
        menus: true,
        memberships: {
          where: { userId: req.user.id, isActive: true },
          select: { role: true }
        }
      }
    });
    res.json(trucks.map(({ memberships, ...truck }) => ({
      ...truck,
      accessRole: truck.ownerId === req.user.id || req.user.role === 'ADMIN' ? 'MANAGER' : memberships[0]?.role
    })));
  } catch (error) {
    console.error('Get trucks error:', error);
    res.status(500).json({ error: 'Failed to get trucks' });
  }
});

// Get single truck
router.get('/:id', authenticate, async (req, res) => {
  try {
    const truck = await prisma.truck.findFirst({
      where: {
        id: req.params.id,
        OR: [
          { ownerId: req.user.id },
          { memberships: { some: { userId: req.user.id, isActive: true } } }
        ]
      },
      include: {
        locations: {
          include: { location: true }
        },
        menus: {
          include: {
            categories: {
              include: { items: true }
            }
          }
        },
        permits: true
      }
    });

    if (!truck) {
      return res.status(404).json({ error: 'Truck not found' });
    }

    res.json(truck);
  } catch (error) {
    console.error('Get truck error:', error);
    res.status(500).json({ error: 'Failed to get truck' });
  }
});

// Create truck
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, phone, email, cuisineType } = req.body;

    const truck = await prisma.truck.create({
      data: {
        name,
        description,
        phone,
        email,
        cuisineType,
        ownerId: req.user.id
      }
    });

    res.status(201).json(truck);
  } catch (error) {
    console.error('Create truck error:', error);
    res.status(500).json({ error: 'Failed to create truck' });
  }
});

// Update truck
router.put('/:id', authenticate, requireTruckAccess('MANAGER', (req) => req.params.id), async (req, res) => {
  try {
    const { name, description, phone, email, cuisineType, isActive, logo, coverImage } = req.body;

    const updatedTruck = await prisma.truck.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
        phone,
        email,
        cuisineType,
        isActive,
        logo,
        coverImage
      }
    });

    res.json(updatedTruck);
  } catch (error) {
    console.error('Update truck error:', error);
    res.status(500).json({ error: 'Failed to update truck' });
  }
});

router.get('/:id/members', authenticate, requireTruckAccess('MANAGER', (req) => req.params.id), async (req, res) => {
  const members = await prisma.truckMembership.findMany({
    where: { truckId: req.params.id },
    select: {
      id: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, name: true, email: true } }
    },
    orderBy: { createdAt: 'asc' }
  });
  res.json(members);
});

router.put('/:id/members', authenticate, requireTruckAccess('MANAGER', (req) => req.params.id), async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const role = req.body.role;
    if (!email || !['MANAGER', 'OPERATOR', 'VIEWER'].includes(role)) {
      return res.status(400).json({ error: 'A registered user email and valid truck role are required' });
    }
    const [truck, user] = await Promise.all([
      prisma.truck.findUnique({ where: { id: req.params.id }, select: { ownerId: true } }),
      prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true } })
    ]);
    if (!user) return res.status(404).json({ error: 'Registered user not found' });
    if (user.id === truck.ownerId) return res.status(400).json({ error: 'The truck owner already has manager access' });

    const membership = await prisma.truckMembership.upsert({
      where: { truckId_userId: { truckId: req.params.id, userId: user.id } },
      create: { truckId: req.params.id, userId: user.id, role, isActive: true },
      update: { role, isActive: true },
      select: { id: true, role: true, isActive: true, user: { select: { id: true, name: true, email: true } } }
    });
    res.json(membership);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/members/:userId', authenticate, requireTruckAccess('MANAGER', (req) => req.params.id), async (req, res, next) => {
  try {
    const result = await prisma.truckMembership.updateMany({
      where: { truckId: req.params.id, userId: req.params.userId, isActive: true },
      data: { isActive: false }
    });
    if (!result.count) return res.status(404).json({ error: 'Active membership not found' });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

// Delete truck
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const truck = await prisma.truck.findFirst({
      where: {
        id: req.params.id,
        ownerId: req.user.id
      }
    });

    if (!truck) {
      return res.status(404).json({ error: 'Truck not found' });
    }

    await prisma.truck.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Truck deleted successfully' });
  } catch (error) {
    console.error('Delete truck error:', error);
    res.status(500).json({ error: 'Failed to delete truck' });
  }
});

module.exports = router;
