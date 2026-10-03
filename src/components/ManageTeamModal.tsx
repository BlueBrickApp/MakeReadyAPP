import React, { useState, useRef, useEffect } from 'react';
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
  Loader2,
  Pencil,
  Mail,
  FileText,
  Upload,
  Camera,
  Paperclip,
  Download,
  Eye,
  Image as ImageIcon,
  CheckCircle2
} from 'lucide-react';
import { TechnicianUser, TechnicianAttachment } from '../types';
import { soundManager } from '../services/audio';

interface ManageTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  technicians: TechnicianUser[];
  currentUser: TechnicianUser;
  initialEditingTechId?: string | null;
  onAddTechnician: (tech: TechnicianUser) => Promise<void>;
  onUpdateTechnician?: (tech: TechnicianUser) => Promise<void>;
  onDeleteTechnician: (id: string) => Promise<void>;
}

const TRADE_SPECIALTY_PRESETS = [
  'Operations & Quality Sign-Off',
  'Plumbing & HVAC Lead',
  'Electrical & Flooring Specialist',
  'Painting & Punch-out Detail',
  'General Maintenance & Turnover',
  'Plumbing & Water Heaters',
  'Electrical & Fixtures',
  'HVAC & Air Conditioning',
  'Painting & Drywall',
  'Flooring & Tile',
  'Punch-out & Cleaning Detail'
];

const AVATAR_OPTIONS = [
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80'
];

