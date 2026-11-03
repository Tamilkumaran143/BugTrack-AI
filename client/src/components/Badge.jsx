import React from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle,
  Clock,
  UserCheck,
  PlayCircle,
  CheckCheck,
  RotateCcw,
  Shield,
  Code2,
  Bug,
} from 'lucide-react';

export function SeverityBadge({ severity }) {
  const sev = (severity || 'MEDIUM').toUpperCase();

  const configs = {
    CRITICAL: {
      bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
      icon: AlertOctagon,
      label: 'Critical',
    },
    HIGH: {
      bg: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800',
      icon: AlertTriangle,
      label: 'High',
    },
    MEDIUM: {
      bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
      icon: Info,
      label: 'Medium',
    },
    LOW: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
      icon: CheckCircle,
      label: 'Low',
    },
  };

  const c = configs[sev] || configs.MEDIUM;
  const Icon = c.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.bg}`}>
      <Icon className="w-3.5 h-3.5" />
      {c.label}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const pri = (priority || 'MEDIUM').toUpperCase();

  const configs = {
    CRITICAL: 'bg-red-100 text-red-800 border-red-300',
    HIGH: 'bg-amber-100 text-amber-800 border-amber-300',
    MEDIUM: 'bg-blue-100 text-blue-800 border-blue-300',
    LOW: 'bg-slate-100 text-slate-700 border-slate-300',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${configs[pri] || configs.MEDIUM}`}>
      {pri}
    </span>
  );
}

export function StatusBadge({ status }) {
  const st = (status || 'OPEN').toUpperCase();

  const configs = {
    OPEN: {
      bg: 'bg-sky-50 text-sky-700 border-sky-200',
      icon: Clock,
      label: 'Open',
    },
    ASSIGNED: {
      bg: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: UserCheck,
      label: 'Assigned',
    },
    IN_PROGRESS: {
      bg: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: PlayCircle,
      label: 'In Progress',
    },
    READY_FOR_TESTING: {
      bg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      icon: CheckCheck,
      label: 'Ready For Test',
    },
    REOPENED: {
      bg: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: RotateCcw,
      label: 'Reopened',
    },
    CLOSED: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: CheckCircle,
      label: 'Closed',
    },
  };

  const c = configs[st] || configs.OPEN;
  const Icon = c.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.bg}`}>
      <Icon className="w-3.5 h-3.5" />
      {c.label}
    </span>
  );
}

export function RoleBadge({ role }) {
  const r = (role || 'DEVELOPER').toUpperCase();

  const configs = {
    ADMIN: { bg: 'bg-indigo-600 text-white', icon: Shield, label: 'Admin' },
    TESTER: { bg: 'bg-emerald-600 text-white', icon: Bug, label: 'QA Tester' },
    DEVELOPER: { bg: 'bg-blue-600 text-white', icon: Code2, label: 'Developer' },
  };

  const c = configs[r] || configs.DEVELOPER;
  const Icon = c.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-sm ${c.bg}`}>
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}
