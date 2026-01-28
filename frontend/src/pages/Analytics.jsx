import { useState, useEffect } from 'react';
import { useTruck } from '../context/TruckContext';
import { financialAPI, locationsAPI } from '../services/api';
import { TrendingUp, MapPin, Target, BarChart3, Clock, Users, DollarSign } from 'lucide-react';
import { format, subDays, subMonths } from 'date-fns';
import toast from 'react-hot-toast';
import LocationCompare from '../components/LocationCompare';
import PerformanceMetrics from '../components/PerformanceMetrics';
import LocationRanking from '../components/LocationRanking';
import GoalTracker from '../components/GoalTracker';

const dateRanges = [
  { label: 'Last 7 Days', value: '7d', start: () => subDays(new Date(), 7) },
  { label: 'Last 30 Days', value: '30d', start: () => subDays(new Date(), 30) },
  { label: 'Last 3 Months', value: '3m', start: () => subMonths(new Date(), 3) },
  { label: 'Last 6 Months', value: '6m', start: () => subMonths(new Date(), 6) },
  { label: 'Last Year', value: '1y', start: () => subMonths(new Date(), 12) },
  { label: 'All Time', value: 'all', start: () => null }
];

export default function Analytics() {
  const { selectedTruck } = useTruck();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('30d');
  const [locations, setLocations] = useState([]);
  const [topLocations, setTopLocations] = useState([]);
  const [trends, setTrends] = useState([]);
  const [revenuePerHour, setRevenuePerHour] = useState(null);
  const [peakHours, setPeakHours] = useState([]);
  const [goals, setGoals] = useState([]);
  const [selectedOverviewLocation, setSelectedOverviewLocation] = useState(null);

  useEffect(() => {
    if (selectedTruck) {
      loadLocations();
      loadData();
    }
  }, [selectedTruck, dateRange]);

  const getDateParams = () => {
    const range = dateRanges.find(r => r.value === dateRange);
    const startDate = range?.start();
    return {
      startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
      endDate: format(new Date(), 'yyyy-MM-dd')
    };
  };

  const loadLocations = async () => {
    try {
      const res = await locationsAPI.getAll();
      setLocations(res.data);
    } catch (error) {
      console.error('Failed to load locations:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const params = getDateParams();
      const [topRes, trendsRes, rphRes, peakRes, goalsRes] = await Promise.all([
        financialAPI.getTopLocations(selectedTruck.id, { ...params, limit: 10, sortBy: 'totalRevenue' }),
        financialAPI.getTrends(selectedTruck.id, { ...params, groupBy: dateRange === '7d' ? 'day' : 'week' }),
        financialAPI.getRevenuePerHour(selectedTruck.id, params),
        financialAPI.getPeakHours(selectedTruck.id, params),
        financialAPI.getGoals(selectedTruck.id, { active: true })
      ]);
      setTopLocations(topRes.data);
      setTrends(trendsRes.data);
      setRevenuePerHour(rphRes.data);
      setPeakHours(peakRes.data);
      setGoals(goalsRes.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary stats
  const totalRevenue = topLocations.reduce((sum, l) => sum + l.totalRevenue, 0);
  const totalVisits = topLocations.reduce((sum, l) => sum + l.visitCount, 0);
  const totalCustomers = topLocations.reduce((sum, l) => sum + l.totalCustomers, 0);
  const avgRevenuePerVisit = totalVisits > 0 ? totalRevenue / totalVisits : 0;

  if (loading && !topLocations.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Location Analytics</h1>
          <p className="text-gray-500">Analyze performance across all your locations</p>
        </div>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="input w-48"
        >
          {dateRanges.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-5 w-5 text-green-500" />
            <span className="text-sm text-gray-500">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold text-green-600">${totalRevenue.toFixed(2)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="h-5 w-5 text-primary-500" />
            <span className="text-sm text-gray-500">Total Visits</span>
          </div>
          <p className="text-2xl font-bold">{totalVisits}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-5 w-5 text-blue-500" />
            <span className="text-sm text-gray-500">Total Customers</span>
          </div>
          <p className="text-2xl font-bold">{totalCustomers}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-5 w-5 text-purple-500" />
            <span className="text-sm text-gray-500">Avg Revenue/Visit</span>
          </div>
          <p className="text-2xl font-bold">${avgRevenuePerVisit.toFixed(2)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'ranking', label: 'Ranking', icon: TrendingUp },
          { id: 'compare', label: 'Compare', icon: MapPin },
          { id: 'metrics', label: 'Metrics', icon: Clock },
          { id: 'goals', label: 'Goals', icon: Target }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 font-medium whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Trends Chart */}
          <PerformanceMetrics
            trends={trends}
            revenuePerHour={revenuePerHour}
            peakHours={peakHours}
            showTrends
          />

          {/* Top 5 Locations Quick View */}
          <div className="card p-6">
            <h3 className="font-semibold mb-4">Top 5 Locations</h3>
            <div className="space-y-3">
              {topLocations.slice(0, 5).map((loc, idx) => (
                <div
                  key={loc.location?.id || idx}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                    selectedOverviewLocation?.location?.id === loc.location?.id
                      ? 'bg-primary-100 ring-2 ring-primary-300'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedOverviewLocation(
                    selectedOverviewLocation?.location?.id === loc.location?.id ? null : loc
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                      idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-amber-600' : 'bg-gray-300'
                    }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium">{loc.location?.name}</p>
                      <p className="text-sm text-gray-500">{loc.visitCount} visits</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">${loc.totalRevenue.toFixed(2)}</p>
                    <p className="text-sm text-gray-500">${loc.revenuePerHour.toFixed(2)}/hr</p>
                  </div>
                </div>
              ))}
              {topLocations.length === 0 && (
                <p className="text-center text-gray-500 py-8">No location data available</p>
              )}
            </div>

            {/* Selected Location Details */}
            {selectedOverviewLocation && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-primary-700">{selectedOverviewLocation.location?.name} Details</h4>
                  <button
                    onClick={() => setSelectedOverviewLocation(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    &times;
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Total Revenue</p>
                    <p className="text-lg font-bold text-green-600">${selectedOverviewLocation.totalRevenue.toFixed(2)}</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Profit</p>
                    <p className={`text-lg font-bold ${selectedOverviewLocation.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      ${selectedOverviewLocation.profit.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Customers</p>
                    <p className="text-lg font-bold text-purple-600">{selectedOverviewLocation.totalCustomers}</p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">$/Hour</p>
                    <p className="text-lg font-bold text-orange-600">${selectedOverviewLocation.revenuePerHour.toFixed(2)}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  {selectedOverviewLocation.location?.address}, {selectedOverviewLocation.location?.city}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'ranking' && (
        <LocationRanking
          topLocations={topLocations}
          onRefresh={loadData}
        />
      )}

      {activeTab === 'compare' && (
        <LocationCompare
          truckId={selectedTruck.id}
          locations={locations}
          locationsWithData={topLocations.map(tl => tl.location?.id).filter(Boolean)}
          dateParams={getDateParams()}
        />
      )}

      {activeTab === 'metrics' && (
        <PerformanceMetrics
          trends={trends}
          revenuePerHour={revenuePerHour}
          peakHours={peakHours}
          showAll
        />
      )}

      {activeTab === 'goals' && (
        <GoalTracker
          truckId={selectedTruck.id}
          goals={goals}
          locations={locations}
          onRefresh={loadData}
        />
      )}
    </div>
  );
}
