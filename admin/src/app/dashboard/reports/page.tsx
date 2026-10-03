'use client';

import { useState, useEffect, useCallback } from 'react';
import { reportsAPI } from '@/lib/api';
import { FileText, Download, Users, Bus, GraduationCap, Route, Loader2, X, CheckCircle, AlertCircle, RefreshCw, Clock } from 'lucide-react';

const reportTypes = [
  { id: 'attendance', title: 'Attendance Report', description: 'Student attendance records with dates and statuses', icon: Users, color: 'text-teal-600', bgColor: 'bg-teal-50' },
  { id: 'students', title: 'Student Roster', description: 'All enrolled students with class and section', icon: GraduationCap, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  { id: 'vehicles', title: 'Fleet Utilization', description: 'Vehicles with type, status, and seating capacity', icon: Bus, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  { id: 'trips', title: 'Trip Records', description: 'Scheduled and completed trips by route', icon: Route, color: 'text-amber-600', bgColor: 'bg-amber-50' },
];

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
};

const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function ReportsPage() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const today = new Date();
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  const [dateFrom, setDateFrom] = useState(fmtDate(monthAgo));
  const [dateTo, setDateTo] = useState(fmtDate(today));
  const [generating, setGenerating] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const loadReports = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await reportsAPI.list({ limit: 50 });
      setReports(data.items || []);
    } catch {
      setReports([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    const hasPending = reports.some(r => r.status === 'pending');
    if (!hasPending) return;
    const t = setInterval(() => loadReports(true), 3000);
    return () => clearInterval(t);
  }, [reports, loadReports]);

  const handleGenerate = async () => {
    if (!selectedType) {
      showToast('Please select a report type', 'error');
      return;
    }
    setGenerating(true);
    try {
      const type = reportTypes.find(t => t.id === selectedType);
      await reportsAPI.generate({
        report_type: selectedType,
        title: `${type?.title} — ${dateFrom} to ${dateTo}`,
        parameters: { date_from: dateFrom, date_to: dateTo },
      });
      showToast(`${type?.title} queued — generating in background`, 'success');
      setSelectedType(null);
      await loadReports(true);
    } catch {
      showToast('Failed to queue report', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (report: any) => {
    setDownloadingId(report.id);
    try {
      let response;
      try {
        response = await reportsAPI.file(report.id);
      } catch {
        response = await reportsAPI.download(report.id);
      }
      const url = URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.report_type}-report.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Report downloaded', 'success');
    } catch {
      showToast('Download failed', 'error');
    } finally {
      setDownloadingId(null);
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
          <button onClick={() => setToast({ show: false, message: '', type: 'success' })} className="ml-2 opacity-60 hover:opacity-100"><X size={16} /></button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-slate-500 mt-1">Generate reports from live data (processed in background)</p>
        </div>
        <button
          onClick={() => loadReports()}
          className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors font-medium"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">Generated Reports</h3>
          <p className="text-sm text-slate-500 mt-0.5">Reports run as background jobs — pending ones update automatically</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Report</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Loading reports...</td></tr>
              )}
              {!loading && reports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                        <FileText size={18} className="text-white" />
                      </div>
                      <span className="font-medium text-slate-900">{report.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">{report.report_type}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={14} className="text-slate-400" />
                      {report.created_at ? new Date(report.created_at).toLocaleString() : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusStyles[report.status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                      {report.status === 'pending' && <Loader2 size={12} className="animate-spin" />}
                      {report.status === 'completed' && <CheckCircle size={12} />}
                      {report.status === 'failed' && <AlertCircle size={12} />}
                      {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDownload(report)}
                      disabled={report.status !== 'completed' || downloadingId === report.id}
                      className="p-2 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title={report.status === 'completed' ? 'Download CSV' : 'Available when completed'}
                    >
                      {downloadingId === report.id ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && reports.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">No reports yet — pick a type above and generate one</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
