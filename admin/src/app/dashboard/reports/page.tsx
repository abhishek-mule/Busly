'use client';

import { useState } from 'react';
import { FileText, Download, Calendar, BarChart3, TrendingUp, Users, Bus, CreditCard, Clock, Search, Filter, Eye, Trash2, Loader2, X, CheckCircle, AlertCircle } from 'lucide-react';

interface ReportType {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  bgColor: string;
}

interface RecentReport {
  id: number;
  name: string;
  type: string;
  date_range: string;
  generated_at: string;
  size: string;
  format: string;
}

const reportTypes: ReportType[] = [
  { id: 'attendance', title: 'Attendance Report', description: 'Daily, weekly, and monthly student attendance summaries', icon: Users, color: 'text-teal-600', bgColor: 'bg-teal-50' },
  { id: 'fleet', title: 'Fleet Utilization', description: 'Vehicle usage, mileage, and efficiency metrics', icon: Bus, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  { id: 'route', title: 'Route Performance', description: 'Route efficiency, timing, and stop analysis', icon: TrendingUp, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  { id: 'fee', title: 'Fee Collection', description: 'Fee payment status, pending dues, and revenue', icon: CreditCard, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  { id: 'driver', title: 'Driver Performance', description: 'Driver ratings, trips completed, and punctuality', icon: Clock, color: 'text-amber-600', bgColor: 'bg-amber-50' },
];

const recentReports: RecentReport[] = [
  { id: 1, name: 'Monthly Attendance - August 2026', type: 'Attendance', date_range: 'Aug 1 - Aug 31, 2026', generated_at: 'Sep 1, 2026', size: '2.4 MB', format: 'PDF' },
  { id: 2, name: 'Fleet Utilization Q3 2026', type: 'Fleet', date_range: 'Jul 1 - Sep 30, 2026', generated_at: 'Sep 15, 2026', size: '1.8 MB', format: 'PDF' },
  { id: 3, name: 'Route Performance Analysis', type: 'Route', date_range: 'Aug 1 - Aug 31, 2026', generated_at: 'Sep 5, 2026', size: '3.1 MB', format: 'PDF' },
  { id: 4, name: 'Fee Collection Summary', type: 'Fee', date_range: 'Aug 1 - Aug 31, 2026', generated_at: 'Sep 2, 2026', size: '1.2 MB', format: 'Excel' },
  { id: 5, name: 'Driver Performance Review', type: 'Driver', date_range: 'Jul 1 - Aug 31, 2026', generated_at: 'Sep 10, 2026', size: '980 KB', format: 'PDF' },
];

export default function ReportsPage() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('2026-08-01');
  const [dateTo, setDateTo] = useState('2026-08-31');
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleGenerate = async () => {
    if (!selectedType) {
      showToast('Please select a report type', 'error');
      return;
    }
    setGenerating(true);
    try {
      await new Promise(r => setTimeout(r, 1500));
      const type = reportTypes.find(t => t.id === selectedType);
      showToast(`${type?.title} generated successfully`, 'success');
      setSelectedType(null);
    } catch {
      showToast('Failed to generate report', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = (report: RecentReport) => {
    showToast(`Downloading ${report.name}...`, 'success');
  };

  const chartData = [
    { label: 'Mon', attendance: 92, fleet: 85 },
    { label: 'Tue', attendance: 88, fleet: 90 },
    { label: 'Wed', attendance: 95, fleet: 88 },
    { label: 'Thu', attendance: 90, fleet: 92 },
    { label: 'Fri', attendance: 87, fleet: 86 },
    { label: 'Sat', attendance: 75, fleet: 70 },
    { label: 'Sun', attendance: 0, fleet: 0 },
  ];

  return (
    <div className="space-y-6">
      {toast.show && (
        <div className={`fixed top-4 right-4 z-[100] px-5 py-3 rounded-xl shadow-xl border text-sm font-medium flex items-center gap-3 transition-all ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
          <button onClick={() => setToast({ show: false, message: '', type: 'success' })} className="ml-2 opacity-60 hover:opacity-100"><X size={16} /></button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-slate-500 mt-1">Generate and download operational reports</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportTypes.map((type) => (
          <div
            key={type.id}
            onClick={() => setSelectedType(selectedType === type.id ? null : type.id)}
            className={`bg-white rounded-2xl border p-5 shadow-sm cursor-pointer transition-all hover:shadow-md ${
              selectedType === type.id ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${type.bgColor}`}>
                <type.icon size={22} className={type.color} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">{type.title}</h3>
                <p className="text-sm text-slate-500 mt-1">{type.description}</p>
              </div>
            </div>
            {selectedType === type.id && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">From</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">To</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedType && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText size={20} className="text-indigo-600" />
            <div>
              <p className="font-medium text-indigo-800">{reportTypes.find(t => t.id === selectedType)?.title}</p>
              <p className="text-sm text-indigo-600">{dateFrom} to {dateTo}</p>
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-60"
          >
            {generating && <Loader2 size={18} className="animate-spin" />}
            Generate Report
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Weekly Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-slate-600 mb-3">Attendance Rate (%)</p>
            <div className="flex items-end gap-2 h-40">
              {chartData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-slate-100 rounded-t-lg relative" style={{ height: '120px' }}>
                    <div
                      className="absolute bottom-0 w-full bg-gradient-to-t from-teal-500 to-teal-400 rounded-t-lg transition-all"
                      style={{ height: `${d.attendance}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500">{d.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600 mb-3">Fleet Utilization (%)</p>
            <div className="flex items-end gap-2 h-40">
              {chartData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-slate-100 rounded-t-lg relative" style={{ height: '120px' }}>
                    <div
                      className="absolute bottom-0 w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all"
                      style={{ height: `${d.fleet}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500">{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search reports..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50"
            />
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors font-medium">
            <Filter size={18} />
            Filters
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Report Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date Range</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Generated</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Size</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentReports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                        <FileText size={18} className="text-white" />
                      </div>
                      <span className="font-medium text-slate-900">{report.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">{report.type}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{report.date_range}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{report.generated_at}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{report.size}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleDownload(report)}
                        className="p-2 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
                        title="Download"
                      >
                        <Download size={18} />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors" title="Preview">
                        <Eye size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
