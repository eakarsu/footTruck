// NON-VIZ 1: Daily Sales Report PDF — date picker -> PDF (pdfkit on backend).
import React, { useState } from 'react';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function DailySalesPDF() {
  const [date, setDate] = useState(todayISO());
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  async function download(e) {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    setError('');
    setStatus('');
    try {
      const resp = await fetch('/api/custom-views/daily-sales-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });
      if (!resp.ok) {
        setError('Request failed: ' + resp.status);
        return;
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `daily-sales-${date}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus(`Downloaded daily-sales-${date}.pdf`);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div data-testid="daily-sales-pdf" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <form onSubmit={download} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <label style={{ fontWeight: 500 }}>Date:</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 6 }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '8px 14px',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          {loading ? 'Generating…' : 'Download PDF'}
        </button>
      </form>
      {status && <div style={{ color: '#15803d', fontSize: 13 }}>{status}</div>}
      {error && <div style={{ color: '#b91c1c', fontSize: 13 }}>{error}</div>}
      <div style={{ fontSize: 12, color: '#64748b' }}>
        Includes items sold, gross, tax (8.75%) and net.
      </div>
    </div>
  );
}
