import React, { useState, useMemo } from 'react';
import { X, Download, Copy, Check, HardDrive, FileCode, Database, FolderArchive } from 'lucide-react';
import JSZip from 'jszip';
import { offlineDB } from '../services/db';
import { soundManager } from '../services/audio';

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
  const [selectedFile, setSelectedFile] = useState<string>('ALL_FILES');
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [isExportingDb, setIsExportingDb] = useState(false);

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
      .map((filePath) => `// ==========================================\n// FILE: ${filePath}\n// ==========================================\n${allFiles[filePath]}`)
      .join('\n\n');
  }, [fileKeys, allFiles]);

  if (!isOpen) return null;

  const displayedCode = selectedFile === 'ALL_FILES' ? combinedRawCode : (allFiles[selectedFile] || '');

  const handleCopyCode = async () => {
    soundManager.playClick();
    try {
      await navigator.clipboard.writeText(displayedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback copy
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
    a.download = selectedFile === 'ALL_FILES'
      ? `unit-turnover-tracker-full-code-${new Date().toISOString().slice(0, 10)}.txt`
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

      // Also include live database snapshot inside the zip so the user has both code + data
      const [units, workOrders, fieldLogs, notifications, technicians, vendors] = await Promise.all([
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
      a.download = `unit-turnover-tracker-complete-${new Date().toISOString().slice(0, 10)}.zip`;
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
      const [units, workOrders, fieldLogs, notifications, technicians, vendors] = await Promise.all([
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
      const blob = new Blob([JSON.stringify(dbBackup, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `unit-turnover-database-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsExportingDb(false);
    }
  };

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
              <h2 className="font-['Chakra_Petch'] font-bold text-base sm:text-lg text-white">
                Save Complete Code & Backup to Hard Drive
              </h2>
              <p className="text-xs font-mono text-slate-400">
                100% raw, unmodified application source code ({fileKeys.length} files) + live database backup
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

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
