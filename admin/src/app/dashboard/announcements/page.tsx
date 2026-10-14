'use client';

import { useState, useEffect, useCallback } from 'react';
import { Megaphone, Send, Users, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { notificationsAPI } from '@/lib/api';
import { FormField } from '@/components/ui/FormField';

interface Announcement {
  id: string;
  title: string;
  body: string;
  sent_at: string | null;
  created_at: string;
}

export default function AnnouncementsPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  const loadHistory = useCallback(() => {
    notificationsAPI.list({ limit: 50 })
      .then(({ data }) => setHistory((data.items ?? []).filter((n: any) => n.notification_type === 'announcement')))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      showToast('Title and message are both required', 'error');
      return;
    }
    setSending(true);
    try {
      const { data } = await notificationsAPI.broadcast({ title: title.trim(), body: body.trim() });
      showToast(`Announcement sent to ${data.recipients ?? 0} parent${data.recipients === 1 ? '' : 's'}`, 'success');
      setTitle('');
      setBody('');
      loadHistory();
    } catch (err: any) {
      showToast(err?.response?.data?.detail?.message || 'Failed to send announcement', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-rose-500" /> Announcements
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Broadcast a message to every parent — it appears instantly in the parent app, e.g. early school closures.
        </p>
      </div>

      {toast.show && (
        <div className={`p-3 rounded-xl border text-sm flex items-center gap-2 ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      <form onSubmit={handleBroadcast} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-400" /> Notify all parents
        </h2>
        <FormField label="Title" name="title" value={title} onChange={(e: any) => setTitle(e.target.value)} placeholder="e.g. School closes early today" />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="e.g. Due to heavy rain, school closes at 12:30 PM today. Buses leave at 12:45 PM."
            rows={4}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={sending}
          className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all disabled:opacity-50"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? 'Sending…' : 'Send to all parents'}
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900 mb-4">Recent announcements</h2>
        {loading ? (
          <p className="text-sm text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-slate-500">No announcements sent yet.</p>
        ) : (
          <div className="space-y-3">
            {history.map((a) => (
              <div key={a.id} className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900 text-sm">{a.title}</p>
                  <span className="text-xs text-slate-400 shrink-0">
                    {a.sent_at ? new Date(a.sent_at).toLocaleString() : ''}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-1">{a.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
