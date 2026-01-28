const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Weather API integration (OpenWeatherMap)
// Set WEATHER_API_KEY in environment variables

const WEATHER_API_BASE = 'https://api.openweathermap.org/data/2.5';

// Fetch weather from API
async function fetchWeatherFromAPI(latitude, longitude, date = null) {
  const apiKey = process.env.WEATHER_API_KEY;

  if (!apiKey) {
    console.warn('WEATHER_API_KEY not set, using mock weather data');
    return getMockWeather(date);
  }

  try {
    // For current/near-future weather, use current weather endpoint
    // For forecasts, use the 5-day forecast endpoint
    const url = `${WEATHER_API_BASE}/weather?lat=${latitude}&lon=${longitude}&units=imperial&appid=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      temperature: data.main.temp,
      conditions: data.weather[0].main,
      description: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      icon: data.weather[0].icon
    };
  } catch (error) {
    console.error('Weather API error:', error);
    return getMockWeather(date);
  }
}

// Get mock weather for development
function getMockWeather(date) {
  const conditions = ['Clear', 'Clouds', 'Rain', 'Drizzle', 'Thunderstorm', 'Snow'];
  const d = date ? new Date(date) : new Date();
  const month = d.getMonth();

  // Seasonal temperature ranges
  let tempBase;
  if (month >= 5 && month <= 8) tempBase = 75; // Summer
  else if (month >= 11 || month <= 2) tempBase = 45; // Winter
  else tempBase = 60; // Spring/Fall

  const temp = tempBase + (Math.random() * 20 - 10);
  const conditionIndex = Math.floor(Math.random() * (month >= 11 || month <= 2 ? 6 : 4));

  return {
    temperature: Math.round(temp),
    conditions: conditions[conditionIndex],
    description: conditions[conditionIndex].toLowerCase(),
    humidity: Math.round(40 + Math.random() * 40),
    windSpeed: Math.round(5 + Math.random() * 15),
    icon: '01d'
  };
}

// Get weather with caching
async function getWeather(latitude, longitude, date = new Date()) {
  // Round coordinates to reduce cache misses
  const lat = Math.round(latitude * 100) / 100;
  const lon = Math.round(longitude * 100) / 100;
  const dateKey = new Date(date);
  dateKey.setHours(0, 0, 0, 0);

  // Check cache first
  const cached = await prisma.weatherCache.findUnique({
    where: {
      latitude_longitude_date: {
        latitude: lat,
        longitude: lon,
        date: dateKey
      }
    }
  });

  // Use cache if less than 3 hours old
  if (cached && (new Date() - new Date(cached.fetchedAt)) < 3 * 60 * 60 * 1000) {
    return {
      temperature: cached.temperature,
      conditions: cached.conditions,
      humidity: cached.humidity,
      cached: true
    };
  }

  // Fetch fresh weather
  const weather = await fetchWeatherFromAPI(lat, lon, date);

  // Cache the result
  await prisma.weatherCache.upsert({
    where: {
      latitude_longitude_date: {
        latitude: lat,
        longitude: lon,
        date: dateKey
      }
    },
    update: {
      temperature: weather.temperature,
      conditions: weather.conditions,
      humidity: weather.humidity,
      fetchedAt: new Date()
    },
    create: {
      latitude: lat,
      longitude: lon,
      date: dateKey,
      temperature: weather.temperature,
      conditions: weather.conditions,
      humidity: weather.humidity
    }
  });

  return { ...weather, cached: false };
}

// Calculate weather impact factor for demand prediction
function calculateWeatherFactor(weather) {
  let factor = 1.0;

  // Temperature impact
  if (weather.temperature >= 65 && weather.temperature <= 85) {
    factor *= 1.2; // Ideal weather boost
  } else if (weather.temperature < 50 || weather.temperature > 95) {
    factor *= 0.7; // Extreme weather penalty
  }

  // Weather conditions impact
  const conditionFactors = {
    'Clear': 1.3,
    'Sunny': 1.3,
    'Clouds': 1.0,
    'Partly Cloudy': 1.1,
    'Overcast': 0.9,
    'Mist': 0.85,
    'Drizzle': 0.7,
    'Rain': 0.5,
    'Thunderstorm': 0.3,
    'Snow': 0.4
  };

  const conditionFactor = conditionFactors[weather.conditions] || 1.0;
  factor *= conditionFactor;

  // Humidity impact (high humidity reduces outdoor activity)
  if (weather.humidity > 80) {
    factor *= 0.9;
  }

  return Math.round(factor * 100) / 100;
}

// Get weather for multiple days (forecast)
async function getForecast(latitude, longitude, days = 5) {
  const forecasts = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    const weather = await getWeather(latitude, longitude, date);
    const factor = calculateWeatherFactor(weather);

    forecasts.push({
      date,
      dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'long' }),
      weather,
      weatherFactor: factor,
      recommendation: getWeatherRecommendation(weather, factor)
    });
  }

  return forecasts;
}

// Get recommendation based on weather
function getWeatherRecommendation(weather, factor) {
  if (factor >= 1.2) {
    return {
      level: 'excellent',
      message: 'Perfect weather for food truck operations!',
      suggestions: ['Consider extending hours', 'Stock up on cold beverages']
    };
  } else if (factor >= 1.0) {
    return {
      level: 'good',
      message: 'Good conditions expected',
      suggestions: ['Normal operations recommended']
    };
  } else if (factor >= 0.7) {
    return {
      level: 'moderate',
      message: 'Weather may affect customer turnout',
      suggestions: ['Consider reducing prep quantities', 'Have a covered area if possible']
    };
  } else {
    return {
      level: 'poor',
      message: 'Challenging weather conditions',
      suggestions: ['Consider rescheduling if possible', 'Focus on comfort food', 'Minimal staffing recommended']
    };
  }
}

// Get weather summary for a location
async function getLocationWeatherSummary(locationId) {
  const location = await prisma.location.findUnique({
    where: { id: locationId }
  });

  if (!location || !location.latitude || !location.longitude) {
    return null;
  }

  const current = await getWeather(location.latitude, location.longitude);
  const forecast = await getForecast(location.latitude, location.longitude, 3);

  return {
    location: {
      id: location.id,
      name: location.name,
      address: location.address
    },
    current: {
      ...current,
      factor: calculateWeatherFactor(current)
    },
    forecast
  };
}

module.exports = {
  getWeather,
  fetchWeatherFromAPI,
  calculateWeatherFactor,
  getForecast,
  getWeatherRecommendation,
  getLocationWeatherSummary
};
