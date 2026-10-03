'use client';

import { useState, useEffect } from 'react';
import { authAPI } from '@/lib/api';
import { FormField } from '@/components/ui/FormField';
import { User, Lock, Save, X, CheckCircle, AlertCircle, Loader2, Shield } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState({ full_name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '' });
  const [savingPw, setSavingPw] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  useEffect(() => {
    authAPI.me()
      .then(({ data }) => setProfile({ full_name: data.full_name || '', email: data.email || '', phone: data.phone || '' }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await authAPI.update(profile);
      showToast('Profile updated successfully', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.detail?.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pwForm.old_password || !pwForm.new_password) {
      showToast('Fill in both password fields', 'error');
      return;
    }
    setSavingPw(true);
    try {
      await authAPI.changePassword(pwForm);
      showToast('Password changed successfully', 'success');
      setPwForm({ old_password: '', new_password: '' });
    } catch (err: any) {
      showToast(err?.response?.data?.detail?.message || 'Failed to change password', 'error');
    } finally {
      setSavingPw(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
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
          <p className="text-slate-500 mt-1">Manage your account</p>
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

      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-2xl">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">My Profile</h3>
          {loading ? (
            <p className="text-sm text-slate-400">Loading profile...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Full Name" name="full_name" value={profile.full_name} onChange={(e: any) => setProfile(p => ({ ...p, full_name: e.target.value }))} required />
              <FormField label="Email" name="email" type="email" value={profile.email} onChange={(e: any) => setProfile(p => ({ ...p, email: e.target.value }))} required />
              <FormField label="Phone" name="phone" value={profile.phone} onChange={(e: any) => setProfile(p => ({ ...p, phone: e.target.value }))} />
            </div>
          )}
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={handleSaveProfile}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-60"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Save Changes
            </button>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Shield size={20} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Change Password</h3>
              <p className="text-sm text-slate-500">Update your account password</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <FormField label="Current Password" name="old_password" type="password" value={pwForm.old_password} onChange={(e: any) => setPwForm(p => ({ ...p, old_password: e.target.value }))} required />
            <FormField label="New Password" name="new_password" type="password" value={pwForm.new_password} onChange={(e: any) => setPwForm(p => ({ ...p, new_password: e.target.value }))} required />
          </div>
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={handleChangePassword}
              disabled={savingPw}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-60"
            >
              {savingPw ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
              Change Password
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
