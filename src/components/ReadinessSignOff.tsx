import React, { useState, useRef, useEffect } from 'react';
import { 
  Stamp, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  Key, 
  FileCheck, 
  Download, 
  Printer, 
  RotateCcw,
  Sparkles,
  Layers,
  ChevronDown,
  Building
} from 'lucide-react';
import { 
  Unit, 
  Checklist, 
  WorkOrder, 
  TechnicianUser, 
  TRADE_CATEGORIES, 
  TradeCategory 
} from '../types';
import { soundManager } from '../services/audio';

interface ReadinessSignOffProps {
  units: Unit[];
  selectedUnitId: string;
  onSelectUnitId: (unitId: string) => void;
  checklists: Checklist[];
  workOrders: WorkOrder[];
  currentUser: TechnicianUser;
  onSwitchToSupervisor: () => void;
  onSignOff: (unitId: string, supervisor: TechnicianUser, signatureDataUrl: string, notes: string) => Promise<void>;
}

export const ReadinessSignOff: React.FC<ReadinessSignOffProps> = ({
  units,
  selectedUnitId,
  onSelectUnitId,
  checklists,
  workOrders,
  currentUser,
  onSwitchToSupervisor,
  onSignOff
}) => {
  const isSupervisor = currentUser.role === 'Maintenance Supervisor';
  const currentUnit = units.find(u => u.id === selectedUnitId) || units.find(u => u.current_status === 'Ready') || units[0];

  if (!currentUnit) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4 my-16 bg-[#0D131F] border border-slate-800 rounded-2xl shadow-xl">
        <Building className="w-12 h-12 text-[#00FFB4] mx-auto" />
        <h3 className="font-['Chakra_Petch'] font-bold text-lg text-white">NO APARTMENTS REGISTERED</h3>
        <p className="text-xs text-slate-400 font-mono">
          Your Firebase database is clear. Register an apartment with "+ NEW UNIT" to complete its final certification and Rent Ready sign-off.
        </p>
      </div>
    );
  }

  const unitChecklists = checklists.filter(c => c.unit_id === currentUnit?.id);
  const unitWorkOrders = workOrders.filter(w => w.unit_id === currentUnit?.id);
  const openWOs = unitWorkOrders.filter(w => w.status !== 'Resolved');
  const hasEmergencyWOs = openWOs.some(w => w.priority === 'Emergency' || w.priority === 'High');

  // Trade verification status
  const allTrades100 = TRADE_CATEGORIES.every(t => {
    const chk = unitChecklists.find(c => c.trade_category === t);
    return chk && chk.completion_percentage === 100;
  });

  // Pre-flight safety checks state
  const [safetyChecks, setSafetyChecks] = useState<{
    smokeCo: boolean;
    mainShutoff: boolean;
    hvacFilter: boolean;
    workOrdersResolved: boolean;
    locksKeyed: boolean;
    applianceOdor: boolean;
  }>({
    smokeCo: true,
    mainShutoff: true,
    hvacFilter: true,
    workOrdersResolved: openWOs.length === 0,
    locksKeyed: true,
    applianceOdor: true
  });

  const [notes, setNotes] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [certificateGenerated, setCertificateGenerated] = useState<boolean>(currentUnit?.current_status === 'Rent Ready');

  // Canvas signature state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    // Reset canvas when unit changes
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
      }
    }
    setCertificateGenerated(currentUnit?.current_status === 'Rent Ready');
  }, [currentUnit?.id]);

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#00FFB4';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // Pre-fill a sample supervisor signature for rapid testing
  const generateSampleSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#00FFB4';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    // Stylized signature wave
    ctx.moveTo(40, 60);
    ctx.bezierCurveTo(70, 20, 110, 80, 140, 45);
    ctx.bezierCurveTo(160, 25, 180, 70, 220, 50);
    ctx.lineTo(260, 50);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(35, 75);
    ctx.lineTo(265, 70);
    ctx.stroke();

    setHasSignature(true);
  };

  const allChecksPassed = Object.values(safetyChecks).every(Boolean) && !hasEmergencyWOs;
  const canSignOff = isSupervisor && allTrades100 && allChecksPassed && hasSignature;

  const handleExecuteSignOff = async () => {
    if (!canSignOff || !canvasRef.current || !currentUnit) return;

    setIsSigning(true);
    soundManager.playClick();
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      await onSignOff(currentUnit.id, currentUser, dataUrl, notes);
      setCertificateGenerated(true);
    } finally {
      setIsSigning(false);
    }
  };

  // If role is field technician, show supervisor gate
  if (!isSupervisor) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="bg-[#0D131F] border-2 border-amber-500/50 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/50 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(245,158,11,0.25)]">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-['Chakra_Petch'] font-bold text-white tracking-wide">
              SUPERVISOR-ONLY ACCESS RESTRICTED
            </h2>
            <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              Readiness Sign-Off and official Rent-Ready certification requires licensed Maintenance Supervisor credentials.
            </p>
            <p className="text-xs font-mono text-slate-400">
              Current profile: <strong className="text-white">{currentUser.name}</strong> ({currentUser.role} • {currentUser.badge_id})
            </p>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <button
              id="switch-supervisor-btn"
              onClick={() => {
                soundManager.playClick();
                onSwitchToSupervisor();
              }}
              className="px-6 py-3 rounded-xl bg-[#00FFB4] text-black font-bold text-sm tracking-wider uppercase flex items-center gap-2 hover:brightness-110 shadow-[0_0_20px_rgba(0,255,180,0.35)] transition-all cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>Switch to Sarah Vance (Supervisor)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header & Unit Selector */}
      <div className="bg-[#0D131F] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Stamp className="w-6 h-6 text-[#00FFB4]" />
              <h2 className="text-xl font-['Chakra_Petch'] font-bold text-white tracking-wide">
                SUPERVISOR READINESS SIGN-OFF & CERTIFICATION
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Multi-trade code verification • Safety pre-flight punch-list • Legal rent-ready release
            </p>
          </div>

          {/* Unit selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">Review Unit:</span>
            <select
              value={currentUnit?.id}
              onChange={(e) => {
                soundManager.playClick();
                onSelectUnitId(e.target.value);
              }}
              className="bg-slate-900 border-2 border-[#00FFB4] text-white font-['Chakra_Petch'] font-bold text-base px-3 py-1.5 rounded-lg focus:outline-none cursor-pointer"
            >
              {units.map(u => (
                <option key={u.id} value={u.id} className="bg-slate-900 text-white font-sans text-sm">
                  #{u.unit_number} ({u.floor_plan}) - Stage: {u.current_status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Already Rent Ready Notice */}
      {currentUnit?.current_status === 'Rent Ready' && (
        <div className="p-5 rounded-xl bg-purple-950/20 border-2 border-purple-500 shadow-[0_0_25px_rgba(168,85,247,0.2)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-purple-500 text-black">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-['Chakra_Petch'] font-bold text-lg text-white">
                OFFICIALLY CERTIFIED RENT READY
              </h3>
              <p className="text-xs text-purple-200">
                Signed off by <strong>{currentUnit.signed_off_by || 'Sarah Vance'}</strong>. Unit is keyed and released for property leasing.
              </p>
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-purple-300 border border-purple-500/40 text-xs font-mono font-semibold flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Print Certificate</span>
          </button>
        </div>
      )}

      {/* Trade Verification Matrix (6 Trades) */}
      <div className="bg-[#0D131F] border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div>
            <h3 className="font-['Chakra_Petch'] font-bold text-base text-white">
              1. Trade Punch-List Completion Verification
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              All 6 trade workflows must reach 100% before unlocking final certification
            </p>
          </div>

          <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold uppercase ${
            allTrades100 
              ? 'bg-[#00FFB4]/20 text-[#00FFB4] border border-[#00FFB4]/50'
              : 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
          }`}>
            {allTrades100 ? 'ALL 6 TRADES VERIFIED (100%)' : 'TRADES INCOMPLETE'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {TRADE_CATEGORIES.map(trade => {
            const chk = unitChecklists.find(c => c.trade_category === trade);
            const pct = chk?.completion_percentage || 0;
            const isDone = pct === 100;

            return (
              <div 
                key={trade}
                className={`p-3 rounded-lg border text-center space-y-1.5 transition-all ${
                  isDone 
                    ? 'bg-[#00FFB4]/10 border-[#00FFB4]/40 text-[#00FFB4]' 
                    : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="text-xs font-bold font-['Chakra_Petch']">{trade}</div>
                <div className="text-lg font-bold font-mono">{pct}%</div>
                <div className="flex items-center justify-center gap-1 text-[10px] font-mono">
                  {isDone ? (
                    <span className="flex items-center gap-1 text-[#00FFB4]">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Verified</span>
                    </span>
                  ) : (
                    <span className="text-amber-400">Pending</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pre-flight Code & Safety Checklist */}
      <div className="bg-[#0D131F] border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="pb-2 border-b border-slate-800">
          <h3 className="font-['Chakra_Petch'] font-bold text-base text-white">
            2. Life-Safety & Code Compliance Checklist
          </h3>
          <p className="text-xs text-slate-400 font-mono">
            Supervisor mandatory walk-through verifications
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          
          <label className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/70 border border-slate-800 cursor-pointer hover:border-slate-700">
            <input
              type="checkbox"
              checked={safetyChecks.smokeCo}
              onChange={(e) => setSafetyChecks({ ...safetyChecks, smokeCo: e.target.checked })}
              className="mt-0.5 w-4 h-4 rounded text-[#00FFB4] focus:ring-0 accent-[#00FFB4]"
            />
            <div className="text-xs space-y-0.5">
              <strong className="text-slate-100">Smoke & Carbon Monoxide Detectors</strong>
              <p className="text-slate-400">Tested audible chirp, 10-year lithium batteries verified, sticker dated.</p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/70 border border-slate-800 cursor-pointer hover:border-slate-700">
            <input
              type="checkbox"
              checked={safetyChecks.mainShutoff}
              onChange={(e) => setSafetyChecks({ ...safetyChecks, mainShutoff: e.target.checked })}
              className="mt-0.5 w-4 h-4 rounded text-[#00FFB4] focus:ring-0 accent-[#00FFB4]"
            />
            <div className="text-xs space-y-0.5">
              <strong className="text-slate-100">Water Shutoff & Pressure Relief (PRV)</strong>
              <p className="text-slate-400">Static pressure gauged between 50-70 PSI. Main shutoff tagged.</p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/70 border border-slate-800 cursor-pointer hover:border-slate-700">
            <input
              type="checkbox"
              checked={safetyChecks.hvacFilter}
              onChange={(e) => setSafetyChecks({ ...safetyChecks, hvacFilter: e.target.checked })}
              className="mt-0.5 w-4 h-4 rounded text-[#00FFB4] focus:ring-0 accent-[#00FFB4]"
            />
            <div className="text-xs space-y-0.5">
              <strong className="text-slate-100">HVAC Filter & Condensate Line</strong>
              <p className="text-slate-400">Fresh MERV 11 filter installed with turnover date; P-trap vinegar flushed.</p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/70 border border-slate-800 cursor-pointer hover:border-slate-700">
            <input
              type="checkbox"
              checked={safetyChecks.locksKeyed}
              onChange={(e) => setSafetyChecks({ ...safetyChecks, locksKeyed: e.target.checked })}
              className="mt-0.5 w-4 h-4 rounded text-[#00FFB4] focus:ring-0 accent-[#00FFB4]"
            />
            <div className="text-xs space-y-0.5">
              <strong className="text-slate-100">Key Security & Deadbolt Rekey</strong>
              <p className="text-slate-400">Deadbolt re-pinned, 2 tenant brass keys cut, lockbox combo verified.</p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/70 border border-slate-800 cursor-pointer hover:border-slate-700">
            <input
              type="checkbox"
              checked={safetyChecks.workOrdersResolved}
              onChange={(e) => setSafetyChecks({ ...safetyChecks, workOrdersResolved: e.target.checked })}
              className="mt-0.5 w-4 h-4 rounded text-[#00FFB4] focus:ring-0 accent-[#00FFB4]"
            />
            <div className="text-xs space-y-0.5">
              <strong className="text-slate-100">Zero Open Emergency/High Work Orders</strong>
              <p className="text-slate-400">
                {openWOs.length === 0 ? 'No open work orders pending.' : `⚠️ ${openWOs.length} open orders currently active.`}
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/70 border border-slate-800 cursor-pointer hover:border-slate-700">
            <input
              type="checkbox"
              checked={safetyChecks.applianceOdor}
              onChange={(e) => setSafetyChecks({ ...safetyChecks, applianceOdor: e.target.checked })}
              className="mt-0.5 w-4 h-4 rounded text-[#00FFB4] focus:ring-0 accent-[#00FFB4]"
            />
            <div className="text-xs space-y-0.5">
              <strong className="text-slate-100">Turnover Cleanliness & Neutral Smell</strong>
              <p className="text-slate-400">Appliance coils clean, refrigerator deodorized, mirrors streak-free.</p>
            </div>
          </label>

        </div>
      </div>

      {/* Digital Signature & Certification Box */}
      <div className="bg-[#0D131F] border border-slate-800 rounded-xl p-5 shadow-xl space-y-5">
        <div className="pb-2 border-b border-slate-800">
          <h3 className="font-['Chakra_Petch'] font-bold text-base text-white">
            3. Supervisor Digital Signature & Official Release
          </h3>
          <p className="text-xs text-slate-400 font-mono">
            Execute legal sign-off into property management ledger
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Signature Canvas Pad (7 cols) */}
          <div className="lg:col-span-7 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Sign in box below (touch/mouse):</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={generateSampleSignature}
                  className="text-[11px] text-[#00E5FF] hover:underline"
                >
                  Insert Sample Signature
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={clearSignature}
                  className="text-[11px] text-slate-400 hover:text-white"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="rounded-xl border-2 border-dashed border-slate-700 bg-black/90 p-1 relative overflow-hidden">
              <canvas
                ref={canvasRef}
                width={500}
                height={140}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-[140px] cursor-crosshair touch-none"
              />
              {!hasSignature && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs font-mono text-slate-600">
                  Draw supervisor signature here
                </div>
              )}
            </div>

            <div className="text-[11px] font-mono text-slate-500">
              Signee: <strong>{currentUser.name}</strong> • License ID: <strong>{currentUser.badge_id}</strong>
            </div>
          </div>

          {/* Supervisor Notes & Execute CTA (5 cols) */}
          <div className="lg:col-span-5 space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono text-slate-400">
                Supervisor Releasing Remarks:
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="e.g. Unit inspected with property manager. Paint touchups approved. Key stored in master safe box #12."
                className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-[#00FFB4]"
              />
            </div>

            <div className="space-y-2 pt-2">
              {!allTrades100 && (
                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/40 text-[11px] font-mono text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Cannot sign off: All 6 trades must reach 100%.</span>
                </div>
              )}

              {hasEmergencyWOs && (
                <div className="p-2 rounded bg-red-500/10 border border-red-500/40 text-[11px] font-mono text-red-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Cannot sign off: Open emergency work orders active.</span>
                </div>
              )}

              <button
                id="execute-rent-ready-btn"
                onClick={handleExecuteSignOff}
                disabled={!canSignOff || isSigning}
                className={`w-full py-3.5 rounded-xl font-['Chakra_Petch'] font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[48px] ${
                  canSignOff
                    ? 'bg-[#00FFB4] text-black hover:brightness-110 shadow-[0_0_25px_rgba(0,255,180,0.5)] active:scale-[0.98]'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                <Stamp className="w-5 h-5" />
                <span>{isSigning ? 'Certifying...' : 'Certify Unit Rent Ready'}</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Generated Certificate Card */}
      {currentUnit?.current_status === 'Rent Ready' && (
        <div className="bg-[#0D131F] border-2 border-[#00FFB4] rounded-2xl p-6 shadow-2xl space-y-4 print:p-0 print:border-none">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#00FFB4]" />
              <h3 className="font-['Chakra_Petch'] font-bold text-lg text-white">
                OFFICIAL APARTMENT TURNOVER CERTIFICATE
              </h3>
            </div>
            <span className="font-mono text-xs text-[#00FFB4] font-bold">
              CERTIFICATE #UTT-{currentUnit.unit_number}-{currentUnit.id.slice(-4).toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-500">Unit Number:</span>
              <p className="text-base font-bold text-white">#{currentUnit.unit_number}</p>
            </div>
            <div>
              <span className="text-slate-500">Floor Plan:</span>
              <p className="text-base font-bold text-white">{currentUnit.floor_plan}</p>
            </div>
            <div>
              <span className="text-slate-500">Certified By:</span>
              <p className="text-base font-bold text-white">{currentUnit.signed_off_by || 'Sarah Vance'}</p>
            </div>
            <div>
              <span className="text-slate-500">Date Certified:</span>
              <p className="text-base font-bold text-[#00FFB4]">
                {new Date(currentUnit.signed_off_at || Date.now()).toLocaleDateString()}
              </p>
            </div>
          </div>

          {currentUnit.signature_image && (
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <div className="text-xs font-mono text-slate-400">
                Digital Verification Signature:
              </div>
              <img 
                src={currentUnit.signature_image} 
                alt="Supervisor Signature" 
                className="h-12 bg-black/60 px-4 py-1 rounded border border-slate-800 object-contain" 
              />
            </div>
          )}
        </div>
      )}

    </div>
  );
};
