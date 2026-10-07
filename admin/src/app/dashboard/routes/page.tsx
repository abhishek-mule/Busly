'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRoutes } from '@/hooks/useBusly';
import { MapPin, Plus, Search, Clock, Navigation, Bus, Map, Eye, Edit, Trash2, Play, Loader2, X, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { FormField } from '@/components/ui/FormField';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { routesAPI } from '@/lib/api';

const initialForm = {
  name: '',
  route_code: '',
  start_point: '',
  end_point: '',
  total_distance_km: '',
  estimated_time_minutes: '',
  morning_pickup_time: '',
  evening_drop_time: '',
  vehicle_id: '',
  driver_id: '',
  status: 'active',
  base_fare: '',
};

export default function RoutesPage() {
  const router = useRouter();
  const { data: routes, isLoading, error, refetch: mutate } = useRoutes();
  const [searchTerm, setSearchTerm] = useState('');
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) setSearchTerm(q);
  }, []);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; item: any }>({ isOpen: false, item: null });
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; type: 'success' | 'error'; message: string }>({ show: false, type: 'success', message: '' });
  const [optRoute, setOptRoute] = useState('');
  const [optState, setOptState] = useState<'idle' | 'running' | 'done' | 'failed'>('idle');
  const [optResult, setOptResult] = useState<string[]>([]);

  const runOptimize = async () => {
    if (!optRoute || optState === 'running') return;
    setOptState('running');
    setOptResult([]);
    try {
      const { data } = await routesAPI.optimize(optRoute);
      const taskId = data.task_id;
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const st = await routesAPI.optimizeStatus(optRoute, taskId);
        if (st.data.status === 'completed') {
          setOptState('done');
          setOptResult(st.data.result?.optimized_order || []);
          mutate();
          return;
        }
        if (st.data.status === 'failed') {
          setOptState('failed');
          return;
        }
      }
      setOptState('failed');
    } catch {
      setOptState('failed');
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: 'success', message: '' }), 3000);
  };

  const routeArr = Array.isArray(routes) ? routes : [];

  const filtered = routeArr.filter((r: any) =>
    !searchTerm || r.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalStops = routeArr.reduce((sum: number, r: any) => sum + (r.stops?.length || 0), 0);

  const stats = [
    { label: 'Total Routes', value: routeArr.length, icon: MapPin, color: 'blue' },
    { label: 'Active Routes', value: routeArr.filter((r: any) => r.status === 'active').length, icon: Play, color: 'green' },
    { label: 'Total Stops', value: totalStops, icon: Navigation, color: 'purple' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'inactive': return 'bg-slate-50 text-slate-600 border-slate-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const activeCount = routeArr.filter((r: any) => r.status === 'active').length;
  const inactiveCount = routeArr.length - activeCount;

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setEditingItem(null);
    setForm(initialForm);
    setShowModal(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setForm({
      name: item.name || '',
      route_code: item.route_code || '',
      start_point: item.start_point || '',
      end_point: item.end_point || '',
      total_distance_km: item.total_distance_km?.toString() || '',
      estimated_time_minutes: item.estimated_time_minutes?.toString() || '',
      morning_pickup_time: item.morning_pickup_time || '',
      evening_drop_time: item.evening_drop_time || '',
      vehicle_id: item.vehicle_id?.toString() || '',
      driver_id: item.driver_id?.toString() || '',
      status: item.status || 'active',
      base_fare: item.base_fare?.toString() || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload: any = {};
      for (const [key, value] of Object.entries(form)) {
        if (value !== '' && value !== null) {
          if (['total_distance_km', 'estimated_time_minutes', 'vehicle_id', 'driver_id', 'base_fare'].includes(key)) {
            payload[key] = Number(value);
          } else {
            payload[key] = value;
          }
        }
      }

      if (editingItem) {
        await routesAPI.update(editingItem.id, payload);
        showToast('success', 'Route updated successfully');
      } else {
        await routesAPI.create(payload);
        showToast('success', 'Route created successfully');
      }

      setShowModal(false);
      mutate();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.item) return;
    setSubmitting(true);
    try {
      await routesAPI.delete(deleteConfirm.item.id);
      showToast('success', 'Route deleted successfully');
      setDeleteConfirm({ isOpen: false, item: null });
      mutate();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to delete route');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast.show && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl border ${
          toast.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="font-medium text-sm">{toast.message}</span>
          <button onClick={() => setToast({ show: false, type: 'success', message: '' })} className="ml-2 p-0.5 rounded hover:bg-black/5">
            <X size={16} />
          </button>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingItem ? 'Edit Route' : 'Add Route'} size="lg">
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Name" name="name" value={form.name} onChange={handleFormChange} required />
            <FormField label="Route Code" name="route_code" value={form.route_code} onChange={handleFormChange} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Start Point" name="start_point" value={form.start_point} onChange={handleFormChange} required />
            <FormField label="End Point" name="end_point" value={form.end_point} onChange={handleFormChange} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Total Distance (km)" name="total_distance_km" type="number" value={form.total_distance_km} onChange={handleFormChange} />
            <FormField label="Estimated Time (min)" name="estimated_time_minutes" type="number" value={form.estimated_time_minutes} onChange={handleFormChange} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Morning Pickup Time" name="morning_pickup_time" type="text" value={form.morning_pickup_time} onChange={handleFormChange} placeholder="e.g. 07:00 AM" />
            <FormField label="Evening Drop Time" name="evening_drop_time" type="text" value={form.evening_drop_time} onChange={handleFormChange} placeholder="e.g. 04:00 PM" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Vehicle ID" name="vehicle_id" type="number" value={form.vehicle_id} onChange={handleFormChange} />
            <FormField label="Conductor ID" name="driver_id" type="number" value={form.driver_id} onChange={handleFormChange} />
            <FormField label="Base Fare" name="base_fare" type="number" value={form.base_fare} onChange={handleFormChange} />
          </div>
          <FormField
            label="Status"
            name="status"
            type="select"
            value={form.status}
            onChange={handleFormChange}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
            required
          />
        </div>
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
          <button
            onClick={() => setShowModal(false)}
            className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting && <Loader2 size={18} className="animate-spin" />}
            {editingItem ? 'Update' : 'Create'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, item: null })}
        onConfirm={handleDelete}
        title="Delete Route"
        message={`Are you sure you want to delete "${deleteConfirm.item?.name || 'this route'}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={submitting}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                stat.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                stat.color === 'green' ? 'bg-emerald-50 text-emerald-600' :
                'bg-purple-50 text-purple-600'
              }`}>
                <stat.icon size={22} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Routes</h1>
          <p className="text-slate-500 mt-1">Manage bus routes, stops and schedules</p>
        </div>
        <button onClick={openAddModal} className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20">
          <Plus size={20} />
          Add Route
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Search routes by name, area..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50"
                />
              </div>
            </div>
          </div>

          {isLoading && (
            <div className="p-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 size={32} className="animate-spin mb-3" />
              <span>Loading routes...</span>
            </div>
          )}
          {error && (
            <div className="p-12 text-center text-red-400">Error loading routes</div>
          )}
          {!isLoading && !error && (
          <div className="space-y-4">
            {filtered.map((route: any) => (
              <div key={route.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                      <MapPin className="text-white" size={22} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-lg">{route.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1 text-sm text-slate-500">
                          <Bus size={14} />
                          {route.route_code}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-sm text-slate-500">{route.stops?.length || 0} stops</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border ${getStatusColor(route.status)}`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
                        route.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                      }`} />
                      {route.status.charAt(0).toUpperCase() + route.status.slice(1)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 py-3 border-t border-b border-slate-100 mb-4">
                  <div className="flex items-center gap-2 text-slate-600">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                      <MapPin size={16} className="text-slate-500" />
                    </div>
                    <span className="text-sm font-medium">{route.stops?.length || 0}</span>
                    <span className="text-sm text-slate-500">stops</span>
                  </div>
                  <div className="w-px h-6 bg-slate-200" />
                  <div className="flex items-center gap-2 text-slate-600">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Navigation size={16} className="text-slate-500" />
                    </div>
                    <span className="text-sm font-medium">{route.total_distance_km ? `${route.total_distance_km} km` : '-'}</span>
                  </div>
                  <div className="w-px h-6 bg-slate-200" />
                  <div className="flex items-center gap-2 text-slate-600">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Clock size={16} className="text-slate-500" />
                    </div>
                    <span className="text-sm font-medium">{route.estimated_time_minutes ? `${route.estimated_time_minutes} min` : '-'}</span>
                  </div>
                  <div className="w-px h-6 bg-slate-200" />
                  <div className="flex items-center gap-2 text-slate-600">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Play size={16} className="text-slate-500" />
                    </div>
                    <span className="text-sm">{route.start_point} - {route.end_point}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => router.push(`/dashboard/stops?route=${route.id}`)} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-medium hover:bg-indigo-100 transition-colors">
                    <Eye size={18} />
                    View Stops
                  </button>
                  <button onClick={() => openEditModal(route)} className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors">
                    <Edit size={18} />
                    Edit
                  </button>
                  <button onClick={() => setDeleteConfirm({ isOpen: true, item: route })} className="ml-auto p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="p-12 text-center text-slate-400">No routes found</div>
            )}
          </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Route Overview</h3>
            <button onClick={() => router.push('/dashboard/map')} className="w-full h-48 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center mb-4 hover:from-indigo-50 hover:to-indigo-100 transition-colors">
              <div className="text-center">
                <Map className="mx-auto text-slate-400 mb-2" size={40} />
                <p className="text-slate-500 text-sm font-medium">Live Map</p>
                <p className="text-indigo-600 text-xs font-medium">Open live fleet map</p>
              </div>
            </button>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Play size={14} className="text-emerald-600" />
                  </div>
                  <span className="font-medium text-emerald-800">Active</span>
                </div>
                <span className="text-emerald-700 font-semibold">{activeCount} routes</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center">
                    <MapPin size={14} className="text-slate-600" />
                  </div>
                  <span className="font-medium text-slate-700">Inactive</span>
                </div>
                <span className="text-slate-600 font-semibold">{inactiveCount} routes</span>
              </div>
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                <p className="font-medium text-indigo-900 text-sm mb-2">Optimize stop order</p>
                <select
                  value={optRoute}
                  onChange={(e) => { setOptRoute(e.target.value); setOptState('idle'); setOptResult([]); }}
                  className="w-full mb-2 px-3 py-2 text-sm border border-indigo-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Select a route…</option>
                  {routeArr.map((r: any) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <button
                  onClick={runOptimize}
                  disabled={!optRoute || optState === 'running'}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm rounded-lg font-medium transition-colors"
                >
                  {optState === 'running' ? 'Optimizing…' : 'Reorder by shortest path'}
                </button>
                {optState === 'done' && (
                  <p className="text-xs text-emerald-700 mt-2 font-medium">Done — {optResult.length} stops reordered.</p>
                )}
                {optState === 'failed' && (
                  <p className="text-xs text-red-600 mt-2 font-medium">Optimization failed. Try again.</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-5 text-white">
            <h3 className="font-semibold mb-2">Trip Reports</h3>
            <p className="text-indigo-200 text-sm mb-4">Generate attendance, fleet and trip reports as CSV</p>
            <button onClick={() => router.push('/dashboard/reports')} className="w-full py-2.5 bg-white/20 hover:bg-white/30 rounded-xl font-medium transition-colors flex items-center justify-center gap-2">
              <FileText size={18} />
              Open Reports
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
