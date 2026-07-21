const express = require('express');
const { authenticate } = require('../middleware/auth');
const analyticsService = require('../services/analyticsService');
const { getPaginationParams, paginatedResponse } = require('../utils/pagination');
const { sendCSV, sendPDF } = require('../utils/exportHelpers');
const { exportLimiter } = require('../middleware/rateLimiter');
const prisma = require('../lib/prisma');

const router = express.Router();

// ==================== SALES ====================

// Get sales for a truck (with pagination and search)
router.get('/truck/:truckId/sales', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { page, limit, skip, search } = getPaginationParams(req.query);

    const whereClause = { truckId: req.params.truckId };

    if (startDate && endDate) {
      whereClause.date = { gte: new Date(startDate), lte: new Date(endDate) };
    }

    if (search) {
      whereClause.notes = { contains: search, mode: 'insensitive' };
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({ where: whereClause, orderBy: { date: 'desc' }, skip, take: limit }),
      prisma.sale.count({ where: whereClause })
    ]);

    res.json(paginatedResponse(sales, total, page, limit));
  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({ error: 'Failed to get sales' });
  }
});

// Record daily sales
router.post('/sales', authenticate, async (req, res) => {
  try {
    const {
      truckId, date, cashSales, cardSales, mobileSales,
      transactionCount, notes
    } = req.body;

    const totalSales = parseFloat(cashSales || 0) +
      parseFloat(cardSales || 0) +
      parseFloat(mobileSales || 0);
    const averageTicket = transactionCount > 0 ? totalSales / transactionCount : 0;

    // Check if record exists for this date
    const existingDate = new Date(date);
    existingDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(existingDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const existing = await prisma.sale.findFirst({
      where: {
        truckId,
        date: {
          gte: existingDate,
          lt: nextDay
        }
      }
    });

    if (existing) {
      const updated = await prisma.sale.update({
        where: { id: existing.id },
        data: {
          cashSales: parseFloat(cashSales || 0),
          cardSales: parseFloat(cardSales || 0),
          mobileSales: parseFloat(mobileSales || 0),
          totalSales,
          transactionCount: parseInt(transactionCount),
          averageTicket,
          notes
        }
      });
      return res.json(updated);
    }

    const sale = await prisma.sale.create({
      data: {
        truckId,
        date: new Date(date),
        cashSales: parseFloat(cashSales || 0),
        cardSales: parseFloat(cardSales || 0),
        mobileSales: parseFloat(mobileSales || 0),
        totalSales,
        transactionCount: parseInt(transactionCount),
        averageTicket,
        notes
      }
    });

    res.status(201).json(sale);
  } catch (error) {
    console.error('Record sales error:', error);
    res.status(500).json({ error: 'Failed to record sales' });
  }
});

// Get sales summary
router.get('/truck/:truckId/sales/summary', authenticate, async (req, res) => {
  try {
    const { period } = req.query; // day, week, month, year

    const now = new Date();
    let startDate;

    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default: // day
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
    }

    const sales = await prisma.sale.findMany({
      where: {
        truckId: req.params.truckId,
        date: { gte: startDate }
      }
    });

    const summary = {
      period,
      totalSales: sales.reduce((sum, s) => sum + s.totalSales, 0),
      cashSales: sales.reduce((sum, s) => sum + s.cashSales, 0),
      cardSales: sales.reduce((sum, s) => sum + s.cardSales, 0),
      mobileSales: sales.reduce((sum, s) => sum + s.mobileSales, 0),
      totalTransactions: sales.reduce((sum, s) => sum + s.transactionCount, 0),
      averageDaily: sales.length > 0
        ? sales.reduce((sum, s) => sum + s.totalSales, 0) / sales.length
        : 0,
      daysRecorded: sales.length
    };

    res.json(summary);
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ error: 'Failed to get summary' });
  }
});

// ==================== EXPENSES ====================

// Get expenses for a truck
router.get('/truck/:truckId/expenses', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;

    const whereClause = { truckId: req.params.truckId };

    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    if (category) {
      whereClause.category = category;
    }

    const expenses = await prisma.expense.findMany({
      where: whereClause,
      orderBy: { date: 'desc' }
    });

    res.json(expenses);
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ error: 'Failed to get expenses' });
  }
});

