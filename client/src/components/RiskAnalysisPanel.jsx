import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileCode2,
  ListChecks,
  HelpCircle,
  Sparkles,
  Cpu,
  Info,
} from 'lucide-react';

export function RiskAnalysisPanel({ analysis, pr }) {
  if (!analysis) return null;

  const riskLevel = (analysis.riskLevel || 'MEDIUM').toUpperCase();

  const riskConfigs = {
    HIGH: {
      bg: 'bg-rose-50 border-rose-200 text-rose-900',
      badge: 'bg-rose-600 text-white',
      icon: ShieldAlert,
      label: 'High Code Risk',
    },
    MEDIUM: {
      bg: 'bg-amber-50 border-amber-200 text-amber-900',
      badge: 'bg-amber-600 text-white',
      icon: AlertTriangle,
      label: 'Medium Code Risk',
    },
    LOW: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      badge: 'bg-emerald-600 text-white',
      icon: ShieldCheck,
      label: 'Low Code Risk',
    },
  };

  const currentRisk = riskConfigs[riskLevel] || riskConfigs.MEDIUM;
  const RiskIcon = currentRisk.icon;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-navy-900 to-indigo-950 p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-500/20 border border-brand-400/30 rounded-xl text-brand-300">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold">AI Code Change Risk Analysis</h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                <Cpu className="w-3 h-3" />
                {analysis.engine || (analysis.isFallback ? 'Deterministic Fallback' : 'Gemini 1.5 Flash')}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Automated safety analysis for PR #{pr?.prNumber} ({pr?.repository})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider ${currentRisk.badge}`}>
            <RiskIcon className="w-4 h-4" />
            {currentRisk.label}
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Rationale & Change Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <FileCode2 className="w-4 h-4 text-brand-600" />
              Change Summary
            </h4>
            <p className="text-sm text-slate-700 leading-relaxed font-medium">
              {analysis.changeSummary || 'Summary not provided'}
            </p>
          </div>

          <div className={`p-4 rounded-xl border ${currentRisk.bg}`}>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <RiskIcon className="w-4 h-4" />
              Risk Level Rationale
            </h4>
            <p className="text-sm leading-relaxed font-medium">
              {analysis.rationale || 'Risk assessed based on modified files and blast radius.'}
            </p>
          </div>
        </div>

        {/* Affected Modules & Potential Risks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Affected Modules */}
          <div>
            <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              Affected Modules & Files ({analysis.affectedModules?.length || 0})
            </h4>
            <ul className="space-y-1.5 font-mono text-xs">
              {(analysis.affectedModules || []).map((mod, idx) => (
                <li
                  key={idx}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg truncate hover:bg-slate-100 transition"
                >
                  {typeof mod === 'string' ? mod : mod.filename || JSON.stringify(mod)}
                </li>
              ))}
            </ul>
          </div>

          {/* Potential Risks */}
          <div>
            <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Potential Risk Areas ({analysis.potentialRisks?.length || 0})
            </h4>
            <ul className="space-y-2 text-xs">
              {(analysis.potentialRisks || []).map((risk, idx) => (
                <li key={idx} className="flex items-start gap-2 text-slate-700">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span className="leading-snug">{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Suggested Regression Test Cases */}
        <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100">
          <h4 className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-indigo-600" />
            AI Suggested Regression Test Scenarios
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {(analysis.suggestedRegressionTests || []).map((test, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-2.5 bg-white rounded-lg border border-indigo-200/60 text-slate-800 font-medium shadow-sm"
              >
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{test}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Missing Test Scenarios Edge Cases */}
        {analysis.missingScenarios && analysis.missingScenarios.length > 0 && (
          <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200">
            <h4 className="text-sm font-bold text-amber-900 mb-2 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-600" />
              Potential Missing Test Scenarios / Boundary Conditions
            </h4>
            <ul className="space-y-1.5 text-xs text-amber-950">
              {analysis.missingScenarios.map((scen, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="font-bold text-amber-600">&bull;</span>
                  <span>{scen}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Compliance & Safety Disclaimer */}
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
          <Info className="w-4 h-4 text-slate-400 shrink-0" />
          <span>
            {analysis.disclaimer ||
              'AI risk assessment advisory for developer and QA review. Does not claim automated test execution without test harness confirmation.'}
          </span>
        </div>
      </div>
    </div>
  );
}
