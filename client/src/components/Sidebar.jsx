import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderGit2,
  Bug,
  PlusCircle,
  GitPullRequest,
  Users2,
  Settings,
  Shield,
  Code2,
  CheckSquare,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RoleBadge } from './Badge';

export function Sidebar({ isOpen, onClose }) {
  const { user, isAdmin, isTester, isDeveloper } = useAuth();

  const navLinks = [
    { to: '/dashboard', label: 'Main Dashboard', icon: LayoutDashboard },
    ...(isAdmin ? [{ to: '/admin', label: 'Admin Command', icon: Shield, badge: 'Admin' }] : []),
    ...(isTester || isAdmin ? [{ to: '/tester', label: 'QA Verification', icon: CheckSquare, badge: 'QA' }] : []),
    ...(isDeveloper || isAdmin ? [{ to: '/developer', label: 'Developer Hub', icon: Code2, badge: 'Dev' }] : []),
    { to: '/projects', label: 'Projects', icon: FolderGit2 },
    { to: '/issues', label: 'Issue Tracker', icon: Bug },
    { to: '/issues/create', label: 'Report Bug (AI)', icon: PlusCircle, highlight: true },
    { to: '/github', label: 'GitHub & Risk AI', icon: GitPullRequest },
    { to: '/team', label: 'Team Members', icon: Users2 },
    { to: '/settings', label: 'System & AI Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 text-white flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800/80 bg-slate-950/50">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <Bug className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-white">BugTrack</span>
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                AI
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Risk & Defect Intelligence</p>
          </div>
        </div>

        {/* Current user mini card */}
        <div className="px-4 py-3 mx-4 my-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-slate-400">Signed in as</span>
            <RoleBadge role={user?.role} />
          </div>
          <p className="text-sm font-bold text-slate-200 truncate">{user?.name}</p>
          <p className="text-xs text-slate-400 truncate font-mono">{user?.email}</p>
        </div>

        {/* Navigation list */}
        <div className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => onClose && onClose()}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30 font-semibold'
                      : item.highlight
                      ? 'bg-brand-500/10 text-brand-300 hover:bg-brand-500/20 border border-brand-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {item.badge}
                  </span>
                )}
                {item.highlight && (
                  <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 text-xs text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-slate-400">AI Fallback Engine</span>
          </div>
          <span className="font-mono text-[10px] text-slate-600">v1.0.0</span>
        </div>
      </aside>
    </>
  );
}