// Create expense
router.post('/expenses', authenticate, async (req, res) => {
  try {
    const {
      truckId, date, category, description, amount,
      paymentMethod, vendor, receiptUrl, isRecurring, notes
    } = req.body;

    const expense = await prisma.expense.create({
      data: {
        truckId,
        date: new Date(date),
        category,
        description,
        amount: parseFloat(amount),
        paymentMethod,
        vendor,
        receiptUrl,
        isRecurring: isRecurring || false,
        notes
      }
    });

    res.status(201).json(expense);
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

// Update expense
router.put('/expenses/:id', authenticate, async (req, res) => {
  try {
    const {
      date, category, description, amount,
      paymentMethod, vendor, receiptUrl, isRecurring, notes
    } = req.body;

    const expense = await prisma.expense.update({
      where: { id: req.params.id },
      data: {
        date: date ? new Date(date) : undefined,
        category,
        description,
        amount: amount ? parseFloat(amount) : undefined,
        paymentMethod,
        vendor,
        receiptUrl,
        isRecurring,
        notes
      }
    });

    res.json(expense);
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

// Delete expense
router.delete('/expenses/:id', authenticate, async (req, res) => {
  try {
    await prisma.expense.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// Get expense summary by category
router.get('/truck/:truckId/expenses/by-category', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const whereClause = { truckId: req.params.truckId };

    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const expenses = await prisma.expense.findMany({
      where: whereClause
    });

    const byCategory = {};
    expenses.forEach(e => {
      if (!byCategory[e.category]) {
        byCategory[e.category] = 0;
      }
      byCategory[e.category] += e.amount;
    });

    res.json({
      total: expenses.reduce((sum, e) => sum + e.amount, 0),
      byCategory
    });
  } catch (error) {
    console.error('Get by category error:', error);
    res.status(500).json({ error: 'Failed to get expenses by category' });
  }
});

// ==================== PROFIT ANALYSIS ====================

// Get profit by location
router.get('/truck/:truckId/profit/by-location', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = startDate && endDate ? {
      gte: new Date(startDate),
      lte: new Date(endDate)
    } : undefined;

    // Get location revenues
    const truckLocations = await prisma.truckLocation.findMany({
      where: {
        truckId: req.params.truckId,
        status: 'COMPLETED',
        ...(dateFilter && { date: dateFilter })
      },
      include: { location: true }
    });

    const profitByLocation = {};
    truckLocations.forEach(tl => {
      const locName = tl.location.name;
      if (!profitByLocation[locName]) {
        profitByLocation[locName] = {
          location: tl.location,
          totalRevenue: 0,
          visits: 0,
          totalCustomers: 0
        };
      }
      profitByLocation[locName].totalRevenue += tl.revenue || 0;
      profitByLocation[locName].visits++;
      profitByLocation[locName].totalCustomers += tl.customerCount || 0;
    });

    const results = Object.values(profitByLocation).map(p => ({
      ...p,
      averageRevenue: p.visits > 0 ? p.totalRevenue / p.visits : 0,
      averageCustomers: p.visits > 0 ? p.totalCustomers / p.visits : 0
    }));

    res.json(results.sort((a, b) => b.totalRevenue - a.totalRevenue));
  } catch (error) {
    console.error('Get profit by location error:', error);
    res.status(500).json({ error: 'Failed to get profit by location' });
  }
});

// Get overall financial summary
router.get('/truck/:truckId/summary', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = startDate && endDate ? {
      gte: new Date(startDate),
      lte: new Date(endDate)
    } : undefined;

    const [sales, expenses] = await Promise.all([
      prisma.sale.findMany({
        where: {
          truckId: req.params.truckId,
          ...(dateFilter && { date: dateFilter })
        }
      }),
      prisma.expense.findMany({
        where: {
          truckId: req.params.truckId,
          ...(dateFilter && { date: dateFilter })
        }
      })
    ]);

    const totalRevenue = sales.reduce((sum, s) => sum + s.totalSales, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    res.json({
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin,
      salesDays: sales.length,
      expenseItems: expenses.length
    });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ error: 'Failed to get financial summary' });
  }
});

// ==================== LOCATION ANALYTICS ====================

// Get all location analytics for a truck
router.get('/truck/:truckId/analytics/locations', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, locationId } = req.query;
    const analytics = await analyticsService.getLocationAnalytics(req.params.truckId, {
      startDate,
      endDate,
      locationId
    });
    res.json(analytics);
  } catch (error) {
    console.error('Get location analytics error:', error);
    res.status(500).json({ error: 'Failed to get location analytics' });
  }
});

