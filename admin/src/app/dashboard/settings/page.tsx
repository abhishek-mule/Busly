'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { FormField } from '@/components/ui/FormField';
import { Settings, Building2, Bell, Users, CreditCard, Save, Plus, Edit, Trash2, X, CheckCircle, AlertCircle, Shield, Mail, Phone, MapPin, Upload } from 'lucide-react';

interface CompanyProfile {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  logo: string;
}

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  last_active: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('company');
  const [profile, setProfile] = useState<CompanyProfile>({
    name: 'Busly Transport Services',
    email: 'admin@busly.com',
    phone: '+1 (555) 123-4567',
    address: '123 Main Street, Suite 100',
    city: 'San Francisco',
    state: 'California',
    pincode: '94102',
    logo: '',
  });
  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    { id: 'email_alerts', label: 'Email Alerts', description: 'Receive email notifications for important events', enabled: true },
    { id: 'sms_alerts', label: 'SMS Alerts', description: 'Get SMS notifications for urgent alerts', enabled: true },
    { id: 'push_notifications', label: 'Push Notifications', description: 'Browser push notifications for real-time updates', enabled: false },
    { id: 'attendance_alerts', label: 'Attendance Alerts', description: 'Notify when students are absent or late', enabled: true },
    { id: 'route_alerts', label: 'Route Alerts', description: 'Alerts for route delays and deviations', enabled: true },
    { id: 'maintenance_alerts', label: 'Maintenance Alerts', description: 'Vehicle maintenance reminders and alerts', enabled: false },
    { id: 'fee_reminders', label: 'Fee Reminders', description: 'Automatic fee payment reminders to parents', enabled: true },
    { id: 'weekly_reports', label: 'Weekly Reports', description: 'Receive weekly summary reports via email', enabled: false },
  ]);
  const [users, setUsers] = useState<User[]>([
    { id: 1, name: 'John Admin', email: 'admin@busly.com', role: 'Super Admin', status: 'active', last_active: '2 min ago' },
    { id: 2, name: 'Sarah Manager', email: 'sarah@busly.com', role: 'Manager', status: 'active', last_active: '15 min ago' },
    { id: 3, name: 'Mike Operator', email: 'mike@busly.com', role: 'Operator', status: 'active', last_active: '1 hour ago' },
    { id: 4, name: 'Emily Viewer', email: 'emily@busly.com', role: 'Viewer', status: 'inactive', last_active: '3 days ago' },
  ]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'Viewer', status: 'active' });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProfile(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const toggleNotification = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, enabled: !n.enabled } : n));
  };

  const handleSaveProfile = async () => {
    setSubmitting(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      showToast('Company profile updated successfully', 'success');
    } catch {
      showToast('Failed to update profile', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSubmitting(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      showToast('Notification settings saved', 'success');
    } catch {
      showToast('Failed to save settings', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openAddUser = () => {
    setEditingUser(null);
    setUserForm({ name: '', email: '', role: 'Viewer', status: 'active' });
    setShowUserModal(true);
  };

  const openEditUser = (user: User) => {
    setEditingUser(user);
    setUserForm({ name: user.name, email: user.email, role: user.role, status: user.status });
    setShowUserModal(true);
  };

  const handleUserSubmit = async () => {
    setSubmitting(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      if (editingUser) {
        setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...userForm } : u));
        showToast('User updated successfully', 'success');
      } else {
        setUsers(prev => [...prev, { id: Date.now(), ...userForm, last_active: 'Just now' }]);
        showToast('User added successfully', 'success');
      }
      setShowUserModal(false);
    } catch {
      showToast('Failed to save user', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = (userId: number) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    showToast('User removed successfully', 'success');
  };

  const tabs = [
    { id: 'company', label: 'Company Profile', icon: Building2 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'subscription', label: 'Subscription', icon: CreditCard },
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
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 mt-1">Manage your organization settings and preferences</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'company' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Company Profile</h3>
          <div className="flex items-center gap-6 mb-8">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Building2 size={40} className="text-white" />
            </div>
            <div>
              <button className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors font-medium text-sm">
                <Upload size={16} />
                Upload Logo
              </button>
              <p className="text-xs text-slate-400 mt-2">PNG, JPG up to 2MB. Recommended 200x200px.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Company Name" name="name" value={profile.name} onChange={handleProfileChange} required />
            <FormField label="Email" name="email" type="email" value={profile.email} onChange={handleProfileChange} required />
            <FormField label="Phone" name="phone" value={profile.phone} onChange={handleProfileChange} required />
            <FormField label="Address" name="address" value={profile.address} onChange={handleProfileChange} />
            <FormField label="City" name="city" value={profile.city} onChange={handleProfileChange} />
            <FormField label="State" name="state" value={profile.state} onChange={handleProfileChange} />
            <FormField label="Pincode" name="pincode" value={profile.pincode} onChange={handleProfileChange} />
          </div>
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={handleSaveProfile}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-60"
            >
              <Save size={18} />
              Save Changes
            </button>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Notification Preferences</h3>
          <div className="space-y-4">
            {notifications.map((setting) => (
              <div key={setting.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${setting.enabled ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                    <Bell size={18} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{setting.label}</p>
                    <p className="text-sm text-slate-500">{setting.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleNotification(setting.id)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${setting.enabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${setting.enabled ? 'left-6' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={handleSaveNotifications}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-60"
            >
              <Save size={18} />
              Save Preferences
            </button>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Team Members</h3>
            <button
              onClick={openAddUser}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <Plus size={16} />
              Add User
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Active</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{user.name}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">{user.role}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                        user.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${user.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{user.last_active}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEditUser(user)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => handleDeleteUser(user.id)} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'subscription' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-8 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-indigo-200 text-sm font-medium">Current Plan</p>
                <h3 className="text-3xl font-bold mt-1">Professional</h3>
                <p className="text-indigo-200 mt-2">Up to 50 vehicles, 1000 students, unlimited routes</p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold">$99</p>
                <p className="text-indigo-200 text-sm">/month</p>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-white/20">
              <div className="flex items-center justify-between">
                <span className="text-indigo-200">Next billing date</span>
                <span className="font-semibold">Oct 1, 2026</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: 'Starter', price: '$29', features: ['10 vehicles', '200 students', '5 routes', 'Email support'], current: false },
              { name: 'Professional', price: '$99', features: ['50 vehicles', '1000 students', 'Unlimited routes', 'Priority support', 'AI Assistant'], current: true },
              { name: 'Enterprise', price: 'Custom', features: ['Unlimited vehicles', 'Unlimited students', 'Custom routes', 'Dedicated support', 'API access'], current: false },
            ].map((plan) => (
              <div key={plan.name} className={`bg-white rounded-2xl border p-6 shadow-sm ${plan.current ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-slate-900">{plan.name}</h4>
                  {plan.current && <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-lg">Current</span>}
                </div>
                <p className="text-3xl font-bold text-slate-900">{plan.price}<span className="text-sm font-normal text-slate-500">{plan.price !== 'Custom' ? '/mo' : ''}</span></p>
                <ul className="mt-4 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle size={16} className="text-emerald-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button className={`w-full mt-6 py-2.5 rounded-xl font-medium transition-colors ${
                  plan.current
                    ? 'bg-slate-100 text-slate-500 cursor-default'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`} disabled={plan.current}>
                  {plan.current ? 'Current Plan' : 'Upgrade'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal isOpen={showUserModal} onClose={() => setShowUserModal(false)} title={editingUser ? 'Edit User' : 'Add User'} size="md">
        <div className="space-y-4">
          <FormField label="Full Name" name="name" value={userForm.name} onChange={(e: any) => setUserForm(prev => ({ ...prev, name: e.target.value }))} required />
          <FormField label="Email" name="email" type="email" value={userForm.email} onChange={(e: any) => setUserForm(prev => ({ ...prev, email: e.target.value }))} required />
          <FormField label="Role" name="role" type="select" value={userForm.role} onChange={(e: any) => setUserForm(prev => ({ ...prev, role: e.target.value }))} options={[
            { value: 'Super Admin', label: 'Super Admin' },
            { value: 'Manager', label: 'Manager' },
            { value: 'Operator', label: 'Operator' },
            { value: 'Viewer', label: 'Viewer' },
          ]} />
          <FormField label="Status" name="status" type="select" value={userForm.status} onChange={(e: any) => setUserForm(prev => ({ ...prev, status: e.target.value }))} options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]} />
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button onClick={() => setShowUserModal(false)} className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-colors">Cancel</button>
            <button onClick={handleUserSubmit} disabled={submitting} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-60">
              {submitting && <Settings size={18} className="animate-spin" />}
              {editingUser ? 'Update User' : 'Add User'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
