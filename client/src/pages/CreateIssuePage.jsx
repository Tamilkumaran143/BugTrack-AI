import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  Bug,
  AlertTriangle,
  CopyCheck,
  Cpu,
  ArrowRight,
  Shield,
  Layers,
  CheckCircle,
  HelpCircle,
  FolderGit2,
} from 'lucide-react';
import api from '../services/api';
import { DuplicateList } from '../components/DuplicateList';
import { SeverityBadge, PriorityBadge } from '../components/Badge';
import { InlineSpinner } from '../components/LoadingSpinner';
import { useToast } from '../context/ToastContext';

export function CreateIssuePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { success, error, warning } = useToast();

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(searchParams.get('projectId') || '');

  // AI Generator state
  const [rawInput, setRawInput] = useState('');
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiEngineUsed, setAiEngineUsed] = useState(null);
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  // Duplicate detection state
  const [duplicates, setDuplicates] = useState([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  // Form Fields (editable by tester)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    stepsToReproduce: '',
    expectedResult: '',
    actualResult: '',
    environment: 'Chrome 122 / Windows 11 / Staging',
    severity: 'MEDIUM',
    priority: 'MEDIUM',
    assigneeId: '',
  });

  // Smart Recommendations
  const [priorityRationale, setPriorityRationale] = useState('');
  const [recommendedDevelopers, setRecommendedDevelopers] = useState([]);
  const [loadingDevRecs, setLoadingDevRecs] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await api.get('/projects');
        if (res.data.success && res.data.data.length > 0) {
          setProjects(res.data.data);
          if (!selectedProjectId) {
            setSelectedProjectId(res.data.data[0].id);
          }
        }
      } catch (err) {
        error('Failed to load project workspaces.');
      }
    }
    loadProjects();
  }, []);

  // Live duplicate detection debounce
  useEffect(() => {
    if (!selectedProjectId || (!formData.title && !formData.description)) {
      setDuplicates([]);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingDuplicates(true);
      try {
        const res = await api.post('/ai/find-duplicates', {
          projectId: selectedProjectId,
          title: formData.title,
          description: formData.description,
        });

        if (res.data.success) {
          setDuplicates(res.data.data);
        }
      } catch (err) {
        console.warn('Duplicate check warning:', err);
      } finally {
        setCheckingDuplicates(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [formData.title, formData.description, selectedProjectId]);

  // Load recommended developers when project or title changes
  useEffect(() => {
    if (!selectedProjectId) return;

    const fetchDevs = async () => {
      setLoadingDevRecs(true);
      try {
        const res = await api.post('/ai/recommend-developer', {
          projectId: selectedProjectId,
          title: formData.title,
          description: formData.description,
          environment: formData.environment,
        });
        if (res.data.success) {
          setRecommendedDevelopers(res.data.data);
        }
      } catch (err) {
        console.warn('Developer recommendation warning:', err);
      } finally {
        setLoadingDevRecs(false);
      }
    };

    fetchDevs();
  }, [selectedProjectId, formData.title]);

  // Trigger AI Bug Report Generator
  const handleGenerateReport = async () => {
    if (!rawInput.trim()) {
      warning('Please enter a brief defect description in the prompt box above.');
      return;
    }

    setGeneratingAi(true);
    try {
      const res = await api.post('/ai/structure-report', { rawDescription: rawInput });
      if (res.data.success) {
        const d = res.data.data;
        setFormData((prev) => ({
          ...prev,
          title: d.title || prev.title,
          description: d.summary || rawInput,
          stepsToReproduce: d.stepsToReproduce || prev.stepsToReproduce,
          expectedResult: d.expectedResult || prev.expectedResult,
          actualResult: d.actualResult || prev.actualResult,
          environment: d.environment || prev.environment,
          severity: d.severity || prev.severity,
          priority: d.priority || prev.priority,
        }));

        setPriorityRationale(d.reasoning || '');
        setAiEngineUsed(d.engine || (d.isFallback ? 'Local Fallback Engine' : 'Google Gemini'));
        setIsFallbackMode(Boolean(d.isFallback));

        success('AI generated structured bug report! Review and edit fields before submitting.');
      }
    } catch (err) {
      error('Failed to generate AI bug report.');
    } finally {
      setGeneratingAi(false);
    }
  };

  // Submit Final Report
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProjectId) {
      warning('Please select a project.');
      return;
    }
    if (!formData.title || !formData.description) {
      warning('Defect title and description are required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/issues', {
        projectId: selectedProjectId,
        ...formData,
        assigneeId: formData.assigneeId || null,
      });

      if (res.data.success) {
        success(`Bug ${res.data.data.issueKey} filed successfully!`);
        navigate(`/issues/${res.data.data.id}`);
      }
    } catch (err) {
      error(err.response?.data?.message || 'Failed to create issue.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <Bug className="w-7 h-7 text-brand-600" />
          AI-Powered Bug Report Generator
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Transform unstructured defect observations into comprehensive, reproduceable engineering bug reports.
        </p>
      </div>

      {/* AI Generator Prompt Section */}
      <div className="bg-gradient-to-r from-slate-900 via-navy-900 to-indigo-950 rounded-3xl p-6 lg:p-8 text-white shadow-xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand-500/20 border border-brand-400/30 rounded-2xl text-brand-300">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold">Raw Defect Observation</h3>
              <p className="text-xs text-slate-300">
                Enter what went wrong in plain English. The AI will structure title, reproduction steps, expected/actual results, and severity.
              </p>
            </div>
          </div>

          {aiEngineUsed && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 shrink-0">
              <Cpu className="w-3.5 h-3.5" />
              Engine: {aiEngineUsed} {isFallbackMode && '(Deterministic Fallback Active)'}
            </span>
          )}
        </div>

        <div>
          <textarea
            rows={3}
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="e.g. After updating my profile picture, clicking the save button makes the profile page blank with an uncaught runtime error..."
            className="w-full text-sm p-4 bg-slate-950/70 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 font-sans"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Target Project:
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            disabled={generatingAi}
            onClick={handleGenerateReport}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-600/30 transition-all shrink-0"
          >
            {generatingAi ? (
              <>
                <InlineSpinner />
                Structuring Report...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Structured Report with AI
              </>
            )}
          </button>
        </div>
      </div>

      {/* Live Duplicate Detection Display */}
      {checkingDuplicates && (
        <div className="text-xs text-slate-400 flex items-center gap-2 p-2">
          <InlineSpinner className="w-3.5 h-3.5 text-brand-500" />
          Scanning project registry for duplicate defects...
        </div>
      )}
      <DuplicateList duplicates={duplicates} />

      {/* Structured Editable Bug Report Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200/80 p-6 lg:p-8 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-lg font-bold text-slate-900">Review & Approve Bug Report</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            QA testers retain complete editorial authority. Review and fine-tune fields before filing.
          </p>
        </div>

        {/* Bug Title */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
            Bug Title *
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Concise imperative bug summary"
            className="w-full text-sm font-semibold p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Executive Summary */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
            Bug Summary & Description *
          </label>
          <textarea
            rows={3}
            required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Detailed description of defect behavior and impact"
            className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 font-sans"
          />
        </div>

        {/* Steps to Reproduce */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
            Steps to Reproduce
          </label>
          <textarea
            rows={4}
            value={formData.stepsToReproduce}
            onChange={(e) => setFormData({ ...formData, stepsToReproduce: e.target.value })}
            placeholder="1. Step one&#10;2. Step two&#10;3. Triggering action"
            className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono text-xs"
          />
        </div>

        {/* Expected and Actual Results */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Expected Result
            </label>
            <textarea
              rows={3}
              value={formData.expectedResult}
              onChange={(e) => setFormData({ ...formData, expectedResult: e.target.value })}
              placeholder="What the system should have done"
              className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Actual Result
            </label>
            <textarea
              rows={3}
              value={formData.actualResult}
              onChange={(e) => setFormData({ ...formData, actualResult: e.target.value })}
              placeholder="What actually occurred / error message"
              className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Severity, Priority, Environment */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Severity
            </label>
            <select
              value={formData.severity}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Environment / Device
            </label>
            <input
              type="text"
              value={formData.environment}
              onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
              placeholder="e.g. Chrome 122 / Windows / Staging"
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {priorityRationale && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
            <span>
              <strong>AI Priority Assessment Rationale:</strong> {priorityRationale}
            </span>
          </div>
        )}

        {/* Smart Developer Assignment Recommendations */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-brand-600" />
              Recommended Developer Assignment
            </h4>
            <span className="text-[11px] text-slate-500">Based on skills matching & active open workload</span>
          </div>

          {loadingDevRecs ? (
            <p className="text-xs text-slate-400">Analyzing developer capacity...</p>
          ) : recommendedDevelopers.length === 0 ? (
            <p className="text-xs text-slate-400">No project developers found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {recommendedDevelopers.map((dev) => (
                <div
                  key={dev.developerId}
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      assigneeId: prev.assigneeId === dev.developerId ? '' : dev.developerId,
                    }))
                  }
                  className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                    formData.assigneeId === dev.developerId
                      ? 'bg-brand-50 border-brand-500 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800">{dev.name}</span>
                    <span className="text-[11px] font-mono font-bold text-brand-600">
                      {dev.matchScore}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-tight">
                    {dev.rationale}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Action */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => navigate('/issues')}
            className="px-5 py-2.5 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition"
          >
            Discard
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-600/30 transition"
          >
            {submitting ? (
              <>
                <InlineSpinner />
                Submitting Defect...
              </>
            ) : (
              <>
                <span>Approve & Submit Bug Report</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
