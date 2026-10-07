'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LayoutDashboard, Bus, Users, MapPin, GraduationCap,
  Map, CreditCard, Settings, Bell, LogOut, ChevronRight,
  Activity, TrendingUp, Clock, Search, Moon, Sun, Menu, X,
  FileText, MoreVertical, Gauge, Wifi, WifiOff, CheckCheck
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { alertsAPI, vehiclesAPI, driversAPI, studentsAPI, routesAPI, authAPI } from '@/lib/api';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', color: '#6366f1' },
  { href: '/dashboard/vehicles', icon: Bus, label: 'Vehicles', color: '#3b82f6' },
  { href: '/dashboard/drivers', icon: Users, label: 'Conductors', color: '#10b981' },
  { href: '/dashboard/routes', icon: MapPin, label: 'Routes', color: '#f59e0b' },
  { href: '/dashboard/students', icon: GraduationCap, label: 'Students', color: '#8b5cf6' },
  { href: '/dashboard/stops', icon: MapPin, label: 'Stops', color: '#ec4899' },
  { href: '/dashboard/attendance', icon: Activity, label: 'Attendance', color: '#14b8a6' },
  { href: '/dashboard/map', icon: Map, label: 'Live Map', color: '#ec4899' },
  { href: '/dashboard/reports', icon: FileText, label: 'Reports', color: '#8b5cf6' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings', color: '#64748b' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState({ name: 'User', role: 'User', email: '' });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [backendUp, setBackendUp] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const indexCache = useRef<any[] | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const unreadAlerts = alerts.filter((a: any) => !a.is_read).length;

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      setUser({ name: u.full_name || u.name || 'User', role: u.roles?.[0] || u.role || 'User', email: u.email || '' });
    } catch { /* keep default */ }
  }, []);

  const apiOrigin = () => {
    try {
      return new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1').origin;
    } catch {
      return 'http://localhost:8000';
    }
  };

  const refreshAlerts = useCallback(async () => {
    try {
      const res = await alertsAPI.list({ limit: 10 });
      const items = res.data?.items ?? (Array.isArray(res.data) ? res.data : []);
      setAlerts(items);
    } catch { /* keep previous */ }
    try {
      const h = await fetch(`${apiOrigin()}/health`);
      setBackendUp(h.ok);
    } catch {
      setBackendUp(false);
    }
  }, []);

  useEffect(() => {
    refreshAlerts();
    const t = setInterval(refreshAlerts, 30000);
    return () => clearInterval(t);
  }, [refreshAlerts]);

  useEffect(() => {
    setNotifOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  const markAllRead = useCallback(async () => {
    const unread = alerts.filter((a: any) => !a.is_read);
    await Promise.allSettled(unread.map((a: any) => alertsAPI.markRead(a.id)));
    setAlerts((prev) => prev.map((a: any) => ({ ...a, is_read: true })));
  }, [alerts]);

  const buildIndex = useCallback(async () => {
    if (indexCache.current) return indexCache.current;
    const unwrap = (res: any) => res.data?.items ?? (Array.isArray(res.data) ? res.data : []);
    try {
      const [v, d, s, r] = await Promise.all([
        vehiclesAPI.list({ limit: 100 }),
        driversAPI.list({ limit: 100 }),
        studentsAPI.list({ limit: 100 }),
        routesAPI.list({ limit: 100 }),
      ]);
      const idx = [
        ...unwrap(v).map((x: any) => ({ type: 'Vehicle', label: x.plate_number || x.id, sub: x.vehicle_type || '', href: '/dashboard/vehicles', q: x.plate_number || '' })),
        ...unwrap(d).map((x: any) => ({ type: 'Conductor', label: x.full_name || x.name || x.id, sub: x.phone || '', href: '/dashboard/drivers', q: x.full_name || x.name || '' })),
        ...unwrap(s).map((x: any) => ({ type: 'Student', label: `${x.first_name || ''} ${x.last_name || ''}`.trim() || x.id, sub: x.class_name || '', href: '/dashboard/students', q: x.first_name || '' })),
        ...unwrap(r).map((x: any) => ({ type: 'Route', label: x.name || x.id, sub: x.route_code || '', href: '/dashboard/routes', q: x.name || '' })),
      ];
      indexCache.current = idx;
      return idx;
    } catch {
      return [];
    }
  }, []);

  const onSearchChange = useCallback(async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    const idx = await buildIndex();
    const needle = q.trim().toLowerCase();
    setSearchResults(idx.filter((e: any) => `${e.label} ${e.sub}`.toLowerCase().includes(needle)).slice(0, 8));
    setSearchOpen(true);
  }, [buildIndex]);

  const goResult = useCallback((r: any) => {
    setSearchOpen(false);
    setSearchQuery('');
    router.push(`${r.href}?q=${encodeURIComponent(r.q)}`);
  }, [router]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleLogout = async () => {
    try {
      await authAPI.logout(localStorage.getItem('refresh_token') || undefined);
    } catch { /* best-effort revocation */ }
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      document.getElementById('global-search')?.focus();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-gradient-to-b from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 text-white transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="h-20 flex items-center justify-between px-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-indigo-500/30">
              <img src="/busly-mascot-logo.svg" alt="Busly" width={40} height={40} className="object-cover" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold tracking-tight">Busly</h1>
              <p className="text-xs text-slate-400">Transport Management</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 py-6 px-3 overflow-y-auto">
          <div className="space-y-1">
            {navItems.slice(0, 6).map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? 'bg-white/10 text-white border-l-4 border-indigo-500'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                    isActive ? 'bg-indigo-500' : 'bg-white/10 group-hover:bg-white/20'
                  }`}>
                    <item.icon size={18} />
                  </div>
                  <span className="font-medium">{item.label}</span>
                  {isActive && <ChevronRight size={16} className="ml-auto" />}
                </Link>
              );
            })}
          </div>

          <div className="mt-6">
            <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              More
            </p>
            <div className="space-y-1">
              {navItems.slice(6).map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                      isActive
                        ? 'bg-white/10 text-white border-l-4 border-indigo-500'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                      isActive ? 'bg-indigo-500' : 'bg-white/10 group-hover:bg-white/20'
                    }`}>
                      <item.icon size={18} />
                    </div>
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-semibold">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-slate-400 truncate">{user.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-red-400"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex-1 lg:ml-72">
        <header className="h-20 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 flex items-center justify-between sticky top-0 z-20 transition-colors">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <Menu size={24} className="text-slate-600 dark:text-slate-300" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {navItems.find(n => n.href === pathname)?.label || 'Dashboard'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Welcome back, {user.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="global-search"
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onFocus={() => { if (searchResults.length > 0) setSearchOpen(true); }}
                onKeyDown={(e) => { if (e.key === 'Escape') setSearchOpen(false); }}
                className="pl-9 pr-16 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-64 transition-colors"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 text-xs font-medium text-slate-400 bg-slate-200 dark:bg-slate-600 rounded">Ctrl</kbd>
                <kbd className="px-1.5 py-0.5 text-xs font-medium text-slate-400 bg-slate-200 dark:bg-slate-600 rounded">K</kbd>
              </div>
              {searchOpen && (
                <div className="absolute top-11 left-0 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden z-50">
                  {searchResults.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-slate-500">No matches found</p>
                  ) : (
                    searchResults.map((r: any, i: number) => (
                      <button
                        key={`${r.type}-${i}`}
                        onClick={() => goResult(r)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-left"
                      >
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">{r.type}</span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium text-slate-900 dark:text-white truncate">{r.label}</span>
                          {r.sub && <span className="block text-xs text-slate-500 truncate">{r.sub}</span>}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              title={darkMode ? 'Light Mode' : 'Dark Mode'}
            >
              {darkMode ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} className="text-slate-600" />}
            </button>

            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700" title={backendUp ? 'Backend reachable' : 'Backend unreachable'}>
              {backendUp ? (
                <Wifi size={14} className="text-emerald-500" />
              ) : (
                <WifiOff size={14} className="text-red-500" />
              )}
              <span className={`text-xs font-medium ${backendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                {backendUp ? 'Live' : 'Offline'}
              </span>
            </div>

            <div className="relative">
              <button onClick={() => setNotifOpen((o) => !o)} className="relative p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors" title="Notifications">
                <Bell size={20} className="text-slate-600 dark:text-slate-300" />
                {unreadAlerts > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-1 border-2 border-white dark:border-slate-700">
                    {unreadAlerts > 99 ? '99+' : unreadAlerts}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-12 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</p>
                    {unreadAlerts > 0 && (
                      <button onClick={markAllRead} className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
                        <CheckCheck size={14} /> Mark all read
                      </button>
                    )}
                  </div>
                  {alerts.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-slate-500 text-center">No notifications yet</p>
                  ) : (
                    <div className="max-h-80 overflow-y-auto">
                      {alerts.map((a: any) => (
                        <div key={a.id} className={`px-4 py-3 border-b border-slate-100 dark:border-slate-700 last:border-0 ${a.is_read ? '' : 'bg-indigo-50/50 dark:bg-indigo-900/10'}`}>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{a.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{a.message}</p>
                          <p className="text-[11px] text-slate-400 mt-1 capitalize">{a.severity || 'info'} · {a.alert_type || 'notice'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-700">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                {user.name.charAt(0)}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{user.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{user.role}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
