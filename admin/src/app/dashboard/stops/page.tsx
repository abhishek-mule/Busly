'use client';

import { useState } from 'react';
import { useStops, useRoutes } from '@/hooks/useBusly';
import { stopsAPI } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { FormField } from '@/components/ui/FormField';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { MapPin, Plus, Search, Filter, Clock, Navigation, Edit, Trash2, Loader2, X, CheckCircle, AlertCircle } from 'lucide-react';

const initialForm = {
  route_id: '',
  name: '',
  address: '',
  landmark: '',
  latitude: '',
  longitude: '',
  stop_order: '',
  estimated_arrival_time: '',
};

export default function StopsPage() {
  const { data: stops, isLoading, error, refetch } = useStops();
  const { data: routes } = useRoutes();
  const [searchTerm, setSearchTerm] = useState('');
  const [routeFilter, setRouteFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  const stopArr = Array.isArray(stops) ? stops : [];
  const routeArr = Array.isArray(routes) ? routes : [];

  const filtered = stopArr.filter((s: any) => {
    const matchesSearch = !searchTerm ||
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.landmark?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRoute = !routeFilter || String(s.route_id) === routeFilter;
    return matchesSearch && matchesRoute;
  });

  const routesWithStops = new Set(stopArr.map((s: any) => s.route_id)).size;

  const stats = [
    { label: 'Total Stops', value: stopArr.length, icon: MapPin, color: 'blue' },
    { label: 'Active', value: stopArr.filter((s: any) => s.status !== 'inactive').length, icon: Navigation, color: 'green' },
    { label: 'Routes Covered', value: routesWithStops, icon: Clock, color: 'purple' },
  ];

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const openAddModal = () => {
    setEditingItem(null);
    setForm(initialForm);
    setShowModal(true);
  };

  const openEditModal = (stop: any) => {
    setEditingItem(stop);
    setForm({
      route_id: stop.route_id ? String(stop.route_id) : '',
      name: stop.name || '',
      address: stop.address || '',
      landmark: stop.landmark || '',
      latitude: stop.latitude ? String(stop.latitude) : '',
      longitude: stop.longitude ? String(stop.longitude) : '',
      stop_order: stop.stop_order ? String(stop.stop_order) : '',
      estimated_arrival_time: stop.estimated_arrival_time || '',
    });
    setShowModal(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload: any = {};
      for (const [key, value] of Object.entries(form)) {
        if (value !== '' && value !== null) {
          if (['route_id', 'stop_order'].includes(key)) {
            payload[key] = Number(value);
          } else if (['latitude', 'longitude'].includes(key)) {
            payload[key] = parseFloat(value);
          } else {
            payload[key] = value;
          }
        }
      }

      if (editingItem) {
        await stopsAPI.update(editingItem.id, payload);
        showToast('Stop updated successfully', 'success');
      } else {
        await stopsAPI.create(payload);
        showToast('Stop created successfully', 'success');
      }
      setShowModal(false);
      setEditingItem(null);
      setForm(initialForm);
      refetch();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'An error occurred', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setSubmitting(true);
    try {
      await stopsAPI.delete(deleteConfirm.id);
      showToast('Stop deleted successfully', 'success');
      setDeleteConfirm(null);
      refetch();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to delete stop', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getRouteName = (routeId: number) => {
    const route = routeArr.find((r: any) => r.id === routeId);
    return route?.name || 'Unknown Route';
  };

  return (
    <div className="space-y-6">
      {toast.show && (
        <div className={`fixed top-4 right-4 z-[100] px-5 py-3 rounded-xl shadow-xl border text-sm font-medium flex items-center gap-3 transition-all ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
          <button onClick={() => setToast({ show: false, message: '', type: 'success' })} className="ml-2 opacity-60 hover:opacity-100">
            <X size={16} />
          </button>
        </div>
      )}

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
          <h1 className="text-2xl font-bold text-slate-900">Bus Stops</h1>
          <p className="text-slate-500 mt-1">Manage bus stops and route assignments</p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
        >
          <Plus size={20} />
          Add Stop
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search stops by name, address, landmark..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50"
            />
          </div>
          <select
            value={routeFilter}
            onChange={(e) => setRouteFilter(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50"
          >
            <option value="">All Routes</option>
            {routeArr.map((route: any) => (
              <option key={route.id} value={route.id}>{route.name}</option>
            ))}
          </select>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors font-medium">
            <Filter size={18} />
            Filters
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="p-12 text-center text-slate-400">Loading stops...</div>
      )}
      {error && (
        <div className="p-12 text-center text-red-400">Error loading stops</div>
      )}
      {!isLoading && !error && (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Stop Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Address</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Landmark</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Route</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Order</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">ETA</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((stop: any) => (
                <tr key={stop.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
                        <MapPin size={18} className="text-white" />
                      </div>
                      <span className="font-semibold text-slate-900">{stop.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 max-w-[200px] truncate">{stop.address}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{stop.landmark || '-'}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium">
                      {getRouteName(stop.route_id)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{stop.stop_order || '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-slate-400" />
                      {stop.estimated_arrival_time || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(stop)}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(stop)}
                        className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">No stops found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-sm text-slate-500">Showing <span className="font-medium text-slate-900">{filtered.length}</span> of <span className="font-medium text-slate-900">{stopArr.length}</span> stops</p>
        </div>
      </div>
      )}

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditingItem(null); setForm(initialForm); }} title={editingItem ? 'Edit Stop' : 'Add Stop'} size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Route" name="route_id" type="select" value={form.route_id} onChange={handleFormChange} required options={routeArr.map((r: any) => ({ value: String(r.id), label: r.name }))} />
          <FormField label="Stop Name" name="name" value={form.name} onChange={handleFormChange} required />
          <div className="md:col-span-2">
            <FormField label="Address" name="address" value={form.address} onChange={handleFormChange} required />
          </div>
          <FormField label="Landmark" name="landmark" value={form.landmark} onChange={handleFormChange} />
          <FormField label="Stop Order" name="stop_order" type="number" value={form.stop_order} onChange={handleFormChange} />
          <FormField label="Latitude" name="latitude" type="number" value={form.latitude} onChange={handleFormChange} placeholder="e.g. 12.9716" />
          <FormField label="Longitude" name="longitude" type="number" value={form.longitude} onChange={handleFormChange} placeholder="e.g. 77.5946" />
          <FormField label="Estimated Arrival Time" name="estimated_arrival_time" value={form.estimated_arrival_time} onChange={handleFormChange} placeholder="e.g. 07:30 AM" />
        </div>
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
          <button
            onClick={() => { setShowModal(false); setEditingItem(null); setForm(initialForm); }}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting && <Loader2 size={18} className="animate-spin" />}
            {editingItem ? 'Update Stop' : 'Add Stop'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Stop"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={submitting}
      />
    </div>
  );
}
