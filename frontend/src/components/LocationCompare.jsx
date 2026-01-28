import { useState, useEffect } from 'react';
import { financialAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { X, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#8b5cf6', '#ec4899'];

export default function LocationCompare({ truckId, locations, locationsWithData = [], dateParams }) {
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [comparison, setComparison] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleAddLocation = (locationId) => {
    if (selectedLocations.length >= 5) {
      toast.error('Maximum 5 locations can be compared');
      return;
    }
    if (!selectedLocations.includes(locationId)) {
      setSelectedLocations([...selectedLocations, locationId]);
    }
  };

  const handleRemoveLocation = (locationId) => {
    setSelectedLocations(selectedLocations.filter(id => id !== locationId));
  };

  const handleCompare = () => {
    if (selectedLocations.length >= 2) {
      loadComparison();
    }
  };

  const loadComparison = async () => {
    setLoading(true);
    try {
      const res = await financialAPI.compareLocations(truckId, {
        locationIds: selectedLocations.join(','),
        ...dateParams
      });
      setComparison(res.data);
    } catch (error) {
      console.error('Failed to load comparison:', error);
      toast.error('Failed to load comparison data');
    } finally {
      setLoading(false);
    }
  };

  const availableLocations = locations.filter(l => !selectedLocations.includes(l.id));

  // Prepare chart data
  const barChartData = comparison.map(c => ({
    name: c.location?.name?.substring(0, 15) || 'Unknown',
    revenue: c.totalRevenue || 0,
    profit: c.profit || 0,
    customers: c.totalCustomers || 0
  }));

  // Normalize data for radar chart (0-100 scale)
  const maxRevenue = Math.max(...comparison.map(c => c.totalRevenue || 0), 1);
  const maxCustomers = Math.max(...comparison.map(c => c.totalCustomers || 0), 1);
  const maxVisits = Math.max(...comparison.map(c => c.visitCount || 0), 1);
  const maxRPH = Math.max(...comparison.map(c => c.revenuePerHour || 0), 1);
  const maxAOV = Math.max(...comparison.map(c => c.averageOrderValue || 0), 1);

  const radarData = [
    { metric: 'Revenue', ...comparison.reduce((acc, c, i) => ({ ...acc, [c.location?.name || `loc${i}`]: ((c.totalRevenue || 0) / maxRevenue) * 100 }), {}) },
    { metric: 'Customers', ...comparison.reduce((acc, c, i) => ({ ...acc, [c.location?.name || `loc${i}`]: ((c.totalCustomers || 0) / maxCustomers) * 100 }), {}) },
    { metric: 'Visits', ...comparison.reduce((acc, c, i) => ({ ...acc, [c.location?.name || `loc${i}`]: ((c.visitCount || 0) / maxVisits) * 100 }), {}) },
    { metric: '$/Hour', ...comparison.reduce((acc, c, i) => ({ ...acc, [c.location?.name || `loc${i}`]: ((c.revenuePerHour || 0) / maxRPH) * 100 }), {}) },
    { metric: 'Avg Order', ...comparison.reduce((acc, c, i) => ({ ...acc, [c.location?.name || `loc${i}`]: ((c.averageOrderValue || 0) / maxAOV) * 100 }), {}) }
  ];

  return (
    <div className="space-y-6">
      {/* Location Selector */}
      <div className="card p-6">
        <h3 className="font-semibold mb-4">Select Locations to Compare</h3>

        {/* Selected Locations */}
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedLocations.map((locId, idx) => {
            const loc = locations.find(l => l.id === locId);
            return (
              <div
                key={locId}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm"
                style={{ backgroundColor: COLORS[idx % COLORS.length] }}
              >
                {loc?.name || 'Unknown'}
                <button onClick={() => handleRemoveLocation(locId)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
          {selectedLocations.length < 2 && (
            <span className="text-sm text-gray-500 py-1.5">
              Select at least 2 locations to compare
            </span>
          )}
        </div>

        {/* Available Locations */}
        {availableLocations.length > 0 && selectedLocations.length < 5 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {availableLocations.map(loc => {
              const hasData = locationsWithData.includes(loc.id);
              return (
                <button
                  key={loc.id}
                  onClick={() => handleAddLocation(loc.id)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm ${
                    hasData
                      ? 'bg-green-100 hover:bg-green-200 text-green-800'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  }`}
                  title={hasData ? 'Has analytics data' : 'No analytics data yet'}
                >
                  <Plus className="h-3 w-3" />
                  {loc.name}
                  {hasData && <span className="ml-1 text-xs">✓</span>}
                </button>
              );
            })}
          </div>
        )}

        <p className="text-xs text-gray-500 mb-2">
          <span className="inline-block w-3 h-3 bg-green-100 rounded mr-1"></span>
          Green locations have analytics data available
        </p>

        {/* Compare Button */}
        {selectedLocations.length >= 2 && (
          <button
            onClick={handleCompare}
            disabled={loading}
            className="btn btn-primary w-full mt-4"
          >
            {loading ? 'Comparing...' : `Compare ${selectedLocations.length} Locations`}
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      )}

      {/* Comparison Results */}
      {comparison.length >= 2 && !loading && (
        <>
          {/* Summary Table */}
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Location</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Revenue</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Profit</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Visits</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Customers</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">$/Visit</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">$/Hour</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {comparison.map((c, idx) => (
                  <tr key={c.location?.id || idx}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        />
                        <span className="font-medium">{c.location?.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-green-600">
                      ${(c.totalRevenue || 0).toFixed(2)}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${(c.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${(c.profit || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">{c.visitCount || 0}</td>
                    <td className="px-4 py-3 text-right">{c.totalCustomers || 0}</td>
                    <td className="px-4 py-3 text-right">${(c.averageRevenuePerVisit || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">${(c.revenuePerHour || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <div className="card p-6">
              <h3 className="font-semibold mb-4">Revenue & Profit Comparison</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill="#22c55e" />
                  <Bar dataKey="profit" name="Profit" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Radar Chart */}
            <div className="card p-6">
              <h3 className="font-semibold mb-4">Performance Radar</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  {comparison.map((c, idx) => (
                    <Radar
                      key={c.location?.id || idx}
                      name={c.location?.name || `Location ${idx + 1}`}
                      dataKey={c.location?.name || `loc${idx}`}
                      stroke={COLORS[idx % COLORS.length]}
                      fill={COLORS[idx % COLORS.length]}
                      fillOpacity={0.2}
                    />
                  ))}
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {selectedLocations.length >= 2 && comparison.length === 0 && !loading && (
        <div className="card p-8 text-center text-gray-500">
          No data available for the selected locations
        </div>
      )}
    </div>
  );
}
