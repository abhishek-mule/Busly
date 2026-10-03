'use client';

import { useState, useEffect } from 'react';
import { useDrivers } from '@/hooks/useBusly';
import { driversAPI } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { FormField } from '@/components/ui/FormField';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Users, Plus, Search, Phone, Car, Star, Edit, Trash2, Loader2, X } from 'lucide-react';

const initialForm = {
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  license_number: '',
  license_expiry: '',
  status: 'active',
  address: '',
  city: '',
  vehicle_id: '',
};

export default function DriversPage() {
  const { data: drivers, isLoading, error, refetch } = useDrivers();
  const [searchTerm, setSearchTerm] = useState('');
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) setSearchTerm(q);
  }, []);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  const driverArr = Array.isArray(drivers) ? drivers : [];

  const filtered = driverArr.filter((d: any) =>
    !searchTerm || d.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) || d.phone?.includes(searchTerm)
  );

  const avgRating = driverArr.length
    ? (driverArr.reduce((s: number, d: any) => s + (d.rating || 0), 0) / driverArr.length).toFixed(1)
    : '0.0';

  const stats = [
    { label: 'Total Drivers', value: driverArr.length, icon: Users, color: 'blue' },
    { label: 'Active Now', value: driverArr.filter((d: any) => d.status !== 'inactive').length, icon: Car, color: 'green' },
    { label: 'Avg Rating', value: avgRating, icon: Star, color: 'amber' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'available':
      case 'on_trip': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'inactive': return 'bg-slate-50 text-slate-600 border-slate-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const openAddModal = () => {
    setEditingItem(null);
    setForm(initialForm);
    setShowModal(true);
  };

  const openEditModal = (driver: any) => {
    setEditingItem(driver);
    setForm({
      first_name: driver.first_name || '',
      last_name: driver.last_name || '',
      phone: driver.phone || '',
      email: driver.email || '',
      license_number: driver.license_number || '',
      license_expiry: driver.license_expiry ? driver.license_expiry.slice(0, 10) : '',
      status: driver.status || 'active',
      address: driver.address || '',
      city: driver.city || '',
      vehicle_id: driver.vehicle_id ? String(driver.vehicle_id) : '',
    });
    setShowModal(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        vehicle_id: form.vehicle_id ? form.vehicle_id : null,
      };
      if (editingItem) {
        await driversAPI.update(editingItem.id, payload);
        showToast('Driver updated successfully', 'success');
      } else {
        await driversAPI.create(payload);
        showToast('Driver created successfully', 'success');
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
      await driversAPI.delete(deleteConfirm.id);
      showToast('Driver deleted successfully', 'success');
      setDeleteConfirm(null);
      refetch();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to delete driver', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast.show && (
        <div className={`fixed top-4 right-4 z-[100] px-5 py-3 rounded-xl shadow-xl border text-sm font-medium flex items-center gap-3 transition-all ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
        }`}>
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
          <h1 className="text-2xl font-bold text-slate-900">Drivers</h1>
          <p className="text-slate-500 mt-1">Manage your driver fleet and assignments</p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
        >
          <Plus size={20} />
          Add Driver
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, phone, license..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50"
            />
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="p-12 text-center text-slate-400">Loading drivers...</div>
      )}
      {error && (
        <div className="p-12 text-center text-red-400">Error loading drivers</div>
      )}
      {!isLoading && !error && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((driver: any) => (
          <div key={driver.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-indigo-500/30">
                  {(driver.first_name || '?')[0]}{(driver.last_name || '')[0]}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-lg">{driver.first_name} {driver.last_name || ''}</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(driver.status)}`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                      driver.status !== 'inactive' ? 'bg-emerald-500' : 'bg-slate-400'
                    }`} />
                    {driver.status.charAt(0).toUpperCase() + driver.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-slate-600">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Phone size={16} className="text-slate-500" />
                </div>
                <span className="text-sm">{driver.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Car size={16} className="text-slate-500" />
                </div>
                <span className="text-sm">License: <span className="font-medium">{driver.license_number}</span></span>
              </div>
            </div>

            <div className="flex items-center justify-between py-4 border-t border-b border-slate-100 mb-4">
              <div className="text-center flex-1">
                <div className="flex items-center justify-center gap-1">
                  <Star size={16} className="text-amber-500 fill-amber-500" />
                  <span className="text-lg font-bold text-slate-900">{driver.rating || 'N/A'}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Rating</p>
              </div>
              <div className="w-px h-10 bg-slate-200" />
              <div className="text-center flex-1">
                <span className="text-lg font-bold text-slate-900">{driver.total_trips || 0}</span>
                <p className="text-xs text-slate-500 mt-0.5">Total Trips</p>
              </div>
              <div className="w-px h-10 bg-slate-200" />
              <div className="text-center flex-1">
                <span className="text-lg font-bold text-slate-900">{driver.created_at ? new Date(driver.created_at).toLocaleDateString() : '-'}</span>
                <p className="text-xs text-slate-500 mt-0.5">Joined</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => openEditModal(driver)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl font-medium hover:bg-indigo-100 transition-colors"
              >
                <Edit size={18} />
                Edit
              </button>
              <button
                onClick={() => setDeleteConfirm(driver)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-colors"
              >
                <Trash2 size={18} />
                Delete
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full p-12 text-center text-slate-400">No drivers found</div>
        )}
      </div>
      )}

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditingItem(null); setForm(initialForm); }} title={editingItem ? 'Edit Driver' : 'Add Driver'} size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="First Name" name="first_name" value={form.first_name} onChange={handleFormChange} required />
          <FormField label="Last Name" name="last_name" value={form.last_name} onChange={handleFormChange} required />
          <FormField label="Phone" name="phone" value={form.phone} onChange={handleFormChange} required />
          <FormField label="Email" name="email" type="email" value={form.email} onChange={handleFormChange} />
          <FormField label="License Number" name="license_number" value={form.license_number} onChange={handleFormChange} required />
          <FormField label="License Expiry" name="license_expiry" type="date" value={form.license_expiry} onChange={handleFormChange} />
          <FormField label="Status" name="status" type="select" value={form.status} onChange={handleFormChange} options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]} />
          <FormField label="Vehicle ID" name="vehicle_id" type="number" value={form.vehicle_id} onChange={handleFormChange} placeholder="Optional" />
          <div className="md:col-span-2">
            <FormField label="Address" name="address" value={form.address} onChange={handleFormChange} />
          </div>
          <FormField label="City" name="city" value={form.city} onChange={handleFormChange} />
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
            {editingItem ? 'Update Driver' : 'Add Driver'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Driver"
        message={`Are you sure you want to delete ${deleteConfirm?.first_name || ''} ${deleteConfirm?.last_name || ''}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={submitting}
      />
    </div>
  );
}
