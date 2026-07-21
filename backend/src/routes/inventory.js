const express = require('express');
const { authenticate } = require('../middleware/auth');
const prisma = require('../lib/prisma');
const { assertTruckAccess } = require('../middleware/truckAccess');
const { getPaginationParams, paginatedResponse } = require('../utils/pagination');
const { sendCSV, sendPDF } = require('../utils/exportHelpers');
const { exportLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

async function scopedTruckIds(req) {
  const ids = new Set();
  const truckMatch = req.path.match(/^\/truck\/([^/]+)/);
  if (truckMatch) ids.add(truckMatch[1]);
  if (req.body?.truckId) ids.add(req.body.truckId);
  const itemMatch = req.path.match(/^\/item\/([^/]+)/);
  if (itemMatch) {
    const item = await prisma.inventoryItem.findUnique({ where: { id: itemMatch[1] }, select: { truckId: true } });
    if (item) ids.add(item.truckId);
  }
  const recipeMatch = req.path.match(/^\/menu-items\/([^/]+)\/recipe/);
  if (recipeMatch) {
    const menuItem = await prisma.menuItem.findUnique({ where: { id: recipeMatch[1] }, select: { category: { select: { menu: { select: { truckId: true } } } } } });
    if (menuItem) ids.add(menuItem.category.menu.truckId);
  }
  if (req.body?.inventoryItemId) {
    const item = await prisma.inventoryItem.findUnique({ where: { id: req.body.inventoryItemId }, select: { truckId: true } });
    if (item) ids.add(item.truckId);
  }
  if (Array.isArray(req.body?.ids) && req.path.startsWith('/bulk-')) {
    const items = await prisma.inventoryItem.findMany({ where: { id: { in: req.body.ids } }, select: { truckId: true } });
    items.forEach((item) => ids.add(item.truckId));
    if (items.length !== req.body.ids.length) throw Object.assign(new Error('Inventory selection contains unknown items'), { status: 404 });
  }
  return [...ids];
}

router.use(async (req, _res, next) => {
  try {
    const truckIds = await scopedTruckIds(req);
    if (truckIds.length === 0) return next();
    const required = req.method === 'GET' ? 'VIEWER' : req.method === 'DELETE' ? 'MANAGER' : 'OPERATOR';
    for (const truckId of truckIds) await assertTruckAccess(req.user, truckId, required);
    next();
  } catch (error) {
    next(error);
  }
});

router.get('/menu-items/:menuItemId/recipe', async (req, res, next) => {
  try {
    const ingredients = await prisma.menuItemIngredient.findMany({
      where: { menuItemId: req.params.menuItemId }, include: { inventoryItem: true }, orderBy: { inventoryItem: { name: 'asc' } },
    });
    res.json(ingredients);
  } catch (error) { next(error); }
});

router.put('/menu-items/:menuItemId/recipe', async (req, res, next) => {
  try {
    if (!Array.isArray(req.body.ingredients) || req.body.ingredients.length === 0) {
      return res.status(400).json({ error: 'At least one recipe ingredient is required' });
    }
    const menuItem = await prisma.menuItem.findUniqueOrThrow({
      where: { id: req.params.menuItemId }, select: { category: { select: { menu: { select: { truckId: true } } } } },
    });
    await assertTruckAccess(req.user, menuItem.category.menu.truckId, 'MANAGER');
    const uniqueIds = new Set(req.body.ingredients.map((ingredient) => ingredient.inventoryItemId));
    if (uniqueIds.size !== req.body.ingredients.length || req.body.ingredients.some((ingredient) => !Number.isFinite(ingredient.quantityPerItem) || ingredient.quantityPerItem <= 0)) {
      return res.status(400).json({ error: 'Recipe ingredients must be unique with positive quantities' });
    }
    const inventory = await prisma.inventoryItem.findMany({ where: { id: { in: [...uniqueIds] }, truckId: menuItem.category.menu.truckId } });
    if (inventory.length !== uniqueIds.size) return res.status(409).json({ error: 'Recipe inventory must belong to the same truck' });
    await prisma.$transaction(async (tx) => {
      await tx.menuItemIngredient.deleteMany({ where: { menuItemId: req.params.menuItemId } });
      await tx.menuItemIngredient.createMany({ data: req.body.ingredients.map((ingredient) => ({ menuItemId: req.params.menuItemId, ...ingredient })) });
    });
    res.json(await prisma.menuItemIngredient.findMany({ where: { menuItemId: req.params.menuItemId }, include: { inventoryItem: true } }));
  } catch (error) { next(error); }
});

// ==================== INVENTORY ITEMS ====================

// Get all inventory for a truck (with pagination and search)
router.get('/truck/:truckId', authenticate, async (req, res) => {
  try {
    const { category, lowStock, search } = req.query;
    const { page, limit, skip } = getPaginationParams(req.query);

    const whereClause = { truckId: req.params.truckId };

    if (category) {
      whereClause.category = category;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { supplier: { contains: search, mode: 'insensitive' } }
      ];
    }

    // If lowStock filter is on, we need to fetch all matching items first
    // since lowStock comparison requires both quantity and minQuantity fields
    if (lowStock === 'true') {
      let items = await prisma.inventoryItem.findMany({
        where: whereClause,
        orderBy: { name: 'asc' }
      });

      items = items.filter(i => i.quantity <= i.minQuantity);

      const total = items.length;
      const paginatedItems = items.slice(skip, skip + limit);

      return res.json(paginatedResponse(paginatedItems, total, page, limit));
    }

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where: whereClause,
        orderBy: { name: 'asc' },
        skip,
        take: limit
      }),
      prisma.inventoryItem.count({ where: whereClause })
    ]);

    res.json(paginatedResponse(items, total, page, limit));
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
    const delta = Number(adjustment);
    const key = req.get('idempotency-key');
    if (!Number.isFinite(delta) || delta === 0 || !reason?.trim() || !key) {
      return res.status(400).json({ error: 'Non-zero adjustment, reason, and Idempotency-Key header are required' });
    }
    const updated = await prisma.$transaction(async (tx) => {
      const duplicate = await tx.inventoryMovement.findUnique({ where: { idempotencyKey: key } });
      if (duplicate) {
        if (duplicate.inventoryItemId !== req.params.id || duplicate.quantityDelta !== delta || duplicate.reason !== reason) {
          throw Object.assign(new Error('Inventory idempotency key conflict'), { status: 409 });
        }
        return tx.inventoryItem.findUniqueOrThrow({ where: { id: req.params.id } });
      }
      await tx.$queryRawUnsafe('SELECT id FROM "InventoryItem" WHERE id = $1 FOR UPDATE', req.params.id);
      const item = await tx.inventoryItem.findUniqueOrThrow({ where: { id: req.params.id } });
      if (item.quantity + delta < 0) throw Object.assign(new Error('Inventory adjustment would create negative stock'), { status: 409 });
      const result = await tx.inventoryItem.update({
        where: { id: item.id },
        data: { quantity: { increment: delta }, lastRestocked: delta > 0 ? new Date() : item.lastRestocked }
      });
      await tx.inventoryMovement.create({
        data: {
          inventoryItemId: item.id, actorId: req.user.id, quantityDelta: delta, balanceAfter: result.quantity,
          reason, referenceType: 'ManualAdjustment', referenceId: key, idempotencyKey: key
        }
      });
      return result;
    }, { isolationLevel: 'Serializable' });
    res.json(updated);
  } catch (error) {
    console.error('Adjust inventory error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to adjust inventory' });
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

