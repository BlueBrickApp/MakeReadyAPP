import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Camera, 
  CheckCircle2, 
  FileText, 
  Wrench, 
  Stamp, 
  CloudCheck, 
  CloudOff, 
  Layers, 
  Calendar,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { 
  FieldLogEntry, 
  Unit, 
  TradeCategory, 
  TRADE_CATEGORIES, 
  FieldActionType 
} from '../types';
import { soundManager } from '../services/audio';

interface FieldLogProps {
  logs: FieldLogEntry[];
  units: Unit[];
  selectedUnitId: string | null;
  onSelectUnitId: (unitId: string) => void;
}

export const FieldLog: React.FC<FieldLogProps> = ({
  logs,
  units,
  selectedUnitId,
  onSelectUnitId
}) => {
  const [tradeFilter, setTradeFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);

  const currentUnit = units.find(u => u.id === selectedUnitId);

  const filteredLogs = logs.filter(entry => {
    const matchesUnit = selectedUnitId === 'all' || entry.unit_id === selectedUnitId;
    const matchesTrade = tradeFilter === 'all' || entry.trade_category === tradeFilter;
    const matchesAction = actionFilter === 'all' || entry.action_type === actionFilter;
    const q = (searchQuery || '').toLowerCase();
    const msg = String(entry.message || '').toLowerCase();
    const author = String(entry.author_name || '').toLowerCase();
    const unitNum = String(entry.unit_number || '').toLowerCase();
    const matchesSearch = q === '' || 
      msg.includes(q) ||
      author.includes(q) ||
      unitNum.includes(q);
    return matchesUnit && matchesTrade && matchesAction && matchesSearch;
  });

  const getActionBadge = (action: FieldActionType) => {
    switch (action) {
      case 'task_completed':
        return { label: 'Task Complete', color: 'bg-[#00FFB4]/15 text-[#00FFB4] border-[#00FFB4]/40', icon: CheckCircle2 };
      case 'task_uncompleted':
        return { label: 'Task Reopened', color: 'bg-slate-800 text-slate-400 border-slate-700', icon: History };
      case 'photo_uploaded':
        return { label: 'Photo Attached', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/40', icon: Camera };
      case 'note_added':
        return { label: 'Field Note', color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/40', icon: FileText };
      case 'work_order_dispatched':
        return { label: 'Work Order', color: 'bg-[#FF3366]/15 text-[#FF3366] border-[#FF3366]/40', icon: Wrench };
      case 'work_order_resolved':
        return { label: 'WO Resolved', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40', icon: CheckCircle2 };
      case 'stage_changed':
        return { label: 'Stage Advanced', color: 'bg-amber-500/15 text-amber-400 border-amber-500/40', icon: Layers };
      case 'sign_off':
        return { label: 'Rent Ready Signed', color: 'bg-purple-500/15 text-purple-400 border-purple-500/40', icon: Stamp };
      case 'conflict_resolved':
        return { label: 'Conflict Merged', color: 'bg-blue-500/15 text-blue-400 border-blue-500/40', icon: History };
      case 'offline_sync':
        return { label: 'Cloud Sync', color: 'bg-[#00FFB4]/20 text-[#00FFB4] border-[#00FFB4]/50', icon: CloudCheck };
      default:
        return { label: 'Event', color: 'bg-slate-800 text-slate-300 border-slate-700', icon: History };
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Top Controls Bar */}
      <div className="bg-[#0D131F] border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg space-y-4">
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-[#00FFB4]" />
              <h2 className="text-xl font-['Chakra_Petch'] font-bold text-white tracking-wide">
                FIELD ACTIVITY AUDIT FEED
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Chronological ledger of field punches, photo verifications, and trade logs
            </p>
          </div>

          {/* Unit selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">Unit:</span>
            <select
              value={selectedUnitId}
              onChange={(e) => {
                soundManager.playClick();
                onSelectUnitId(e.target.value);
              }}
              className="bg-slate-900 border border-slate-700 text-white font-['Chakra_Petch'] font-bold text-base px-3 py-1.5 rounded-lg focus:outline-none focus:border-[#00FFB4] cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-white">All Units Feed (HQ)</option>
              {units.map(u => (
                <option key={u.id} value={u.id} className="bg-slate-900 text-white font-sans text-sm">
                  Unit #{u.unit_number} ({u.floor_plan})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800">
          
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search activity, author, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-[#00FFB4]"
            />
          </div>

          <div>
            <select
              value={tradeFilter}
              onChange={(e) => setTradeFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-[#00FFB4] cursor-pointer"
            >
              <option value="all">All Trade Categories</option>
              {TRADE_CATEGORIES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-[#00FFB4] cursor-pointer"
            >
              <option value="all">All Action Types</option>
              <option value="task_completed">Tasks Completed</option>
              <option value="photo_uploaded">Photos Uploaded</option>
              <option value="note_added">Field Notes</option>
              <option value="work_order_dispatched">Work Orders</option>
              <option value="stage_changed">Stage Transitions</option>
              <option value="sign_off">Supervisor Sign-Offs</option>
              <option value="conflict_resolved">Simultaneous Merges</option>
            </select>
          </div>

        </div>

      </div>

      {/* Timeline List */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center bg-[#0D131F] border border-slate-800 rounded-xl text-slate-400 text-xs font-mono">
            No activity logs found matching the selected filter criteria.
          </div>
        ) : (
          filteredLogs.map((entry) => {
            const badge = getActionBadge(entry.action_type);
            const BadgeIcon = badge.icon;
            const dateStr = new Date(entry.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
            const timeStr = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <div
                key={entry.id}
                className="bg-[#0D131F] border border-slate-800/90 hover:border-slate-700 rounded-xl p-4 transition-all shadow-md flex flex-col md:flex-row md:items-start justify-between gap-4"
              >
                {/* Left: Action Icon + Details */}
                <div className="flex items-start gap-3.5 flex-1">
                  
                  <div className={`p-2.5 rounded-xl shrink-0 border ${badge.color}`}>
                    <BadgeIcon className="w-5 h-5" />
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${badge.color}`}>
                        {badge.label}
                      </span>

                      {entry.trade_category && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-900 text-slate-300 border border-slate-700">
                          {entry.trade_category}
                        </span>
                      )}

                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#00FFB4]/10 text-[#00FFB4] border border-[#00FFB4]/30">
                        Unit #{entry.unit_number}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-slate-100 leading-relaxed">
                      {entry.message}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
                      <span>
                        By <strong className="text-slate-200">{entry.author_name}</strong> ({entry.author_role})
                      </span>
                      <span>•</span>
                      <span>{dateStr} at {timeStr}</span>
                    </div>
                  </div>

                </div>

                {/* Right: Photo preview (if present) & Cloud sync status */}
                <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-2 shrink-0">
                  
                  {/* Sync Status pill */}
                  <div className="flex items-center gap-1.5 text-[11px] font-mono">
                    {entry.synced ? (
                      <span className="flex items-center gap-1 text-[#00FFB4]">
                        <CloudCheck className="w-3.5 h-3.5" />
                        <span>Synced</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[#FFB800] bg-[#FFB800]/10 px-1.5 py-0.5 rounded border border-[#FFB800]/30">
                        <CloudOff className="w-3.5 h-3.5" />
                        <span>Local Cache</span>
                      </span>
                    )}
                  </div>

                  {/* Attached photo thumbnail */}
                  {entry.photo_url && (
                    <div 
                      onClick={() => setZoomedPhoto(entry.photo_url!)}
                      className="relative group w-16 h-16 rounded-lg overflow-hidden border border-slate-700 bg-black cursor-pointer shadow-sm hover:border-[#00FFB4]"
                    >
                      <img 
                        src={entry.photo_url} 
                        alt="Activity evidence" 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs">
                        <ExternalLink className="w-4 h-4" />
                      </div>
                    </div>
                  )}

                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Image Modal Lightbox */}
      {zoomedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-2xl w-full bg-[#0D131F] border border-slate-700 rounded-xl overflow-hidden">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-mono text-slate-300">Field Activity Photo</span>
              <button
                onClick={() => setZoomedPhoto(null)}
                className="px-2 py-1 rounded bg-slate-800 text-xs text-slate-300 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="p-2 bg-black flex items-center justify-center">
              <img src={zoomedPhoto} alt="Full view" className="max-h-[70vh] object-contain rounded" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
