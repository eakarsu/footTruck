const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const openrouter = require('../services/openrouter');
const weatherService = require('../services/weather');

const router = express.Router();
const prisma = new PrismaClient();

// Get all AI recommendations for a truck
router.get('/truck/:truckId/recommendations', authenticate, async (req, res) => {
  try {
    const recommendations = await prisma.aIRecommendation.findMany({
      where: { truckId: req.params.truckId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    res.json(recommendations);
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// Generate new AI recommendations using OpenRouter
router.post('/truck/:truckId/generate', authenticate, async (req, res) => {
  try {
    const truckId = req.params.truckId;

    // Get truck info
    const truck = await prisma.truck.findUnique({
      where: { id: truckId }
    });

    // Gather data for recommendations
    const [locationHistory, recentOrders, events, menuItems] = await Promise.all([
      prisma.truckLocation.findMany({
        where: { truckId, status: 'COMPLETED' },
        include: { location: true },
        orderBy: { date: 'desc' },
        take: 50
      }),
      prisma.order.findMany({
        where: { truckId },
        include: { items: { include: { menuItem: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100
      }),
      prisma.eventRegistration.findMany({
        where: { truckId, status: 'APPROVED' },
        include: { event: true }
      }),
      prisma.menuItem.findMany({
        where: {
          category: {
            menu: { truckId }
          }
        }
      })
    ]);

    // Count orders per menu item
    const orderCounts = {};
    recentOrders.forEach(order => {
      order.items?.forEach(item => {
        orderCounts[item.menuItemId] = (orderCounts[item.menuItemId] || 0) + item.quantity;
      });
    });

    const menuItemsWithCounts = menuItems.map(item => ({
      ...item,
      orderCount: orderCounts[item.id] || 0
    }));

    // Calculate location stats
    const locationStats = {};
    locationHistory.forEach(h => {
      if (!h.location) return;
      const locId = h.locationId;
      if (!locationStats[locId]) {
        locationStats[locId] = {
          location: h.location,
          totalRevenue: 0,
          visits: 0
        };
      }
      locationStats[locId].totalRevenue += h.revenue || 0;
      locationStats[locId].visits++;
    });

    const locationStatsArray = Object.values(locationStats).map(s => ({
      ...s,
      averageRevenue: s.visits > 0 ? s.totalRevenue / s.visits : 0
    }));

    // Calculate menu insights
    const avgSold = menuItemsWithCounts.reduce((sum, i) => sum + i.orderCount, 0) / menuItemsWithCounts.length || 0;
    const menuInsights = {
      stars: menuItemsWithCounts.filter(i => i.orderCount > avgSold * 1.5),
      dogs: menuItemsWithCounts.filter(i => i.orderCount < avgSold * 0.5)
    };

    const newRecommendations = [];

    // Generate AI-powered location recommendation
    if (locationStatsArray.length > 0) {
      try {
        const locationRec = await openrouter.generateLocationRecommendation(
          locationStatsArray,
          truck.name
        );
        const saved = await prisma.aIRecommendation.create({
          data: {
            truckId,
            type: 'LOCATION',
            title: 'AI Location Recommendation',
            description: locationRec,
            confidence: 0.85,
            data: { basedOnLocations: locationStatsArray.length }
          }
        });
        newRecommendations.push(saved);
      } catch (e) {
        console.error('Location AI error:', e.message);
      }
    }

    // Generate AI-powered demand forecast
    const topItems = menuItemsWithCounts
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 5)
      .map(i => ({ item: i.name, predictedQuantity: Math.round(i.orderCount / 7) || 1 }));

    if (topItems.length > 0) {
      try {
        const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
        const demandRec = await openrouter.generateDemandForecast(
          topItems,
          dayOfWeek,
          truck.name
        );
        const saved = await prisma.aIRecommendation.create({
          data: {
            truckId,
            type: 'DEMAND',
            title: 'AI Demand Forecast',
            description: demandRec,
            confidence: 0.8,
            data: { topItems }
          }
        });
        newRecommendations.push(saved);
      } catch (e) {
        console.error('Demand AI error:', e.message);
      }
    }

    // Generate AI-powered menu insights
    if (menuItemsWithCounts.length > 0) {
      try {
        const menuRec = await openrouter.generateMenuInsights(
          menuInsights,
          truck.name
        );
        const saved = await prisma.aIRecommendation.create({
          data: {
            truckId,
            type: 'MENU',
            title: 'AI Menu Optimization',
            description: menuRec,
            confidence: 0.75,
            data: { stars: menuInsights.stars.length, dogs: menuInsights.dogs.length }
          }
        });
        newRecommendations.push(saved);
      } catch (e) {
        console.error('Menu AI error:', e.message);
      }
    }

    // Generate weather recommendation
    try {
      const weatherConditions = ['Sunny and warm (85°F)', 'Cloudy with chance of rain', 'Cool and breezy (65°F)', 'Hot and humid (95°F)'];
      const condition = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
      const weatherRec = await openrouter.generateWeatherRecommendation(condition, truck.name);
      const saved = await prisma.aIRecommendation.create({
        data: {
          truckId,
          type: 'WEATHER',
          title: 'Weather-Based Recommendation',
          description: weatherRec,
          confidence: 0.7,
          data: { condition }
        }
      });
      newRecommendations.push(saved);
    } catch (e) {
      console.error('Weather AI error:', e.message);
    }

    // Social media recommendation
    try {
      const socialPost = await openrouter.generateSocialPost(
        'CUSTOMER_ENGAGEMENT',
        {},
        truck.name
      );
      const saved = await prisma.aIRecommendation.create({
        data: {
          truckId,
          type: 'SOCIAL_MEDIA',
          title: 'AI Social Post Suggestion',
          description: socialPost,
          confidence: 0.65,
          data: {}
        }
      });
      newRecommendations.push(saved);
    } catch (e) {
      console.error('Social AI error:', e.message);
    }

    res.status(201).json(newRecommendations);
  } catch (error) {
    console.error('Generate recommendations error:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// Mark recommendation as actioned
router.patch('/:id/action', authenticate, async (req, res) => {
  try {
    const recommendation = await prisma.aIRecommendation.update({
      where: { id: req.params.id },
      data: {
        isActioned: true,
        actionedAt: new Date()
      }
    });

    res.json(recommendation);
  } catch (error) {
    console.error('Action recommendation error:', error);
    res.status(500).json({ error: 'Failed to update recommendation' });
  }
});

// AI Location Recommender
router.get('/truck/:truckId/location-suggest', authenticate, async (req, res) => {
  try {
    const truck = await prisma.truck.findUnique({
      where: { id: req.params.truckId }
    });

    const history = await prisma.truckLocation.findMany({
      where: {
        truckId: req.params.truckId,
        status: 'COMPLETED'
      },
      include: { location: true }
    });

    // Calculate scores for each location
    const locationScores = {};
    history.forEach(h => {
      if (!h.location) return;
      const locId = h.locationId;
      if (!locationScores[locId]) {
        locationScores[locId] = {
          location: h.location,
          totalRevenue: 0,
          visits: 0,
          avgCustomers: 0
        };
      }
      locationScores[locId].totalRevenue += h.revenue || 0;
      locationScores[locId].visits++;
      locationScores[locId].avgCustomers += h.customerCount || 0;
    });

    const suggestions = Object.values(locationScores)
      .map(s => ({
        ...s,
        score: (s.totalRevenue / s.visits) * Math.log(s.visits + 1),
        avgRevenue: s.totalRevenue / s.visits,
        avgCustomers: s.avgCustomers / s.visits
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    let aiRecommendation = `Based on ${history.length} historical visits, `;
    console.log(`Location AI: ${suggestions.length} suggestions, ${history.length} history items`);
    if (suggestions.length > 0) {
      try {
        console.log('Location AI: Calling OpenRouter...');
        const startTime = Date.now();
        aiRecommendation = await openrouter.generateLocationRecommendation(
          suggestions,
          truck.name
        );
        console.log(`Location AI: OpenRouter responded in ${Date.now() - startTime}ms`);
      } catch (e) {
        console.log('Location AI: OpenRouter failed, using fallback:', e.message);
        aiRecommendation = suggestions[0]?.location?.name
          ? `We recommend ${suggestions[0].location.name} based on your highest average revenue of $${suggestions[0].avgRevenue.toFixed(2)} per visit.`
          : 'Not enough data to make a recommendation yet.';
      }
    } else {
      console.log('Location AI: No suggestions, using default message');
      aiRecommendation = 'Start tracking your location visits to get personalized AI recommendations!';
    }

    res.json({
      suggestions,
      basedOn: history.length,
      recommendation: aiRecommendation
    });
  } catch (error) {
    console.error('Location suggest error:', error);
    res.status(500).json({ error: 'Failed to get location suggestions' });
  }
});

// AI Social Media Manager - Generate post
router.post('/truck/:truckId/generate-post', authenticate, async (req, res) => {
  try {
    const { type, locationInfo, menuInfo } = req.body;

    const truck = await prisma.truck.findUnique({
      where: { id: req.params.truckId }
    });

    let content = '';

    try {
      content = await openrouter.generateSocialPost(
        type || 'CUSTOMER_ENGAGEMENT',
        {
          locationName: locationInfo?.name,
          date: locationInfo?.date,
          startTime: locationInfo?.startTime,
          endTime: locationInfo?.endTime,
          items: menuInfo?.items,
          special: menuInfo?.special
        },
        truck.name
      );
    } catch (e) {
      // Fallback content
      switch (type) {
        case 'LOCATION_ANNOUNCEMENT':
          content = `📍 Find us today at ${locationInfo?.name || 'a great spot'}!\n📅 ${locationInfo?.date || 'Today'}\n⏰ ${locationInfo?.startTime || 'All day'}\nCome hungry! 🌮`;
          break;
        case 'DAILY_MENU':
          content = `🍽️ Today's Menu!\n${menuInfo?.items?.map(i => `• ${i}`).join('\n') || 'Check out our delicious offerings!'}\nSee you soon! 😋`;
          break;
        default:
          content = `🚚 Your favorite food truck is rolling! Come find us today! 😋`;
      }
    }

    const post = await prisma.socialPost.create({
      data: {
        truckId: req.params.truckId,
        platform: 'INSTAGRAM',
        content,
        type: type || 'CUSTOMER_ENGAGEMENT',
        status: 'DRAFT',
        isAIGenerated: true
      }
    });

    res.status(201).json(post);
  } catch (error) {
    console.error('Generate post error:', error);
    res.status(500).json({ error: 'Failed to generate post' });
  }
});

// AI Demand Predictor
router.get('/truck/:truckId/demand-forecast', authenticate, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    const dayOfWeek = targetDate.getDay();
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];

    const truck = await prisma.truck.findUnique({
      where: { id: req.params.truckId }
    });

    // Get historical orders for similar days
    const orders = await prisma.order.findMany({
      where: {
        truckId: req.params.truckId,
        status: { not: 'CANCELLED' }
      },
      include: {
        items: {
          include: { menuItem: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 500
    });

    // Analyze patterns
    const itemDemand = {};
    orders.forEach(order => {
      const orderDay = new Date(order.createdAt).getDay();
      const weight = orderDay === dayOfWeek ? 2 : 1;

      order.items?.forEach(item => {
        const name = item.menuItem?.name || 'Unknown';
        if (!itemDemand[name]) {
          itemDemand[name] = { total: 0, weighted: 0 };
        }
        itemDemand[name].total += item.quantity;
        itemDemand[name].weighted += item.quantity * weight;
      });
    });

    const forecast = Object.entries(itemDemand)
      .map(([name, data]) => ({
        item: name,
        predictedQuantity: Math.round(data.weighted / Math.max(orders.length / 7, 1)),
        confidence: Math.min(0.9, orders.length / 100)
      }))
      .sort((a, b) => b.predictedQuantity - a.predictedQuantity);

    // Get AI recommendation for prep
    let aiRecommendation = '';
    console.log(`Demand Forecast: ${forecast.length} items forecasted`);
    if (forecast.length > 0) {
      try {
        console.log('Demand Forecast: Calling OpenRouter...');
        const startTime = Date.now();
        aiRecommendation = await openrouter.generateDemandForecast(
          forecast.slice(0, 5),
          dayName,
          truck.name
        );
        console.log(`Demand Forecast: OpenRouter responded in ${Date.now() - startTime}ms`);
      } catch (e) {
        console.log('Demand Forecast: OpenRouter failed, using fallback:', e.message);
        aiRecommendation = `Prep ${forecast[0]?.item} and ${forecast[1]?.item} as your top sellers.`;
      }
    }

    res.json({
      date: targetDate.toISOString().split('T')[0],
      dayOfWeek: dayName,
      forecast,
      basedOnOrders: orders.length,
      aiRecommendation
    });
  } catch (error) {
    console.error('Demand forecast error:', error);
    res.status(500).json({ error: 'Failed to generate forecast' });
  }
});

// AI Menu Optimizer
router.get('/truck/:truckId/menu-insights', authenticate, async (req, res) => {
  try {
    const truck = await prisma.truck.findUnique({
      where: { id: req.params.truckId }
    });

    const orders = await prisma.order.findMany({
      where: {
        truckId: req.params.truckId,
        status: { not: 'CANCELLED' }
      },
      include: {
        items: {
          include: { menuItem: true }
        }
      }
    });

    const itemStats = {};
    let totalRevenue = 0;

    orders.forEach(order => {
      order.items?.forEach(item => {
        const id = item.menuItemId;
        if (!itemStats[id]) {
          itemStats[id] = {
            id,
            name: item.menuItem?.name || 'Unknown',
            price: item.menuItem?.price || 0,
            soldCount: 0,
            revenue: 0
          };
        }
        itemStats[id].soldCount += item.quantity;
        itemStats[id].revenue += item.totalPrice;
        totalRevenue += item.totalPrice;
      });
    });

    const items = Object.values(itemStats);
    const avgSold = items.reduce((sum, i) => sum + i.soldCount, 0) / items.length || 0;

    const insights = {
      stars: items.filter(i => i.soldCount > avgSold * 1.5 && i.revenue > totalRevenue / items.length),
      puzzles: items.filter(i => i.soldCount > avgSold && i.revenue < totalRevenue / items.length),
      plow_horses: items.filter(i => i.soldCount < avgSold && i.revenue > totalRevenue / items.length),
      dogs: items.filter(i => i.soldCount < avgSold * 0.5)
    };

    // Get AI recommendations
    let aiRecommendations = [];
    console.log(`Menu Insights: ${items.length} items, ${orders.length} orders`);
    try {
      console.log('Menu Insights: Calling OpenRouter...');
      const startTime = Date.now();
      const aiResponse = await openrouter.generateMenuInsights(insights, truck.name);
      console.log(`Menu Insights: OpenRouter responded in ${Date.now() - startTime}ms`);
      aiRecommendations = aiResponse.split('\n').filter(r => r.trim());
    } catch (e) {
      console.log('Menu Insights: OpenRouter failed, using fallback:', e.message);
      aiRecommendations = [
        insights.stars.length > 0 ? `Promote your star items: ${insights.stars.map(i => i.name).join(', ')}` : null,
        insights.dogs.length > 0 ? `Consider removing or revamping: ${insights.dogs.map(i => i.name).join(', ')}` : null,
        insights.puzzles.length > 0 ? `Increase prices on: ${insights.puzzles.map(i => i.name).join(', ')}` : null
      ].filter(Boolean);
    }

    res.json({
      insights,
      recommendations: aiRecommendations,
      totalItemsAnalyzed: items.length,
      totalOrdersAnalyzed: orders.length
    });
  } catch (error) {
    console.error('Menu insights error:', error);
    res.status(500).json({ error: 'Failed to get menu insights' });
  }
});

// AI Customer Engagement - Generate response
router.post('/truck/:truckId/generate-response', authenticate, async (req, res) => {
  try {
    const { customerMessage } = req.body;

    const truck = await prisma.truck.findUnique({
      where: { id: req.params.truckId }
    });

    let response = '';
    try {
      response = await openrouter.generateCustomerEngagementResponse(
        customerMessage,
        truck.name
      );
    } catch (e) {
      response = "Thanks for reaching out! We appreciate your support! 😊";
    }

    res.json({ response });
  } catch (error) {
    console.error('Generate response error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

// ==================== ENHANCED DEMAND PREDICTION ====================

// Weather-enhanced demand forecast
router.get('/truck/:truckId/demand-forecast/enhanced', authenticate, async (req, res) => {
  try {
    const { date, locationId } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    const dayOfWeek = targetDate.getDay();
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];

    const truck = await prisma.truck.findUnique({
      where: { id: req.params.truckId }
    });

    // Get location for weather
    let location = null;
    let weather = null;

    if (locationId) {
      location = await prisma.location.findUnique({
        where: { id: locationId }
      });
    }

    // If no specific location, try to get from upcoming booking
    if (!location) {
      const upcomingBooking = await prisma.truckLocation.findFirst({
        where: {
          truckId: req.params.truckId,
          date: { gte: new Date() },
          status: { in: ['SCHEDULED', 'CONFIRMED'] }
        },
        include: { location: true },
        orderBy: { date: 'asc' }
      });
      location = upcomingBooking?.location;
    }

    // Get weather if we have location coordinates
    if (location?.latitude && location?.longitude) {
      weather = await weatherService.getWeather(location.latitude, location.longitude, targetDate);
      weather.factor = weatherService.calculateWeatherFactor(weather);
    } else {
      // Default weather
      weather = {
        temperature: 72,
        conditions: 'Clear',
        humidity: 50,
        factor: 1.0
      };
    }

    // Get historical data for this location
    const historicalData = await prisma.locationAnalytics.findMany({
      where: {
        truckId: req.params.truckId,
        ...(locationId && { locationId })
      },
      orderBy: { date: 'desc' },
      take: 20
    });

    // Filter for similar days of week in code
    const similarDayData = historicalData.filter(d => {
      const dataDay = new Date(d.date).getDay();
      return dataDay === dayOfWeek;
    }).slice(0, 10);

    // Get top items
    const orders = await prisma.order.findMany({
      where: {
        truckId: req.params.truckId,
        status: { not: 'CANCELLED' }
      },
      include: {
        items: { include: { menuItem: true } }
      },
      take: 200
    });

    const itemStats = {};
    orders.forEach(order => {
      order.items?.forEach(item => {
        const name = item.menuItem?.name || 'Unknown';
        if (!itemStats[name]) {
          itemStats[name] = { name, quantity: 0, revenue: 0, count: 0 };
        }
        itemStats[name].quantity += item.quantity;
        itemStats[name].revenue += item.totalPrice;
        itemStats[name].count++;
      });
    });

    const topItems = Object.values(itemStats)
      .map(i => ({
        ...i,
        avgQuantity: Math.round(i.quantity / Math.max(i.count, 1))
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8);

    // Calculate base predictions from historical data (use similar day data if available)
    const dataForPrediction = similarDayData.length > 0 ? similarDayData : historicalData;
    let basePrediction = {
      customers: 50,
      revenue: 500
    };

    if (dataForPrediction.length > 0) {
      basePrediction.customers = Math.round(
        dataForPrediction.reduce((sum, h) => sum + h.customerCount, 0) / dataForPrediction.length
      );
      basePrediction.revenue = Math.round(
        dataForPrediction.reduce((sum, h) => sum + h.revenue, 0) / dataForPrediction.length
      );
    }

    // Apply weather factor
    const weatherAdjustedPrediction = {
      customers: Math.round(basePrediction.customers * weather.factor),
      revenue: Math.round(basePrediction.revenue * weather.factor)
    };

    // Generate AI-enhanced prediction
    let aiPrediction = null;
    try {
      aiPrediction = await openrouter.generateEnhancedDemandForecast({
        date: targetDate.toISOString().split('T')[0],
        dayOfWeek: dayName,
        location: location || { name: 'Unknown', city: 'Unknown' },
        weather: {
          temperature: weather.temperature,
          conditions: weather.conditions,
          factor: weather.factor
        },
        historicalData: dataForPrediction.slice(0, 5).map(h => ({
          dayOfWeek: dayName,
          customerCount: h.customerCount,
          revenue: h.revenue
        })),
        topItems: topItems.slice(0, 5)
      }, truck.name);
    } catch (e) {
      console.error('AI prediction error:', e.message);
    }

    res.json({
      date: targetDate.toISOString().split('T')[0],
      dayOfWeek: dayName,
      location: location ? {
        id: location.id,
        name: location.name,
        address: location.address
      } : null,
      weather: {
        temperature: weather.temperature,
        conditions: weather.conditions,
        humidity: weather.humidity,
        factor: weather.factor,
        recommendation: weatherService.getWeatherRecommendation(weather, weather.factor)
      },
      prediction: {
        base: basePrediction,
        weatherAdjusted: weatherAdjustedPrediction,
        ai: aiPrediction
      },
      topItems,
      historicalDataPoints: dataForPrediction.length,
      confidence: Math.min(0.9, dataForPrediction.length / 10)
    });
  } catch (error) {
    console.error('Enhanced forecast error:', error);
    res.status(500).json({ error: 'Failed to generate enhanced forecast' });
  }
});

// Get demand patterns analysis
router.get('/truck/:truckId/demand-patterns', authenticate, async (req, res) => {
  try {
    const { locationId, startDate, endDate } = req.query;

    const where = { truckId: req.params.truckId };
    if (locationId) where.locationId = locationId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const analytics = await prisma.locationAnalytics.findMany({
      where,
      include: { location: true },
      orderBy: { date: 'desc' }
    });

    // Group by day of week (calculated from date)
    const byDayOfWeek = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    analytics.forEach(a => {
      const dayIndex = new Date(a.date).getDay();
      const day = dayNames[dayIndex];
      if (!byDayOfWeek[day]) {
        byDayOfWeek[day] = { revenue: [], customers: [], orders: [] };
      }
      byDayOfWeek[day].revenue.push(a.revenue);
      byDayOfWeek[day].customers.push(a.customerCount);
      byDayOfWeek[day].orders.push(a.orderCount);
    });

    const dayPatterns = Object.entries(byDayOfWeek).map(([day, data]) => ({
      day,
      avgRevenue: data.revenue.reduce((a, b) => a + b, 0) / data.revenue.length,
      avgCustomers: Math.round(data.customers.reduce((a, b) => a + b, 0) / data.customers.length),
      avgOrders: Math.round(data.orders.reduce((a, b) => a + b, 0) / data.orders.length),
      dataPoints: data.revenue.length
    })).sort((a, b) => b.avgRevenue - a.avgRevenue);

    // Group by weather condition
    const byWeather = {};
    analytics.forEach(a => {
      const condition = a.weatherCondition || 'Unknown';
      if (!byWeather[condition]) {
        byWeather[condition] = { revenue: [], customers: [] };
      }
      byWeather[condition].revenue.push(a.revenue);
      byWeather[condition].customers.push(a.customerCount);
    });

    const weatherPatterns = Object.entries(byWeather).map(([condition, data]) => ({
      condition,
      avgRevenue: data.revenue.reduce((a, b) => a + b, 0) / data.revenue.length,
      avgCustomers: Math.round(data.customers.reduce((a, b) => a + b, 0) / data.customers.length),
      dataPoints: data.revenue.length
    })).sort((a, b) => b.avgRevenue - a.avgRevenue);

    // Peak hours analysis
    const peakHours = {};
    analytics.forEach(a => {
      if (a.peakHour !== null) {
        peakHours[a.peakHour] = (peakHours[a.peakHour] || 0) + 1;
      }
    });

    const peakHoursData = Object.entries(peakHours)
      .map(([hour, count]) => ({
        hour: parseInt(hour),
        occurrences: count,
        percentage: (count / analytics.length) * 100
      }))
      .sort((a, b) => b.occurrences - a.occurrences);

    res.json({
      totalDataPoints: analytics.length,
      patterns: {
        byDayOfWeek: dayPatterns,
        byWeather: weatherPatterns,
        peakHours: peakHoursData
      },
      bestDay: dayPatterns[0] || null,
      worstDay: dayPatterns[dayPatterns.length - 1] || null
    });
  } catch (error) {
    console.error('Demand patterns error:', error);
    res.status(500).json({ error: 'Failed to get demand patterns' });
  }
});

// Generate and save predictions
router.post('/truck/:truckId/predictions/generate', authenticate, async (req, res) => {
  try {
    const { locationId, startDate, endDate } = req.body;
    const truck = await prisma.truck.findUnique({
      where: { id: req.params.truckId }
    });

    const location = await prisma.location.findUnique({
      where: { id: locationId }
    });

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    // Get historical data
    const historicalData = await prisma.locationAnalytics.findMany({
      where: {
        truckId: req.params.truckId,
        locationId
      },
      orderBy: { date: 'desc' },
      take: 30
    });

    // Generate predictions for each day
    const predictions = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];

      // Get weather
      let weather = { temperature: 72, conditions: 'Clear', factor: 1.0 };
      if (location.latitude && location.longitude) {
        weather = await weatherService.getWeather(location.latitude, location.longitude, d);
        weather.factor = weatherService.calculateWeatherFactor(weather);
      }

      // Calculate prediction based on historical data for same day of week
      const sameDayHistory = historicalData.filter(h => h.dayOfWeek === dayOfWeek);
      let predictedCustomers = 50;
      let predictedRevenue = 500;

      if (sameDayHistory.length > 0) {
        predictedCustomers = Math.round(
          sameDayHistory.reduce((sum, h) => sum + h.customerCount, 0) / sameDayHistory.length * weather.factor
        );
        predictedRevenue = Math.round(
          sameDayHistory.reduce((sum, h) => sum + h.revenue, 0) / sameDayHistory.length * weather.factor
        );
      }

      const prediction = await prisma.demandPrediction.upsert({
        where: {
          id: `${req.params.truckId}-${locationId}-${d.toISOString().split('T')[0]}`
        },
        update: {
          predictedCustomers,
          predictedRevenue,
          confidence: Math.min(0.9, sameDayHistory.length / 10),
          weatherFactor: weather.factor
        },
        create: {
          date: new Date(d),
          dayOfWeek,
          hourStart: 11,
          predictedCustomers,
          predictedRevenue,
          confidence: Math.min(0.9, sameDayHistory.length / 10),
          weatherFactor: weather.factor,
          truckId: req.params.truckId,
          locationId
        }
      });

      predictions.push({
        date: d.toISOString().split('T')[0],
        dayOfWeek: dayName,
        ...prediction,
        weather: {
          temperature: weather.temperature,
          conditions: weather.conditions,
          factor: weather.factor
        }
      });
    }

    res.status(201).json({
      location: {
        id: location.id,
        name: location.name
      },
      predictions,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Generate predictions error:', error);
    res.status(500).json({ error: 'Failed to generate predictions' });
  }
});

// Audit-driven addition: "Dynamic pricing engine".
router.post('/truck/:truckId/dynamic-pricing', authenticate, async (req, res) => {
  try {
    const truckId = req.params.truckId;
    const { hourOfDay, dayOfWeek, weatherOverride } = req.body || {};

    const truck = await prisma.truck.findUnique({ where: { id: truckId } });
    if (!truck) {
      return res.status(404).json({ error: 'Truck not found' });
    }

    const menuItems = await prisma.menuItem.findMany({
      where: { truckId },
      take: 50,
    }).catch(() => []);

    let weather = weatherOverride || null;
    if (!weather) {
      try {
        weather = await weatherService.getCurrent({ truckId });
      } catch (_) {
        weather = null;
      }
    }

    const recentOrders = await prisma.order.findMany({
      where: { truckId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }).catch(() => []);

    const prompt = `You are a food-truck dynamic-pricing engine. Recommend per-item price adjustments for the requested time slot.

Truck: ${truck.name || truckId}
Hour of day: ${hourOfDay ?? 'unspecified'}
Day of week: ${dayOfWeek ?? 'unspecified'}
Weather: ${JSON.stringify(weather)}

Menu items (sample):
${JSON.stringify(menuItems.slice(0, 30), null, 2)}

Recent orders (sample, last 100):
${JSON.stringify(recentOrders.slice(0, 30), null, 2)}

Respond with strict JSON only:
{"window": <string>, "items": [{"item_id": <id>, "current_price": <number>, "recommended_price": <number>, "delta_pct": <number>, "reason": <string>}], "global_strategy": <string>, "warnings": [<strings>]}`;

    const ai = await openrouter.chat([{ role: 'user', content: prompt }], { maxTokens: 1500 });
    let parsed = null;
    try {
      const match = (ai || '').match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : null;
    } catch (_) {
      parsed = null;
    }

    res.json({
      truckId,
      pricing: parsed || { raw: ai },
    });
  } catch (error) {
    console.error('Dynamic pricing error:', error);
    res.status(500).json({ error: 'Failed to generate dynamic pricing' });
  }
});

// Audit-driven addition: "Predictive maintenance for equipment".
router.post('/truck/:truckId/predict-maintenance', authenticate, async (req, res) => {
  try {
    const truckId = req.params.truckId;
    const { equipment } = req.body || {};

    const truck = await prisma.truck.findUnique({ where: { id: truckId } });
    if (!truck) {
      return res.status(404).json({ error: 'Truck not found' });
    }

    const prompt = `You are a fleet-maintenance predictor for food trucks. Given the truck details and equipment list, predict the next failure window for each item and recommend preventive actions.

Truck: ${JSON.stringify(truck, null, 2)}

Equipment (caller-supplied):
${JSON.stringify(equipment || [], null, 2)}

Respond with strict JSON only:
{"items": [{"name": <string>, "failure_window": <string>, "probability": <0-1>, "recommended_action": <string>, "estimated_cost_to_prevent": <number>, "estimated_cost_if_fails": <number>}], "summary": <string>}`;

    const ai = await openrouter.chat([{ role: 'user', content: prompt }], { maxTokens: 1500 });
    let parsed = null;
    try {
      const match = (ai || '').match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : null;
    } catch (_) {
      parsed = null;
    }

    res.json({
      truckId,
      maintenance: parsed || { raw: ai },
    });
  } catch (error) {
    console.error('Predict maintenance error:', error);
    res.status(500).json({ error: 'Failed to predict maintenance' });
  }
});

// Audit-driven addition: "Crew scheduling AI (fair scheduling, fatigue management, skill matching)".
router.post('/truck/:truckId/crew-schedule', authenticate, async (req, res) => {
  try {
    const truckId = req.params.truckId;
    const { crew, shifts, constraints } = req.body || {};

    if (!Array.isArray(crew) || !Array.isArray(shifts)) {
      return res.status(400).json({ error: 'crew and shifts arrays are required' });
    }

    const truck = await prisma.truck.findUnique({ where: { id: truckId } });
    if (!truck) {
      return res.status(404).json({ error: 'Truck not found' });
    }

    const prompt = `You are a fair-scheduling agent for a food truck crew. Assign crew members to shifts respecting constraints, balancing hours, and matching skills.

Truck: ${truck.name || truckId}

Crew:
${JSON.stringify(crew, null, 2)}

Shifts to fill:
${JSON.stringify(shifts, null, 2)}

Constraints:
${JSON.stringify(constraints || {}, null, 2)}

Respond with strict JSON only:
{"assignments": [{"shift_id": <id>, "crew_id": <id>, "role": <string>, "rationale": <string>}], "fairness_score": <0-100>, "unassigned": [<shift_ids>], "warnings": [<strings>]}`;

    const ai = await openrouter.chat([{ role: 'user', content: prompt }], { maxTokens: 1500 });
    let parsed = null;
    try {
      const match = (ai || '').match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : null;
    } catch (_) {
      parsed = null;
    }

    res.json({
      truckId,
      schedule: parsed || { raw: ai },
    });
  } catch (error) {
    console.error('Crew schedule error:', error);
    res.status(500).json({ error: 'Failed to generate crew schedule' });
  }
});

module.exports = router;
