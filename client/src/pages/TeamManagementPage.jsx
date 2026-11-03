import React, { useState, useEffect } from 'react';
import {
  Users2,
  Mail,
  Shield,
  Code2,
  CheckCircle2,
  Search,
  Sparkles,
  Bug,
} from 'lucide-react';
import api from '../services/api';
import { RoleBadge } from '../components/Badge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useToast } from '../context/ToastContext';

export function TeamManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { error } = useToast();

  useEffect(() => {
    async function loadTeam() {
      try {
        const res = await api.get('/auth/users');
        if (res.data.success) {
          setUsers(res.data.data);
        }
      } catch (err) {
        error('Failed to load team roster.');
      } finally {
        setLoading(false);
      }
    }
    loadTeam();
  }, []);

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.skills && u.skills.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return <LoadingSpinner text="Loading engineering directory..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Users2 className="w-7 h-7 text-brand-600" />
          Engineering & QA Team Directory
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Review developer domain specializations, quality assurance leads, and current active defect allocation.
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter team by name, email, or skill keywords (e.g. React, Cypress, Security)..."
          className="flex-1 text-xs bg-transparent focus:outline-none text-slate-800"
        />
        <span className="text-xs font-semibold text-slate-400">
          {filteredUsers.length} member(s)
        </span>
      </div>

      {/* Team Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((member) => (
          <div
            key={member.id}
            className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-slate-800 to-indigo-900 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{member.name}</h3>
                    <p className="text-xs text-slate-400 font-mono">{member.email}</p>
                  </div>
                </div>
                <RoleBadge role={member.role} />
              </div>

              {/* Skills tags */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-brand-500" />
                  Skills & Domains
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(member.skills || 'General')
                    .split(',')
                    .map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 text-[11px] font-medium"
                      >
                        {s.trim()}
                      </span>
                    ))}
                </div>
              </div>
            </div>

            {/* Workload footer */}
            <div className="pt-4 border-t border-slate-100 mt-6 flex items-center justify-between text-xs">
              <span className="text-slate-500">Active Defect Load:</span>
              <span
                className={`font-bold px-2.5 py-0.5 rounded-full text-xs ${
                  member.activeWorkload > 3
                    ? 'bg-rose-100 text-rose-800'
                    : member.activeWorkload > 1
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {member.activeWorkload} active issue(s)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
