import React from 'react';
import { CopyCheck, ExternalLink, AlertTriangle, User } from 'lucide-react';
import { StatusBadge } from './Badge';

export function DuplicateList({ duplicates = [], onSelectDuplicate }) {
  if (!duplicates || duplicates.length === 0) {
    return null;
  }

  return (
    <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
            <CopyCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-amber-950">
              Potential Duplicate Issues Detected ({duplicates.length})
            </h4>
            <p className="text-xs text-amber-800">
              Review existing issues before submitting to prevent redundant defect reports.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {duplicates.map((dup) => (
          <div
            key={dup.id}
            className="p-3.5 bg-white rounded-xl border border-amber-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-amber-400 transition"
          >
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                  {dup.issueKey}
                </span>
                <StatusBadge status={dup.status} />
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {dup.assignee || 'Unassigned'}
                </span>
              </div>

              <h5 className="text-sm font-semibold text-slate-800 leading-snug">
                {dup.title}
              </h5>

              {dup.matchedKeywords && dup.matchedKeywords.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[11px] text-slate-400">Matched tokens:</span>
                  {dup.matchedKeywords.map((kw, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-mono"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Similarity Score Badge & View Link */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <div className="flex items-center gap-1 justify-end">
                  <span
                    className={`text-sm font-extrabold ${
                      dup.similarityPercentage > 70
                        ? 'text-rose-600'
                        : dup.similarityPercentage > 40
                        ? 'text-amber-600'
                        : 'text-indigo-600'
                    }`}
                  >
                    {dup.similarityPercentage}%
                  </span>
                  <span className="text-xs text-slate-400">similarity</span>
                </div>
                <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                  <div
                    className={`h-full rounded-full ${
                      dup.similarityPercentage > 70
                        ? 'bg-rose-500'
                        : dup.similarityPercentage > 40
                        ? 'bg-amber-500'
                        : 'bg-indigo-500'
                    }`}
                    style={{ width: `${dup.similarityPercentage}%` }}
                  />
                </div>
              </div>

              <a
                href={`/issues/${dup.id}`}
                target="_blank"
                rel="noreferrer"
                className="p-2 text-slate-400 hover:text-brand-600 hover:bg-slate-50 rounded-lg transition"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
