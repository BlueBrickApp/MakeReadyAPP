import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Bell, 
  ShieldCheck, 
  Wrench, 
  Volume2, 
  VolumeX, 
  PlusCircle, 
  CheckCircle2, 
  AlertTriangle,
  RotateCcw,
  Cloud,
  Trash2,
  Sparkles,
  QrCode,
  Smartphone,
  Users,
  Truck,
  Lock
} from 'lucide-react';
import { TechnicianUser, SupervisorNotification, SyncQueueItem, Vendor } from '../types';
import { offlineDB } from '../services/db';
import { soundManager } from '../services/audio';

interface HeaderProps {
  currentUser: TechnicianUser;
  technicians: TechnicianUser[];
  vendors?: Vendor[];
  onUserChange: (user: TechnicianUser) => void;
  onOpenNotifications: () => void;
  onOpenNewUnit: () => void;
  onOpenShare?: () => void;
  onOpenManageTeam?: () => void;
  onOpenManageVendors?: () => void;
  notifications: SupervisorNotification[];
  syncQueue: SyncQueueItem[];
  onSyncCompleted?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  technicians,
  vendors = [],
  onUserChange,
  onOpenNotifications,
  onOpenNewUnit,
  onOpenShare,
  onOpenManageTeam,
  onOpenManageVendors,
  notifications,
  syncQueue,
  onSyncCompleted
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(offlineDB.isConnected);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(offlineDB.isSimulatedOffline);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(soundManager.enabled);
  const [showRoleDropdown, setShowRoleDropdown] = useState<boolean>(false);

  useEffect(() => {
    const unsub = offlineDB.subscribe(() => {
      setIsOnline(offlineDB.isConnected);
      setIsSimulatedOffline(offlineDB.isSimulatedOffline);
    });
    return () => {
      unsub();
    };
  }, []);

  const unreadNotifs = notifications.filter(n => !n.read).length;

  const handleToggleDeadZone = () => {
    soundManager.playClick();
    const nextVal = !isSimulatedOffline;
    offlineDB.setSimulateOffline(nextVal);
  };

  const handleManualSync = async () => {
    if (!isOnline) return;
    soundManager.playClick();
    setIsSyncing(true);
    try {
      await offlineDB.flushSyncQueue();
      if (onSyncCompleted) onSyncCompleted();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    soundManager.enabled = next;
    setSoundEnabled(next);
    if (next) soundManager.playClick();
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0A0E17]/95 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        
        {/* Brand & Logo */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-black border border-[#00FFB4] flex items-center justify-center shadow-[0_0_15px_rgba(0,255,180,0.35)]">
              <span className="font-['Chakra_Petch'] font-bold text-lg text-[#00FFB4]">UT</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-['Chakra_Petch'] font-bold text-lg tracking-wider text-white">
                  UNIT TURNOVER <span className="text-[#00FFB4]">TRACKER</span>
                </h1>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono tracking-widest font-semibold bg-[#00FFB4]/10 text-[#00FFB4] border border-[#00FFB4]/30 uppercase">
                  v2.4 OPS
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Field Maintenance & Make-Ready Ops
              </p>
            </div>
          </div>

          {/* Mobile Right Controls: Bell & Sound */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              id="header-mobile-notif-btn"
              onClick={() => { soundManager.playClick(); onOpenNotifications(); }}
              className="relative p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifs > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#FF3366] text-white text-[11px] font-bold flex items-center justify-center shadow-[0_0_8px_#FF3366]">
                  {unreadNotifs}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Right Status / Sync / Role Bar */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          
          {/* Offline / Dead Zone Simulation Toggle */}
          <button
            id="dead-zone-toggle-btn"
            onClick={handleToggleDeadZone}
            title={isSimulatedOffline ? "Turn OFF Dead Zone simulation" : "Simulate basement/dead-zone (Offline mode)"}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all border ${
              isSimulatedOffline
                ? 'bg-[#FFB800]/15 text-[#FFB800] border-[#FFB800] shadow-[0_0_10px_rgba(255,184,0,0.25)] animate-pulse'
                : isOnline
                ? 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-500'
                : 'bg-[#FF3366]/20 text-[#FF3366] border-[#FF3366]'
            }`}
          >
            {isSimulatedOffline ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-[#FFB800]" />
                <span>DEAD ZONE ACTIVE</span>
              </>
            ) : isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-[#00FFB4]" />
                <span className="text-slate-200">ONLINE</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-[#FF3366]" />
                <span>OFFLINE</span>
              </>
            )}
          </button>

          {/* Sync Queue Status & Force Sync Button */}
          {syncQueue.length > 0 ? (
            <button
              id="sync-queue-flush-btn"
              onClick={handleManualSync}
              disabled={!isOnline || isSyncing}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all border ${
                isOnline
                  ? 'bg-[#00FFB4]/15 text-[#00FFB4] border-[#00FFB4] hover:bg-[#00FFB4]/25 shadow-[0_0_12px_rgba(0,255,180,0.3)]'
                  : 'bg-slate-900 text-slate-400 border-slate-700 cursor-not-allowed'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#00FFB4]' : ''}`} />
              <span>{syncQueue.length} PENDING SYNC</span>
            </button>
          ) : (
            <div className="hidden lg:flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono text-slate-400 bg-slate-900/60 border border-slate-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00FFB4]" />
                <span>LOCAL</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono text-[#00FFB4] bg-[#00FFB4]/10 border border-[#00FFB4]/30" title="Synchronized with Firebase Cloud Database">
                <Cloud className="w-3.5 h-3.5 text-[#00FFB4]" />
                <span className="text-[11px] font-semibold">CLOUD LIVE</span>
              </div>
            </div>
          )}

          {/* Audio FX Toggle */}
          <button
            id="sound-fx-toggle-btn"
            onClick={handleToggleSound}
            title={soundEnabled ? "Mute sound effects" : "Enable sound effects"}
            className="p-2 rounded-md bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-200"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#00FFB4]" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Desktop Notifications Bell */}
          <button
            id="header-desktop-notif-btn"
            onClick={() => { soundManager.playClick(); onOpenNotifications(); }}
            className="hidden md:flex relative p-2 rounded-md bg-slate-900/80 border border-slate-800 text-slate-300 hover:border-slate-700"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifs > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FF3366] text-white text-[10px] font-bold flex items-center justify-center">
                {unreadNotifs}
              </span>
            )}
          </button>

