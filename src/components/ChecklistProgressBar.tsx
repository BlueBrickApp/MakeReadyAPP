import React from 'react';
import { ClipboardCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  Checklist,
  TradeCategory,
  TRADE_CATEGORIES,
  TRADE_SHORT_CODES
} from '../types';
import { soundManager } from '../services/audio';

interface ChecklistProgressBarProps {
  checklists: Checklist[];
  onOpenChecklist?: (tradeCategory?: TradeCategory) => void;
}

export const ChecklistProgressBar: React.FC<ChecklistProgressBarProps> = ({
  checklists,
  onOpenChecklist
}) => {
  const validChecklists = checklists.filter(
    (c) => Array.isArray(c.task_list) && c.task_list.length > 0
  );

  // Aggregate finished vs. total tasks across the unit's active inspection checklists
  const totalTasks = validChecklists.reduce(
    (sum, c) => sum + c.task_list.length,
    0
  );
  const finishedTasks = validChecklists.reduce(
    (sum, c) => sum + c.task_list.filter((t) => t.is_completed).length,
    0
  );
  const flaggedCount = validChecklists.reduce(
    (sum, c) =>
      sum + c.task_list.filter((t) => t.flagged_issue && !t.is_completed).length,
    0
  );

  const percentage =
    totalTasks > 0 ? Math.round((finishedTasks / totalTasks) * 100) : 0;
  const remainingTasks = Math.max(0, totalTasks - finishedTasks);
  const isComplete = totalTasks > 0 && finishedTasks === totalTasks;

  // Identify the unit's currently active inspection checklist (in_progress first, else next incomplete)
  const inProgressChecklists = validChecklists
    .filter((c) => c.status === 'in_progress')
    .sort((a, b) => (b.last_updated || 0) - (a.last_updated || 0));

  const nextIncompleteChecklist = TRADE_CATEGORIES.map((trade) =>
    validChecklists.find((c) => c.trade_category === trade)
  ).find(
    (c): c is Checklist =>
      Boolean(c && c.task_list.some((t) => !t.is_completed))
  );

  const activeChecklist = inProgressChecklists[0] || nextIncompleteChecklist || null;
  const activeDone = activeChecklist
    ? activeChecklist.task_list.filter((t) => t.is_completed).length
    : 0;
  const activeTotal = activeChecklist ? activeChecklist.task_list.length : 0;
  const activePct =
    activeTotal > 0 ? Math.round((activeDone / activeTotal) * 100) : 0;

  const fillColorClass = isComplete
    ? 'bg-[#00FFB4] shadow-[0_0_12px_rgba(0,255,180,0.55)]'
    : percentage >= 50
    ? 'bg-gradient-to-r from-[#00E5FF] to-[#00FFB4] shadow-[0_0_8px_rgba(0,229,255,0.35)]'
    : percentage > 0
    ? 'bg-gradient-to-r from-[#FFB800] to-[#00E5FF]'
    : 'bg-slate-700';

  const percentageTextClass = isComplete
    ? 'text-[#00FFB4]'
    : percentage >= 50
    ? 'text-[#00E5FF]'
    : percentage > 0
    ? 'text-[#FFB800]'
    : 'text-slate-400';

  return (
    <div
      className="space-y-1.5 bg-slate-950/75 border border-slate-800/90 rounded-lg p-2.5"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Telemetry Header */}
      <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
        <span className="text-slate-300 flex items-center gap-1.5 font-semibold truncate">
          {isComplete ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-[#00FFB4] shrink-0" />
          ) : (
            <ClipboardCheck className="w-3.5 h-3.5 text-[#00E5FF] shrink-0" />
          )}
          <span className="truncate">Inspection Checklist</span>
        </span>

        <div className="flex items-center gap-2 shrink-0 tabular-nums">
          <span className="text-[10px] text-slate-400">
            <strong className="text-slate-200">{finishedTasks}</strong>/{totalTasks} tasks
          </span>
          <span className={`font-bold ${percentageTextClass}`}>
            {percentage}%
          </span>
        </div>
      </div>

      {/* Visual Progress Bar Track */}
      <div
        role="progressbar"
        aria-label="Active inspection checklist completion"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        className="relative w-full h-2.5 rounded-full bg-slate-900 overflow-hidden border border-slate-800"
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${fillColorClass}`}
          style={{ width: `${percentage}%` }}
        />
        {/* Subtle 25% / 50% / 75% tactical checkpoint ticks */}
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-1/4 w-px bg-slate-800/80 pointer-events-none"
        />
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-1/2 w-px bg-slate-800/80 pointer-events-none"
        />
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-3/4 w-px bg-slate-800/80 pointer-events-none"
        />
      </div>

      {/* Active Trade & Remaining Tasks Sub-line */}
      <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
        {isComplete ? (
          <span className="text-[#00FFB4] font-semibold">
            All {totalTasks} checklist tasks verified
          </span>
        ) : activeChecklist ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              soundManager.playClick();
              onOpenChecklist?.(activeChecklist.trade_category);
            }}
            className="inline-flex items-center gap-1 text-cyan-300 hover:text-[#00FFB4] transition-colors truncate text-left"
            title={`Open active ${activeChecklist.trade_category} checklist (${activeDone} of ${activeTotal} tasks completed)`}
          >
            <span className="px-1 py-0.2 rounded bg-cyan-500/15 border border-cyan-500/35 text-cyan-300 font-bold text-[9px] shrink-0">
              {TRADE_SHORT_CODES[activeChecklist.trade_category] || 'CHK'}
            </span>
            <span className="truncate">
              Active: {activeDone}/{activeTotal} ({activePct}%)
            </span>
          </button>
        ) : (
          <span className="text-slate-500">No active checklist tasks</span>
        )}

        <div className="flex items-center gap-2 shrink-0 tabular-nums">
          {flaggedCount > 0 && (
            <span
              className="text-[#FF3366] font-semibold flex items-center gap-0.5"
              title={`${flaggedCount} unfinished flagged checklist task(s)`}
            >
              <AlertCircle className="w-3 h-3" />
              <span>{flaggedCount}</span>
            </span>
          )}
          {!isComplete && totalTasks > 0 && (
            <span className="text-slate-500">{remainingTasks} left</span>
          )}
        </div>
      </div>
    </div>
  );
};
