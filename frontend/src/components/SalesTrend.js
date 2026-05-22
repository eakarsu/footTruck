// VIZ 2: Sales Trend Chart — recharts line of daily sales over last 30 days.
import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export default function SalesTrend() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/custom-views/sales-trend')
      .then((r) => r.json())
      .then((j) => setData(j))
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <div style={{ color: '#b91c1c' }}>Sales trend error: {error}</div>;
  if (!data) return <div>Loading sales trend…</div>;

  return (
    <div data-testid="sales-trend" style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.series} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="gross" name="Gross $" stroke="#2563eb" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="net" name="Net $" stroke="#16a34a" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
