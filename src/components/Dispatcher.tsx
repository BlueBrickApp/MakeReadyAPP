import React, { useState } from 'react';
import { 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Wrench, 
  User, 
  Building, 
  ShieldAlert, 
  PlusCircle, 
  Check, 
  MessageSquare,
  Search,
  Filter
} from 'lucide-react';
import { 
  WorkOrder, 
  Unit, 
  TradeCategory, 
  TRADE_CATEGORIES, 
  WorkOrderPriority, 
  WorkOrderStatus, 
  TechnicianUser 
} from '../types';
import { ACTIVE_TECHNICIANS } from '../services/db';
import { soundManager } from '../services/audio';

interface DispatcherProps {
  workOrders: WorkOrder[];
  units: Unit[];
  currentUser: TechnicianUser;
  technicians?: TechnicianUser[];
  onCreateWorkOrder: (order: Omit<WorkOrder, 'id' | 'created_at' | 'sync_status'>) => Promise<void>;
  onUpdateStatus: (id: string, status: WorkOrderStatus, resolutionNotes?: string) => Promise<void>;
  prefilledUnitId?: string;
  prefilledTrade?: TradeCategory;
  prefilledTaskName?: string;
}

export const Dispatcher: React.FC<DispatcherProps> = ({
  workOrders,
  units,
  currentUser,
  technicians,
  onCreateWorkOrder,
  onUpdateStatus,
  prefilledUnitId,
  prefilledTrade,
  prefilledTaskName
}) => {
  // Form State
  const [selectedUnitId, setSelectedUnitId] = useState<string>(prefilledUnitId || units[0]?.id || '');
  const [tradeCategory, setTradeCategory] = useState<TradeCategory>(prefilledTrade || 'Plumbing');
  const [priority, setPriority] = useState<WorkOrderPriority>('High');
  const [technicianId, setTechnicianId] = useState<string>(currentUser.id);
  const [description, setDescription] = useState<string>(
    prefilledTaskName ? `Punch-list defect on: ${prefilledTaskName} - ` : ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // List filter state
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [searchQuery, setSearchQuery] = useState('');

  // Resolution modal state
  const [resolvingOrderId, setResolvingOrderId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !selectedUnitId) return;

    const unit = units.find(u => u.id === selectedUnitId);
    if (!unit) return;

    setIsSubmitting(true);
    soundManager.playClick();
    try {
      await onCreateWorkOrder({
        unit_id: unit.id,
        unit_number: unit.unit_number,
        trade_category: tradeCategory,
        priority,
        description: description.trim(),
        status: 'Open',
        technician_id: technicianId,
        created_by: currentUser.name
      });
      setDescription('');
      setSuccessMessage(`Dispatched Work Order for Unit #${unit.unit_number}`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveSubmit = async (orderId: string) => {
    soundManager.playTaskCheck();
    await onUpdateStatus(orderId, 'Resolved', resolutionNotes);
    setResolvingOrderId(null);
    setResolutionNotes('');
  };

  const filteredOrders = workOrders.filter(w => {
    const matchesStatus = 
      statusFilter === 'all' ? true :
      statusFilter === 'active' ? (w.status === 'Open' || w.status === 'In Progress') :
      w.status === statusFilter;
    const q = (searchQuery || '').toLowerCase();
    const desc = String(w.description || '').toLowerCase();
    const unitNum = String(w.unit_number || '').toLowerCase();
    const trade = String(w.trade_category || '').toLowerCase();
    const matchesSearch = 
      desc.includes(q) ||
      unitNum.includes(q) ||
      trade.includes(q);
    return matchesStatus && matchesSearch;
  });

  const getPriorityStyle = (p: WorkOrderPriority) => {
    switch (p) {
      case 'Emergency':
        return 'bg-[#FF3366]/20 text-[#FF3366] border-[#FF3366] shadow-[0_0_10px_rgba(255,51,102,0.3)] animate-pulse';
      case 'High':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/50';
      case 'Medium':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50';
      case 'Low':
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-[#00FFB4]" />
            <h2 className="text-xl font-['Chakra_Petch'] font-bold text-white tracking-wide">
              FIELD WORK ORDER DISPATCHER
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Rapid maintenance dispatch, priority escalation, and defect tracking
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Create Work Order Form (5 cols) */}
        <div className="lg:col-span-5 bg-[#0D131F] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-['Chakra_Petch'] font-bold text-base text-white flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-[#00FFB4]" />
              <span>Create Ad-Hoc Work Order</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-400">
              DISPATCH AS: <strong className="text-slate-200">{currentUser.name}</strong>
            </span>
          </div>

          {successMessage && (
            <div className="p-3 rounded-lg bg-[#00FFB4]/15 border border-[#00FFB4] text-xs font-mono text-[#00FFB4] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
            
            {/* Unit Selector */}
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-mono text-[11px] uppercase tracking-wider">
                Target Apartment Unit *
              </label>
              <select
                value={selectedUnitId}
                onChange={(e) => setSelectedUnitId(e.target.value)}
                required
                className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-['Chakra_Petch'] font-bold text-sm focus:outline-none focus:border-[#00FFB4] cursor-pointer"
              >
                {units.map(u => (
                  <option key={u.id} value={u.id}>
                    Unit #{u.unit_number} ({u.floor_plan}) - {u.building}
                  </option>
                ))}
              </select>
            </div>

            {/* Trade & Priority Row */}
            <div className="grid grid-cols-2 gap-3">
              
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-mono text-[11px] uppercase tracking-wider">
                  Trade Category *
                </label>
                <select
                  value={tradeCategory}
                  onChange={(e) => setTradeCategory(e.target.value as TradeCategory)}
                  className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-[#00FFB4] cursor-pointer"
                >
                  {TRADE_CATEGORIES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-300 font-mono text-[11px] uppercase tracking-wider">
                  Priority Level *
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as WorkOrderPriority)}
                  className={`w-full p-2 rounded-lg bg-slate-950 border text-slate-200 font-bold focus:outline-none cursor-pointer ${
                    priority === 'Emergency' ? 'border-[#FF3366] text-[#FF3366]' : 'border-slate-700'
                  }`}
                >
                  <option value="Emergency">🚨 Emergency (Immediate)</option>
                  <option value="High">⚠️ High Priority</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

            </div>

            {/* Assignee */}
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-mono text-[11px] uppercase tracking-wider">
                Assigned Field Technician
              </label>
              <select
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-[#00FFB4] cursor-pointer"
              >
                {(technicians && technicians.length > 0 ? technicians : ACTIVE_TECHNICIANS).map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.trade_specialty})
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-mono text-[11px] uppercase tracking-wider">
                Issue Description & Parts Required *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={3}
                placeholder="Describe exact defect location, broken component, part specs..."
                className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#00FFB4]"
              />
            </div>

            {/* Submit Button */}
            <button
              id="submit-work-order-btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-lg bg-[#00FFB4] text-black font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_15px_rgba(0,255,180,0.35)] cursor-pointer min-h-[44px]"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Dispatching...' : 'Dispatch Work Order'}</span>
            </button>

          </form>
        </div>

        {/* Right Column: Work Orders Feed & Management (7 cols) */}
        <div className="lg:col-span-7 bg-[#0D131F] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-['Chakra_Petch'] font-bold text-base text-white">
                Active Maintenance Dispatch Queue
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {filteredOrders.length} order(s) listed
              </p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-[#00FFB4]"
              >
                <option value="active">Active Orders (Open & In Progress)</option>
                <option value="all">All Orders</option>
                <option value="Open">Open Only</option>
                <option value="In Progress">In Progress Only</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
          </div>

          {/* Orders List */}
          <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
            {filteredOrders.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs font-mono">
                No work orders match the current filter.
              </div>
            ) : (
              filteredOrders.map((order) => {
                const assignedTech = ACTIVE_TECHNICIANS.find(t => t.id === order.technician_id);
                const isResolved = order.status === 'Resolved';
                const isBeingResolved = resolvingOrderId === order.id;

                return (
                  <div
                    key={order.id}
                    className={`p-4 rounded-xl border transition-all space-y-3 ${
                      isResolved
                        ? 'bg-slate-950/60 border-slate-800/80 opacity-75'
                        : order.priority === 'Emergency'
                        ? 'bg-red-950/20 border-[#FF3366]/60 shadow-[0_0_15px_rgba(255,51,102,0.15)]'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${getPriorityStyle(order.priority)}`}>
                            {order.priority}
                          </span>
                          <span className="font-['Chakra_Petch'] font-bold text-base text-white">
                            Unit #{order.unit_number}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                            {order.trade_category}
                          </span>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        order.status === 'Resolved'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : order.status === 'In Progress'
                          ? 'bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        {order.status}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-200 leading-relaxed font-sans">
                      {order.description}
                    </p>

                    {/* Resolution notes if resolved */}
                    {order.resolution_notes && (
                      <div className="p-2 rounded bg-slate-950/90 border border-emerald-500/30 text-xs text-emerald-300 font-mono">
                        <strong className="text-emerald-400">Resolution:</strong> {order.resolution_notes}
                      </div>
                    )}

                    {/* Footer: Tech info + Status Actions */}
                    <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-slate-400">
                      
                      <div className="flex items-center gap-2">
                        <img 
                          src={assignedTech?.avatar} 
                          alt={assignedTech?.name} 
                          className="w-5 h-5 rounded-full object-cover border border-slate-700" 
                        />
                        <span>Assigned: <strong className="text-slate-200">{assignedTech?.name}</strong></span>
                      </div>

                      {/* State actions */}
                      {!isResolved && (
                        <div className="flex items-center gap-2">
                          {order.status === 'Open' && (
                            <button
                              onClick={() => {
                                soundManager.playClick();
                                onUpdateStatus(order.id, 'In Progress');
                              }}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold"
                            >
                              Start Work
                            </button>
                          )}

                          <button
                            onClick={() => {
                              soundManager.playClick();
                              setResolvingOrderId(order.id);
                            }}
                            className="px-2.5 py-1 rounded bg-[#00FFB4]/20 hover:bg-[#00FFB4]/30 text-[#00FFB4] border border-[#00FFB4]/40 text-xs font-semibold flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Mark Resolved</span>
                          </button>
                        </div>
                      )}

                    </div>

                    {/* Inline Resolution Notes Box */}
                    {isBeingResolved && (
                      <div className="mt-3 p-3 rounded-lg bg-slate-950 border border-[#00FFB4] space-y-2">
                        <label className="block text-[11px] font-mono text-slate-300">
                          Technician Resolution Notes (Parts replaced, code verified):
                        </label>
                        <input
                          type="text"
                          value={resolutionNotes}
                          onChange={(e) => setResolutionNotes(e.target.value)}
                          placeholder="e.g. Replaced angle stop, leak tested under full line pressure."
                          className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-[#00FFB4]"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setResolvingOrderId(null)}
                            className="px-2.5 py-1 rounded bg-slate-800 text-xs text-slate-400 hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleResolveSubmit(order.id)}
                            className="px-3 py-1 rounded bg-[#00FFB4] text-black font-bold text-xs hover:brightness-110"
                          >
                            Confirm Resolution
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
