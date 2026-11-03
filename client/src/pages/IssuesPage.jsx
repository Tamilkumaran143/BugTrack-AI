import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Bug,
  Plus,
  Search,
  Filter,
  RefreshCw,
  FolderGit2,
  User,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import api from '../services/api';
import { SeverityBadge, PriorityBadge, StatusBadge } from '../components/Badge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { useToast } from '../context/ToastContext';

export function IssuesPage() {
  const [searchParams] = useSearchParams();
  const [issues, setIssues] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState(searchParams.get('projectId') || '');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || '');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');

  const { error } = useToast();

  const loadIssues = async () => {
    setLoading(true);
    try {
      const [projRes, issRes] = await Promise.all([
        api.get('/projects'),
        api.get('/issues', {
          params: {
            projectId: selectedProject || undefined,
            status: selectedStatus || undefined,
            severity: selectedSeverity || undefined,
            priority: selectedPriority || undefined,
            search: search.trim() || undefined,
          },
        }),
      ]);

      if (projRes.data.success) setProjects(projRes.data.data);
      if (issRes.data.success) setIssues(issRes.data.data);
    } catch (err) {
      error('Failed to load issues list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIssues();
  }, [selectedProject, selectedStatus, selectedSeverity, selectedPriority]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadIssues();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Bug className="w-7 h-7 text-brand-600" />
            Issue Tracker & Lifecycle Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Complete registry of software defects, triage priorities, developer assignments, and verification states.
          </p>
        </div>

        <Link
          to="/issues/create"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition shadow-sm shadow-brand-600/30 shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          Report Bug (AI)
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search box */}
          <form onSubmit={handleSearchSubmit} className="relative sm:col-span-2 lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by key, title, or description..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </form>

          {/* Project dropdown */}
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="text-xs p-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium text-slate-700"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Status dropdown */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs p-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="READY_FOR_TESTING">READY_FOR_TESTING</option>
            <option value="REOPENED">REOPENED</option>
            <option value="CLOSED">CLOSED</option>
          </select>

          {/* Severity dropdown */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="text-xs p-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium text-slate-700"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
        </div>
      </div>

      {/* Issues Table */}
      {loading ? (
        <LoadingSpinner text="Fetching defect tracker records..." />
      ) : issues.length === 0 ? (
        <EmptyState
          icon={Bug}
          title="No issues match criteria"
          description="Try relaxing your filter parameters or file a new bug report using the AI Assistant."
          actionLabel="Report Bug"
          onAction={() => (window.location.href = '/issues/create')}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Key</th>
                  <th className="py-3.5 px-4">Project</th>
                  <th className="py-3.5 px-4">Title</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Severity</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Assignee</th>
                  <th className="py-3.5 px-4">Activity</th>
                  <th className="py-3.5 px-4 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {issues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-brand-600">
                      <Link to={`/issues/${issue.id}`} className="hover:underline">
                        {issue.issueKey}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-600 truncate max-w-[120px]">
                      {issue.project?.name}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 max-w-xs truncate">
                      <Link to={`/issues/${issue.id}`} className="hover:text-brand-600 transition">
                        {issue.title}
                      </Link>
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
                    <td className="py-3 px-4 text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{issue.assignee ? issue.assignee.name : 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {issue._count?.comments ?? 0}
                      </span>
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
        </div>
      )}
    </div>
  );
}
