'use client';

import { useEffect } from 'react';
import type { TickReport as TickReportType } from '@/lib/types';

interface TickReportProps {
  report: TickReportType | null;
  onDismiss: () => void;
}

function OutcomeValue({ label, value }: { label: string; value: number }) {
  const isPositive = value > 0;
  const isNegative = value < 0;

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[#333355]/50 last:border-0">
      <span className="text-sm text-gray-400 capitalize">{label.replace(/_/g, ' ')}</span>
      <span
        className={`text-sm font-mono font-bold ${
          isPositive ? 'text-[#00ff88]' : isNegative ? 'text-[#ff4444]' : 'text-gray-500'
        }`}
      >
        {isPositive && '+'}
        {value}
      </span>
    </div>
  );
}

export default function TickReport({ report, onDismiss }: TickReportProps) {
  useEffect(() => {
    if (!report) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [report, onDismiss]);

  if (!report) return null;

  const outcomes = report.outcomes as Record<string, number | string | Record<string, number>>;

  // Extract resource changes from outcomes
  const resourceChanges: { label: string; value: number }[] = [];
  const otherOutcomes: { label: string; value: string }[] = [];

  for (const [key, val] of Object.entries(outcomes)) {
    if (typeof val === 'number') {
      resourceChanges.push({ label: key, value: val });
    } else if (typeof val === 'object' && val !== null) {
      for (const [subKey, subVal] of Object.entries(val)) {
        if (typeof subVal === 'number') {
          resourceChanges.push({ label: subKey, value: subVal });
        }
      }
    } else if (typeof val === 'string') {
      otherOutcomes.push({ label: key, value: val });
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onDismiss}
      />

      {/* Slide-up panel */}
      <div
        className="relative w-full max-w-lg animate-slide-up bg-[#1a1a2e]/95 backdrop-blur-sm border-t border-x border-[#333355] rounded-t-2xl p-5 pb-8 space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">
              Tick {report.tick_number} Report
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {report.report_type === 'epilogue' ? 'Game Epilogue' : 'Tick Resolution'}
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#0a0a0a] border border-[#333355] text-gray-400 hover:text-white hover:border-gray-400 transition-colors"
            aria-label="Dismiss report"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Narrative */}
        {report.narrative && (
          <div className="bg-[#0a0a0a] border border-[#333355] rounded-xl p-4">
            <p className="text-sm text-gray-300 leading-relaxed italic">
              {report.narrative}
            </p>
          </div>
        )}

        {/* Resource changes */}
        {resourceChanges.length > 0 && (
          <div className="bg-[#0a0a0a] border border-[#333355] rounded-xl p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Changes
            </h3>
            <div className="space-y-0">
              {resourceChanges.map((rc, i) => (
                <OutcomeValue key={`${rc.label}-${i}`} label={rc.label} value={rc.value} />
              ))}
            </div>
          </div>
        )}

        {/* Other outcomes */}
        {otherOutcomes.length > 0 && (
          <div className="bg-[#0a0a0a] border border-[#333355] rounded-xl p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Events
            </h3>
            <div className="space-y-1.5">
              {otherOutcomes.map((o, i) => (
                <p key={`${o.label}-${i}`} className="text-sm text-gray-400">
                  <span className="text-gray-500 capitalize">{o.label.replace(/_/g, ' ')}:</span>{' '}
                  <span className="text-gray-300">{o.value}</span>
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className="w-full min-h-[44px] rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] font-medium text-sm hover:bg-[#00ff88]/20 transition-colors"
        >
          Dismiss
        </button>
      </div>

    </div>
  );
}