          {/* Connect Phone & QR CTA */}
          {onOpenShare && (
            <button
              id="header-share-phone-btn"
              onClick={() => { soundManager.playClick(); onOpenShare(); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-700 hover:border-[#00FFB4] text-slate-200 hover:text-[#00FFB4] font-mono text-xs transition-all shadow-sm"
              title="Connect mobile phone via QR or link"
            >
              <Smartphone className="w-3.5 h-3.5 text-[#00FFB4]" />
              <span className="hidden sm:inline">CONNECT PHONE</span>
              <QrCode className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}

          {/* Maintenance Team Management Menu Button */}
          {onOpenManageTeam && (
            <button
              id="header-manage-team-btn"
              onClick={() => { soundManager.playClick(); onOpenManageTeam(); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-700 hover:border-[#00FFB4] text-slate-200 hover:text-[#00FFB4] font-mono text-xs transition-all shadow-sm"
              title="Manage Maintenance Team (Add / Remove Technicians)"
            >
              <Users className="w-3.5 h-3.5 text-[#00FFB4]" />
              <span className="hidden sm:inline">TEAM</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-[#00FFB4] font-bold border border-slate-700">
                {technicians.length}
              </span>
            </button>
          )}

          {/* Vendors & Subcontractors Management Menu Button */}
          {onOpenManageVendors && (
            <button
              id="header-manage-vendors-btn"
              onClick={() => { soundManager.playClick(); onOpenManageVendors(); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-700 hover:border-[#00FFB4] text-slate-200 hover:text-[#00FFB4] font-mono text-xs transition-all shadow-sm"
              title="Manage Turnover Vendors & Contractors (Add / Remove)"
            >
              <Truck className="w-3.5 h-3.5 text-[#00FFB4]" />
              <span className="hidden sm:inline">VENDORS</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-[#00FFB4] font-bold border border-slate-700">
                {vendors.length}
              </span>
            </button>
          )}

          {/* New Unit Intake CTA */}
          <button
            id="header-new-unit-btn"
            onClick={() => { soundManager.playClick(); onOpenNewUnit(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#00FFB4] text-black font-semibold text-xs tracking-wide hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(0,255,180,0.35)]"
            title="Add New Unit Intake"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>NEW UNIT</span>
          </button>

          {/* User Role Switcher Dropdown */}
          <div className="relative">
            <button
              id="user-role-dropdown-btn"
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-700/80 hover:border-slate-600 transition-all text-left"
            >
              <img 
                src={currentUser.avatar} 
                alt={currentUser.name} 
                className="w-6 h-6 rounded-full object-cover border border-[#00FFB4]/40" 
              />
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-slate-100 flex items-center gap-1">
                  <span>{currentUser.name}</span>
                  {currentUser.role === 'Maintenance Supervisor' ? (
                    <ShieldCheck className="w-3 h-3 text-[#00FFB4]" />
                  ) : (
                    <Wrench className="w-3 h-3 text-cyan-400" />
                  )}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {currentUser.role === 'Maintenance Supervisor' ? 'SUPERVISOR' : 'TECH'} • {currentUser.badge_id}
                </div>
              </div>
            </button>

            {showRoleDropdown && (
              <div className="absolute right-0 mt-2 w-72 rounded-lg bg-[#0F172A] border border-slate-700 shadow-2xl p-2 z-50">
                <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  <span>Field Team</span>
                  {onOpenManageTeam && (
                    <button
                      onClick={() => {
                        soundManager.playClick();
                        setShowRoleDropdown(false);
                        onOpenManageTeam();
                      }}
                      className="text-[#00FFB4] hover:underline flex items-center gap-1 normal-case text-xs"
                    >
                      <Users className="w-3 h-3" />
                      <span>Manage</span>
                    </button>
                  )}
                </div>
                <div className="py-1 space-y-1 max-h-60 overflow-y-auto">
                  {technicians.map(tech => (
                    <button
                      key={tech.id}
                      onClick={() => {
                        soundManager.playClick();
                        onUserChange(tech);
                        setShowRoleDropdown(false);
                      }}
                      className={`w-full flex items-center gap-2.5 p-2 rounded-md text-left transition-all ${
                        tech.id === currentUser.id 
                          ? 'bg-[#00FFB4]/15 border border-[#00FFB4]/40 text-white' 
                          : 'hover:bg-slate-800/80 text-slate-300'
                      }`}
                    >
                      <img src={tech.avatar} alt={tech.name} className="w-7 h-7 rounded-full object-cover" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                          <span>{tech.name}</span>
                          {tech.role === 'Maintenance Supervisor' && (
                            <span className="text-[9px] font-mono px-1 rounded bg-[#00FFB4]/20 text-[#00FFB4]">SUP</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">{tech.trade_specialty}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="pt-2 border-t border-slate-800/80 space-y-1">
                  {onOpenManageTeam && (
                    <button
                      id="dropdown-manage-team-btn"
                      onClick={() => {
                        soundManager.playClick();
                        setShowRoleDropdown(false);
                        onOpenManageTeam();
                      }}
                      className="w-full flex items-center justify-start gap-2 px-2 py-1.5 rounded text-xs font-mono text-[#00FFB4] bg-[#00FFB4]/10 hover:bg-[#00FFB4]/20 border border-[#00FFB4]/30 transition-colors"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Manage Technicians (+/-)</span>
                    </button>
                  )}
                  {onOpenShare && (
                    <button
                      onClick={() => {
                        soundManager.playClick();
                        setShowRoleDropdown(false);
                        onOpenShare();
                      }}
                      className="w-full flex items-center justify-start gap-2 px-2 py-1.5 rounded text-xs font-mono text-slate-300 hover:text-[#00FFB4] hover:bg-slate-800/60 transition-colors"
                    >
                      <QrCode className="w-3.5 h-3.5 text-[#00FFB4]" />
                      <span>Connect Phone (QR)</span>
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      if (confirm('Clear database and start fresh in Firebase?\n\nAll current units will be removed so you can input your own apartments.')) {
                        await offlineDB.clearAllAndStartFresh();
                        setShowRoleDropdown(false);
                      }
                    }}
                    className="w-full flex items-center justify-start gap-2 px-2 py-1.5 rounded text-xs font-mono text-slate-400 hover:text-[#FF3366] hover:bg-slate-800/60 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-[#FF3366]" />
                    <span>Clear Database & Start Fresh</span>
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm('Load sample demo turnover units?\n\nThis will load 4 example apartments.')) {
                        await offlineDB.resetToDefaults();
                        setShowRoleDropdown(false);
                      }
                    }}
                    className="w-full flex items-center justify-start gap-2 px-2 py-1.5 rounded text-xs font-mono text-slate-400 hover:text-[#00FFB4] hover:bg-slate-800/60 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#00FFB4]" />
                    <span>Load Demo Units</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
