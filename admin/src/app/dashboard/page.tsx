'use client';

import { useVehicles, useDrivers, useRoutes, useStudents, useAlerts } from '@/hooks/useBusly';
import { tripsAPI, attendanceAPI, Trip } from '@/lib/api';
import { useState, useEffect } from 'react';
import {
  Bus, Users, MapPin, GraduationCap, TrendingUp,
  Clock, CheckCircle, AlertTriangle, ArrowRight,
  Calendar, DollarSign
} from 'lucide-react';
import Link from 'next/link';

const colorMap: Record<string, string> = {
  blue: 'bg-blue-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  purple: 'bg-purple-500',
  green: 'bg-green-500',
};

const shadowMap: Record<string, string> = {
  blue: 'shadow-blue-500/30',
  emerald: 'shadow-emerald-500/30',
  amber: 'shadow-amber-500/30',
  purple: 'shadow-purple-500/30',
  green: 'shadow-green-500/30',
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day ago`;
}

const alertIcon: Record<string, { icon: any; color: string }> = {
  trip: { icon: Bus, color: 'blue' },
  attendance: { icon: CheckCircle, color: 'green' },
  payment: { icon: DollarSign, color: 'emerald' },
  alert: { icon: AlertTriangle, color: 'amber' },
  student: { icon: GraduationCap, color: 'purple' },
};

export default function DashboardPage() {
  const { data: vehicles, isLoading: vLoading } = useVehicles();
  const { data: drivers, isLoading: dLoading } = useDrivers();
  const { data: routes, isLoading: rLoading } = useRoutes();
  const { data: students, isLoading: sLoading } = useStudents();
  const { data: alertsData, isLoading: aLoading } = useAlerts();

  const [upcomingTrips, setUpcomingTrips] = useState<Trip[]>([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [week, setWeek] = useState<{ label: string; present: number; late: number; absent: number; marked: number }[]>([]);
  const [weekLoading, setWeekLoading] = useState(true);

  const dateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  useEffect(() => {
    const fetch = async () => {
      try {
        const days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return d;
        });
        const results = await Promise.all(days.map(d => attendanceAPI.daily({ date: dateStr(d) })));
        setWeek(results.map((r, i) => {
          const items: any[] = r.data.items || [];
          const uniq = (status: string) => new Set(items.filter(x => x.status === status).map(x => x.student_id)).size;
          return {
            label: days[i].toLocaleDateString(undefined, { weekday: 'short' }),
            present: uniq('present'),
            late: uniq('late'),
            absent: uniq('absent'),
            marked: new Set(items.map(x => x.student_id)).size,
          };
        }));
      } catch {
        setWeek([]);
      } finally {
        setWeekLoading(false);
      }
    };
    fetch();
  }, []);

  const today = week[6];
  const yesterday = week[5];
  const weekHasData = week.some(d => d.marked > 0);
  const trend =
    yesterday && today && yesterday.present > 0 && today.marked > 0
      ? Math.round(((today.present - yesterday.present) / yesterday.present) * 100)
      : null;
  const barMax = Math.max(1, ...week.map(d => d.marked));

  useEffect(() => {
    const fetch = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await tripsAPI.list({ date: today, status: 'scheduled' });
        setUpcomingTrips(data.items || []);
      } catch {
        setUpcomingTrips([]);
      } finally {
        setTripsLoading(false);
      }
    };
    fetch();
  }, []);

  const vehicleArr = Array.isArray(vehicles) ? vehicles : [];
  const driverArr = Array.isArray(drivers) ? drivers : [];
  const routeArr = Array.isArray(routes) ? routes : [];
  const studentArr = Array.isArray(students) ? students : [];
  const alerts = (alertsData as any)?.items || (Array.isArray(alertsData) ? alertsData : []);

  const stats = {
    vehicles: {
      total: vehicleArr.length,
      active: vehicleArr.filter((v: any) => v.status === 'active').length,
      maintenance: vehicleArr.filter((v: any) => v.status === 'maintenance').length,
    },
    drivers: {
      total: driverArr.length,
      active: driverArr.filter((d: any) => d.status === 'active').length,
      available: driverArr.filter((d: any) => d.is_available).length,
    },
    routes: {
      total: routeArr.length,
      active: routeArr.filter((r: any) => r.status === 'active').length,
    },
    students: {
      total: studentArr.length,
    },
  };

  const recentActivity = (alerts || []).slice(0, 5).map((a: any) => ({
    id: a.id,
    type: a.alert_type || 'alert',
    message: a.title || a.message,
    time: timeAgo(a.created_at),
    icon: alertIcon[a.alert_type]?.icon || AlertTriangle,
    color: alertIcon[a.alert_type]?.color || 'blue',
  }));

  const statCards = [
    {
      title: 'Total Vehicles',
      value: vLoading ? '-' : stats.vehicles.total,
      icon: Bus,
      color: 'blue',
      stats: vLoading ? 'Loading...' : `${stats.vehicles.active} active, ${stats.vehicles.maintenance} maintenance`,
      href: '/dashboard/vehicles'
    },
    {
      title: 'Active Drivers',
      value: dLoading ? '-' : stats.drivers.active,
      icon: Users,
      color: 'emerald',
      stats: dLoading ? 'Loading...' : `${stats.drivers.available} available now`,
      href: '/dashboard/drivers'
    },
    {
      title: 'Active Routes',
      value: rLoading ? '-' : stats.routes.active,
      icon: MapPin,
      color: 'amber',
      stats: rLoading ? 'Loading...' : `${stats.routes.total} total routes`,
      href: '/dashboard/routes'
    },
    {
      title: 'Present Today',
      value: weekLoading ? '-' : `${today ? today.present : 0}/${stats.students.total}`,
      icon: GraduationCap,
      color: 'purple',
      stats: weekLoading ? 'Loading...' : today && today.marked > 0 ? `${today.marked} of ${stats.students.total} marked` : 'No attendance marked yet',
      href: '/dashboard/attendance'
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Link key={index} href={stat.href}>
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all duration-300 group cursor-pointer">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{stat.value}</p>
                  <p className="text-sm text-slate-400 mt-1">{stat.stats}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${colorMap[stat.color]} flex items-center justify-center text-white shadow-lg ${shadowMap[stat.color]}`}>
                  <stat.icon size={24} />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Weekly Attendance</h3>
              <p className="text-sm text-slate-500">Last 7 days overview</p>
            </div>
            {trend !== null && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${trend >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <TrendingUp size={16} className={trend >= 0 ? 'text-green-600' : 'text-red-600 rotate-180'} />
                <span className={`text-sm font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {trend >= 0 ? '+' : ''}{trend}% vs yesterday
                </span>
              </div>
            )}
          </div>

          {weekLoading && (
            <div className="h-48 flex items-center justify-center text-sm text-slate-400">Loading attendance...</div>
          )}
          {!weekLoading && !weekHasData && (
            <div className="h-48 flex flex-col items-center justify-center text-center">
              <Calendar size={28} className="text-slate-300 mb-2" />
              <p className="text-sm text-slate-400">No attendance recorded in the last 7 days</p>
              <Link href="/dashboard/attendance" className="text-sm text-indigo-600 font-medium mt-1">Mark attendance &rarr;</Link>
            </div>
          )}
          {!weekLoading && weekHasData && (
            <div className="h-48 flex items-end justify-between gap-2">
              {week.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col justify-end" style={{ height: '160px' }}>
                    {day.absent > 0 && (
                      <div className="w-full bg-red-400" style={{ height: `${(day.absent / barMax) * 100}%` }} title={`${day.absent} absent`} />
                    )}
                    {day.late > 0 && (
                      <div className="w-full bg-amber-400" style={{ height: `${(day.late / barMax) * 100}%` }} title={`${day.late} late`} />
                    )}
                    <div
                      className="w-full bg-indigo-500 rounded-t-lg transition-all duration-500 hover:bg-indigo-600"
                      style={{ height: `${(day.present / barMax) * 100}%` }}
                      title={`${day.present} present`}
                    />
                  </div>
                  <span className="text-xs text-slate-400">{day.label}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-indigo-500 rounded-full" />
              <span className="text-sm text-slate-600">Present</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-400 rounded-full" />
              <span className="text-sm text-slate-600">Late</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-400 rounded-full" />
              <span className="text-sm text-slate-600">Absent</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Today&apos;s Overview</h3>

          <div className="space-y-6">
            {weekLoading && <p className="text-sm text-slate-400 text-center py-4">Loading attendance...</p>}
            {!weekLoading && (!today || today.marked === 0) && (
              <div className="text-center py-6">
                <p className="text-sm text-slate-400">No attendance marked for today yet</p>
                <Link href="/dashboard/attendance" className="text-sm text-indigo-600 font-medium">Mark attendance &rarr;</Link>
              </div>
            )}
            {!weekLoading && today && today.marked > 0 && (
              <>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                    <CheckCircle className="text-green-600" size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Present</span>
                      <span className="text-lg font-bold text-green-600">{today.present}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full mt-1">
                      <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${Math.round((today.present / today.marked) * 100)}%` }} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                    <AlertTriangle className="text-red-600" size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Absent</span>
                      <span className="text-lg font-bold text-red-600">{today.absent}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full mt-1">
                      <div className="h-full bg-red-500 rounded-full transition-all duration-500" style={{ width: `${Math.round((today.absent / today.marked) * 100)}%` }} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                    <Clock className="text-amber-600" size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Late Arrival</span>
                      <span className="text-lg font-bold text-amber-600">{today.late}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full mt-1">
                      <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${Math.round((today.late / today.marked) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <Link
            href="/dashboard/attendance"
            className="mt-6 flex items-center justify-center gap-2 w-full py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            View Attendance Details
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
              <p className="text-sm text-slate-500">Latest updates from your fleet</p>
            </div>
            <span className="text-sm text-slate-500">
              {recentActivity.length > 0 ? `${recentActivity.length} recent` : ''}
            </span>
          </div>

          <div className="space-y-4">
            {aLoading && <p className="text-sm text-slate-400 text-center py-4">Loading activity...</p>}
            {!aLoading && recentActivity.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">No recent activity</p>
            )}
            {recentActivity.map((activity: any) => (
              <div key={activity.id} className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  activity.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                  activity.color === 'green' ? 'bg-green-50 text-green-600' :
                  activity.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                  activity.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                  'bg-purple-50 text-purple-600'
                }`}>
                  <activity.icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{activity.message}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Upcoming Trips</h3>
              <p className="text-sm text-slate-500">Today&apos;s remaining trips</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-lg">
              <Calendar size={14} className="text-indigo-600" />
              <span className="text-sm font-medium text-indigo-600">{new Date().toLocaleDateString()}</span>
            </div>
          </div>

          <div className="space-y-4">
            {tripsLoading && <p className="text-sm text-slate-400 text-center py-4">Loading trips...</p>}
            {!tripsLoading && upcomingTrips.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">No upcoming trips</p>
            )}
            {upcomingTrips.map((trip: Trip) => (
              <div key={trip.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <Bus size={20} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Trip #{trip.id}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-slate-500">{trip.students_count} students</span>
                      <span className="text-sm text-slate-400">•</span>
                      <span className="text-sm text-slate-500">{new Date(trip.scheduled_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
                <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                  {trip.status}
                </span>
              </div>
            ))}
          </div>

          <Link
            href="/dashboard/routes"
            className="mt-6 flex items-center justify-center gap-2 w-full py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Manage Routes
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

    </div>
  );
}
