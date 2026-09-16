import React, { useState, useMemo } from 'react';
import { 
  X, 
  Truck, 
  Plus, 
  Trash2, 
  Phone, 
  Mail, 
  Building2, 
  Search, 
  Star, 
  Loader2, 
  AlertCircle,
  FileText,
  CheckCircle2,
  PhoneCall,
  MessageSquare,
  Send,
  Copy,
  Check,
  Smartphone,
  ExternalLink,
  Sparkles,
  Pencil
} from 'lucide-react';
import { Vendor, VendorStatus, VENDOR_SPECIALTY_PRESETS } from '../types';
import { soundManager } from '../services/audio';

// Helper utilities for phone & messaging links
const getCleanPhone = (phoneStr: string) => phoneStr.replace(/[^0-9+]/g, '');

const getWhatsAppUrl = (phoneStr: string, message: string = '') => {
  const digits = phoneStr.replace(/\D/g, '');
  const clean = digits.length === 10 ? `1${digits}` : digits;
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
};

const getSmsUrl = (phoneStr: string, message: string = '') => {
  const clean = getCleanPhone(phoneStr);
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const sep = isIOS ? '&' : '?';
  return message ? `sms:${clean}${sep}body=${encodeURIComponent(message)}` : `sms:${clean}`;
};

const getVendorMessageTemplates = (vendor: Vendor) => [
  {
    label: 'Turnover Request',
    body: `Hi ${vendor.contact_person || vendor.name}, this is turnover maintenance. We have an upcoming unit make-ready needing ${vendor.trade_category}. Can you let us know your earliest availability for an estimate or start date? Thanks!`
  },
  {
    label: 'Schedule Crew',
    body: `Hi ${vendor.contact_person || vendor.name}, can you confirm if your team is available this week to take on ${vendor.trade_category} for our turnover schedule?`
  },
  {
    label: 'Job Completion Status',
    body: `Hi ${vendor.contact_person || vendor.name}, checking in on the completion and punch-out status for your ${vendor.trade_category} work at our property. Please text back an update. Thank you!`
  },
  {
    label: 'Urgent Priority',
    body: `URGENT - Hi ${vendor.contact_person || vendor.name}, we have an emergency turnover priority for ${vendor.trade_category}. Please call or text back ASAP.`
  }
];

interface ManageVendorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendors: Vendor[];
  onAddVendor: (vendor: Vendor) => Promise<void>;
  onUpdateVendor?: (vendor: Vendor) => Promise<void>;
  onDeleteVendor: (id: string) => Promise<void>;
}

