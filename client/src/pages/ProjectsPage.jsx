import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderGit2,
  Plus,
  Bug,
  Users2,
  GitBranch,
  ExternalLink,
  Search,
  Calendar,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import api from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    githubRepository: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const { isAdmin } = useAuth();
  const { success, error } = useToast();

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await api.get('/projects');
      if (res.data.success) {
        setProjects(res.data.data);
      }
    } catch (err) {
      error('Failed to load projects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!formData.name) return;
    setSubmitting(true);
    try {
      const res = await api.post('/projects', formData);
      if (res.data.success) {
        success('Project created successfully.');
        setCreateModalOpen(false);
        setFormData({ name: '', description: '', githubRepository: '' });
        loadProjects();
      }
    } catch (err) {
      error(err.response?.data?.message || 'Failed to create project.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FolderGit2 className="w-7 h-7 text-brand-600" />
            Project Workspaces
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage tracked codebases, defect intake, and repository integrations.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition shadow-sm shadow-brand-600/30 shrink-0"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex items-center justify-between gap-4 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search projects by name or description..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <span className="text-xs font-semibold text-slate-400">
          Showing {filteredProjects.length} of {projects.length}
        </span>
      </div>

      {/* Projects List */}
      {loading ? (
        <LoadingSpinner text="Fetching projects..." />
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          icon={FolderGit2}
          title="No projects found"
          description="Create a project to start tracking defects and connecting GitHub pull requests."
          actionLabel={isAdmin ? 'Create Project' : undefined}
          onAction={isAdmin ? () => setCreateModalOpen(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md hover:border-brand-200 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-600">
                    <Link to={`/projects/${project.id}`} className="hover:text-brand-600 transition">
                      {project.name}
                    </Link>
                  </h3>
                  <span className="p-2 rounded-xl bg-brand-50 text-brand-600">
                    <FolderGit2 className="w-5 h-5" />
                  </span>
                </div>

                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {project.description || 'No description provided.'}
                </p>

                {project.githubRepository && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono bg-slate-50 p-2 rounded-xl border border-slate-200 truncate">
                    <GitBranch className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{project.githubRepository}</span>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-slate-100 mt-6 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                    <Bug className="w-3.5 h-3.5 text-brand-500" />
                    {project._count?.issues ?? 0} bugs
                  </span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <Users2 className="w-3.5 h-3.5 text-slate-400" />
                    {project._count?.members ?? 0} members
                  </span>
                </div>

                <Link
                  to={`/projects/${project.id}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700"
                >
                  Manage <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Project"
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Project Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. NextGen Mobile Checkout"
              className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Outline project scope, core architecture, or target components..."
              className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              GitHub Repository URL (Optional)
            </label>
            <input
              type="text"
              value={formData.githubRepository}
              onChange={(e) => setFormData({ ...formData, githubRepository: e.target.value })}
              placeholder="e.g. https://github.com/facebook/react"
              className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
            >
              {submitting ? 'Creating Project...' : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
