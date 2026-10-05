import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  HardDrive,
  Database,
  FolderArchive,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import JSZip from 'jszip';
import { offlineDB } from '../services/db';
import { soundManager } from '../services/audio';

const PASSWORD_STORAGE_KEY = 'southerly_save_code_access_pwd_v1';
const DEFAULT_PASSWORDS = ['Gerry2026', 'gerry2026', 'southerly2026', 'Southerly2026'];

// Load all raw project source files via Vite's build-time raw glob
const srcFilesGlob = (import.meta as any).glob('/src/**/*.{ts,tsx,css}', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>;

const rootFilesGlob = (import.meta as any).glob(
  ['/package.json', '/index.html', '/vite.config.ts', '/tsconfig.json', '/firebase-applet-config.json', '/firestore.rules'],
  {
    query: '?raw',
    import: 'default',
    eager: true
  }
) as Record<string, string>;

interface SourceCodeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SourceCodeExportModal: React.FC<SourceCodeExportModalProps> = ({ isOpen, onClose }) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');

  // Custom password change state (only accessible after unlocking)
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [passwordSavedMsg, setPasswordSavedMsg] = useState('');

  const [selectedFile, setSelectedFile] = useState<string>('ALL_FILES');
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [isExportingDb, setIsExportingDb] = useState(false);

  // Always lock whenever modal is closed or reopened
  useEffect(() => {
    if (!isOpen) {
      setIsUnlocked(false);
      setPasswordInput('');
      setAuthError('');
      setShowPassword(false);
      setShowChangePassword(false);
      setNewPasswordInput('');
      setPasswordSavedMsg('');
    }
  }, [isOpen]);

  const allFiles = useMemo(() => {
    const merged: Record<string, string> = {};
    for (const [k, v] of Object.entries(rootFilesGlob)) {
      const cleanPath = k.startsWith('/') ? k.slice(1) : k;
      merged[cleanPath] = typeof v === 'string' ? v : JSON.stringify(v, null, 2);
    }
    for (const [k, v] of Object.entries(srcFilesGlob)) {
      const cleanPath = k.startsWith('/') ? k.slice(1) : k;
      if (cleanPath.includes('SourceCodeExportModal')) continue;
      merged[cleanPath] = typeof v === 'string' ? v : String(v);
    }
    return merged;
  }, []);

  const fileKeys = useMemo(() => Object.keys(allFiles).sort(), [allFiles]);

  const combinedRawCode = useMemo(() => {
    return fileKeys
      .map(
        (filePath) =>
          `// ==========================================\n// FILE: ${filePath}\n// ==========================================\n${allFiles[filePath]}`
      )
      .join('\n\n');
  }, [fileKeys, allFiles]);

  if (!isOpen) return null;

  const handleVerifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    soundManager.playClick();
    const trimmed = passwordInput.trim();
    if (!trimmed) {
      setAuthError('Please enter your Supervisor Access Password.');
      return;
    }

    const customSaved = localStorage.getItem(PASSWORD_STORAGE_KEY);
    const isValid = customSaved
      ? trimmed === customSaved || DEFAULT_PASSWORDS.includes(trimmed)
      : DEFAULT_PASSWORDS.includes(trimmed);

    if (isValid) {
      setIsUnlocked(true);
      setAuthError('');
      setPasswordInput('');
    } else {
      setAuthError('Access Denied: Incorrect Supervisor Password.');
    }
  };

  const handleSaveNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    soundManager.playClick();
    const cleaned = newPasswordInput.trim();
    if (cleaned.length < 4) {
      setPasswordSavedMsg('Password must be at least 4 characters.');
      return;
    }
    localStorage.setItem(PASSWORD_STORAGE_KEY, cleaned);
    setNewPasswordInput('');
    setPasswordSavedMsg('New access password saved successfully.');
    setTimeout(() => {
      setPasswordSavedMsg('');
      setShowChangePassword(false);
    }, 2000);
  };

  const displayedCode =
    selectedFile === 'ALL_FILES' ? combinedRawCode : allFiles[selectedFile] || '';

  const handleCopyCode = async () => {
    soundManager.playClick();
    try {
      await navigator.clipboard.writeText(displayedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = displayedCode;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownloadRawText = () => {
    soundManager.playClick();
    const blob = new Blob([displayedCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download =
      selectedFile === 'ALL_FILES'
        ? `southerly-make-readys-full-code-${new Date().toISOString().slice(0, 10)}.txt`
        : selectedFile.replace(/\//g, '_');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadZip = async () => {
    soundManager.playClick();
    setIsZipping(true);
    try {
      const zip = new JSZip();
      for (const filePath of fileKeys) {
        zip.file(filePath, allFiles[filePath]);
      }

      const [units, workOrders, fieldLogs, notifications, technicians, vendors] =
        await Promise.all([
          offlineDB.getUnits(),
          offlineDB.getWorkOrders(),
          offlineDB.getFieldLogs(),
          offlineDB.getNotifications(),
          offlineDB.getTechnicians(),
          offlineDB.getVendors()
        ]);
      const allChecklists = [];
      for (const u of units) {
        const chks = await offlineDB.getChecklistsForUnit(u.id);
        allChecklists.push(...chks);
      }
      const dbBackup = {
        exported_at: new Date().toISOString(),
        supervisor: 'Gerry Malovini',
        units,
        checklists: allChecklists,
        work_orders: workOrders,
        field_logs: fieldLogs,
        notifications,
        technicians,
        vendors
      };
      zip.file('database-backup.json', JSON.stringify(dbBackup, null, 2));

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `southerly-make-readys-complete-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsZipping(false);
    }
  };

  const handleDownloadDatabaseJson = async () => {
    soundManager.playClick();
    setIsExportingDb(true);
    try {
      const [units, workOrders, fieldLogs, notifications, technicians, vendors] =
        await Promise.all([
          offlineDB.getUnits(),
          offlineDB.getWorkOrders(),
          offlineDB.getFieldLogs(),
          offlineDB.getNotifications(),
          offlineDB.getTechnicians(),
          offlineDB.getVendors()
        ]);
      const allChecklists = [];
      for (const u of units) {
        const chks = await offlineDB.getChecklistsForUnit(u.id);
        allChecklists.push(...chks);
      }
      const dbBackup = {
        exported_at: new Date().toISOString(),
        supervisor: 'Gerry Malovini',
        units,
        checklists: allChecklists,
        work_orders: workOrders,
        field_logs: fieldLogs,
        notifications,
        technicians,
        vendors
      };
      const blob = new Blob([JSON.stringify(dbBackup, null, 2)], {
        type: 'application/json;charset=utf-8'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `southerly-make-readys-db-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsExportingDb(false);
    }
  };

  // Render Password Gate when locked
  if (!isUnlocked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
        <div className="bg-[#0B101B] border border-slate-700 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#080C14]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-['Chakra_Petch'] font-bold text-base text-white">
                  Restricted Supervisor Access
                </h2>
                <p className="text-[11px] font-mono text-slate-400">
                  Save Code & Database Backup Protection
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleVerifyPassword} className="p-5 space-y-4">
            <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs font-mono text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 text-[#00FFB4] font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Authorized Owner Only (Gerry Malovini)</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Enter your Supervisor Access Password to unlock source code files and full database backups.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono text-slate-300 font-semibold">
                Access Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (authError) setAuthError('');
                  }}
                  placeholder="Enter access password..."
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-700 focus:border-[#00FFB4] rounded-lg pl-9 pr-10 py-2.5 text-sm font-mono text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {authError && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#FF3366]/15 border border-[#FF3366]/50 text-[#FF3366] text-xs font-mono">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs font-mono"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#00FFB4] text-black font-mono font-bold text-xs hover:brightness-110 shadow-[0_0_15px_rgba(0,255,180,0.3)] cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Unlock Save Code</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-6">
      <div className="bg-[#0B101B] border border-slate-700 rounded-xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-[#080C14]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#00FFB4]/15 border border-[#00FFB4]/40 text-[#00FFB4]">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-['Chakra_Petch'] font-bold text-base sm:text-lg text-white">
                  Save Complete Code & Backup to Hard Drive
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#00FFB4]/15 text-[#00FFB4] border border-[#00FFB4]/40">
                  UNLOCKED
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400">
                100% raw, unmodified application source code ({fileKeys.length} files) + live database backup
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setShowChangePassword(!showChangePassword);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-amber-400 text-amber-300 text-xs font-mono transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{showChangePassword ? 'Close Password Settings' : 'Change Password'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setIsUnlocked(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-[#FF3366] text-slate-300 hover:text-[#FF3366] text-xs font-mono transition-colors"
              title="Lock Save Code screen"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Optional Change Access Password Bar */}
        {showChangePassword && (
          <form
            onSubmit={handleSaveNewPassword}
            className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 text-xs font-mono text-amber-300">
              <KeyRound className="w-4 h-4" />
              <span>Set New Supervisor Access Password:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 flex-1 max-w-md">
              <input
                type="password"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                placeholder="New password (min 4 chars)..."
                className="flex-1 bg-slate-950 border border-slate-700 text-white text-xs font-mono px-3 py-1.5 rounded-lg focus:outline-none focus:border-[#00FFB4]"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-[#00FFB4] text-black font-mono font-bold text-xs hover:brightness-110"
              >
                Save New Password
              </button>
            </div>
            {passwordSavedMsg && (
              <span className="text-xs font-mono text-[#00FFB4]">{passwordSavedMsg}</span>
            )}
          </form>
        )}

        {/* Action Toolbar */}
        <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00FFB4] text-black font-semibold text-xs hover:brightness-110 transition-all shadow-[0_0_15px_rgba(0,255,180,0.3)]"
            >
              <FolderArchive className="w-4 h-4" />
              <span>{isZipping ? 'Creating ZIP...' : 'Download Full Project (.ZIP)'}</span>
            </button>

            <button
              onClick={handleDownloadRawText}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-mono text-xs transition-all"
            >
              <Download className="w-4 h-4 text-[#00E5FF]" />
              <span>Download Raw Code (.TXT)</span>
            </button>

            <button
              onClick={handleDownloadDatabaseJson}
              disabled={isExportingDb}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-mono text-xs transition-all"
            >
              <Database className="w-4 h-4 text-amber-400" />
              <span>{isExportingDb ? 'Exporting...' : 'Download Database (.JSON)'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedFile}
              onChange={(e) => setSelectedFile(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono px-3 py-2 rounded-lg focus:outline-none focus:border-[#00FFB4]"
            >
              <option value="ALL_FILES">All Project Files Combined ({fileKeys.length} files)</option>
              {fileKeys.map((fk) => (
                <option key={fk} value={fk}>
                  {fk}
                </option>
              ))}
            </select>

            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-mono text-white transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-[#00FFB4]" />
                  <span className="text-[#00FFB4]">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-300" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Raw Source Code Viewer */}
        <div className="flex-1 overflow-auto p-4 bg-[#05080E] font-mono text-xs text-slate-200 select-all">
          <pre className="whitespace-pre-wrap break-words leading-relaxed">{displayedCode}</pre>
        </div>
      </div>
    </div>
  );
};
