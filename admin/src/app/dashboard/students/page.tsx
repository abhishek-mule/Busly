'use client';

import { useState } from 'react';
import { useStudents } from '@/hooks/useBusly';
import { studentsAPI } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { FormField } from '@/components/ui/FormField';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { GraduationCap, Plus, Search, Filter, Phone, MapPin, Edit, Trash2, Loader2, X, Users, UserCheck, AlertCircle, CheckCircle } from 'lucide-react';

const initialForm = {
  first_name: '',
  last_name: '',
  student_id: '',
  class_name: '',
  section: '',
  gender: '',
  date_of_birth: '',
  blood_group: '',
  father_name: '',
  father_phone: '',
  mother_name: '',
  mother_phone: '',
  address: '',
  route_id: '',
  pickup_stop_id: '',
  status: 'active',
};

export default function StudentsPage() {
  const { data: students, isLoading, error, refetch } = useStudents();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  const studentArr = Array.isArray(students) ? students : [];

  const filtered = studentArr.filter((s: any) => {
    const matchesSearch = !searchTerm ||
      s.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.student_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.class_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = [
    { label: 'Total Students', value: studentArr.length, icon: GraduationCap, color: 'blue' },
    { label: 'Active', value: studentArr.filter((s: any) => s.status === 'active').length, icon: UserCheck, color: 'green' },
    { label: 'Assigned to Route', value: studentArr.filter((s: any) => s.route_id).length, icon: MapPin, color: 'purple' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
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

  const openEditModal = (student: any) => {
    setEditingItem(student);
    setForm({
      first_name: student.first_name || '',
      last_name: student.last_name || '',
      student_id: student.student_id || '',
      class_name: student.class_name || '',
      section: student.section || '',
      gender: student.gender || '',
      date_of_birth: student.date_of_birth ? student.date_of_birth.split('T')[0] : '',
      blood_group: student.blood_group || '',
      father_name: student.father_name || '',
      father_phone: student.father_phone || '',
      mother_name: student.mother_name || '',
      mother_phone: student.mother_phone || '',
      address: student.address || '',
      route_id: student.route_id ? String(student.route_id) : '',
      pickup_stop_id: student.pickup_stop_id ? String(student.pickup_stop_id) : '',
      status: student.status || 'active',
    });
    setShowModal(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload: any = { ...form };
      if (payload.route_id === '') payload.route_id = null;
      if (payload.pickup_stop_id === '') payload.pickup_stop_id = null;
      if (payload.route_id) payload.route_id = Number(payload.route_id);
      if (payload.pickup_stop_id) payload.pickup_stop_id = Number(payload.pickup_stop_id);

      if (editingItem) {
        await studentsAPI.update(editingItem.id, payload);
        showToast('Student updated successfully', 'success');
      } else {
        await studentsAPI.create(payload);
        showToast('Student created successfully', 'success');
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
      await studentsAPI.delete(deleteConfirm.id);
      showToast('Student deleted successfully', 'success');
      setDeleteConfirm(null);
      refetch();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to delete student', 'error');
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
          <h1 className="text-2xl font-bold text-slate-900">Students</h1>
          <p className="text-slate-500 mt-1">Manage student enrollment and route assignments</p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
        >
          <Plus size={20} />
          Add Student
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, ID, class..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors font-medium">
            <Filter size={18} />
            Filters
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="p-12 text-center text-slate-400">Loading students...</div>
      )}
      {error && (
        <div className="p-12 text-center text-red-400">Error loading students</div>
      )}
      {!isLoading && !error && (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Class</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Parent Contact</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Route</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((student: any) => (
                <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                        {(student.first_name || '?')[0]}{(student.last_name || '')[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{student.first_name} {student.last_name}</p>
                        <p className="text-xs text-slate-500">ID: {student.student_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-700 font-medium">{student.class_name}</span>
                    {student.section && <span className="text-slate-400 text-sm"> - {student.section}</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone size={14} className="text-slate-400" />
                      <span>{student.father_phone || student.mother_phone || '-'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600">{student.route_name || '-'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(student.status)}`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                        student.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                      }`} />
                      {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(student)}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(student)}
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
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">No students found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-sm text-slate-500">Showing <span className="font-medium text-slate-900">{filtered.length}</span> of <span className="font-medium text-slate-900">{studentArr.length}</span> students</p>
        </div>
      </div>
      )}

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditingItem(null); setForm(initialForm); }} title={editingItem ? 'Edit Student' : 'Add Student'} size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="First Name" name="first_name" value={form.first_name} onChange={handleFormChange} required />
          <FormField label="Last Name" name="last_name" value={form.last_name} onChange={handleFormChange} required />
          <FormField label="Student ID" name="student_id" value={form.student_id} onChange={handleFormChange} required />
          <FormField label="Class Name" name="class_name" value={form.class_name} onChange={handleFormChange} required />
          <FormField label="Section" name="section" value={form.section} onChange={handleFormChange} />
          <FormField label="Gender" name="gender" type="select" value={form.gender} onChange={handleFormChange} options={[
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
            { value: 'other', label: 'Other' },
          ]} />
          <FormField label="Date of Birth" name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleFormChange} />
          <FormField label="Blood Group" name="blood_group" type="select" value={form.blood_group} onChange={handleFormChange} options={[
            { value: 'A+', label: 'A+' }, { value: 'A-', label: 'A-' },
            { value: 'B+', label: 'B+' }, { value: 'B-', label: 'B-' },
            { value: 'AB+', label: 'AB+' }, { value: 'AB-', label: 'AB-' },
            { value: 'O+', label: 'O+' }, { value: 'O-', label: 'O-' },
          ]} />
          <FormField label="Father Name" name="father_name" value={form.father_name} onChange={handleFormChange} />
          <FormField label="Father Phone" name="father_phone" value={form.father_phone} onChange={handleFormChange} />
          <FormField label="Mother Name" name="mother_name" value={form.mother_name} onChange={handleFormChange} />
          <FormField label="Mother Phone" name="mother_phone" value={form.mother_phone} onChange={handleFormChange} />
          <FormField label="Route" name="route_id" type="number" value={form.route_id} onChange={handleFormChange} placeholder="Route ID" />
          <FormField label="Pickup Stop" name="pickup_stop_id" type="number" value={form.pickup_stop_id} onChange={handleFormChange} placeholder="Stop ID" />
          <FormField label="Status" name="status" type="select" value={form.status} onChange={handleFormChange} options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]} />
          <div className="md:col-span-2">
            <FormField label="Address" name="address" value={form.address} onChange={handleFormChange} />
          </div>
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
            {editingItem ? 'Update Student' : 'Add Student'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Student"
        message={`Are you sure you want to delete ${deleteConfirm?.first_name || ''} ${deleteConfirm?.last_name || ''}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={submitting}
      />
    </div>
  );
}
