import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FolderGit2,
  Users2,
  Bug,
  GitBranch,
  Plus,
  Trash2,
  UserPlus,
  ExternalLink,
  Shield,
  ArrowLeft,
  Calendar,
} from 'lucide-react';
import api from '../services/api';
import { RoleBadge, StatusBadge, SeverityBadge, PriorityBadge } from '../components/Badge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function ProjectDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { success, error } = useToast();

  const [project, setProject] = useState(null);
  const [issues, setIssues] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tab: 'issues' | 'members'
  const [activeTab, setActiveTab] = useState('issues');

  // Add Member Modal
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('DEVELOPER');
  const [addingMember, setAddingMember] = useState(false);

  // Delete project dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadProjectDetails = async () => {
    setLoading(true);
    try {
      const [projRes, issuesRes, usersRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get('/issues', { params: { projectId: id } }),
        api.get('/auth/users'),
      ]);

      if (projRes.data.success) setProject(projRes.data.data);
      if (issuesRes.data.success) setIssues(issuesRes.data.data);
      if (usersRes.data.success) setAllUsers(usersRes.data.data);
    } catch (err) {
      error('Failed to load project details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjectDetails();
  }, [id]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setAddingMember(true);
    try {
      const res = await api.post(`/projects/${id}/members`, {
        userId: selectedUserId,
        role: selectedRole,
      });

      if (res.data.success) {
        success('Team member added to project.');
        setAddMemberOpen(false);
        setSelectedUserId('');
        loadProjectDetails();
      }
    } catch (err) {
      error(err.response?.data?.message || 'Failed to add member.');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      const res = await api.delete(`/projects/${id}/members/${userId}`);
      if (res.data.success) {
        success('Member removed from project.');
        loadProjectDetails();
      }
    } catch (err) {
      error(err.response?.data?.message || 'Failed to remove member.');
    }
  };

  const handleDeleteProject = async () => {
    setDeleting(true);
    try {
      const res = await api.delete(`/projects/${id}`);
      if (res.data.success) {
        success('Project deleted successfully.');
        navigate('/projects');
      }
    } catch (err) {
      error(err.response?.data?.message || 'Failed to delete project.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading || !project) {
    return <LoadingSpinner text="Loading project details..." />;
  }

  // Filter out users already in project
  const existingMemberIds = new Set((project.members || []).map((m) => m.userId));
  const availableUsers = allUsers.filter((u) => !existingMemberIds.has(u.id));

  return (
    <div className="space-y-6 animate-fade-in">
      <Link
        to="/projects"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Projects
      </Link>

      {/* Main Project Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="p-3 bg-brand-50 text-brand-600 rounded-2xl">
                <FolderGit2 className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  {project.name}
                </h1>
                <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Created on {new Date(project.createdAt).toLocaleDateString()} &bull; Owner: {project.owner?.name}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed pt-2">
              {project.description || 'No description provided.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/issues/create?projectId=${project.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Report Defect
            </Link>

            {isAdmin && (
              <button
                onClick={() => setDeleteDialogOpen(true)}
                className="p-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl transition"
                title="Delete Project"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* GitHub repository link */}
        {project.githubRepository && (
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-slate-700 truncate">
              <GitBranch className="w-4 h-4 text-slate-400" />
              <span className="font-semibold">Linked Repository:</span>
              <span className="truncate">{project.githubRepository}</span>
            </div>
            <a
              href={project.githubRepository}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-brand-600 hover:underline shrink-0 ml-2"
            >
              GitHub <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-4 border-b border-slate-100 pt-2">
          <button
            onClick={() => setActiveTab('issues')}
            className={`pb-3 text-xs font-bold flex items-center gap-2 transition border-b-2 ${
              activeTab === 'issues'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Bug className="w-4 h-4" />
            Project Issues ({issues.length})
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-3 text-xs font-bold flex items-center gap-2 transition border-b-2 ${
              activeTab === 'members'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users2 className="w-4 h-4" />
            Team Members ({project.members?.length || 0})
          </button>
        </div>

        {/* Tab Content: Issues */}
        {activeTab === 'issues' && (
          <div className="space-y-4">
            {issues.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No issues filed for this project yet.
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
                      <th className="py-3 px-4">Assignee</th>
                      <th className="py-3 px-4 text-right">View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {issues.map((issue) => (
                      <tr key={issue.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono font-bold text-brand-600">
                          {issue.issueKey}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800 max-w-sm truncate">
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
                            Open &rarr;
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Members */}
        {activeTab === 'members' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Assigned Project Members
              </h4>
              {isAdmin && (
                <button
                  onClick={() => setAddMemberOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add Member
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {(project.members || []).map((m) => (
                <div
                  key={m.id}
                  className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-800">{m.user?.name}</p>
                      <RoleBadge role={m.role} />
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{m.user?.email}</p>
                    <p className="text-[11px] text-slate-500 mt-1">Skills: {m.user?.skills || 'General'}</p>
                  </div>

                  {isAdmin && m.userId !== project.ownerId && (
                    <button
                      onClick={() => handleRemoveMember(m.userId)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                      title="Remove from project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      <Modal
        isOpen={addMemberOpen}
        onClose={() => setAddMemberOpen(false)}
        title="Add Team Member to Project"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAddMember} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Select User
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              required
              className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">-- Choose a user --</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role}) - {u.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Project Role
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="DEVELOPER">DEVELOPER</option>
              <option value="TESTER">TESTER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAddMemberOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addingMember || !selectedUserId}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
            >
              {addingMember ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Project Confirm Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteProject}
        title="Delete Project?"
        message={`Are you sure you want to delete "${project.name}"? All associated defects, comments, and activities will be permanently deleted.`}
        confirmText="Delete Project"
        danger={true}
        loading={deleting}
      />
    </div>
  );
}
