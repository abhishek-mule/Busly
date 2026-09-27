'use client';

import { useState, useEffect } from 'react';
import { useVehicles } from '@/hooks/useBusly';
import { MapPin, Bus, Navigation, Clock, Wifi, WifiOff, Fuel, Gauge, Circle, ChevronRight, Locate, Maximize2, X } from 'lucide-react';

interface VehicleStatus {
  id: number;
  plate_number: string;
  driver_name: string;
  route_name: string;
  status: 'moving' | 'idle' | 'stopped';
  speed: number;
  fuel: number;
  progress: number;
  last_update: string;
  students_onboard: number;
  total_stops: number;
  completed_stops: number;
  lat: number;
  lng: number;
}

export default function MapPage() {
  const { data: vehicles, isLoading } = useVehicles();
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleStatus | null>(null);
  const [vehicleStatuses, setVehicleStatuses] = useState<VehicleStatus[]>([]);

  const vehicleArr = Array.isArray(vehicles) ? vehicles : [];

  useEffect(() => {
    const statuses: VehicleStatus[] = vehicleArr.map((v: any, i: number) => {
      const state = v.status === 'maintenance' ? 'stopped' : (i % 3 === 0 ? 'moving' : i % 3 === 1 ? 'idle' : 'stopped');
      return {
        id: v.id,
        plate_number: v.plate_number,
        driver_name: `Driver ${i + 1}`,
        route_name: `Route ${String.fromCharCode(65 + i)}`,
        status: state,
        speed: state === 'moving' ? 35 + Math.floor(Math.random() * 25) : state === 'idle' ? 0 : 0,
        fuel: 40 + Math.floor(Math.random() * 55),
        progress: 30 + Math.floor(Math.random() * 60),
        last_update: new Date().toLocaleTimeString(),
        students_onboard: 15 + Math.floor(Math.random() * 20),
        total_stops: 12,
        completed_stops: 3 + Math.floor(Math.random() * 7),
        lat: 12.9716 + (Math.random() - 0.5) * 0.1,
        lng: 77.5946 + (Math.random() - 0.5) * 0.1,
      };
    });
    setVehicleStatuses(statuses);
    if (statuses.length > 0 && !selectedVehicle) setSelectedVehicle(statuses[0]);
  }, [vehicleArr]);

  useEffect(() => {
    const interval = setInterval(() => {
      setVehicleStatuses(prev => prev.map(v => ({
        ...v,
        speed: v.status === 'moving' ? Math.max(20, v.speed + Math.floor(Math.random() * 11) - 5) : 0,
        progress: Math.min(100, v.progress + (v.status === 'moving' ? Math.random() * 2 : 0)),
        fuel: Math.max(5, v.fuel - (v.status === 'moving' ? Math.random() * 0.2 : 0)),
        last_update: new Date().toLocaleTimeString(),
      })));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const statusConfig = {
    moving: { label: 'Moving', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
    idle: { label: 'Idle', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
    stopped: { label: 'Stopped', color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  };

  const activeCount = vehicleStatuses.filter(v => v.status === 'moving').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Live Map Tracking</h1>
          <p className="text-slate-500 mt-1">Real-time GPS tracking of your fleet</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
            <Wifi size={16} className="text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">Live</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl">
            <Bus size={16} className="text-slate-600" />
            <span className="text-sm font-medium text-slate-700">{activeCount} Active</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="relative h-[500px] bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 flex items-center justify-center">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-indigo-500 blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-40 h-40 rounded-full bg-cyan-500 blur-3xl" />
              </div>

              <div className="relative text-center z-10">
                <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center mx-auto mb-4">
                  <MapPin size={40} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Live GPS Tracking</h3>
                <p className="text-slate-300 text-sm">Real-time vehicle locations and trip progress</p>
              </div>

              {vehicleStatuses.slice(0, 5).map((v, i) => (
                <div
                  key={v.id}
                  className={`absolute w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110 ${
                    v.status === 'moving' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/40' :
                    v.status === 'idle' ? 'bg-amber-500 shadow-lg shadow-amber-500/40' :
                    'bg-red-500 shadow-lg shadow-red-500/40'
                  } ${selectedVehicle?.id === v.id ? 'ring-4 ring-white/50' : ''}`}
                  style={{ top: `${20 + i * 15}%`, left: `${15 + i * 18}%` }}
                  onClick={() => setSelectedVehicle(v)}
                >
                  <Bus size={18} className="text-white" />
                </div>
              ))}

              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <button className="p-2 bg-white/10 backdrop-blur border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors">
                  <Maximize2 size={18} />
                </button>
                <button className="p-2 bg-white/10 backdrop-blur border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors">
                  <Locate size={18} />
                </button>
              </div>

              <div className="absolute bottom-4 left-4 flex items-center gap-4">
                {Object.entries(statusConfig).map(([key, config]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${config.dot}`} />
                    <span className="text-xs text-slate-300">{config.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {selectedVehicle && (
            <div className="mt-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <Bus size={28} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{selectedVehicle.plate_number}</h3>
                    <p className="text-sm text-slate-500">{selectedVehicle.driver_name} &bull; {selectedVehicle.route_name}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border ${statusConfig[selectedVehicle.status].color}`}>
                  <span className={`w-2 h-2 rounded-full mr-2 ${statusConfig[selectedVehicle.status].dot} ${selectedVehicle.status === 'moving' ? 'animate-pulse' : ''}`} />
                  {statusConfig[selectedVehicle.status].label}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <Gauge size={20} className="mx-auto text-slate-400 mb-1" />
                  <p className="text-lg font-bold text-slate-900">{selectedVehicle.speed} km/h</p>
                  <p className="text-xs text-slate-500">Speed</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <Fuel size={20} className="mx-auto text-slate-400 mb-1" />
                  <p className="text-lg font-bold text-slate-900">{selectedVehicle.fuel.toFixed(0)}%</p>
                  <p className="text-xs text-slate-500">Fuel</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <Navigation size={20} className="mx-auto text-slate-400 mb-1" />
                  <p className="text-lg font-bold text-slate-900">{selectedVehicle.completed_stops}/{selectedVehicle.total_stops}</p>
                  <p className="text-xs text-slate-500">Stops</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <Clock size={20} className="mx-auto text-slate-400 mb-1" />
                  <p className="text-lg font-bold text-slate-900">{selectedVehicle.students_onboard}</p>
                  <p className="text-xs text-slate-500">Students</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Trip Progress</span>
                  <span className="text-sm font-bold text-indigo-600">{selectedVehicle.progress.toFixed(0)}%</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${selectedVehicle.progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Active Vehicles</h3>
            {isLoading ? (
              <div className="p-8 text-center text-slate-400">Loading vehicles...</div>
            ) : (
              <div className="space-y-3">
                {vehicleStatuses.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    onClick={() => setSelectedVehicle(vehicle)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                      selectedVehicle?.id === vehicle.id ? 'border-indigo-300 bg-indigo-50 shadow-md' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-slate-900">{vehicle.plate_number}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusConfig[vehicle.status].color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1 ${statusConfig[vehicle.status].dot} ${vehicle.status === 'moving' ? 'animate-pulse' : ''}`} />
                        {statusConfig[vehicle.status].label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-500">
                      <span>{vehicle.route_name}</span>
                      <span>{vehicle.speed} km/h</span>
                    </div>
                    <div className="mt-2">
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${vehicle.progress}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
                {vehicleStatuses.length === 0 && (
                  <div className="p-8 text-center text-slate-400">No vehicles available</div>
                )}
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-5 text-white">
            <h3 className="font-semibold mb-2">Fleet Overview</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-indigo-200 text-sm">Total Vehicles</span>
                <span className="font-bold">{vehicleStatuses.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-indigo-200 text-sm">Moving</span>
                <span className="font-bold text-emerald-300">{vehicleStatuses.filter(v => v.status === 'moving').length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-indigo-200 text-sm">Idle</span>
                <span className="font-bold text-amber-300">{vehicleStatuses.filter(v => v.status === 'idle').length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-indigo-200 text-sm">Stopped</span>
                <span className="font-bold text-red-300">{vehicleStatuses.filter(v => v.status === 'stopped').length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
