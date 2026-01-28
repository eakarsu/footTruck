import { useState } from 'react';
import { TrendingUp, TrendingDown, Users, Clock, DollarSign, Award } from 'lucide-react';

const sortOptions = [
  { value: 'totalRevenue', label: 'Total Revenue', icon: DollarSign },
  { value: 'profit', label: 'Profit', icon: TrendingUp },
  { value: 'revenuePerHour', label: 'Revenue/Hour', icon: Clock },
  { value: 'totalCustomers', label: 'Customers', icon: Users },
  { value: 'visitCount', label: 'Visit Count', icon: Award }
];

export default function LocationRanking({ topLocations, onRefresh }) {
  const [sortBy, setSortBy] = useState('totalRevenue');
  const [showAll, setShowAll] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

  // Sort locations based on selected criteria
  const sortedLocations = [...topLocations].sort((a, b) => {
    const aVal = a[sortBy] || 0;
    const bVal = b[sortBy] || 0;
    return bVal - aVal;
  });

  const displayLocations = showAll ? sortedLocations : sortedLocations.slice(0, 10);

  const getRankBadge = (rank) => {
    if (rank === 1) return 'bg-yellow-500';
    if (rank === 2) return 'bg-gray-400';
    if (rank === 3) return 'bg-amber-600';
    return 'bg-gray-200 text-gray-600';
  };

  const getPerformanceIndicator = (location, metric) => {
    const avg = topLocations.reduce((sum, l) => sum + (l[metric] || 0), 0) / topLocations.length;
    const value = location[metric] || 0;
    const diff = ((value - avg) / avg) * 100;

    if (Math.abs(diff) < 5) return null;

    return diff > 0 ? (
      <span className="flex items-center text-xs text-green-600">
        <TrendingUp className="h-3 w-3 mr-0.5" />
        +{diff.toFixed(0)}%
      </span>
    ) : (
      <span className="flex items-center text-xs text-red-600">
        <TrendingDown className="h-3 w-3 mr-0.5" />
        {diff.toFixed(0)}%
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Sort Options */}
      <div className="card p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm text-gray-500">Sort by:</span>
          {sortOptions.map(option => (
            <button
              key={option.value}
              onClick={() => setSortBy(option.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
                sortBy === option.value
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <option.icon className="h-4 w-4" />
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rankings Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 w-16">Rank</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Location</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Revenue</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Profit</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">$/Hour</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Customers</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Visits</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {displayLocations.map((loc, idx) => (
              <tr
                key={loc.location?.id || idx}
                className={`hover:bg-gray-50 cursor-pointer transition-colors ${selectedLocation?.location?.id === loc.location?.id ? 'bg-primary-50 ring-1 ring-primary-200' : ''}`}
                onClick={() => setSelectedLocation(selectedLocation?.location?.id === loc.location?.id ? null : loc)}
              >
                <td className="px-4 py-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${getRankBadge(idx + 1)}`}>
                    {idx + 1}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium">{loc.location?.name}</p>
                    <p className="text-sm text-gray-500">
                      {loc.location?.address}, {loc.location?.city}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-bold text-green-600">${loc.totalRevenue.toFixed(2)}</span>
                    {getPerformanceIndicator(loc, 'totalRevenue')}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-col items-end">
                    <span className={`font-bold ${loc.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${loc.profit.toFixed(2)}
                    </span>
                    {getPerformanceIndicator(loc, 'profit')}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-medium">${loc.revenuePerHour.toFixed(2)}</span>
                    {getPerformanceIndicator(loc, 'revenuePerHour')}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-medium">{loc.totalCustomers}</span>
                    {getPerformanceIndicator(loc, 'totalCustomers')}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-medium">{loc.visitCount}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {topLocations.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No location data available
          </div>
        )}

        {/* Show More/Less */}
        {topLocations.length > 10 && (
          <div className="p-4 border-t bg-gray-50">
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full text-center text-primary-600 hover:text-primary-700 font-medium"
            >
              {showAll ? 'Show Less' : `Show All ${topLocations.length} Locations`}
            </button>
          </div>
        )}
      </div>

      {/* Selected Location Details */}
      {selectedLocation && (
        <div className="card p-6 border-2 border-primary-200 bg-primary-50">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-primary-900">{selectedLocation.location?.name}</h3>
              <p className="text-primary-700">{selectedLocation.location?.address}, {selectedLocation.location?.city}</p>
            </div>
            <button
              onClick={() => setSelectedLocation(null)}
              className="p-1 hover:bg-primary-100 rounded"
            >
              <span className="text-primary-600 text-xl">&times;</span>
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">${selectedLocation.totalRevenue.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Total Profit</p>
              <p className={`text-2xl font-bold ${selectedLocation.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${selectedLocation.profit.toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Revenue/Hour</p>
              <p className="text-2xl font-bold text-blue-600">${selectedLocation.revenuePerHour.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Total Customers</p>
              <p className="text-2xl font-bold text-purple-600">{selectedLocation.totalCustomers}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-white rounded-lg p-3">
              <p className="text-sm text-gray-500">Total Visits</p>
              <p className="text-lg font-semibold">{selectedLocation.visitCount}</p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-sm text-gray-500">Avg Order Value</p>
              <p className="text-lg font-semibold">${selectedLocation.avgOrderValue?.toFixed(2) || '0.00'}</p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-sm text-gray-500">Operating Hours</p>
              <p className="text-lg font-semibold">{selectedLocation.totalHours?.toFixed(1) || '0'} hrs</p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-sm text-gray-500">Profit Margin</p>
              <p className="text-lg font-semibold">
                {selectedLocation.totalRevenue > 0
                  ? ((selectedLocation.profit / selectedLocation.totalRevenue) * 100).toFixed(1)
                  : '0'}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Performance Summary Cards */}
      {topLocations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Best Revenue */}
          <div className="card p-4 border-l-4 border-green-500">
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-gray-500">Top Revenue Location</span>
            </div>
            <p className="font-bold text-lg">{sortedLocations[0]?.location?.name}</p>
            <p className="text-2xl font-bold text-green-600">
              ${sortedLocations[0]?.totalRevenue.toFixed(2)}
            </p>
          </div>

          {/* Best $/Hour */}
          <div className="card p-4 border-l-4 border-blue-500">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-500">Best $/Hour</span>
            </div>
            {(() => {
              const best = [...topLocations].sort((a, b) => b.revenuePerHour - a.revenuePerHour)[0];
              return (
                <>
                  <p className="font-bold text-lg">{best?.location?.name}</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${best?.revenuePerHour.toFixed(2)}/hr
                  </p>
                </>
              );
            })()}
          </div>

          {/* Most Customers */}
          <div className="card p-4 border-l-4 border-purple-500">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-purple-500" />
              <span className="text-sm font-medium text-gray-500">Most Customers</span>
            </div>
            {(() => {
              const best = [...topLocations].sort((a, b) => b.totalCustomers - a.totalCustomers)[0];
              return (
                <>
                  <p className="font-bold text-lg">{best?.location?.name}</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {best?.totalCustomers} customers
                  </p>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
