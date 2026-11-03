import React from 'react';
import {
  CheckCircle2,
  Clock,
  UserCheck,
  Code2,
  GitPullRequest,
  Sparkles,
  CheckCheck,
  RotateCcw,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';

export function VisualLifecycleBar({ status, hasPr, hasVerification, isClosed, isReopened }) {
  const steps = [
    { key: 'CREATED', label: 'Issue Created', done: true },
    { key: 'ASSIGNED', label: 'Assigned', done: ['ASSIGNED', 'IN_PROGRESS', 'READY_FOR_TESTING', 'CLOSED', 'REOPENED'].includes(status) },
    { key: 'IN_PROGRESS', label: 'In Progress', done: ['IN_PROGRESS', 'READY_FOR_TESTING', 'CLOSED', 'REOPENED'].includes(status) },
    { key: 'PR_LINKED', label: 'PR Linked & AI Analyzed', done: Boolean(hasPr) },
    { key: 'READY_FOR_TESTING', label: 'Ready for Test', done: ['READY_FOR_TESTING', 'CLOSED', 'REOPENED'].includes(status) },
    { key: 'VERIFICATION', label: isReopened ? 'QA Reopened' : 'QA Verified', done: Boolean(hasVerification) || isClosed || isReopened, failed: isReopened },
    { key: 'CLOSED', label: isReopened ? 'Reopened' : 'Resolved', done: isClosed || isReopened, failed: isReopened },
  ];

  return (
    <div className="w-full bg-slate-900 rounded-2xl p-6 text-white shadow-lg border border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-400" />
          Bug Lifecycle Progression
        </h4>
        <span className="text-xs text-slate-400 font-mono">Current Status: <strong className="text-brand-300">{status}</strong></span>
      </div>

      <div className="relative flex items-center justify-between gap-2 overflow-x-auto pb-2">
        {/* Connecting line */}
        <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-800 -z-0" />

        {steps.map((step, idx) => (
          <div key={step.key} className="relative z-10 flex flex-col items-center flex-1 min-w-[90px] text-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 border-2 ${
                step.failed
                  ? 'bg-rose-950 text-rose-300 border-rose-500 shadow-md shadow-rose-900/50'
                  : step.done
                  ? 'bg-brand-600 text-white border-brand-400 shadow-md shadow-brand-900/50'
                  : 'bg-slate-800 text-slate-500 border-slate-700'
              }`}
            >
              {step.failed ? (
                <RotateCcw className="w-4 h-4 text-rose-400" />
              ) : step.done ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                idx + 1
              )}
            </div>
            <span
              className={`text-[11px] mt-2 font-medium tracking-tight whitespace-nowrap ${
                step.failed
                  ? 'text-rose-400 font-semibold'
                  : step.done
                  ? 'text-slate-200 font-semibold'
                  : 'text-slate-500'
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ActivityTimeline({ activities = [] }) {
  if (activities.length === 0) {
    return (
      <div className="p-6 text-center text-slate-400 text-sm">
        No activity recorded yet.
      </div>
    );
  }

  const getActionIcon = (action) => {
    switch (action) {
      case 'CREATED':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'STATUS_CHANGE':
        return <CheckCircle2 className="w-4 h-4 text-amber-500" />;
      case 'ASSIGNED':
        return <UserCheck className="w-4 h-4 text-purple-500" />;
      case 'PR_LINKED':
        return <GitPullRequest className="w-4 h-4 text-emerald-500" />;
      case 'VERIFIED':
        return <ShieldCheck className="w-4 h-4 text-cyan-500" />;
      case 'COMMENTED':
        return <MessageSquare className="w-4 h-4 text-indigo-500" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {activities.map((activity, idx) => (
          <li key={activity.id || idx}>
            <div className="relative pb-8">
              {idx !== activities.length - 1 && (
                <span
                  className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200"
                  aria-hidden="true"
                />
              )}
              <div className="relative flex space-x-3 items-start">
                <div>
                  <span className="h-8 w-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center ring-4 ring-white">
                    {getActionIcon(activity.action)}
                  </span>
                </div>
                <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                  <div>
                    <p className="text-sm text-slate-700">
                      <strong className="text-slate-900 font-semibold">
                        {activity.user ? activity.user.name : 'System'}
                      </strong>{' '}
                      <span className="text-slate-500">{activity.action.toLowerCase().replace('_', ' ')}</span>
                      {activity.newValue && (
                        <span className="font-medium text-slate-800 ml-1">
                          &rarr; {activity.newValue}
                        </span>
                      )}
                    </p>
                    {activity.oldValue && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        Previous state: {activity.oldValue}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-xs whitespace-nowrap text-slate-400">
                    {new Date(activity.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
