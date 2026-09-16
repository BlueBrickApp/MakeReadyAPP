import React from 'react';
import { 
  Columns3, 
  BarChart3, 
  ClipboardCheck, 
  History, 
  Send, 
  Stamp,
  Lock
} from 'lucide-react';
import { soundManager } from '../services/audio';
import { TechnicianUser } from '../types';

export type ScreenTab = 
  | 'pipeline'
  | 'turnover-dashboard'
  | 'inspection-checklist'
  | 'field-log'
  | 'dispatcher'
  | 'readiness-signoff';

interface NavigationProps {
  currentTab: ScreenTab;
  onTabChange: (tab: ScreenTab) => void;
  currentUser: TechnicianUser;
  openWorkOrdersCount: number;
  readyUnitsCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  currentUser,
  openWorkOrdersCount,
  readyUnitsCount
}) => {
  const isSupervisor = currentUser.role === 'Maintenance Supervisor';

  const navItems: {
    id: ScreenTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
    supervisorOnly?: boolean;
    description: string;
  }[] = [
    {
      id: 'pipeline',
      label: 'Unit Pipeline',
      icon: Columns3,
      description: 'Kanban stage workflow'
    },
    {
      id: 'turnover-dashboard',
      label: 'Turnover Dashboard',
      icon: BarChart3,
      description: '6-Trade progress matrix'
    },
    {
      id: 'inspection-checklist',
      label: 'Inspection Checklist',
      icon: ClipboardCheck,
      description: 'Trade punch-lists & photos'
    },
    {
      id: 'field-log',
      label: 'Field Log',
      icon: History,
      description: 'Chronological activity feed'
    },
    {
      id: 'dispatcher',
      label: 'Dispatcher',
      icon: Send,
      badge: openWorkOrdersCount > 0 ? openWorkOrdersCount : undefined,
      description: 'Ad-hoc work orders'
    },
    {
      id: 'readiness-signoff',
      label: 'Readiness Sign-Off',
      icon: Stamp,
      badge: readyUnitsCount > 0 ? readyUnitsCount : undefined,
      supervisorOnly: true,
      description: 'Supervisor final certification'
    }
  ];

  return (
    <nav className="bg-[#0A0E17] border-b border-slate-800/80 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          const isRestricted = item.supervisorOnly && !isSupervisor;

          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              onClick={() => {
                soundManager.playClick();
                onTabChange(item.id);
              }}
              className={`group relative flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all select-none min-h-[44px] ${
                isActive
                  ? 'bg-slate-900 text-[#00FFB4] border border-[#00FFB4]/50 shadow-[0_0_15px_rgba(0,255,180,0.2)]'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                isActive ? 'text-[#00FFB4]' : 'text-slate-400 group-hover:text-slate-200'
              }`} />
              
              <span>{item.label}</span>

              {/* Locked badge for supervisor only */}
              {isRestricted && (
                <span title="Supervisor verification required" className="inline-flex items-center">
                  <Lock className="w-3 h-3 text-slate-500 ml-0.5" />
                </span>
              )}

              {/* Count badges */}
              {item.badge !== undefined && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  isActive 
                    ? 'bg-[#00FFB4] text-black' 
                    : item.id === 'readiness-signoff'
                    ? 'bg-[#00FFB4]/20 text-[#00FFB4] border border-[#00FFB4]/40'
                    : 'bg-[#FF3366] text-white'
                }`}>
                  {item.badge}
                </span>
              )}

              {/* Active Underline Glow */}
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#00FFB4] rounded-full shadow-[0_0_8px_#00FFB4]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
