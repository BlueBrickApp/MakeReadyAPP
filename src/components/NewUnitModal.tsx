import React, { useState } from 'react';
import { 
  X, 
  Building, 
  Calendar, 
  User, 
  Layers, 
  PlusCircle, 
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  Key,
  Shield,
  Trash2,
  Plus,
  Briefcase,
  Clock,
  Sparkles
} from 'lucide-react';
import { 
  Unit, 
  TechnicianUser, 
  Vendor, 
  FLOOR_PLAN_GROUPS, 
  UnitVendorAssignment, 
  UnitScheduleEvent, 
  ScheduleEventStatus, 
  ScheduleTradeCode,
  parseUnitFloorPlanDetails
} from '../types';
import { ACTIVE_TECHNICIANS, ACTIVE_VENDORS } from '../services/db';
import { soundManager } from '../services/audio';

export interface IntakeVendorItem {
  id: string;
  vendorId: string;
  vendorName: string;
  tradeCategory: string;
  scheduledDate: string; // YYYY-MM-DD
  taskNote: string;
}

interface NewUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: TechnicianUser;
  technicians?: TechnicianUser[];
  vendors?: Vendor[];
  onSwitchToSupervisor?: () => void;
  onCreateUnit: (unitData: Omit<Unit, 'id' | 'last_updated'>) => Promise<void>;
}

