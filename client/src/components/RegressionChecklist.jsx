import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  ShieldCheck,
  Send,
  AlertTriangle,
  FileText,
  RotateCcw,
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { InlineSpinner } from './LoadingSpinner';

export function RegressionChecklist({ issueId, scenarios = [], onVerificationComplete, isTesterOrAdmin }) {
  const { success, error } = useToast();
  const [checklist, setChecklist] = useState(() => {
    // Default fallback scenarios if none provided
    const items = scenarios.length > 0 ? scenarios : [
      'Verify primary issue workflow executes successfully with valid parameters.',
      'Verify boundary input validation triggers appropriate user-friendly error messages.',
      'Verify UI renders cleanly without console exceptions on target browser.',
      'Verify state persistence after page reload or session restart.',
    ];
    return items.map((text, idx) => ({ id: idx, text, status: null })); // null, 'PASS', 'FAIL'
  });

  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleStatus = (id, newStatus) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
  };

  const allPassed = checklist.length > 0 && checklist.every((i) => i.status === 'PASS');
  const hasFailed = checklist.some((i) => i.status === 'FAIL');
  const allChecked = checklist.every((i) => i.status !== null);

  const handleSubmit = async () => {
    if (!allChecked) {
      error('Please mark all regression test scenarios as either Pass or Fail before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const overallResult = hasFailed ? 'FAILED' : 'PASSED';
      const formattedNotes = `Test Checklist Results:
${checklist.map((c) => `[${c.status}] ${c.text}`).join('\n')}

Tester Notes:
${notes.trim() || 'No additional notes provided.'}`;

      const res = await api.post(`/issues/${issueId}/verification`, {
        result: overallResult,
        testNotes: formattedNotes,
      });

      if (res.data.success) {
        success(res.data.message);
        if (onVerificationComplete) {
          onVerificationComplete(res.data.data);
        }
      }
    } catch (err) {
      error(err.response?.data?.message || 'Failed to submit regression verification.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            Regression Testing & Verification Protocol
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluate all suggested test scenarios to verify fix integrity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasFailed && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
              <RotateCcw className="w-3.5 h-3.5" />
              Will Reopen Issue
            </span>
          )}
          {allPassed && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <CheckCircle className="w-3.5 h-3.5" />
              Will Close Issue
            </span>
          )}
        </div>
      </div>

      {/* Checklist items */}
      <div className="space-y-3">
        {checklist.map((item, idx) => (
          <div
            key={item.id}
            className={`flex items-center justify-between gap-4 p-3.5 rounded-xl border transition-all ${
              item.status === 'PASS'
                ? 'bg-emerald-50/60 border-emerald-200'
                : item.status === 'FAIL'
                ? 'bg-rose-50/60 border-rose-200'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-slate-200/80 text-slate-700 font-bold flex items-center justify-center shrink-0 text-xs">
                {idx + 1}
              </span>
              <span className="text-sm font-medium text-slate-800 leading-snug">
                {item.text}
              </span>
            </div>

            {isTesterOrAdmin ? (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleStatus(item.id, 'PASS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    item.status === 'PASS'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-600'
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Pass
                </button>
                <button
                  type="button"
                  onClick={() => toggleStatus(item.id, 'FAIL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    item.status === 'FAIL'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-rose-400 hover:text-rose-600'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Fail
                </button>
              </div>
            ) : (
              <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-200 text-slate-600">
                {item.status || 'Pending QA'}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Tester Notes */}
      {isTesterOrAdmin && (
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            Tester Verification Notes / Reproduction Logs
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Document observed results, network traces, device environment, or reasons for failure..."
            className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 font-sans"
          />
        </div>
      )}

      {/* Submit Action */}
      {isTesterOrAdmin ? (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-500">
            Status: {checklist.filter((c) => c.status !== null).length}/{checklist.length} scenarios tested.
          </p>

          <button
            type="button"
            disabled={submitting || !allChecked}
            onClick={handleSubmit}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-sm transition-all ${
              !allChecked
                ? 'bg-slate-300 cursor-not-allowed'
                : hasFailed
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
            }`}
          >
            {submitting ? (
              <>
                <InlineSpinner />
                Recording Verification...
              </>
            ) : hasFailed ? (
              <>
                <RotateCcw className="w-4 h-4" />
                Fail & Reopen Issue
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Pass All & Close Issue
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-400" />
          <span>Only QA Testers and Project Administrators are authorized to submit regression verifications.</span>
        </div>
      )}
    </div>
  );
}
