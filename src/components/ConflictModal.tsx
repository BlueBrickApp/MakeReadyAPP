import React from 'react';
import { 
  X, 
  GitMerge, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  FileText, 
  Camera, 
  User, 
  Layers
} from 'lucide-react';
import { Task } from '../types';
import { soundManager } from '../services/audio';

interface ConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflictData: {
    originalTask: Task;
    remoteUpdate: Task;
    mergedTask: Task;
  } | null;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
  isOpen,
  onClose,
  conflictData
}) => {
  if (!isOpen || !conflictData) return null;

  const { originalTask, remoteUpdate, mergedTask } = conflictData;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-3xl bg-[#0D131F] border-2 border-[#00E5FF] rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(0,229,255,0.25)] flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40">
              <GitMerge className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-['Chakra_Petch'] font-bold text-lg text-white">
                  REAL-TIME CONFLICT RESOLVED (3-WAY MERGE)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40">
                  OPTIMISTIC SYNC
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400">
                Simultaneous updates from multiple technicians reconciled without data loss
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison Grid */}
        <div className="p-5 overflow-y-auto space-y-5">
          
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 font-mono">
            <strong>Target Punch Item:</strong> #{originalTask.sequence_order} - {originalTask.name}
          </div>

          {/* 3 Columns Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            
            {/* 1. Local Version */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-mono text-slate-400 font-bold uppercase">1. Local Device Edit</span>
                <span className="text-[10px] font-mono text-slate-500">v{originalTask.version}</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between font-mono">
                  <span className="text-slate-500">Status:</span>
                  <span className={originalTask.is_completed ? 'text-[#00FFB4] font-bold' : 'text-slate-400'}>
                    {originalTask.is_completed ? 'Completed' : 'Pending'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 font-mono text-[11px]">Notes:</span>
                  <p className="p-2 rounded bg-slate-900 text-slate-200 text-xs italic">
                    {originalTask.notes || 'No local notes added'}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Remote Version (Concurrent Tech Dave Jenkins) */}
            <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/40 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-mono text-amber-400 font-bold uppercase">2. Remote Tech Edit</span>
                <span className="text-[10px] font-mono text-amber-500">v{remoteUpdate.version}</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between font-mono">
                  <span className="text-slate-500">Author:</span>
                  <span className="text-slate-200 font-semibold">{remoteUpdate.completed_by}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-slate-500">Status:</span>
                  <span className="text-[#00FFB4] font-bold">Completed</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 font-mono text-[11px]">Remote Notes:</span>
                  <p className="p-2 rounded bg-slate-900 text-amber-200 text-xs italic">
                    {remoteUpdate.notes}
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Merged Output */}
            <div className="bg-[#00FFB4]/5 p-4 rounded-xl border-2 border-[#00FFB4] space-y-3 shadow-[0_0_15px_rgba(0,255,180,0.15)]">
              <div className="flex items-center justify-between border-b border-[#00FFB4]/30 pb-2">
                <span className="text-xs font-mono text-[#00FFB4] font-bold uppercase flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>3. Reconciled Output</span>
                </span>
                <span className="text-[10px] font-mono text-[#00FFB4]">v{mergedTask.version}</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between font-mono">
                  <span className="text-slate-400">Merged Status:</span>
                  <span className="text-[#00FFB4] font-bold">100% Verified Complete</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-mono text-[11px]">Non-Destructive Notes:</span>
                  <p className="p-2 rounded bg-slate-900 text-slate-100 text-xs leading-relaxed">
                    {mergedTask.notes}
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Merge Explanation */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3 text-xs text-slate-300">
            <Layers className="w-4 h-4 text-[#00FFB4] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-white">Deterministic Merge Logic Applied:</strong>
              <p className="text-slate-400 leading-relaxed font-mono text-[11px]">
                Completion status takes priority (True wins over False). Field notes from concurrent technicians are non-destructively concatenated with author attribution tags. Photos and timestamps are preserved in the unit field activity ledger.
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="px-5 py-2 rounded-lg bg-[#00FFB4] text-black font-bold text-xs font-mono uppercase hover:brightness-110"
          >
            Acknowledge & Continue
          </button>
        </div>

      </div>
    </div>
  );
};
