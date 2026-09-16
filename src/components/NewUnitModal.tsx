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
  Shield
} from 'lucide-react';
import { Unit, TechnicianUser } from '../types';
import { ACTIVE_TECHNICIANS } from '../services/db';
import { soundManager } from '../services/audio';

interface NewUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: TechnicianUser;
  technicians?: TechnicianUser[];
  onSwitchToSupervisor?: () => void;
  onCreateUnit: (unitData: Omit<Unit, 'id' | 'last_updated'>) => Promise<void>;
}

export const NewUnitModal: React.FC<NewUnitModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  technicians,
  onCreateUnit
}) => {
  const [unitNumber, setUnitNumber] = useState('');
  const [floorPlan, setFloorPlan] = useState<Unit['floor_plan']>('2B/2B');
  const [building, setBuilding] = useState('Cedar Ridge - Bldg B');
  const [floor, setFloor] = useState<number>(2);
  const [assignedTechId, setAssignedTechId] = useState(currentUser.id);
  const [moveOutDate, setMoveOutDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetReadyDate, setTargetReadyDate] = useState(
    new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  
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
      await onCreateUnit({
        unit_number: unitNumber.trim(),
        current_status: 'Inspection',
        floor_plan: floorPlan,
        building,
        floor: Number(floor),
        assigned_technician_id: assignedTechId,
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

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#0D131F] border border-slate-700 rounded-2xl overflow-hidden shadow-2xl my-auto animate-scaleUp">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-sans">
          
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
              <label className="block text-slate-300 font-mono text-[11px]">Floor Plan *</label>
              <select
                id="select-floor-plan"
                value={floorPlan}
                onChange={(e) => setFloorPlan(e.target.value as Unit['floor_plan'])}
                className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-[#00FFB4] cursor-pointer"
              >
                <option value="1B/1B">1 Bed / 1 Bath (1B/1B)</option>
                <option value="2B/2B">2 Bed / 2 Bath (2B/2B)</option>
                <option value="Studio">Studio</option>
                <option value="3B/2B">3 Bed / 2 Bath (3B/2B)</option>
                <option value="Townhome">Townhome</option>
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

          {/* Assigned Tech Lead */}
          <div className="space-y-1">
            <label className="block text-slate-300 font-mono text-[11px]">Assigned Turn Tech Lead</label>
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
