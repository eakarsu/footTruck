const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get all trucks for user
router.get('/', authenticate, async (req, res) => {
  try {
    const trucks = await prisma.truck.findMany({
      where: { ownerId: req.user.id },
      include: {
        locations: {
          include: { location: true },
          take: 5,
          orderBy: { date: 'desc' }
        },
        menus: true
      }
    });
    res.json(trucks);
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
        ownerId: req.user.id
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
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, description, phone, email, cuisineType, isActive, logo, coverImage } = req.body;

    const truck = await prisma.truck.findFirst({
      where: {
        id: req.params.id,
        ownerId: req.user.id
      }
    });

    if (!truck) {
      return res.status(404).json({ error: 'Truck not found' });
    }

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
