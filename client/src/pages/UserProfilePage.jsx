import React, { useState } from 'react';
import {
  User,
  Mail,
  Shield,
  Key,
  Save,
  Wrench,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RoleBadge } from '../components/Badge';
import { useToast } from '../context/ToastContext';
import { InlineSpinner } from '../components/LoadingSpinner';

export function UserProfilePage() {
  const { user, updateProfile } = useAuth();
  const { success, error } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [skills, setSkills] = useState(user?.skills || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        name,
        skills,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });

      setCurrentPassword('');
      setNewPassword('');
      success('Profile updated successfully.');
    } catch (err) {
      error(err.response?.data?.message || err.message || 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <User className="w-7 h-7 text-brand-600" />
          User Profile & Credentials
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your personal profile information, domain skills, and security credentials.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm space-y-6">
        {/* User Card Header */}
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white font-black text-xl flex items-center justify-center shadow-md">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{user?.name}</h2>
              <RoleBadge role={user?.role} />
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{user?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Email Address (Read-only)
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full text-sm p-3 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-brand-600" />
              Technical Skills & Expertise (Comma-separated)
            </label>
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="e.g. React, Node.js, TypeScript, PostgreSQL, Security, Cypress"
              className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 font-sans"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              The AI developer assignment algorithm compares incoming issue titles and descriptions against these tags.
            </p>
          </div>

          {/* Password update section */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-slate-400" />
              Change Password (Optional)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">New Password</label>
                <input
                  type="password"
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 8 characters)"
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
            >
              {saving ? (
                <>
                  <InlineSpinner />
                  Saving Profile...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