export const ManageVendorsModal: React.FC<ManageVendorsModalProps> = ({
  isOpen,
  onClose,
  vendors,
  onAddVendor,
  onUpdateVendor,
  onDeleteVendor
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Form State
  const [companyName, setCompanyName] = useState('');
  const [tradeCategory, setTradeCategory] = useState(VENDOR_SPECIALTY_PRESETS[0]);
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<VendorStatus>('Preferred');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteVendor, setPendingDeleteVendor] = useState<Vendor | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Text Communication State
  const [textingVendor, setTextingVendor] = useState<Vendor | null>(null);
  const [customMessage, setCustomMessage] = useState<string>('');
  const [copiedFeedback, setCopiedFeedback] = useState<boolean>(false);

  const handleOpenTextModal = (vendor: Vendor) => {
    soundManager.playClick();
    setTextingVendor(vendor);
    const templates = getVendorMessageTemplates(vendor);
    setCustomMessage(templates[0].body);
    setCopiedFeedback(false);
  };

  const handleCopyMessage = async () => {
    if (!customMessage) return;
    try {
      await navigator.clipboard.writeText(customMessage);
      setCopiedFeedback(true);
      soundManager.playTaskCheck();
      setTimeout(() => setCopiedFeedback(false), 2500);
    } catch {
      // Fallback
    }
  };

  if (!isOpen) return null;

  const handleOpenAddForm = () => {
    soundManager.playClick();
    setEditingVendorId(null);
    setCompanyName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setNotes('');
    setStatus('Preferred');
    setTradeCategory(VENDOR_SPECIALTY_PRESETS[0]);
    setErrorMessage(null);
    setPendingDeleteVendor(null);
    setShowAddForm(true);
  };

  const handleOpenEditForm = (vendor: Vendor) => {
    soundManager.playClick();
    setEditingVendorId(vendor.id);
    setCompanyName(vendor.name);
    setTradeCategory(vendor.trade_category);
    setContactPerson(vendor.contact_person);
    setPhone(vendor.phone);
    setEmail(vendor.email || '');
    setStatus(vendor.status);
    setNotes(vendor.notes || '');
    setErrorMessage(null);
    setPendingDeleteVendor(null);
    setShowAddForm(true);

    setTimeout(() => {
      const formEl = document.getElementById('add-vendor-form');
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setErrorMessage('Please enter the vendor / company name.');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('Please provide a contact phone number.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      if (editingVendorId) {
        const existing = vendors.find(v => v.id === editingVendorId);
        const updatedVendor: Vendor = {
          id: editingVendorId,
          name: companyName.trim(),
          trade_category: tradeCategory,
          contact_person: contactPerson.trim() || 'Dispatch / Sales',
          phone: phone.trim(),
          email: email.trim() || undefined,
          status,
          notes: notes.trim() || undefined,
          created_at: existing?.created_at || Date.now()
        };

        if (onUpdateVendor) {
          await onUpdateVendor(updatedVendor);
        } else {
          await onAddVendor(updatedVendor);
        }
        soundManager.playSyncSuccess();
        setShowAddForm(false);
        setEditingVendorId(null);
      } else {
        const newId = `vendor-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const newVendor: Vendor = {
          id: newId,
          name: companyName.trim(),
          trade_category: tradeCategory,
          contact_person: contactPerson.trim() || 'Dispatch / Sales',
          phone: phone.trim(),
          email: email.trim() || undefined,
          status,
          notes: notes.trim() || undefined,
          created_at: Date.now()
        };

        await onAddVendor(newVendor);
        soundManager.playSyncSuccess();
        setShowAddForm(false);
      }

      setCompanyName('');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setNotes('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving vendor to database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const initiateDelete = (vendor: Vendor) => {
    soundManager.playClick();
    setErrorMessage(null);
    setPendingDeleteVendor(vendor);
  };

  const confirmDelete = async (vendor: Vendor) => {
    try {
      setDeletingId(vendor.id);
      setErrorMessage(null);
      await onDeleteVendor(vendor.id);
      soundManager.playTaskCheck();
      setPendingDeleteVendor(null);
    } catch (err: any) {
      setErrorMessage('Error removing vendor: ' + (err.message || 'Could not delete vendor from database.'));
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered list
  const filteredVendors = vendors.filter(v => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = !q || 
      v.name.toLowerCase().includes(q) ||
      v.trade_category.toLowerCase().includes(q) ||
      v.contact_person.toLowerCase().includes(q) ||
      v.phone.toLowerCase().includes(q) ||
      (v.notes && v.notes.toLowerCase().includes(q));

    const matchesCategory = selectedCategoryFilter === 'ALL' || v.trade_category === selectedCategoryFilter;
    return matchesQuery && matchesCategory;
  });

  // Extract unique categories in existing vendors
  const availableCategories = ['ALL', ...Array.from(new Set(vendors.map(v => v.trade_category)))];

  return (
    <div 
      id="manage-vendors-modal-backdrop" 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
    >
      <div 
        id="manage-vendors-modal-card" 
        className="bg-[#0D131F] border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00FFB4]/15 border border-[#00FFB4]/30 flex items-center justify-center text-[#00FFB4]">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-['Chakra_Petch'] font-bold text-white text-base sm:text-lg tracking-wide flex items-center gap-2">
                <span>TURNOVER VENDORS & CONTRACTORS</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-[#00FFB4] border border-slate-700 font-mono">
                  {vendors.length}
                </span>
              </h2>
              <p className="text-[11px] font-mono text-slate-400">
                Specialized external trade partners • Subcontractors & turnkey supply
              </p>
            </div>
          </div>
          <button
            id="close-manage-vendors-btn"
            onClick={() => { soundManager.playClick(); onClose(); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          
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
              <span className="font-bold text-white block font-['Chakra_Petch']">Partner Directory</span>
              <p className="text-slate-400 text-[11px]">
                Contractors for trade escalations, flooring replacement, painting, and deep punch-out turns.
              </p>
            </div>
            {!showAddForm && (
              <button
                id="btn-open-add-vendor-form"
                onClick={handleOpenAddForm}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#00FFB4] text-black font-bold text-xs tracking-wider uppercase hover:brightness-110 active:scale-95 transition-all whitespace-nowrap shadow-[0_0_15px_rgba(0,255,180,0.3)]"
              >
                <Plus className="w-4 h-4" />
                <span>NEW VENDOR</span>
              </button>
            )}
          </div>

          {/* Form to Add / Edit Vendor */}
          {showAddForm && (
            <form 
              id="add-vendor-form"
              onSubmit={handleSubmit}
              className={`p-4 sm:p-5 rounded-xl bg-slate-900/95 border space-y-4 shadow-xl animate-fadeIn ${
                editingVendorId ? 'border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.15)]' : 'border-[#00FFB4]/30'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 text-white font-['Chakra_Petch'] font-bold text-sm tracking-wide">
                  {editingVendorId ? (
                    <>
                      <Pencil className="w-4 h-4 text-amber-400" />
                      <span>EDIT VENDOR PROFILE</span>
                      <span className="text-[11px] font-mono text-amber-400 px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/30">
                        ID: {editingVendorId.slice(0, 10)}
                      </span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 text-[#00FFB4]" />
                      <span>REGISTER NEW VENDOR / SUBCONTRACTOR</span>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); setEditingVendorId(null); }}
                  className="text-xs font-mono text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Company Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#00FFB4]" />
                    Company / Vendor Name *
                  </label>
                  <input
                    id="input-vendor-name"
                    type="text"
                    required
                    placeholder="e.g. Apex Flooring Solutions"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00FFB4] focus:ring-1 focus:ring-[#00FFB4]"
                  />
                </div>

                {/* Trade Category */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-[#00FFB4]" />
                    Trade / Service Category *
                  </label>
                  <select
                    id="select-vendor-trade"
                    value={tradeCategory}
                    onChange={(e) => setTradeCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00FFB4] focus:ring-1 focus:ring-[#00FFB4]"
                  >
                    {VENDOR_SPECIALTY_PRESETS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Contact Person */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Contact Representative / Dispatcher
                  </label>
                  <input
                    id="input-vendor-contact"
                    type="text"
                    placeholder="e.g. Marcus Vance"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00FFB4] focus:ring-1 focus:ring-[#00FFB4]"
                  />
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#00FFB4]" />
                    Phone Number *
                  </label>
                  <input
                    id="input-vendor-phone"
                    type="tel"
                    required
                    placeholder="(555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00FFB4] focus:ring-1 focus:ring-[#00FFB4]"
                  />
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    Email Address (Optional)
                  </label>
                  <input
                    id="input-vendor-email"
                    type="email"
                    placeholder="orders@vendorpro.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00FFB4] focus:ring-1 focus:ring-[#00FFB4]"
                  />
                </div>

                {/* Priority Status */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-[#FFB800]" />
                    Vendor Status
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Preferred', 'Active', 'On-Call'] as VendorStatus[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatus(st)}
                        className={`py-2 px-2 rounded-lg text-xs font-mono font-semibold transition-all border ${
                          status === st
                            ? st === 'Preferred'
                              ? 'bg-[#FFB800]/20 text-[#FFB800] border-[#FFB800]'
                              : st === 'Active'
                              ? 'bg-[#00FFB4]/20 text-[#00FFB4] border-[#00FFB4]'
                              : 'bg-cyan-500/20 text-cyan-400 border-cyan-500'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Notes / Turnaround details */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  Notes / Rates / SLA Details
                </label>
                <textarea
                  id="input-vendor-notes"
                  rows={2}
                  placeholder="e.g. 24h turnaround for paint turn, provides bulk apartment turnover discount..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00FFB4] focus:ring-1 focus:ring-[#00FFB4]"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); setEditingVendorId(null); }}
                  className="px-4 py-2 rounded-lg text-xs font-mono text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-vendor"
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs tracking-wider uppercase active:scale-95 transition-all shadow disabled:opacity-50 ${
                    editingVendorId
                      ? 'bg-amber-400 hover:bg-amber-300 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                      : 'bg-[#00FFB4] hover:brightness-110 text-black shadow-[0_0_15px_rgba(0,255,180,0.3)]'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>SAVING TO CLOUD...</span>
                    </>
                  ) : editingVendorId ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>SAVE CHANGES</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>SAVE VENDOR</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="search-vendors-input"
                type="text"
                placeholder="Search vendor name, trade, contact or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00FFB4]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {availableCategories.length > 2 && (
              <select
                id="filter-vendor-category-select"
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono focus:outline-none focus:border-[#00FFB4]"
              >
                {availableCategories.map((c) => (
                  <option key={c} value={c}>
                    {c === 'ALL' ? 'All Trade Specialties' : c}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Vendors Roster Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span className="uppercase tracking-wider font-bold">
                Registered Vendors ({filteredVendors.length})
              </span>
              {filteredVendors.length !== vendors.length && (
                <span className="text-[11px] text-[#00FFB4]">
                  Filtered from {vendors.length} total
                </span>
              )}
            </div>

            {filteredVendors.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-3">
                <Truck className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="text-slate-300 text-sm font-semibold">No vendors found</div>
                <p className="text-slate-500 text-xs max-w-sm mx-auto">
                  {searchQuery 
                    ? `No vendors matched "${searchQuery}". Try clearing search or select a different category.` 
                    : 'No turnover vendors registered yet. Click "+ NEW VENDOR" above to register your first partner.'}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(''); setSelectedCategoryFilter('ALL'); }}
                    className="text-xs text-[#00FFB4] underline font-mono hover:brightness-125"
                  >
                    Clear Search Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredVendors.map((vendor) => {
                  const isDeleting = deletingId === vendor.id;
                  const isPendingDelete = pendingDeleteVendor?.id === vendor.id;

                  return (
                    <div
                      key={vendor.id}
                      className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-all flex flex-col justify-between gap-3 relative group"
                    >
                      {/* Card Content Top */}
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-white text-sm tracking-wide truncate">
                                {vendor.name}
                              </h4>
                              {vendor.status === 'Preferred' && (
                                <span className="flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#FFB800]/15 text-[#FFB800] border border-[#FFB800]/30">
                                  <Star className="w-2.5 h-2.5 fill-[#FFB800]" />
                                  PREFERRED
                                </span>
                              )}
                              {vendor.status === 'Active' && (
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#00FFB4]/15 text-[#00FFB4] border border-[#00FFB4]/30">
                                  ACTIVE
                                </span>
                              )}
                              {vendor.status === 'On-Call' && (
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                                  ON-CALL
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-[#00FFB4] font-medium pt-0.5">
                              {vendor.trade_category}
                            </div>
                          </div>

                          {/* Card Top Actions (Edit & Delete) */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              id={`edit-vendor-header-btn-${vendor.id}`}
                              type="button"
                              onClick={() => handleOpenEditForm(vendor)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-amber-950/40 transition-colors shrink-0"
                              title={`Edit ${vendor.name}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            {/* Delete Button (inline confirm state) */}
                            {!isPendingDelete && (
                              <button
                                id={`delete-vendor-btn-${vendor.id}`}
                                type="button"
                                onClick={() => initiateDelete(vendor)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-colors shrink-0"
                                title={`Delete ${vendor.name}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Inline Delete Confirmation Bar */}
                        {isPendingDelete && (
                          <div className="p-2 rounded-lg bg-red-950/80 border border-red-500/50 flex items-center justify-between gap-2 animate-fadeIn">
                            <span className="text-[11px] text-red-200 font-mono font-medium truncate">
                              Remove {vendor.name.split(' ')[0]}?
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => confirmDelete(vendor)}
                                className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white font-mono text-[10px] font-bold transition-all shadow flex items-center gap-1"
                              >
                                {isDeleting ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  'Confirm'
                                )}
                              </button>
                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => setPendingDeleteVendor(null)}
                                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px]"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Contact details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-slate-300 pt-1">
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="truncate">{vendor.contact_person}</span>
                          </div>
                          <a
                            href={`tel:${vendor.phone}`}
                            onClick={() => soundManager.playClick()}
                            className="flex items-center gap-1.5 text-slate-300 hover:text-[#00FFB4] transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>{vendor.phone}</span>
                          </a>
                        </div>

                        {vendor.email && (
                          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 truncate">
                            <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <a 
                              href={`mailto:${vendor.email}`} 
                              className="hover:text-[#00FFB4] truncate transition-colors"
                            >
                              {vendor.email}
                            </a>
                          </div>
                        )}

                        {vendor.notes && (
                          <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 leading-relaxed">
                            {vendor.notes}
                          </div>
                        )}
                      </div>

                      {/* Card Footer Quick Actions */}
                      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono text-slate-500">
                          ID: {vendor.id.slice(0, 10)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            id={`edit-vendor-btn-${vendor.id}`}
                            type="button"
                            onClick={() => handleOpenEditForm(vendor)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-amber-950/60 text-amber-300 hover:text-amber-200 border border-amber-500/30 hover:border-amber-500/60 font-mono text-[10px] font-semibold transition-all shadow-sm"
                            title={`Edit ${vendor.name}`}
                          >
                            <Pencil className="w-3 h-3 text-amber-400" />
                            <span>EDIT</span>
                          </button>
                          <a
                            id={`call-vendor-btn-${vendor.id}`}
                            href={`tel:${vendor.phone}`}
                            onClick={() => soundManager.playClick()}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[#00FFB4] font-mono text-[10px] font-semibold transition-colors"
                            title={`Call ${vendor.name}`}
                          >
                            <PhoneCall className="w-3 h-3" />
                            <span>CALL</span>
                          </a>
                          <button
                            id={`text-vendor-btn-${vendor.id}`}
                            type="button"
                            onClick={() => handleOpenTextModal(vendor)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-950/80 border border-cyan-500/40 hover:bg-cyan-900/80 text-cyan-300 hover:text-cyan-100 font-mono text-[10px] font-semibold transition-all shadow-sm"
                            title={`Send text message or SMS to ${vendor.name}`}
                          >
                            <MessageSquare className="w-3 h-3 text-cyan-400" />
                            <span>TEXT / SMS</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-900/70 flex items-center justify-between text-xs font-mono text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00FFB4]" />
            <span>Synced with Firestore cloud & local offline storage</span>
          </div>
          <button
            onClick={() => { soundManager.playClick(); onClose(); }}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Interactive Text / SMS Dispatch Composer Modal */}
      {textingVendor && (
        <div 
          id="vendor-text-composer-backdrop"
          className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
        >
          <div 
            id="vendor-text-composer-card"
            className="bg-[#0B111D] border border-cyan-500/40 rounded-2xl w-full max-w-lg overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.15)] animate-scaleUp flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-['Chakra_Petch'] font-bold text-white text-sm sm:text-base tracking-wide flex items-center gap-2">
                    <span>TEXT MESSAGE COMPOSER</span>
                  </h3>
                  <p className="text-[11px] font-mono text-cyan-400">
                    {textingVendor.name} • {textingVendor.phone}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { soundManager.playClick(); setTextingVendor(null); }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-5 space-y-4">
              {/* Recipient Details pill */}
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2 text-xs font-mono">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-slate-400">To:</span>
                  <span className="font-bold text-white truncate">{textingVendor.contact_person}</span>
                  <span className="text-slate-500">({textingVendor.trade_category})</span>
                </div>
                <span className="text-[#00FFB4] font-bold shrink-0">{textingVendor.phone}</span>
              </div>

              {/* Quick Template Chips */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-1 text-slate-300">
                    <Sparkles className="w-3 h-3 text-[#00FFB4]" />
                    Quick Turnover Message Templates:
                  </span>
                  <span>Click to insert</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {getVendorMessageTemplates(textingVendor).map((t, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        setCustomMessage(t.body);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-cyan-950/60 text-slate-300 hover:text-cyan-300 border border-slate-700/80 hover:border-cyan-500/40 text-[10px] font-mono transition-all"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Editable Message Box */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-300 flex items-center justify-between">
                  <span>Message text:</span>
                  <span className="text-[10px] text-slate-500">{customMessage.length} characters</span>
                </label>
                <textarea
                  id="vendor-sms-textarea"
                  rows={4}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Type your message to the vendor..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 leading-relaxed font-sans"
                />
              </div>

              {/* Action Buttons: SMS, WhatsApp, Copy */}
              <div className="space-y-2 pt-1">
                <div className="text-[11px] font-mono text-slate-400">
                  Choose how to send:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Native SMS / Messages App */}
                  <a
                    id="btn-open-native-sms"
                    href={getSmsUrl(textingVendor.phone, customMessage)}
                    onClick={() => soundManager.playTaskCheck()}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95 text-center"
                  >
                    <Smartphone className="w-3.5 h-3.5 shrink-0" />
                    <span>OPEN SMS</span>
                  </a>

                  {/* WhatsApp */}
                  <a
                    id="btn-open-whatsapp"
                    href={getWhatsAppUrl(textingVendor.phone, customMessage)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => soundManager.playTaskCheck()}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-black font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(37,211,102,0.3)] active:scale-95 text-center"
                  >
                    <Send className="w-3.5 h-3.5 shrink-0" />
                    <span>WHATSAPP</span>
                  </a>

                  {/* Copy Text */}
                  <button
                    id="btn-copy-vendor-text"
                    type="button"
                    onClick={handleCopyMessage}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-mono text-xs uppercase tracking-wider transition-all border ${
                      copiedFeedback
                        ? 'bg-[#00FFB4]/20 border-[#00FFB4] text-[#00FFB4]'
                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                    }`}
                  >
                    {copiedFeedback ? (
                      <>
                        <Check className="w-3.5 h-3.5 shrink-0 text-[#00FFB4]" />
                        <span>COPIED!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 shrink-0" />
                        <span>COPY TEXT</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="text-[11px] text-slate-500">
                Direct SMS compatible with iPhone, Android and desktop
              </span>
              <button
                type="button"
                onClick={() => { soundManager.playClick(); setTextingVendor(null); }}
                className="px-3 py-1 rounded-lg text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
