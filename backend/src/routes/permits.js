const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get all permits for a truck
router.get('/truck/:truckId', authenticate, async (req, res) => {
  try {
    const { status, type } = req.query;

    const whereClause = { truckId: req.params.truckId };

    if (status) {
      whereClause.status = status;
    }

    if (type) {
      whereClause.type = type;
    }

    const permits = await prisma.permit.findMany({
      where: whereClause,
      orderBy: { expiryDate: 'asc' }
    });

    res.json(permits);
  } catch (error) {
    console.error('Get permits error:', error);
    res.status(500).json({ error: 'Failed to get permits' });
  }
});

// Get single permit
router.get('/:id', authenticate, async (req, res) => {
  try {
    const permit = await prisma.permit.findUnique({
      where: { id: req.params.id }
    });

    if (!permit) {
      return res.status(404).json({ error: 'Permit not found' });
    }

    res.json(permit);
  } catch (error) {
    console.error('Get permit error:', error);
    res.status(500).json({ error: 'Failed to get permit' });
  }
});

// Create permit
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      truckId, permitNumber, type, issuingAuthority,
      issueDate, expiryDate, cost, notes, documentUrl
    } = req.body;

    const permit = await prisma.permit.create({
      data: {
        truckId,
        permitNumber,
        type,
        issuingAuthority,
        issueDate: new Date(issueDate),
        expiryDate: new Date(expiryDate),
        cost: cost ? parseFloat(cost) : null,
        notes,
        documentUrl,
        status: 'ACTIVE'
      }
    });

    res.status(201).json(permit);
  } catch (error) {
    console.error('Create permit error:', error);
    res.status(500).json({ error: 'Failed to create permit' });
  }
});

// Update permit
router.put('/:id', authenticate, async (req, res) => {
  try {
    const {
      permitNumber, type, issuingAuthority, issueDate,
      expiryDate, cost, status, notes, documentUrl
    } = req.body;

    const permit = await prisma.permit.update({
      where: { id: req.params.id },
      data: {
        permitNumber,
        type,
        issuingAuthority,
        issueDate: issueDate ? new Date(issueDate) : undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        cost: cost ? parseFloat(cost) : null,
        status,
        notes,
        documentUrl
      }
    });

    res.json(permit);
  } catch (error) {
    console.error('Update permit error:', error);
    res.status(500).json({ error: 'Failed to update permit' });
  }
});

// Delete permit
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await prisma.permit.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Permit deleted successfully' });
  } catch (error) {
    console.error('Delete permit error:', error);
    res.status(500).json({ error: 'Failed to delete permit' });
  }
});

// Get permit alerts (expiring soon or expired)
router.get('/truck/:truckId/alerts', authenticate, async (req, res) => {
  try {
    const permits = await prisma.permit.findMany({
      where: { truckId: req.params.truckId }
    });

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const expired = permits.filter(p =>
      new Date(p.expiryDate) < now
    );

    const expiringSoon = permits.filter(p => {
      const expiryDate = new Date(p.expiryDate);
      return expiryDate >= now && expiryDate <= thirtyDaysFromNow;
    });

    const active = permits.filter(p =>
      new Date(p.expiryDate) > thirtyDaysFromNow && p.status === 'ACTIVE'
    );

    // Update status of expired permits
    for (const permit of expired) {
      if (permit.status !== 'EXPIRED') {
        await prisma.permit.update({
          where: { id: permit.id },
          data: { status: 'EXPIRED' }
        });
      }
    }

    res.json({
      expired,
      expiringSoon,
      active,
      summary: {
        total: permits.length,
        expired: expired.length,
        expiringSoon: expiringSoon.length,
        active: active.length
      }
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Failed to get permit alerts' });
  }
});

// Renew permit
router.post('/:id/renew', authenticate, async (req, res) => {
  try {
    const { newExpiryDate, newCost, newPermitNumber } = req.body;

    const permit = await prisma.permit.update({
      where: { id: req.params.id },
      data: {
        expiryDate: new Date(newExpiryDate),
        issueDate: new Date(),
        cost: newCost ? parseFloat(newCost) : undefined,
        permitNumber: newPermitNumber || undefined,
        status: 'ACTIVE'
      }
    });

    res.json(permit);
  } catch (error) {
    console.error('Renew permit error:', error);
    res.status(500).json({ error: 'Failed to renew permit' });
  }
});

// Get permit types summary
router.get('/truck/:truckId/summary', authenticate, async (req, res) => {
  try {
    const permits = await prisma.permit.findMany({
      where: { truckId: req.params.truckId }
    });

    const byType = {};
    const permitTypes = ['HEALTH', 'BUSINESS', 'PARKING', 'FIRE', 'MOBILE_VENDOR', 'SPECIAL_EVENT'];

    permitTypes.forEach(type => {
      const typePermits = permits.filter(p => p.type === type);
      byType[type] = {
        count: typePermits.length,
        active: typePermits.filter(p => p.status === 'ACTIVE').length,
        expired: typePermits.filter(p => p.status === 'EXPIRED').length,
        totalCost: typePermits.reduce((sum, p) => sum + (p.cost || 0), 0)
      };
    });

    res.json({
      total: permits.length,
      totalCost: permits.reduce((sum, p) => sum + (p.cost || 0), 0),
      byType
    });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ error: 'Failed to get permit summary' });
  }
});

module.exports = router;
