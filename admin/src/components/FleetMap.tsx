'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapPosition {
  vehicle_id: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number | null;
  recorded_at: string;
}

export interface MapStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface FleetMapProps {
  positions: MapPosition[];
  stops: MapStop[];
  plateById: Record<string, string>;
  selectedId: string | null;
  onSelect: (vehicleId: string) => void;
}

function statusColor(p: MapPosition): string {
  const age = (Date.now() - new Date(p.recorded_at).getTime()) / 60000;
  if (age > 10) return '#94a3b8';
  return p.speed >= 3 ? '#10b981' : '#f59e0b';
}

function vehicleIcon(p: MapPosition): L.DivIcon {
  const color = statusColor(p);
  return L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;border-radius:9999px;background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center">
             <div style="width:8px;height:8px;border-radius:9999px;background:#fff"></div>
           </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function stopIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="width:12px;height:12px;border-radius:9999px;background:#6366f1;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

function FitBounds({ positions, stops }: { positions: MapPosition[]; stops: MapStop[] }) {
  const map = useMap();
  const key = useMemo(
    () => positions.map(p => p.vehicle_id).join(',') + '|' + stops.length,
    [positions, stops]
  );
  useEffect(() => {
    const pts: [number, number][] = [
      ...positions.map(p => [p.lat, p.lng] as [number, number]),
      ...stops.map(s => [s.lat, s.lng] as [number, number]),
    ];
    if (pts.length === 0) return;
    if (pts.length === 1) {
      map.setView(pts[0], 14);
    } else {
      map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 15 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
}

export default function FleetMap({ positions, stops, plateById, selectedId, onSelect }: FleetMapProps) {
  const defaultCenter: [number, number] = useMemo(() => {
    if (positions.length > 0) return [positions[0].lat, positions[0].lng];
    if (stops.length > 0) return [stops[0].lat, stops[0].lng];
    return [19.076, 72.8777];
  }, [positions, stops]);

  return (
    <MapContainer center={defaultCenter} zoom={12} style={{ height: '100%', width: '100%' }} className="z-0">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds positions={positions} stops={stops} />
      {stops.map(s => (
        <Marker key={`stop-${s.id}`} position={[s.lat, s.lng]} icon={stopIcon()}>
          <Popup>
            <strong>{s.name}</strong>
            <br />
            Stop
          </Popup>
        </Marker>
      ))}
      {positions.map(p => (
        <Marker
          key={p.vehicle_id}
          position={[p.lat, p.lng]}
          icon={vehicleIcon(p)}
          eventHandlers={{ click: () => onSelect(p.vehicle_id) }}
        >
          <Popup>
            <strong>{plateById[p.vehicle_id] || p.vehicle_id}</strong>
            <br />
            {Math.round(p.speed)} km/h
            <br />
            {new Date(p.recorded_at).toLocaleString()}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
