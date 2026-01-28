import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Clock, TrendingUp, DollarSign, Users } from 'lucide-react';

const PEAK_COLORS = {
  high: '#22c55e',
  medium: '#f59e0b',
  low: '#6b7280'
};

export default function PerformanceMetrics({ trends, revenuePerHour, peakHours, showTrends = false, showAll = false }) {
  const formatHour = (hour) => {
    const h = parseInt(hour);
    if (h === 0) return '12 AM';
    if (h === 12) return '12 PM';
    if (h < 12) return `${h} AM`;
    return `${h - 12} PM`;
  };

  // Prepare peak hours chart data
  const peakHoursData = peakHours.slice(0, 12).map(ph => ({
    hour: formatHour(ph.hour),
    occurrences: ph.occurrences,
    percentage: ph.percentage,
    color: ph.percentage > 20 ? PEAK_COLORS.high : ph.percentage > 10 ? PEAK_COLORS.medium : PEAK_COLORS.low
  }));

  return (
    <div className="space-y-6">
      {/* Revenue Trends */}
      {(showTrends || showAll) && trends.length > 0 && (
        <div className="card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Revenue Trends
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'revenue') return [`$${value.toFixed(2)}`, 'Revenue'];
                  if (name === 'customers') return [value, 'Customers'];
                  if (name === 'orders') return [value, 'Orders'];
                  return [value, name];
                }}
              />
              <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} name="revenue" />
              <Line type="monotone" dataKey="customers" stroke="#3b82f6" strokeWidth={2} name="customers" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {showAll && (
        <>
          {/* Revenue Per Hour Stats */}
          {revenuePerHour && (
            <div className="card p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary-500" />
                Revenue Per Hour Analysis
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Average $/Hour</p>
                  <p className="text-3xl font-bold text-primary-600">
                    ${revenuePerHour.average.toFixed(2)}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Best $/Hour</p>
                  <p className="text-3xl font-bold text-green-600">
                    ${revenuePerHour.max.toFixed(2)}
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Lowest $/Hour</p>
                  <p className="text-3xl font-bold text-red-600">
                    ${revenuePerHour.min.toFixed(2)}
                  </p>
                </div>
              </div>

              {revenuePerHour.data && revenuePerHour.data.length > 0 && (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={revenuePerHour.data.slice(-30).map(d => ({
                    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    rph: d.revenuePerHour
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, '$/Hour']} />
                    <Line type="monotone" dataKey="rph" stroke="#f97316" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {/* Peak Hours Analysis */}
          {peakHoursData.length > 0 && (
            <div className="card p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                Peak Hours Analysis
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Hours when your business sees the most activity
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart */}
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={peakHoursData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="hour" type="category" tick={{ fontSize: 12 }} width={60} />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === 'occurrences') return [value, 'Peak Days'];
                        return [`${value.toFixed(1)}%`, 'Percentage'];
                      }}
                    />
                    <Bar dataKey="occurrences" name="occurrences">
                      {peakHoursData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* Summary */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Top Peak Hours</h4>
                    <div className="space-y-2">
                      {peakHoursData.slice(0, 5).map((ph, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: ph.color }}
                            />
                            <span className="font-medium">{ph.hour}</span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {ph.occurrences} days ({ph.percentage.toFixed(1)}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium text-blue-700 mb-1">Recommendation</h4>
                    <p className="text-sm text-blue-600">
                      {peakHoursData.length > 0
                        ? `Your busiest hour is typically ${peakHoursData[0]?.hour}. Consider scheduling extra staff during this time.`
                        : 'Not enough data to determine peak hours yet.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Customers Trend */}
          {trends.length > 0 && (
            <div className="card p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Customer & Order Trends
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="customers" name="Customers" fill="#3b82f6" />
                  <Bar dataKey="orders" name="Orders" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {/* No Data Message */}
      {trends.length === 0 && (!revenuePerHour || revenuePerHour.data?.length === 0) && peakHours.length === 0 && (
        <div className="card p-8 text-center text-gray-500">
          No performance data available for the selected period
        </div>
      )}
    </div>
  );
}
