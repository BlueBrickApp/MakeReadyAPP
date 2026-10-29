/**
 * Unit Turnover Tracker - Data Models & Types
 */

export type TurnoverStage = 'Inspection' | 'In-Progress' | 'Ready' | 'Rent Ready';

export type TradeCategory = 
  | 'Plumbing'
  | 'Electrical'
  | 'HVAC'
  | 'Appliances'
  | 'General, Hardware & Turn';

export const TRADE_CATEGORIES: TradeCategory[] = [
  'Plumbing',
  'Electrical',
  'HVAC',
  'Appliances',
  'General, Hardware & Turn',
];

export const TRADE_DEEP_DIVE_LABELS: Record<TradeCategory, string> = {
  'Plumbing': '🚰 Plumbing (Deep Dive)',
  'Electrical': '⚡ Electrical (Deep Dive)',
  'HVAC': '❄️ HVAC (Deep Dive)',
  'Appliances': '🍳 Appliances (Deep Dive)',
  'General, Hardware & Turn': '🏠 General, Hardware & Turn (Deep Dive)',
};

export const TRADE_SHORT_CODES: Record<TradeCategory, string> = {
  'Plumbing': 'PL',
  'Electrical': 'EL',
  'HVAC': 'HV',
  'Appliances': 'AP',
  'General, Hardware & Turn': 'GH',
};

export interface Task {
  id: string;
  checklist_id: string;
  sequence_order: number; // Fixed sequence (cannot be reordered)
  name: string;
  description: string;
  is_completed: boolean;
  photo_url?: string;
  notes: string;
  assigned_to: string;
  completed_at?: number;
  completed_by?: string;
  flagged_issue?: boolean;
  version: number;
  sync_status?: 'synced' | 'pending' | 'conflict';
}

export interface Checklist {
  id: string;
  unit_id: string;
  trade_category: TradeCategory;
  task_list: Task[];
  completion_percentage: number;
  status: 'pending' | 'in_progress' | 'completed';
  assigned_technician_id: string;
  last_updated: number;
  last_updated_by: string;
  version: number;
}

export const FLOOR_PLAN_GROUPS = [
  {
    category: '1 Bedroom',
    options: [
      'A1 — 675 SF',
      'A2 — 675 SF',
      'A3 — 738 SF',
      'A4 — 788 SF',
      'A5 — 850 SF',
      'A6 — 871 SF',
    ],
  },
  {
    category: '2 Bedroom',
    options: [
      'B1 — 1,075 SF',
      'B2 — 1,125 SF',
      'B3 — 1,125 SF',
      'B4 — 1,175 SF',
      'B5 — 1,202 SF',
      'B6 — 1,221 SF',
      'B7 — 1,250 SF',
    ],
  },
  {
    category: '3 Bedroom',
    options: [
      'C1 — 1,350 SF',
    ],
  },
] as const;

export type FloorPlan = string;

export interface UnitFloorPlanDetails {
  unitClass: string;        // e.g. "A1", "B1", "B2", "C1"
  squareFeetText: string;   // e.g. "675 SF", "1,075 SF"
  squareFeetNumber: number; // e.g. 675, 1075
  category: string;         // e.g. "1 Bedroom", "2 Bedroom"
  squareYards: number;      // e.g. Math.ceil(SF / 9)
}

/**
 * Extracts unit class (e.g. A1, B1) and square footage (SF / pies cuadrados)
 * from any floor plan string or predefined catalog.
 */
export function parseUnitFloorPlanDetails(rawFloorPlan?: string): UnitFloorPlanDetails {
  const plan = (rawFloorPlan || '').trim();

  // 1. Direct search in known catalog
  for (const group of FLOOR_PLAN_GROUPS) {
    for (const opt of group.options) {
      const [code, sf] = opt.split('—').map((s) => s.trim());
      if (
        plan === opt ||
        plan.toLowerCase() === code.toLowerCase() ||
        plan.toLowerCase().startsWith(code.toLowerCase() + ' ') ||
        plan.toLowerCase().startsWith(code.toLowerCase() + '—')
      ) {
        const num = parseInt(sf.replace(/[^0-9]/g, ''), 10) || 0;
        return {
          unitClass: code,
          squareFeetText: sf,
          squareFeetNumber: num,
          category: group.category,
          squareYards: Math.ceil(num / 9)
        };
      }
    }
  }

  // 2. Regex parsing
  const classMatch = plan.match(/^([A-Za-z]+[0-9]+)/i);
  const sfMatch = plan.match(/(\d[\d,]*)\s*(?:SF|sq\s*ft|sqft|pies)/i);

  const unitClass = classMatch ? classMatch[1].toUpperCase() : (plan.split(/[\s—\-]/)[0] || 'Unit');
  let sfNum = 0;
  let sfText = 'N/A';
  if (sfMatch) {
    sfNum = parseInt(sfMatch[1].replace(/,/g, ''), 10);
    sfText = `${sfMatch[1]} SF`;
  }

  // Fallback: Check catalog by class prefix if SF not found
  if (sfNum === 0 && unitClass) {
    for (const group of FLOOR_PLAN_GROUPS) {
      for (const opt of group.options) {
        if (opt.toLowerCase().startsWith(unitClass.toLowerCase() + ' ')) {
          const [, sf] = opt.split('—').map((s) => s.trim());
          sfNum = parseInt(sf.replace(/[^0-9]/g, ''), 10) || 0;
          sfText = sf;
          return {
            unitClass,
            squareFeetText: sfText,
            squareFeetNumber: sfNum,
            category: group.category,
            squareYards: Math.ceil(sfNum / 9)
          };
        }
      }
    }
  }

  return {
    unitClass: unitClass || 'Standard',
    squareFeetText: sfText !== 'N/A' ? sfText : 'Square Footage N/A',
    squareFeetNumber: sfNum,
    category: unitClass.startsWith('A')
      ? '1 Bedroom'
      : unitClass.startsWith('B')
      ? '2 Bedroom'
      : unitClass.startsWith('C')
      ? '3 Bedroom'
      : 'Apartment',
    squareYards: sfNum > 0 ? Math.ceil(sfNum / 9) : 0
  };
}

