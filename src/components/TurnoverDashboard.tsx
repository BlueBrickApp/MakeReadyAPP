import React, { useState } from 'react';
import { 
  Wrench, 
  Zap, 
  Flame, 
  Paintbrush, 
  Layers, 
  Sparkles, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertCircle, 
  Camera, 
  User, 
  Clock, 
  Building,
  ChevronDown
} from 'lucide-react';
import { 
  Unit, 
  Checklist, 
  WorkOrder, 
  TradeCategory, 
  TRADE_CATEGORIES,
  TechnicianUser 
} from '../types';
import { soundManager } from '../services/audio';

interface TurnoverDashboardProps {
  units: Unit[];
  selectedUnitId: string | null;
  onSelectUnitId: (id: string) => void;
  checklists: Checklist[];
  workOrders: WorkOrder[];
  currentUser: TechnicianUser;
  onOpenChecklistForTrade: (unitId: string, trade: TradeCategory) => void;
  onOpenDispatcherForUnit: (unitId: string, trade: TradeCategory) => void;
  onOpenSignOff: (unitId: string) => void;
}

const TRADE_ICONS: Record<TradeCategory, React.ComponentType<{ className?: string }>> = {
  Plumbing: Wrench,
  Electrical: Zap,
  HVAC: Flame,
  Painting: Paintbrush,
  Flooring: Layers,
  Cleaning: Sparkles
};

