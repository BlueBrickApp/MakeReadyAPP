/**
 * Unit Turnover Tracker - Data Models & Types
 */

export type TurnoverStage = 'Inspection' | 'In-Progress' | 'Ready' | 'Rent Ready';

export type TradeCategory = 
  | 'Plumbing'
  | 'Electrical'
  | 'HVAC'
  | 'Painting'
  | 'Flooring'
  | 'Cleaning';

export const TRADE_CATEGORIES: TradeCategory[] = [
  'Plumbing',
  'Electrical',
  'HVAC',
  'Painting',
  'Flooring',
  'Cleaning',
];

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

export interface Unit {
  id: string;
  unit_number: string;
  current_status: TurnoverStage;
  floor_plan: FloorPlan;
  building: string;
  floor: number;
  assigned_technician_id: string;
  assigned_tech?: string;
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
