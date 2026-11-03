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
  const [issueLoadError, setIssueLoadError] = useState('');

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

  // AI Fix Assistant
  const [aiAssistantLoading, setAiAssistantLoading] = useState(false);
  const [aiFixAssistant, setAiFixAssistant] = useState(null);
  const [showAiFixReview, setShowAiFixReview] = useState(false);
  const [fixHistory, setFixHistory] = useState([]);
  const [fixHistoryLoading, setFixHistoryLoading] = useState(false);
  const [fixHistoryError, setFixHistoryError] = useState('');
  const [fixOperationLoading, setFixOperationLoading] = useState(false);

  const loadFixHistory = async (issueId) => {
    setFixHistoryLoading(true);
    setFixHistoryError('');
    try {
      const res = await api.get(`/ai/fix-assistant/history/${issueId}`);
      if (res.data.success) {
        setFixHistory(res.data.data);
      }
    } catch (err) {
      setFixHistoryError(err.response?.data?.message || 'Unable to load applied patch history.');
    } finally {
      setFixHistoryLoading(false);
    }
  };

  const loadIssue = async () => {
    setLoading(true);
    setIssueLoadError('');
    try {
      const res = await api.get(`/issues/${id}`);
      if (res.data.success) {
        setIssue(res.data.data);
        await loadFixHistory(res.data.data.id);
      } else {
        setIssueLoadError('The issue could not be loaded.');
      }
    } catch (err) {
      setIssueLoadError(err.response?.data?.message || 'Failed to load issue details.');
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
        prUrl: prUrl.trim(),
      });

      if (res.data.success) {
        success(res.data.message || 'Verified pull request linked and analyzed.');
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

  const handleAnalyzeFixAssistant = async () => {
    if (!issue) return;
    setAiAssistantLoading(true);
    try {
      const res = await api.post('/ai/fix-assistant/analyze', {
        issueId: issue.id,
        issueData: issue,
        projectId: issue.projectId,
      });

      if (res.data.success) {
        setAiFixAssistant(res.data.data);
        setShowAiFixReview(Boolean(res.data.data.fix?.available));
        success('AI Fix Assistant analyzed the issue.');
      }
    } catch (err) {
      error(err.response?.data?.message || 'AI Fix Assistant analysis failed.');
    } finally {
      setAiAssistantLoading(false);
    }
  };

  const handleFixAssistantAction = async (action) => {
    if (!aiFixAssistant) return;

    if (action === 'review') {
      setShowAiFixReview((prev) => !prev);
      return;
    }

    if (action === 'reject') {
      setAiFixAssistant(null);
      setShowAiFixReview(false);
      info('Fix suggestion rejected.');
      return;
    }

    if (action === 'regenerate') {
      await handleAnalyzeFixAssistant();
      return;
    }

    if (action === 'apply') {
      const proposal = aiFixAssistant.fix;
      if (!proposal?.available || !proposal.proposalId || !showAiFixReview) {
        info('Review a valid source patch before applying it.');
        setShowAiFixReview(true);
        return;
      }
      if (!window.confirm(`Apply the reviewed patch to ${proposal.filePath}?`)) return;

      setFixOperationLoading(true);
      try {
        const res = await api.post('/ai/fix-assistant/apply', {
          proposalId: proposal.proposalId,
          issueId: issue.id,
          approved: true,
        });
        if (res.data.success) {
          success(res.data.message);
          await loadFixHistory(issue.id);
        }
      } catch (err) {
        error(err.response?.data?.message || 'Unable to apply the approved patch.');
      } finally {
        setFixOperationLoading(false);
      }
      return;
    }
  };

  const handleRollbackFix = async (operationId, appliedFiles = []) => {
    if (!window.confirm(`Roll back the applied patch to ${appliedFiles.join(', ')}?`)) return;

    setFixOperationLoading(true);
    try {
      const res = await api.post('/ai/fix-assistant/rollback', {
        operationId,
        issueId: issue.id,
      });
      if (res.data.success) {
        success(res.data.message);
        await loadFixHistory(issue.id);
      }
    } catch (err) {
      error(err.response?.data?.message || 'Unable to roll back the applied patch.');
    } finally {
      setFixOperationLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading defect intelligence profile..." />;
  }
  if (issueLoadError || !issue) {
    return (
      <div className="max-w-xl mx-auto rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Issue unavailable</h2>
        <p className="mt-2 text-sm text-rose-700">{issueLoadError || 'The requested issue could not be found.'}</p>
        <div className="mt-5 flex justify-center gap-3">
          <button type="button" onClick={loadIssue} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white">
            Retry
          </button>
          <button type="button" onClick={() => navigate(-1)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700">
            Go back
          </button>
        </div>
      </div>
    );
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

            {(isDeveloper || isAdmin) && (
              <button
                onClick={handleAnalyzeFixAssistant}
                disabled={aiAssistantLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
              >
                <Sparkles className="w-4 h-4" />
                {aiAssistantLoading ? 'Analyzing...' : 'AI Fix Assistant'}
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

      {aiFixAssistant && (
        <div className="bg-white rounded-3xl border border-violet-200/80 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-violet-100 text-violet-600">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">AI Fix Assistant</h3>
                <p className="text-[11px] text-slate-500">
                  Source status: {aiFixAssistant.sourceStatus || 'static_analysis'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleFixAssistantAction('review')}
                className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Review Changes
              </button>
              <button
                type="button"
                onClick={() => handleFixAssistantAction('apply')}
                disabled={!aiFixAssistant.fix?.available || fixOperationLoading}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 text-white text-xs font-bold rounded-xl transition"
              >
                {fixOperationLoading ? 'Applying...' : 'Approve & Apply Patch'}
              </button>
              <button
                type="button"
                onClick={() => handleFixAssistantAction('reject')}
                className="px-3 py-2 border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold rounded-xl transition"
              >
                Reject Fix
              </button>
              <button
                type="button"
                onClick={() => handleFixAssistantAction('regenerate')}
                className="px-3 py-2 border border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs font-bold rounded-xl transition"
              >
                Regenerate Suggestion
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Confirmed information</p>
              <ul className="space-y-2 text-xs text-slate-700">
                {(aiFixAssistant.confirmedInformation || []).map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">AI-generated assumptions</p>
              <ul className="space-y-2 text-xs text-slate-700">
                {(aiFixAssistant.assumptions || []).map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-3 rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-violet-700">Possible root cause</p>
              <p className="text-sm text-slate-700 leading-relaxed">{aiFixAssistant.possibleRootCause}</p>
            </div>

            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Recommended solution</p>
              <p className="text-sm text-slate-700 leading-relaxed">{aiFixAssistant.recommendedSolution}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Affected modules</p>
              <ul className="space-y-2 text-xs text-slate-700">
                {(aiFixAssistant.affectedModules || []).map((item, index) => (
                  <li key={index} className="font-mono bg-white border border-slate-200 rounded-lg px-2.5 py-2">{item}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Relevant files</p>
              <ul className="space-y-2 text-xs text-slate-700">
                {(aiFixAssistant.relevantFiles || []).map((item, index) => (
                  <li key={index} className="font-mono bg-white border border-slate-200 rounded-lg px-2.5 py-2">{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Potential side effects</p>
              <ul className="space-y-2 text-xs text-amber-900">
                {(aiFixAssistant.potentialSideEffects || []).map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3 rounded-2xl border border-cyan-200 bg-cyan-50/60 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-800">Suggested validation steps</p>
              <ul className="space-y-2 text-xs text-cyan-900">
                {(aiFixAssistant.suggestedValidationSteps || []).map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-500 mt-1.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {showAiFixReview && aiFixAssistant.fix && (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h4 className="text-sm font-bold text-slate-900">Fix review</h4>
                <span className="px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold uppercase tracking-wider">
                  {aiFixAssistant.fix.status || 'suggested'}
                </span>
              </div>

              {aiFixAssistant.fix.available ? (
                <>
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">File path</p>
                    <p className="font-mono text-xs text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-2">{aiFixAssistant.fix.filePath}</p>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Original code</p>
                      <pre className="text-[11px] whitespace-pre-wrap bg-slate-900 text-slate-100 rounded-xl p-3 overflow-auto max-h-72 border border-slate-800">
                        {aiFixAssistant.fix.originalCode || 'No source snippet available.'}
                      </pre>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Suggested modified code</p>
                      <pre className="text-[11px] whitespace-pre-wrap bg-violet-950 text-violet-100 rounded-xl p-3 overflow-auto max-h-72 border border-violet-800">
                        {aiFixAssistant.fix.suggestedCode || 'No suggested patch available.'}
                      </pre>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-slate-700">
                    <p><span className="font-bold">Explanation:</span> {aiFixAssistant.fix.explanation}</p>
                    <p><span className="font-bold">Why the change may resolve the issue:</span> {aiFixAssistant.fix.whyItMayResolveTheIssue}</p>
                    <p><span className="font-bold">Possible risks:</span> {aiFixAssistant.fix.possibleRisks?.join(' ')}</p>
                  </div>
                  <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  Review both code snippets before approving. Applying the patch requires a separate confirmation and fails if the source has changed.
                  </p>
                </>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  {aiFixAssistant.fix?.missingInformation || 'No relevant source code is available for a concrete patch proposal.'}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {(isDeveloper || isAdmin) && (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Applied patch history</h3>
              <p className="mt-1 text-xs text-slate-500">Lists source files that were actually modified, not backup files.</p>
            </div>
            <button
              type="button"
              onClick={() => loadFixHistory(issue.id)}
              disabled={fixHistoryLoading}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"
            >
              {fixHistoryLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          {fixHistoryError && <p role="alert" className="text-sm text-rose-700">{fixHistoryError}</p>}
          {!fixHistoryLoading && !fixHistoryError && fixHistory.length === 0 && (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No source patches have been applied to this issue.</p>
          )}
          {fixHistory.map((operation) => (
            <div key={operation.operationId} className="space-y-3 rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                  operation.status === 'applied' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {operation.status}
                </span>
                <time className="text-xs text-slate-500">{new Date(operation.appliedAt).toLocaleString()}</time>
              </div>
              <ul className="space-y-2">
                {(operation.appliedFiles || []).map((filePath) => (
                  <li key={filePath} className="rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">{filePath}</li>
                ))}
              </ul>
              {operation.status === 'applied' && (isAdmin || operation.appliedBy === user?.id) && (
                <button
                  type="button"
                  onClick={() => handleRollbackFix(operation.operationId, operation.appliedFiles)}
                  disabled={fixOperationLoading}
                  className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 disabled:opacity-50"
                >
                  Roll back patch
                </button>
              )}
            </div>
          ))}
        </section>
      )}

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
              disabled={linkingPr || !prUrl.trim()}
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