export const TurnoverDashboard: React.FC<TurnoverDashboardProps> = ({
  units,
  selectedUnitId,
  onSelectUnitId,
  checklists,
  workOrders,
  currentUser,
  onOpenChecklistForTrade,
  onOpenDispatcherForUnit,
  onOpenSignOff
}) => {
  const currentUnit = units.find(u => u.id === selectedUnitId) || units[0];

  if (!currentUnit) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4 my-16 bg-[#0D131F] border border-slate-800 rounded-2xl shadow-xl">
        <Building className="w-12 h-12 text-[#00FFB4] mx-auto" />
        <h3 className="font-['Chakra_Petch'] font-bold text-lg text-white">NO APARTMENTS REGISTERED</h3>
        <p className="text-xs text-slate-400 font-mono">
          Your Firebase database is clean. Click "+ NEW UNIT" in the top bar to register your first unit.
        </p>
      </div>
    );
  }

  const unitChecklists = checklists.filter(c => c.unit_id === currentUnit?.id);
  const unitWorkOrders = workOrders.filter(w => w.unit_id === currentUnit?.id);

  // Overall statistics
  const totalTrades = TRADE_CATEGORIES.length;
  const completedTradesCount = unitChecklists.filter(c => c.completion_percentage === 100).length;
  const overallPercentage = unitChecklists.length > 0
    ? Math.round(unitChecklists.reduce((acc, c) => acc + c.completion_percentage, 0) / unitChecklists.length)
    : 0;

  const totalTasks = unitChecklists.reduce((sum, c) => sum + (c.task_list?.length || 0), 0);
  const completedTasks = unitChecklists.reduce((sum, c) => sum + (c.task_list || []).filter(t => t.is_completed).length, 0);
  const totalPhotosUploaded = unitChecklists.reduce((sum, c) => sum + (c.task_list || []).filter(t => !!t.photo_url).length, 0);

  const openWorkOrders = unitWorkOrders.filter(w => w.status !== 'Resolved');

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Unit Selector & Make-Ready Overview Banner */}
      <div className="bg-[#0D131F] border border-slate-800 rounded-xl p-4 sm:p-6 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Unit Selector dropdown & basic details */}
          <div className="space-y-1">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Building className="w-3.5 h-3.5 text-[#00FFB4]" />
              <span>Apartment Unit Scope</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative inline-block">
                <select
                  value={currentUnit?.id}
                  onChange={(e) => {
                    soundManager.playClick();
                    onSelectUnitId(e.target.value);
                  }}
                  className="appearance-none bg-slate-900 border-2 border-[#00FFB4] text-white font-['Chakra_Petch'] font-bold text-xl sm:text-2xl px-4 py-2 pr-10 rounded-lg focus:outline-none cursor-pointer shadow-[0_0_15px_rgba(0,255,180,0.2)]"
                >
                  {units.map(u => (
                    <option key={u.id} value={u.id} className="bg-slate-900 text-white font-sans text-base">
                      Unit #{u.unit_number} ({u.floor_plan}) - {u.current_status}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-[#00FFB4] pointer-events-none" />
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-slate-800 text-slate-200 border border-slate-700">
                  {currentUnit?.floor_plan}
                </span>
                <span className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold uppercase ${
                  currentUnit?.current_status === 'Rent Ready'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : currentUnit?.current_status === 'Ready'
                    ? 'bg-[#00FFB4]/20 text-[#00FFB4] border border-[#00FFB4]/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  {currentUnit?.current_status}
                </span>
              </div>
            </div>
            
            <div className="space-y-1 text-xs text-slate-400 font-mono">
              <p>
                {currentUnit?.building} {currentUnit?.floor ? `• Floor ${currentUnit.floor}` : ''} • Target Ready: <strong className="text-slate-200">{currentUnit?.target_ready_date}</strong>
                {currentUnit?.assigned_tech && (
                  <span className="ml-2 text-cyan-400">
                    • Lead Tech: <strong className="text-white">{currentUnit.assigned_tech}</strong>
                  </span>
                )}
              </p>
              {currentUnit?.notes && (
                <p className="text-[11px] text-slate-300 italic bg-slate-900 px-2 py-1 rounded border border-slate-800">
                  <span className="font-semibold text-slate-400 not-italic mr-1">Notes:</span>
                  {currentUnit.notes}
                </p>
              )}
            </div>
          </div>

          {/* Quick CTAs based on status */}
          <div className="flex flex-wrap items-center gap-3">
            {currentUnit?.current_status === 'Ready' && (
              <button
                id="sign-off-quick-btn"
                onClick={() => {
                  soundManager.playClick();
                  onOpenSignOff(currentUnit.id);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#00FFB4] text-black font-semibold text-xs tracking-wider uppercase hover:brightness-110 shadow-[0_0_20px_rgba(0,255,180,0.4)] transition-all animate-pulse"
              >
                <span>Readiness Sign-Off</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            )}

            <button
              id="dispatch-wo-btn"
              onClick={() => {
                soundManager.playClick();
                onOpenDispatcherForUnit(currentUnit.id, 'Plumbing');
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
            >
              <span>+ Create Work Order</span>
            </button>
          </div>

        </div>

        {/* High-Contrast KPI Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-800">
          
          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Overall Turnover</div>
            <div className="text-2xl font-['Chakra_Petch'] font-bold text-[#00FFB4] mt-1">
              {overallPercentage}%
            </div>
            <div className="w-full bg-slate-950 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-[#00FFB4]" style={{ width: `${overallPercentage}%` }} />
            </div>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Trades 100% Complete</div>
            <div className="text-2xl font-['Chakra_Petch'] font-bold text-white mt-1">
              {completedTradesCount} <span className="text-slate-500 text-base font-normal">/ {totalTrades}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-2 font-mono">
              {completedTradesCount === totalTrades ? 'All trades finished!' : `${totalTrades - completedTradesCount} pending`}
            </div>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Punch-list Tasks</div>
            <div className="text-2xl font-['Chakra_Petch'] font-bold text-white mt-1">
              {completedTasks} <span className="text-slate-500 text-base font-normal">/ {totalTasks}</span>
            </div>
            <div className="text-[10px] text-[#00E5FF] mt-2 font-mono flex items-center gap-1">
              <Camera className="w-3 h-3" />
              <span>{totalPhotosUploaded} photos verified</span>
            </div>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Active Work Orders</div>
            <div className={`text-2xl font-['Chakra_Petch'] font-bold mt-1 ${openWorkOrders.length > 0 ? 'text-[#FF3366]' : 'text-slate-300'}`}>
              {openWorkOrders.length}
            </div>
            <div className="text-[10px] text-slate-400 mt-2 font-mono">
              {openWorkOrders.some(w => w.priority === 'Emergency') ? '⚠️ Emergency order active' : 'No emergency blockers'}
            </div>
          </div>

        </div>

      </div>

      {/* 6 Trade Categories Granular Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-['Chakra_Petch'] font-bold text-base text-white tracking-wide">
            TRADE CATEGORIES BREAKDOWN (6 TRADES)
          </h3>
          <span className="text-xs font-mono text-slate-400">Click any card to open dynamic punch-list</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TRADE_CATEGORIES.map((trade) => {
            const checklist = unitChecklists.find(c => c.trade_category === trade);
            const Icon = TRADE_ICONS[trade];
            const pct = checklist ? checklist.completion_percentage : 0;
            const is100 = pct === 100;
            const taskList = checklist?.task_list || [];
            const doneCount = taskList.filter(t => t.is_completed).length;
            const totalTradeTasks = taskList.length;
            const tradeWorkOrders = unitWorkOrders.filter(w => w.trade_category === trade && w.status !== 'Resolved');

            return (
              <div
                key={trade}
                className={`bg-[#0D131F] border rounded-xl p-4 transition-all shadow-md hover:shadow-[0_0_20px_rgba(0,255,180,0.15)] flex flex-col justify-between space-y-4 ${
                  is100 
                    ? 'border-[#00FFB4]/40 bg-gradient-to-b from-[#0D131F] to-[#00FFB4]/5' 
                    : pct > 0 
                    ? 'border-amber-500/40' 
                    : 'border-slate-800'
                }`}
              >
                <div>
                  {/* Top Bar: Icon, Title, Status Badge */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2.5 rounded-lg ${
                        is100 
                          ? 'bg-[#00FFB4]/15 text-[#00FFB4] border border-[#00FFB4]/30' 
                          : 'bg-slate-900 text-slate-300 border border-slate-800'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-['Chakra_Petch'] font-bold text-base text-white">
                          {trade}
                        </h4>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {doneCount} of {totalTradeTasks} verified
                        </span>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase ${
                      is100 
                        ? 'bg-[#00FFB4]/20 text-[#00FFB4] border border-[#00FFB4]/50'
                        : pct > 0
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                        : 'bg-slate-900 text-slate-500 border border-slate-800'
                    }`}>
                      {is100 ? '100% COMPLETE' : pct > 0 ? 'IN PROGRESS' : 'PENDING'}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-400">Execution Progress</span>
                      <span className={`font-bold ${is100 ? 'text-[#00FFB4]' : 'text-slate-200'}`}>{pct}%</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: is100 ? '#00FFB4' : '#00E5FF',
                          boxShadow: is100 ? '0 0 12px #00FFB4' : 'none'
                        }}
                      />
                    </div>
                  </div>

                  {/* Open Work Orders for this trade */}
                  {tradeWorkOrders.length > 0 && (
                    <div className="mt-3 p-2 rounded-md bg-[#FF3366]/10 border border-[#FF3366]/30 flex items-center justify-between text-xs font-mono text-[#FF3366]">
                      <span className="flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{tradeWorkOrders.length} Trade Work Order(s)</span>
                      </span>
                      <span className="text-[10px] underline cursor-pointer" onClick={() => onOpenDispatcherForUnit(currentUnit.id, trade)}>
                        View
                      </span>
                    </div>
                  )}

                  {/* Quick Task Checklist Previews (Fixed sequence) */}
                  <div className="mt-4 space-y-1.5 pt-3 border-t border-slate-800/80">
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Fixed Punch-List Sequence:</div>
                    <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                      {taskList.map((task) => (
                        <div 
                          key={task.id}
                          className="flex items-center justify-between text-xs p-1 rounded bg-slate-900/60 border border-slate-800/50"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-mono text-[10px] text-slate-500">#{task.sequence_order}</span>
                            <span className={`truncate ${task.is_completed ? 'text-slate-300 line-through opacity-80' : 'text-slate-200'}`}>
                              {task.name}
                            </span>
                          </div>
                          {task.is_completed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#00FFB4] shrink-0" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-slate-700 shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Bottom Action: Open Punch-List */}
                <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                  <button
                    id={`open-punchlist-${trade.toLowerCase()}`}
                    onClick={() => {
                      soundManager.playClick();
                      onOpenChecklistForTrade(currentUnit.id, trade);
                    }}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      is100
                        ? 'bg-slate-900 hover:bg-[#00FFB4]/20 text-[#00FFB4] border border-[#00FFB4]/40'
                        : 'bg-[#00FFB4] hover:brightness-110 text-black shadow-[0_0_12px_rgba(0,255,180,0.3)]'
                    }`}
                  >
                    <span>{is100 ? 'Review Trade Punch-List' : 'Open Checklist & Upload Photos'}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
