// VIZ 1: Daily Location Map — react-leaflet map with planned + current location markers per day.
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';

// Fix default icon paths so markers render in vite builds without bundler tweaks.
const defaultIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

export default function LocationMap() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/custom-views/location-map')
      .then((r) => r.json())
      .then((j) => setData(j))
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <div style={{ color: '#b91c1c' }}>Map error: {error}</div>;
  if (!data) return <div>Loading location map…</div>;

  const center = data.days[0]?.planned
    ? [data.days[0].planned.lat, data.days[0].planned.lng]
    : [37.7749, -122.4194];

  return (
    <div data-testid="location-map" style={{ height: 380, width: '100%', borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {data.days.map((d) => (
          <React.Fragment key={d.date}>
            <Marker position={[d.planned.lat, d.planned.lng]}>
              <Popup>
                <strong>{d.date}</strong><br />
                Planned: {d.planned.name}<br />
                {d.planned.start}–{d.planned.end}
              </Popup>
            </Marker>
            {d.current && (
              <CircleMarker
                center={[d.current.lat, d.current.lng]}
                radius={10}
                pathOptions={{ color: '#16a34a', fillColor: '#22c55e', fillOpacity: 0.7 }}
              >
                <Popup>
                  <strong>Current location</strong><br />
                  {d.current.name}
                </Popup>
              </CircleMarker>
            )}
          </React.Fragment>
        ))}
      </MapContainer>
    </div>
  );
}
