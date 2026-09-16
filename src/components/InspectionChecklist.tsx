import React, { useState, useRef } from 'react';
import { 
  Check, 
  Camera, 
  Upload, 
  AlertTriangle, 
  Image as ImageIcon, 
  X, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Wrench, 
  ShieldAlert, 
  RefreshCw, 
  Sparkles,
  ExternalLink,
  ChevronDown,
  Building,
  User,
  Calendar,
  Info
} from 'lucide-react';
import { 
  Unit, 
  Checklist, 
  Task, 
  TradeCategory, 
  TRADE_CATEGORIES, 
  TechnicianUser 
} from '../types';
import { soundManager } from '../services/audio';

interface InspectionChecklistProps {
  units: Unit[];
  selectedUnitId: string | null;
  onSelectUnitId: (unitId: string) => void;
  selectedTrade: TradeCategory;
  onSelectTrade: (trade: TradeCategory) => void;
  checklists: Checklist[];
  currentUser: TechnicianUser;
  onUpdateTask: (checklistId: string, taskId: string, updates: Partial<Task>) => Promise<void>;
  onCreateWorkOrderFromTask: (unitId: string, unitNumber: string, trade: TradeCategory, taskName: string) => void;
  onSimulateConflict: (checklistId: string, taskId: string) => void;
}

// Curated high quality inspection sample photos for technicians
const SAMPLE_INSPECTION_PHOTOS = [
  'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=800&auto=format&fit=crop&q=80'
];

