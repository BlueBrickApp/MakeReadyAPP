import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  ArrowRight, 
  ArrowLeft, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  Sparkles,
  ClipboardList,
  Trash2,
  PlusCircle,
  Building,
  RotateCcw,
  Lock,
  X,
  LayoutGrid,
  Columns,
  Eye,
  EyeOff,
  Truck,
  Plus
} from 'lucide-react';
import { 
  Unit, 
  UnitVendorAssignment,
  ScheduleEventStatus,
  ScheduleTradeCode,
  TurnoverStage, 
  Checklist, 
  WorkOrder, 
  TechnicianUser,
  Vendor,
  TRADE_CATEGORIES,
  FLOOR_PLAN_GROUPS
} from '../types';
import { soundManager } from '../services/audio';
import { offlineDB } from '../services/db';
import { UnitMakeReadyCalendar } from './UnitMakeReadyCalendar';

interface UnitPipelineProps {
  units: Unit[];
  checklists: Checklist[];
  workOrders: WorkOrder[];
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
  onSelectUnit: (unitId: string) => void;
  onOpenChecklist: (unitId: string, tradeCategory?: any) => void;
  onOpenDashboard: (unitId: string) => void;
  onMoveStage: (unitId: string, newStage: TurnoverStage) => void;
  onDeleteUnit?: (unitId: string) => void;
  onOpenNewUnit?: () => void;
}

const STAGES: { stage: TurnoverStage; title: string; color: string; desc: string }[] = [
  { 
    stage: 'Inspection', 
    title: 'INSPECTION', 
    color: '#00E5FF', 
    desc: 'Vacated & Initial Intake' 
  },
  { 
    stage: 'In-Progress', 
    title: 'IN-PROGRESS', 
    color: '#FFB800', 
    desc: 'Trades Active On Site' 
  },
  { 
    stage: 'Ready', 
    title: 'READY', 
    color: '#00FFB4', 
    desc: 'All Trades 100% - Pending Sign-Off' 
  },
  { 
    stage: 'Rent Ready', 
    title: 'RENT READY', 
    color: '#A855F7', 
    desc: 'Certified & Keyed for Lease' 
  }
];

