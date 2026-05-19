// CustomViewsPage — hosts the 4 Truck Views custom features.
import React from 'react';
import 'leaflet/dist/leaflet.css';

import LocationMap from '../components/LocationMap.js';
import SalesTrend from '../components/SalesTrend.js';
import DailySalesPDF from '../components/DailySalesPDF.js';
import LocationScheduler from '../components/LocationScheduler.js';

function Panel({ title, subtitle, children }) {
  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 10,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#0f172a' }}>{title}</h2>
      {subtitle && (
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>{subtitle}</div>
      )}
      {children}
    </section>
  );
}

export default function CustomViewsPage() {
  return (
    <div data-testid="custom-views-page" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>Truck Views</h1>
        <div style={{ fontSize: 13, color: '#475569' }}>
          Operational custom views for the food truck — map, sales, PDF report and weekly scheduler.
        </div>
      </header>

      <Panel title="Daily Location Map" subtitle="Planned + current location markers per day (react-leaflet).">
        <LocationMap />
      </Panel>

      <Panel title="Sales Trend (last 30 days)" subtitle="Daily gross and net sales (recharts).">
        <SalesTrend />
      </Panel>

      <Panel title="Daily Sales Report (PDF)" subtitle="Pick a date and download a pdfkit-generated PDF.">
        <DailySalesPDF />
      </Panel>

      <Panel title="Location Scheduler" subtitle="Add future time-slots; remove existing ones.">
        <LocationScheduler />
      </Panel>
    </div>
  );
}
