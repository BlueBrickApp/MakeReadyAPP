import React, { useState, useEffect } from 'react';
import { 
  X, 
  Bell, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  Wrench, 
  Stamp, 
  Clock, 
  CheckCheck,
  Send,
  Trash2
} from 'lucide-react';
import { SupervisorNotification } from '../types';
import { soundManager } from '../services/audio';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: SupervisorNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDeleteNotification?: (id: string) => void;
  onDeleteReadNotifications?: () => void;
  onNavigateToUnit: (unitId: string) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onDeleteNotification,
  onDeleteReadNotifications,
  onNavigateToUnit
}) => {
  const [activeTab, setActiveTab] = useState<'alerts' | 'email-preview'>('alerts');
  const [selectedNotifForEmail, setSelectedNotifForEmail] = useState<SupervisorNotification | null>(
    notifications[0] || null
  );

  // Keep selected email in sync if notifications change
  useEffect(() => {
    if (selectedNotifForEmail) {
      const stillExists = notifications.find(n => n.id === selectedNotifForEmail.id);
      if (!stillExists) {
        setSelectedNotifForEmail(notifications[0] || null);
      }
    } else if (notifications.length > 0) {
      setSelectedNotifForEmail(notifications[0]);
    }
  }, [notifications, selectedNotifForEmail]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;
  const readCount = notifications.filter(n => n.read).length;

  const getNotifIcon = (type: SupervisorNotification['type']) => {
    switch (type) {
      case 'checklist_100':
        return { icon: CheckCircle2, color: 'text-[#00FFB4] bg-[#00FFB4]/15 border-[#00FFB4]/40' };
      case 'work_order_alert':
        return { icon: AlertCircle, color: 'text-[#FF3366] bg-[#FF3366]/15 border-[#FF3366]/40' };
      case 'rent_ready':
        return { icon: Stamp, color: 'text-purple-400 bg-purple-500/15 border-purple-500/40' };
      case 'conflict_resolved':
        return { icon: Wrench, color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/40' };
      default:
        return { icon: Bell, color: 'text-slate-300 bg-slate-850 border-slate-700' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-[#0D131F] border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#00FFB4]/15 text-[#00FFB4] border border-[#00FFB4]/30">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-['Chakra_Petch'] font-bold text-lg text-white">
                SUPERVISOR NOTIFICATION HUB
              </h3>
              <p className="text-xs font-mono text-slate-400">
                Automated trade alerts & simulated dispatch emails
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs: Live Alerts vs Email Dispatch Preview */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`py-2.5 px-4 text-xs font-semibold font-mono border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'alerts'
                ? 'border-[#00FFB4] text-[#00FFB4]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>System Alerts ({unreadCount} unread)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('email-preview');
              if (!selectedNotifForEmail && notifications.length > 0) {
                setSelectedNotifForEmail(notifications[0]);
              }
            }}
            className={`py-2.5 px-4 text-xs font-semibold font-mono border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'email-preview'
                ? 'border-[#00FFB4] text-[#00FFB4]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Simulated Email Dispatch Log</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          
          {activeTab === 'alerts' ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 flex-wrap gap-2">
                <span className="text-xs font-mono text-slate-400">Recent Automated Dispatches:</span>
                <div className="flex items-center gap-2">
                  {readCount > 0 && onDeleteReadNotifications && (
                    <button
                      id="delete-read-emails-btn"
                      onClick={() => {
                        soundManager.playClick();
                        onDeleteReadNotifications();
                      }}
                      className="text-xs font-mono text-slate-300 hover:text-[#FF3366] flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-950/40 hover:bg-red-950/80 border border-red-900/60 hover:border-red-500/50 transition-colors"
                      title="Delete all read emails / notifications"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-[#FF3366]" />
                      <span>Delete Read ({readCount})</span>
                    </button>
                  )}
                  {unreadCount > 0 && (
                    <button
                      onClick={() => {
                        soundManager.playClick();
                        onMarkAllRead();
                      }}
                      className="text-xs font-mono text-[#00FFB4] hover:underline flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Mark all as read</span>
                    </button>
                  )}
                </div>
              </div>

              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-500 font-mono text-xs border border-dashed border-slate-800 rounded-xl">
                  No notifications or emails recorded.
                </div>
              ) : (
                notifications.map((notif) => {
                  const { icon: Icon, color } = getNotifIcon(notif.type);
                  const timeAgo = new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div
                      key={notif.id}
                      className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                        notif.read
                          ? 'bg-slate-900/60 border-slate-800 text-slate-400'
                          : 'bg-slate-900 border-[#00FFB4]/40 shadow-[0_0_15px_rgba(0,255,180,0.08)]'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg border shrink-0 ${color}`}>
                          <Icon className="w-4 h-4" />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-white">{notif.title}</h4>
                            {!notif.read && (
                              <span className="w-2 h-2 rounded-full bg-[#FF3366] shadow-[0_0_6px_#FF3366]" />
                            )}
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed font-sans">{notif.message}</p>
                          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500 pt-1">
                            <span>{timeAgo}</span>
                            <span>•</span>
                            <span className="text-[#00E5FF]">Unit #{notif.unit_number}</span>
                            {notif.email_dispatched && (
                              <>
                                <span>•</span>
                                <span className="text-[#00FFB4] flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  <span>Email Dispatched</span>
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Action Controls: View Email, Dismiss, and Trash Button */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex flex-col items-end gap-1.5">
                          <button
                            id={`view-email-btn-${notif.id}`}
                            onClick={() => {
                              soundManager.playClick();
                              setSelectedNotifForEmail(notif);
                              setActiveTab('email-preview');
                            }}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-300 transition-colors"
                          >
                            View Email
                          </button>
                          {!notif.read && (
                            <button
                              onClick={() => {
                                soundManager.playClick();
                                onMarkRead(notif.id);
                              }}
                              className="text-[10px] text-slate-400 hover:text-white transition-colors"
                            >
                              Dismiss
                            </button>
                          )}
                        </div>

                        {/* Trash Button */}
                        {onDeleteNotification && (
                          <button
                            id={`delete-notif-btn-${notif.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              soundManager.playClick();
                              onDeleteNotification(notif.id);
                            }}
                            title="Delete this email / notification"
                            className="p-2 rounded-lg bg-slate-800/80 hover:bg-red-500/20 text-slate-400 hover:text-[#FF3366] border border-slate-700/60 hover:border-red-500/40 transition-all group"
                          >
                            <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* Email Preview Tab */
            <div className="space-y-4">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono space-y-1">
                <div className="text-slate-400">
                  Select alert to preview automated dispatch email sent to <strong>Sarah Vance &lt;svance@cedarridgeops.com&gt;</strong>:
                </div>
                <div className="flex gap-2 overflow-x-auto py-1">
                  {notifications.map(n => (
                    <div
                      key={n.id}
                      className={`flex items-center rounded overflow-hidden border ${
                        selectedNotifForEmail?.id === n.id
                          ? 'border-[#00FFB4] bg-[#00FFB4]/10'
                          : 'border-slate-800 bg-slate-900'
                      }`}
                    >
                      <button
                        onClick={() => setSelectedNotifForEmail(n)}
                        className={`px-2 py-1 text-[11px] whitespace-nowrap font-mono ${
                          selectedNotifForEmail?.id === n.id
                            ? 'text-[#00FFB4] font-bold'
                            : 'text-slate-300'
                        }`}
                      >
                        #{n.unit_number} - {n.title}
                      </button>
                      {onDeleteNotification && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            soundManager.playClick();
                            onDeleteNotification(n.id);
                            if (selectedNotifForEmail?.id === n.id) {
                              const remaining = notifications.filter(x => x.id !== n.id);
                              setSelectedNotifForEmail(remaining[0] || null);
                            }
                          }}
                          title="Delete email"
                          className="px-1.5 py-1 text-slate-500 hover:text-[#FF3366] hover:bg-red-500/20 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {selectedNotifForEmail ? (
                <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden font-sans">
                  {/* Email Header Bar */}
                  <div className="bg-slate-900 p-3 border-b border-slate-800 text-xs font-mono space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">From:</span>
                      <span className="text-[#00FFB4]">Unit Turnover Bot &lt;dispatch@cedarridgeops.com&gt;</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">To:</span>
                      <span className="text-slate-200">Sarah Vance (Lead Maintenance Supervisor)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Subject:</span>
                      <span className="text-white font-bold">[OPS-ALERT] {selectedNotifForEmail.title}</span>
                    </div>
                  </div>

                  {/* Email Body */}
                  <div className="p-4 space-y-3 text-xs text-slate-200 leading-relaxed">
                    <p>Supervisor Sarah Vance,</p>
                    <p>
                      This automated notification confirms an operational turnover event has been logged for 
                      <strong> Unit #{selectedNotifForEmail.unit_number}</strong>:
                    </p>

                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1 font-mono text-[11px]">
                      <div><strong>Alert Type:</strong> {selectedNotifForEmail.type}</div>
                      <div><strong>Trade:</strong> {selectedNotifForEmail.trade_category || 'All Trades'}</div>
                      <div><strong>Details:</strong> {selectedNotifForEmail.message}</div>
                      <div><strong>Timestamp:</strong> {new Date(selectedNotifForEmail.timestamp).toLocaleString()}</div>
                    </div>

                    <p>
                      The field technician has signed off on these items in the mobile terminal. Please conduct the final walk-through inspection and sign off in the <em>Readiness Sign-off</em> screen.
                    </p>

                    <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
                      <button
                        onClick={() => {
                          onClose();
                          onNavigateToUnit(selectedNotifForEmail.unit_id);
                        }}
                        className="px-4 py-2 rounded-lg bg-[#00FFB4] text-black font-bold text-xs font-mono hover:brightness-110 transition-all"
                      >
                        Launch Unit #{selectedNotifForEmail.unit_number} in App
                      </button>

                      {onDeleteNotification && (
                        <button
                          onClick={() => {
                            soundManager.playClick();
                            const toDelId = selectedNotifForEmail.id;
                            onDeleteNotification(toDelId);
                            const remaining = notifications.filter(n => n.id !== toDelId);
                            setSelectedNotifForEmail(remaining[0] || null);
                          }}
                          className="px-3 py-2 rounded-lg bg-red-950/50 hover:bg-red-900/60 text-[#FF3366] border border-red-800/60 font-mono text-xs flex items-center gap-1.5 transition-colors"
                          title="Delete this email"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Email</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-500 font-mono text-xs">
                  No email alert selected.
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
