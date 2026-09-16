import React, { useState } from 'react';
import { X, QrCode, Copy, Check, Smartphone, Monitor, Cloud, Sparkles, Share2 } from 'lucide-react';
import { soundManager } from '../services/audio';

interface ShareTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareTeamModal: React.FC<ShareTeamModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Fallback to active app URL if running in local container or iframe
  const rawUrl = typeof window !== 'undefined' ? window.location.href.split('?')[0] : '';
  const isInternal = !rawUrl || rawUrl.includes('localhost') || rawUrl.includes(':3000');
  const targetUrl = isInternal 
    ? 'https://ais-dev-2bmbfyu7g6622ripmkbdt6-474093723751.us-west1.run.app' 
    : rawUrl;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(targetUrl)}&bgcolor=0d131f&color=00ffb4&margin=10`;

  const handleCopy = () => {
    soundManager.playClick();
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0D131F] border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-0">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00FFB4]/15 border border-[#00FFB4]/30 flex items-center justify-center text-[#00FFB4]">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-['Chakra_Petch'] font-bold text-white text-base sm:text-lg tracking-wide">
                CONNECT PHONE & DESKTOP
              </h2>
              <p className="text-[11px] font-mono text-slate-400">
                Real-time synchronization via Firebase Cloud
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 space-y-6">
          
          {/* Cloud sync banner */}
          <div className="p-3 rounded-xl bg-[#00FFB4]/10 border border-[#00FFB4]/25 flex items-start gap-3 text-xs">
            <Cloud className="w-4 h-4 text-[#00FFB4] shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-slate-300">
              <span className="font-bold text-[#00FFB4] font-mono">LIVE SHARED DATABASE:</span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Anyone who opens this link on their mobile phone or PC will see the same units, work orders, and updates in real time without refreshing.
              </p>
            </div>
          </div>

          {/* QR Code and Instructions */}
          <div className="flex flex-col sm:flex-row items-center gap-5 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <div className="p-2 bg-[#0D131F] rounded-xl border border-slate-700/60 shrink-0 shadow-md">
              <img 
                src={qrCodeUrl} 
                alt="QR Code to connect mobile phone" 
                className="w-36 h-36 sm:w-40 sm:h-40 rounded-lg object-contain"
              />
            </div>
            
            <div className="space-y-2.5 text-xs">
              <h4 className="font-bold text-white uppercase font-['Chakra_Petch'] tracking-wide flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-[#00FFB4]" />
                <span>How to open on your phone?</span>
              </h4>
              <ol className="space-y-2 text-slate-300 font-sans text-[12px] list-decimal list-inside leading-snug">
                <li>Open your <strong>smartphone camera</strong> and point it at the QR code.</li>
                <li>Tap the popup banner to open the app directly in your mobile browser.</li>
                <li><em>(Optional)</em> Open your browser menu and tap <strong>"Add to Home Screen"</strong> to use it as a full-screen mobile app.</li>
              </ol>
            </div>
          </div>

          {/* Copy URL section */}
          <div className="space-y-2">
            <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
              Or share this link with your field team (SMS / WhatsApp / Email):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={targetUrl}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 truncate focus:outline-none"
              />
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-xs tracking-wider transition-all whitespace-nowrap ${
                  copied
                    ? 'bg-[#00FFB4] text-black shadow-[0_0_15px_rgba(0,255,180,0.4)]'
                    : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-600'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>COPIED!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>COPY LINK</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Live Device indicators */}
          <div className="grid grid-cols-2 gap-3 pt-1 text-center">
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <Monitor className="w-4 h-4 text-[#00FFB4] mx-auto mb-1" />
              <div className="font-mono text-[10px] text-slate-400">Desktop / Tablet</div>
              <div className="text-[11px] font-bold text-white">Supervisor Command</div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <Smartphone className="w-4 h-4 text-[#00FFB4] mx-auto mb-1" />
              <div className="font-mono text-[10px] text-slate-400">Mobile Phone</div>
              <div className="text-[11px] font-bold text-white">Field Technicians</div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/40 flex justify-end">
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-semibold"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
