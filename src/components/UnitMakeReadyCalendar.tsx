import React, { useState, useMemo } from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Plus,
  Truck
} from 'lucide-react';
import {
  Unit,
  UnitScheduleEvent,
  ScheduleEventStatus,
  ScheduleTradeCode,
  SCHEDULE_TRADE_CODES,
  Vendor
} from '../types';
import { soundManager } from '../services/audio';

interface UnitMakeReadyCalendarProps {
  unit: Unit;
  vendors: Vendor[];
  onAddScheduleEvent?: (
    unitId: string,
    payload: {
      date: string;
      trade_codes?: ScheduleTradeCode[];
      activity: string;
      vendorIdOrCustom?: string;
      status: ScheduleEventStatus;
      notes?: string;
    }
  ) => Promise<void>;
  onUpdateScheduleEventStatus?: (
    unitId: string,
    eventId: string,
    status: ScheduleEventStatus
  ) => Promise<void>;
  onRemoveScheduleEvent?: (unitId: string, eventId: string) => Promise<void>;
  defaultExpanded?: boolean;
}

interface CalendarDayItem {
  iso: string;
  dayName: string;
  dayNum: string;
  monthShort: string;
  isToday: boolean;
  isTomorrow: boolean;
}

function buildCalendarDays(extraDates: string[]): CalendarDayItem[] {
  const daysMap = new Map<string, CalendarDayItem>();
  const base = new Date();
  base.setHours(0, 0, 0, 0);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const y0 = base.getFullYear();
  const m0 = String(base.getMonth() + 1).padStart(2, '0');
  const d0 = String(base.getDate()).padStart(2, '0');
  const todayIso = `${y0}-${m0}-${d0}`;

  const tmrwDate = new Date(base);
  tmrwDate.setDate(base.getDate() + 1);
  const tomorrowIso = `${tmrwDate.getFullYear()}-${String(tmrwDate.getMonth() + 1).padStart(2, '0')}-${String(tmrwDate.getDate()).padStart(2, '0')}`;

  for (let i = 0; i < 6; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const iso = `${y}-${m}-${day}`;

    daysMap.set(iso, {
      iso,
      dayName: i === 0 ? 'TODAY' : i === 1 ? 'TMRW' : dayNames[d.getDay()],
      dayNum: String(d.getDate()),
      monthShort: monthNames[d.getMonth()],
      isToday: i === 0,
      isTomorrow: i === 1
    });
  }

  for (const iso of extraDates) {
    if (!iso || daysMap.has(iso)) continue;
    const parts = iso.split('-');
    if (parts.length === 3) {
      const yr = parseInt(parts[0], 10);
      const mo = parseInt(parts[1], 10) - 1;
      const da = parseInt(parts[2], 10);
      const dt = new Date(yr, mo, da);
      if (!isNaN(dt.getTime())) {
        daysMap.set(iso, {
          iso,
          dayName: iso === todayIso ? 'TODAY' : iso === tomorrowIso ? 'TMRW' : dayNames[dt.getDay()],
          dayNum: String(da),
          monthShort: monthNames[mo] || parts[1],
          isToday: iso === todayIso,
          isTomorrow: iso === tomorrowIso
        });
      }
    }
  }

  return Array.from(daysMap.values()).sort((a, b) => a.iso.localeCompare(b.iso));
}

function formatDateBadge(
  isoDate: string,
  todayIso: string,
  tomorrowIso: string
): { label: string; isToday: boolean; isTomorrow: boolean } {
  if (isoDate === todayIso) {
    return { label: 'TODAY', isToday: true, isTomorrow: false };
  }
  if (isoDate === tomorrowIso) {
    return { label: 'TMRW', isToday: false, isTomorrow: true };
  }
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mIdx = parseInt(parts[1], 10) - 1;
    const dNum = parseInt(parts[2], 10);
    return {
      label: `${monthNames[mIdx] || parts[1]} ${dNum}`,
      isToday: false,
      isTomorrow: false
    };
  }
  return { label: isoDate, isToday: false, isTomorrow: false };
}

