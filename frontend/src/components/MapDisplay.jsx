import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom SVG icon factory
const svgIcon = (color, emoji) => L.divIcon({
  className: '',
  html: `
    <div style="
      width:36px;height:36px;border-radius:50% 50% 50% 0;
      background:${color};transform:rotate(-45deg);
      border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);
      display:flex;align-items:center;justify-content:center;
    ">
      <span style="transform:rotate(45deg);font-size:14px;line-height:1">${emoji}</span>
    </div>`,
  iconSize:   [36, 36],
  iconAnchor: [18, 36],
  popupAnchor:[0, -38],
});

const ICONS = {
  'Current Location': svgIcon('#3b82f6', '📍'),
  'Pickup':        svgIcon('#22c55e', '📦'),
  'Drop-off':      svgIcon('#ef4444', '🏁'),
  'Driving to Pickup Location': svgIcon('#6366f1', '🚛'),
  'Fuel Stop':     svgIcon('#f59e0b', '⛽'),
  '30-Minute Break':  svgIcon('#06b6d4', '☕'),
  '10-Hour Reset': svgIcon('#8b5cf6', '🛏️'),
  '34-Hour Restart':  svgIcon('#ec4899', '🔄'),
};

const STATUS_COLORS = {
  'Driving':              '#2563eb',
  'Off Duty':             '#6b7280',
  'On Duty (Not Driving)':'#f59e0b',
  'Sleeper Berth':        '#8b5cf6',
};

const FitBounds = ({ positions }) => {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 1) {
      map.fitBounds(L.latLngBounds(positions), { padding: [48, 48] });
    }
  }, [positions, map]);
  return null;
};

const fmtDur = (mins) => {
  if (mins >= 60) return `${(mins / 60).toFixed(1)} hr`;
  return `${Math.round(mins)} min`;
};

const MapDisplay = ({ geometry, hosEvents = [], geocoded }) => {
  if (!geometry || geometry.length === 0) return null;

  // ORS returns [lng, lat] → Leaflet needs [lat, lng]
  const polyline = geometry.map(c => [c[1], c[0]]);

  // Only show non-driving events as map markers (they have meaningful positions)
  const stopEvents = hosEvents.filter(ev => ev.status !== 'Driving' && ev.lat && ev.lng);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid rgba(255,255,255,0.12)', height: 520 }}
    >
      <MapContainer
        center={[39.8283, -98.5795]}
        zoom={4}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds positions={polyline} />

        {/* Route polyline */}
        <Polyline positions={polyline} color="#3b82f6" weight={5} opacity={0.85} />

        {/* HOS stop markers */}
        {stopEvents.map((ev, i) => {
          const icon = ICONS[ev.description] || svgIcon('#94a3b8', '📍');
          const color = STATUS_COLORS[ev.status] || '#94a3b8';
          return (
            <Marker key={i} position={[ev.lat, ev.lng]} icon={icon}>
              <Tooltip direction="top" offset={[0, -32]} opacity={1} permanent={false}>
                <div style={{ 
                  fontWeight: 600, 
                  color: color,
                  padding: '2px 4px'
                }}>
                  {ev.description}
                </div>
              </Tooltip>
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <p style={{ fontWeight: 700, marginBottom: 4, color }}>{ev.description}</p>
                  <p style={{ fontSize: 12, color: '#374151' }}>
                    <strong>Status:</strong> {ev.status}
                  </p>
                  <p style={{ fontSize: 12, color: '#374151' }}>
                    <strong>Duration:</strong> {fmtDur(ev.duration)}
                  </p>
                  <p style={{ fontSize: 12, color: '#374151' }}>
                    <strong>Trip time:</strong> {fmtDur(ev.start_time)} → {fmtDur(ev.end_time)}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default MapDisplay;
