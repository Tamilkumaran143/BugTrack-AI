import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  FolderGit2,
  Users2,
  Bug,
  UserCheck,
  AlertOctagon,
  ArrowRight,
  Sparkles,
  CheckCircle,
  Clock,
  Layers,
} from 'lucide-react';
import api from '../services/api';
import { StatCard } from '../components/StatCard';
import { SeverityBadge, PriorityBadge, StatusBadge } from '../components/Badge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Modal } from '../components/Modal';
import { useToast } from '../context/ToastContext';

export function AdminDashboardPage() {
  const [unassignedIssues, setUnassignedIssues] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Assign modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [recommendedDevs, setRecommendedDevs] = useState([]);
  const [loadingAiRecs, setLoadingAiRecs] = useState(false);
  const [chosenDevId, setChosenDevId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const { success, error } = useToast();

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [sumRes, issuesRes, usersRes, projRes] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/issues', { params: { status: 'OPEN' } }),
        api.get('/auth/users'),
        api.get('/projects'),
      ]);

      if (sumRes.data.success) setSummary(sumRes.data.data);
      if (issuesRes.data.success) {
        // filter unassigned
        setUnassignedIssues(issuesRes.data.data.filter((i) => !i.assigneeId));
      }
      if (usersRes.data.success) {
        setDevelopers(usersRes.data.data.filter((u) => u.role === 'DEVELOPER'));
      }
      if (projRes.data.success) setProjects(projRes.data.data);
    } catch (err) {
      error('Failed to load admin overview data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const openAssignModal = async (issue) => {
    setSelectedIssue(issue);
    setChosenDevId('');
    setAssignModalOpen(true);
    setLoadingAiRecs(true);

    try {
      const recRes = await api.post('/ai/recommend-developer', {
        projectId: issue.projectId,
        title: issue.title,
        description: issue.description,
        environment: issue.environment,
      });

      if (recRes.data.success && recRes.data.data.length > 0) {
        setRecommendedDevs(recRes.data.data);
        setChosenDevId(recRes.data.data[0].developerId); // Pre-select highest ranked
      }
    } catch (err) {
      console.warn('Failed to load developer recommendations', err);
    } finally {
      setLoadingAiRecs(false);
    }
  };

  const handleAssignSubmit = async () => {
    if (!chosenDevId || !selectedIssue) return;
    setAssigning(true);
    try {
      const res = await api.patch(`/issues/${selectedIssue.id}/assign`, {
        assigneeId: chosenDevId,
      });

      if (res.data.success) {
        success(`Issue ${selectedIssue.issueKey} assigned successfully.`);
        setAssignModalOpen(false);
        loadAdminData();
      }
    } catch (err) {
      error(err.response?.data?.message || 'Assignment failed.');
    } finally {
      setAssigning(false);
    }
  };

  if (loading && !summary) {
    return <LoadingSpinner text="Loading Administrator Control Hub..." />;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-navy-900 to-indigo-950 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl text-indigo-300">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight">Admin Operations Center</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                Full Authority
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Oversee cross-repository health, allocate developer capacity, review unassigned defects, and manage workspace membership.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/projects"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-sm"
          >
            Create / Manage Projects
          </Link>
          <Link
            to="/team"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition border border-slate-700"
          >
            Manage Team
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Active Projects"
          value={projects.length}
          icon={FolderGit2}
          color="brand"
        />
        <StatCard
          title="Unassigned Bugs"
          value={unassignedIssues.length}
          icon={AlertOctagon}
          color={unassignedIssues.length > 0 ? 'rose' : 'emerald'}
          subtext="Requires developer allocation"
        />
        <StatCard
          title="Engineers"
          value={developers.length}
          icon={Users2}
          color="blue"
        />
        <StatCard
          title="Ready For Verification"
          value={summary?.readyForTestingIssues ?? 0}
          icon={CheckCircle}
          color="cyan"
          subtext="Pending QA sign-off"
        />
      </div>

      {/* Unassigned Issues Allocation Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-600" />
              Unassigned Issues Queue ({unassignedIssues.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Incoming defect reports that need developer assignment based on workload and skills.
            </p>
          </div>
        </div>

        {unassignedIssues.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-sm">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">All defects have been allocated!</p>
            <p className="text-xs text-slate-400 mt-0.5">There are no unassigned bugs in the open queue.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase">
                  <th className="py-3 px-4">Key</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Defect Title</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4 text-right">Smart Assignment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {unassignedIssues.map((issue) => (
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
                      <SeverityBadge severity={issue.severity} />
                    </td>
                    <td className="py-3 px-4">
                      <PriorityBadge priority={issue.priority} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openAssignModal(issue)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold text-xs shadow-sm transition"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Smart Assign
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Developer Capacity Overview */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-600" />
          Developer Active Workload & Skills Matrix
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {developers.map((dev) => (
            <div
              key={dev.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">{dev.name}</h4>
                  <p className="text-xs text-slate-400 font-mono">{dev.email}</p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    dev.activeWorkload > 3
                      ? 'bg-rose-100 text-rose-800'
                      : dev.activeWorkload > 1
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {dev.activeWorkload} active
                </span>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Skills
                </p>
                <div className="flex items-center gap-1 flex-wrap">
                  {(dev.skills || 'General')
                    .split(',')
                    .map((s, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200 text-[10px] font-medium"
                      >
                        {s.trim()}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Smart Assignment Modal */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title={`Assign Developer: ${selectedIssue?.issueKey}`}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
            <span className="font-bold text-slate-700">Issue:</span> {selectedIssue?.title}
            <div className="flex items-center gap-2 pt-1">
              <SeverityBadge severity={selectedIssue?.severity} />
              <PriorityBadge priority={selectedIssue?.priority} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-brand-600" />
                AI Workload & Skills Recommendations
              </label>
              {loadingAiRecs && <span className="text-xs text-slate-400 font-medium">Analyzing capacity...</span>}
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {recommendedDevs.map((rec) => (
                <div
                  key={rec.developerId}
                  onClick={() => setChosenDevId(rec.developerId)}
                  className={`p-3 rounded-xl border cursor-pointer transition ${
                    chosenDevId === rec.developerId
                      ? 'bg-brand-50 border-brand-500 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-800">{rec.name}</span>
                    <span className="text-xs font-bold text-brand-600 font-mono">
                      {rec.matchScore}% match
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-snug">{rec.rationale}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAssignModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={assigning || !chosenDevId}
              onClick={handleAssignSubmit}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
            >
              {assigning ? 'Assigning...' : 'Confirm Assignment'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
