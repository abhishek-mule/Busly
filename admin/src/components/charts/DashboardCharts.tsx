'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export function DashboardCharts() {
  const attendanceData = [
    { name: 'Mon', present: 120, absent: 15 },
    { name: 'Tue', present: 125, absent: 10 },
    { name: 'Wed', present: 118, absent: 17 },
    { name: 'Thu', present: 130, absent: 5 },
    { name: 'Fri', present: 128, absent: 7 },
  ];

  const fleetData = [
    { name: 'Bus 1', trips: 12, km: 240 },
    { name: 'Bus 2', trips: 10, km: 200 },
    { name: 'Bus 3', trips: 8, km: 160 },
    { name: 'Van 1', trips: 6, km: 120 },
  ];

  const routePerformance = [
    { name: 'Route 1', value: 95 },
    { name: 'Route 2', value: 88 },
    { name: 'Route 3', value: 92 },
    { name: 'Route 4', value: 78 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Attendance Trend</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={attendanceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip />
            <Bar dataKey="present" fill="#6366f1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="absent" fill="#f87171" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Fleet Utilization</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={fleetData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip />
            <Line type="monotone" dataKey="trips" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1' }} />
            <Line type="monotone" dataKey="km" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Route Performance</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={routePerformance} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
              {routePerformance.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Weekly Overview</h3>
        <div className="space-y-4">
          {[
            { label: 'On-time Performance', value: 92, color: 'bg-indigo-500' },
            { label: 'Student Attendance', value: 87, color: 'bg-emerald-500' },
            { label: 'Fleet Utilization', value: 78, color: 'bg-amber-500' },
            { label: 'Route Efficiency', value: 85, color: 'bg-purple-500' },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-600">{item.label}</span>
                <span className="text-sm font-bold text-slate-900">{item.value}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full">
                <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
