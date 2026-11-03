import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckSquare,
  Bug,
  PlusCircle,
  Clock,
  CheckCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import api from '../services/api';
import { StatCard } from '../components/StatCard';
import { SeverityBadge, PriorityBadge, StatusBadge } from '../components/Badge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useToast } from '../context/ToastContext';

export function TesterDashboardPage() {
  const [readyForTestIssues, setReadyForTestIssues] = useState([]);
  const [myReportedIssues, setMyReportedIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const { error } = useToast();

  const loadTesterData = async () => {
    setLoading(true);
    try {
      const [readyRes, myRes] = await Promise.all([
        api.get('/issues', { params: { status: 'READY_FOR_TESTING' } }),
        api.get('/issues', { params: { reportedByMe: 'true' } }),
      ]);

      if (readyRes.data.success) setReadyForTestIssues(readyRes.data.data);
      if (myRes.data.success) setMyReportedIssues(myRes.data.data);
    } catch (err) {
      error('Failed to load QA testing dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTesterData();
  }, []);

  if (loading && readyForTestIssues.length === 0 && myReportedIssues.length === 0) {
    return <LoadingSpinner text="Loading QA Verification Queue..." />;
  }

  const passedCount = myReportedIssues.filter((i) => i.status === 'CLOSED').length;
  const reopenedCount = myReportedIssues.filter((i) => i.status === 'REOPENED').length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-navy-900 to-indigo-950 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl text-emerald-300">
            <CheckSquare className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight">QA Testing & Verification Command</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                Tester Hub
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Execute regression testing protocols, verify developer code fixes, review AI test scenario suggestions, and approve defect closures.
            </p>
          </div>
        </div>

        <Link
          to="/issues/create"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-600/30 shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          Report Bug (AI Assistant)
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Verification Queue"
          value={readyForTestIssues.length}
          icon={CheckSquare}
          color={readyForTestIssues.length > 0 ? 'purple' : 'emerald'}
          subtext="Awaiting regression testing"
        />
        <StatCard
          title="Reported by Me"
          value={myReportedIssues.length}
          icon={Bug}
          color="brand"
        />
        <StatCard
          title="Verified & Closed"
          value={passedCount}
          icon={CheckCircle}
          color="emerald"
        />
        <StatCard
          title="Reopened Failures"
          value={reopenedCount}
          icon={RotateCcw}
          color={reopenedCount > 0 ? 'rose' : 'slate'}
        />
      </div>

      {/* Verification Queue (READY_FOR_TESTING) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              Ready For Testing Queue ({readyForTestIssues.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Developers have resolved these defects and submitted code changes for QA regression verification.
            </p>
          </div>
        </div>

        {readyForTestIssues.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-sm">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">Verification queue is clear!</p>
            <p className="text-xs text-slate-400 mt-0.5">No defects currently waiting for QA verification.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase">
                  <th className="py-3 px-4">Key</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Defect Title</th>
                  <th className="py-3 px-4">Developer</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {readyForTestIssues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-brand-600">
                      {issue.issueKey}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {issue.project?.name}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 max-w-sm truncate">
                      {issue.title}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {issue.assignee ? issue.assignee.name : 'Unassigned'}
                    </td>
                    <td className="py-3 px-4">
                      <SeverityBadge severity={issue.severity} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/issues/${issue.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-sm transition"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Verify Fix &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bugs Reported by Me Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Bug className="w-5 h-5 text-indigo-600" />
          My Reported Bugs ({myReportedIssues.length})
        </h3>

        {myReportedIssues.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-sm">
            <p className="font-semibold text-slate-700">No bugs reported yet.</p>
            <p className="text-xs text-slate-400 mt-1">
              Use the AI Bug Report Generator to file structured issues with reproduction steps.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase">
                  <th className="py-3 px-4">Key</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Assigned Dev</th>
                  <th className="py-3 px-4 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myReportedIssues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-brand-600">
                      {issue.issueKey}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 max-w-xs truncate">
                      {issue.title}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={issue.status} />
                    </td>
                    <td className="py-3 px-4">
                      <SeverityBadge severity={issue.severity} />
                    </td>
                    <td className="py-3 px-4">
                      <PriorityBadge priority={issue.priority} />
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {issue.assignee ? issue.assignee.name : 'Unassigned'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/issues/${issue.id}`}
                        className="text-brand-600 hover:text-brand-700 font-bold"
                      >
                        Details &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
