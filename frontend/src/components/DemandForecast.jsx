import { useState, useEffect } from 'react';
import { aiAPI, locationsAPI } from '../services/api';
import { Cloud, Sun, CloudRain, Snowflake, Wind, TrendingUp, Users, DollarSign, Calendar, RefreshCw, AlertCircle } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import toast from 'react-hot-toast';

const weatherIcons = {
  'Clear': Sun,
  'Sunny': Sun,
  'Clouds': Cloud,
  'Rain': CloudRain,
  'Drizzle': CloudRain,
  'Thunderstorm': CloudRain,
  'Snow': Snowflake,
  'Mist': Wind,
  'default': Cloud
};

export default function DemandForecast({ truckId }) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedLocation, setSelectedLocation] = useState('');
  const [locations, setLocations] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [patterns, setPatterns] = useState(null);

  useEffect(() => {
    loadLocations();
  }, [truckId]);

  useEffect(() => {
    if (truckId) {
      loadForecast();
      loadPatterns();
    }
  }, [truckId, selectedDate, selectedLocation]);

  const loadLocations = async () => {
    try {
      const res = await locationsAPI.getAll();
      setLocations(res.data);
    } catch (error) {
      console.error('Failed to load locations:', error);
    }
  };

  const loadForecast = async () => {
    setLoading(true);
    try {
      const res = await aiAPI.getEnhancedForecast(truckId, {
        date: selectedDate,
        locationId: selectedLocation || undefined
      });
      setForecast(res.data);
    } catch (error) {
      console.error('Failed to load forecast:', error);
      toast.error('Failed to load forecast');
    } finally {
      setLoading(false);
    }
  };

  const loadPatterns = async () => {
    try {
      const res = await aiAPI.getDemandPatterns(truckId, {
        locationId: selectedLocation || undefined
      });
      setPatterns(res.data);
    } catch (error) {
      console.error('Failed to load patterns:', error);
    }
  };

  const handleGeneratePredictions = async () => {
    if (!selectedLocation) {
      toast.error('Please select a location first');
      return;
    }

    setGenerating(true);
    try {
      await aiAPI.generatePredictions(truckId, {
        locationId: selectedLocation,
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(addDays(new Date(), 7), 'yyyy-MM-dd')
      });
      toast.success('Predictions generated');
      loadForecast();
    } catch (error) {
      toast.error('Failed to generate predictions');
    } finally {
      setGenerating(false);
    }
  };

  const WeatherIcon = forecast?.weather?.conditions
    ? weatherIcons[forecast.weather.conditions] || weatherIcons.default
    : weatherIcons.default;

  const getWeatherFactorColor = (factor) => {
    if (factor >= 1.2) return 'text-green-600 bg-green-100';
    if (factor >= 1.0) return 'text-blue-600 bg-blue-100';
    if (factor >= 0.7) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  if (loading && !forecast) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="label">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="label">Location</label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="input"
            >
              <option value="">Any location</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleGeneratePredictions}
            disabled={generating || !selectedLocation}
            className="btn btn-secondary"
          >
            {generating ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Generate Predictions
          </button>
        </div>
      </div>

      {forecast && (
        <>
          {/* Weather & Prediction Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Weather Card */}
            <div className="card p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <WeatherIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Weather</p>
                  <p className="font-semibold">{forecast.weather?.conditions}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{forecast.weather?.temperature}°F</span>
                <span className={`px-2 py-1 rounded-full text-sm font-medium ${getWeatherFactorColor(forecast.weather?.factor)}`}>
                  {forecast.weather?.factor?.toFixed(2)}x
                </span>
              </div>
            </div>

            {/* Predicted Customers */}
            <div className="card p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Predicted Customers</p>
                  <p className="font-semibold">{forecast.dayOfWeek}</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {forecast.prediction?.weatherAdjusted?.customers || forecast.prediction?.base?.customers || 0}
              </p>
              {forecast.prediction?.base && (
                <p className="text-xs text-gray-500">
                  Base: {forecast.prediction.base.customers} | Adjusted for weather
                </p>
              )}
            </div>

            {/* Predicted Revenue */}
            <div className="card p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Predicted Revenue</p>
                  <p className="font-semibold">Weather Adjusted</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-green-600">
                ${(forecast.prediction?.weatherAdjusted?.revenue || forecast.prediction?.base?.revenue || 0).toFixed(2)}
              </p>
            </div>

            {/* Confidence */}
            <div className="card p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Confidence</p>
                  <p className="font-semibold">{forecast.historicalDataPoints} data points</p>
                </div>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-600"
                  style={{ width: `${(forecast.confidence || 0) * 100}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {((forecast.confidence || 0) * 100).toFixed(0)}% confidence
              </p>
            </div>
          </div>

          {/* Weather Recommendation */}
          {forecast.weather?.recommendation && (
            <div className={`card p-4 border-l-4 ${
              forecast.weather.recommendation.level === 'excellent' ? 'border-green-500 bg-green-50' :
              forecast.weather.recommendation.level === 'good' ? 'border-blue-500 bg-blue-50' :
              forecast.weather.recommendation.level === 'moderate' ? 'border-yellow-500 bg-yellow-50' :
              'border-red-500 bg-red-50'
            }`}>
              <div className="flex items-start gap-3">
                <AlertCircle className={`h-5 w-5 mt-0.5 ${
                  forecast.weather.recommendation.level === 'excellent' ? 'text-green-600' :
                  forecast.weather.recommendation.level === 'good' ? 'text-blue-600' :
                  forecast.weather.recommendation.level === 'moderate' ? 'text-yellow-600' :
                  'text-red-600'
                }`} />
                <div>
                  <p className="font-medium">{forecast.weather.recommendation.message}</p>
                  {forecast.weather.recommendation.suggestions && (
                    <ul className="mt-2 space-y-1">
                      {forecast.weather.recommendation.suggestions.map((s, i) => (
                        <li key={i} className="text-sm text-gray-600">• {s}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Top Items */}
          {forecast.topItems && forecast.topItems.length > 0 && (
            <div className="card p-6">
              <h3 className="font-semibold mb-4">Prep Recommendations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  {forecast.topItems.slice(0, 4).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">{item.name}</span>
                      <div className="text-right">
                        <span className="text-sm text-gray-500">Prep ~</span>
                        <span className="ml-1 font-bold text-primary-600">
                          {Math.round(item.avgQuantity * (forecast.weather?.factor || 1))} units
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {forecast.topItems.slice(4, 8).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">{item.name}</span>
                      <div className="text-right">
                        <span className="text-sm text-gray-500">Prep ~</span>
                        <span className="ml-1 font-bold text-primary-600">
                          {Math.round(item.avgQuantity * (forecast.weather?.factor || 1))} units
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Patterns Analysis */}
      {patterns && patterns.totalDataPoints > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Best Days Chart */}
          <div className="card p-6">
            <h3 className="font-semibold mb-4">Revenue by Day of Week</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={patterns.patterns.byDayOfWeek}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => [`$${value.toFixed(2)}`, 'Avg Revenue']}
                />
                <Bar dataKey="avgRevenue" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Weather Impact */}
          {patterns.patterns.byWeather && patterns.patterns.byWeather.length > 0 && (
            <div className="card p-6">
              <h3 className="font-semibold mb-4">Weather Impact on Revenue</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={patterns.patterns.byWeather}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="condition" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => [`$${value.toFixed(2)}`, 'Avg Revenue']}
                  />
                  <Bar dataKey="avgRevenue" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* AI Insights */}
      {forecast?.prediction?.ai?.insights && (
        <div className="card p-6">
          <h3 className="font-semibold mb-4">AI Insights</h3>
          <p className="text-gray-700">{forecast.prediction.ai.insights}</p>

          {forecast.prediction.ai.riskFactors && forecast.prediction.ai.riskFactors.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
              <p className="font-medium text-yellow-800 mb-2">Risk Factors:</p>
              <ul className="space-y-1">
                {forecast.prediction.ai.riskFactors.map((risk, idx) => (
                  <li key={idx} className="text-sm text-yellow-700">• {risk}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
