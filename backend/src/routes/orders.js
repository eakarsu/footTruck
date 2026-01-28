const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const preOrderService = require('../services/preOrderService');
const notificationService = require('../services/notificationService');

const router = express.Router();
const prisma = new PrismaClient();

// Generate order number
const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `FT-${timestamp}-${random}`;
};

// Get all orders for a truck
router.get('/truck/:truckId', authenticate, async (req, res) => {
  try {
    const { status, date, type } = req.query;

    const whereClause = { truckId: req.params.truckId };

    if (status) {
      whereClause.status = status;
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      whereClause.createdAt = {
        gte: startOfDay,
        lte: endOfDay
      };
    }

    if (type) {
      whereClause.type = type;
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        items: {
          include: { menuItem: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to get orders' });
  }
});

// Get single order
router.get('/:id', authenticate, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: {
          include: { menuItem: true }
        },
        notifications: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to get order' });
  }
});

// Create order
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      truckId, type, customerName, customerPhone, customerEmail,
      items, notes, paymentMethod
    } = req.body;

    // Calculate totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = await prisma.menuItem.findUnique({
        where: { id: item.menuItemId }
      });

      if (!menuItem) {
        return res.status(400).json({ error: `Menu item not found: ${item.menuItemId}` });
      }

      const unitPrice = menuItem.isSpecial && menuItem.specialPrice
        ? menuItem.specialPrice
        : menuItem.price;
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      orderItems.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        specialInstructions: item.specialInstructions
      });
    }

    const tax = subtotal * 0.08; // 8% tax
    const total = subtotal + tax;

    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        truckId,
        type: type || 'WALK_IN',
        customerName,
        customerPhone,
        customerEmail,
        subtotal,
        tax,
        total,
        notes,
        paymentMethod,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        items: {
          create: orderItems
        }
      },
      include: {
        items: {
          include: { menuItem: true }
        }
      }
    });

    res.status(201).json(order);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update order status
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;

    const updateData = { status };

    if (status === 'READY') {
      updateData.actualReadyTime = new Date();
    }

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        items: {
          include: { menuItem: true }
        }
      }
    });

    // Create notification
    const notificationTypes = {
      CONFIRMED: 'ORDER_CONFIRMED',
      PREPARING: 'ORDER_PREPARING',
      READY: 'ORDER_READY',
      PICKED_UP: 'ORDER_PICKED_UP'
    };

    if (notificationTypes[status]) {
      await prisma.orderNotification.create({
        data: {
          orderId: order.id,
          type: notificationTypes[status],
          message: `Order ${order.orderNumber} is now ${status.toLowerCase().replace('_', ' ')}`
        }
      });
    }

    res.json(order);
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Update payment status
router.patch('/:id/payment', authenticate, async (req, res) => {
  try {
    const { paymentStatus, paymentMethod, tip } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: req.params.id }
    });

    const updateData = {
      paymentStatus,
      paymentMethod
    };

    if (tip !== undefined) {
      updateData.tip = parseFloat(tip);
      updateData.total = order.subtotal + order.tax + parseFloat(tip);
    }

    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        items: {
          include: { menuItem: true }
        }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

// Cancel order
router.patch('/:id/cancel', authenticate, async (req, res) => {
  try {
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        status: 'CANCELLED',
        paymentStatus: 'REFUNDED'
      }
    });

    res.json(order);
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// Get queue (active orders)
router.get('/truck/:truckId/queue', authenticate, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        truckId: req.params.truckId,
        status: {
          in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY']
        }
      },
      include: {
        items: {
          include: { menuItem: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const queue = {
      pending: orders.filter(o => o.status === 'PENDING'),
      confirmed: orders.filter(o => o.status === 'CONFIRMED'),
      preparing: orders.filter(o => o.status === 'PREPARING'),
      ready: orders.filter(o => o.status === 'READY')
    };

    res.json(queue);
  } catch (error) {
    console.error('Get queue error:', error);
    res.status(500).json({ error: 'Failed to get queue' });
  }
});