export interface UnitVendorAssignment {
  vendor_id: string;
  vendor_name: string;
  trade_category: string;
  task_note?: string;
  scheduled_date?: string; // YYYY-MM-DD date when vendor will perform work
  assigned_at: number;
}

export type ScheduleEventStatus = 'In Progress' | 'Scheduled' | 'Completed';

// Schedule Trade Codes: PL replaced with PC (Punch) per user request
export type ScheduleTradeCode = 'PC' | 'CP' | 'FL' | 'HK' | 'PA' | 'PL' | 'EL' | 'HV';

export interface ScheduleTradeMeta {
  code: ScheduleTradeCode;
  label: string;
  shortLabel: string;
  fullName: string;
  defaultActivity: string;
  color: string;
  description: string;
}

export const SCHEDULE_TRADE_CODES: ScheduleTradeMeta[] = [
  {
    code: 'PC',
    label: 'Punch',
    shortLabel: 'Punch',
    fullName: 'Make Ready Punch',
    defaultActivity: 'Make Ready Punch (PC)',
    color: '#FFB800',
    description: 'Make Ready Punch: hardware, outlet covers, door/cabinet adjustments & touch-up details'
  },
  {
    code: 'CP',
    label: 'Carpet',
    shortLabel: 'Carpet',
    fullName: 'Carpet Service / Install',
    defaultActivity: 'Carpet Service / Install (CP)',
    color: '#EC4899',
    description: 'Carpet Service: replacement, deep steam & shampoo, tack strips & pad check'
  },
  {
    code: 'FL',
    label: 'Flooring',
    shortLabel: 'Flooring',
    fullName: 'Flooring / Vinyl Plank',
    defaultActivity: 'Flooring / Vinyl Plank (FL)',
    color: '#38BDF8',
    description: 'Flooring: LVP installation, vinyl plank, subfloor repairs & transitions'
  },
  {
    code: 'HK',
    label: 'Housekeeping',
    shortLabel: 'Clean',
    fullName: 'Deep Housekeeping & Cleaning',
    defaultActivity: 'Deep Make-Ready Cleaning (HK)',
    color: '#00FFB4',
    description: 'Housekeeping: deep turnover sanitization, appliances, window sills & tracks'
  },
  {
    code: 'PA',
    label: 'Paint',
    shortLabel: 'Paint',
    fullName: 'Painting & Drywall',
    defaultActivity: 'Full Paint / Touch-Up Paint (PA)',
    color: '#A855F7',
    description: 'Painting: full spray, primer cut-ins, drywall patch sanding & trim'
  }
];

export function normalizeScheduleTradeCode(code: string): ScheduleTradeCode {
  if (!code) return 'PC';
  const upper = code.toUpperCase().trim();
  if (upper === 'PL') return 'PC'; // Migrate legacy PL to PC (Punch)
  return upper as ScheduleTradeCode;
}

export function getScheduleTradeMeta(code: string): ScheduleTradeMeta {
  const norm = normalizeScheduleTradeCode(code);
  const found = SCHEDULE_TRADE_CODES.find((t) => t.code === norm);
  if (found) return found;

  if (norm === 'EL') {
    return {
      code: 'EL',
      label: 'Electrical',
      shortLabel: 'Elec',
      fullName: 'Electrical Service',
      defaultActivity: 'Electrical & Fixtures',
      color: '#F97316',
      description: 'Breaker box, GFCI tripping, fixture bulbs'
    };
  }
  if (norm === 'HV') {
    return {
      code: 'HV',
      label: 'HVAC',
      shortLabel: 'HVAC',
      fullName: 'HVAC Climate Control',
      defaultActivity: 'HVAC Service & Filter',
      color: '#06B6D4',
      description: 'Air filter, thermostat calibration, delta-T temp'
    };
  }

  return {
    code: norm,
    label: norm,
    shortLabel: norm,
    fullName: norm,
    defaultActivity: norm,
    color: '#00FFB4',
    description: norm
  };
}