export const UnitMakeReadyCalendar: React.FC<UnitMakeReadyCalendarProps> = ({
  unit,
  vendors,
  onAddScheduleEvent,
  onUpdateScheduleEventStatus,
  onRemoveScheduleEvent,
  defaultExpanded = true
}) => {
  const scheduleEvents: UnitScheduleEvent[] = useMemo(() => {
    const raw = Array.isArray(unit.schedule_events) ? unit.schedule_events : [];
    return [...raw].sort((a, b) => a.date.localeCompare(b.date));
  }, [unit.schedule_events]);

  const [customPickerDate, setCustomPickerDate] = useState<string>('');
  const [isOpen, setIsOpen] = useState(defaultExpanded);
  const [selectedVendorOption, setSelectedVendorOption] = useState<string>('IN_HOUSE');
  const [customVendorName, setCustomVendorName] = useState<string>('');
  const [showCustomRow, setShowCustomRow] = useState<boolean>(false);
  const [customNote, setCustomNote] = useState<string>('');
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const calendarDays = useMemo(() => {
    const eventDates = scheduleEvents.map((e) => e.date);
    if (customPickerDate) eventDates.push(customPickerDate);
    return buildCalendarDays(eventDates);
  }, [scheduleEvents, customPickerDate]);

  const todayIso = calendarDays.find((d) => d.isToday)?.iso || calendarDays[0]?.iso || '';
  const tomorrowIso = calendarDays.find((d) => d.isTomorrow)?.iso || calendarDays[1]?.iso || '';

  const activeCount = scheduleEvents.filter((e) => e.status === 'In Progress').length;
  const upcomingCount = scheduleEvents.filter((e) => e.status === 'Scheduled').length;
  const completedCount = scheduleEvents.filter((e) => e.status === 'Completed').length;

  // Map date -> events for the interactive calendar schedule
  const eventsByDate = useMemo(() => {
    const map = new Map<string, UnitScheduleEvent[]>();
    for (const ev of scheduleEvents) {
      const list = map.get(ev.date) || [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return map;
  }, [scheduleEvents]);

  const resolveVendorSelection = (): string | undefined => {
    if (selectedVendorOption === 'CUSTOM') {
      return customVendorName.trim() ? `custom:${customVendorName.trim()}` : 'IN_HOUSE';
    }
    if (selectedVendorOption === 'NONE') {
      return undefined;
    }
    return selectedVendorOption || 'IN_HOUSE';
  };

  /**
   * Clicking PL, EL, HV, PA, FL, or HK directly inside a Calendar Date cell:
   * - Unassigned -> Adds to Calendar on that date (Today = 'In Progress', Future = 'Scheduled')
   * - Scheduled -> Cycles to 'In Progress'
   * - In Progress -> Cycles to 'Completed' (Done)
   * - Completed -> Removes from that date
   */
  const handleCalendarCellTradeClick = async (day: CalendarDayItem, code: ScheduleTradeCode) => {
    const key = `${day.iso}-${code}`;
    if (busyKey === key) return;
    soundManager.playClick();

    const dayEvents = eventsByDate.get(day.iso) || [];
    const existingEvent = dayEvents.find(
      (ev) =>
        (Array.isArray(ev.trade_codes) && ev.trade_codes.includes(code)) ||
        ev.activity.startsWith(`${code} —`)
    );

    const tradeMeta = SCHEDULE_TRADE_CODES.find((t) => t.code === code);
    setBusyKey(key);
    try {
      if (!existingEvent) {
        if (!onAddScheduleEvent) return;
        const initialStatus: ScheduleEventStatus = day.isToday ? 'In Progress' : 'Scheduled';
        await onAddScheduleEvent(unit.id, {
          date: day.iso,
          trade_codes: [code],
          activity: tradeMeta ? `${code} — ${tradeMeta.label}` : code,
          vendorIdOrCustom: resolveVendorSelection(),
          status: initialStatus,
          notes: customNote.trim() || undefined
        });
      } else if (existingEvent.status === 'Scheduled') {
        if (onUpdateScheduleEventStatus) {
          await onUpdateScheduleEventStatus(unit.id, existingEvent.id, 'In Progress');
        }
      } else if (existingEvent.status === 'In Progress') {
        if (onUpdateScheduleEventStatus) {
          await onUpdateScheduleEventStatus(unit.id, existingEvent.id, 'Completed');
        }
      } else {
        if (onRemoveScheduleEvent) {
          await onRemoveScheduleEvent(unit.id, existingEvent.id);
        }
      }
    } finally {
      setBusyKey(null);
    }
  };

  const cycleStatus = async (ev: UnitScheduleEvent) => {
    if (!onUpdateScheduleEventStatus) return;
    soundManager.playClick();
    const order: ScheduleEventStatus[] = ['Scheduled', 'In Progress', 'Completed'];
    const nextIdx = (order.indexOf(ev.status) + 1) % order.length;
    await onUpdateScheduleEventStatus(unit.id, ev.id, order[nextIdx]);
  };

  const getStatusBadgeStyle = (status: ScheduleEventStatus) => {
    if (status === 'In Progress') {
      return 'bg-[#FFB800]/20 text-[#FFB800] border-[#FFB800]/50';
    }
    if (status === 'Completed') {
      return 'bg-[#00FFB4]/20 text-[#00FFB4] border-[#00FFB4]/50';
    }
    return 'bg-[#00E5FF]/15 text-[#00E5FF] border-[#00E5FF]/40';
  };

  const getStatusLabel = (status: ScheduleEventStatus) => {
    if (status === 'In Progress') return 'In Progress';
    if (status === 'Completed') return 'Done';
    return 'Scheduled';
  };

  const getTradeMeta = (code: ScheduleTradeCode) => {
    return (
      SCHEDULE_TRADE_CODES.find((t) => t.code === code) || {
        code,
        label: code,
        defaultActivity: code,
        color: '#00FFB4'
      }
    );
  };

  const getUnitStageColor = (stage: string) => {
    if (stage === 'Rent Ready' || stage === 'Ready') {
      return 'text-[#00FFB4] border-[#00FFB4]/40 bg-[#00FFB4]/10';
    }
    if (stage === 'Final Inspection' || stage === 'Final Walk') {
      return 'text-purple-300 border-purple-500/40 bg-purple-500/10';
    }
    if (stage === 'In Progress' || stage === 'Paint & Drywall' || stage === 'Maintenance & Repairs') {
      return 'text-[#FFB800] border-[#FFB800]/40 bg-[#FFB800]/10';
    }
    return 'text-[#00E5FF] border-[#00E5FF]/40 bg-[#00E5FF]/10';
  };

  return (
    <div
      className="mt-2 rounded-lg bg-slate-950/90 border border-slate-800/90 overflow-hidden transition-all"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header Bar: Make-Ready Schedule + Current Make-Ready Status */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          soundManager.playClick();
          setIsOpen(!isOpen);
        }}
        className="w-full px-2.5 py-1.5 flex items-center justify-between gap-1.5 bg-slate-900/80 hover:bg-slate-900 transition-colors text-left"
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          <Calendar className="w-3.5 h-3.5 text-[#00E5FF] shrink-0" />
          <span className="text-[10px] font-mono font-bold text-slate-100">
            Make-Ready Schedule
          </span>
          <span
            className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border ${getUnitStageColor(
              unit.current_status
            )}`}
            title="Current Make-Ready Status"
          >
            {unit.current_status}
          </span>
          {activeCount > 0 && (
            <span className="px-1 py-0.2 rounded text-[8px] font-mono font-bold bg-[#FFB800]/20 text-[#FFB800] border border-[#FFB800]/40">
              {activeCount} Active
            </span>
          )}
          {upcomingCount > 0 && (
            <span className="px-1 py-0.2 rounded text-[8px] font-mono font-bold bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/40">
              {upcomingCount} Sched
            </span>
          )}
          {completedCount > 0 && (
            <span className="px-1 py-0.2 rounded text-[8px] font-mono font-bold bg-[#00FFB4]/15 text-[#00FFB4] border border-[#00FFB4]/40">
              {completedCount} Done
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-[9px] font-mono text-[#00E5FF] shrink-0">
          <span>{isOpen ? 'Hide' : 'Calendar'}</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {/* Compact Schedule Summary when collapsed */}
      {!isOpen && scheduleEvents.length > 0 && (
        <div className="px-2 py-1.5 space-y-1 border-t border-slate-800/70">
          {scheduleEvents.slice(0, 4).map((ev) => {
            const badge = formatDateBadge(ev.date, todayIso, tomorrowIso);
            return (
              <div
                key={ev.id}
                className="flex items-center justify-between gap-1.5 text-[10px] font-mono bg-slate-900/80 px-2 py-1 rounded border border-slate-800/80"
              >
                <div className="flex items-center gap-1 min-w-0 flex-1 flex-wrap">
                  <span
                    className={`px-1 py-0.2 rounded text-[9px] font-bold shrink-0 ${
                      badge.isToday
                        ? 'bg-[#00FFB4]/20 text-[#00FFB4] border border-[#00FFB4]/40'
                        : badge.isTomorrow
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {badge.label}
                  </span>

                  {Array.isArray(ev.trade_codes) &&
                    ev.trade_codes.map((code) => {
                      const meta = getTradeMeta(code);
                      return (
                        <span
                          key={code}
                          style={{
                            backgroundColor: `${meta.color}20`,
                            color: meta.color,
                            borderColor: `${meta.color}60`
                          }}
                          className="px-1 py-0.2 rounded text-[8px] font-mono font-bold border shrink-0"
                        >
                          {code}
                        </span>
                      );
                    })}

                  <span className="text-slate-100 font-semibold truncate">{ev.activity}</span>
                  {ev.vendor_name && (
                    <span className="text-amber-300 text-[9px] truncate">· {ev.vendor_name}</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => cycleStatus(ev)}
                  title="Click to cycle Make-Ready status"
                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold border shrink-0 transition-colors ${getStatusBadgeStyle(
                    ev.status
                  )}`}
                >
                  {getStatusLabel(ev.status)}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Calendar with PL, EL, HV, PA, FL, HK directly inside each Date */}
      {isOpen && (
        <div className="p-2 border-t border-slate-800 space-y-2 bg-slate-950/95">
          {/* Top Calendar Controls: Legend + Date Picker + Optional Vendor Selector */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 text-[9px] font-mono">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF]" /> Sched
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFB800]" /> Active
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00FFB4]" /> Done
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setShowCustomRow(!showCustomRow);
                }}
                className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 hover:border-[#00FFB4] text-amber-300 text-[9px] font-mono flex items-center gap-1"
                title="Select Vendor or add a custom date to the calendar"
              >
                <Truck className="w-2.5 h-2.5 text-amber-400" />
                <span>{showCustomRow ? 'Close Options' : 'Vendor / +Date'}</span>
              </button>
            </div>
          </div>

          {/* Optional Vendor & Custom Date Toolbar */}
          {showCustomRow && (
            <div className="p-1.5 rounded bg-slate-900/90 border border-slate-800 space-y-1.5 text-[9px] font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                <div className="space-y-0.5">
                  <span className="text-slate-400 block">Default Vendor for Clicks:</span>
                  <select
                    value={selectedVendorOption}
                    onChange={(e) => setSelectedVendorOption(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-amber-300 text-[9px] font-mono px-1.5 py-1 rounded focus:outline-none focus:border-[#00FFB4]"
                  >
                    <option value="IN_HOUSE">🔧 In-House Maintenance Tech</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        🚚 {v.name} ({v.trade_category})
                      </option>
                    ))}
                    <option value="CUSTOM">+ New Vendor / Contractor...</option>
                    <option value="NONE">-- No Vendor --</option>
                  </select>
                </div>

                <div className="space-y-0.5">
                  <span className="text-slate-400 block">Add Another Calendar Date:</span>
                  <input
                    type="date"
                    value={customPickerDate}
                    onChange={(e) => {
                      if (e.target.value) setCustomPickerDate(e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-[9px] font-mono px-1.5 py-1 rounded focus:outline-none focus:border-[#00FFB4]"
                  />
                </div>
              </div>

              {selectedVendorOption === 'CUSTOM' && (
                <input
                  type="text"
                  value={customVendorName}
                  onChange={(e) => setCustomVendorName(e.target.value)}
                  placeholder="Write vendor or contractor name..."
                  className="w-full bg-slate-950 border border-amber-400/60 text-white text-[9px] font-mono px-2 py-1 rounded focus:outline-none focus:border-amber-400"
                />
              )}

              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Optional note for next trade click (e.g. 9:00 AM, touch-up)..."
                className="w-full bg-slate-950 border border-slate-700 text-white text-[9px] font-mono px-2 py-1 rounded focus:outline-none focus:border-[#00FFB4]"
              />
            </div>
          )}

          {/* Calendar Grid: Each Date Card has PL, EL, HV, PA, FL, HK directly inside */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {calendarDays.map((d) => {
              const dayEvents = eventsByDate.get(d.iso) || [];
              const hasActive = dayEvents.some((e) => e.status === 'In Progress');
              const hasScheduled = dayEvents.some((e) => e.status === 'Scheduled');
              const hasCompleted =
                dayEvents.length > 0 && dayEvents.every((e) => e.status === 'Completed');

              // Determine day's overall Make-Ready status badge
              const dayStatusLabel = hasActive
                ? 'In Progress'
                : hasScheduled
                ? 'Scheduled'
                : hasCompleted
                ? 'Done'
                : 'Open';

              const dayStatusClass = hasActive
                ? 'text-[#FFB800] bg-[#FFB800]/15 border-[#FFB800]/40'
                : hasScheduled
                ? 'text-[#00E5FF] bg-[#00E5FF]/15 border-[#00E5FF]/40'
                : hasCompleted
                ? 'text-[#00FFB4] bg-[#00FFB4]/15 border-[#00FFB4]/40'
                : 'text-slate-500 bg-slate-900 border-slate-800';

              return (
                <div
                  key={d.iso}
                  className={`rounded-md border p-1.5 flex flex-col justify-between transition-all ${
                    d.isToday
                      ? 'bg-slate-900/95 border-[#00FFB4]/50 shadow-[0_0_8px_rgba(0,255,180,0.08)]'
                      : dayEvents.length > 0
                      ? 'bg-slate-900/90 border-slate-700'
                      : 'bg-slate-900/50 border-slate-800/80'
                  }`}
                >
                  {/* Date Header + Make-Ready Status on that Date */}
                  <div className="flex items-center justify-between gap-1 pb-1 mb-1 border-b border-slate-800/80">
                    <div className="flex items-baseline gap-1 min-w-0">
                      <span
                        className={`text-[8px] font-mono font-bold uppercase ${
                          d.isToday
                            ? 'text-[#00FFB4]'
                            : d.isTomorrow
                            ? 'text-amber-300'
                            : 'text-slate-400'
                        }`}
                      >
                        {d.dayName}
                      </span>
                      <span className="text-[10px] font-['Chakra_Petch'] font-bold text-white">
                        {d.monthShort} {d.dayNum}
                      </span>
                    </div>

                    <span
                      className={`px-1 py-0.2 rounded text-[7px] font-mono font-bold border shrink-0 ${dayStatusClass}`}
                    >
                      {dayStatusLabel}
                    </span>
                  </div>

                  {/* Direct PL, EL, HV, PA, FL, HK Buttons INSIDE this Calendar Date */}
                  <div className="grid grid-cols-3 gap-1">
                    {SCHEDULE_TRADE_CODES.map((trade) => {
                      const tradeEvent = dayEvents.find(
                        (ev) =>
                          (Array.isArray(ev.trade_codes) &&
                            ev.trade_codes.includes(trade.code)) ||
                          ev.activity.startsWith(`${trade.code} —`)
                      );
                      const status = tradeEvent?.status;
                      const isBusy = busyKey === `${d.iso}-${trade.code}`;

                      let btnStyle =
                        'bg-slate-950/90 border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-200';
                      let statusDotColor = '';

                      if (status === 'Scheduled') {
                        btnStyle =
                          'bg-[#00E5FF]/20 border-[#00E5FF] text-[#00E5FF] font-extrabold shadow-[0_0_6px_rgba(0,229,255,0.2)]';
                        statusDotColor = '#00E5FF';
                      } else if (status === 'In Progress') {
                        btnStyle =
                          'bg-[#FFB800]/25 border-[#FFB800] text-[#FFB800] font-extrabold shadow-[0_0_6px_rgba(255,184,0,0.25)]';
                        statusDotColor = '#FFB800';
                      } else if (status === 'Completed') {
                        btnStyle =
                          'bg-[#00FFB4]/20 border-[#00FFB4] text-[#00FFB4] font-extrabold';
                        statusDotColor = '#00FFB4';
                      }

                      return (
                        <button
                          key={trade.code}
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleCalendarCellTradeClick(d, trade.code)}
                          title={
                            status
                              ? `${trade.code} (${trade.label}) on ${d.monthShort} ${d.dayNum}: ${status} — Click to change status / remove`
                              : `Click to schedule ${trade.code} (${trade.label}) on ${d.monthShort} ${d.dayNum}`
                          }
                          className={`py-0.5 px-1 rounded border text-[9px] font-mono flex items-center justify-center gap-0.5 transition-all cursor-pointer ${btnStyle}`}
                        >
                          {statusDotColor && (
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: statusDotColor }}
                            />
                          )}
                          <span>{trade.code}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Make-Ready Schedule List (Date + Trade + Vendor + Status) */}
          {scheduleEvents.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-slate-800/80 max-h-40 overflow-y-auto pr-0.5">
              {scheduleEvents.map((ev) => {
                const badge = formatDateBadge(ev.date, todayIso, tomorrowIso);
                return (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between gap-1.5 bg-slate-900/90 px-2 py-1 rounded border border-slate-800 text-[9px] font-mono"
                  >
                    <div className="flex items-center gap-1 min-w-0 flex-1 flex-wrap">
                      <span
                        className={`px-1 py-0.2 rounded text-[8px] font-bold shrink-0 ${
                          badge.isToday
                            ? 'bg-[#00FFB4]/20 text-[#00FFB4] border border-[#00FFB4]/40'
                            : badge.isTomorrow
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {badge.label}
                      </span>

                      {Array.isArray(ev.trade_codes) &&
                        ev.trade_codes.map((code) => {
                          const meta = getTradeMeta(code);
                          return (
                            <span
                              key={code}
                              style={{
                                backgroundColor: `${meta.color}20`,
                                color: meta.color,
                                borderColor: `${meta.color}60`
                              }}
                              className="px-1 py-0.2 rounded text-[8px] font-mono font-bold border shrink-0"
                              title={meta.label}
                            >
                              {code}
                            </span>
                          );
                        })}

                      <span
                        className={`font-semibold truncate ${
                          ev.status === 'Completed'
                            ? 'line-through text-slate-400'
                            : 'text-slate-100'
                        }`}
                      >
                        {ev.activity}
                      </span>

                      {ev.vendor_name && (
                        <span className="text-amber-300 truncate">· {ev.vendor_name}</span>
                      )}
                      {ev.notes && (
                        <span className="text-cyan-300 italic truncate">"{ev.notes}"</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <select
                        value={ev.status}
                        onChange={(e) => {
                          if (!onUpdateScheduleEventStatus) return;
                          soundManager.playClick();
                          onUpdateScheduleEventStatus(
                            unit.id,
                            ev.id,
                            e.target.value as ScheduleEventStatus
                          );
                        }}
                        className={`text-[8px] font-mono font-bold px-1 py-0.5 rounded border cursor-pointer focus:outline-none ${getStatusBadgeStyle(
                          ev.status
                        )}`}
                      >
                        <option value="Scheduled" className="bg-slate-900 text-[#00E5FF]">
                          Scheduled
                        </option>
                        <option value="In Progress" className="bg-slate-900 text-[#FFB800]">
                          In Progress
                        </option>
                        <option value="Completed" className="bg-slate-900 text-[#00FFB4]">
                          Done
                        </option>
                      </select>

                      {onRemoveScheduleEvent && (
                        <button
                          type="button"
                          onClick={() => {
                            soundManager.playClick();
                            onRemoveScheduleEvent(unit.id, ev.id);
                          }}
                          title="Remove from schedule"
                          className="text-slate-500 hover:text-[#FF3366] px-0.5"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