// Get order stats for today
router.get('/truck/:truckId/stats/today', authenticate, async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const orders = await prisma.order.findMany({
      where: {
        truckId: req.params.truckId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: { not: 'CANCELLED' }
      }
    });

    const stats = {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
      averageOrderValue: orders.length > 0
        ? orders.reduce((sum, o) => sum + o.total, 0) / orders.length
        : 0,
      completedOrders: orders.filter(o => o.status === 'PICKED_UP').length,
      pendingOrders: orders.filter(o =>
        ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'].includes(o.status)
      ).length
    };

    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// ==================== PRE-ORDER SYSTEM ====================

// Get pre-order slots for a truck
router.get('/truck/:truckId/pre-order/slots', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, truckLocationId } = req.query;
    const slots = await preOrderService.getSlotsByTruck(req.params.truckId, {
      startDate,
      endDate,
      truckLocationId
    });
    res.json(slots);
  } catch (error) {
    console.error('Get pre-order slots error:', error);
    res.status(500).json({ error: 'Failed to get pre-order slots' });
  }
});

// Generate time slots for a truck location
router.post('/truck/:truckId/pre-order/generate-slots', authenticate, async (req, res) => {
  try {
    const { truckLocationId } = req.body;
    if (!truckLocationId) {
      return res.status(400).json({ error: 'truckLocationId is required' });
    }
    const slots = await preOrderService.generateTimeSlots(truckLocationId);
    res.status(201).json(slots);
  } catch (error) {
    console.error('Generate slots error:', error);
    res.status(500).json({ error: 'Failed to generate time slots' });
  }
});

// Get pre-order settings
router.get('/truck/:truckId/pre-order/settings', authenticate, async (req, res) => {
  try {
    const settings = await preOrderService.getSettings(req.params.truckId);
    res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to get pre-order settings' });
  }
});

// Update pre-order settings
router.put('/truck/:truckId/pre-order/settings', authenticate, async (req, res) => {
  try {
    const settings = await preOrderService.updateSettings(req.params.truckId, req.body);
    res.json(settings);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update pre-order settings' });
  }
});

// Create a pre-order (authenticated)
router.post('/pre-order', authenticate, async (req, res) => {
  try {
    const {
      truckId, slotId, customerName, customerPhone, customerEmail,
      items, notes, paymentMethod
    } = req.body;

    // Verify slot availability
    const canOrder = await preOrderService.canPlacePreOrder(truckId, slotId);
    if (!canOrder.allowed) {
      return res.status(400).json({ error: canOrder.reason });
    }

    // Get slot info for pickup time
    const slot = await prisma.preOrderWindow.findUnique({
      where: { id: slotId }
    });

    // Calculate totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = await prisma.menuItem.findUnique({
        where: { id: item.menuItemId }
      });

      if (!menuItem) {
        return res.status(400).json({ error: `Menu item not found: ${item.menuItemId}` });
      }

      const unitPrice = menuItem.isSpecial && menuItem.specialPrice
        ? menuItem.specialPrice
        : menuItem.price;
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      orderItems.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        specialInstructions: item.specialInstructions
      });
    }

    const tax = subtotal * 0.08;
    const total = subtotal + tax;

    // Create scheduled pickup time
    const scheduledPickup = new Date(slot.date);
    const [hours, minutes] = slot.slotStart.split(':').map(Number);
    scheduledPickup.setHours(hours, minutes, 0, 0);

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        truckId,
        type: 'PRE_ORDER',
        customerName,
        customerPhone,
        customerEmail,
        subtotal,
        tax,
        total,
        notes,
        paymentMethod,
        status: 'CONFIRMED',
        paymentStatus: paymentMethod ? 'COMPLETED' : 'PENDING',
        pickupWindowId: slotId,
        scheduledPickup,
        items: {
          create: orderItems
        }
      },
      include: {
        items: { include: { menuItem: true } },
        pickupWindow: {
          include: { truckLocation: { include: { location: true } } }
        }
      }
    });

    // Reserve the slot
    await preOrderService.reserveSlot(slotId);

    // Send confirmation notification
    await notificationService.sendOrderNotification(order.id, 'ORDER_CONFIRMED');

    res.status(201).json(order);
  } catch (error) {
    console.error('Create pre-order error:', error);
    res.status(500).json({ error: 'Failed to create pre-order' });
  }
});

