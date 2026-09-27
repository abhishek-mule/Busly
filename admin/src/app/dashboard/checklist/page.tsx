'use client';

import { useState } from 'react';
import { useDrivers } from '@/hooks/useBusly';
import { Modal } from '@/components/ui/Modal';
import { ClipboardCheck, CheckCircle, XCircle, AlertTriangle, Search, Filter, Eye, Check, X, Calendar, User, ChevronRight, Shield } from 'lucide-react';

interface ChecklistItem {
  id: string;
  label: string;
  category: string;
  checked: boolean;
  issue?: string;
}

interface DriverChecklist {
  id: number;
  driver_name: string;
  vehicle: string;
  date: string;
  status: 'completed' | 'pending' | 'issues';
  items: ChecklistItem[];
  submitted_at: string;
  approved_by?: string;
}

const defaultChecklistItems: ChecklistItem[] = [
  { id: 'tires', label: 'Tires condition and pressure', category: 'Exterior', checked: true },
  { id: 'brakes', label: 'Brakes functionality', category: 'Safety', checked: true },
  { id: 'lights', label: 'Headlights, tail lights, indicators', category: 'Electrical', checked: true },
  { id: 'fuel', label: 'Fuel level above 25%', category: 'Engine', checked: true },
  { id: 'oil', label: 'Engine oil level', category: 'Engine', checked: true },
  { id: 'coolant', label: 'Coolant level', category: 'Engine', checked: true },
  { id: 'first_aid', label: 'First aid kit available', category: 'Safety', checked: true },
  { id: 'fire_extinguisher', label: 'Fire extinguisher charged', category: 'Safety', checked: true },
  { id: 'seat_belts', label: 'All seat belts working', category: 'Interior', checked: true },
  { id: 'mirrors', label: 'Mirrors adjusted and clean', category: 'Exterior', checked: true },
  { id: 'horn', label: 'Horn working', category: 'Electrical', checked: true },
  { id: 'wipers', label: 'Windshield wipers working', category: 'Exterior', checked: true },
  { id: 'gps', label: 'GPS tracker active', category: 'Electronics', checked: true },
  { id: 'camera', label: 'CCTV cameras working', category: 'Electronics', checked: true },
  { id: 'cleanliness', label: 'Bus interior cleanliness', category: 'Interior', checked: true },
  { id: 'emergency_exit', label: 'Emergency exit accessible', category: 'Safety', checked: true },
];

