'use client';

import { useState, useEffect } from 'react';
import { useVehicles } from '@/hooks/useBusly';
import { vehiclesAPI } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormField } from '@/components/ui/FormField';
import { Bus, Plus, Search, MapPin, Wrench, Edit, Trash2, Loader2, X, XCircle } from 'lucide-react';

const defaultForm = {
  plate_number: '',
  vehicle_type: 'bus',
  make: '',
  model: '',
  year: new Date().getFullYear(),
  color: '',
  seating_capacity: '',
  status: 'active',
  insurance_expiry: '',
  permit_expiry: '',
};

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'inactive', label: 'Inactive' },
];

function toDateValue(date: string | null | undefined): string {
  if (!date) return '';
  try {
    return date.split('T')[0];
  } catch {
    return '';
  }
}

export default function VehiclesPage() {
  const { data: vehicles, isLoading, error, refetch } = useVehicles();
  const [searchTerm, setSearchTerm] = useState('');
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) setSearchTerm(q);
  }, []);
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'error'; message: string } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const vehicleArr = Array.isArray(vehicles) ? vehicles : [];

  const filtered = vehicleArr.filter((v: any) =>
    !searchTerm || v.plate_number?.toLowerCase().includes(searchTerm.toLowerCase()) || v.vehicle_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    { label: 'Total Vehicles', value: vehicleArr.length, icon: Bus, color: 'blue' },
    { label: 'Active', value: vehicleArr.filter((v: any) => v.status === 'active').length, icon: MapPin, color: 'green' },
    { label: 'Maintenance', value: vehicleArr.filter((v: any) => v.status === 'maintenance').length, icon: Wrench, color: 'amber' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'maintenance': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const openAddModal = () => {
    setEditingVehicle(null);
    setForm(defaultForm);
    setShowModal(true);
  };

  const openEditModal = (vehicle: any) => {
    setEditingVehicle(vehicle);
    setForm({
      plate_number: vehicle.plate_number || '',
      vehicle_type: vehicle.vehicle_type || 'bus',
      make: vehicle.make || '',
      model: vehicle.model || '',
      year: vehicle.year ?? new Date().getFullYear(),
      color: vehicle.color || '',
      seating_capacity: vehicle.seating_capacity ?? '',
      status: vehicle.status || 'active',
      insurance_expiry: toDateValue(vehicle.insurance_expiry),
      permit_expiry: toDateValue(vehicle.permit_expiry),
    });
    setShowModal(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'year' ? (value ? parseInt(value) : '') : value,
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setToast(null);
    try {
      const payload = {
        ...form,
        seating_capacity: form.seating_capacity === '' ? null : Number(form.seating_capacity),
        year: form.year || null,
        insurance_expiry: form.insurance_expiry ? new Date(form.insurance_expiry).toISOString() : null,
        permit_expiry: form.permit_expiry ? new Date(form.permit_expiry).toISOString() : null,
      };
      if (editingVehicle) {
        await vehiclesAPI.update(editingVehicle.id, payload);
      } else {
        await vehiclesAPI.create(payload);
      }
      await refetch();
      setShowModal(false);
    } catch (err: any) {
      setToast({ type: 'error', message: err.response?.data?.message || err.message || 'An error occurred' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setSubmitting(true);
    setToast(null);
    try {
      await vehiclesAPI.delete(deleteConfirm.id);
      await refetch();
      setDeleteConfirm(null);
    } catch (err: any) {
      setToast({ type: 'error', message: err.response?.data?.message || err.message || 'An error occurred' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border ${
          toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          <XCircle size={20} className="shrink-0" />
          <span className="text-sm font-medium flex-1">{toast.message}</span>
          <button onClick={() => setToast(null)} className="p-1 rounded-lg hover:bg-black/5 transition-colors">
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
                'bg-amber-50 text-amber-600'
              }`}>
                <stat.icon size={22} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vehicles</h1>
          <p className="text-slate-500 mt-1">Manage your fleet vehicles and assignments</p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
        >
          <Plus size={20} />
          Add Vehicle
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search by vehicle number, type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50"
            />
          </div>
        </div>

        {isLoading && (
          <div className="p-12 text-center text-slate-400">Loading vehicles...</div>
        )}
        {error && (
          <div className="p-12 text-center text-red-400">Error loading vehicles</div>
        )}
        {!isLoading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Vehicle</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Capacity</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((vehicle: any) => (
                <tr key={vehicle.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                        <Bus className="text-white" size={20} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{vehicle.plate_number}</p>
                        <p className="text-xs text-slate-500">{vehicle.make} {vehicle.model}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium">
                      {vehicle.vehicle_type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-600">{vehicle.seating_capacity}</span>
                    <span className="text-slate-400 text-sm"> seats</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border ${getStatusColor(vehicle.status)}`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
                        vehicle.status === 'active' ? 'bg-emerald-500' : vehicle.status === 'maintenance' ? 'bg-amber-500' : 'bg-slate-400'
                      }`} />
                      {vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(vehicle)}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(vehicle)}
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
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">No vehicles found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        )}

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-sm text-slate-500">Showing <span className="font-medium text-slate-900">{filtered.length}</span> of <span className="font-medium text-slate-900">{vehicleArr.length}</span> vehicles</p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50" disabled>Previous</button>
            <button className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">1</button>
            <button className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50" disabled>Next</button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}
        size="lg"
      >
        <div className="space-y-4">
          <FormField
            label="Registration Number"
            name="plate_number"
            value={form.plate_number}
            onChange={handleChange}
            required
            placeholder="e.g. BUS-001"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Vehicle Type"
              name="vehicle_type"
              value={form.vehicle_type}
              onChange={handleChange}
              placeholder="e.g. Bus, Van"
            />
            <FormField
              label="Make"
              name="make"
              value={form.make}
              onChange={handleChange}
              placeholder="e.g. Toyota"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Model"
              name="model"
              value={form.model}
              onChange={handleChange}
              placeholder="e.g. Coaster"
            />
            <FormField
              label="Year"
              name="year"
              type="number"
              value={form.year}
              onChange={handleChange}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Color"
              name="color"
              value={form.color}
              onChange={handleChange}
              placeholder="e.g. White"
            />
            <FormField
              label="Seating Capacity"
              name="seating_capacity"
              type="number"
              value={form.seating_capacity}
              onChange={handleChange}
            />
          </div>
          <FormField
            label="Status"
            name="status"
            type="select"
            value={form.status}
            onChange={handleChange}
            options={statusOptions}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Insurance Expiry"
              name="insurance_expiry"
              type="date"
              value={form.insurance_expiry}
              onChange={handleChange}
            />
            <FormField
              label="Permit Expiry"
              name="permit_expiry"
              type="date"
              value={form.permit_expiry}
              onChange={handleChange}
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-600/20"
            >
              {submitting && <Loader2 size={18} className="animate-spin" />}
              {editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Vehicle"
        message={`Are you sure you want to delete ${deleteConfirm?.plate_number}? This action cannot be undone.`}
        loading={submitting}
      />
    </div>
  );
}
