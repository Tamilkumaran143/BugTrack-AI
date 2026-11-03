import React, { useState, useEffect } from 'react';
import {
  GitPullRequest,
  GitBranch,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Link as LinkIcon,
  CheckCircle,
  HelpCircle,
  FileCode2,
  Cpu,
} from 'lucide-react';
import api from '../services/api';
import { RiskAnalysisPanel } from '../components/RiskAnalysisPanel';
import { LoadingSpinner, InlineSpinner } from '../components/LoadingSpinner';
import { useToast } from '../context/ToastContext';

export function GitHubIntegrationPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Live PR Inspection Tool state
  const [testPrUrl, setTestPrUrl] = useState('https://github.com/facebook/react/pull/28419');
  const [analyzing, setAnalyzing] = useState(false);
  const [testAnalysis, setTestAnalysis] = useState(null);
  const [testPrData, setTestPrData] = useState(null);

  const { success, error, warning } = useToast();

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.get('/projects');
        if (res.data.success) {
          setProjects(res.data.data);
        }
      } catch (err) {
        error('Failed to load GitHub integrations.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleInspectPr = async (e) => {
    e.preventDefault();
    if (!testPrUrl.trim()) return;

    setAnalyzing(true);
    setTestAnalysis(null);
    setTestPrData(null);

    try {
      // Parse URL
      const match = testPrUrl.match(/(?:github\.com\/|^)([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/pull\/(\d+)/);
      if (!match) {
        error('Invalid GitHub PR URL format. Example: https://github.com/facebook/react/pull/28419');
        setAnalyzing(false);
        return;
      }

      const owner = match[1];
      const repo = match[2];
      const number = match[3];

      // 1. Fetch PR details
      const prRes = await api.get(`/github/pr/${owner}/${repo}/${number}`);
      if (!prRes.data.success) {
        throw new Error('Failed to fetch PR from GitHub.');
      }

      const fetchedPr = prRes.data.data;
      setTestPrData(fetchedPr);

      // 2. Trigger AI Code Change Risk Analysis
      const aiRes = await api.post('/ai/review-change', {
        prData: fetchedPr,
        issueData: {
          issueKey: 'INSPECTION-SAMPLE',
          title: fetchedPr.title,
          description: fetchedPr.body || 'Inspecting standalone pull request for change risks.',
          severity: 'HIGH',
        },
      });

      if (aiRes.data.success) {
        setTestAnalysis(aiRes.data.data);
        success('AI Code Change Risk Analysis completed!');
      }
    } catch (err) {
      error(err.response?.data?.message || err.message || 'Inspection failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading GitHub telemetry & repositories..." />;
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-navy-900 to-indigo-950 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl text-indigo-300">
            <GitPullRequest className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight">GitHub Integration & Code Risk AI</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                REST API & Webhooks
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Connect public GitHub repositories, parse code diffs, evaluate blast radius, and generate regression checklists.
            </p>
          </div>
        </div>
      </div>

      {/* Connected Repositories */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-indigo-600" />
          Active Workspace Repositories ({projects.filter((p) => p.githubRepository).length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects
            .filter((p) => p.githubRepository)
            .map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3"
              >
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{p.name}</h4>
                  <p className="text-xs font-mono text-slate-500 mt-0.5 truncate">{p.githubRepository}</p>
                </div>
                <a
                  href={p.githubRepository}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 text-slate-400 hover:text-brand-600 transition"
                  title="Open GitHub"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            ))}
        </div>
      </div>

      {/* Live PR Risk Inspection Workbench */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 lg:p-8 shadow-sm space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-600" />
            AI Code Change Risk Workbench
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Test and preview AI risk scoring on any public pull request.
          </p>
        </div>

        <form onSubmit={handleInspectPr} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            required
            value={testPrUrl}
            onChange={(e) => setTestPrUrl(e.target.value)}
            placeholder="https://github.com/owner/repo/pull/123"
            className="flex-1 text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
          />
          <button
            type="submit"
            disabled={analyzing}
            className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-2 shrink-0"
          >
            {analyzing ? (
              <>
                <InlineSpinner />
                Analyzing Diff...
              </>
            ) : (
              <>
                <FileCode2 className="w-4 h-4" />
                Inspect & Analyze PR
              </>
            )}
          </button>
        </form>

        {testAnalysis && testPrData && (
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800">PR #{testPrData.prNumber}:</span>{' '}
                {testPrData.title}
                <span className="ml-2 px-2 py-0.5 rounded bg-slate-200 text-[10px] font-mono">
                  {testPrData.isLiveApi ? 'GitHub Live API' : 'Fallback Metadata'}
                </span>
              </div>
              <a
                href={testPrData.url}
                target="_blank"
                rel="noreferrer"
                className="text-brand-600 hover:underline inline-flex items-center gap-1 font-bold"
              >
                GitHub <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <RiskAnalysisPanel analysis={testAnalysis} pr={testPrData} />
          </div>
        )}
      </div>

      {/* Webhook Endpoint Instructions */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white border border-slate-800 space-y-3">
        <h4 className="text-sm font-bold flex items-center gap-2">
          <LinkIcon className="w-4 h-4 text-brand-400" />
          GitHub Webhook Configuration
        </h4>
        <p className="text-xs text-slate-400 leading-relaxed">
          Configure this URL in your GitHub repository's Webhook settings (Payload URL: <code className="text-brand-300 font-mono">http://your-domain/api/webhooks/github</code>, Content type: <code className="text-brand-300 font-mono">application/json</code>). The backend verifies signatures via HMAC-SHA256.
        </p>
      </div>
    </div>
  );
}