export const ManageTeamModal: React.FC<ManageTeamModalProps> = ({
  isOpen,
  onClose,
  technicians,
  currentUser,
  initialEditingTechId,
  onAddTechnician,
  onUpdateTechnician,
  onDeleteTechnician
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTechId, setEditingTechId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState<'Field Technician' | 'Maintenance Supervisor'>('Field Technician');
  const [specialty, setSpecialty] = useState(TRADE_SPECIALTY_PRESETS[4]);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [badgeId, setBadgeId] = useState('');
  const [avatar, setAvatar] = useState(AVATAR_OPTIONS[0]);
  const [attachments, setAttachments] = useState<TechnicianAttachment[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteTech, setPendingDeleteTech] = useState<TechnicianUser | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<TechnicianAttachment | null>(null);

  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const attachmentFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && initialEditingTechId) {
      const target = technicians.find(t => t.id === initialEditingTechId);
      if (target) {
        handleOpenEditForm(target);
      }
    }
  }, [isOpen, initialEditingTechId]);

  if (!isOpen) return null;

  const handleOpenAddForm = () => {
    soundManager.playClick();
    setEditingTechId(null);
    const nextNum = Math.floor(100 + Math.random() * 900);
    setRole('Field Technician');
    setBadgeId(`TECH-${nextNum}`);
    setName('');
    setSpecialty('General Maintenance & Turnover');
    setPhone('');
    setEmail('');
    setNotes('');
    setAvatar(AVATAR_OPTIONS[1]);
    setAttachments([]);
    setErrorMessage(null);
    setPendingDeleteTech(null);
    setShowAddForm(true);
  };

  const handleOpenEditForm = (tech: TechnicianUser) => {
    soundManager.playClick();
    setEditingTechId(tech.id);
    setName(tech.name);
    setRole(tech.role);
    setSpecialty(tech.trade_specialty || 'General Maintenance & Turnover');
    setPhone(tech.phone || '');
    setEmail(tech.email || '');
    setNotes(tech.notes || '');
    setBadgeId(tech.badge_id || 'SUP-101');
    setAvatar(tech.avatar || AVATAR_OPTIONS[0]);
    setAttachments(tech.attachments || []);
    setErrorMessage(null);
    setPendingDeleteTech(null);
    setShowAddForm(true);

    setTimeout(() => {
      const formEl = document.getElementById('add-technician-form');
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  const handleRoleChange = (newRole: 'Field Technician' | 'Maintenance Supervisor') => {
    setRole(newRole);
    if (!editingTechId) {
      const nextNum = Math.floor(100 + Math.random() * 900);
      setBadgeId(newRole === 'Maintenance Supervisor' ? `SUP-${nextNum}` : `TECH-${nextNum}`);
    }
  };

  // Upload custom profile photo (avatar)
  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 750 * 1024) {
      setErrorMessage('Photo is too large. Please select an image under 750 KB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatar(reader.result);
        soundManager.playCameraShutter();
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Upload photo or file attachment (certification, license, ID, PDF, etc.)
  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.size > 750 * 1024) {
        setErrorMessage(`File "${file.name}" exceeds 750 KB limit for cloud sync.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const newAttachment: TechnicianAttachment = {
            id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            type: file.type || 'application/octet-stream',
            size: file.size,
            data_url: reader.result,
            uploaded_at: Date.now()
          };
          setAttachments(prev => [...prev, newAttachment]);
          soundManager.playTaskCheck();
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleRemoveAttachment = (attId: string) => {
    soundManager.playClick();
    setAttachments(prev => prev.filter(a => a.id !== attId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Please enter the technician or supervisor name.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      if (editingTechId) {
        const updatedTech: TechnicianUser = {
          id: editingTechId,
          name: name.trim(),
          role,
          trade_specialty: specialty.trim() || 'General Maintenance & Turnover',
          badge_id: badgeId.trim() || (role === 'Maintenance Supervisor' ? 'SUP-101' : 'TECH-101'),
          avatar,
          phone: phone.trim() || '(555) 000-0000',
          email: email.trim() || undefined,
          notes: notes.trim() || undefined,
          attachments: attachments.length > 0 ? attachments : undefined
        };

        if (onUpdateTechnician) {
          await onUpdateTechnician(updatedTech);
        } else {
          await onAddTechnician(updatedTech);
        }
        soundManager.playSyncSuccess();
        setShowAddForm(false);
        setEditingTechId(null);
      } else {
        const newId = `tech-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const newTech: TechnicianUser = {
          id: newId,
          name: name.trim(),
          role,
          trade_specialty: specialty.trim() || 'General Maintenance & Turnover',
          badge_id: badgeId.trim() || `TECH-${Math.floor(100 + Math.random() * 900)}`,
          avatar,
          phone: phone.trim() || '(555) 000-0000',
          email: email.trim() || undefined,
          notes: notes.trim() || undefined,
          attachments: attachments.length > 0 ? attachments : undefined
        };

        await onAddTechnician(newTech);
        soundManager.playSyncSuccess();
        setShowAddForm(false);
      }

      setName('');
      setPhone('');
      setEmail('');
      setNotes('');
      setAttachments([]);
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div 
      id="manage-team-modal-backdrop" 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
    >
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={avatarFileInputRef}
        onChange={handleAvatarFileUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={attachmentFileInputRef}
        onChange={handleAttachmentUpload}
        accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.csv"
        multiple
        className="hidden"
      />

      <div 
        id="manage-team-modal-card" 
        className="bg-[#0D131F] border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00FFB4]/15 border border-[#00FFB4]/30 flex items-center justify-center text-[#00FFB4]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-['Chakra_Petch'] font-bold text-white text-base sm:text-lg tracking-wide flex items-center gap-2">
                <span>MAINTENANCE TEAM & SUPERVISOR</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-[#00FFB4] border border-slate-700 font-mono">
                  {technicians.length}
                </span>
              </h2>
              <p className="text-[11px] font-mono text-slate-400">
                Edit profiles, add contact details, upload photos & files • Cloud synced
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
              <span className="font-bold text-white block font-['Chakra_Petch']">Active Maintenance & Supervisor Roster</span>
              <p className="text-slate-400 text-[11px]">
                Click <strong>EDIT</strong> on any card to update profile details, upload a custom photo, or attach certificates/files.
              </p>
            </div>
            {!showAddForm && (
              <button
                id="btn-open-add-employee-form"
                onClick={handleOpenAddForm}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#00FFB4] text-black font-bold text-xs tracking-wider uppercase hover:brightness-110 active:scale-95 transition-all whitespace-nowrap shadow-[0_0_15px_rgba(0,255,180,0.3)]"
              >
                <UserPlus className="w-4 h-4" />
                <span>NEW MEMBER</span>
              </button>
            )}
          </div>

          {/* Form to Add or Edit Employee / Supervisor */}
          {showAddForm && (
            <form 
              id="add-technician-form"
              onSubmit={handleSubmit}
              className={`p-4 sm:p-5 rounded-xl bg-slate-900/95 border space-y-4 shadow-xl animate-fadeIn ${
                editingTechId 
                  ? 'border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.15)]' 
                  : 'border-[#00FFB4]/30'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 text-white font-['Chakra_Petch'] font-bold text-sm tracking-wide">
                  {editingTechId ? (
                    <>
                      <Pencil className="w-4 h-4 text-amber-400" />
                      <span>EDIT PROFILE CARD ({name || 'Member'})</span>
                      <span className="text-[10px] font-mono text-amber-400 px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/30">
                        {role}
                      </span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 text-[#00FFB4]" />
                      <span>REGISTER NEW MAINTENANCE TEAM MEMBER</span>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); setEditingTechId(null); }}
                  className="text-xs font-mono text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono text-slate-300 uppercase tracking-wider">
                    Full Name *
                  </label>
                  <input
                    id="input-tech-name"
                    type="text"
                    required
                    placeholder="e.g. Gerry Malovini"
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
                    id="select-tech-role"
                    value={role}
                    onChange={(e) => handleRoleChange(e.target.value as any)}
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-[#00FFB4] text-xs font-medium cursor-pointer"
                  >
                    <option value="Maintenance Supervisor">Maintenance Supervisor</option>
                    <option value="Field Technician">Field Technician</option>
                  </select>
                </div>

                {/* Specialty */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono text-slate-300 uppercase tracking-wider">
                    Trade Specialty / Department *
                  </label>
                  <input
                    id="input-tech-specialty"
                    type="text"
                    list="specialty-presets-list"
                    placeholder="e.g. Operations & Quality Sign-Off"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-[#00FFB4] text-xs font-medium"
                  />
                  <datalist id="specialty-presets-list">
                    {TRADE_SPECIALTY_PRESETS.map((preset) => (
                      <option key={preset} value={preset} />
                    ))}
                  </datalist>
                </div>

                {/* Badge ID */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono text-slate-300 uppercase tracking-wider">
                    Badge ID / License Code
                  </label>
                  <input
                    id="input-tech-badge"
                    type="text"
                    placeholder="e.g. SUP-101"
                    value={badgeId}
                    onChange={(e) => setBadgeId(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-[#00FFB4] font-mono text-xs focus:outline-none focus:border-[#00FFB4]"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono text-slate-300 uppercase tracking-wider">
                    Contact Phone
                  </label>
                  <input
                    id="input-tech-phone"
                    type="tel"
                    placeholder="(555) 890-1234"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#00FFB4] text-xs font-mono"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono text-slate-300 uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    id="input-tech-email"
                    type="email"
                    placeholder="e.g. GerardoMalovini@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#00FFB4] text-xs font-mono"
                  />
                </div>

                {/* Additional Notes / Credentials / Bio */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-[11px] font-mono text-slate-300 uppercase tracking-wider">
                    Additional Information / Notes / Certifications
                  </label>
                  <textarea
                    id="input-tech-notes"
                    rows={2}
                    placeholder="Add EPA certifications, license numbers, shift schedule, emergency contact or notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#00FFB4] text-xs"
                  />
                </div>

                {/* Avatar Selection + Custom Photo Upload */}
                <div className="space-y-2 sm:col-span-2 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="block text-[11px] font-mono text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-[#00FFB4]" />
                      <span>Profile Photo / Avatar</span>
                    </label>
                    <button
                      id="btn-upload-custom-avatar"
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        avatarFileInputRef.current?.click();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00FFB4]/15 hover:bg-[#00FFB4]/25 text-[#00FFB4] border border-[#00FFB4]/40 font-mono text-[11px] font-semibold transition-all cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Photo from Device</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-3 pt-1 overflow-x-auto pb-1">
                    {/* Current Selected Avatar Preview */}
                    <div className="flex items-center gap-2 pr-3 border-r border-slate-800 shrink-0">
                      <img
                        src={avatar}
                        alt="Selected Profile"
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-[#00FFB4]"
                      />
                      <span className="text-[10px] font-mono text-[#00FFB4] uppercase">Current</span>
                    </div>

                    {/* Preset Avatars */}
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

                {/* Upload Photos or Files Section (Documents, Licenses, Certifications) */}
                <div className="space-y-2.5 sm:col-span-2 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <label className="block text-[11px] font-mono text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-[#00E5FF]" />
                        <span>Attached Photos & Files ({attachments.length})</span>
                      </label>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Upload photos, ID badges, EPA/HVAC certificates, PDFs, or documents
                      </p>
                    </div>
                    <button
                      id="btn-upload-tech-attachment"
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        attachmentFileInputRef.current?.click();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00E5FF]/15 hover:bg-[#00E5FF]/25 text-[#00E5FF] border border-[#00E5FF]/40 font-mono text-[11px] font-semibold transition-all cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>+ Upload Photo / File</span>
                    </button>
                  </div>

                  {attachments.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                      {attachments.map((att) => {
                        const isImage = att.type.startsWith('image/') || att.data_url.startsWith('data:image/');
                        return (
                          <div
                            key={att.id}
                            className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900 border border-slate-700/80 text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {isImage ? (
                                <img
                                  src={att.data_url}
                                  alt={att.name}
                                  onClick={() => setPreviewAttachment(att)}
                                  className="w-9 h-9 rounded object-cover border border-slate-700 cursor-pointer shrink-0 hover:opacity-80"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-[#00E5FF] shrink-0">
                                  <FileText className="w-4 h-4" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="text-slate-200 font-medium truncate text-[11px]" title={att.name}>
                                  {att.name}
                                </div>
                                <div className="text-[10px] font-mono text-slate-400">
                                  {formatFileSize(att.size)}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => setPreviewAttachment(att)}
                                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                                title="View / Preview"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <a
                                href={att.data_url}
                                download={att.name}
                                className="p-1 rounded text-slate-400 hover:text-[#00FFB4] hover:bg-slate-800"
                                title="Download file"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                              <button
                                type="button"
                                onClick={() => handleRemoveAttachment(att.id)}
                                className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-red-950/40"
                                title="Remove file"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); setEditingTechId(null); }}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-save-technician"
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-xs tracking-wider uppercase hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 ${
                    editingTechId
                      ? 'bg-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                      : 'bg-[#00FFB4] text-black shadow-[0_0_15px_rgba(0,255,180,0.3)]'
                  }`}
                >
                  {editingTechId ? <CheckCircle2 className="w-4 h-4" /> : <BadgeCheck className="w-4 h-4" />}
                  <span>
                    {isSubmitting 
                      ? 'SAVING TO FIREBASE...' 
                      : editingTechId 
                      ? 'SAVE CHANGES' 
                      : 'SAVE MEMBER'}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* Technicians & Supervisor Roster List */}
          <div className="space-y-3">
            <h3 className="font-['Chakra_Petch'] font-bold text-xs text-slate-400 uppercase tracking-wider">
              Current Roster ({technicians.length} Registered)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {technicians.map((tech) => {
                const isCurrent = tech.id === currentUser.id;
                const isSupervisor = tech.role === 'Maintenance Supervisor';
                const isDeleting = deletingId === tech.id;
                const techAttachments = tech.attachments || [];

                return (
                  <div
                    key={tech.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                      isCurrent
                        ? 'bg-slate-900/90 border-[#00FFB4]/50 shadow-[0_0_15px_rgba(0,255,180,0.12)]'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Card Top */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="relative shrink-0">
                            <img
                              src={tech.avatar}
                              alt={tech.name}
                              className="w-12 h-12 rounded-full object-cover border-2 border-slate-700"
                            />
                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow ${
                              isSupervisor ? 'bg-[#00FFB4] text-black' : 'bg-cyan-500 text-black'
                            }`}>
                              {isSupervisor ? (
                                <ShieldCheck className="w-3 h-3" />
                              ) : (
                                <Wrench className="w-3 h-3" />
                              )}
                            </div>
                          </div>

                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-white text-sm truncate">
                                {tech.name}
                              </span>
                              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                                isSupervisor 
                                  ? 'bg-[#00FFB4]/20 text-[#00FFB4] border border-[#00FFB4]/40' 
                                  : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                              }`}>
                                {isSupervisor ? 'SUPERVISOR' : 'TECH'}
                              </span>
                              {isCurrent && (
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  ACTIVE
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-[#00FFB4] font-medium truncate">
                              {tech.trade_specialty}
                            </div>

                            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 pt-1 flex-wrap">
                              <span className="flex items-center gap-1">
                                <BadgeCheck className="w-3.5 h-3.5 text-slate-500" />
                                {tech.badge_id}
                              </span>
                              {tech.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                                  {tech.phone}
                                </span>
                              )}
                            </div>

                            {tech.email && (
                              <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 pt-0.5 truncate">
                                <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span className="truncate">{tech.email}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Top Action Buttons: Edit & Delete */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            id={`edit-tech-top-btn-${tech.id}`}
                            type="button"
                            onClick={() => handleOpenEditForm(tech)}
                            title={`Edit ${tech.name} profile & upload files`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-amber-950/40 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {pendingDeleteTech?.id !== tech.id && (
                            <button
                              type="button"
                              disabled={isDeleting || technicians.length <= 1}
                              onClick={() => initiateDelete(tech)}
                              title={
                                technicians.length <= 1 
                                  ? "Must keep at least 1 technician" 
                                  : `Remove ${tech.name} from team`
                              }
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Inline Delete Confirmation */}
                      {pendingDeleteTech?.id === tech.id && (
                        <div className="p-2.5 rounded-lg bg-red-950/80 border border-red-500/50 flex items-center justify-between gap-2 animate-fadeIn">
                          <span className="text-[11px] text-red-200 font-mono font-medium">
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
                      )}

                      {/* Notes Display */}
                      {tech.notes && (
                        <div className="text-[11px] text-slate-300 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed">
                          {tech.notes}
                        </div>
                      )}

                      {/* Attached Files / Photos Display */}
                      {techAttachments.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
                            <Paperclip className="w-3 h-3 text-[#00E5FF]" />
                            <span>Attached Photos & Files ({techAttachments.length})</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {techAttachments.map((att) => {
                              const isImg = att.type.startsWith('image/') || att.data_url.startsWith('data:image/');
                              return (
                                <button
                                  key={att.id}
                                  type="button"
                                  onClick={() => setPreviewAttachment(att)}
                                  className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-[#00E5FF]/50 text-[10px] font-mono text-slate-200 transition-all max-w-[180px]"
                                  title={`Click to view ${att.name}`}
                                >
                                  {isImg ? (
                                    <ImageIcon className="w-3 h-3 text-[#00FFB4] shrink-0" />
                                  ) : (
                                    <FileText className="w-3 h-3 text-[#00E5FF] shrink-0" />
                                  )}
                                  <span className="truncate">{att.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Footer with Explicit EDIT & UPLOAD Action */}
                    <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono text-slate-500">
                        {techAttachments.length} file(s) attached
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          id={`edit-tech-card-btn-${tech.id}`}
                          type="button"
                          onClick={() => handleOpenEditForm(tech)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-950/60 text-amber-300 hover:text-amber-200 border border-amber-500/30 hover:border-amber-500/60 font-mono text-[11px] font-semibold transition-all shadow-sm cursor-pointer"
                        >
                          <Pencil className="w-3 h-3 text-amber-400" />
                          <span>EDIT / UPLOAD FILE</span>
                        </button>
                      </div>
                    </div>
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

      {/* Attachment Preview Lightbox Modal */}
      {previewAttachment && (
        <div 
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setPreviewAttachment(null)}
        >
          <div 
            className="bg-[#0D131F] border border-slate-700 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <div className="flex items-center gap-2 min-w-0">
                <Paperclip className="w-4 h-4 text-[#00FFB4] shrink-0" />
                <span className="text-xs font-mono text-white font-bold truncate">
                  {previewAttachment.name}
                </span>
                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                  ({formatFileSize(previewAttachment.size)})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewAttachment.data_url}
                  download={previewAttachment.name}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#00FFB4] text-black font-mono text-xs font-bold hover:brightness-110"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(null)}
                  className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 bg-black/80 flex items-center justify-center max-h-[75vh] overflow-auto">
              {(previewAttachment.type.startsWith('image/') || previewAttachment.data_url.startsWith('data:image/')) ? (
                <img
                  src={previewAttachment.data_url}
                  alt={previewAttachment.name}
                  className="max-h-[68vh] w-auto object-contain rounded"
                />
              ) : (
                <div className="py-12 px-6 text-center space-y-4">
                  <FileText className="w-14 h-14 text-[#00E5FF] mx-auto" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white">{previewAttachment.name}</p>
                    <p className="text-xs font-mono text-slate-400">
                      Document file ({previewAttachment.type || 'Binary'}) • {formatFileSize(previewAttachment.size)}
                    </p>
                  </div>
                  <a
                    href={previewAttachment.data_url}
                    download={previewAttachment.name}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00FFB4] text-black font-mono text-xs font-bold hover:brightness-110"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download File to Device</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
