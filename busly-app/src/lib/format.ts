export const normalizePhone = (p?: string | null) => (p ?? '').replace(/\D/g, '');

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const fmtDate = (d: string | null | undefined) => {
  if (!d) return '—';
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return String(d).slice(0, 10);
  return parsed.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
};

export const fmtTime = (iso: string | null | undefined) => {
  if (!iso) return '--:--';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(11, 16) || '--:--';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const relativeFromNow = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const diffSec = Math.round((Date.now() - t) / 1000);
  if (diffSec < 60) return 'just now';
  const min = Math.round(diffSec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} h ago`;
  return fmtDate(iso);
};