export interface UnitScheduleEvent {
  id: string;
  date: string; // YYYY-MM-DD
  trade_codes?: ScheduleTradeCode[];
  activity: string;
  vendor_id?: string;
  vendor_name?: string;
  status: ScheduleEventStatus;
  notes?: string;
  created_at: number;
}

export const MAKE_READY_ACTIVITY_PRESETS = [
  'Make Ready Punch',
  'Trash Out & Initial Walk',
  'Drywall & Patching',
  'Full Paint / Touch-Up Paint',
  'Flooring / Carpet Installation',
  'Carpet / Floor Steam Clean',
  'Plumbing Make-Ready',
  'Electrical & Fixtures',
  'HVAC Service & Filter',
  'Appliance Check / Repair',
  'Countertop / Tub Resurfacing',
  'Deep Make-Ready Cleaning',
  'Final Supervisor Inspection'
] as const;

export interface Unit {
  id: string;
  unit_number: string;
  current_status: TurnoverStage;
  floor_plan: FloorPlan;
  building: string;
  floor: number;
  assigned_technician_id: string;
  assigned_tech?: string;
  assigned_vendor_id?: string;
  assigned_vendor?: string;
  assigned_vendors?: UnitVendorAssignment[];
  schedule_events?: UnitScheduleEvent[];
  move_out_date: string;
  target_ready_date: string;
  last_updated: number;
  notes: string;
  signed_off_by?: string;
  signed_off_at?: number;
  signature_image?: string;
}

export type WorkOrderPriority = 'Low' | 'Medium' | 'High' | 'Emergency';
export type WorkOrderStatus = 'Open' | 'In Progress' | 'Resolved';

export interface WorkOrder {
  id: string;
  unit_id: string;
  unit_number: string;
  trade_category: TradeCategory;
  priority: WorkOrderPriority;
  description: string;
  status: WorkOrderStatus;
  technician_id: string;
  created_by: string;
  created_at: number;
  resolved_at?: number;
  resolution_notes?: string;
  sync_status?: 'synced' | 'pending';
}

export type FieldActionType = 
  | 'task_completed'
  | 'task_uncompleted'
  | 'photo_uploaded'
  | 'note_added'
  | 'work_order_dispatched'
  | 'work_order_resolved'
  | 'stage_changed'
  | 'sign_off'
  | 'conflict_resolved'
  | 'offline_sync'
  | 'unit_deleted'
  | 'clean_slate';

export interface FieldLogEntry {
  id: string;
  unit_id: string;
  unit_number: string;
  timestamp: number;
  author_name: string;
  author_role: 'Field Technician' | 'Maintenance Supervisor';
  trade_category?: TradeCategory;
  action_type: FieldActionType;
  message: string;
  photo_url?: string;
  synced: boolean;
}

export interface SupervisorNotification {
  id: string;
  timestamp: number;
  type: 'checklist_100' | 'work_order_alert' | 'rent_ready' | 'conflict_resolved' | 'stage_advanced';
  title: string;
  message: string;
  unit_id: string;
  unit_number: string;
  trade_category?: TradeCategory;
  read: boolean;
  email_dispatched?: boolean;
}

export interface TechnicianAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  data_url: string;
  uploaded_at: number;
}

export interface TechnicianUser {
  id: string;
  name: string;
  role: 'Field Technician' | 'Maintenance Supervisor';
  trade_specialty: string;
  badge_id: string;
  avatar: string;
  phone: string;
  email?: string;
  notes?: string;
  attachments?: TechnicianAttachment[];
}

export type VendorStatus = 'Active' | 'Preferred' | 'On-Call';

export interface Vendor {
  id: string;
  name: string;
  trade_category: string;
  contact_person: string;
  phone: string;
  email?: string;
  status: VendorStatus;
  notes?: string;
  rating?: number;
  created_at?: number;
}

export const VENDOR_SPECIALTY_PRESETS = [
  'Make Ready Punch',
  'Flooring & Carpets',
  'Painting & Drywall',
  'Deep Cleaning & Make-Ready',
  'HVAC & Climate Control',
  'Plumbing & Water Heaters',
  'Electrical & Fixtures',
  'Appliance Repair & Parts',
  'Countertops & Resurfacing',
  'Trash Out & Junk Removal',
  'Locksmith & Re-keying',
  'Pest Control',
  'General Contractor / Turnkey'
];

export interface SyncQueueItem {
  id: string;
  timestamp: number;
  entity_type: 'task' | 'checklist' | 'unit' | 'work_order' | 'field_log' | 'notifications';
  entity_id: string;
  action: 'create' | 'update' | 'delete';
  payload: any;
  retry_count: number;
}