// ==================== PUBLIC ENDPOINTS ====================

// Get available slots for public ordering (no auth required)
router.get('/public/truck/:truckId/available-slots', async (req, res) => {
  try {
    const { date, locationId } = req.query;
    const slots = await preOrderService.getPublicSlots(req.params.truckId, {
      date,
      locationId
    });
    res.json(slots);
  } catch (error) {
    console.error('Get public slots error:', error);
    res.status(500).json({ error: 'Failed to get available slots' });
  }
});

// Track order by order number (no auth required)
router.get('/public/order/:orderNumber', async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber: req.params.orderNumber },
      select: {
        orderNumber: true,
        status: true,
        type: true,
        scheduledPickup: true,
        estimatedReadyTime: true,
        actualReadyTime: true,
        total: true,
        createdAt: true,
        truck: {
          select: { name: true, phone: true }
        },
        pickupWindow: {
          include: {
            truckLocation: {
              include: {
                location: {
                  select: { name: true, address: true, city: true }
                }
              }
            }
          }
        },
        items: {
          select: {
            quantity: true,
            menuItem: { select: { name: true } }
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Track order error:', error);
    res.status(500).json({ error: 'Failed to track order' });
  }
});

// Create pre-order from public page (no auth required)
router.post('/public/pre-order', async (req, res) => {
  try {
    const {
      truckId, slotId, customerName, customerPhone, customerEmail,
      items, notes
    } = req.body;

    if (!customerName || (!customerPhone && !customerEmail)) {
      return res.status(400).json({ error: 'Customer name and contact info required' });
    }

    // Verify slot availability
    const canOrder = await preOrderService.canPlacePreOrder(truckId, slotId);
    if (!canOrder.allowed) {
      return res.status(400).json({ error: canOrder.reason });
    }

    const slot = await prisma.preOrderWindow.findUnique({
      where: { id: slotId }
    });

    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = await prisma.menuItem.findUnique({
        where: { id: item.menuItemId }
      });

      if (!menuItem) {
        return res.status(400).json({ error: `Menu item not found` });
      }

      const unitPrice = menuItem.isSpecial && menuItem.specialPrice
        ? menuItem.specialPrice
        : menuItem.price;
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      orderItems.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        specialInstructions: item.specialInstructions
      });
    }

    const tax = subtotal * 0.08;
    const total = subtotal + tax;

    const scheduledPickup = new Date(slot.date);
    const [hours, minutes] = slot.slotStart.split(':').map(Number);
    scheduledPickup.setHours(hours, minutes, 0, 0);

    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        truckId,
        type: 'PRE_ORDER',
        customerName,
        customerPhone,
        customerEmail,
        subtotal,
        tax,
        total,
        notes,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        pickupWindowId: slotId,
        scheduledPickup,
        items: {
          create: orderItems
        }
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        scheduledPickup: true,
        createdAt: true
      }
    });

    await preOrderService.reserveSlot(slotId);
    // Notification is optional - don't fail if it errors
    try {
      await notificationService.sendOrderNotification(order.id, 'ORDER_CONFIRMED');
    } catch (notifError) {
      console.error('Notification failed:', notifError);
    }

    res.status(201).json(order);
  } catch (error) {
    console.error('Create public pre-order error:', error);
    res.status(500).json({ error: 'Failed to create pre-order' });
  }
});

module.exports = router;
