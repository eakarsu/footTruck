const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get dashboard summary for a truck
router.get('/truck/:truckId/summary', authenticate, async (req, res) => {
  try {
    const truckId = req.params.truckId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const [
      todayOrders,
      weekOrders,
      activeQueue,
      todaySales,
      weekSales,
      lowStockItems,
      upcomingLocations,
      expiringPermits,
      upcomingEvents,
      recentRecommendations
    ] = await Promise.all([
      // Today's orders
      prisma.order.count({
        where: {
          truckId,
          createdAt: { gte: today, lte: endOfDay },
          status: { not: 'CANCELLED' }
        }
      }),
      // Week's orders
      prisma.order.count({
        where: {
          truckId,
          createdAt: { gte: weekAgo },
          status: { not: 'CANCELLED' }
        }
      }),
      // Active queue
      prisma.order.count({
        where: {
          truckId,
          status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] }
        }
      }),
      // Today's sales
      prisma.order.aggregate({
        where: {
          truckId,
          createdAt: { gte: today, lte: endOfDay },
          status: { not: 'CANCELLED' }
        },
        _sum: { total: true }
      }),
      // Week's sales
      prisma.order.aggregate({
        where: {
          truckId,
          createdAt: { gte: weekAgo },
          status: { not: 'CANCELLED' }
        },
        _sum: { total: true }
      }),
      // Low stock items
      prisma.inventoryItem.findMany({
        where: { truckId },
        take: 100
      }),
      // Upcoming locations
      prisma.truckLocation.findMany({
        where: {
          truckId,
          date: { gte: today },
          status: { in: ['SCHEDULED', 'CONFIRMED'] }
        },
        include: { location: true },
        orderBy: { date: 'asc' },
        take: 5
      }),
      // Expiring permits
      prisma.permit.findMany({
        where: {
          truckId,
          expiryDate: {
            gte: today,
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
          }
        },
        orderBy: { expiryDate: 'asc' }
      }),
      // Upcoming events
      prisma.eventRegistration.findMany({
        where: {
          truckId,
          status: 'APPROVED',
          event: { startDate: { gte: today } }
        },
        include: { event: true },
        take: 5
      }),
      // Recent AI recommendations
      prisma.aIRecommendation.findMany({
        where: { truckId, isActioned: false },
        orderBy: { createdAt: 'desc' },
        take: 3
      })
    ]);

    const lowStock = lowStockItems.filter(item => item.quantity <= item.minQuantity);

    res.json({
      orders: {
        today: todayOrders,
        week: weekOrders,
        activeQueue
      },
      sales: {
        today: todaySales._sum.total || 0,
        week: weekSales._sum.total || 0
      },
      alerts: {
        lowStockCount: lowStock.length,
        lowStockItems: lowStock.slice(0, 5),
        expiringPermitsCount: expiringPermits.length,
        expiringPermits
      },
      upcoming: {
        locations: upcomingLocations,
        events: upcomingEvents.map(e => e.event)
      },
      aiRecommendations: recentRecommendations
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

// Get quick stats for a truck
router.get('/truck/:truckId/quick-stats', authenticate, async (req, res) => {
  try {
    const truckId = req.params.truckId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [orderCount, menuItemCount, locationCount, inventoryCount] = await Promise.all([
      prisma.order.count({
        where: {
          truckId,
          createdAt: { gte: today },
          status: { not: 'CANCELLED' }
        }
      }),
      prisma.menuItem.count({
        where: {
          category: {
            menu: { truckId, isActive: true }
          }
        }
      }),
      prisma.truckLocation.count({
        where: {
          truckId,
          date: { gte: today }
        }
      }),
      prisma.inventoryItem.count({
        where: { truckId }
      })
    ]);

    res.json({
      ordersToday: orderCount,
      menuItems: menuItemCount,
      scheduledLocations: locationCount,
      inventoryItems: inventoryCount
    });
  } catch (error) {
    console.error('Get quick stats error:', error);
    res.status(500).json({ error: 'Failed to get quick stats' });
  }
});

// Get recent activity
router.get('/truck/:truckId/activity', authenticate, async (req, res) => {
  try {
    const truckId = req.params.truckId;

    const [recentOrders, recentPosts, recentBookings] = await Promise.all([
      prisma.order.findMany({
        where: { truckId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          items: { include: { menuItem: true } }
        }
      }),
      prisma.socialPost.findMany({
        where: { truckId },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),
      prisma.truckLocation.findMany({
        where: { truckId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { location: true }
      })
    ]);

    // Combine and sort by date
    const activity = [
      ...recentOrders.map(o => ({
        type: 'order',
        id: o.id,
        title: `Order ${o.orderNumber}`,
        description: `${o.items.length} items - $${o.total.toFixed(2)}`,
        status: o.status,
        timestamp: o.createdAt
      })),
      ...recentPosts.map(p => ({
        type: 'social',
        id: p.id,
        title: `${p.platform} Post`,
        description: p.content.substring(0, 50) + '...',
        status: p.status,
        timestamp: p.createdAt
      })),
      ...recentBookings.map(b => ({
        type: 'location',
        id: b.id,
        title: b.location?.name || 'Location',
        description: `${new Date(b.date).toLocaleDateString()} ${b.startTime}-${b.endTime}`,
        status: b.status,
        timestamp: b.createdAt
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 15);

    res.json(activity);
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ error: 'Failed to get activity' });
  }
});

// Get notifications
router.get('/notifications', authenticate, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// Mark notification as read
router.patch('/notifications/:id/read', authenticate, async (req, res) => {
  try {
    const notification = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true }
    });

    res.json(notification);
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.patch('/notifications/read-all', authenticate, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true }
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

module.exports = router;