// Get analytics for a specific location
router.get('/truck/:truckId/analytics/location/:locationId', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const summary = await analyticsService.getLocationSummary(
      req.params.truckId,
      req.params.locationId,
      { startDate, endDate }
    );
    if (!summary) {
      return res.status(404).json({ error: 'No analytics found for this location' });
    }
    res.json(summary);
  } catch (error) {
    console.error('Get location summary error:', error);
    res.status(500).json({ error: 'Failed to get location summary' });
  }
});

// Compare multiple locations
router.get('/truck/:truckId/analytics/compare', authenticate, async (req, res) => {
  try {
    const { locationIds, startDate, endDate } = req.query;
    if (!locationIds) {
      return res.status(400).json({ error: 'locationIds parameter is required' });
    }
    const ids = locationIds.split(',');
    const comparison = await analyticsService.compareLocations(req.params.truckId, ids, {
      startDate,
      endDate
    });
    res.json(comparison);
  } catch (error) {
    console.error('Compare locations error:', error);
    res.status(500).json({ error: 'Failed to compare locations' });
  }
});

// Get top performing locations
router.get('/truck/:truckId/analytics/top-locations', authenticate, async (req, res) => {
  try {
    const { limit, sortBy, startDate, endDate } = req.query;
    const topLocations = await analyticsService.getTopLocations(req.params.truckId, {
      limit: limit ? parseInt(limit) : undefined,
      sortBy,
      startDate,
      endDate
    });
    res.json(topLocations);
  } catch (error) {
    console.error('Get top locations error:', error);
    res.status(500).json({ error: 'Failed to get top locations' });
  }
});

// Get trend data
router.get('/truck/:truckId/analytics/trends', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, groupBy, locationId } = req.query;
    const trends = await analyticsService.getTrends(req.params.truckId, {
      startDate,
      endDate,
      groupBy,
      locationId
    });
    res.json(trends);
  } catch (error) {
    console.error('Get trends error:', error);
    res.status(500).json({ error: 'Failed to get trends' });
  }
});

// Get revenue per hour metrics
router.get('/truck/:truckId/metrics/revenue-per-hour', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, locationId } = req.query;
    const metrics = await analyticsService.getRevenuePerHour(req.params.truckId, {
      startDate,
      endDate,
      locationId
    });
    res.json(metrics);
  } catch (error) {
    console.error('Get revenue per hour error:', error);
    res.status(500).json({ error: 'Failed to get revenue per hour metrics' });
  }
});

// Get peak hours analysis
router.get('/truck/:truckId/metrics/peak-hours', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, locationId } = req.query;
    const peakHours = await analyticsService.getPeakHours(req.params.truckId, {
      startDate,
      endDate,
      locationId
    });
    res.json(peakHours);
  } catch (error) {
    console.error('Get peak hours error:', error);
    res.status(500).json({ error: 'Failed to get peak hours' });
  }
});

// ==================== GOALS ====================

// Get goals for a truck
router.get('/truck/:truckId/goals', authenticate, async (req, res) => {
  try {
    const { locationId, active } = req.query;
    const goals = await analyticsService.getGoals(req.params.truckId, {
      locationId,
      active: active === 'true'
    });
    res.json(goals);
  } catch (error) {
    console.error('Get goals error:', error);
    res.status(500).json({ error: 'Failed to get goals' });
  }
});

