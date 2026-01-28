const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Calculate analytics for a specific truck location visit
async function calculateVisitAnalytics(truckLocationId) {
  const truckLocation = await prisma.truckLocation.findUnique({
    where: { id: truckLocationId },
    include: {
      truck: true,
      location: true
    }
  });

  if (!truckLocation || truckLocation.status !== 'COMPLETED') {
    return null;
  }

  const date = new Date(truckLocation.date);
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));

  // Get orders for this truck on this date
  const orders = await prisma.order.findMany({
    where: {
      truckId: truckLocation.truckId,
      createdAt: {
        gte: startOfDay,
        lte: endOfDay
      },
      status: { in: ['PICKED_UP', 'COMPLETED'] }
    },
    include: {
      items: {
        include: {
          menuItem: true
        }
      }
    }
  });

  if (orders.length === 0) {
    return null;
  }

  // Calculate metrics
  const revenue = orders.reduce((sum, o) => sum + o.total, 0);
  const customerCount = new Set(orders.map(o => o.customerPhone || o.customerEmail || o.id)).size;
  const orderCount = orders.length;
  const averageOrderValue = revenue / orderCount;

  // Calculate operating hours
  const [startHour, startMin] = truckLocation.startTime.split(':').map(Number);
  const [endHour, endMin] = truckLocation.endTime.split(':').map(Number);
  const operatingHours = (endHour + endMin / 60) - (startHour + startMin / 60);

  // Calculate peak hour
  const hourCounts = {};
  orders.forEach(order => {
    const hour = new Date(order.createdAt).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  // Calculate top selling items
  const itemCounts = {};
  orders.forEach(order => {
    order.items.forEach(item => {
      const name = item.menuItem.name;
      itemCounts[name] = (itemCounts[name] || 0) + item.quantity;
    });
  });
  const topSellingItems = Object.entries(itemCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Get expenses for the day
  const expenses = await prisma.expense.aggregate({
    where: {
      truckId: truckLocation.truckId,
      date: {
        gte: startOfDay,
        lte: endOfDay
      }
    },
    _sum: {
      amount: true
    }
  });

  const analytics = {
    date: truckLocation.date,
    revenue,
    expenses: expenses._sum.amount || 0,
    customerCount,
    orderCount,
    averageOrderValue,
    peakHour: peakHour ? parseInt(peakHour) : null,
    topSellingItems,
    weatherCondition: null,
    operatingHours,
    revenuePerHour: operatingHours > 0 ? revenue / operatingHours : 0,
    revenuePerCustomer: customerCount > 0 ? revenue / customerCount : 0,
    truckId: truckLocation.truckId,
    locationId: truckLocation.locationId
  };

  // Upsert analytics record
  return prisma.locationAnalytics.upsert({
    where: {
      truckId_locationId_date: {
        truckId: truckLocation.truckId,
        locationId: truckLocation.locationId,
        date: truckLocation.date
      }
    },
    update: analytics,
    create: analytics
  });
}

// Get analytics for all locations of a truck
async function getLocationAnalytics(truckId, params = {}) {
  const { startDate, endDate, locationId } = params;

  const where = { truckId };
  if (locationId) where.locationId = locationId;
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  return prisma.locationAnalytics.findMany({
    where,
    include: {
      location: true
    },
    orderBy: { date: 'desc' }
  });
}

// Get aggregated analytics for a specific location
async function getLocationSummary(truckId, locationId, params = {}) {
  const { startDate, endDate } = params;

  const where = { truckId, locationId };
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  const analytics = await prisma.locationAnalytics.findMany({ where });

  if (analytics.length === 0) {
    return null;
  }

  const totalRevenue = analytics.reduce((sum, a) => sum + a.revenue, 0);
  const totalExpenses = analytics.reduce((sum, a) => sum + (a.expenses || 0), 0);
  const totalCustomers = analytics.reduce((sum, a) => sum + a.customerCount, 0);
  const totalOrders = analytics.reduce((sum, a) => sum + a.orderCount, 0);
  const totalHours = analytics.reduce((sum, a) => sum + a.operatingHours, 0);

  return {
    locationId,
    visitCount: analytics.length,
    totalRevenue,
    totalExpenses,
    profit: totalRevenue - totalExpenses,
    totalCustomers,
    totalOrders,
    averageRevenuePerVisit: totalRevenue / analytics.length,
    averageOrderValue: totalRevenue / totalOrders,
    averageCustomersPerVisit: totalCustomers / analytics.length,
    revenuePerHour: totalHours > 0 ? totalRevenue / totalHours : 0,
    totalOperatingHours: totalHours
  };
}

// Compare multiple locations
async function compareLocations(truckId, locationIds, params = {}) {
  const results = await Promise.all(
    locationIds.map(locationId => getLocationSummary(truckId, locationId, params))
  );

  const locations = await prisma.location.findMany({
    where: { id: { in: locationIds } }
  });

  return results.map((summary, index) => ({
    location: locations.find(l => l.id === locationIds[index]),
    ...summary
  })).filter(r => r.totalRevenue !== undefined);
}

// Get top performing locations
async function getTopLocations(truckId, params = {}) {
  const { limit = 10, sortBy = 'totalRevenue', startDate, endDate } = params;

  const where = { truckId };
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  const analytics = await prisma.locationAnalytics.findMany({
    where,
    include: { location: true }
  });

  // Group by location
  const locationGroups = {};
  analytics.forEach(a => {
    if (!locationGroups[a.locationId]) {
      locationGroups[a.locationId] = {
        location: a.location,
        analytics: []
      };
    }
    locationGroups[a.locationId].analytics.push(a);
  });

  // Calculate aggregates for each location
  const locationSummaries = Object.values(locationGroups).map(group => {
    const totalRevenue = group.analytics.reduce((sum, a) => sum + a.revenue, 0);
    const totalExpenses = group.analytics.reduce((sum, a) => sum + (a.expenses || 0), 0);
    const totalCustomers = group.analytics.reduce((sum, a) => sum + a.customerCount, 0);
    const totalOrders = group.analytics.reduce((sum, a) => sum + a.orderCount, 0);
    const totalHours = group.analytics.reduce((sum, a) => sum + a.operatingHours, 0);
    const visitCount = group.analytics.length;

    return {
      location: group.location,
      visitCount,
      totalRevenue,
      profit: totalRevenue - totalExpenses,
      totalCustomers,
      totalOrders,
      averageRevenuePerVisit: totalRevenue / visitCount,
      revenuePerHour: totalHours > 0 ? totalRevenue / totalHours : 0
    };
  });

  // Sort by specified field
  const sortFields = {
    totalRevenue: (a, b) => b.totalRevenue - a.totalRevenue,
    profit: (a, b) => b.profit - a.profit,
    revenuePerHour: (a, b) => b.revenuePerHour - a.revenuePerHour,
    visitCount: (a, b) => b.visitCount - a.visitCount,
    totalCustomers: (a, b) => b.totalCustomers - a.totalCustomers
  };

  return locationSummaries
    .sort(sortFields[sortBy] || sortFields.totalRevenue)
    .slice(0, limit);
}

// Get trend data over time
async function getTrends(truckId, params = {}) {
  const { startDate, endDate, groupBy = 'day', locationId } = params;

  const where = { truckId };
  if (locationId) where.locationId = locationId;
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  const analytics = await prisma.locationAnalytics.findMany({
    where,
    orderBy: { date: 'asc' }
  });

  // Group by specified period
  const groups = {};
  analytics.forEach(a => {
    let key;
    const date = new Date(a.date);
    if (groupBy === 'day') {
      key = date.toISOString().split('T')[0];
    } else if (groupBy === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split('T')[0];
    } else if (groupBy === 'month') {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    if (!groups[key]) {
      groups[key] = { revenue: 0, customers: 0, orders: 0, visits: 0 };
    }
    groups[key].revenue += a.revenue;
    groups[key].customers += a.customerCount;
    groups[key].orders += a.orderCount;
    groups[key].visits += 1;
  });

  return Object.entries(groups).map(([period, data]) => ({
    period,
    ...data,
    averageOrderValue: data.orders > 0 ? data.revenue / data.orders : 0
  }));
}

// Get revenue per hour metrics
async function getRevenuePerHour(truckId, params = {}) {
  const { startDate, endDate, locationId } = params;

  const where = { truckId };
  if (locationId) where.locationId = locationId;
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  const analytics = await prisma.locationAnalytics.findMany({ where });

  if (analytics.length === 0) {
    return { average: 0, min: 0, max: 0, data: [] };
  }

  const hourlyRates = analytics.map(a => a.revenuePerHour);
  return {
    average: hourlyRates.reduce((a, b) => a + b, 0) / hourlyRates.length,
    min: Math.min(...hourlyRates),
    max: Math.max(...hourlyRates),
    data: analytics.map(a => ({
      date: a.date,
      revenuePerHour: a.revenuePerHour,
      operatingHours: a.operatingHours
    }))
  };
}

// Get peak hours analysis
async function getPeakHours(truckId, params = {}) {
  const { startDate, endDate, locationId } = params;

  const where = { truckId };
  if (locationId) where.locationId = locationId;
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  const analytics = await prisma.locationAnalytics.findMany({ where });

  const hourCounts = {};
  analytics.forEach(a => {
    if (a.peakHour !== null) {
      hourCounts[a.peakHour] = (hourCounts[a.peakHour] || 0) + 1;
    }
  });

  return Object.entries(hourCounts)
    .map(([hour, count]) => ({
      hour: parseInt(hour),
      occurrences: count,
      percentage: (count / analytics.length) * 100
    }))
    .sort((a, b) => b.occurrences - a.occurrences);
}

// Goal management
async function createGoal(data) {
  return prisma.locationGoal.create({ data });
}

async function getGoals(truckId, params = {}) {
  const { locationId, active } = params;

  const where = { truckId };
  if (locationId) where.locationId = locationId;
  if (active) {
    where.endDate = { gte: new Date() };
  }

  return prisma.locationGoal.findMany({
    where,
    include: { location: true },
    orderBy: { startDate: 'desc' }
  });
}

async function updateGoal(id, data) {
  return prisma.locationGoal.update({
    where: { id },
    data
  });
}

async function deleteGoal(id) {
  return prisma.locationGoal.delete({ where: { id } });
}

async function getGoalProgress(goalId) {
  const goal = await prisma.locationGoal.findUnique({
    where: { id: goalId },
    include: { location: true }
  });

  if (!goal) return null;

  const analytics = await prisma.locationAnalytics.findMany({
    where: {
      truckId: goal.truckId,
      locationId: goal.locationId,
      date: {
        gte: goal.startDate,
        lte: goal.endDate
      }
    }
  });

  const actualRevenue = analytics.reduce((sum, a) => sum + a.revenue, 0);
  const actualCustomers = analytics.reduce((sum, a) => sum + a.customerCount, 0);

  const now = new Date();
  const totalDays = (goal.endDate.getTime() - goal.startDate.getTime()) / (1000 * 60 * 60 * 24);
  const elapsedDays = Math.min(
    (now.getTime() - goal.startDate.getTime()) / (1000 * 60 * 60 * 24),
    totalDays
  );
  const progress = elapsedDays / totalDays;

  return {
    goal,
    actual: {
      revenue: actualRevenue,
      customers: actualCustomers
    },
    progress: {
      revenueProgress: (actualRevenue / goal.targetRevenue) * 100,
      customerProgress: goal.targetCustomers ? (actualCustomers / goal.targetCustomers) * 100 : null,
      timeProgress: progress * 100
    },
    onTrack: {
      revenue: actualRevenue >= goal.targetRevenue * progress,
      customers: goal.targetCustomers ? actualCustomers >= goal.targetCustomers * progress : null
    },
    projectedRevenue: progress > 0 ? actualRevenue / progress : 0,
    daysRemaining: Math.max(0, Math.ceil(totalDays - elapsedDays))
  };
}

module.exports = {
  calculateVisitAnalytics,
  getLocationAnalytics,
  getLocationSummary,
  compareLocations,
  getTopLocations,
  getTrends,
  getRevenuePerHour,
  getPeakHours,
  createGoal,
  getGoals,
  updateGoal,
  deleteGoal,
  getGoalProgress
};
