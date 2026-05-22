import { useState } from 'react';
import axios from 'axios';
import { Calendar, Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export default function EventPrepForecast() {
  const [form, setForm] = useState({
    eventName: 'Friday Night Market',
    expectedFootfall: 900,
    serviceHours: 5,
    weather: 'hot and dry',
  });
  const [menuMix, setMenuMix] = useState('[{"item":"Birria tacos","share":42,"prepMinutes":4},{"item":"Rice bowls","share":33,"prepMinutes":5},{"item":"Agua fresca","share":25,"prepMinutes":1}]');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const { data } = await axios.post(`${API_BASE}/event-prep-forecast/forecast`, {
        ...form,
        menuMix: JSON.parse(menuMix),
      });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Forecast failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary-100 flex items-center justify-center">
          <Calendar className="h-6 w-6 text-primary-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Event Prep Forecast</h1>
          <p className="text-gray-500">Translate event demand into prep quantities, crew, and service safeguards.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={run} className="card p-6 space-y-4">
          {['eventName', 'expectedFootfall', 'serviceHours', 'weather'].map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{field}</label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Menu mix JSON</label>
            <textarea className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm" rows={7} value={menuMix} onChange={(e) => setMenuMix(e.target.value)} />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button className="btn-primary inline-flex items-center gap-2" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Forecast prep
          </button>
        </form>

        <div className="card p-6">
          {result ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Metric label="Orders" value={result.expectedOrders} />
                <Metric label="Peak/hr" value={result.peakHourlyOrders} />
                <Metric label="Crew" value={result.crewNeeded} />
              </div>
              <div className="text-sm text-gray-600">Prep hours: <strong>{result.prepHours}</strong></div>
              <div className="space-y-2">
                {result.items.map((item) => (
                  <div key={item.item} className="border rounded-lg p-3">
                    <div className="font-semibold">{item.item}</div>
                    <div className="text-sm text-gray-600">{item.units} units, par {item.parWithBuffer}, {item.prepLaborMinutes} prep minutes</div>
                  </div>
                ))}
              </div>
              <ul className="list-disc pl-5 text-sm text-gray-600">{result.checklist.map((line) => <li key={line}>{line}</li>)}</ul>
            </div>
          ) : (
            <div className="text-gray-500">Run a forecast to see event prep guidance.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <div className="text-xs uppercase text-gray-500">{label}</div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
    </div>
  );
}
