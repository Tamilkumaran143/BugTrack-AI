import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderGit2,
  Bug,
  Clock,
  AlertOctagon,
  PlayCircle,
  CheckCheck,
  CheckCircle,
  RotateCcw,
  Sparkles,
  Filter,
  RefreshCw,
  Plus,
  ArrowUpRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import api from '../services/api';
import { StatCard } from '../components/StatCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export function DashboardPage() {
  const { isAdmin, isTester } = useAuth();
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [loading, setLoading] = useState(true);
  const { error } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const projRes = await api.get('/projects');
      if (projRes.data.success) {
        setProjects(projRes.data.data);
      }

      const params = selectedProject ? { projectId: selectedProject } : {};

      const [sumRes, anaRes] = await Promise.all([
        api.get('/dashboard/summary', { params }),
        api.get('/dashboard/analytics', { params }),
      ]);

      if (sumRes.data.success) setSummary(sumRes.data.data);
      if (anaRes.data.success) setAnalytics(anaRes.data.data);
    } catch (err) {
      error('Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedProject]);

  if (loading && !summary) {
    return <LoadingSpinner text="Computing real-time defect telemetry & analytics..." />;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header with Project Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            System Defect & Quality Intelligence
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              Live DB
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time analytics across all repositories, bug lifecycles, and risk profiles.
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-3 md:w-auto">
          <div className="relative min-w-0 flex-1 md:flex-none">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full max-w-full pl-3 pr-8 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl shadow-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 md:w-auto"
            >
              <option value="">All Projects Combined</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={loadData}
            title="Refresh statistics"
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {(isAdmin || isTester) && <Link
            to="/issues/create"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-brand-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            Report Bug
          </Link>}
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <StatCard
          title="Projects"
          value={summary?.totalProjects ?? 0}
          icon={FolderGit2}
          color="brand"
        />
        <StatCard
          title="Total Bugs"
          value={summary?.totalIssues ?? 0}
          icon={Bug}
          color="blue"
        />
        <StatCard
          title="Open"
          value={summary?.openIssues ?? 0}
          icon={Clock}
          color="cyan"
        />
        <StatCard
          title="Critical"
          value={summary?.criticalIssues ?? 0}
          icon={AlertOctagon}
          color="rose"
        />
        <StatCard
          title="In Progress"
          value={summary?.inProgressIssues ?? 0}
          icon={PlayCircle}
          color="amber"
        />
        <StatCard
          title="Ready Test"
          value={summary?.readyForTestingIssues ?? 0}
          icon={CheckCheck}
          color="purple"
        />
        <StatCard
          title="Closed"
          value={summary?.closedIssues ?? 0}
          icon={CheckCircle}
          color="emerald"
        />
        <StatCard
          title="Reopened"
          value={summary?.reopenedIssues ?? 0}
          icon={RotateCcw}
          color="rose"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Issues by Status */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-800">Issues by Lifecycle Status</h3>
            <p className="text-xs text-slate-400">Current active distribution across state machine</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics?.byStatus || []}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                >
                  {(analytics?.byStatus || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value} issues`, name]}
                  contentStyle={{ borderRadius: '12px', fontSize: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Issues by Severity */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-800">Defects by Severity</h3>
            <p className="text-xs text-slate-400">Classification from Critical crashes down to Low</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.bySeverity || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val) => [`${val} issues`, 'Count']}
                  contentStyle={{ borderRadius: '12px', fontSize: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {(analytics?.bySeverity || []).map((entry, index) => (
                    <Cell key={`sev-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Issues by Priority */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-800">Issues by Priority</h3>
            <p className="text-xs text-slate-400">Assigned scheduling urgency for development</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.byPriority || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val) => [`${val} issues`, 'Count']}
                  contentStyle={{ borderRadius: '12px', fontSize: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {(analytics?.byPriority || []).map((entry, index) => (
                    <Cell key={`pri-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Developer Workload & Issue Creation Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Developer Workload */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Developer Workload & Capacity</h3>
              <p className="text-xs text-slate-400">Active vs resolved issues per developer</p>
            </div>
            <Link to="/team" className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1">
              View Team <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.developerWorkload || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value, name) => [`${value} issues`, name === 'active' ? 'Active Workload' : 'Resolved']}
                  contentStyle={{ borderRadius: '12px', fontSize: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="active" name="Active Open" fill="#6366f1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="closed" name="Resolved / Closed" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Creation Trend */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Issue Creation Velocity</h3>
              <p className="text-xs text-slate-400">Past 14 days defect intake rate</p>
            </div>
            <span className="text-xs font-mono text-slate-400">Trailing 14 days</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics?.creationTrend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val) => [`${val} new issues`, 'Reported']}
                  contentStyle={{ borderRadius: '12px', fontSize: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#4f46e5' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