export const InspectionChecklist: React.FC<InspectionChecklistProps> = ({
  units,
  selectedUnitId,
  onSelectUnitId,
  selectedTrade,
  onSelectTrade,
  checklists,
  currentUser,
  onUpdateTask,
  onCreateWorkOrderFromTask,
  onSimulateConflict
}) => {
  const currentUnit = units.find(u => u.id === selectedUnitId) || units[0];

  if (!currentUnit) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4 my-16 bg-[#0D131F] border border-slate-800 rounded-2xl shadow-xl">
        <Building className="w-12 h-12 text-[#00FFB4] mx-auto" />
        <h3 className="font-['Chakra_Petch'] font-bold text-lg text-white">NO APARTMENTS REGISTERED</h3>
        <p className="text-xs text-slate-400 font-mono">
          Your Firebase database is clean. Register an apartment with "+ NEW UNIT" to access its trade checklists.
        </p>
      </div>
    );
  }

  const unitChecklists = checklists.filter(c => c.unit_id === currentUnit?.id);
  const currentChecklist = unitChecklists.find(c => c.trade_category === selectedTrade);

  const [activePhotoModal, setActivePhotoModal] = useState<string | null>(null);
  const [editingNotesTaskId, setEditingNotesTaskId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState<string>('');
  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetTaskIdForUpload, setTargetTaskIdForUpload] = useState<string | null>(null);

  const tasks = currentChecklist?.task_list || [];
  const completedCount = tasks.filter(t => t.is_completed).length;
  const pct = currentChecklist?.completion_percentage || 0;
  const is100 = pct === 100;

  // Toggle task completion
  const handleToggleTask = async (task: Task) => {
    if (!currentChecklist) return;
    const nextCompleted = !task.is_completed;
    await onUpdateTask(currentChecklist.id, task.id, {
      is_completed: nextCompleted
    });
  };

  // Handle local file upload (with base64 conversion)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetTaskIdForUpload || !currentChecklist) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      await onUpdateTask(currentChecklist.id, targetTaskIdForUpload, {
        photo_url: base64
      });
      setTargetTaskIdForUpload(null);
    };
    reader.readAsDataURL(file);
  };

  // Quick attach sample inspection photo
  const handleQuickSamplePhoto = async (taskId: string, index: number) => {
    if (!currentChecklist) return;
    const sample = SAMPLE_INSPECTION_PHOTOS[index % SAMPLE_INSPECTION_PHOTOS.length];
    await onUpdateTask(currentChecklist.id, taskId, {
      photo_url: sample
    });
  };

  // Save notes
  const handleSaveNotes = async (taskId: string) => {
    if (!currentChecklist) return;
    await onUpdateTask(currentChecklist.id, taskId, {
      notes: tempNotes
    });
    setEditingNotesTaskId(null);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* Top Header & Unit Selector */}
      <div className="bg-[#0D131F] border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00FFB4] shadow-[0_0_8px_#00FFB4]" />
              <h2 className="text-xl font-['Chakra_Petch'] font-bold text-white tracking-wide">
                DYNAMIC INSPECTION PUNCH-LIST
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Fixed sequential trade execution • Real-time field capture • Offline cached
            </p>
          </div>

          {/* Unit selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">Unit:</span>
            <select
              value={currentUnit?.id}
              onChange={(e) => {
                soundManager.playClick();
                onSelectUnitId(e.target.value);
              }}
              className="bg-slate-900 border border-slate-700 text-white font-['Chakra_Petch'] font-bold text-base px-3 py-1.5 rounded-lg focus:outline-none focus:border-[#00FFB4] cursor-pointer"
            >
              {units.map(u => (
                <option key={u.id} value={u.id} className="bg-slate-900 text-white font-sans text-sm">
                  #{u.unit_number} ({u.floor_plan}) - {u.current_status}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Apartment Details Sheet (Reflected in real time on mobile & desktop) */}
        {currentUnit && (
          <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg space-y-2 text-xs">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-slate-300 font-mono text-[11px]">
              <span className="flex items-center gap-1 text-white">
                <Building className="w-3.5 h-3.5 text-[#00FFB4]" />
                <span className="text-slate-400">Unit:</span> #{currentUnit.unit_number} {currentUnit.building ? `(Bldg ${currentUnit.building}${currentUnit.floor ? `, Floor ${currentUnit.floor}` : ''})` : ''}
              </span>
              <span className="flex items-center gap-1">
                <span className="text-slate-400">Layout:</span> <strong className="text-white">{currentUnit.floor_plan}</strong>
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-400">Assigned Tech:</span> <strong className="text-white">{currentUnit.assigned_tech || 'Unassigned'}</strong>
              </span>
              {currentUnit.target_ready_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-slate-400">Target Ready:</span> <strong className="text-white">{currentUnit.target_ready_date}</strong>
                </span>
              )}
              {currentUnit.move_out_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-400">Move-out:</span> <strong className="text-white">{currentUnit.move_out_date}</strong>
                </span>
              )}
            </div>

            {currentUnit.notes && (
              <div className="flex items-start gap-1.5 pt-1.5 border-t border-slate-800/80 text-[11px] text-slate-300">
                <Info className="w-3.5 h-3.5 text-[#00FFB4] shrink-0 mt-0.5" />
                <div>
                  <span className="font-mono text-slate-400 font-semibold mr-1.5">Intake Notes:</span>
                  <span className="italic">{currentUnit.notes}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 6 Trade Tabs Selector */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2 border-t border-slate-800">
          {TRADE_CATEGORIES.map((trade) => {
            const chk = unitChecklists.find(c => c.trade_category === trade);
            const tradePct = chk?.completion_percentage || 0;
            const isTradeDone = tradePct === 100;
            const isSelected = selectedTrade === trade;

            return (
              <button
                key={trade}
                id={`trade-tab-${trade.toLowerCase()}`}
                onClick={() => {
                  soundManager.playClick();
                  onSelectTrade(trade);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all select-none min-h-[44px] ${
                  isSelected
                    ? 'bg-[#00FFB4] text-black shadow-[0_0_15px_rgba(0,255,180,0.35)] font-bold'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                <span>{trade}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  isSelected 
                    ? 'bg-black text-[#00FFB4]' 
                    : isTradeDone
                    ? 'bg-[#00FFB4]/20 text-[#00FFB4]'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {tradePct}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Trade Overview & 100% Notice */}
      <div className="bg-[#0A0E17] border border-slate-800/90 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-['Chakra_Petch'] font-bold text-lg text-white">
              {selectedTrade} Inspection Punch-List
            </h3>
            <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-900 border border-slate-700 text-slate-300">
              Unit #{currentUnit?.unit_number}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Rules: Tasks must be executed in fixed sequence. Missing photo warnings alert supervisors but do not block technician sign-off.
          </p>
        </div>

        {/* Trade Progress Metric */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs font-mono text-slate-400">Trade Completion</div>
            <div className="text-xl font-['Chakra_Petch'] font-bold text-[#00FFB4]">
              {completedCount} / {tasks.length} ({pct}%)
            </div>
          </div>
          <div className="w-14 h-14 rounded-full border-4 border-slate-800 flex items-center justify-center relative">
            <span className="font-['Chakra_Petch'] font-bold text-sm text-[#00FFB4]">{pct}%</span>
          </div>
        </div>
      </div>

      {/* 100% Completed Alert Banner */}
      {is100 && (
        <div className="p-4 rounded-xl bg-[#00FFB4]/10 border-2 border-[#00FFB4] shadow-[0_0_20px_rgba(0,255,180,0.25)] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#00FFB4] text-black">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-['Chakra_Petch'] font-bold text-base text-[#00FFB4]">
                TRADE 100% COMPLETE - SUPERVISOR ALERT DISPATCHED
              </h4>
              <p className="text-xs text-slate-300">
                Automated notification sent to Supervisor Sarah Vance for review.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-block px-3 py-1 rounded bg-black text-[#00FFB4] font-mono text-xs font-bold uppercase border border-[#00FFB4]">
            Verified
          </span>
        </div>
      )}

      {/* Task List (Fixed sequence - rule enforced) */}
      <div className="space-y-4">
        {tasks.map((task, index) => {
          const isDone = task.is_completed;
          const hasPhoto = !!task.photo_url;
          const isMissingPhotoWarning = isDone && !hasPhoto;

          return (
            <div
              key={task.id}
              className={`rounded-xl border transition-all shadow-md ${
                isDone
                  ? 'bg-[#0D131F]/90 border-[#00FFB4]/40 shadow-[0_0_15px_rgba(0,255,180,0.06)]'
                  : 'bg-[#0D131F] border-slate-800/90 hover:border-slate-700'
              }`}
            >
              {/* Task Header Bar */}
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                
                {/* Left: Checkbox + Sequence + Name */}
                <div className="flex items-start gap-3.5 flex-1">
                  
                  {/* High-touch Target Checkbox */}
                  <button
                    id={`task-check-${task.id}`}
                    onClick={() => handleToggleTask(task)}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                      isDone
                        ? 'bg-[#00FFB4] text-black shadow-[0_0_15px_rgba(0,255,180,0.5)] border-2 border-[#00FFB4]'
                        : 'bg-slate-900 hover:bg-slate-800 text-transparent hover:text-slate-600 border-2 border-slate-700 hover:border-slate-500'
                    }`}
                    title={isDone ? "Click to uncheck task" : "Click to mark task complete"}
                  >
                    <Check className={`w-6 h-6 stroke-[3] ${isDone ? 'text-black' : ''}`} />
                  </button>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-900 text-slate-400 border border-slate-700">
                        STEP #{task.sequence_order}
                      </span>
                      <h4 className={`text-base font-bold transition-colors ${
                        isDone ? 'text-white' : 'text-slate-100'
                      }`}>
                        {task.name}
                      </h4>
                      {isDone && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#00FFB4]/15 text-[#00FFB4] border border-[#00FFB4]/40">
                          VERIFIED
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {task.description}
                    </p>

                    {isDone && task.completed_by && (
                      <div className="text-[11px] font-mono text-slate-400 pt-0.5">
                        Logged by <strong className="text-slate-200">{task.completed_by}</strong> {task.completed_at ? `(${new Date(task.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ''}
                      </div>
                    )}
                  </div>

                </div>

                {/* Right Quick Controls: Work Order & Conflict Simulation */}
                <div className="flex items-center gap-2 self-end sm:self-start">
                  <button
                    id={`task-wo-btn-${task.id}`}
                    onClick={() => {
                      soundManager.playClick();
                      onCreateWorkOrderFromTask(currentUnit.id, currentUnit.unit_number, selectedTrade, task.name);
                    }}
                    title="Flag Defect / Create Ad-hoc Work Order"
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-[#FF3366]/20 text-slate-400 hover:text-[#FF3366] border border-slate-700 hover:border-[#FF3366]/40 text-xs font-mono font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Flag Defect</span>
                  </button>

                  <button
                    id={`task-conflict-btn-${task.id}`}
                    onClick={() => {
                      soundManager.playClick();
                      onSimulateConflict(currentChecklist?.id || '', task.id);
                    }}
                    title="Simulate simultaneous update from another technician to test conflict resolution"
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-[#00E5FF]/20 text-slate-400 hover:text-[#00E5FF] border border-slate-700 hover:border-[#00E5FF]/40 text-xs font-mono font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Test Conflict</span>
                  </button>
                </div>

              </div>

              {/* Missing Photo Warning Banner (Allowed to proceed, warning displayed) */}
              {isMissingPhotoWarning && (
                <div className="mx-4 sm:mx-5 mb-3 p-2.5 rounded-lg bg-[#FFB800]/10 border border-[#FFB800]/40 flex items-start gap-2.5 text-xs text-[#FFB800]">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#FFB800]" />
                  <div>
                    <strong>Warning: Photographic evidence missing.</strong> Status update recorded locally; allowed to proceed, but supervisor will review during final walk.
                  </div>
                </div>
              )}

              {/* Photo & Notes Section */}
              <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-2 border-t border-slate-800/80 flex flex-col md:flex-row md:items-start gap-4">
                
                {/* Photo Upload Area */}
                <div className="w-full md:w-56 shrink-0 space-y-2">
                  <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-[#00FFB4]" />
                    <span>Inspection Photo</span>
                  </div>

                  {task.photo_url ? (
                    <div className="relative group rounded-lg overflow-hidden border border-slate-700 bg-black aspect-video sm:aspect-square flex items-center justify-center">
                      <img 
                        src={task.photo_url} 
                        alt={task.name} 
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => setActivePhotoModal(task.photo_url!)}
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={() => setActivePhotoModal(task.photo_url!)}
                          className="p-1.5 rounded-md bg-slate-800 text-white hover:bg-slate-700"
                          title="Zoom Photo"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (currentChecklist) {
                              onUpdateTask(currentChecklist.id, task.id, { photo_url: undefined });
                            }
                          }}
                          className="p-1.5 rounded-md bg-red-900/80 text-red-200 hover:bg-red-800"
                          title="Remove Photo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Upload / Camera trigger */}
                      <button
                        id={`upload-photo-${task.id}`}
                        onClick={() => {
                          soundManager.playClick();
                          setTargetTaskIdForUpload(task.id);
                          fileInputRef.current?.click();
                        }}
                        className="w-full py-2.5 px-3 rounded-lg border-2 border-dashed border-slate-700 hover:border-[#00FFB4] bg-slate-900/60 hover:bg-slate-900 text-xs text-slate-300 hover:text-[#00FFB4] flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px]"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Snap / Upload Photo</span>
                      </button>

                      {/* Quick Sample Button (for rapid field testing) */}
                      <button
                        onClick={() => {
                          soundManager.playClick();
                          handleQuickSamplePhoto(task.id, index);
                        }}
                        className="w-full py-1 text-[10px] font-mono text-slate-400 hover:text-[#00E5FF] bg-slate-900/40 rounded border border-slate-800 transition-colors"
                      >
                        + Insert Quick Sample
                      </button>
                    </div>
                  )}
                </div>

                {/* Field Notes Area */}
                <div className="flex-1 space-y-2">
                  <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>Field Notes & Specifications</span>
                    </span>
                    {editingNotesTaskId !== task.id && (
                      <button
                        onClick={() => {
                          setEditingNotesTaskId(task.id);
                          setTempNotes(task.notes || '');
                        }}
                        className="text-[11px] text-[#00FFB4] hover:underline"
                      >
                        {task.notes ? 'Edit Notes' : '+ Add Note'}
                      </button>
                    )}
                  </div>

                  {editingNotesTaskId === task.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={tempNotes}
                        onChange={(e) => setTempNotes(e.target.value)}
                        placeholder="Log part numbers, PSI readings, texture matches, or field observations..."
                        rows={3}
                        className="w-full p-2.5 rounded-lg bg-slate-950 border border-[#00FFB4] text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#00FFB4]"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingNotesTaskId(null)}
                          className="px-3 py-1 rounded bg-slate-800 text-xs text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveNotes(task.id)}
                          className="px-3 py-1 rounded bg-[#00FFB4] text-xs text-black font-semibold hover:brightness-110"
                        >
                          Save Field Note
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => {
                        setEditingNotesTaskId(task.id);
                        setTempNotes(task.notes || '');
                      }}
                      className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 cursor-pointer hover:border-slate-700 min-h-[44px]"
                    >
                      {task.notes ? (
                        <p className="whitespace-pre-line leading-relaxed font-sans">{task.notes}</p>
                      ) : (
                        <span className="text-slate-600 italic">No notes recorded. Tap to add field observation.</span>
                      )}
                    </div>
                  )}
                </div>

              </div>

            </div>
          );
        })}
      </div>

      {/* Photo Lightbox Modal */}
      {activePhotoModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full bg-[#0D131F] border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <span className="font-mono text-xs text-slate-300">Field Photo Verification Preview</span>
              <button
                onClick={() => setActivePhotoModal(null)}
                className="p-1 rounded-md bg-slate-800 text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 bg-black flex items-center justify-center max-h-[80vh]">
              <img 
                src={activePhotoModal} 
                alt="Enlarged inspection" 
                className="max-h-[75vh] w-auto object-contain rounded" 
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