// Bulk delete inventory items
router.delete('/bulk-delete', authenticate, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    const result = await prisma.inventoryItem.deleteMany({
      where: { id: { in: ids } }
    });

    res.json({ message: `${result.count} items deleted successfully`, count: result.count });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'Failed to bulk delete items' });
  }
});

// Bulk update inventory items
router.patch('/bulk-update', authenticate, async (req, res) => {
  try {
    const { ids, data } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'data object with at least one field is required' });
    }

    const result = await prisma.inventoryItem.updateMany({
      where: { id: { in: ids } },
      data
    });

    res.json({ message: `${result.count} items updated successfully`, count: result.count });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Failed to bulk update items' });
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

// CSV export for inventory
router.get('/truck/:truckId/export/csv', authenticate, exportLimiter, async (req, res) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      where: { truckId: req.params.truckId },
      orderBy: { name: 'asc' }
    });

    const fields = ['name', 'category', 'quantity', 'unit', 'minQuantity', 'costPerUnit', 'supplier'];

    const data = items.map(item => ({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      minQuantity: item.minQuantity,
      costPerUnit: item.costPerUnit,
      supplier: item.supplier
    }));

    sendCSV(res, data, fields, 'inventory');
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ error: 'Failed to export inventory as CSV' });
  }
});

// PDF export for inventory
router.get('/truck/:truckId/export/pdf', authenticate, exportLimiter, async (req, res) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      where: { truckId: req.params.truckId },
      orderBy: { name: 'asc' }
    });

    const fields = ['name', 'category', 'quantity', 'unit', 'minQuantity', 'costPerUnit', 'supplier'];

    const data = items.map(item => ({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      minQuantity: item.minQuantity,
      costPerUnit: item.costPerUnit,
      supplier: item.supplier
    }));

    sendPDF(res, data, fields, 'Inventory Report');
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: 'Failed to export inventory as PDF' });
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