export default function ChecklistPage() {
  const { data: drivers } = useDrivers();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [driverFilter, setDriverFilter] = useState('');
  const [selectedChecklist, setSelectedChecklist] = useState<DriverChecklist | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  const driverArr = Array.isArray(drivers) ? drivers : [];

  const checklists: DriverChecklist[] = driverArr.slice(0, 6).map((d: any, i: number) => {
    const hasIssue = i === 2 || i === 4;
    const items = defaultChecklistItems.map(item => ({
      ...item,
      checked: hasIssue && (item.id === 'brakes' || item.id === 'first_aid') ? false : true,
      issue: hasIssue && item.id === 'brakes' ? 'Brake pad wear detected' : hasIssue && item.id === 'first_aid' ? 'Kit expired' : undefined,
    }));
    return {
      id: i + 1,
      driver_name: `${d.first_name} ${d.last_name}`,
      vehicle: `BUS-${String(i + 1).padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      status: hasIssue ? 'issues' : i % 3 === 0 ? 'pending' : 'completed',
      items,
      submitted_at: `${6 + i}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')} AM`,
      approved_by: i % 3 !== 0 ? 'Admin' : undefined,
    };
  });

  const filtered = checklists.filter((c: DriverChecklist) => {
    const matchesSearch = !searchTerm || c.driver_name.toLowerCase().includes(searchTerm.toLowerCase()) || c.vehicle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || c.status === statusFilter;
    const matchesDriver = !driverFilter || c.driver_name === driverFilter;
    return matchesSearch && matchesStatus && matchesDriver;
  });

  const completedToday = checklists.filter(c => c.status === 'completed').length;
  const pendingToday = checklists.filter(c => c.status === 'pending').length;
  const issuesFound = checklists.filter(c => c.status === 'issues').length;

  const stats = [
    { label: 'Completed Today', value: completedToday, icon: CheckCircle, color: 'green' },
    { label: 'Pending', value: pendingToday, icon: AlertTriangle, color: 'amber' },
    { label: 'Issues Found', value: issuesFound, icon: XCircle, color: 'red' },
  ];

  const statusConfig = {
    completed: { label: 'Completed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
    pending: { label: 'Pending', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
    issues: { label: 'Issues Found', color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleApprove = (checklist: DriverChecklist) => {
    showToast(`Checklist approved for ${checklist.driver_name}`, 'success');
  };

  const handleReject = (checklist: DriverChecklist) => {
    showToast(`Checklist rejected for ${checklist.driver_name}`, 'error');
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                stat.color === 'green' ? 'bg-emerald-50 text-emerald-600' :
                stat.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                'bg-red-50 text-red-600'
              }`}>
                <stat.icon size={22} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Driver Checklist</h1>
          <p className="text-slate-500 mt-1">Pre-trip vehicle inspection checklists</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search by driver or vehicle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50"
            />
          </div>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="issues">Issues Found</option>
          </select>
          <select value={driverFilter} onChange={(e) => setDriverFilter(e.target.value)} className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
            <option value="">All Drivers</option>
            {driverArr.map((d: any) => (
              <option key={d.id} value={`${d.first_name} ${d.last_name}`}>{d.first_name} {d.last_name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((checklist) => (
          <div key={checklist.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
                  <ClipboardCheck size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-lg">{checklist.driver_name}</h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                    <span className="flex items-center gap-1"><User size={14} /> {checklist.vehicle}</span>
                    <span className="flex items-center gap-1"><Calendar size={14} /> {checklist.date}</span>
                    <span>Submitted: {checklist.submitted_at}</span>
                  </div>
                </div>
              </div>
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border ${statusConfig[checklist.status].color}`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-2 ${statusConfig[checklist.status].dot}`} />
                {statusConfig[checklist.status].label}
              </span>
            </div>

            <div className="flex items-center gap-4 py-3 border-t border-b border-slate-100 mb-4">
              <div className="text-center flex-1">
                <span className="text-lg font-bold text-slate-900">{checklist.items.filter(i => i.checked).length}</span>
                <p className="text-xs text-slate-500">Passed</p>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div className="text-center flex-1">
                <span className="text-lg font-bold text-red-600">{checklist.items.filter(i => !i.checked).length}</span>
                <p className="text-xs text-slate-500">Failed</p>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div className="text-center flex-1">
                <span className="text-lg font-bold text-slate-900">{checklist.items.length}</span>
                <p className="text-xs text-slate-500">Total Items</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedChecklist(checklist)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-medium hover:bg-indigo-100 transition-colors"
              >
                <Eye size={18} />
                View Details
              </button>
              {checklist.status !== 'completed' && (
                <>
                  <button
                    onClick={() => handleApprove(checklist)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-medium hover:bg-emerald-100 transition-colors"
                  >
                    <Check size={18} />
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(checklist)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-colors"
                  >
                    <X size={18} />
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="p-12 text-center text-slate-400">No checklists found</div>
        )}
      </div>

      <Modal isOpen={!!selectedChecklist} onClose={() => setSelectedChecklist(null)} title="Checklist Details" size="lg">
        {selectedChecklist && (
          <div>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{selectedChecklist.driver_name}</h3>
                <p className="text-sm text-slate-500">{selectedChecklist.vehicle} &bull; {selectedChecklist.date}</p>
              </div>
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border ${statusConfig[selectedChecklist.status].color}`}>
                {statusConfig[selectedChecklist.status].label}
              </span>
            </div>
            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {selectedChecklist.items.map((item) => (
                <div key={item.id} className={`flex items-center justify-between p-3 rounded-xl border ${item.checked ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-3">
                    {item.checked ? (
                      <CheckCircle size={20} className="text-emerald-600" />
                    ) : (
                      <XCircle size={20} className="text-red-600" />
                    )}
                    <div>
                      <p className={`text-sm font-medium ${item.checked ? 'text-emerald-800' : 'text-red-800'}`}>{item.label}</p>
                      <p className="text-xs text-slate-500">{item.category}</p>
                      {item.issue && <p className="text-xs text-red-600 mt-1">Issue: {item.issue}</p>}
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-lg ${item.checked ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {item.checked ? 'Pass' : 'Fail'}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <button onClick={() => setSelectedChecklist(null)} className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-colors">Close</button>
              {selectedChecklist.status !== 'completed' && (
                <>
                  <button onClick={() => { handleApprove(selectedChecklist); setSelectedChecklist(null); }} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2">
                    <Check size={18} /> Approve
                  </button>
                  <button onClick={() => { handleReject(selectedChecklist); setSelectedChecklist(null); }} className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors flex items-center gap-2">
                    <X size={18} /> Reject
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
