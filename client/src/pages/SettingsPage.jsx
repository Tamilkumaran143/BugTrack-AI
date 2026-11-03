import React, { useState, useEffect } from 'react';
import {
  Settings,
  Sparkles,
  Cpu,
  Database,
  GitBranch,
  ShieldCheck,
  CheckCircle,
  Copy,
  Info,
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

export function SettingsPage() {
  const [health, setHealth] = useState(null);
  const [healthError, setHealthError] = useState('');
  const { success, error } = useToast();

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await api.get('/health');
        setHealth(res.data);
      } catch (e) {
        setHealthError(e.response?.data?.message || 'Live system diagnostics are unavailable.');
      }
    }
    checkHealth();
  }, []);

  const copyToClipboard = async (text) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable in this browser context.');
      await navigator.clipboard.writeText(text);
      success('Copied to clipboard.');
    } catch (err) {
      error(err.message || 'Unable to copy to clipboard.');
    }
  };

  const systemHealthy = health?.status === 'healthy' && health?.database === 'connected';

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-7 h-7 text-brand-600" />
          System Architecture & Engine Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Review live diagnostics, AI engine operational states, GitHub REST endpoints, and database telemetry.
        </p>
      </div>

      {/* AI Engine Status Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand-50 text-brand-600 rounded-2xl">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">AI Intelligence Core</h3>
              <p className="text-xs text-slate-500">
                Hybrid AI architecture combining Google Gemini API with Local Deterministic Fallback.
              </p>
            </div>
          </div>

          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
            systemHealthy ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
              healthError ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-amber-100 text-amber-800 border-amber-300'
          }`}>
            <CheckCircle className="w-3.5 h-3.5" />
            {systemHealthy ? 'Operational' : healthError ? 'Unavailable' : 'Checking'}
          </span>
        </div>
        {healthError && <p role="alert" className="text-sm text-rose-700">{healthError}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-brand-600" />
              Active Engine
            </h4>
            <p className="text-sm font-bold text-slate-800">
              {health?.fallbackEngine === 'active' ? 'BugTrack Local Deterministic Fallback Engine' : 'Status unavailable'}
            </p>
            <p className="text-xs text-slate-500 mt-1 leading-snug">
              Ensures 100% offline uptime, deterministic bug structuring, keyword duplicate scoring, and PR risk analysis without external API dependencies.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Cloud Model (Optional)
            </h4>
            <p className="text-sm font-bold text-slate-800">
              {health?.geminiConfigured ? 'Configured (Google Gemini)' : 'Not configured'}
            </p>
            <p className="text-xs text-slate-500 mt-1 leading-snug">
              {health?.fixAssistantSourceSharingEnabled
                ? 'AI Fix Assistant source sharing is enabled by explicit server configuration.'
                : 'AI Fix Assistant will not send source code to Gemini unless source sharing is explicitly enabled on the server.'}
            </p>
          </div>
        </div>
      </div>

      {/* Database Telemetry */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Database Engine</h3>
            <p className="text-xs text-slate-500">Persistent SQLite managed via Prisma ORM.</p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 font-mono text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-500">Engine Type:</span>
            <span className="font-bold text-slate-800">SQLite (Embedded / Zero-Config)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Prisma Client:</span>
            <span className={`font-bold ${health?.database === 'connected' ? 'text-emerald-600' : 'text-amber-700'}`}>
              {health?.database === 'connected' ? 'Connected' : 'Status unavailable'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Database Location:</span>
            <span className="text-slate-700">server/prisma/dev.db</span>
          </div>
        </div>
      </div>

      {/* GitHub Webhooks Telemetry */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
            <GitBranch className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">GitHub Webhook Listener</h3>
            <p className="text-xs text-slate-500">
              Receives pull_request and ping events with HMAC-SHA256 signature verification.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            Webhook Target URL
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value="http://localhost:5000/api/webhooks/github"
              className="flex-1 text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-700"
            />
            <button
              onClick={() => copyToClipboard('http://localhost:5000/api/webhooks/github')}
              className="p-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
              title="Copy"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
