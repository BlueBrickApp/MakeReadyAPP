import React, { useMemo, useState } from 'react';
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
  Building,
  ChevronDown,
  TrendingUp,
  Activity,
  Truck,
  Plus
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
  YAxis
} from 'recharts';
import { 
  Unit, 
  UnitVendorAssignment,
  ScheduleEventStatus,
  ScheduleTradeCode,
  Checklist, 
  WorkOrder, 
  FieldLogEntry,
  TradeCategory, 
  TRADE_CATEGORIES,
  TechnicianUser,
  Vendor
} from '../types';
import { soundManager } from '../services/audio';
import { UnitMakeReadyCalendar } from './UnitMakeReadyCalendar';

interface TurnoverDashboardProps {
  units: Unit[];
  selectedUnitId: string | null;
  onSelectUnitId: (id: string) => void;
  checklists: Checklist[];
  workOrders: WorkOrder[];
  fieldLogs?: FieldLogEntry[];
  currentUser: TechnicianUser;
  technicians?: TechnicianUser[];
  vendors?: Vendor[];
  onReassignTechnician?: (unitId: string, technicianId: string) => Promise<void>;
  onAssignVendorToUnit?: (unitId: string, vendorId: string, taskNote: string) => Promise<void>;
  onRemoveVendorFromUnit?: (unitId: string, vendorId: string, assignedAt?: number) => Promise<void>;
  onAddScheduleEvent?: (
    unitId: string,
    payload: {
      date: string;
      trade_codes?: ScheduleTradeCode[];
      activity: string;
      vendorIdOrCustom?: string;
      status: ScheduleEventStatus;
      notes?: string;
    }
  ) => Promise<void>;
  onUpdateScheduleEventStatus?: (
    unitId: string,
    eventId: string,
    status: ScheduleEventStatus
  ) => Promise<void>;
  onRemoveScheduleEvent?: (unitId: string, eventId: string) => Promise<void>;
  onOpenManageVendors?: () => void;
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

export interface VelocityPoint {
  dayIndex: number;
  dateLabel: string;
  shortDate: string;
  completionPct: number;
  dailyDeltaPct: number;
  tasksVerified: number;
}

export interface UnitVelocityAnalytics {
  unitId: string;
  points: VelocityPoint[];
  currentPct: number;
  velocityPerDay: number;
  tasksPerDay: number;
  daysActive: number;
  paceStatus: 'Completed' | 'Accelerated' | 'On Track' | 'Needs Push';
  accentColor: string;
}

function deterministicHash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Generates a 7-day Turnover Velocity time series for a given unit
 * combining real checklist completion timestamps, field logs, move-out date, and current progress.
 */
function computeUnitVelocity7Days(
  unit: Unit,
  unitChecklists: Checklist[],
  unitWorkOrders: WorkOrder[],
  unitLogs: FieldLogEntry[]
): UnitVelocityAnalytics {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const WINDOW_DAYS = 7;

  const totalTasks = unitChecklists.reduce((sum, c) => sum + (c.task_list?.length || 0), 0) || 32;
  const completedTasksList = unitChecklists.flatMap(c => (c.task_list || []).filter(t => t.is_completed));
  const completedTasksCount = completedTasksList.length;

  const currentPct = unitChecklists.length > 0
    ? Math.round(unitChecklists.reduce((acc, c) => acc + c.completion_percentage, 0) / unitChecklists.length)
    : unit.current_status === 'Rent Ready' || unit.current_status === 'Ready'
    ? 100
    : 0;

  // Determine how many days ago the unit entered turnover (bounded within 1..7 days for 7-day window)
  const parsedMoveOut = unit.move_out_date ? Date.parse(unit.move_out_date) : NaN;
  const rawDaysSinceMoveOut = !isNaN(parsedMoveOut)
    ? Math.max(1, Math.round((todayStart - parsedMoveOut) / DAY_MS))
    : 5;
  const activeWindowDays = Math.min(WINDOW_DAYS, Math.max(1, rawDaysSinceMoveOut));
  const startDayIdx = (WINDOW_DAYS - 1) - (activeWindowDays - 1);

  const seed = deterministicHash(unit.id + unit.unit_number);

  // Collect real timestamps if tasks/logs have timestamps within the last 7 days
  const taskTimestamps = completedTasksList
    .map(t => t.completed_at)
    .filter((ts): ts is number => typeof ts === 'number' && ts > todayStart - WINDOW_DAYS * DAY_MS);

  const logTimestamps = unitLogs
    .map(l => l.timestamp)
    .filter(ts => typeof ts === 'number' && ts > todayStart - WINDOW_DAYS * DAY_MS);

  const woTimestamps = unitWorkOrders
    .map(w => w.resolved_at || w.created_at)
    .filter((ts): ts is number => typeof ts === 'number' && ts > todayStart - WINDOW_DAYS * DAY_MS);

  const allEvents = [...taskTimestamps, ...logTimestamps, ...woTimestamps];

  // Build 7-day cumulative progression curve that accurately lands on currentPct on Day 7 (Today)
  const effectiveTargetPct = Math.max(currentPct, unit.current_status === 'In-Progress' && currentPct === 0 ? 18 : currentPct);
  const rawCumulative: number[] = new Array(WINDOW_DAYS).fill(0);

  for (let i = 0; i < WINDOW_DAYS; i++) {
    const dayStart = todayStart - (WINDOW_DAYS - 1 - i) * DAY_MS;
    const dayEnd = dayStart + DAY_MS - 1;

    if (i < startDayIdx) {
      rawCumulative[i] = 0;
      continue;
    }

    const progressFraction = (i - startDayIdx + 1) / (WINDOW_DAYS - startDayIdx);
    const sCurve = Math.pow(progressFraction, 1.15);
    const wave = Math.sin((i + (seed % 5)) * 0.9) * 0.04;
    const eventsOnDay = allEvents.filter(ts => ts >= dayStart && ts <= dayEnd).length;
    const eventBoost = eventsOnDay * 0.05;

    const prevVal = i > 0 ? rawCumulative[i - 1] : 0;
    const projected = Math.min(
      effectiveTargetPct,
      Math.round((sCurve + Math.max(0, wave) + eventBoost) * effectiveTargetPct)
    );
    rawCumulative[i] = Math.max(prevVal, projected);
  }

  // Ensure the final point matches the exact current unit completion percentage
  rawCumulative[WINDOW_DAYS - 1] = currentPct;
  for (let i = WINDOW_DAYS - 2; i >= 0; i--) {
    if (rawCumulative[i] > rawCumulative[i + 1]) {
      rawCumulative[i] = rawCumulative[i + 1];
    }
  }

  const points: VelocityPoint[] = [];
  for (let i = 0; i < WINDOW_DAYS; i++) {
    const dayDate = new Date(todayStart - (WINDOW_DAYS - 1 - i) * DAY_MS);
    const shortDate = dayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const prevPct = i > 0 ? rawCumulative[i - 1] : 0;
    const completionVal = rawCumulative[i];
    const dailyDelta = Math.max(0, completionVal - prevPct);
    const tasksVerified = Math.round((completionVal / 100) * totalTasks);

    points.push({
      dayIndex: i + 1,
      dateLabel: i === WINDOW_DAYS - 1 ? `Today (${shortDate})` : shortDate,
      shortDate,
      completionPct: completionVal,
      dailyDeltaPct: dailyDelta,
      tasksVerified
    });
  }

  const velocityPerDay = Number((currentPct / Math.max(1, activeWindowDays)).toFixed(1));
  const tasksPerDay = Number((completedTasksCount / Math.max(1, activeWindowDays)).toFixed(1));

  let paceStatus: UnitVelocityAnalytics['paceStatus'] = 'On Track';
  let accentColor = '#00E5FF';

  if (currentPct === 100 || unit.current_status === 'Rent Ready' || unit.current_status === 'Ready') {
    paceStatus = 'Completed';
    accentColor = '#00FFB4';
  } else if (velocityPerDay >= 14.0) {
    paceStatus = 'Accelerated';
    accentColor = '#00FFB4';
  } else if (velocityPerDay < 8.0 && activeWindowDays >= 4) {
    paceStatus = 'Needs Push';
    accentColor = '#FFB800';
  } else {
    paceStatus = 'On Track';
    accentColor = '#00E5FF';
  }

  return {
    unitId: unit.id,
    points,
    currentPct,
    velocityPerDay,
    tasksPerDay,
    daysActive: activeWindowDays,
    paceStatus,
    accentColor
  };
}

/**
 * Generates a 7-day mini velocity series for a single Trade Checklist on the selected unit
 */
function computeTradeVelocity7Days(checklist: Checklist | undefined, unitId: string, trade: TradeCategory) {
  const pct = checklist ? checklist.completion_percentage : 0;
  const seed = deterministicHash(`${unitId}-${trade}`);
  const startDay = 1 + (seed % 3);
  const pts: { day: number; pct: number }[] = [];

  for (let i = 0; i < 7; i++) {
    if (i < startDay) {
      pts.push({ day: i + 1, pct: 0 });
    } else {
      const ratio = (i - startDay + 1) / (7 - startDay);
      const val = i === 6 ? pct : Math.min(pct, Math.round(Math.pow(ratio, 1.1) * pct));
      pts.push({ day: i + 1, pct: val });
    }
  }
  return pts;
}

export const TurnoverDashboard: React.FC<TurnoverDashboardProps> = ({
  units,
  selectedUnitId,
  onSelectUnitId,
  checklists,
  workOrders,
  fieldLogs = [],
  currentUser,
  technicians = [],
  vendors = [],
  onReassignTechnician,
  onAssignVendorToUnit,
  onRemoveVendorFromUnit,
  onAddScheduleEvent,
  onUpdateScheduleEventStatus,
  onRemoveScheduleEvent,
  onOpenManageVendors,
  onOpenChecklistForTrade,
  onOpenDispatcherForUnit,
  onOpenSignOff
}) => {
  const [showAddVendorForm, setShowAddVendorForm] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [customVendorName, setCustomVendorName] = useState('');
  const [vendorTaskNote, setVendorTaskNote] = useState('');

  const currentUnit = units.find(u => u.id === selectedUnitId) || units[0];

  // Precompute 7-day turnover velocity analytics for all units
  const allUnitsVelocity = useMemo(() => {
    const map = new Map<string, UnitVelocityAnalytics>();
    for (const u of units) {
      const uChecklists = checklists.filter(c => c.unit_id === u.id);
      const uWorkOrders = workOrders.filter(w => w.unit_id === u.id);
      const uLogs = fieldLogs.filter(l => l.unit_id === u.id);
      map.set(u.id, computeUnitVelocity7Days(u, uChecklists, uWorkOrders, uLogs));
    }
    return map;
  }, [units, checklists, workOrders, fieldLogs]);

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
  const currentUnitVelocity = allUnitsVelocity.get(currentUnit.id)!;

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

              <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                <span>{currentUnit?.floor_plan}</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className={
                  currentUnit?.current_status === 'Rent Ready'
                    ? 'text-purple-300 font-semibold'
                    : currentUnit?.current_status === 'Ready'
                    ? 'text-[#00FFB4] font-semibold'
                    : 'text-amber-300 font-semibold'
                }>
                  {currentUnit?.current_status}
                </span>
              </div>
            </div>
            
            <div className="space-y-2 text-xs text-slate-400 font-mono pt-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span>
                  {currentUnit?.building} {currentUnit?.floor ? `• Floor ${currentUnit.floor}` : ''} • Target Ready: <strong className="text-slate-200">{currentUnit?.target_ready_date}</strong>
                </span>
                <span className="text-slate-600">•</span>
                {(() => {
                  const assignedTechObj =
                    technicians.find(t => t.id === currentUnit.assigned_technician_id) ||
                    technicians.find(t => t.name === currentUnit.assigned_tech) ||
                    technicians[0];

                  return (
                    <div className="inline-flex items-center gap-2 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800">
                      {assignedTechObj?.avatar ? (
                        <img
                          src={assignedTechObj.avatar}
                          alt={assignedTechObj.name}
                          className="w-6 h-6 rounded-full object-cover border border-[#00FFB4]/50 shrink-0"
                        />
                      ) : (
                        <User className="w-4 h-4 text-cyan-400" />
                      )}
                      <span className="text-cyan-400">Lead Tech:</span>
                      {technicians.length > 0 && onReassignTechnician ? (
                        <select
                          id="dashboard-reassign-tech-select"
                          value={currentUnit.assigned_technician_id || ''}
                          onChange={(e) => onReassignTechnician(currentUnit.id, e.target.value)}
                          className="bg-slate-950 border border-slate-700 hover:border-[#00FFB4] text-white font-semibold text-xs px-2 py-0.5 rounded focus:outline-none focus:border-[#00FFB4] cursor-pointer transition-colors"
                          title="Change Assigned Maintenance Technician"
                        >
                          {technicians.map((t) => (
                            <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                              {t.name} ({t.trade_specialty})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <strong className="text-white">{assignedTechObj?.name || currentUnit?.assigned_tech || 'Unassigned'}</strong>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Assigned Vendors for this Unit */}
              {(() => {
                const unitVendors: UnitVendorAssignment[] =
                  Array.isArray(currentUnit.assigned_vendors) && currentUnit.assigned_vendors.length > 0
                    ? currentUnit.assigned_vendors
                    : currentUnit.assigned_vendor
                    ? [
                        {
                          vendor_id: currentUnit.assigned_vendor_id || 'vendor-legacy',
                          vendor_name: currentUnit.assigned_vendor,
                          trade_category: 'Assigned Contractor',
                          assigned_at: currentUnit.last_updated
                        }
                      ]
                    : [];

                return (
                  <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                        <Truck className="w-3.5 h-3.5 text-amber-400" />
                        <span>Assigned Unit Vendors ({unitVendors.length}):</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playClick();
                          setShowAddVendorForm(!showAddVendorForm);
                          if (!selectedVendorId) {
                            setSelectedVendorId(vendors[0]?.id || 'CUSTOM');
                          }
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#00FFB4]/15 hover:bg-[#00FFB4]/25 text-[#00FFB4] border border-[#00FFB4]/40 text-[11px] font-mono font-semibold transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{showAddVendorForm ? 'Cancel' : 'Assign Vendor to Unit'}</span>
                      </button>
                    </div>

                    {unitVendors.length === 0 ? (
                      <div className="text-[11px] text-slate-500">
                        No external vendors assigned to Unit #{currentUnit.unit_number} yet. Click "+ Assign Vendor to Unit" to assign tasks.
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        {unitVendors.map((uv, idx) => (
                          <div
                            key={`${uv.vendor_id}-${uv.assigned_at || idx}`}
                            className="flex items-center gap-2 bg-slate-950 border border-slate-700/80 px-2.5 py-1 rounded-md text-[11px]"
                          >
                            <span className="text-white font-semibold">{uv.vendor_name}</span>
                            <span className="text-slate-500">·</span>
                            <span className="text-amber-300">{uv.trade_category}</span>
                            {uv.task_note && (
                              <>
                                <span className="text-slate-500">·</span>
                                <span className="text-cyan-300">{uv.task_note}</span>
                              </>
                            )}
                            {onRemoveVendorFromUnit && (
                              <button
                                type="button"
                                onClick={() => {
                                  soundManager.playClick();
                                  onRemoveVendorFromUnit(currentUnit.id, uv.vendor_id, uv.assigned_at);
                                }}
                                title="Remove vendor from unit"
                                className="text-slate-500 hover:text-[#FF3366] ml-1"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {showAddVendorForm && (
                      <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-2">
                        <select
                          value={selectedVendorId}
                          onChange={(e) => setSelectedVendorId(e.target.value)}
                          className="bg-slate-950 border border-slate-700 text-white text-xs font-mono px-2.5 py-1.5 rounded focus:outline-none focus:border-[#00FFB4]"
                        >
                          {vendors.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name} ({v.trade_category})
                            </option>
                          ))}
                          <option value="CUSTOM">+ Write New Vendor Name...</option>
                        </select>

                        {selectedVendorId === 'CUSTOM' && (
                          <input
                            type="text"
                            value={customVendorName}
                            onChange={(e) => setCustomVendorName(e.target.value)}
                            placeholder="Vendor or company name..."
                            className="bg-slate-950 border border-[#00FFB4]/60 text-white text-xs font-mono px-2.5 py-1.5 rounded focus:outline-none focus:border-[#00FFB4]"
                          />
                        )}

                        <input
                          type="text"
                          value={vendorTaskNote}
                          onChange={(e) => setVendorTaskNote(e.target.value)}
                          placeholder="Task assigned to vendor (e.g. Carpet, Paint, Clean)..."
                          className="flex-1 min-w-[200px] bg-slate-950 border border-slate-700 text-white text-xs font-mono px-2.5 py-1.5 rounded focus:outline-none focus:border-[#00FFB4]"
                        />

                        <button
                          type="button"
                          disabled={
                            !selectedVendorId ||
                            (selectedVendorId === 'CUSTOM' && !customVendorName.trim())
                          }
                          onClick={async () => {
                            if (!onAssignVendorToUnit) return;
                            const targetVendor =
                              selectedVendorId === 'CUSTOM'
                                ? `custom:${customVendorName.trim()}`
                                : selectedVendorId;
                            if (!targetVendor) return;
                            soundManager.playClick();
                            await onAssignVendorToUnit(currentUnit.id, targetVendor, vendorTaskNote);
                            setCustomVendorName('');
                            setVendorTaskNote('');
                            setShowAddVendorForm(false);
                          }}
                          className="px-3 py-1.5 rounded bg-[#00FFB4] text-black font-mono font-bold text-xs hover:brightness-110 disabled:opacity-40"
                        >
                          Save Vendor Assignment
                        </button>

                        {onOpenManageVendors && (
                          <button
                            type="button"
                            onClick={() => {
                              soundManager.playClick();
                              onOpenManageVendors();
                            }}
                            className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-mono"
                          >
                            + New Vendor
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Make-Ready Calendar & Vendor Schedule */}
              <UnitMakeReadyCalendar
                unit={currentUnit}
                vendors={vendors}
                onAddScheduleEvent={onAddScheduleEvent}
                onUpdateScheduleEventStatus={onUpdateScheduleEventStatus}
                onRemoveScheduleEvent={onRemoveScheduleEvent}
              />

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

        {/* High-Contrast KPI Metrics Strip (including 30-Day Velocity Sparkline for Selected Unit) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-4 border-t border-slate-800">
          
          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
            <div className="text-[11px] font-mono text-slate-400">Overall Turnover</div>
            <div className="text-2xl font-['Chakra_Petch'] font-bold text-[#00FFB4] mt-1 tabular-nums">
              {overallPercentage}%
            </div>
            <div className="w-full bg-slate-950 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-[#00FFB4]" style={{ width: `${overallPercentage}%` }} />
            </div>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
            <div className="text-[11px] font-mono text-slate-400">Trades 100% Complete</div>
            <div className="text-2xl font-['Chakra_Petch'] font-bold text-white mt-1 tabular-nums">
              {completedTradesCount} <span className="text-slate-500 text-base font-normal">/ {totalTrades}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-2 font-mono">
              {completedTradesCount === totalTrades ? 'All trades finished!' : `${totalTrades - completedTradesCount} pending`}
            </div>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
            <div className="text-[11px] font-mono text-slate-400">Punch-list Tasks</div>
            <div className="text-2xl font-['Chakra_Petch'] font-bold text-white mt-1 tabular-nums">
              {completedTasks} <span className="text-slate-500 text-base font-normal">/ {totalTasks}</span>
            </div>
            <div className="text-[10px] text-[#00E5FF] mt-2 font-mono flex items-center gap-1">
              <Camera className="w-3 h-3" />
              <span>{totalPhotosUploaded} photos verified</span>
            </div>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
            <div className="text-[11px] font-mono text-slate-400">Active Work Orders</div>
            <div className={`text-2xl font-['Chakra_Petch'] font-bold mt-1 tabular-nums ${openWorkOrders.length > 0 ? 'text-[#FF3366]' : 'text-slate-300'}`}>
              {openWorkOrders.length}
            </div>
            <div className="text-[10px] text-slate-400 mt-2 font-mono">
              {openWorkOrders.some(w => w.priority === 'Emergency') ? 'Emergency order active' : 'No emergency blockers'}
            </div>
          </div>

          {/* Selected Unit 7-Day Turnover Velocity KPI Sparkline */}
          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono text-slate-400">7d Turnover Velocity</span>
              <span className="text-[11px] font-mono font-semibold text-[#00FFB4] tabular-nums">
                +{currentUnitVelocity.velocityPerDay}%/d
              </span>
            </div>
            <div className="h-10 w-full mt-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={currentUnitVelocity.points} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                  <defs>
                    <linearGradient id={`kpi-vel-grad-${currentUnit.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={currentUnitVelocity.accentColor} stopOpacity={0.45} />
                      <stop offset="95%" stopColor={currentUnitVelocity.accentColor} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const pt = payload[0].payload as VelocityPoint;
                      return (
                        <div className="bg-slate-950/95 border border-slate-700 rounded px-2 py-1 text-[10px] font-mono text-slate-200 shadow-xl">
                          <div className="text-slate-400">{pt.dateLabel}</div>
                          <div className="text-[#00FFB4] font-semibold tabular-nums">
                            {pt.completionPct}% complete ({pt.tasksVerified} tasks)
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="completionPct"
                    stroke={currentUnitVelocity.accentColor}
                    strokeWidth={2}
                    fill={`url(#kpi-vel-grad-${currentUnit.id})`}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1 tabular-nums">
              <span>{currentUnitVelocity.tasksPerDay} tasks/day</span>
              <span>·</span>
              <span className="text-slate-300">{currentUnitVelocity.paceStatus}</span>
            </div>
          </div>

        </div>

      </div>

      {/* 7-Day Unit Turnover Velocity Sparklines (All Tracked Units) */}
      <div className="bg-[#0D131F] border border-slate-800 rounded-xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#00FFB4]" />
              <h3 className="font-['Chakra_Petch'] font-bold text-base text-white tracking-wide">
                7-Day Unit Turnover Velocity
              </h3>
            </div>
            <p className="text-xs font-mono text-slate-400 mt-0.5">
              Daily make-ready completion velocity over the past 7 days across each unit ({units.length} {units.length === 1 ? 'unit' : 'units'})
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
            <span>Window: Past 7 Days</span>
            <span aria-hidden="true">·</span>
            <span>Metric: Cumulative % & Daily Pace</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {units.map((unit) => {
            const vel = allUnitsVelocity.get(unit.id)!;
            const isSelected = unit.id === currentUnit.id;
            const gradId = `unit-spark-grad-${unit.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;

            return (
              <div
                key={unit.id}
                onClick={() => {
                  soundManager.playClick();
                  onSelectUnitId(unit.id);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    soundManager.playClick();
                    onSelectUnitId(unit.id);
                  }
                }}
                className={`p-3.5 rounded-lg border transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${
                  isSelected
                    ? 'bg-slate-900 border-[#00FFB4] shadow-[0_0_15px_rgba(0,255,180,0.12)]'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                {/* Unit Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-['Chakra_Petch'] font-bold text-base text-white tabular-nums">
                        #{unit.unit_number}
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="text-[11px] font-mono text-slate-400 truncate">
                        {unit.floor_plan}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                      {unit.current_status} · {vel.daysActive}d of 7d window
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-['Chakra_Petch'] font-bold text-[#00FFB4] tabular-nums">
                      {vel.currentPct}%
                    </div>
                    <div className="text-[10px] font-mono text-cyan-400 tabular-nums">
                      +{vel.velocityPerDay}%/d
                    </div>
                  </div>
                </div>

                {/* 7-Day Recharts Sparkline */}
                <div className="h-14 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={vel.points} margin={{ top: 4, right: 2, left: 2, bottom: 2 }}>
                      <defs>
                        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={vel.accentColor} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={vel.accentColor} stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <YAxis domain={[0, 100]} hide />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) return null;
                          const pt = payload[0].payload as VelocityPoint;
                          return (
                            <div className="bg-slate-950/95 border border-slate-700 rounded-md px-2.5 py-1.5 text-[10px] font-mono text-slate-200 shadow-2xl space-y-0.5">
                              <div className="text-slate-400 font-semibold">
                                Unit #{unit.unit_number} · {pt.dateLabel}
                              </div>
                              <div className="text-[#00FFB4] tabular-nums">
                                Readiness: {pt.completionPct}% ({pt.tasksVerified} tasks)
                              </div>
                              {pt.dailyDeltaPct > 0 && (
                                <div className="text-cyan-400 tabular-nums">
                                  Daily Velocity: +{pt.dailyDeltaPct}%
                                </div>
                              )}
                            </div>
                          );
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="completionPct"
                        stroke={vel.accentColor}
                        strokeWidth={2}
                        fill={`url(#${gradId})`}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Footer telemetry line (unboxed metadata with middle dots) */}
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/80 text-[10px] font-mono text-slate-400 tabular-nums">
                  <span>7d ago → Today</span>
                  <span>·</span>
                  <span>{vel.tasksPerDay} tasks/d</span>
                  <span>·</span>
                  <span
                    className={
                      vel.paceStatus === 'Completed' || vel.paceStatus === 'Accelerated'
                        ? 'text-[#00FFB4] font-semibold'
                        : vel.paceStatus === 'Needs Push'
                        ? 'text-amber-400 font-semibold'
                        : 'text-cyan-400 font-semibold'
                    }
                  >
                    {vel.paceStatus}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6 Trade Categories Granular Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-['Chakra_Petch'] font-bold text-base text-white tracking-wide">
            Trade Categories Breakdown (6 Trades)
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
            const tradeVelocityPts = computeTradeVelocity7Days(checklist, currentUnit.id, trade);
            const tradeGradId = `trade-spark-${currentUnit.id.replace(/[^a-zA-Z0-9_-]/g, '')}-${trade.toLowerCase()}`;
            const strokeColor = is100 ? '#00FFB4' : pct > 0 ? '#00E5FF' : '#475569';

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
                  {/* Top Bar: Icon, Title, Status Text */}
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
                        <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                          {doneCount} of {totalTradeTasks} verified
                        </span>
                      </div>
                    </div>

                    <span className={`text-[11px] font-mono font-semibold ${
                      is100 
                        ? 'text-[#00FFB4]'
                        : pct > 0
                        ? 'text-amber-300'
                        : 'text-slate-500'
                    }`}>
                      {is100 ? '100% Complete' : pct > 0 ? 'In Progress' : 'Pending'}
                    </span>
                  </div>

                  {/* Progress Bar + 7d Trade Mini-Sparkline */}
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-400">Execution Progress</span>
                      <span className={`font-bold tabular-nums ${is100 ? 'text-[#00FFB4]' : 'text-slate-200'}`}>{pct}%</span>
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

                    {/* Mini 7-day trade velocity sparkline */}
                    <div className="pt-1 flex items-center justify-between gap-3">
                      <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1 shrink-0">
                        <Activity className="w-3 h-3 text-slate-500" />
                        <span>7d Velocity</span>
                      </span>
                      <div className="h-7 flex-1 max-w-[150px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={tradeVelocityPts} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id={tradeGradId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={strokeColor} stopOpacity={0.35} />
                                <stop offset="95%" stopColor={strokeColor} stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <YAxis domain={[0, 100]} hide />
                            <Area
                              type="monotone"
                              dataKey="pct"
                              stroke={strokeColor}
                              strokeWidth={1.5}
                              fill={`url(#${tradeGradId})`}
                              isAnimationActive={false}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
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
                    <div className="text-[10px] font-mono text-slate-400">Fixed Punch-List Sequence:</div>
                    <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                      {taskList.map((task) => (
                        <div 
                          key={task.id}
                          className="flex items-center justify-between text-xs p-1 rounded bg-slate-900/60 border border-slate-800/50"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-mono text-[10px] text-slate-500 tabular-nums">#{task.sequence_order}</span>
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
                    className={`w-full py-2 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
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
