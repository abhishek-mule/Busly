'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useVehicles, useStops } from '@/hooks/useBusly';
import { gpsAPI } from '@/lib/api';
import { Bus, Navigation, Clock, Wifi, WifiOff, Gauge, MapPin, AlertCircle } from 'lucide-react';

const FleetMap = dynamic(() => import('@/components/FleetMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-slate-100 text-slate-400 text-sm">
      Loading map...
    </div>
  ),
});

interface LivePosition {
  vehicle_id: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number | null;
  recorded_at: string;
}

type VStatus = 'moving' | 'idle' | 'stale';

export default function MapPage() {
  const { data: vehicles, isLoading } = useVehicles();
  const { data: stopsData } = useStops();
  const [positions, setPositions] = useState<LivePosition[]>([]);
  const [gpsError, setGpsError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const vehicleArr = Array.isArray(vehicles) ? vehicles : [];
  const stopArr: any[] = Array.isArray(stopsData) ? stopsData : (stopsData as any)?.items || [];

  const fetchPositions = useCallback(async () => {
    try {
      const { data } = await gpsAPI.latest();
      setPositions(data.items || []);
      setGpsError('');
      setLastFetch(new Date());
    } catch (err: any) {
      setGpsError(err?.response?.data?.detail?.message || 'Could not load GPS positions');
    }
  }, []);

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, 5000);
    return () => clearInterval(interval);
  }, [fetchPositions]);

  const plateById: Record<string, string> = {};
  vehicleArr.forEach((v: any) => { plateById[String(v.id)] = v.plate_number; });

  const statusOf = (p: LivePosition): VStatus => {
    const ageMin = (Date.now() - new Date(p.recorded_at).getTime()) / 60000;
    if (ageMin > 10) return 'stale';
    return p.speed >= 3 ? 'moving' : 'idle';
  };

  const liveByVehicle = new Map(positions.map(p => [String(p.vehicle_id), p]));

  const tracked = vehicleArr
    .filter((v: any) => liveByVehicle.has(String(v.id)))
    .map((v: any) => ({ vehicle: v, position: liveByVehicle.get(String(v.id))! }));
  const offline = vehicleArr.filter((v: any) => !liveByVehicle.has(String(v.id)));

  const counts = {
    moving: tracked.filter(t => statusOf(t.position) === 'moving').length,
    idle: tracked.filter(t => statusOf(t.position) === 'idle').length,
    stale: tracked.filter(t => statusOf(t.position) === 'stale').length,
    offline: offline.length,
  };

  const selected = tracked.find(t => String(t.vehicle.id) === selectedId) || null;

  const mapPositions = positions.map(p => ({
    vehicle_id: String(p.vehicle_id),
    lat: p.latitude,
    lng: p.longitude,
    speed: p.speed || 0,
    heading: p.heading,
    recorded_at: p.recorded_at,
  }));

  const mapStops = stopArr
    .filter((s: any) => s.latitude != null && s.longitude != null && (Number(s.latitude) !== 0 || Number(s.longitude) !== 0))
    .map((s: any) => ({
      id: String(s.id),
      name: s.name || 'Stop',
      lat: Number(s.latitude),
      lng: Number(s.longitude),
    }));

  const statusConfig: Record<VStatus, { label: string; color: string; dot: string }> = {
    moving: { label: 'Moving', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
    idle: { label: 'Idle', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
    stale: { label: 'No Signal', color: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Live Map Tracking</h1>
          <p className="text-slate-500 mt-1">Real-time GPS positions from the fleet</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border ${gpsError ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
            {gpsError ? <WifiOff size={16} className="text-red-600" /> : <Wifi size={16} className="text-emerald-600" />}
            <span className={`text-sm font-medium ${gpsError ? 'text-red-700' : 'text-emerald-700'}`}>
              {gpsError ? 'Disconnected' : 'Live'}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl">
            <Bus size={16} className="text-slate-600" />
            <span className="text-sm font-medium text-slate-700">{tracked.length}/{vehicleArr.length} Online</span>
          </div>
        </div>
      </div>

      {gpsError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3 text-sm text-red-700">
          <AlertCircle size={18} />
          <span>{gpsError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="relative h-[500px]">
              <FleetMap
                positions={mapPositions}
                stops={mapStops}
                plateById={plateById}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
              {positions.length === 0 && !gpsError && (
                <div className="absolute inset-0 z-[400] flex items-center justify-center bg-white/80 backdrop-blur-sm pointer-events-none">
                  <div className="text-center max-w-sm px-6">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                      <MapPin size={32} className="text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-1">No live GPS positions yet</h3>
                    <p className="text-sm text-slate-500">
                      Positions appear here as soon as vehicles push location updates (conductor app or <code className="text-xs bg-slate-100 px-1 rounded">POST /api/v1/gps/location</code>).
                    </p>
                  </div>
                </div>
              )}
              <div className="absolute top-4 right-4 z-[500] flex flex-col gap-2">
                <div className="px-3 py-2 bg-white/90 backdrop-blur border border-slate-200 rounded-lg text-xs text-slate-600 shadow-sm">
                  {lastFetch ? `Updated ${lastFetch.toLocaleTimeString()}` : 'Connecting...'}
                </div>
              </div>
              <div className="absolute bottom-4 left-4 z-[500] flex items-center gap-4 bg-white/90 backdrop-blur border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
                {Object.entries(statusConfig).map(([key, config]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${config.dot}`} />
                    <span className="text-xs text-slate-600">{config.label}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span className="text-xs text-slate-600">Stop</span>
                </div>
              </div>
            </div>
          </div>

          {selected && (
            <div className="mt-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <Bus size={28} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{selected.vehicle.plate_number}</h3>
                    <p className="text-sm text-slate-500">
                      {selected.vehicle.vehicle_type || 'Vehicle'} &bull; {selected.vehicle.seating_capacity} seats
                    </p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border ${statusConfig[statusOf(selected.position)].color}`}>
                  <span className={`w-2 h-2 rounded-full mr-2 ${statusConfig[statusOf(selected.position)].dot} ${statusOf(selected.position) === 'moving' ? 'animate-pulse' : ''}`} />
                  {statusConfig[statusOf(selected.position)].label}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <Gauge size={20} className="mx-auto text-slate-400 mb-1" />
                  <p className="text-lg font-bold text-slate-900">{Math.round(selected.position.speed || 0)} km/h</p>
                  <p className="text-xs text-slate-500">Speed</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <Navigation size={20} className="mx-auto text-slate-400 mb-1" />
                  <p className="text-lg font-bold text-slate-900">{Math.round(selected.position.heading ?? 0)}&deg;</p>
                  <p className="text-xs text-slate-500">Heading</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <Clock size={20} className="mx-auto text-slate-400 mb-1" />
                  <p className="text-lg font-bold text-slate-900">{new Date(selected.position.recorded_at).toLocaleTimeString()}</p>
                  <p className="text-xs text-slate-500">Last Update</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <MapPin size={20} className="mx-auto text-slate-400 mb-1" />
                  <p className="text-sm font-bold text-slate-900">{selected.position.latitude.toFixed(4)}, {selected.position.longitude.toFixed(4)}</p>
                  <p className="text-xs text-slate-500">Position</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Vehicles</h3>
            {isLoading ? (
              <div className="p-8 text-center text-slate-400">Loading vehicles...</div>
            ) : vehicleArr.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No vehicles yet — add one in Fleet &rarr; Vehicles</div>
            ) : (
              <div className="space-y-3">
                {tracked.map(({ vehicle, position }) => {
                  const st = statusOf(position);
                  return (
                    <div
                      key={vehicle.id}
                      onClick={() => setSelectedId(String(vehicle.id))}
                      className={`p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                        selectedId === String(vehicle.id) ? 'border-indigo-300 bg-indigo-50 shadow-md' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-900">{vehicle.plate_number}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusConfig[st].color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1 ${statusConfig[st].dot} ${st === 'moving' ? 'animate-pulse' : ''}`} />
                          {statusConfig[st].label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-slate-500">
                        <span>{Math.round(position.speed || 0)} km/h</span>
                        <span>{new Date(position.recorded_at).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  );
                })}
                {offline.map((vehicle: any) => (
                  <div key={vehicle.id} className="p-3 rounded-xl border border-slate-200 opacity-60">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-700">{vehicle.plate_number}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-slate-50 text-slate-500 border-slate-200">
                        <WifiOff size={10} className="mr-1" /> Offline
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">No GPS data</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-5 text-white">
            <h3 className="font-semibold mb-2">Fleet Overview</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-indigo-200 text-sm">Total Vehicles</span>
                <span className="font-bold">{vehicleArr.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-indigo-200 text-sm">Moving</span>
                <span className="font-bold text-emerald-300">{counts.moving}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-indigo-200 text-sm">Idle</span>
                <span className="font-bold text-amber-300">{counts.idle}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-indigo-200 text-sm">Offline</span>
                <span className="font-bold text-red-300">{counts.offline + counts.stale}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
