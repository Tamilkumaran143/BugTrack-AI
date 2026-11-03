import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bug,
  Calendar,
  Clock,
  User,
  GitPullRequest,
  CheckCircle,
  PlayCircle,
  RotateCcw,
  Sparkles,
  Send,
  ShieldAlert,
  MessageSquare,
  FileCode2,
  CheckCheck,
  ShieldCheck,
  ExternalLink,
  Edit3,
} from 'lucide-react';
import api from '../services/api';
import { SeverityBadge, PriorityBadge, StatusBadge, RoleBadge } from '../components/Badge';
import { VisualLifecycleBar, ActivityTimeline } from '../components/Timeline';
import { RiskAnalysisPanel } from '../components/RiskAnalysisPanel';
import { RegressionChecklist } from '../components/RegressionChecklist';
import { LoadingSpinner, InlineSpinner } from '../components/LoadingSpinner';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function IssueDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, isTester, isDeveloper } = useAuth();
  const { success, error, info } = useToast();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);

  // Comments
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  // Link PR Modal
  const [prModalOpen, setPrModalOpen] = useState(false);
  const [prUrl, setPrUrl] = useState('');
  const [linkingPr, setLinkingPr] = useState(false);

  // Assign Dev Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [recommendedDevs, setRecommendedDevs] = useState([]);
  const [chosenDevId, setChosenDevId] = useState('');
  const [assigningDev, setAssigningDev] = useState(false);

  // Status updating
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadIssue = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/issues/${id}`);
      if (res.data.success) {
        setIssue(res.data.data);
      }
    } catch (err) {
      error('Failed to load issue details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIssue();
  }, [id]);

  // Handle Comment Submission
  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setPostingComment(true);
    try {
      const res = await api.post(`/issues/${issue.id}/comments`, { message: commentText.trim() });
      if (res.data.success) {
        setCommentText('');
        success('Comment posted.');
        loadIssue();
      }
    } catch (err) {
      error(err.response?.data?.message || 'Failed to post comment.');
    } finally {
      setPostingComment(false);
    }
  };

  // Handle Status Transitions
  const handleTransitionStatus = async (targetStatus) => {
    setUpdatingStatus(true);
    try {
      const res = await api.patch(`/issues/${issue.id}/status`, { status: targetStatus });
      if (res.data.success) {
        success(res.data.message);
        loadIssue();
      }
    } catch (err) {
      error(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle Link PR
  const handleLinkPrSubmit = async (e) => {
    e.preventDefault();
    setLinkingPr(true);
    try {
      const res = await api.post('/github/link-pr', {
        issueId: issue.id,
        prUrl: prUrl.trim() || undefined,
        customPrData: !prUrl.trim()
          ? {
              repository: issue.project?.name.toLowerCase().replace(/\s+/g, '-') || 'demo/app',
              prNumber: Math.floor(100 + Math.random() * 900),
              title: `fix(${issue.issueKey}): patch defect and add tests`,
              body: 'Automated patch resolving issue and adding regression guardrails.',
              changedFiles: [
                'server/src/controllers/authController.js',
                'server/src/services/geminiService.js',
                'client/src/pages/IssuesPage.jsx',
              ],
            }
          : undefined,
      });

      if (res.data.success) {
        success('Pull Request linked and AI Code Change Risk Analysis executed!');
        setPrModalOpen(false);
        setPrUrl('');
        loadIssue();
      }
    } catch (err) {
      error(err.response?.data?.message || 'Failed to link pull request.');
    } finally {
      setLinkingPr(false);
    }
  };

  // Handle Developer Assignment
  const openAssignModal = async () => {
    setAssignModalOpen(true);
    try {
      const recRes = await api.post('/ai/recommend-developer', {
        projectId: issue.projectId,
        title: issue.title,
        description: issue.description,
        environment: issue.environment,
      });
      if (recRes.data.success) {
        setRecommendedDevs(recRes.data.data);
        if (recRes.data.data.length > 0) {
          setChosenDevId(recRes.data.data[0].developerId);
        }
      }
    } catch (err) {
      console.warn('Failed to load developer recommendations', err);
    }
  };

  const handleAssignSubmit = async () => {
    if (!chosenDevId) return;
    setAssigningDev(true);
    try {
      const res = await api.patch(`/issues/${issue.id}/assign`, {
        assigneeId: chosenDevId,
      });
      if (res.data.success) {
        success('Developer assigned successfully.');
        setAssignModalOpen(false);
        loadIssue();
      }
    } catch (err) {
      error(err.response?.data?.message || 'Assignment failed.');
    } finally {
      setAssigningDev(false);
    }
  };

  if (loading || !issue) {
    return <LoadingSpinner text="Loading defect intelligence profile..." />;
  }

  // Find linked PR
  const latestPr = issue.pullRequests && issue.pullRequests.length > 0 ? issue.pullRequests[0] : null;
  let parsedRiskNotes = null;
  if (latestPr && latestPr.riskNotes) {
    try {
      parsedRiskNotes = typeof latestPr.riskNotes === 'string' ? JSON.parse(latestPr.riskNotes) : latestPr.riskNotes;
    } catch (e) {
      console.warn('Could not parse risk notes JSON', e);
    }
  }

  const suggestedScenarios = parsedRiskNotes?.suggestedRegressionTests || [];

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      {/* Back and Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/issues"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Issues
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Project:</span>
          <Link
            to={`/projects/${issue.project?.id}`}
            className="text-xs font-bold text-slate-700 hover:text-brand-600 transition"
          >
            {issue.project?.name}
          </Link>
        </div>
      </div>

      {/* Visual Bug Lifecycle Progress Bar */}
      <VisualLifecycleBar
        status={issue.status}
        hasPr={Boolean(latestPr)}
        hasVerification={issue.verifications && issue.verifications.length > 0}
        isClosed={issue.status === 'CLOSED'}
        isReopened={issue.status === 'REOPENED'}
      />

      {/* Main Issue Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 lg:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-xs font-black text-brand-600 bg-brand-50 px-3 py-1 rounded-lg border border-brand-200">
                {issue.issueKey}
              </span>
              <StatusBadge status={issue.status} />
              <SeverityBadge severity={issue.severity} />
              <PriorityBadge priority={issue.priority} />
            </div>

            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-snug">
              {issue.title}
            </h1>

            <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap pt-1">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                Reported by <strong>{issue.reporter?.name}</strong>
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {new Date(issue.createdAt).toLocaleString()}
              </span>
              <span>&bull;</span>
              <span>Env: {issue.environment || 'Web'}</span>
            </div>
          </div>

          {/* Action Transition Buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Developer start work */}
            {(isDeveloper || isAdmin) && issue.status === 'ASSIGNED' && (
              <button
                onClick={() => handleTransitionStatus('IN_PROGRESS')}
                disabled={updatingStatus}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition shadow-sm"
              >
                <PlayCircle className="w-4 h-4" />
                Start Development
              </button>
            )}

            {/* Link PR Button */}
            {(isDeveloper || isAdmin) && ['IN_PROGRESS', 'ASSIGNED', 'REOPENED'].includes(issue.status) && (
              <button
                onClick={() => setPrModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
              >
                <GitPullRequest className="w-4 h-4" />
                Link GitHub PR & Analyze
              </button>
            )}

            {/* Admin Assign Button */}
            {isAdmin && (
              <button
                onClick={openAssignModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                <User className="w-3.5 h-3.5" />
                {issue.assignee ? 'Reassign' : 'Assign Dev'}
              </button>
            )}

            {/* Tester Verify Button (jump to verification) */}
            {(isTester || isAdmin) && issue.status === 'READY_FOR_TESTING' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-100 text-cyan-800 border border-cyan-300">
                <CheckCheck className="w-4 h-4" />
                Ready for QA Verification
              </span>
            )}
          </div>
        </div>

        {/* Assigned Developer Info */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700">
              {issue.assignee ? issue.assignee.name.charAt(0) : '?'}
            </div>
            <div>
              <p className="font-bold text-slate-800">
                Assigned: {issue.assignee ? issue.assignee.name : 'Unassigned'}
              </p>
              <p className="text-slate-400 font-mono text-[11px]">
                {issue.assignee ? issue.assignee.email : 'Awaiting assignment'}
              </p>
            </div>
          </div>

          {issue.assignee?.skills && (
            <div className="hidden sm:flex items-center gap-1">
              <span className="text-slate-400">Skills:</span>
              <span className="text-slate-600 font-medium">{issue.assignee.skills}</span>
            </div>
          )}
        </div>

        {/* Defect Details */}
        <div className="space-y-4 pt-2">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Defect Description & Context
            </h4>
            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
              {issue.description}
            </p>
          </div>

          {issue.stepsToReproduce && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Steps to Reproduce
              </h4>
              <div className="p-4 bg-slate-900 rounded-2xl text-slate-200 font-mono text-xs whitespace-pre-wrap leading-relaxed border border-slate-800">
                {issue.stepsToReproduce}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {issue.expectedResult && (
              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Expected Result
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {issue.expectedResult}
                </p>
              </div>
            )}

            {issue.actualResult && (
              <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 mb-1 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Actual Result / Error
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {issue.actualResult}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Linked GitHub Pull Request & AI Code Change Risk Analysis Panel */}
      {latestPr && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <GitPullRequest className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">
                    PR #{latestPr.prNumber}: {latestPr.title}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[10px] text-slate-600">
                    {latestPr.state}
                  </span>
                </div>
                <p className="text-slate-400 font-mono text-[11px]">{latestPr.repository}</p>
              </div>
            </div>

            <a
              href={latestPr.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-bold text-brand-600 hover:underline"
            >
              View on GitHub <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* AI Risk Analysis Component */}
          {parsedRiskNotes && (
            <RiskAnalysisPanel analysis={parsedRiskNotes} pr={latestPr} />
          )}
        </div>
      )}

      {/* Regression Testing Module */}
      {issue.status === 'READY_FOR_TESTING' && (
        <RegressionChecklist
          issueId={issue.id}
          scenarios={suggestedScenarios}
          onVerificationComplete={() => loadIssue()}
          isTesterOrAdmin={isTester || isAdmin}
        />
      )}

      {/* Past Verifications History */}
      {issue.verifications && issue.verifications.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            Regression Verification History ({issue.verifications.length})
          </h3>

          <div className="space-y-3">
            {issue.verifications.map((v) => (
              <div
                key={v.id}
                className={`p-4 rounded-xl border text-xs space-y-2 ${
                  v.result === 'PASSED'
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-rose-50/50 border-rose-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                        v.result === 'PASSED'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-rose-600 text-white'
                      }`}
                    >
                      {v.result}
                    </span>
                    <span className="font-semibold text-slate-800">
                      Tested by {v.tester?.name}
                    </span>
                  </div>
                  <span className="text-slate-400">
                    {new Date(v.testedAt).toLocaleString()}
                  </span>
                </div>

                {v.testNotes && (
                  <p className="text-slate-700 whitespace-pre-wrap leading-relaxed font-mono text-[11px] bg-white/70 p-3 rounded-lg border border-slate-200/60">
                    {v.testNotes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments and Activity Audit History Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Comments Section */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              Technical Discussion ({issue.comments?.length || 0})
            </h3>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {(!issue.comments || issue.comments.length === 0) ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  No comments posted yet.
                </p>
              ) : (
                issue.comments.map((c) => (
                  <div key={c.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800">{c.user?.name}</span>
                        <RoleBadge role={c.user?.role} />
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-700 leading-relaxed font-sans">{c.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <form onSubmit={handlePostComment} className="pt-3 border-t border-slate-100 flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Post technical update or reproduction notes..."
              className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="submit"
              disabled={postingComment || !commentText.trim()}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              Post
            </button>
          </form>
        </div>

        {/* Audit Trail Activity Timeline */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            Activity History & Audit Trail
          </h3>

          <div className="max-h-96 overflow-y-auto pr-2">
            <ActivityTimeline activities={issue.activities || []} />
          </div>
        </div>
      </div>

      {/* Link PR Modal */}
      <Modal
        isOpen={prModalOpen}
        onClose={() => setPrModalOpen(false)}
        title={`Link Pull Request to ${issue.issueKey}`}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleLinkPrSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              GitHub Pull Request URL
            </label>
            <input
              type="text"
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              placeholder="e.g. https://github.com/facebook/react/pull/28419"
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Leave blank to automatically simulate a sample PR patch with changed code files.
            </p>
          </div>

          <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-indigo-900 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <span>
              The AI engine will inspect all modified files, identify potential regression hazards, and recommend verification test cases.
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
              disabled={linkingPr}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
            >
              {linkingPr ? 'Analyzing with AI...' : 'Link PR & Analyze'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reassign Dev Modal */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title={`Assign Developer to ${issue.issueKey}`}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Select an engineer based on domain skill matching and active workload capacity.
          </p>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {recommendedDevs.map((dev) => (
              <div
                key={dev.developerId}
                onClick={() => setChosenDevId(dev.developerId)}
                className={`p-3 rounded-xl border cursor-pointer transition ${
                  chosenDevId === dev.developerId
                    ? 'bg-brand-50 border-brand-500 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">{dev.name}</span>
                  <span className="text-[11px] font-bold text-brand-600 font-mono">
                    {dev.matchScore}% match
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{dev.rationale}</p>
              </div>
            ))}
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
              disabled={assigningDev || !chosenDevId}
              onClick={handleAssignSubmit}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
            >
              {assigningDev ? 'Assigning...' : 'Confirm'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