export const NewUnitModal: React.FC<NewUnitModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  technicians,
  vendors,
  onCreateUnit
}) => {
  const [unitNumber, setUnitNumber] = useState('');
  const [floorPlan, setFloorPlan] = useState<Unit['floor_plan']>('A1 — 675 SF');
  const [building, setBuilding] = useState('Cedar Ridge - Bldg B');
  const [floor, setFloor] = useState<number>(2);
  const [assignedTechId, setAssignedTechId] = useState(currentUser.id);
  const [moveOutDate, setMoveOutDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetReadyDate, setTargetReadyDate] = useState(
    new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');

  // Multi-Vendor Intake State & Scheduled Work Dates
  const [intakeVendors, setIntakeVendors] = useState<IntakeVendorItem[]>([]);
  const [draftVendorSelect, setDraftVendorSelect] = useState<string>(''); // vendor id, 'CUSTOM', or ''
  const [draftCustomName, setDraftCustomName] = useState<string>('');
  const [draftTradeCategory, setDraftTradeCategory] = useState<string>('Painting');
  const [draftScheduledDate, setDraftScheduledDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [draftTaskNote, setDraftTaskNote] = useState<string>('');
  const [vendorInputError, setVendorInputError] = useState<string | null>(null);
  
  // Supervisor Password / Authorization State
  const [supervisorPassword, setSupervisorPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Change Password Modal/Mode State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPwdForChange, setCurrentPwdForChange] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changePwdSuccess, setChangePwdSuccess] = useState<string | null>(null);
  const [changePwdError, setChangePwdError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isCurrentSupervisor = currentUser.role === 'Maintenance Supervisor';
  const availableVendors = vendors && vendors.length > 0 ? vendors : ACTIVE_VENDORS;

  const checkSupervisorPassword = (pwd: string): boolean => {
    const trimmed = pwd.trim();
    if (!trimmed) return false;
    const storedPin = (localStorage.getItem('utt_supervisor_pin') || '').trim();
    if (storedPin) {
      return trimmed === storedPin || trimmed.toLowerCase() === storedPin.toLowerCase();
    }
    // Default fallback initial password
    return trimmed === '1234' || trimmed.toLowerCase() === 'supervisor123' || trimmed.toLowerCase() === 'admin';
  };

  const isPasswordValid = checkSupervisorPassword(supervisorPassword);

  const handleVendorSelectChange = (val: string) => {
    setDraftVendorSelect(val);
    setVendorInputError(null);
    if (val && val !== 'CUSTOM') {
      const matched = availableVendors.find(v => v.id === val);
      if (matched) {
        setDraftTradeCategory(matched.trade_category);
        if (!draftTaskNote) {
          const lower = matched.trade_category.toLowerCase();
          if (lower.includes('paint')) {
            setDraftTaskNote('Full unit paint & touch-up');
          } else if (lower.includes('carpet')) {
            setDraftTaskNote('Carpet service & installation');
          } else if (lower.includes('clean') || lower.includes('housekeep') || lower.includes('hk')) {
            setDraftTaskNote('Deep make-ready turnover clean');
          } else if (lower.includes('floor')) {
            setDraftTaskNote('Vinyl plank flooring installation');
          } else {
            setDraftTaskNote(`${matched.trade_category} make-ready`);
          }
        }
      }
    }
  };

  const handleAddVendor = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setVendorInputError(null);

    let resolvedName = '';
    let resolvedId = '';

    if (draftVendorSelect === 'CUSTOM') {
      if (!draftCustomName.trim()) {
        soundManager.playAlert();
        setVendorInputError('Please enter the custom contractor / vendor name.');
        return;
      }
      resolvedName = draftCustomName.trim();
      resolvedId = `custom-${Date.now()}`;
    } else if (draftVendorSelect) {
      const matched = availableVendors.find(v => v.id === draftVendorSelect);
      if (matched) {
        resolvedName = matched.name;
        resolvedId = matched.id;
      }
    } else if (draftCustomName.trim()) {
      resolvedName = draftCustomName.trim();
      resolvedId = `custom-${Date.now()}`;
    }

    if (!resolvedName) {
      soundManager.playAlert();
      setVendorInputError('Please select a vendor or enter a custom vendor name.');
      return;
    }

    if (!draftScheduledDate) {
      soundManager.playAlert();
      setVendorInputError('Please specify the scheduled work date for this vendor.');
      return;
    }

    const newEntry: IntakeVendorItem = {
      id: `intake-ven-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      vendorId: resolvedId,
      vendorName: resolvedName,
      tradeCategory: draftTradeCategory || 'General Make-Ready',
      scheduledDate: draftScheduledDate,
      taskNote: draftTaskNote.trim()
    };

    setIntakeVendors(prev => [...prev, newEntry]);
    soundManager.playSyncSuccess();

    // Reset draft fields for another vendor
    setDraftVendorSelect('');
    setDraftCustomName('');
    setDraftTaskNote('');
    setVendorInputError(null);
  };

  const handleRemoveVendor = (id: string) => {
    soundManager.playClick();
    setIntakeVendors(prev => prev.filter(v => v.id !== id));
  };

  const handleSaveNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setChangePwdError(null);
    setChangePwdSuccess(null);

    // Validate current password first
    if (!checkSupervisorPassword(currentPwdForChange)) {
      soundManager.playAlert();
      setChangePwdError('Current password is incorrect.');
      return;
    }

    if (!newPassword.trim()) {
      soundManager.playAlert();
      setChangePwdError('New password cannot be empty.');
      return;
    }

    if (newPassword.trim().length < 4) {
      soundManager.playAlert();
      setChangePwdError('New password must be at least 4 characters.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      soundManager.playAlert();
      setChangePwdError('New passwords do not match.');
      return;
    }

    // Save new supervisor password in localStorage
    localStorage.setItem('utt_supervisor_pin', newPassword.trim());
    soundManager.playSyncSuccess();
    setChangePwdSuccess('Password updated successfully!');
    setSupervisorPassword(newPassword.trim());
    setCurrentPwdForChange('');
    setNewPassword('');
    setConfirmNewPassword('');
    setTimeout(() => {
      setIsChangingPassword(false);
      setChangePwdSuccess(null);
    }, 1200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!unitNumber.trim()) {
      setAuthError('Please enter a valid Unit Number.');
      return;
    }

    // Enforce Supervisor Password Check
    if (!checkSupervisorPassword(supervisorPassword)) {
      soundManager.playAlert();
      setAuthError('Supervisor password required. Enter authorized password (e.g. 1234 or supervisor123).');
      return;
    }

    setIsSubmitting(true);
    soundManager.playSyncSuccess();
    try {
      // Collect vendors: already added + any currently typed in the draft inputs
      const combinedVendors: IntakeVendorItem[] = [...intakeVendors];
      if (draftVendorSelect || draftCustomName.trim()) {
        let resolvedName = '';
        let resolvedId = '';
        if (draftVendorSelect === 'CUSTOM' || (!draftVendorSelect && draftCustomName.trim())) {
          resolvedName = draftCustomName.trim();
          resolvedId = `custom-${Date.now()}`;
        } else {
          const matched = availableVendors.find(v => v.id === draftVendorSelect);
          if (matched) {
            resolvedName = matched.name;
            resolvedId = matched.id;
          }
        }

        if (resolvedName) {
          combinedVendors.push({
            id: `intake-draft-${Date.now()}`,
            vendorId: resolvedId,
            vendorName: resolvedName,
            tradeCategory: draftTradeCategory || 'General Make-Ready',
            scheduledDate: draftScheduledDate || moveOutDate,
            taskNote: draftTaskNote.trim()
          });
        }
      }

      // Convert to UnitVendorAssignment list
      const mappedVendors: UnitVendorAssignment[] = combinedVendors.map(v => ({
        vendor_id: v.vendorId,
        vendor_name: v.vendorName,
        trade_category: v.tradeCategory,
        task_note: v.taskNote.trim() || undefined,
        scheduled_date: v.scheduledDate || undefined,
        assigned_at: Date.now()
      }));

      // Generate initial calendar schedule events from vendor assignments with scheduled dates
      const initialScheduleEvents: UnitScheduleEvent[] = combinedVendors
        .filter(v => !!v.scheduledDate)
        .map((v, idx) => {
          const lower = v.tradeCategory.toLowerCase();
          const trade_codes: ScheduleTradeCode[] = [];
          if (lower.includes('punch')) trade_codes.push('PC');
          else if (lower.includes('carpet')) trade_codes.push('CP');
          else if (lower.includes('floor')) trade_codes.push('FL');
          else if (lower.includes('clean') || lower.includes('housekeep') || lower.includes('hk')) trade_codes.push('HK');
          else if (lower.includes('paint')) trade_codes.push('PA');

          return {
            id: `sched-intake-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            date: v.scheduledDate,
            trade_codes: trade_codes.length > 0 ? trade_codes : undefined,
            activity: v.taskNote.trim() || `${v.tradeCategory} - ${v.vendorName}`,
            vendor_id: v.vendorId,
            vendor_name: v.vendorName,
            status: 'Scheduled' as ScheduleEventStatus,
            notes: v.taskNote.trim() ? `Scheduled at intake: ${v.taskNote.trim()}` : undefined,
            created_at: Date.now()
          };
        });

      await onCreateUnit({
        unit_number: unitNumber.trim(),
        current_status: 'Inspection',
        floor_plan: floorPlan,
        building,
        floor: Number(floor),
        assigned_technician_id: assignedTechId,
        assigned_vendor_id: mappedVendors[0]?.vendor_id || '',
        assigned_vendor: mappedVendors[0]?.vendor_name || '',
        assigned_vendors: mappedVendors,
        schedule_events: initialScheduleEvents,
        move_out_date: moveOutDate,
        target_ready_date: targetReadyDate,
        notes: notes.trim() || 'Unit turnover intake initiated.'
      });
      onClose();
    } catch (err) {
      console.error(err);
      setAuthError('Failed to create unit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fpDetails = parseUnitFloorPlanDetails(floorPlan);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col bg-[#0D131F] border border-slate-700 rounded-2xl overflow-hidden shadow-2xl my-auto animate-scaleUp">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#00FFB4]/15 text-[#00FFB4] border border-[#00FFB4]/30">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-['Chakra_Petch'] font-bold text-lg text-white">
                NEW UNIT TURNOVER INTAKE
              </h3>
              <p className="text-xs font-mono text-slate-400">
                Initializes 6 trade workflows & tracking punch-list
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-sans overflow-y-auto flex-1">
          
          {/* Unit Number & Floor Plan */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-slate-300 font-mono text-[11px] font-semibold">
                Unit Number *
              </label>
              <input
                id="input-unit-number"
                type="text"
                required
                placeholder="e.g. 504"
                value={unitNumber}
                onChange={(e) => {
                  setUnitNumber(e.target.value);
                  if (authError) setAuthError(null);
                }}
                className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-['Chakra_Petch'] font-bold text-base focus:outline-none focus:border-[#00FFB4]"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-slate-300 font-mono text-[11px]">Floor Plan *</label>
                <span className="text-[10px] font-mono text-[#00FFB4] font-semibold">
                  Class {fpDetails.unitClass} • {fpDetails.squareFeetText}
                </span>
              </div>
              <select
                id="select-floor-plan"
                value={floorPlan}
                onChange={(e) => setFloorPlan(e.target.value as Unit['floor_plan'])}
                className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-[#00FFB4] cursor-pointer"
              >
                {FLOOR_PLAN_GROUPS.map((group) => (
                  <optgroup key={group.category} label={group.category} className="bg-slate-900 text-[#00FFB4] font-bold">
                    {group.options.map((option) => (
                      <option key={option} value={option} className="bg-slate-950 text-slate-200 font-normal">
                        {option}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          {/* Building & Floor */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-slate-300 font-mono text-[11px]">Building</label>
              <input
                id="input-building"
                type="text"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-[#00FFB4]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-mono text-[11px]">Floor Level</label>
              <input
                id="input-floor-level"
                type="number"
                min={1}
                max={20}
                value={floor}
                onChange={(e) => setFloor(Number(e.target.value))}
                className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-[#00FFB4]"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-slate-300 font-mono text-[11px]">Move-Out Date</label>
              <input
                id="input-move-out-date"
                type="date"
                value={moveOutDate}
                onChange={(e) => setMoveOutDate(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-[#00FFB4]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-mono text-[11px]">Target Rent-Ready Date</label>
              <input
                id="input-target-ready-date"
                type="date"
                value={targetReadyDate}
                onChange={(e) => setTargetReadyDate(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-[#00FFB4] font-bold focus:outline-none focus:border-[#00FFB4]"
              />
            </div>
          </div>

          {/* Assigned Tech Lead (with Tech Photo) */}
          <div className="space-y-1">
            <label className="block text-slate-300 font-mono text-[11px]">Assigned Turn Tech Lead</label>
            <div className="flex items-center gap-2">
              {(() => {
                const techList = technicians && technicians.length > 0 ? technicians : ACTIVE_TECHNICIANS;
                const selTech = techList.find(t => t.id === assignedTechId) || techList[0];
                return selTech ? (
                  <img
                    src={selTech.avatar}
                    alt={selTech.name}
                    className="w-8 h-8 rounded-full object-cover border border-[#00FFB4]/50 shrink-0"
                  />
                ) : null;
              })()}
              <select
                id="select-assigned-tech"
                value={assignedTechId}
                onChange={(e) => setAssignedTechId(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-[#00FFB4]"
              >
                {(technicians && technicians.length > 0 ? technicians : ACTIVE_TECHNICIANS).map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.trade_specialty})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Multi-Vendor Intake Section: Options to add multiple vendors & space for scheduled work date */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#00FFB4]" />
                <span className="font-['Chakra_Petch'] font-bold text-xs uppercase tracking-wide text-white">
                  MAKE-READY VENDORS & SCHEDULED WORK DATES
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold text-[#00FFB4] bg-[#00FFB4]/10 border border-[#00FFB4]/30">
                {intakeVendors.length} Assigned
              </span>
            </div>

            <p className="text-[11px] text-slate-400 font-sans leading-tight">
              Add multiple vendors participating in this make-ready (Painting, Carpet, Flooring, Housekeeping, etc.) and set the date they will perform the work.
            </p>

            {/* Vendor Adder Input Box */}
            <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Select Existing or Type Custom Vendor */}
                <div className="space-y-1">
                  <label className="block text-slate-300 font-mono text-[10.5px]">
                    Vendor / Contractor *
                  </label>
                  <select
                    id="select-intake-vendor"
                    value={draftVendorSelect}
                    onChange={(e) => handleVendorSelectChange(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-[#00FFB4]"
                  >
                    <option value="">-- Select a Vendor --</option>
                    {availableVendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.trade_category})
                      </option>
                    ))}
                    <option value="CUSTOM">+ Write New / Custom Contractor...</option>
                  </select>
                </div>

                {/* Trade Category */}
                <div className="space-y-1">
                  <label className="block text-slate-300 font-mono text-[10.5px]">
                    Trade / Specialty
                  </label>
                  <select
                    id="select-intake-trade"
                    value={draftTradeCategory}
                    onChange={(e) => setDraftTradeCategory(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-[#00FFB4]"
                  >
                    <option value="Make Ready Punch">🔨 PC: Punch (Make Ready Punch)</option>
                    <option value="Carpet">🧶 CP: Carpet (Carpet Service / Install)</option>
                    <option value="Flooring">🪵 FL: Flooring (Flooring / Vinyl Plank)</option>
                    <option value="Housekeeping">✨ HK: Housekeeping (Deep Cleaning)</option>
                    <option value="Painting">🎨 PA: Paint (Painting & Drywall)</option>
                    <option value="Drywall & Patching">🧱 Drywall & Patching</option>
                    <option value="Countertops & Tub">🛁 Countertop / Tub Resurfacing</option>
                    <option value="Appliances">🍳 Appliances Check / Repair</option>
                    <option value="General Make-Ready">🛠️ General Make-Ready Turn</option>
                  </select>
                </div>
              </div>

              {/* Custom Vendor Name if selected */}
              {draftVendorSelect === 'CUSTOM' && (
                <div className="space-y-1 animate-fadeIn">
                  <label className="block text-slate-300 font-mono text-[10.5px]">
                    Custom Contractor / Company Name *
                  </label>
                  <input
                    id="input-intake-custom-vendor-name"
                    type="text"
                    value={draftCustomName}
                    onChange={(e) => setDraftCustomName(e.target.value)}
                    placeholder="e.g. Apex Tile & Flooring, Pro Clean Services..."
                    className="w-full p-2 rounded-lg bg-slate-950 border border-[#00FFB4]/60 text-white text-xs focus:outline-none focus:border-[#00FFB4]"
                  />
                </div>
              )}

              {/* Scheduled Work Date (Fecha de Trabajo) & Task Scope */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="block font-mono text-[10.5px] font-semibold flex items-center gap-1.5 text-[#00FFB4]">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Scheduled Work Date (Fecha de Trabajo) *</span>
                  </label>
                  <input
                    id="input-intake-vendor-scheduled-date"
                    type="date"
                    value={draftScheduledDate}
                    onChange={(e) => setDraftScheduledDate(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-[#00FFB4] font-mono font-bold text-xs focus:outline-none focus:border-[#00FFB4]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-300 font-mono text-[10.5px]">
                    Task Note / Work Scope
                  </label>
                  <input
                    id="input-intake-vendor-task-note"
                    type="text"
                    value={draftTaskNote}
                    onChange={(e) => setDraftTaskNote(e.target.value)}
                    placeholder="e.g. Full apartment paint, install 675 SF carpet..."
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-[#00FFB4]"
                  />
                </div>
              </div>

              {/* Error message if validation fails */}
              {vendorInputError && (
                <div className="flex items-center gap-1 text-[11px] text-red-400 font-mono bg-red-950/40 p-1.5 rounded border border-red-500/30">
                  <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
                  <span>{vendorInputError}</span>
                </div>
              )}

              {/* Button to Add Vendor */}
              <div className="pt-1 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500">
                  Multiple vendors can be added before saving
                </span>
                <button
                  id="btn-add-vendor-to-intake"
                  type="button"
                  onClick={handleAddVendor}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00FFB4]/15 hover:bg-[#00FFB4]/25 text-[#00FFB4] border border-[#00FFB4]/40 font-mono font-bold text-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Vendor & Date (Agregar)</span>
                </button>
              </div>
            </div>

            {/* Display Added Vendors */}
            <div className="space-y-1.5">
              <div className="text-[10.5px] font-mono text-slate-400 font-semibold uppercase tracking-wider flex items-center justify-between">
                <span>Vendors Scheduled for this Unit ({intakeVendors.length})</span>
              </div>

              {intakeVendors.length === 0 ? (
                <div className="p-2.5 rounded-lg bg-slate-900/40 border border-dashed border-slate-800 text-center text-slate-500 font-mono text-[11px]">
                  No vendors added yet. Select a vendor and work date above, then click "+ Add Vendor & Date".
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {intakeVendors.map((item, idx) => {
                    const lower = item.tradeCategory.toLowerCase();
                    const badgeClass = lower.includes('punch')
                      ? 'bg-amber-950/70 text-amber-300 border-amber-500/50'
                      : lower.includes('paint')
                      ? 'bg-purple-950/60 text-purple-300 border-purple-500/40'
                      : lower.includes('carpet')
                      ? 'bg-pink-950/60 text-pink-300 border-pink-500/40'
                      : lower.includes('floor')
                      ? 'bg-sky-950/60 text-sky-300 border-sky-500/40'
                      : lower.includes('clean') || lower.includes('housekeep') || lower.includes('hk')
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-900 text-slate-300 border-slate-700';

                    return (
                      <div
                        key={item.id || idx}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-colors"
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-xs truncate">
                              {item.vendorName}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono border ${badgeClass}`}>
                              {item.tradeCategory}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-mono font-semibold text-[#00FFB4] bg-[#00FFB4]/10 border border-[#00FFB4]/30 px-1.5 py-0.5 rounded">
                              <Calendar className="w-3 h-3 text-[#00FFB4]" />
                              <span>Work Date: {item.scheduledDate}</span>
                            </span>
                          </div>
                          {item.taskNote && (
                            <div className="text-[10px] text-slate-400 font-mono truncate">
                              Scope: {item.taskNote}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveVendor(item.id)}
                          title="Remove vendor from intake"
                          className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Initial Notes */}
          <div className="space-y-1">
            <label className="block text-slate-300 font-mono text-[11px]">Initial Move-Out Notes</label>
            <textarea
              id="input-unit-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Previous tenant left keys on counter. Wall scuffs near entryway."
              className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#00FFB4]"
            />
          </div>

          {/* Supervisor Security Password / Authorization Box */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-700/80 hover:border-slate-600 space-y-2.5 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-200 font-mono text-xs font-semibold">
                <Lock className="w-3.5 h-3.5 text-[#00FFB4]" />
                <span>SUPERVISOR PASSWORD *</span>
              </div>
              <div className="flex items-center gap-2">
                {isPasswordValid && (
                  <span className="flex items-center gap-1 text-[10px] font-mono text-[#00FFB4] bg-[#00FFB4]/10 px-2 py-0.5 rounded border border-[#00FFB4]/30 animate-fadeIn">
                    <ShieldCheck className="w-3 h-3" />
                    <span>AUTHORIZED</span>
                  </span>
                )}
                <button
                  id="open-change-password-modal-btn"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    soundManager.playClick();
                    setIsChangingPassword(true);
                    setChangePwdError(null);
                    setChangePwdSuccess(null);
                  }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono text-slate-400 hover:text-[#00FFB4] hover:bg-slate-800/80 border border-slate-700/70 hover:border-[#00FFB4]/40 transition-all"
                  title="Change supervisor password"
                >
                  <Key className="w-3 h-3" />
                  <span>Change Password</span>
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <KeyRound className="w-4 h-4 text-slate-400" />
              </div>
              <input
                id="supervisor-password-input"
                type={showPassword ? 'text' : 'password'}
                required
                value={supervisorPassword}
                onChange={(e) => {
                  setSupervisorPassword(e.target.value);
                  if (authError) setAuthError(null);
                }}
                placeholder="Enter Supervisor password"
                className={`w-full pl-9 pr-10 py-2.5 rounded-lg bg-slate-900 border text-xs font-mono transition-colors focus:outline-none ${
                  isPasswordValid 
                    ? 'border-[#00FFB4] text-[#00FFB4]' 
                    : 'border-slate-700 text-slate-100 focus:border-[#00FFB4]'
                }`}
              />
              <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-slate-400 hover:text-white rounded transition-colors"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {authError && (
              <div className="flex items-center gap-1.5 text-[11px] text-red-400 font-mono bg-red-950/40 p-2 rounded border border-red-500/30 animate-shake">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                <span>{authError}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-0.5">
              <span>Required to confirm intake authorization</span>
              {isCurrentSupervisor && (
                <span className="text-[#00FFB4]">
                  Active: {currentUser.name} (Supervisor)
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              id="cancel-new-unit-btn"
              type="button"
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              id="submit-new-unit-btn"
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#00FFB4] text-black font-bold font-mono text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(0,255,180,0.3)] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>INITIALIZING...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>INITIALIZE TURNOVER</span>
                </>
              )}
            </button>
          </div>

        </form>

        {/* Change Password Dialog Overlay */}
        {isChangingPassword && (
          <div 
            id="change-password-modal-overlay" 
            className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          >
            <div className="w-full max-w-sm bg-[#0A0E17] border border-slate-700 rounded-xl p-5 shadow-2xl space-y-4 animate-scaleUp">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-white font-['Chakra_Petch'] font-bold text-sm">
                  <Key className="w-4 h-4 text-[#00FFB4]" />
                  <span>CHANGE SUPERVISOR PASSWORD</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setIsChangingPassword(false);
                    setChangePwdError(null);
                    setChangePwdSuccess(null);
                  }}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveNewPassword} className="space-y-3 font-sans text-xs">
                {changePwdError && (
                  <div className="flex items-center gap-1.5 p-2 rounded bg-red-950/60 border border-red-500/40 text-red-300 text-[11px] font-mono">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                    <span>{changePwdError}</span>
                  </div>
                )}

                {changePwdSuccess && (
                  <div className="flex items-center gap-1.5 p-2 rounded bg-[#00FFB4]/15 border border-[#00FFB4]/40 text-[#00FFB4] text-[11px] font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#00FFB4]" />
                    <span>{changePwdSuccess}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-slate-300 font-mono text-[11px]">Current Password</label>
                  <input
                    id="input-current-password"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={currentPwdForChange}
                    onChange={(e) => setCurrentPwdForChange(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-[#00FFB4]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-300 font-mono text-[11px]">New Password</label>
                  <input
                    id="input-new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 4 chars)"
                    className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-[#00FFB4]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-300 font-mono text-[11px]">Confirm New Password</label>
                  <input
                    id="input-confirm-new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-[#00FFB4]"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-1.5 text-slate-400 text-[11px] font-mono cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showNewPassword}
                      onChange={(e) => setShowNewPassword(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-[#00FFB4] focus:ring-0 cursor-pointer"
                    />
                    <span>Show password characters</span>
                  </label>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      setIsChangingPassword(false);
                      setChangePwdError(null);
                      setChangePwdSuccess(null);
                    }}
                    className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    id="save-new-password-btn"
                    type="submit"
                    className="px-4 py-1.5 rounded bg-[#00FFB4] hover:brightness-110 text-black font-mono font-bold text-xs uppercase transition-all shadow-[0_0_15px_rgba(0,255,180,0.25)]"
                  >
                    Save Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
