import React, { useState } from 'react';
import { 
  X, 
  Users, 
  UserPlus, 
  Trash2, 
  Phone, 
  BadgeCheck, 
  Wrench, 
  ShieldCheck, 
  AlertCircle,
  HardHat,
  Sparkles,
  Loader2
} from 'lucide-react';
import { TechnicianUser } from '../types';
import { soundManager } from '../services/audio';

interface ManageTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  technicians: TechnicianUser[];
  currentUser: TechnicianUser;
  onAddTechnician: (tech: TechnicianUser) => Promise<void>;
  onDeleteTechnician: (id: string) => Promise<void>;
}

const TRADE_SPECIALTY_PRESETS = [
  'General Maintenance & Turnover',
  'Plumbing & Water Heaters',
  'Electrical & Fixtures',
  'HVAC & Air Conditioning',
  'Painting & Drywall',
  'Flooring & Tile',
  'Punch-out & Cleaning Detail'
];

const AVATAR_OPTIONS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80'
];

export const ManageTeamModal: React.FC<ManageTeamModalProps> = ({
  isOpen,
  onClose,
  technicians,
  currentUser,
  onAddTechnician,
  onDeleteTechnician
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<'Field Technician' | 'Maintenance Supervisor'>('Field Technician');
  const [specialty, setSpecialty] = useState(TRADE_SPECIALTY_PRESETS[0]);
  const [phone, setPhone] = useState('');
  const [badgeId, setBadgeId] = useState('');
  const [avatar, setAvatar] = useState(AVATAR_OPTIONS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteTech, setPendingDeleteTech] = useState<TechnicianUser | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleOpenAddForm = () => {
    soundManager.playClick();
    const nextNum = Math.floor(100 + Math.random() * 900);
    setBadgeId(role === 'Maintenance Supervisor' ? `SUP-${nextNum}` : `TECH-${nextNum}`);
    setName('');
    setPhone('');
    setErrorMessage(null);
    setPendingDeleteTech(null);
    setShowAddForm(true);
  };

  const handleRoleChange = (newRole: 'Field Technician' | 'Maintenance Supervisor') => {
    setRole(newRole);
    const nextNum = Math.floor(100 + Math.random() * 900);
    setBadgeId(newRole === 'Maintenance Supervisor' ? `SUP-${nextNum}` : `TECH-${nextNum}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Please enter the technician name.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const newId = `tech-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newTech: TechnicianUser = {
        id: newId,
        name: name.trim(),
        role,
        trade_specialty: specialty,
        badge_id: badgeId.trim() || `TECH-${Math.floor(100 + Math.random() * 900)}`,
        avatar,
        phone: phone.trim() || '(555) 000-0000'
      };

      await onAddTechnician(newTech);
      soundManager.playSyncSuccess();
      setShowAddForm(false);
      setName('');
      setPhone('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving team member in Firebase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const initiateDelete = (tech: TechnicianUser) => {
    soundManager.playClick();
    if (technicians.length <= 1) {
      setErrorMessage('Cannot delete: There must be at least one technician registered in the system.');
      return;
    }
    setErrorMessage(null);
    setPendingDeleteTech(tech);
  };

  const confirmDelete = async (tech: TechnicianUser) => {
    if (technicians.length <= 1) {
      setErrorMessage('Cannot delete: There must be at least one technician registered in the system.');
      setPendingDeleteTech(null);
      return;
    }

    try {
      setDeletingId(tech.id);
      setErrorMessage(null);
      await onDeleteTechnician(tech.id);
      soundManager.playTaskCheck();
      setPendingDeleteTech(null);
    } catch (err: any) {
      setErrorMessage('Error removing technician: ' + (err.message || 'Could not delete from database.'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div 
      id="manage-team-modal-backdrop" 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
    >
      <div 
        id="manage-team-modal-card" 
        className="bg-[#0D131F] border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00FFB4]/15 border border-[#00FFB4]/30 flex items-center justify-center text-[#00FFB4]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-['Chakra_Petch'] font-bold text-white text-base sm:text-lg tracking-wide flex items-center gap-2">
                <span>MAINTENANCE TEAM</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-[#00FFB4] border border-slate-700 font-mono">
                  {technicians.length}
                </span>
              </h2>
              <p className="text-[11px] font-mono text-slate-400">
                Add or remove field technicians • Synchronized in real time
              </p>
            </div>
          </div>
          <button
            id="close-manage-team-btn"
            onClick={() => { soundManager.playClick(); onClose(); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Top Error Alert Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/50 text-red-200 text-xs flex items-center justify-between gap-2 shadow-lg animate-fadeIn">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="font-medium">{errorMessage}</span>
              </div>
              <button 
                onClick={() => setErrorMessage(null)} 
                className="text-red-400 hover:text-white p-1 rounded transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Action Header Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs text-slate-300">
              <span className="font-bold text-white block font-['Chakra_Petch']">Active Roster</span>
              <p className="text-slate-400 text-[11px]">
                Registered members appear in the shift switcher, unit lead assignment, and trade dispatching.
              </p>
            </div>
            {!showAddForm && (
              <button
                id="btn-open-add-employee-form"
                onClick={handleOpenAddForm}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#00FFB4] text-black font-bold text-xs tracking-wider uppercase hover:brightness-110 active:scale-95 transition-all whitespace-nowrap shadow-[0_0_15px_rgba(0,255,180,0.3)]"
              >
                <UserPlus className="w-4 h-4" />
                <span>NEW TECHNICIAN</span>
              </button>
            )}
          </div>

          {/* Form to Add New Employee */}
          {showAddForm && (
            <form 
              id="add-technician-form"
              onSubmit={handleSubmit}
              className="p-4 sm:p-5 rounded-xl bg-slate-900/90 border border-[#00FFB4]/30 space-y-4 shadow-xl animate-fadeIn"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 text-white font-['Chakra_Petch'] font-bold text-sm tracking-wide">
                  <UserPlus className="w-4 h-4 text-[#00FFB4]" />
                  <span>REGISTER NEW MAINTENANCE TECHNICIAN</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs font-mono text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono text-slate-300 uppercase tracking-wider">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Robert Garcia"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#00FFB4] text-xs font-medium"
                  />
                </div>

                {/* Role */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono text-slate-300 uppercase tracking-wider">
                    Role / Position *
                  </label>
                  <select
                    value={role}
                    onChange={(e) => handleRoleChange(e.target.value as any)}
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-[#00FFB4] text-xs font-medium cursor-pointer"
                  >
                    <option value="Field Technician">Field Technician</option>
                    <option value="Maintenance Supervisor">Maintenance Supervisor</option>
                  </select>
                </div>

                {/* Specialty */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono text-slate-300 uppercase tracking-wider">
                    Trade Specialty *
                  </label>
                  <select
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-[#00FFB4] text-xs font-medium cursor-pointer"
                  >
                    {TRADE_SPECIALTY_PRESETS.map((preset) => (
                      <option key={preset} value={preset}>{preset}</option>
                    ))}
                  </select>
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono text-slate-300 uppercase tracking-wider">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="(555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#00FFB4] text-xs font-mono"
                  />
                </div>

                {/* Badge ID */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-[11px] font-mono text-slate-300 uppercase tracking-wider">
                    Badge ID / Employee Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TECH-402"
                    value={badgeId}
                    onChange={(e) => setBadgeId(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-[#00FFB4] font-mono text-xs focus:outline-none focus:border-[#00FFB4]"
                  />
                </div>

                {/* Avatar Selection */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-[11px] font-mono text-slate-300 uppercase tracking-wider">
                    Profile Avatar
                  </label>
                  <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                    {AVATAR_OPTIONS.map((imgUrl, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setAvatar(imgUrl)}
                        className={`relative rounded-full p-0.5 shrink-0 transition-transform ${
                          avatar === imgUrl 
                            ? 'ring-2 ring-[#00FFB4] scale-105' 
                            : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img 
                          src={imgUrl} 
                          alt={`Avatar ${idx + 1}`} 
                          className="w-9 h-9 rounded-full object-cover" 
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-save-technician"
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#00FFB4] text-black font-bold text-xs tracking-wider uppercase hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(0,255,180,0.3)] disabled:opacity-50"
                >
                  <BadgeCheck className="w-4 h-4" />
                  <span>{isSubmitting ? 'SAVING TO FIREBASE...' : 'SAVE TECHNICIAN'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Technicians Roster List */}
          <div className="space-y-3">
            <h3 className="font-['Chakra_Petch'] font-bold text-xs text-slate-400 uppercase tracking-wider">
              Current Roster ({technicians.length} Registered)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {technicians.map((tech) => {
                const isCurrent = tech.id === currentUser.id;
                const isSupervisor = tech.role === 'Maintenance Supervisor';
                const isDeleting = deletingId === tech.id;

                return (
                  <div
                    key={tech.id}
                    className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                      isCurrent
                        ? 'bg-slate-900/90 border-[#00FFB4]/40 shadow-[0_0_12px_rgba(0,255,180,0.15)]'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={tech.avatar}
                          alt={tech.name}
                          className="w-10 h-10 rounded-full object-cover border border-slate-700"
                        />
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                          isSupervisor ? 'bg-[#00FFB4] text-black' : 'bg-cyan-500 text-black'
                        }`}>
                          {isSupervisor ? (
                            <ShieldCheck className="w-2.5 h-2.5" />
                          ) : (
                            <Wrench className="w-2.5 h-2.5" />
                          )}
                        </div>
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-white text-xs truncate">
                            {tech.name}
                          </span>
                          {isCurrent && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#00FFB4]/20 text-[#00FFB4] border border-[#00FFB4]/30">
                              ACTIVE
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-[#00FFB4] font-medium truncate">
                          {tech.trade_specialty}
                        </div>

                        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400 pt-1">
                          <span className="flex items-center gap-1">
                            <BadgeCheck className="w-3 h-3 text-slate-500" />
                            {tech.badge_id}
                          </span>
                          {tech.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-500" />
                              {tech.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Delete / Remove Action */}
                    {pendingDeleteTech?.id === tech.id ? (
                      <div className="flex flex-col items-end gap-1.5 shrink-0 animate-fadeIn">
                        <span className="text-[10px] text-red-400 font-mono font-medium">
                          Remove {tech.name.split(' ')[0]}?
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => confirmDelete(tech)}
                            className="px-2.5 py-1 rounded-md bg-red-600 hover:bg-red-500 text-white font-mono text-[10px] font-bold transition-all shadow flex items-center gap-1"
                          >
                            {isDeleting ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                            Confirm
                          </button>
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => setPendingDeleteTech(null)}
                            className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isDeleting || technicians.length <= 1}
                        onClick={() => initiateDelete(tech)}
                        title={
                          technicians.length <= 1 
                            ? "Must keep at least 1 technician" 
                            : `Remove ${tech.name} from team`
                        }
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/40 flex items-center justify-between shrink-0">
          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00FFB4] animate-pulse"></span>
            <span>Firebase Cloud Sync Active</span>
          </div>
          <button
            onClick={() => { soundManager.playClick(); onClose(); }}
            className="px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-semibold"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
