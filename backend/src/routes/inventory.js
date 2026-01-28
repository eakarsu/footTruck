const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// ==================== INVENTORY ITEMS ====================

// Get all inventory for a truck
router.get('/truck/:truckId', authenticate, async (req, res) => {
  try {
    const { category, lowStock } = req.query;

    const whereClause = { truckId: req.params.truckId };

    if (category) {
      whereClause.category = category;
    }

    let items = await prisma.inventoryItem.findMany({
      where: whereClause,
      orderBy: { name: 'asc' }
    });

    if (lowStock === 'true') {
      items = items.filter(i => i.quantity <= i.minQuantity);
    }

    res.json(items);
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ error: 'Failed to get inventory' });
  }
});

// Get single inventory item
router.get('/item/:id', authenticate, async (req, res) => {
  try {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: req.params.id },
      include: {
        wasteRecords: {
          orderBy: { recordedAt: 'desc' },
          take: 10
        }
      }
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(item);
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({ error: 'Failed to get item' });
  }
});

// Create inventory item
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      truckId, name, category, quantity, unit, minQuantity,
      maxQuantity, costPerUnit, supplier, expiryDate, notes
    } = req.body;

    const item = await prisma.inventoryItem.create({
      data: {
        truckId,
        name,
        category,
        quantity: parseFloat(quantity),
        unit,
        minQuantity: parseFloat(minQuantity),
        maxQuantity: maxQuantity ? parseFloat(maxQuantity) : null,
        costPerUnit: costPerUnit ? parseFloat(costPerUnit) : null,
        supplier,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        notes,
        lastRestocked: new Date()
      }
    });

    res.status(201).json(item);
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// Update inventory item
router.put('/item/:id', authenticate, async (req, res) => {
  try {
    const {
      name, category, quantity, unit, minQuantity,
      maxQuantity, costPerUnit, supplier, expiryDate, notes
    } = req.body;

    const item = await prisma.inventoryItem.update({
      where: { id: req.params.id },
      data: {
        name,
        category,
        quantity: quantity !== undefined ? parseFloat(quantity) : undefined,
        unit,
        minQuantity: minQuantity !== undefined ? parseFloat(minQuantity) : undefined,
        maxQuantity: maxQuantity ? parseFloat(maxQuantity) : null,
        costPerUnit: costPerUnit ? parseFloat(costPerUnit) : null,
        supplier,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        notes
      }
    });

    res.json(item);
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Adjust inventory quantity
router.patch('/item/:id/adjust', authenticate, async (req, res) => {
  try {
    const { adjustment, reason } = req.body;

    const item = await prisma.inventoryItem.findUnique({
      where: { id: req.params.id }
    });

    const newQuantity = item.quantity + parseFloat(adjustment);

    const updated = await prisma.inventoryItem.update({
      where: { id: req.params.id },
      data: {
        quantity: Math.max(0, newQuantity),
        lastRestocked: adjustment > 0 ? new Date() : item.lastRestocked
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Adjust inventory error:', error);
    res.status(500).json({ error: 'Failed to adjust inventory' });
  }
});

// Delete inventory item
router.delete('/item/:id', authenticate, async (req, res) => {
  try {
    await prisma.inventoryItem.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Get low stock alerts
router.get('/truck/:truckId/alerts', authenticate, async (req, res) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      where: { truckId: req.params.truckId }
    });

    const lowStock = items.filter(i => i.quantity <= i.minQuantity);
    const expiringSoon = items.filter(i => {
      if (!i.expiryDate) return false;
      const daysUntilExpiry = Math.ceil(
        (new Date(i.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
    });
    const expired = items.filter(i =>
      i.expiryDate && new Date(i.expiryDate) < new Date()
    );

    res.json({ lowStock, expiringSoon, expired });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

// ==================== PREP LISTS ====================

// Get prep lists for a truck
router.get('/truck/:truckId/prep', authenticate, async (req, res) => {
  try {
    const { date, status } = req.query;

    const whereClause = { truckId: req.params.truckId };

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      whereClause.date = {
        gte: startOfDay,
        lte: endOfDay
      };
    }

    if (status) {
      whereClause.status = status;
    }

    const prepLists = await prisma.prepList.findMany({
      where: whereClause,
      include: { items: true },
      orderBy: { date: 'desc' }
    });

    res.json(prepLists);
  } catch (error) {
    console.error('Get prep lists error:', error);
    res.status(500).json({ error: 'Failed to get prep lists' });
  }
});

// Create prep list
router.post('/prep', authenticate, async (req, res) => {
  try {
    const { truckId, date, notes, items } = req.body;

    const prepList = await prisma.prepList.create({
      data: {
        truckId,
        date: new Date(date),
        notes,
        status: 'PENDING',
        items: {
          create: items.map(i => ({
            name: i.name,
            quantity: parseFloat(i.quantity),
            unit: i.unit,
            notes: i.notes
          }))
        }
      },
      include: { items: true }
    });

    res.status(201).json(prepList);
  } catch (error) {
    console.error('Create prep list error:', error);
    res.status(500).json({ error: 'Failed to create prep list' });
  }
});

// Update prep list status
router.patch('/prep/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;

    const prepList = await prisma.prepList.update({
      where: { id: req.params.id },
      data: { status },
      include: { items: true }
    });

    res.json(prepList);
  } catch (error) {
    console.error('Update prep list error:', error);
    res.status(500).json({ error: 'Failed to update prep list' });
  }
});

// Toggle prep item completed
router.patch('/prep/item/:id/toggle', authenticate, async (req, res) => {
  try {
    const { completedBy } = req.body;

    const item = await prisma.prepItem.findUnique({
      where: { id: req.params.id }
    });

    const updated = await prisma.prepItem.update({
      where: { id: req.params.id },
      data: {
        isCompleted: !item.isCompleted,
        completedBy: !item.isCompleted ? completedBy : null,
        completedAt: !item.isCompleted ? new Date() : null
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Toggle prep item error:', error);
    res.status(500).json({ error: 'Failed to toggle prep item' });
  }
});

// Delete prep list
router.delete('/prep/:id', authenticate, async (req, res) => {
  try {
    await prisma.prepList.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Prep list deleted successfully' });
  } catch (error) {
    console.error('Delete prep list error:', error);
    res.status(500).json({ error: 'Failed to delete prep list' });
  }
});

// ==================== SUPPLY ORDERS ====================

// Get supply orders for a truck
router.get('/truck/:truckId/supplies', authenticate, async (req, res) => {
  try {
    const { status } = req.query;

    const whereClause = { truckId: req.params.truckId };

    if (status) {
      whereClause.status = status;
    }

    const supplies = await prisma.supply.findMany({
      where: whereClause,
      orderBy: { orderDate: 'desc' }
    });

    res.json(supplies);
  } catch (error) {
    console.error('Get supplies error:', error);
    res.status(500).json({ error: 'Failed to get supplies' });
  }
});

// Create supply order
router.post('/supplies', authenticate, async (req, res) => {
  try {
    const {
      truckId, name, category, quantity, unit, unitCost,
      supplier, expectedDelivery, notes
    } = req.body;

    const supply = await prisma.supply.create({
      data: {
        truckId,
        name,
        category,
        quantity: parseFloat(quantity),
        unit,
        unitCost: parseFloat(unitCost),
        totalCost: parseFloat(quantity) * parseFloat(unitCost),
        supplier,
        orderDate: new Date(),
        expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
        notes,
        status: 'ORDERED'
      }
    });

    res.status(201).json(supply);
  } catch (error) {
    console.error('Create supply error:', error);
    res.status(500).json({ error: 'Failed to create supply order' });
  }
});

// Update supply order status
router.patch('/supplies/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;

    const updateData = { status };

    if (status === 'DELIVERED') {
      updateData.actualDelivery = new Date();
    }

    const supply = await prisma.supply.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json(supply);
  } catch (error) {
    console.error('Update supply error:', error);
    res.status(500).json({ error: 'Failed to update supply order' });
  }
});

// Delete supply order
router.delete('/supplies/:id', authenticate, async (req, res) => {
  try {
    await prisma.supply.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Supply order deleted successfully' });
  } catch (error) {
    console.error('Delete supply error:', error);
    res.status(500).json({ error: 'Failed to delete supply order' });
  }
});

// ==================== WASTE TRACKING ====================

// Record waste
router.post('/waste', authenticate, async (req, res) => {
  try {
    const { inventoryItemId, quantity, unit, reason, cost, notes } = req.body;

    const waste = await prisma.wasteRecord.create({
      data: {
        inventoryItemId,
        quantity: parseFloat(quantity),
        unit,
        reason,
        cost: cost ? parseFloat(cost) : null,
        notes
      }
    });

    // Reduce inventory
    await prisma.inventoryItem.update({
      where: { id: inventoryItemId },
      data: {
        quantity: {
          decrement: parseFloat(quantity)
        }
      }
    });

    res.status(201).json(waste);
  } catch (error) {
    console.error('Record waste error:', error);
    res.status(500).json({ error: 'Failed to record waste' });
  }
});

// Get waste records for a truck
router.get('/truck/:truckId/waste', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const inventory = await prisma.inventoryItem.findMany({
      where: { truckId: req.params.truckId },
      include: {
        wasteRecords: {
          where: startDate && endDate ? {
            recordedAt: {
              gte: new Date(startDate),
              lte: new Date(endDate)
            }
          } : {},
          orderBy: { recordedAt: 'desc' }
        }
      }
    });

    const wasteRecords = inventory.flatMap(i =>
      i.wasteRecords.map(w => ({
        ...w,
        itemName: i.name,
        category: i.category
      }))
    );

    const totalWasteCost = wasteRecords.reduce((sum, w) => sum + (w.cost || 0), 0);

    res.json({
      records: wasteRecords.sort((a, b) =>
        new Date(b.recordedAt) - new Date(a.recordedAt)
      ),
      totalWasteCost
    });
  } catch (error) {
    console.error('Get waste error:', error);
    res.status(500).json({ error: 'Failed to get waste records' });
  }
});

module.exports = router;