// Create a goal
router.post('/truck/:truckId/goals', authenticate, async (req, res) => {
  try {
    const { locationId, targetRevenue, targetCustomers, period, startDate, endDate } = req.body;
    const goal = await analyticsService.createGoal({
      truckId: req.params.truckId,
      locationId,
      targetRevenue: parseFloat(targetRevenue),
      targetCustomers: targetCustomers ? parseInt(targetCustomers) : null,
      period,
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    });
    res.status(201).json(goal);
  } catch (error) {
    console.error('Create goal error:', error);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

// Update a goal
router.put('/truck/:truckId/goals/:id', authenticate, async (req, res) => {
  try {
    const { targetRevenue, targetCustomers, period, startDate, endDate } = req.body;
    const goal = await analyticsService.updateGoal(req.params.id, {
      targetRevenue: targetRevenue ? parseFloat(targetRevenue) : undefined,
      targetCustomers: targetCustomers ? parseInt(targetCustomers) : undefined,
      period,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    });
    res.json(goal);
  } catch (error) {
    console.error('Update goal error:', error);
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

// Delete a goal
router.delete('/truck/:truckId/goals/:id', authenticate, async (req, res) => {
  try {
    await analyticsService.deleteGoal(req.params.id);
    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    console.error('Delete goal error:', error);
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

// Get goal progress
router.get('/goals/:id/progress', authenticate, async (req, res) => {
  try {
    const progress = await analyticsService.getGoalProgress(req.params.id);
    if (!progress) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    res.json(progress);
  } catch (error) {
    console.error('Get goal progress error:', error);
    res.status(500).json({ error: 'Failed to get goal progress' });
  }
});

// ==================== BULK OPERATIONS & EXPORTS ====================

// Bulk delete expenses
router.delete('/expenses/bulk-delete', authenticate, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ error: 'No IDs provided' });
    await prisma.expense.deleteMany({ where: { id: { in: ids } } });
    res.json({ message: `${ids.length} expenses deleted successfully` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk delete expenses' });
  }
});

// Bulk update expenses
router.patch('/expenses/bulk-update', authenticate, async (req, res) => {
  try {
    const { ids, data } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ error: 'No IDs provided' });
    await prisma.expense.updateMany({ where: { id: { in: ids } }, data });
    res.json({ message: `${ids.length} expenses updated successfully` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk update expenses' });
  }
});

// Bulk delete sales
router.delete('/sales/bulk-delete', authenticate, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ error: 'No IDs provided' });
    await prisma.sale.deleteMany({ where: { id: { in: ids } } });
    res.json({ message: `${ids.length} sales records deleted successfully` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk delete sales' });
  }
});

// Export sales as CSV
router.get('/truck/:truckId/sales/export/csv', authenticate, exportLimiter, async (req, res) => {
  try {
    const sales = await prisma.sale.findMany({ where: { truckId: req.params.truckId }, orderBy: { date: 'desc' } });
    const data = sales.map(s => ({
      date: s.date.toISOString().split('T')[0], cashSales: s.cashSales, cardSales: s.cardSales,
      mobileSales: s.mobileSales, totalSales: s.totalSales, transactionCount: s.transactionCount, averageTicket: s.averageTicket
    }));
    sendCSV(res, data, ['date', 'cashSales', 'cardSales', 'mobileSales', 'totalSales', 'transactionCount', 'averageTicket'], 'sales-export');
  } catch (error) {
    res.status(500).json({ error: 'Failed to export sales' });
  }
});

// Export sales as PDF
router.get('/truck/:truckId/sales/export/pdf', authenticate, exportLimiter, async (req, res) => {
  try {
    const sales = await prisma.sale.findMany({ where: { truckId: req.params.truckId }, orderBy: { date: 'desc' } });
    const columns = ['Date', 'Cash', 'Card', 'Mobile', 'Total', 'Transactions', 'Avg Ticket'];
    const rows = sales.map(s => [
      s.date.toISOString().split('T')[0], `$${s.cashSales.toFixed(2)}`, `$${s.cardSales.toFixed(2)}`,
      `$${s.mobileSales.toFixed(2)}`, `$${s.totalSales.toFixed(2)}`, s.transactionCount, `$${s.averageTicket.toFixed(2)}`
    ]);
    sendPDF(res, 'Sales Report', columns, rows, 'sales-export');
  } catch (error) {
    res.status(500).json({ error: 'Failed to export sales' });
  }
});

// Export expenses as CSV
router.get('/truck/:truckId/expenses/export/csv', authenticate, exportLimiter, async (req, res) => {
  try {
    const expenses = await prisma.expense.findMany({ where: { truckId: req.params.truckId }, orderBy: { date: 'desc' } });
    const data = expenses.map(e => ({
      date: e.date.toISOString().split('T')[0], category: e.category, description: e.description,
      amount: e.amount, vendor: e.vendor || '', paymentMethod: e.paymentMethod || ''
    }));
    sendCSV(res, data, ['date', 'category', 'description', 'amount', 'vendor', 'paymentMethod'], 'expenses-export');
  } catch (error) {
    res.status(500).json({ error: 'Failed to export expenses' });
  }
});

// Export expenses as PDF
router.get('/truck/:truckId/expenses/export/pdf', authenticate, exportLimiter, async (req, res) => {
  try {
    const expenses = await prisma.expense.findMany({ where: { truckId: req.params.truckId }, orderBy: { date: 'desc' } });
    const columns = ['Date', 'Category', 'Description', 'Amount', 'Vendor'];
    const rows = expenses.map(e => [
      e.date.toISOString().split('T')[0], e.category, e.description, `$${e.amount.toFixed(2)}`, e.vendor || '-'
    ]);
    sendPDF(res, 'Expenses Report', columns, rows, 'expenses-export');
  } catch (error) {
    res.status(500).json({ error: 'Failed to export expenses' });
  }
});

module.exports = router;
