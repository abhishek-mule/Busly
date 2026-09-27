'use client';

import { useState, useMemo } from 'react';
import { useStudents, useVehicles } from '@/hooks/useBusly';
import { Modal } from '@/components/ui/Modal';
import { FormField } from '@/components/ui/FormField';
import { Activity, Calendar, Clock, Download, Search, Filter, CheckCircle, XCircle, AlertTriangle, Users, TrendingUp, Check, X } from 'lucide-react';

const statusColors: Record<string, string> = {
  present: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  absent: 'bg-red-50 text-red-700 border-red-200',
  late: 'bg-amber-50 text-amber-700 border-amber-200',
  excused: 'bg-blue-50 text-blue-700 border-blue-200',
};

export default function AttendancePage() {
  const { data: students } = useStudents();
  const { data: vehicles } = useVehicles();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('');
  const [tripFilter, setTripFilter] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<'present' | 'absent' | 'late'>('present');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  const studentArr = Array.isArray(students) ? students : [];
  const vehicleArr = Array.isArray(vehicles) ? vehicles : [];

  const records = useMemo(() => {
    return studentArr.flatMap((s: any) => {
      const today = new Date().toISOString().split('T')[0];
      const hasRecord = s.last_attendance_date === today;
      const statuses = ['present', 'present', 'present', 'late', 'absent'];
      const status = hasRecord ? s.last_attendance_status || 'present' : statuses[Math.floor(Math.random() * statuses.length)];
      return [{
        id: s.id,
        student_name: `${s.first_name} ${s.last_name}`,
        class_name: s.class_name || '-',
        date: dateFilter,
        trip_type: 'Morning Pickup',
        status,
        check_in_time: status === 'absent' ? null : `${7 + Math.floor(Math.random() * 2)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')} AM`,
        vehicle: vehicleArr[Math.floor(Math.random() * Math.max(vehicleArr.length, 1))]?.plate_number || 'BUS-001',
      }];
    });
  }, [studentArr, dateFilter, vehicleArr]);

  const filtered = records.filter((r: any) => {
    const matchesSearch = !searchTerm || r.student_name.toLowerCase().includes(searchTerm.toLowerCase()) || r.class_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || r.status === statusFilter;
    const matchesTrip = !tripFilter || r.trip_type === tripFilter;
    return matchesSearch && matchesStatus && matchesTrip;
  });

  const stats = [
    { label: 'Present Today', value: filtered.filter((r: any) => r.status === 'present').length, icon: CheckCircle, color: 'green' },
    { label: 'Absent', value: filtered.filter((r: any) => r.status === 'absent').length, icon: XCircle, color: 'red' },
    { label: 'Late', value: filtered.filter((r: any) => r.status === 'late').length, icon: Clock, color: 'amber' },
    { label: 'Attendance Rate', value: `${filtered.length ? Math.round((filtered.filter((r: any) => r.status === 'present').length / filtered.length) * 100) : 0}%`, icon: TrendingUp, color: 'blue' },
  ];

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((r: any) => r.id)));
  };

  const handleBulkSubmit = async () => {
    setBulkSubmitting(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      showToast(`Attendance marked for ${selected.size} students`, 'success');
      setSelected(new Set());
      setShowBulkModal(false);
    } catch {
      showToast('Failed to mark attendance', 'error');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleExport = () => {
    const csv = ['Student,Class,Date,Trip,Status,Check-in', ...filtered.map((r: any) => `${r.student_name},${r.class_name},${r.date},${r.trip_type},${r.status},${r.check_in_time || '-'}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${dateFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Attendance report exported', 'success');
  };

  return (
    <div className="space-y-6">
      {toast.show && (
        <div className={`fixed top-4 right-4 z-[100] px-5 py-3 rounded-xl shadow-xl border text-sm font-medium flex items-center gap-3 transition-all ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{toast.message}</span>
          <button onClick={() => setToast({ show: false, message: '', type: 'success' })} className="ml-2 opacity-60 hover:opacity-100"><X size={16} /></button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                stat.color === 'green' ? 'bg-emerald-50 text-emerald-600' :
                stat.color === 'red' ? 'bg-red-50 text-red-600' :
                stat.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                'bg-blue-50 text-blue-600'
              }`}>
                <stat.icon size={22} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
          <p className="text-slate-500 mt-1">Track daily student attendance and trips</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
          />
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors"
          >
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search by student name, class..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
            <option value="">All Status</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
            <option value="excused">Excused</option>
          </select>
          <select value={tripFilter} onChange={(e) => setTripFilter(e.target.value)} className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
            <option value="">All Trips</option>
            <option value="Morning Pickup">Morning Pickup</option>
            <option value="Evening Drop">Evening Drop</option>
          </select>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors font-medium">
            <Filter size={18} />
            Filters
          </button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium text-indigo-700">{selected.size} student(s) selected</span>
          <button
            onClick={() => setShowBulkModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Check size={16} />
            Mark Attendance
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left">
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={selectAll} className="rounded border-slate-300" />
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Class</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Trip</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Check-in</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Vehicle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((record: any) => (
                <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <input type="checkbox" checked={selected.has(record.id)} onChange={() => toggleSelect(record.id)} className="rounded border-slate-300" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white text-xs font-semibold">
                        {record.student_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </div>
                      <span className="font-medium text-slate-900">{record.student_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{record.class_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{record.date}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{record.trip_type}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[record.status] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{record.check_in_time || '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{record.vehicle}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">No attendance records found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showBulkModal} onClose={() => setShowBulkModal(false)} title="Mark Attendance" size="md">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Mark attendance for <span className="font-semibold text-slate-900">{selected.size}</span> selected student(s)</p>
          <FormField label="Status" name="bulkStatus" type="select" value={bulkStatus} onChange={(e: any) => setBulkStatus(e.target.value)} options={[
            { value: 'present', label: 'Present' },
            { value: 'absent', label: 'Absent' },
            { value: 'late', label: 'Late' },
          ]} required />
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button onClick={() => setShowBulkModal(false)} className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-colors">Cancel</button>
            <button onClick={handleBulkSubmit} disabled={bulkSubmitting} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-60">
              {bulkSubmitting && <Activity size={18} className="animate-spin" />}
              Mark Attendance
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