export const UnitPipeline: React.FC<UnitPipelineProps> = ({
  units,
  checklists,
  workOrders,
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
  onSelectUnit,
  onOpenChecklist,
  onOpenDashboard,
  onMoveStage,
  onDeleteUnit,
  onOpenNewUnit
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFloorPlan, setFilterFloorPlan] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'board' | 'grid'>('board');
  const [hideEmptyStages, setHideEmptyStages] = useState<boolean>(true);
  const [confirmDeleteUnitId, setConfirmDeleteUnitId] = useState<string | null>(null);
  const [deletePin, setDeletePin] = useState('');
  const [deletePinError, setDeletePinError] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);

  // Inline vendor assignment state per apartment card
  const [addingVendorUnitId, setAddingVendorUnitId] = useState<string | null>(null);
  const [selectedVendorIdForUnit, setSelectedVendorIdForUnit] = useState<string>('');
  const [customVendorNameForUnit, setCustomVendorNameForUnit] = useState<string>('');
  const [vendorTaskForUnit, setVendorTaskForUnit] = useState<string>('');

  const isSupervisor = currentUser.role === 'Maintenance Supervisor';

  const checkSupervisorPin = (pin: string): boolean => {
    const trimmed = pin.trim().toLowerCase();
    const stored = (localStorage.getItem('utt_supervisor_pin') || '').trim().toLowerCase();
    const valid = ['1234', 'supervisor', 'supervisor123', 'super123', 'admin'];
    if (stored) valid.push(stored);
    return valid.includes(trimmed);
  };

  const handleExecuteDelete = async (unit: Unit) => {
    soundManager.playClick();
    setConfirmDeleteUnitId(null);
    setDeletePin('');
    setDeletePinError(false);

    // CRITICAL: Clear search filter so remaining units are immediately visible,
    // preventing the false impression that all units were deleted.
    setSearchQuery('');
    setFilterFloorPlan('all');

    if (onDeleteUnit) {
      await onDeleteUnit(unit.id);
    } else {
      await offlineDB.deleteUnit(unit.id, currentUser);
    }

    const remainingCount = Math.max(0, units.filter(u => u.id !== unit.id).length);
    setDeleteNotice(`Unit #${unit.unit_number} deleted successfully. ${remainingCount} unit${remainingCount === 1 ? '' : 's'} remain in the pipeline.`);
    setTimeout(() => {
      setDeleteNotice(null);
    }, 6000);
  };

  const filteredUnits = units.filter(u => {
    if (!u) return false;
    const q = (searchQuery || '').toLowerCase().trim();
    const unitNum = String(u.unit_number || '').toLowerCase();
    const bldg = String(u.building || '').toLowerCase();
    const matchesSearch = !q || unitNum.includes(q) || bldg.includes(q);
    const matchesFloorPlan = filterFloorPlan === 'all' || u.floor_plan === filterFloorPlan;
    return matchesSearch && matchesFloorPlan;
  });

  const getUnitTradeSummary = (unitId: string) => {
    const unitChecklists = checklists.filter(c => c.unit_id === unitId);
    if (unitChecklists.length === 0) return { overallPct: 0, tradeProgress: [] };

    const totalPct = unitChecklists.reduce((sum, c) => sum + c.completion_percentage, 0);
    const overallPct = Math.round(totalPct / unitChecklists.length);

    const tradeProgress = TRADE_CATEGORIES.map(trade => {
      const chk = unitChecklists.find(c => c.trade_category === trade);
      return {
        trade,
        code: trade.slice(0, 2).toUpperCase(),
        pct: chk ? chk.completion_percentage : 0,
        status: chk ? chk.status : 'pending'
      };
    });

    return { overallPct, tradeProgress };
  };

  const getUnitOpenWorkOrders = (unitId: string) => {
    return workOrders.filter(w => w.unit_id === unitId && w.status !== 'Resolved');
  };

  const getNextStage = (current: TurnoverStage): TurnoverStage | null => {
    const order: TurnoverStage[] = ['Inspection', 'In-Progress', 'Ready', 'Rent Ready'];
    const idx = order.indexOf(current);
    return idx < order.length - 1 ? order[idx + 1] : null;
  };

  const getPrevStage = (current: TurnoverStage): TurnoverStage | null => {
    const order: TurnoverStage[] = ['Inspection', 'In-Progress', 'Ready', 'Rent Ready'];
    const idx = order.indexOf(current);
    return idx > 0 ? order[idx - 1] : null;
  };

  const renderUnitCard = (unit: Unit, inGridMode: boolean = false) => {
    const { overallPct, tradeProgress } = getUnitTradeSummary(unit.id);
    const openWOs = getUnitOpenWorkOrders(unit.id);
    const hasEmergencyWO = openWOs.some(w => w.priority === 'Emergency' || w.priority === 'High');
    const nextStage = getNextStage(unit.current_status);
    const prevStage = getPrevStage(unit.current_status);
    const stageInfo = STAGES.find(s => s.stage === unit.current_status);

    return (
      <div
        key={unit.id}
        className="group bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-[#00FFB4]/50 rounded-lg p-3.5 transition-all shadow-md hover:shadow-[0_0_20px_rgba(0,255,180,0.12)] space-y-3"
      >
        {/* Top: Unit #, Floor Plan, Building, Stage badge if in grid mode */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-['Chakra_Petch'] font-bold text-lg text-white group-hover:text-[#00FFB4] transition-colors">
                #{unit.unit_number}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                {unit.floor_plan}
              </span>
              {inGridMode && stageInfo && (
                <span 
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold"
                  style={{
                    backgroundColor: `${stageInfo.color}15`,
                    color: stageInfo.color,
                    border: `1px solid ${stageInfo.color}40`
                  }}
                >
                  {stageInfo.title}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {unit.building} • Fl {unit.floor}
            </p>

            {/* Maintenance Technician Photo + Selector */}
            {(() => {
              const assignedTechObj =
                technicians.find(t => t.id === unit.assigned_technician_id) ||
                technicians.find(t => t.name === unit.assigned_tech) ||
                technicians[0];

              return (
                <div className="flex items-center gap-2 mt-2 bg-slate-950/70 p-1.5 rounded-lg border border-slate-800/90">
                  {assignedTechObj?.avatar ? (
                    <img
                      src={assignedTechObj.avatar}
                      alt={assignedTechObj.name}
                      className="w-7 h-7 rounded-full object-cover border border-[#00FFB4]/50 shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-slate-800 border border-[#00FFB4]/40 flex items-center justify-center text-[10px] font-mono font-bold text-[#00FFB4] shrink-0">
                      {(unit.assigned_tech || 'T').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-[9px] text-cyan-400 font-mono leading-tight">Maintenance Tech</div>
                    {technicians.length > 0 && onReassignTechnician ? (
                      <select
                        id={`select-unit-tech-${unit.unit_number}`}
                        value={unit.assigned_technician_id || ''}
                        onChange={(e) => {
                          e.stopPropagation();
                          onReassignTechnician(unit.id, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        title="Change assigned Maintenance Technician"
                        className="w-full bg-transparent text-slate-100 text-[11px] font-mono font-semibold focus:outline-none cursor-pointer truncate"
                      >
                        {technicians.map((t) => (
                          <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                            {t.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-[11px] text-slate-100 font-mono font-semibold truncate">
                        {assignedTechObj?.name || unit.assigned_tech || 'Unassigned'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Assigned Vendors & Tasks for this Apartment Unit */}
            {(() => {
              const unitVendors: UnitVendorAssignment[] = Array.isArray(unit.assigned_vendors) && unit.assigned_vendors.length > 0
                ? unit.assigned_vendors
                : unit.assigned_vendor
                ? [
                    {
                      vendor_id: unit.assigned_vendor_id || 'vendor-legacy',
                      vendor_name: unit.assigned_vendor,
                      trade_category: 'Assigned Contractor',
                      assigned_at: unit.last_updated
                    }
                  ]
                : [];

              const isAddingThisUnit = addingVendorUnitId === unit.id;

              return (
                <div
                  className="mt-2 p-2 rounded-lg bg-slate-950/70 border border-slate-800/90 space-y-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-amber-300 flex items-center gap-1 font-semibold">
                      <Truck className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>Assigned Vendors ({unitVendors.length})</span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        soundManager.playClick();
                        if (isAddingThisUnit) {
                          setAddingVendorUnitId(null);
                        } else {
                          setAddingVendorUnitId(unit.id);
                          setSelectedVendorIdForUnit(vendors[0]?.id || 'CUSTOM');
                          setCustomVendorNameForUnit('');
                          setVendorTaskForUnit('');
                        }
                      }}
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#00FFB4]/15 hover:bg-[#00FFB4]/25 text-[#00FFB4] border border-[#00FFB4]/40 text-[10px] font-mono font-semibold transition-colors"
                      title="Assign a Vendor & Task to this Apartment"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{isAddingThisUnit ? 'Cancel' : 'Add Vendor'}</span>
                    </button>
                  </div>

                  {unitVendors.length === 0 ? (
                    <div className="text-[10px] font-mono text-slate-500">
                      No vendor assigned yet
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {unitVendors.map((uv, idx) => (
                        <div
                          key={`${uv.vendor_id}-${uv.assigned_at || idx}`}
                          className="flex items-start justify-between gap-1.5 bg-slate-900/90 px-2 py-1 rounded border border-slate-800 text-[10px] font-mono"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-slate-100 font-semibold truncate">
                              {uv.vendor_name}
                            </div>
                            <div className="text-slate-400 text-[9px] truncate">
                              {uv.trade_category}
                              {uv.task_note ? ` · ${uv.task_note}` : ''}
                            </div>
                          </div>
                          {onRemoveVendorFromUnit && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                soundManager.playClick();
                                onRemoveVendorFromUnit(unit.id, uv.vendor_id, uv.assigned_at);
                              }}
                              title="Remove vendor from unit"
                              className="text-slate-500 hover:text-[#FF3366] px-1 shrink-0"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {isAddingThisUnit && (
                    <div className="pt-1.5 border-t border-slate-800 space-y-1.5">
                      <select
                        value={selectedVendorIdForUnit}
                        onChange={(e) => setSelectedVendorIdForUnit(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-[10px] font-mono px-2 py-1 rounded focus:outline-none focus:border-[#00FFB4]"
                      >
                        {vendors.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} ({v.trade_category})
                          </option>
                        ))}
                        <option value="CUSTOM">+ Write New Vendor Name...</option>
                      </select>

                      {selectedVendorIdForUnit === 'CUSTOM' && (
                        <input
                          type="text"
                          value={customVendorNameForUnit}
                          onChange={(e) => setCustomVendorNameForUnit(e.target.value)}
                          placeholder="Vendor or company name..."
                          className="w-full bg-slate-900 border border-[#00FFB4]/60 text-white text-[10px] font-mono px-2 py-1 rounded focus:outline-none focus:border-[#00FFB4]"
                        />
                      )}

                      <input
                        type="text"
                        value={vendorTaskForUnit}
                        onChange={(e) => setVendorTaskForUnit(e.target.value)}
                        placeholder="Assigned task (e.g. Paint, Carpet, Clean)..."
                        className="w-full bg-slate-900 border border-slate-700 text-white text-[10px] font-mono px-2 py-1 rounded focus:outline-none focus:border-[#00FFB4]"
                      />

                      <div className="flex items-center justify-between gap-1.5">
                        {onOpenManageVendors && (
                          <button
                            type="button"
                            onClick={() => {
                              soundManager.playClick();
                              onOpenManageVendors();
                            }}
                            className="text-[9px] font-mono text-cyan-400 hover:underline"
                          >
                            Manage Directory
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={
                            !selectedVendorIdForUnit ||
                            (selectedVendorIdForUnit === 'CUSTOM' && !customVendorNameForUnit.trim())
                          }
                          onClick={async () => {
                            if (!onAssignVendorToUnit) return;
                            const targetVendor =
                              selectedVendorIdForUnit === 'CUSTOM'
                                ? `custom:${customVendorNameForUnit.trim()}`
                                : selectedVendorIdForUnit;
                            if (!targetVendor) return;
                            soundManager.playClick();
                            await onAssignVendorToUnit(unit.id, targetVendor, vendorTaskForUnit);
                            setAddingVendorUnitId(null);
                            setCustomVendorNameForUnit('');
                            setVendorTaskForUnit('');
                          }}
                          className="ml-auto px-2.5 py-1 rounded bg-[#00FFB4] text-black font-mono font-bold text-[10px] hover:brightness-110 disabled:opacity-40"
                        >
                          Save Vendor
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Mini Make-Ready Calendar & Vendor Schedule Dropdown */}
            <UnitMakeReadyCalendar
              unit={unit}
              vendors={vendors}
              onAddScheduleEvent={onAddScheduleEvent}
              onUpdateScheduleEventStatus={onUpdateScheduleEventStatus}
              onRemoveScheduleEvent={onRemoveScheduleEvent}
            />

            {unit.notes && (
              <p className="text-[10px] text-slate-400 italic line-clamp-1 mt-1 bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800/80">
                "{unit.notes}"
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Emergency / Open Work Orders Flag */}
            {openWOs.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 ${
                hasEmergencyWO 
                  ? 'bg-[#FF3366]/20 text-[#FF3366] border border-[#FF3366]/40 animate-pulse' 
                  : 'bg-[#FFB800]/20 text-[#FFB800] border border-[#FFB800]/40'
              }`}>
                <AlertCircle className="w-3 h-3" />
                <span>{openWOs.length} WO</span>
              </span>
            )}

            {/* Delete Unit Button - Protected by Supervisor Password */}
            <div className="relative">
              {confirmDeleteUnitId === unit.id ? (
                <div 
                  className="flex items-center gap-1.5 bg-red-950/95 border border-red-500/80 rounded px-2 py-1 z-30 shadow-2xl animate-scaleUp"
                  onClick={(e) => e.stopPropagation()}
                >
                  {isSupervisor ? (
                    <>
                      <span className="text-[10px] font-mono text-red-200 font-bold">Remove #{unit.unit_number}?</span>
                      <button
                        id={`confirm-delete-unit-${unit.id}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExecuteDelete(unit);
                        }}
                        className="px-1.5 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white text-[9px] font-mono font-bold"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          soundManager.playClick();
                          setConfirmDeleteUnitId(null);
                        }}
                        className="px-1 py-0.5 text-slate-400 hover:text-white text-[9px]"
                      >
                        No
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                      <input
                        type="password"
                        placeholder="Supervisor Password"
                        value={deletePin}
                        autoFocus
                        onChange={(e) => {
                          setDeletePin(e.target.value);
                          if (deletePinError) setDeletePinError(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (checkSupervisorPin(deletePin)) {
                              handleExecuteDelete(unit);
                            } else {
                              soundManager.playAlert();
                              setDeletePinError(true);
                            }
                          }
                        }}
                        className={`w-24 px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-900 border ${
                          deletePinError ? 'border-red-500 text-red-300' : 'border-slate-600 text-white'
                        } focus:outline-none focus:border-amber-400`}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (checkSupervisorPin(deletePin)) {
                            handleExecuteDelete(unit);
                          } else {
                            soundManager.playAlert();
                            setDeletePinError(true);
                          }
                        }}
                        className="px-1.5 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white text-[9px] font-mono font-bold"
                      >
                        Del
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          soundManager.playClick();
                          setConfirmDeleteUnitId(null);
                          setDeletePin('');
                          setDeletePinError(false);
                        }}
                        className="px-1 py-0.5 text-slate-400 hover:text-white text-[9px]"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  id={`delete-unit-btn-${unit.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    soundManager.playClick();
                    setConfirmDeleteUnitId(unit.id);
                    setDeletePin('');
                    setDeletePinError(false);
                  }}
                  title={`Delete unit #${unit.unit_number} (Supervisor Authorization Required)`}
                  className="p-1 rounded text-slate-500 hover:text-[#FF3366] hover:bg-slate-800 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-slate-400">Make-Ready Completion</span>
            <span className="text-[#00FFB4] font-bold">{overallPct}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${overallPct}%`,
                backgroundColor: overallPct === 100 ? '#00FFB4' : '#00E5FF',
                boxShadow: overallPct === 100 ? '0 0 10px #00FFB4' : 'none'
              }}
            />
          </div>
        </div>

        {/* 6 Trade Mini Badges (P, E, H, Pt, F, C) */}
        <div className="space-y-1 pt-1 border-t border-slate-800/80">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex justify-between">
            <span>Trades Progress</span>
            <span className="text-[9px] text-slate-500">6 Categories</span>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {tradeProgress.map((tp) => {
              const isComplete = tp.pct === 100;
              const isStarted = tp.pct > 0;
              return (
                <button
                  key={tp.trade}
                  onClick={() => {
                    soundManager.playClick();
                    onOpenChecklist(unit.id, tp.trade);
                  }}
                  title={`${tp.trade}: ${tp.pct}% completed`}
                  className={`py-1 rounded text-center text-[10px] font-mono font-bold transition-all ${
                    isComplete
                      ? 'bg-[#00FFB4]/20 text-[#00FFB4] border border-[#00FFB4]/50'
                      : isStarted
                      ? 'bg-[#FFB800]/20 text-[#FFB800] border border-[#FFB800]/50'
                      : 'bg-slate-950 text-slate-500 border border-slate-800'
                  }`}
                >
                  {tp.code}
                </button>
              );
            })}
          </div>
        </div>

        {/* Target Ready Date */}
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span className="flex items-center gap-1 text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Target:</span>
          </span>
          <span className="text-slate-200 font-semibold">{unit.target_ready_date}</span>
        </div>

        {/* Card Navigation & Stage Actions */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              id={`unit-dash-btn-${unit.unit_number}`}
              onClick={() => {
                soundManager.playClick();
                onOpenDashboard(unit.id);
              }}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 font-medium transition-colors"
            >
              Trades
            </button>
            <button
              id={`unit-punch-btn-${unit.unit_number}`}
              onClick={() => {
                soundManager.playClick();
                onOpenChecklist(unit.id);
              }}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-[#00FFB4]/20 hover:text-[#00FFB4] text-[11px] text-slate-300 font-medium transition-colors flex items-center gap-1"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Punch</span>
            </button>
          </div>

          {/* Stage Transition Buttons */}
          <div className="flex items-center gap-1">
            {prevStage && (
              <button
                onClick={() => {
                  soundManager.playClick();
                  onMoveStage(unit.id, prevStage);
                }}
                title={`Revert to ${prevStage}`}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            )}

            {nextStage && (
              <button
                onClick={() => {
                  soundManager.playClick();
                  onMoveStage(unit.id, nextStage);
                }}
                title={`Advance to ${nextStage}`}
                className="flex items-center gap-1 px-2 py-1 rounded bg-[#00FFB4]/15 hover:bg-[#00FFB4]/30 text-[#00FFB4] border border-[#00FFB4]/40 text-[11px] font-semibold"
              >
                <span>Advance</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header Controls & Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-['Chakra_Petch'] font-bold text-white tracking-wide">
              PIPELINE WORKFLOW
            </h2>
            <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-[#00FFB4]/10 text-[#00FFB4] border border-[#00FFB4]/30">
              {searchQuery || filterFloorPlan !== 'all' 
                ? `${filteredUnits.length} OF ${units.length} UNITS` 
                : `${units.length} UNITS TRACKED`}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Turnover stage progression across make-ready lifecycle
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="pipeline-search-input"
              type="text"
              placeholder="Search unit # or bldg..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-[#00FFB4] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setSearchQuery('');
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterFloorPlan}
              onChange={(e) => setFilterFloorPlan(e.target.value)}
              aria-label="Filter by floor plan"
              className="bg-transparent text-slate-300 text-xs focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-white">All Floor Plans</option>
              {FLOOR_PLAN_GROUPS.map((group) => (
                <optgroup key={group.category} label={group.category} className="bg-slate-900 text-[#00FFB4] font-bold">
                  {group.options.map((option) => (
                    <option key={option} value={option} className="bg-slate-950 text-white font-normal">
                      {option}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Toggle to Hide Empty Stages in Board View */}
          {viewMode === 'board' && (
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setHideEmptyStages(!hideEmptyStages);
              }}
              title={hideEmptyStages ? "Show all stages including empty ones" : "Hide stages that currently have no units"}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                hideEmptyStages
                  ? 'bg-[#00FFB4]/15 border-[#00FFB4]/50 text-[#00FFB4]'
                  : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {hideEmptyStages ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{hideEmptyStages ? 'Empty Stages Hidden' : 'Show All Stages'}</span>
            </button>
          )}

          {/* View Mode Switch: Stages vs Units Grid */}
          <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setViewMode('board');
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                viewMode === 'board'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Pipeline stages layout"
            >
              <Columns className="w-3.5 h-3.5 text-[#00FFB4]" />
              <span>Stages</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setViewMode('grid');
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Clean grid of only existing units without empty columns"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-[#00FFB4]" />
              <span>Units Grid</span>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Success Notice Banner */}
      {deleteNotice && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#00FFB4]/10 border border-[#00FFB4]/30 text-[#00FFB4] text-xs font-mono animate-fadeIn shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#00FFB4] shrink-0" />
            <span>{deleteNotice}</span>
          </div>
          <button 
            type="button"
            onClick={() => setDeleteNotice(null)}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Active Filter Bar */}
      {(searchQuery || filterFloorPlan !== 'all') && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-300">
            <Search className="w-3.5 h-3.5 text-[#00FFB4]" />
            <span>
              Active filter: {searchQuery && <span>Search: <strong className="text-white">"{searchQuery}"</strong></span>}
              {searchQuery && filterFloorPlan !== 'all' && ' • '}
              {filterFloorPlan !== 'all' && <span>Floor plan: <strong className="text-[#00FFB4]">{filterFloorPlan}</strong></span>}
              <span className="text-slate-400 ml-2 font-normal">
                ({filteredUnits.length} of {units.length} units match)
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setSearchQuery('');
              setFilterFloorPlan('all');
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[#00FFB4] hover:text-white text-xs font-semibold border border-slate-700 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear Filter (Show All {units.length} Units)</span>
          </button>
        </div>
      )}

      {/* When units exist in DB but 0 match the search query */}
      {units.length > 0 && filteredUnits.length === 0 && (
        <div className="p-8 rounded-xl bg-slate-900/80 border border-dashed border-amber-500/40 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <Search className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-['Chakra_Petch'] font-bold text-white">
              NO UNITS MATCH "{searchQuery || filterFloorPlan}"
            </p>
            <p className="text-xs text-slate-400 font-mono">
              You have {units.length} active unit{units.length === 1 ? '' : 's'} registered in your database. None match your current search query.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setSearchQuery('');
              setFilterFloorPlan('all');
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#00FFB4] text-black font-bold text-xs font-mono hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(0,255,180,0.2)]"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear Search & View All {units.length} Units</span>
          </button>
        </div>
      )}

      {/* Zero State if no units exist in database */}
      {units.length === 0 ? (
        <div className="bg-[#0D131F] rounded-2xl border border-dashed border-slate-700/80 p-8 sm:p-14 text-center max-w-xl mx-auto space-y-5 shadow-2xl my-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#00FFB4]/10 border border-[#00FFB4]/30 flex items-center justify-center text-[#00FFB4] shadow-[0_0_25px_rgba(0,255,180,0.2)]">
            <Building className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="font-['Chakra_Petch'] font-bold text-xl text-white tracking-wide">
              FIREBASE DATABASE READY
            </h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
              The pipeline is connected and synchronized in real time across all devices. Register your units to track turnover velocity and 6 sequential maintenance trades.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            {onOpenNewUnit && (
              <button
                id="zero-state-register-unit-btn"
                onClick={() => {
                  soundManager.playClick();
                  onOpenNewUnit();
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#00FFB4] text-black font-bold text-xs tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(0,255,180,0.3)]"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ REGISTER FIRST UNIT</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* View Rendering: Grid of Active Units OR Pipeline Stages */
        viewMode === 'grid' ? (
          /* Clean Grid of Only Active Units */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            {filteredUnits.map((unit) => renderUnitCard(unit, true))}
          </div>
        ) : (
          /* Pipeline Stages (Board) */
          (() => {
            const activeStages = STAGES.filter(col => filteredUnits.some(u => u.current_status === col.stage));
            const stagesToRender = (hideEmptyStages && activeStages.length > 0) ? activeStages : STAGES;

            const gridColsClass = 
              stagesToRender.length === 1
                ? 'grid-cols-1'
                : stagesToRender.length === 2
                ? 'grid-cols-1 md:grid-cols-2'
                : stagesToRender.length === 3
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';

            return (
              <div className={`grid ${gridColsClass} gap-4 items-start`}>
                {stagesToRender.map((col) => {
                  const colUnits = filteredUnits.filter(u => u.current_status === col.stage);
                  const isSingleColumn = stagesToRender.length === 1;

                  return (
                    <div 
                      key={col.stage}
                      className="bg-[#0D131F] rounded-xl border border-slate-800/90 flex flex-col min-h-[300px] shadow-lg"
                    >
                      {/* Column Header */}
                      <div 
                        className="p-3.5 border-b border-slate-800 flex items-center justify-between"
                        style={{ borderTop: `3px solid ${col.color}` }}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span 
                              className="w-2 h-2 rounded-full animate-pulse" 
                              style={{ backgroundColor: col.color, boxShadow: `0 0 8px ${col.color}` }} 
                            />
                            <h3 className="font-['Chakra_Petch'] font-bold text-sm tracking-wider text-white">
                              {col.title}
                            </h3>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{col.desc}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-900 text-slate-300 border border-slate-700">
                          {colUnits.length}
                        </span>
                      </div>

                      {/* Column Cards Container */}
                      <div className="p-3 flex-1 overflow-y-auto">
                        {colUnits.length === 0 ? (
                          <div className="py-8 px-4 text-center text-slate-500 text-xs font-mono">
                            <div>No active units in {col.title}</div>
                          </div>
                        ) : (
                          <div className={isSingleColumn && colUnits.length > 1 ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" : "space-y-3"}>
                            {colUnits.map((unit) => renderUnitCard(unit, false))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()
        )
      )}

    </div>
  );
};
