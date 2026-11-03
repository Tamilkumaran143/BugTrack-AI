import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Code2,
  Bug,
  GitPullRequest,
  PlayCircle,
  CheckCheck,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import api from '../services/api';
import { StatCard } from '../components/StatCard';
import { SeverityBadge, PriorityBadge, StatusBadge } from '../components/Badge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function DeveloperDashboardPage() {
  const { user } = useAuth();
  const [assignedIssues, setAssignedIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const { success, error } = useToast();

  // Quick PR Modal state
  const [prModalOpen, setPrModalOpen] = useState(false);
  const [activeIssue, setActiveIssue] = useState(null);
  const [prUrl, setPrUrl] = useState('');
  const [linking, setLinking] = useState(false);

  const loadDevData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/issues', { params: { assignedToMe: 'true' } });
      if (res.data.success) {
        setAssignedIssues(res.data.data);
      }
    } catch (err) {
      error('Failed to load developer issues.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevData();
  }, []);

  const handleStartWork = async (issueId) => {
    try {
      const res = await api.patch(`/issues/${issueId}/status`, { status: 'IN_PROGRESS' });
      if (res.data.success) {
        success('Status updated to In Progress.');
        loadDevData();
      }
    } catch (err) {
      error(err.response?.data?.message || 'Status transition failed.');
    }
  };

  const openPrModal = (issue) => {
    setActiveIssue(issue);
    setPrUrl('');
    setPrModalOpen(true);
  };

  const handleLinkPrSubmit = async (e) => {
    e.preventDefault();
    if (!activeIssue) return;
    setLinking(true);
    try {
      const res = await api.post('/github/link-pr', {
        issueId: activeIssue.id,
        prUrl: prUrl.trim(),
      });

      if (res.data.success) {
        success(res.data.message || 'Verified pull request linked and analyzed.');
        setPrModalOpen(false);
        loadDevData();
      }
    } catch (err) {
      error(err.response?.data?.message || 'Failed to link PR.');
    } finally {
      setLinking(false);
    }
  };

  const activeCount = assignedIssues.filter((i) =>
    ['ASSIGNED', 'IN_PROGRESS', 'REOPENED'].includes(i.status)
  ).length;
  const inProgressCount = assignedIssues.filter((i) => i.status === 'IN_PROGRESS').length;
  const readyTestCount = assignedIssues.filter((i) => i.status === 'READY_FOR_TESTING').length;
  const closedCount = assignedIssues.filter((i) => i.status === 'CLOSED').length;

  if (loading && assignedIssues.length === 0) {
    return <LoadingSpinner text="Loading Developer Workspace..." />;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-navy-900 to-indigo-950 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-sky-500/20 border border-sky-400/30 rounded-2xl text-sky-300">
            <Code2 className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight">Developer Workspace</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/30 text-sky-200 border border-sky-400/30">
                Code & PR Command
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Track defects assigned to your queue, link GitHub Pull Requests for automated AI Code Change Risk Analysis, and hand off verified fixes to QA.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/github"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition border border-slate-700 flex items-center gap-1.5"
          >
            <GitPullRequest className="w-4 h-4 text-brand-400" />
            GitHub Hub
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Active Assigned"
          value={activeCount}
          icon={Bug}
          color="brand"
        />
        <StatCard
          title="In Progress"
          value={inProgressCount}
          icon={PlayCircle}
          color="amber"
        />
        <StatCard
          title="In QA Testing"
          value={readyTestCount}
          icon={CheckCheck}
          color="cyan"
        />
        <StatCard
          title="Resolved Fixes"
          value={closedCount}
          icon={CheckCheck}
          color="emerald"
        />
      </div>

      {/* Assigned Issues Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Code2 className="w-5 h-5 text-indigo-600" />
              My Assigned Defects Queue ({assignedIssues.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Directly assigned defects requiring code remediation and regression safety analysis.
            </p>
          </div>
        </div>

        {assignedIssues.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-sm">
            <CheckCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">Zero active issues assigned to you!</p>
            <p className="text-xs text-slate-400 mt-0.5">Check the unassigned queue or explore open projects.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase">
                  <th className="py-3 px-4">Key</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Defect Title</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignedIssues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-brand-600">
                      <Link to={`/issues/${issue.id}`} className="hover:underline">
                        {issue.issueKey}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {issue.project?.name}
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
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {issue.status === 'ASSIGNED' && (
                          <button
                            onClick={() => handleStartWork(issue.id)}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-xs transition"
                          >
                            Start Work
                          </button>
                        )}

                        {['IN_PROGRESS', 'ASSIGNED', 'REOPENED'].includes(issue.status) && (
                          <button
                            onClick={() => openPrModal(issue)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-sm transition"
                          >
                            <GitPullRequest className="w-3.5 h-3.5" />
                            Link PR
                          </button>
                        )}

                        <Link
                          to={`/issues/${issue.id}`}
                          className="px-2.5 py-1 border border-violet-200 hover:bg-violet-50 text-violet-700 rounded-lg font-bold text-xs transition"
                        >
                          AI Fix
                        </Link>

                        <Link
                          to={`/issues/${issue.id}`}
                          className="px-2.5 py-1 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-bold text-xs transition"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Link PR Modal */}
      <Modal
        isOpen={prModalOpen}
        onClose={() => setPrModalOpen(false)}
        title={`Link GitHub Pull Request: ${activeIssue?.issueKey}`}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleLinkPrSubmit} className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <span className="font-bold text-slate-700">Target Defect:</span> {activeIssue?.title}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              GitHub Pull Request URL
            </label>
            <input
              type="url"
              required
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              placeholder="e.g. https://github.com/facebook/react/pull/28419"
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              A live GitHub API lookup is required; pull request details are never simulated.
            </p>
          </div>

          <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-indigo-900 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <span>
              Linking a PR triggers the <strong>AI Code Change Risk Analysis</strong> engine to inspect touched files, highlight blast radius, suggest regression test scenarios, and move this defect to <strong>READY_FOR_TESTING</strong>.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setPrModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={linking || !prUrl.trim()}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
            >
              {linking ? 'Analyzing PR with AI...' : 'Link PR & Run AI Risk'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
