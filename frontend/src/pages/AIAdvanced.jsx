import { useState } from 'react';
import { useTruck } from '../context/TruckContext';
import { aiAPI } from '../services/api';
import { Sparkles, DollarSign, Wrench, Users, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const tabs = [
  { value: 'pricing', label: 'Dynamic Pricing', icon: DollarSign },
  { value: 'maintenance', label: 'Predictive Maintenance', icon: Wrench },
  { value: 'crew', label: 'Crew Scheduling', icon: Users },
];

function tryParseJSON(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return undefined;
  return JSON.parse(trimmed);
}

export default function AIAdvanced() {
  const { selectedTruck } = useTruck();
  const [tab, setTab] = useState('pricing');

  // pricing state
  const [pricingWindow, setPricingWindow] = useState('');

  // maintenance state
  const [equipment, setEquipment] = useState('');

  // crew state
  const [crew, setCrew] = useState('');
  const [shifts, setShifts] = useState('');
  const [constraints, setConstraints] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const reset = () => {
    setError('');
    setResult(null);
  };

  const switchTab = (v) => {
    setTab(v);
    reset();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTruck) {
      setError('No truck selected.');
      return;
    }
    reset();

    let payload = {};
    try {
      if (tab === 'pricing') {
        if (pricingWindow.trim()) payload.window = pricingWindow.trim();
      } else if (tab === 'maintenance') {
        if (!equipment.trim()) {
          setError('Equipment list is required.');
          return;
        }
        const parsed = equipment.trim().startsWith('[')
          ? tryParseJSON(equipment)
          : equipment
              .split('\n')
              .map((l) => l.trim())
              .filter(Boolean)
              .map((name) => ({ name }));
        payload.equipment = parsed;
      } else if (tab === 'crew') {
        if (!crew.trim() || !shifts.trim()) {
          setError('Crew and shifts are both required.');
          return;
        }
        payload.crew = tryParseJSON(crew);
        payload.shifts = tryParseJSON(shifts);
        const c = tryParseJSON(constraints);
        if (c !== undefined) payload.constraints = c;
      }
    } catch (parseErr) {
      setError('Invalid JSON: ' + (parseErr.message || 'parse failed'));
      return;
    }

    setLoading(true);
    try {
      let res;
      if (tab === 'pricing') {
        res = await aiAPI.dynamicPricing(selectedTruck.id, payload);
      } else if (tab === 'maintenance') {
        res = await aiAPI.predictMaintenance(selectedTruck.id, payload);
      } else {
        res = await aiAPI.crewSchedule(selectedTruck.id, payload);
      }
      setResult(res.data);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Request failed.';
      setError(msg);
      toast.error('AI request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Advanced</h1>
            <p className="text-gray-500">Pricing, maintenance, and crew scheduling powered by AI</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = t.value === tab;
          return (
            <button
              key={t.value}
              onClick={() => switchTab(t.value)}
              className={`px-4 py-2 font-medium whitespace-nowrap flex items-center gap-2 ${
                isActive
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {tab === 'pricing' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Window (optional)
              </label>
              <input
                type="text"
                value={pricingWindow}
                onChange={(e) => setPricingWindow(e.target.value)}
                placeholder="e.g. lunch, dinner, 12:00-14:00"
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Pulls truck, menu items, recent orders, weather; returns recommended per-item prices.
              </p>
            </div>
          )}

          {tab === 'maintenance' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Equipment <span className="text-red-500">*</span>
              </label>
              <textarea
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                placeholder={'One item per line, or a JSON array like [{"name":"Generator","hours":1200}]'}
                rows={6}
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 font-mono"
              />
              <p className="mt-1 text-xs text-gray-500">
                Returns predicted failure windows and preventive actions per item.
              </p>
            </div>
          )}

          {tab === 'crew' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Crew (JSON) <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={crew}
                  onChange={(e) => setCrew(e.target.value)}
                  placeholder='[{"id":"u1","name":"Ada","skills":["grill"]}]'
                  rows={4}
                  disabled={loading}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shifts (JSON) <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={shifts}
                  onChange={(e) => setShifts(e.target.value)}
                  placeholder='[{"id":"s1","start":"2026-05-10T11:00","end":"2026-05-10T15:00","role":"grill"}]'
                  rows={4}
                  disabled={loading}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Constraints (JSON, optional)
                </label>
                <textarea
                  value={constraints}
                  onChange={(e) => setConstraints(e.target.value)}
                  placeholder='{"max_hours_per_person":8,"min_rest_hours":10}'
                  rows={3}
                  disabled={loading}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 font-mono"
                />
              </div>
            </>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !selectedTruck}
            className="btn btn-primary w-full justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Working...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Run {tabs.find((t) => t.value === tab)?.label}
              </>
            )}
          </button>
        </form>

        {/* Result */}
        <div className="card p-6 min-h-[200px]">
          <h2 className="font-semibold text-gray-900 mb-3">Result</h2>
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              AI is thinking...
            </div>
          )}
          {!loading && !result && !error && (
            <p className="text-sm text-gray-400">Submit the form to see AI-generated output.</p>
          )}
          {!loading && result && (
            <pre className="whitespace-pre-wrap text-xs text-gray-800 bg-gray-50 rounded-lg p-3 max-h-[600px] overflow-y-auto border border-gray-200">
              {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
