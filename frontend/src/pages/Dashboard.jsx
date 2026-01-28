import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTruck } from '../context/TruckContext';
import { dashboardAPI, ordersAPI } from '../services/api';
import {
  DollarSign,
  ShoppingCart,
  MapPin,
  AlertTriangle,
  Calendar,
  Sparkles,
  TrendingUp,
  Clock,
  Package,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import LocationBroadcaster from '../components/LocationBroadcaster';

export default function Dashboard() {
  const { selectedTruck } = useTruck();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (selectedTruck) {
      loadDashboard();
    }
  }, [selectedTruck]);

  const loadDashboard = async () => {
    try {
      const res = await dashboardAPI.getSummary(selectedTruck.id);
      setData(res.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening with {selectedTruck?.name}</p>
        </div>
        <div className="text-sm text-gray-500">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Sales</p>
              <p className="text-2xl font-bold text-gray-900">
                ${(data?.sales?.today || 0).toFixed(2)}
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600 font-medium">
              ${(data?.sales?.week || 0).toFixed(2)}
            </span>
            <span className="text-gray-500 ml-1">this week</span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Orders</p>
              <p className="text-2xl font-bold text-gray-900">
                {data?.orders?.today || 0}
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <Clock className="h-4 w-4 text-blue-500 mr-1" />
            <span className="text-blue-600 font-medium">{data?.orders?.activeQueue || 0}</span>
            <span className="text-gray-500 ml-1">in queue</span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-bold text-gray-900">
                {data?.alerts?.lowStockCount || 0}
              </p>
            </div>
            <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <Package className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <Link to="/inventory" className="mt-4 flex items-center text-sm text-primary-600 hover:text-primary-700">
            View inventory
          </Link>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Expiring Permits</p>
              <p className="text-2xl font-bold text-gray-900">
                {data?.alerts?.expiringPermitsCount || 0}
              </p>
            </div>
            <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
              <FileText className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <Link to="/permits" className="mt-4 flex items-center text-sm text-primary-600 hover:text-primary-700">
            View permits
          </Link>
        </div>
      </div>

      {/* GPS Location Broadcasting */}
      <LocationBroadcaster truckId={selectedTruck?.id} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Locations */}
        <div className="card">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Upcoming Locations</h2>
              <Link to="/locations" className="text-sm text-primary-600 hover:text-primary-700">
                View all
              </Link>
            </div>
          </div>
          <div className="p-6">
            {data?.upcoming?.locations?.length > 0 ? (
              <div className="space-y-4">
                {data.upcoming.locations.map(loc => (
                  <div key={loc.id} className="flex items-start gap-4">
                    <div className="h-10 w-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-5 w-5 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{loc.location?.name}</p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(loc.date), 'MMM d, yyyy')} | {loc.startTime} - {loc.endTime}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      loc.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {loc.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">No upcoming locations scheduled</p>
                <Link to="/locations" className="btn btn-primary inline-block">
                  Schedule Location
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="card">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Upcoming Events</h2>
              <Link to="/events" className="text-sm text-primary-600 hover:text-primary-700">
                View all
              </Link>
            </div>
          </div>
          <div className="p-6">
            {data?.upcoming?.events?.length > 0 ? (
              <div className="space-y-4">
                {data.upcoming.events.map(event => (
                  <div key={event.id} className="flex items-start gap-4">
                    <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{event.name}</p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(event.startDate), 'MMM d, yyyy')}
                        {event.expectedAttendance && ` | ${event.expectedAttendance.toLocaleString()} expected`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">No upcoming events</p>
                <Link to="/events" className="btn btn-primary inline-block">
                  Browse Events
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      {data?.aiRecommendations?.length > 0 && (
        <div className="card">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">AI Recommendations</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.aiRecommendations.map(rec => (
                <div key={rec.id} className="p-4 bg-gradient-to-br from-primary-50 to-white rounded-lg border border-primary-100">
                  <span className="inline-block px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded-full mb-2">
                    {rec.type}
                  </span>
                  <h3 className="font-medium text-gray-900 mb-1">{rec.title}</h3>
                  <p className="text-sm text-gray-600">{rec.description}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <Link to="/ai" className="text-primary-600 hover:text-primary-700 font-medium">
                View all AI insights
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {(data?.alerts?.lowStockCount > 0 || data?.alerts?.expiringPermitsCount > 0) && (
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <h2 className="text-lg font-semibold text-yellow-800">Alerts</h2>
            </div>
            <div className="space-y-3">
              {data?.alerts?.lowStockItems?.slice(0, 3).map(item => (
                <div key={item.id} className="flex items-center justify-between bg-white p-3 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-500">
                      {item.quantity} {item.unit} remaining (min: {item.minQuantity})
                    </p>
                  </div>
                  <Link to="/inventory" className="btn btn-secondary text-sm">
                    Restock
                  </Link>
                </div>
              ))}
              {data?.alerts?.expiringPermits?.slice(0, 2).map(permit => (
                <div key={permit.id} className="flex items-center justify-between bg-white p-3 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{permit.type} Permit</p>
                    <p className="text-sm text-gray-500">
                      Expires {format(new Date(permit.expiryDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Link to="/permits" className="btn btn-secondary text-sm">
                    Renew
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
