// NON-VIZ 2: Location Scheduler — calendar UI to set future locations + time slots.
import React, { useEffect, useMemo, useState } from 'react';

function isoForOffset(days) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function LocationScheduler() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    date: isoForOffset(1),
    start: '11:00',
    end: '14:00',
    location: '',
    lat: '',
    lng: '',
  });

  async function load() {
    try {
      const r = await fetch('/api/custom-views/scheduler');
      const j = await r.json();
      setItems(j.items || []);
    } catch (e) {
      setError(String(e));
    }
  }

  useEffect(() => {
    load();
  }, []);

  const next14Days = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 14; i++) arr.push(isoForOffset(i));
    return arr;
  }, []);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const body = {
        date: form.date,
        start: form.start,
        end: form.end,
        location: form.location,
      };
      if (form.lat) body.lat = Number(form.lat);
      if (form.lng) body.lng = Number(form.lng);
      const r = await fetch('/api/custom-views/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setError(j.error || 'Failed to schedule');
      } else {
        setForm({ ...form, location: '', lat: '', lng: '' });
        load();
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function remove(id) {
    try {
      await fetch('/api/custom-views/scheduler/' + id, { method: 'DELETE' });
      load();
    } catch (e) {
      setError(String(e));
    }
  }

  const byDate = useMemo(() => {
    const map = {};
    items.forEach((it) => {
      (map[it.date] = map[it.date] || []).push(it);
    });
    return map;
  }, [items]);

  return (
    <div data-testid="location-scheduler" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <form
        onSubmit={submit}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
          gap: 8,
          alignItems: 'end',
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12 }}>
          Date
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            style={{ padding: 6, border: '1px solid #cbd5e1', borderRadius: 6 }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12 }}>
          Start
          <input
            type="time"
            value={form.start}
            onChange={(e) => setForm({ ...form, start: e.target.value })}
            style={{ padding: 6, border: '1px solid #cbd5e1', borderRadius: 6 }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12 }}>
          End
          <input
            type="time"
            value={form.end}
            onChange={(e) => setForm({ ...form, end: e.target.value })}
            style={{ padding: 6, border: '1px solid #cbd5e1', borderRadius: 6 }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gridColumn: 'span 2' }}>
          Location
          <input
            type="text"
            placeholder="e.g. Salesforce Park"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            style={{ padding: 6, border: '1px solid #cbd5e1', borderRadius: 6 }}
            required
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '8px 12px',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          {loading ? 'Adding…' : 'Add Slot'}
        </button>
      </form>

      {error && <div style={{ color: '#b91c1c', fontSize: 13 }}>{error}</div>}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gap: 6,
        }}
      >
        {next14Days.map((d) => {
          const slots = byDate[d] || [];
          return (
            <div
              key={d}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 6,
                padding: 6,
                minHeight: 80,
                background: slots.length ? '#eff6ff' : '#fff',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: '#1e293b' }}>{d.slice(5)}</div>
              {slots.map((s) => (
                <div key={s.id} style={{ marginTop: 4, fontSize: 11, color: '#0f172a' }}>
                  <div>
                    {s.start}-{s.end}
                  </div>
                  <div style={{ color: '#475569' }}>{s.location}</div>
                  <button
                    onClick={() => remove(s.id)}
                    style={{
                      marginTop: 2,
                      fontSize: 10,
                      color: '#b91c1c',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    remove
                  </button>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
