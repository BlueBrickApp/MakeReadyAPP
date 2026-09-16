/**
 * IndexedDB & Offline-First Sync Service
 * Unit Turnover Tracker
 */

import { 
  Unit, 
  Checklist, 
  Task, 
  WorkOrder, 
  FieldLogEntry, 
  SupervisorNotification, 
  SyncQueueItem, 
  TechnicianUser,
  Vendor,
  TradeCategory,
  TRADE_CATEGORIES,
  TurnoverStage
} from '../types';
import { soundManager } from './audio';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  deleteDoc 
} from 'firebase/firestore';
import { firestoreDb } from './firebase';

function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore);
  }
  if (typeof obj === 'object') {
    const res: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        res[key] = sanitizeForFirestore(val);
      }
    }
    return res;
  }
  return obj;
}

const DB_NAME = 'unit_turnover_tracker_db';
const DB_VERSION = 4;

export const DEFAULT_TECHNICIANS: TechnicianUser[] = [
  {
    id: 'tech-1',
    name: 'Carlos Mendez',
    role: 'Field Technician',
    trade_specialty: 'Plumbing & HVAC Lead',
    badge_id: 'TECH-409',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    phone: '(555) 234-5678'
  },
  {
    id: 'tech-2',
    name: 'Dave Jenkins',
    role: 'Field Technician',
    trade_specialty: 'Electrical & Flooring Specialist',
    badge_id: 'TECH-312',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    phone: '(555) 345-6789'
  },
  {
    id: 'tech-3',
    name: 'Elena Rostova',
    role: 'Field Technician',
    trade_specialty: 'Painting & Punch-out Detail',
    badge_id: 'TECH-518',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    phone: '(555) 456-7890'
  },
  {
    id: 'sup-1',
    name: 'Sarah Vance',
    role: 'Maintenance Supervisor',
    trade_specialty: 'Operations & Quality Sign-Off',
    badge_id: 'SUP-101',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    phone: '(555) 890-1234'
  }
];

export let ACTIVE_TECHNICIANS: TechnicianUser[] = [...DEFAULT_TECHNICIANS];

export const DEFAULT_VENDORS: Vendor[] = [
  {
    id: 'vendor-1',
    name: 'Apex Flooring & Carpets',
    trade_category: 'Flooring & Carpets',
    contact_person: 'Marcus Vance',
    phone: '(555) 782-9011',
    email: 'marcus@apexflooringpro.com',
    status: 'Preferred',
    notes: '24-48h turnaround for turnover LVP and carpet replacement.'
  },
  {
    id: 'vendor-2',
    name: 'ProTouch Paint & Drywall',
    trade_category: 'Painting & Drywall',
    contact_person: 'Sofia Morales',
    phone: '(555) 641-2389',
    email: 'orders@protouchpainting.com',
    status: 'Preferred',
    notes: 'Full unit sprays, drywall patching, baseboard trim.'
  },
  {
    id: 'vendor-3',
    name: 'SparkleClean Make-Ready Services',
    trade_category: 'Deep Cleaning & Make-Ready',
    contact_person: 'Brenda Kelly',
    phone: '(555) 912-4040',
    email: 'dispatch@sparklecleanops.com',
    status: 'Active',
    notes: 'Includes oven, fridge deep-clean and window tracks.'
  },
  {
    id: 'vendor-4',
    name: 'Summit HVAC & Climate Solutions',
    trade_category: 'HVAC & Climate Control',
    contact_person: 'Derek Armstrong',
    phone: '(555) 438-7712',
    email: 'service@summithvacpro.com',
    status: 'Active',
    notes: 'EPA certified. Compressor replacement & Freon recharge.'
  },
  {
    id: 'vendor-5',
    name: 'RapidFlow Plumbing Contractors',
    trade_category: 'Plumbing & Water Heaters',
    contact_person: 'Jason Miller',
    phone: '(555) 823-1190',
    email: 'jason@rapidflowplumbing.net',
    status: 'On-Call',
    notes: 'Water heater emergency changeouts and sewer main snaking.'
  },
  {
    id: 'vendor-6',
    name: 'VoltCraft Electrical Services',
    trade_category: 'Electrical & Fixtures',
    contact_person: 'Elena Chen',
    phone: '(555) 329-8841',
    email: 'info@voltcraftops.com',
    status: 'Active',
    notes: 'Panel upgrades, GFCI recertification and exterior lights.'
  },
  {
    id: 'vendor-7',
    name: 'All-Star Appliance Repair & Parts',
    trade_category: 'Appliance Repair & Parts',
    contact_person: 'Tony Ramos',
    phone: '(555) 519-6032',
    email: 'tony@allstarappliance.com',
    status: 'Preferred',
    notes: 'OEM GE/Whirlpool/Frigidaire parts in stock.'
  }
];

export let ACTIVE_VENDORS: Vendor[] = [...DEFAULT_VENDORS];

// Initial Seed Tasks for 6 Trade Categories with fixed sequence
export const DEFAULT_TRADE_TASKS: Record<TradeCategory, { name: string; description: string }[]> = {
  Plumbing: [
    { name: 'Main Shutoff & PRV Check', description: 'Test main shutoff valve, measure pressure regulator valve (50-70 PSI).' },
    { name: 'Water Heater & Expansion Tank', description: 'Inspect T&P relief valve, verify anode rod, flush sediment, test element.' },
    { name: 'Kitchen Sink & Garbage Disposal', description: 'Check supply lines, test disposal torque and rubber baffle, verify P-trap seal.' },
    { name: 'Bathroom Vanities & Faucets', description: 'Inspect aerators, cartridge stems, drain pop-ups, and silicone perimeter.' },
    { name: 'Toilets Flush & Dye Flapper Test', description: 'Drop food dye in tanks to verify flapper integrity, test flush volume & wax ring.' },
    { name: 'Tub / Shower Valve & Diverter', description: 'Pressure test diverter gate, inspect scald guard setting, caulk tub surround.' }
  ],
  Electrical: [
    { name: 'Breaker Panel & GFCI Mapping', description: 'Torque main lugs, check 15A/20A breakers, trip and reset all kitchen/bath GFCIs.' },
    { name: 'Smoke & CO Detectors Recertification', description: 'Install fresh 10-yr lithium batteries, test audible alarm, verify expiration date.' },
    { name: 'Receptacle Polarity & Tension Check', description: 'Insert 3-prong analyzer on all outlets, verify correct neutral/ground bonding.' },
    { name: 'Light Fixtures, Switches & Ballasts', description: 'Replace any non-LED lamps with 3000K warm white, verify dimmer switch operation.' },
    { name: 'Appliance Electrical Rough-in', description: 'Inspect 240V range receptacle, 30A dryer plug, and dishwasher junction box.' },
    { name: 'Exhaust Fan CFM & Sones Verification', description: 'Test bathroom ventilation draw with paper sheet test, clean fan blower wheel.' }
  ],
  HVAC: [
    { name: 'Air Filter Replacement & Date Stamp', description: 'Insert MERV 11 filter, write turnover date and unit number on frame.' },
    { name: 'Thermostat Calibration & Schedule Reset', description: 'Verify anticipator reading, program default 70°F eco hold mode, check battery.' },
    { name: 'Condensate Drain Line Flush & P-Trap Clean', description: 'Pour 8 oz vinegar solution, verify float switch emergency cutoff operation.' },
    { name: 'Supply & Return Delta-T Temp Split', description: 'Measure return air vs supply plenum temp split (target 18°F to 22°F).' },
    { name: 'Registers, Grilles & Duct Inspection', description: 'Wipe all supply louvers, verify dampers open, inspect flex duct connections.' }
  ],
  Painting: [
    { name: 'Drywall Patching & Texture Match', description: 'Spackle anchor holes, mud wall gouges, texture-blend orange peel or knockdown.' },
    { name: 'Caulking Trim & Baseboards', description: 'Lay paintable acrylic-latex bead along baseboards, door casing, and crown seams.' },
    { name: 'Full Wall Prime & Semi-Gloss Coat', description: 'Cut in corners, roll walls with standard property neutral color (Eggshell/Satin).' },
    { name: 'Doors, Frames & Trim Enamel', description: 'Sand scuffs, apply ultra-white enamel to interior hollow core and slab doors.' },
    { name: 'Ceiling Touch-ups & Corner Feathering', description: 'Address water ring spots or nail pops on acoustic or flat ceiling surfaces.' }
  ],
  Flooring: [
    { name: 'Subfloor Moisture & Squeak Fastening', description: 'Scan subfloor moisture meter, screw down loose joist points to prevent squeaks.' },
    { name: 'LVP / Vinyl Plank Seam & Plank Inspection', description: 'Check end-joint click locks, replace gouged planks, inspect expansion gaps.' },
    { name: 'Carpet Deep Steam Extraction & Pad Check', description: 'Hot-water extract bedroom carpets, inspect tack strip grip and transitions.' },
    { name: 'Base Shoe & Transition Molding Install', description: 'Affix T-moldings between tile and LVP, secure threshold reducers at doorways.' }
  ],
  Cleaning: [
    { name: 'Appliance Deep Scrub & Oven Detail', description: 'Degrease range hood filters, clean oven bake elements, wipe refrigerator gaskets.' },
    { name: 'Cabinet Interiors & Shelving Wipe-down', description: 'Vacuum sawdust/crumbs, wipe melamine shelves, clean exterior cabinet handles.' },
    { name: 'Bathroom Tile, Grout & Mirror Polish', description: 'Descale shower glass, disinfect commodes, streak-free polish on vanity mirrors.' },
    { name: 'Windows, Sills & Blinds Dusting', description: 'Clean vinyl window tracks, wash glass both interior sides, wipe 2-inch faux wood blinds.' },
    { name: 'Hard Floor Microfiber Mopping & Buff', description: 'Neutral pH cleaner mop across all hard surfaces, sanitize thresholds.' },
    { name: 'Final Odor Neutralization & Airing Out', description: 'Place hypoallergenic charcoal odor absorber, set lockbox key for supervisor walk.' }
  ]
};

// Initial Seed Units (4 Project Units with complete Turnover tracking)
export const INITIAL_UNITS: Unit[] = [
  {
    id: 'unit-1789239836266',
    unit_number: '1001',
    building: 'Cedar Ridge - Bldg B',
    floor: 1,
    floor_plan: '1B/1B',
    current_status: 'Inspection',
    assigned_technician_id: 'sup-1',
    assigned_tech: 'Dave Jenkins',
    move_out_date: '2026-09-12',
    target_ready_date: '2026-09-19',
    notes: 'Keys are on the counter. Intake inspection in progress.',
    last_updated: Date.now() - 1000 * 60 * 60 * 2
  },
  {
    id: 'unit-1002',
    unit_number: '1002',
    building: 'Cedar Ridge - Bldg B',
    floor: 1,
    floor_plan: '2B/2B',
    current_status: 'In-Progress',
    assigned_technician_id: 'tech-1',
    assigned_tech: 'Carlos Mendez',
    move_out_date: '2026-09-10',
    target_ready_date: '2026-09-21',
    notes: 'Rough plumbing inspected. Sheetrock repair underway in master hallway.',
    last_updated: Date.now() - 1000 * 60 * 60 * 4
  },
  {
    id: 'unit-1003',
    unit_number: '1003',
    building: 'Cedar Ridge - Bldg B',
    floor: 2,
    floor_plan: '2B/2B',
    current_status: 'Ready',
    assigned_technician_id: 'tech-3',
    assigned_tech: 'Elena Rostova',
    move_out_date: '2026-09-04',
    target_ready_date: '2026-09-16',
    notes: 'All 6 trades completed. Punch list signed off. Ready for manager final walk.',
    last_updated: Date.now() - 1000 * 60 * 60 * 6
  },
  {
    id: 'unit-1004',
    unit_number: '1004',
    building: 'Cedar Ridge - Bldg B',
    floor: 2,
    floor_plan: '3B/2B',
    current_status: 'Rent Ready',
    assigned_technician_id: 'sup-1',
    assigned_tech: 'Dave Jenkins',
    move_out_date: '2026-08-28',
    target_ready_date: '2026-09-14',
    notes: 'Turnover 100% complete. Lockbox installed with ready keys.',
    signed_off_by: 'Dave Jenkins',
    signed_off_at: Date.now() - 1000 * 60 * 60 * 12,
    last_updated: Date.now() - 1000 * 60 * 60 * 24
  }
];

class OfflineDB {
  private db: IDBDatabase | null = null;
  private isOnlineStatus: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private simulateOffline: boolean = false;
  private syncListeners: Set<() => void> = new Set();
  public isCloudConnected: boolean = false;
  private isFirestoreInitialized: boolean = false;
  private firestoreUnsubscribers: (() => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
    }
  }

  public get isConnected(): boolean {
    return this.isOnlineStatus && !this.simulateOffline;
  }

  public get isSimulatedOffline(): boolean {
    return this.simulateOffline;
  }

  public setSimulateOffline(val: boolean) {
    this.simulateOffline = val;
    this.notifyListeners();
    if (!val && this.isOnlineStatus) {
      this.flushSyncQueue();
    }
  }

  private handleNetworkChange(online: boolean) {
    this.isOnlineStatus = online;
    this.notifyListeners();
    if (this.isConnected) {
      this.flushSyncQueue();
    }
  }

  public subscribe(cb: () => void) {
    this.syncListeners.add(cb);
    return () => this.syncListeners.delete(cb);
  }

  private notifyListeners() {
    this.syncListeners.forEach(cb => {
      try { cb(); } catch (e) { console.error(e); }
    });
  }

  // Open IndexedDB
  public async init(): Promise<void> {
    if (typeof window === 'undefined' || !('indexedDB' in window)) return;
    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('units')) db.createObjectStore('units', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('checklists')) db.createObjectStore('checklists', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('work_orders')) db.createObjectStore('work_orders', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('field_logs')) db.createObjectStore('field_logs', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('notifications')) db.createObjectStore('notifications', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('sync_queue')) db.createObjectStore('sync_queue', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('technicians')) db.createObjectStore('technicians', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('vendors')) db.createObjectStore('vendors', { keyPath: 'id' });
        };
        req.onsuccess = async (e) => {
          this.db = (e.target as IDBOpenDBRequest).result;
          await this.purgeTestUnitsAndMaintenance().catch(err => console.warn('Purge note:', err));
          await this.ensureSeedData().catch(err => console.warn('Seed note:', err));
          this.initFirestoreSync();
          resolve();
        };
        req.onerror = async () => {
          console.warn('IndexedDB failed to open, fallback to localStorage');
          this.ensureLocalStorageSeed();
          await this.purgeTestUnitsAndMaintenance().catch(err => console.warn('Purge note:', err));
          await this.ensureSeedData().catch(err => console.warn('Seed note:', err));
          this.initFirestoreSync();
          resolve();
        };
      } catch {
        this.ensureLocalStorageSeed();
        this.ensureSeedData().catch(err => console.warn('Seed note:', err));
        this.initFirestoreSync();
        resolve();
      }
    });
  }

  // Real-time Firestore Synchronizer
  public async pushToFirestore(collectionName: string, docId: string, data: any): Promise<void> {
    if (this.simulateOffline) return;
    try {
      const cleanData = sanitizeForFirestore(data);
      await setDoc(doc(firestoreDb, collectionName, docId), cleanData);
      this.isCloudConnected = true;
    } catch (err) {
      console.warn(`Firestore write to ${collectionName}/${docId} note:`, err);
    }
  }

  public async deleteFromFirestore(collectionName: string, docId: string): Promise<void> {
    if (this.simulateOffline) return;
    try {
      await deleteDoc(doc(firestoreDb, collectionName, docId));
    } catch (err) {
      console.warn(`Firestore delete note:`, err);
    }
  }

  private async initFirestoreSync() {
    if (this.isFirestoreInitialized || typeof window === 'undefined') return;
    this.isFirestoreInitialized = true;

    try {
      // 1. Real-time Units listener
      const unsubUnits = onSnapshot(collection(firestoreDb, 'units'), async (snapshot) => {
        this.isCloudConnected = true;
        if (snapshot.empty && !this.simulateOffline) {
          this.notifyListeners();
          return;
        }
        let hasChanges = false;
        for (const change of snapshot.docChanges()) {
          const unit = change.doc.data() as Unit;
          if (change.type === 'added' || change.type === 'modified') {
            await this.putInStore('units', unit);
            hasChanges = true;
          } else if (change.type === 'removed') {
            const unitId = change.doc.id || (unit && unit.id);
            if (unitId) {
              await this.deleteFromStore('units', unitId);
              hasChanges = true;
            }
          }
        }
        if (hasChanges) this.notifyListeners();
      }, (error) => {
        console.warn('Firestore units sync:', error.message);
      });
      this.firestoreUnsubscribers.push(unsubUnits);

      // 2. Real-time Checklists listener
      const unsubChecklists = onSnapshot(collection(firestoreDb, 'checklists'), async (snapshot) => {
        let hasChanges = false;
        for (const change of snapshot.docChanges()) {
          const chk = change.doc.data() as Checklist;
          if (change.type === 'added' || change.type === 'modified') {
            await this.putInStore('checklists', chk);
            hasChanges = true;
          } else if (change.type === 'removed') {
            const chkId = change.doc.id || (chk && chk.id);
            if (chkId) {
              await this.deleteFromStore('checklists', chkId);
              hasChanges = true;
            }
          }
        }
        if (hasChanges) this.notifyListeners();
      }, (error) => {
        console.warn('Firestore checklists sync:', error.message);
      });
      this.firestoreUnsubscribers.push(unsubChecklists);

      // 3. Real-time Work Orders listener
      const unsubWorkOrders = onSnapshot(collection(firestoreDb, 'work_orders'), async (snapshot) => {
        let hasChanges = false;
        for (const change of snapshot.docChanges()) {
          const wo = change.doc.data() as WorkOrder;
          if (change.type === 'added' || change.type === 'modified') {
            await this.putInStore('work_orders', wo);
            hasChanges = true;
          } else if (change.type === 'removed') {
            const woId = change.doc.id || (wo && wo.id);
            if (woId) {
              await this.deleteFromStore('work_orders', woId);
              hasChanges = true;
            }
          }
        }
        if (hasChanges) this.notifyListeners();
      }, (error) => {
        console.warn('Firestore work_orders sync:', error.message);
      });
      this.firestoreUnsubscribers.push(unsubWorkOrders);

      // 4. Real-time Field Logs listener
      const unsubFieldLogs = onSnapshot(collection(firestoreDb, 'field_logs'), async (snapshot) => {
        let hasChanges = false;
        for (const change of snapshot.docChanges()) {
          const log = change.doc.data() as FieldLogEntry;
          if (change.type === 'added' || change.type === 'modified') {
            await this.putInStore('field_logs', log);
            hasChanges = true;
          }
        }
        if (hasChanges) this.notifyListeners();
      }, (error) => {
        console.warn('Firestore field_logs sync:', error.message);
      });
      this.firestoreUnsubscribers.push(unsubFieldLogs);

      // 5. Real-time Notifications listener
      const unsubNotifs = onSnapshot(collection(firestoreDb, 'notifications'), async (snapshot) => {
        let hasChanges = false;
        for (const change of snapshot.docChanges()) {
          const notif = change.doc.data() as SupervisorNotification;
          if (change.type === 'added' || change.type === 'modified') {
            await this.putInStore('notifications', notif);
            hasChanges = true;
          }
        }
        if (hasChanges) this.notifyListeners();
      }, (error) => {
        console.warn('Firestore notifications sync:', error.message);
      });
      this.firestoreUnsubscribers.push(unsubNotifs);

      // 6. Real-time Technicians / Maintenance Employees listener
      const unsubTechs = onSnapshot(collection(firestoreDb, 'technicians'), async (snapshot) => {
        if (snapshot.empty && !this.simulateOffline) {
          return;
        }

        // Handle deletions from Firestore across all devices
        for (const change of snapshot.docChanges()) {
          if (change.type === 'removed') {
            await this.deleteFromStore('technicians', change.doc.id);
          }
        }

        const list: TechnicianUser[] = [];
        for (const docSnap of snapshot.docs) {
          list.push(docSnap.data() as TechnicianUser);
        }
        if (list.length > 0) {
          ACTIVE_TECHNICIANS = list;
          localStorage.setItem('utt_technicians', JSON.stringify(list));
          
          // Reconcile IndexedDB store: delete any technician that is no longer in Firestore
          const allStored = await this.getAllFromStore<TechnicianUser>('technicians');
          for (const s of allStored) {
            if (!list.some(l => l.id === s.id)) {
              await this.deleteFromStore('technicians', s.id);
            }
          }

          for (const t of list) {
            await this.putInStore('technicians', t);
          }
          this.notifyListeners();
        }
      }, (error) => {
        console.warn('Firestore technicians sync:', error.message);
      });
      this.firestoreUnsubscribers.push(unsubTechs);

      // 7. Real-time Vendors & Contractors listener
      const unsubVendors = onSnapshot(collection(firestoreDb, 'vendors'), async (snapshot) => {
        if (snapshot.empty && !this.simulateOffline) {
          // If Firestore vendors is empty, seed defaults
          for (const v of DEFAULT_VENDORS) {
            await this.putInStore('vendors', v);
            await this.pushToFirestore('vendors', v.id, v);
          }
          ACTIVE_VENDORS = [...DEFAULT_VENDORS];
          localStorage.setItem('utt_vendors', JSON.stringify(DEFAULT_VENDORS));
          this.notifyListeners();
          return;
        }

        // Handle deletions from Firestore across all devices
        for (const change of snapshot.docChanges()) {
          if (change.type === 'removed') {
            await this.deleteFromStore('vendors', change.doc.id);
          }
        }

        const list: Vendor[] = [];
        for (const docSnap of snapshot.docs) {
          list.push(docSnap.data() as Vendor);
        }
        if (list.length > 0) {
          ACTIVE_VENDORS = list;
          localStorage.setItem('utt_vendors', JSON.stringify(list));
          
          // Reconcile IndexedDB store: delete any vendor that is no longer in Firestore
          const allStored = await this.getAllFromStore<Vendor>('vendors');
          for (const s of allStored) {
            if (!list.some(l => l.id === s.id)) {
              await this.deleteFromStore('vendors', s.id);
            }
          }

          for (const v of list) {
            await this.putInStore('vendors', v);
          }
          this.notifyListeners();
        }
      }, (error) => {
        console.warn('Firestore vendors sync:', error.message);
      });
      this.firestoreUnsubscribers.push(unsubVendors);

    } catch (err) {
      console.warn('initFirestoreSync warning:', err);
    }
  }

  private async seedCloudDatabase() {
    try {
      const units = await this.getUnits();
      const actualUnits = units.length > 0 ? units : INITIAL_UNITS;
      for (const u of actualUnits) {
        await this.pushToFirestore('units', u.id, u);
      }
      const checklists = await this.getAllFromStore<Checklist>('checklists');
      for (const c of checklists) {
        await this.pushToFirestore('checklists', c.id, c);
      }
      const workOrders = await this.getAllFromStore<WorkOrder>('work_orders');
      for (const w of workOrders) {
        await this.pushToFirestore('work_orders', w.id, w);
      }
      const fieldLogs = await this.getAllFromStore<FieldLogEntry>('field_logs');
      for (const l of fieldLogs) {
        await this.pushToFirestore('field_logs', l.id, l);
      }
      const notifs = await this.getAllFromStore<SupervisorNotification>('notifications');
      for (const n of notifs) {
        await this.pushToFirestore('notifications', n.id, n);
      }
      this.isCloudConnected = true;
      this.notifyListeners();
    } catch (e) {
      console.warn('Seeding cloud error:', e);
    }
  }

  // Fallback / Helpers for IndexedDB and LocalStorage
  private getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): IDBObjectStore | null {
    if (!this.db) return null;
    try {
      const tx = this.db.transaction(storeName, mode);
      return tx.objectStore(storeName);
    } catch {
      return null;
    }
  }

  private async getAllFromStore<T>(storeName: string): Promise<T[]> {
    const store = this.getStore(storeName);
    if (!store) {
      const data = localStorage.getItem(`utt_${storeName}`);
      return data ? JSON.parse(data) : [];
    }
    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => {
        const data = localStorage.getItem(`utt_${storeName}`);
        resolve(data ? JSON.parse(data) : []);
      };
    });
  }

  private async putInStore<T extends { id: string }>(storeName: string, item: T): Promise<void> {
    const store = this.getStore(storeName, 'readwrite');
    if (!store) {
      const items = await this.getAllFromStore<T>(storeName);
      const idx = items.findIndex(i => i.id === item.id);
      if (idx >= 0) items[idx] = item;
      else items.unshift(item);
      localStorage.setItem(`utt_${storeName}`, JSON.stringify(items));
      return;
    }
    return new Promise((resolve) => {
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  }

  private async deleteFromStore(storeName: string, id: string): Promise<void> {
    try {
      const raw = localStorage.getItem(`utt_${storeName}`);
      if (raw) {
        const items = JSON.parse(raw);
        if (Array.isArray(items)) {
          localStorage.setItem(`utt_${storeName}`, JSON.stringify(items.filter((i: any) => i.id !== id)));
        }
      }
    } catch {}

    const store = this.getStore(storeName, 'readwrite');
    if (!store) {
      return;
    }
    return new Promise((resolve) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  }

  private ensureLocalStorageSeed() {
    if (localStorage.getItem('utt_cleared_by_user') === 'true') {
      return;
    }
    const currentUnitsRaw = localStorage.getItem('utt_units');
    if (!currentUnitsRaw || currentUnitsRaw === '[]') {
      localStorage.setItem('utt_units', JSON.stringify(INITIAL_UNITS));
      const { checklists, workOrders, fieldLogs, notifications } = this.generateInitialData();
      localStorage.setItem('utt_checklists', JSON.stringify(checklists));
      localStorage.setItem('utt_work_orders', JSON.stringify(workOrders));
      localStorage.setItem('utt_field_logs', JSON.stringify(fieldLogs));
      localStorage.setItem('utt_notifications', JSON.stringify(notifications));
      localStorage.setItem('utt_sync_queue', JSON.stringify([]));
    }
  }

  private async ensureSeedData() {
    if (localStorage.getItem('utt_cleared_by_user') === 'true') {
      return;
    }
    const existing = await this.getAllFromStore<Unit>('units');
    // Ensure all 4 project units exist
    for (const u of INITIAL_UNITS) {
      const found = existing.find(e => e.id === u.id || e.unit_number === u.unit_number);
      if (!found) {
        await this.putInStore('units', u);
        this.pushToFirestore('units', u.id, u);
      }
    }

    const { checklists, workOrders, fieldLogs, notifications } = this.generateInitialData();
    const existingChecklists = await this.getAllFromStore<Checklist>('checklists');
    for (const c of checklists) {
      const found = existingChecklists.find(ec => ec.id === c.id);
      if (!found) {
        await this.putInStore('checklists', c);
        this.pushToFirestore('checklists', c.id, c);
      }
    }

    const existingWOs = await this.getAllFromStore<WorkOrder>('work_orders');
    for (const w of workOrders) {
      const found = existingWOs.find(ew => ew.id === w.id);
      if (!found) {
        await this.putInStore('work_orders', w);
        this.pushToFirestore('work_orders', w.id, w);
      }
    }

    const existingLogs = await this.getAllFromStore<FieldLogEntry>('field_logs');
    if (existingLogs.length === 0) {
      for (const l of fieldLogs) {
        await this.putInStore('field_logs', l);
        this.pushToFirestore('field_logs', l.id, l);
      }
    }

    const existingNotifs = await this.getAllFromStore<SupervisorNotification>('notifications');
    if (existingNotifs.length === 0) {
      for (const n of notifications) {
        await this.putInStore('notifications', n);
        this.pushToFirestore('notifications', n.id, n);
      }
    }
  }

  private generateInitialData() {
    const checklists: Checklist[] = [];
    const workOrders: WorkOrder[] = [];
    const fieldLogs: FieldLogEntry[] = [];
    const notifications: SupervisorNotification[] = [];

    // Realistic inspection photos
    const samplePhotos = [
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=400&auto=format&fit=crop&q=80'
    ];

    for (const unit of INITIAL_UNITS) {
      for (const trade of TRADE_CATEGORIES) {
        const defaultTasks = DEFAULT_TRADE_TASKS[trade];
        const checklistId = `chk-${unit.id}-${trade.toLowerCase()}`;

        // Determine initial completion based on unit status
        let completedCount = 0;
        if (unit.current_status === 'Ready' || unit.current_status === 'Rent Ready') {
          completedCount = defaultTasks.length; // 100%
        } else if (unit.current_status === 'In-Progress') {
          if (trade === 'Plumbing' || trade === 'Electrical') {
            completedCount = defaultTasks.length; // 100%
          } else if (trade === 'HVAC') {
            completedCount = Math.floor(defaultTasks.length * 0.7);
          } else if (trade === 'Painting') {
            completedCount = 2;
          } else if (trade === 'Flooring') {
            completedCount = 1;
          } else {
            completedCount = 0;
          }
        } else {
          // Inspection
          completedCount = trade === 'Plumbing' ? 1 : trade === 'Electrical' ? 1 : 0;
        }

        const taskList: Task[] = defaultTasks.map((t, idx) => {
          const isDone = idx < completedCount;
          const hasPhoto = isDone && idx % 2 === 0;
          const taskObj: Task = {
            id: `tsk-${checklistId}-${idx + 1}`,
            checklist_id: checklistId,
            sequence_order: idx + 1,
            name: t.name,
            description: t.description,
            is_completed: isDone,
            notes: isDone ? `Inspected and verified to code specification.` : '',
            assigned_to: unit.assigned_technician_id,
            version: 1,
            sync_status: 'synced'
          };
          if (hasPhoto) {
            taskObj.photo_url = samplePhotos[idx % samplePhotos.length];
          }
          if (isDone) {
            taskObj.completed_at = Date.now() - 1000 * 60 * (idx + 1) * 35;
            taskObj.completed_by = unit.assigned_tech || 'Carlos Mendez';
          }
          return taskObj;
        });

        const pct = Math.round((completedCount / defaultTasks.length) * 100);
        const status = pct === 100 ? 'completed' : pct > 0 ? 'in_progress' : 'pending';

        checklists.push({
          id: checklistId,
          unit_id: unit.id,
          trade_category: trade,
          task_list: taskList,
          completion_percentage: pct,
          status,
          assigned_technician_id: unit.assigned_technician_id,
          last_updated: Date.now() - 1000 * 60 * 30,
          last_updated_by: unit.assigned_tech || 'Dave Jenkins',
          version: 1
        });
      }
    }

    // Seed sample work orders for the 4 units
    workOrders.push(
      {
        id: 'wo-1001-1',
        unit_id: 'unit-1789239836266',
        unit_number: '1001',
        trade_category: 'Plumbing',
        priority: 'High',
        description: 'Angle stop valve leaking under master bath vanity. Replaced 1/2 in compression shutoff.',
        status: 'Resolved',
        technician_id: 'tech-1',
        created_by: 'Dave Jenkins',
        created_at: Date.now() - 1000 * 60 * 60 * 18,
        resolved_at: Date.now() - 1000 * 60 * 60 * 2,
        resolution_notes: 'Installed BrassCraft 1/4-turn ball valve. Pressure tested to 65 PSI.',
        sync_status: 'synced'
      },
      {
        id: 'wo-1002-1',
        unit_id: 'unit-1002',
        unit_number: '1002',
        trade_category: 'Painting',
        priority: 'Medium',
        description: 'Previous tenant mounted 75in TV bracket. Requires heavy spackle and texture blend.',
        status: 'In Progress',
        technician_id: 'tech-3',
        created_by: 'Carlos Mendez',
        created_at: Date.now() - 1000 * 60 * 120,
        sync_status: 'synced'
      },
      {
        id: 'wo-1002-2',
        unit_id: 'unit-1002',
        unit_number: '1002',
        trade_category: 'HVAC',
        priority: 'Emergency',
        description: 'Condensate overflow float switch tripped. Line backed up with algae slime.',
        status: 'Open',
        technician_id: 'tech-1',
        created_by: 'Carlos Mendez',
        created_at: Date.now() - 1000 * 60 * 50,
        sync_status: 'synced'
      },
      {
        id: 'wo-1003-1',
        unit_id: 'unit-1003',
        unit_number: '1003',
        trade_category: 'Electrical',
        priority: 'Medium',
        description: 'GFCI in master bath did not trip on circuit test. Replaced with tamper-resistant 15A GFCI.',
        status: 'Resolved',
        technician_id: 'tech-2',
        created_by: 'Elena Rostova',
        created_at: Date.now() - 1000 * 60 * 60 * 24,
        resolved_at: Date.now() - 1000 * 60 * 60 * 8,
        resolution_notes: 'Installed new GFCI receptacle, verified trip threshold and downstream protection.',
        sync_status: 'synced'
      },
      {
        id: 'wo-1004-1',
        unit_id: 'unit-1004',
        unit_number: '1004',
        trade_category: 'Cleaning',
        priority: 'Low',
        description: 'Final balcony power wash and patio sliding glass track cleaning.',
        status: 'Resolved',
        technician_id: 'tech-3',
        created_by: 'Dave Jenkins',
        created_at: Date.now() - 1000 * 60 * 60 * 36,
        resolved_at: Date.now() - 1000 * 60 * 60 * 14,
        resolution_notes: 'Patio deep cleaned, track debris vacuumed, door glides smoothly.',
        sync_status: 'synced'
      }
    );

    // Initial Field Activity Logs
    fieldLogs.push(
      {
        id: 'log-1001-1',
        unit_id: 'unit-1789239836266',
        unit_number: '1001',
        timestamp: Date.now() - 1000 * 60 * 90,
        author_name: 'Dave Jenkins',
        author_role: 'Maintenance Supervisor',
        action_type: 'stage_changed',
        message: 'Intake inspection began. Unit condition documented.',
        synced: true
      },
      {
        id: 'log-1002-1',
        unit_id: 'unit-1002',
        unit_number: '1002',
        timestamp: Date.now() - 1000 * 60 * 45,
        author_name: 'Carlos Mendez',
        author_role: 'Field Technician',
        trade_category: 'Plumbing',
        action_type: 'task_completed',
        message: 'Tub/Shower scald guard tested at 118°F maximum setting. Perimeter sealed with 100% silicone.',
        photo_url: samplePhotos[1],
        synced: true
      },
      {
        id: 'log-1003-1',
        unit_id: 'unit-1003',
        unit_number: '1003',
        timestamp: Date.now() - 1000 * 60 * 18,
        author_name: 'Elena Rostova',
        author_role: 'Field Technician',
        trade_category: 'Cleaning',
        action_type: 'stage_changed',
        message: 'All 6 trade categories verified at 100%. Advanced unit to Ready stage.',
        synced: true
      },
      {
        id: 'log-1004-1',
        unit_id: 'unit-1004',
        unit_number: '1004',
        timestamp: Date.now() - 1000 * 60 * 60 * 12,
        author_name: 'Dave Jenkins',
        author_role: 'Maintenance Supervisor',
        action_type: 'sign_off',
        message: 'Final supervisor walk completed. Certified Rent Ready for immediate occupancy.',
        synced: true
      }
    );

    // Seed supervisor notifications
    notifications.push(
      {
        id: 'notif-1002-1',
        timestamp: Date.now() - 1000 * 60 * 48,
        type: 'work_order_alert',
        title: 'Emergency Work Order Dispatched',
        message: 'Unit 1002: HVAC condensate float switch tripped. Tech Carlos Mendez dispatched.',
        unit_id: 'unit-1002',
        unit_number: '1002',
        trade_category: 'HVAC',
        read: false,
        email_dispatched: true
      },
      {
        id: 'notif-1003-1',
        timestamp: Date.now() - 1000 * 60 * 16,
        type: 'checklist_100',
        title: 'Cleaning 100% Complete',
        message: 'Unit 1003 Cleaning trade checklist completed by Elena Rostova. Unit is ready for final sign-off walk.',
        unit_id: 'unit-1003',
        unit_number: '1003',
        trade_category: 'Cleaning',
        read: false,
        email_dispatched: true
      }
    );

    return { checklists, workOrders, fieldLogs, notifications };
  }

  // Public Query Methods
  public async getUnits(): Promise<Unit[]> {
    return this.getAllFromStore<Unit>('units');
  }

  public async getUnitById(id: string): Promise<Unit | undefined> {
    const units = await this.getUnits();
    return units.find(u => u.id === id);
  }

  public async getChecklistsForUnit(unitId: string): Promise<Checklist[]> {
    const all = await this.getAllFromStore<Checklist>('checklists');
    const existing = all.filter(c => c.unit_id === unitId);
    if (existing.length > 0) {
      return existing;
    }

    // Auto-generate fresh checklists for all 6 trades if missing
    const unit = await this.getUnitById(unitId);
    if (unit) {
      const generated: Checklist[] = [];
      for (const trade of TRADE_CATEGORIES) {
        const defaultTasks = DEFAULT_TRADE_TASKS[trade];
        const chkId = `chk-${unit.id}-${trade.toLowerCase()}`;
        const taskList: Task[] = defaultTasks.map((t, idx) => ({
          id: `tsk-${chkId}-${idx + 1}`,
          checklist_id: chkId,
          sequence_order: idx + 1,
          name: t.name,
          description: t.description,
          is_completed: false,
          notes: '',
          assigned_to: unit.assigned_technician_id || 'sup-1',
          version: 1,
          sync_status: 'synced'
        }));

        const newChecklist: Checklist = {
          id: chkId,
          unit_id: unit.id,
          trade_category: trade,
          task_list: taskList,
          completion_percentage: 0,
          status: 'pending',
          assigned_technician_id: unit.assigned_technician_id || 'sup-1',
          last_updated: Date.now(),
          last_updated_by: 'System',
          version: 1
        };
        await this.putInStore('checklists', newChecklist);
        this.pushToFirestore('checklists', newChecklist.id, newChecklist).catch(() => {});
        generated.push(newChecklist);
      }
      return generated;
    }

    return [];
  }

  public async getChecklistById(id: string): Promise<Checklist | undefined> {
    const all = await this.getAllFromStore<Checklist>('checklists');
    return all.find(c => c.id === id);
  }

  public async getWorkOrders(unitId?: string): Promise<WorkOrder[]> {
    const all = await this.getAllFromStore<WorkOrder>('work_orders');
    if (unitId) {
      return all.filter(w => w.unit_id === unitId);
    }
    return all.sort((a, b) => b.created_at - a.created_at);
  }

  public async getFieldLogs(unitId?: string): Promise<FieldLogEntry[]> {
    const all = await this.getAllFromStore<FieldLogEntry>('field_logs');
    const filtered = unitId ? all.filter(l => l.unit_id === unitId) : all;
    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  public async getNotifications(): Promise<SupervisorNotification[]> {
    const all = await this.getAllFromStore<SupervisorNotification>('notifications');
    return all.sort((a, b) => b.timestamp - a.timestamp);
  }

  public async getSyncQueue(): Promise<SyncQueueItem[]> {
    return this.getAllFromStore<SyncQueueItem>('sync_queue');
  }

  // Mutation with Offline Support & Sync Queue
  public async updateTask(
    checklistId: string, 
    taskId: string, 
    updates: Partial<Task>, 
    author: TechnicianUser,
    unitNumber: string
  ): Promise<{ checklist: Checklist; conflictDetected?: boolean }> {
    const checklist = await this.getChecklistById(checklistId);
    if (!checklist) throw new Error('Checklist not found');

    const taskIndex = checklist.task_list.findIndex(t => t.id === taskId);
    if (taskIndex === -1) throw new Error('Task not found');

    const existingTask = checklist.task_list[taskIndex];
    const prevCompleted = existingTask.is_completed;
    const isNowCompleted = updates.is_completed ?? existingTask.is_completed;

    // Optimistic merge
    const isOnline = this.isConnected;
    const updatedTask: Task = {
      ...existingTask,
      ...updates,
      version: existingTask.version + 1,
      sync_status: isOnline ? 'synced' : 'pending',
      completed_at: isNowCompleted ? (existingTask.completed_at || Date.now()) : undefined,
      completed_by: isNowCompleted ? (existingTask.completed_by || author.name) : undefined
    };

    const newTaskList = [...checklist.task_list];
    newTaskList[taskIndex] = updatedTask;

    const completedCount = newTaskList.filter(t => t.is_completed).length;
    const pct = Math.round((completedCount / newTaskList.length) * 100);
    const newStatus = pct === 100 ? 'completed' : pct > 0 ? 'in_progress' : 'pending';

    const updatedChecklist: Checklist = {
      ...checklist,
      task_list: newTaskList,
      completion_percentage: pct,
      status: newStatus,
      last_updated: Date.now(),
      last_updated_by: author.name,
      version: checklist.version + 1
    };

    // Save locally
    await this.putInStore('checklists', updatedChecklist);
    this.pushToFirestore('checklists', updatedChecklist.id, updatedChecklist);

    // If completed just now and sound is enabled
    if (!prevCompleted && isNowCompleted) {
      soundManager.playTaskCheck();
    } else if (updates.photo_url && updates.photo_url !== existingTask.photo_url) {
      soundManager.playCameraShutter();
    }

    // Add field log entry
    let actionType: any = 'note_added';
    let message = `Updated task "${existingTask.name}"`;
    if (!prevCompleted && isNowCompleted) {
      actionType = 'task_completed';
      message = `Completed: ${existingTask.name}`;
      if (updatedTask.notes) message += ` - Notes: "${updatedTask.notes}"`;
    } else if (prevCompleted && !isNowCompleted) {
      actionType = 'task_uncompleted';
      message = `Unmarked task: ${existingTask.name}`;
    } else if (updates.photo_url) {
      actionType = 'photo_uploaded';
      message = `Attached verification photo for ${existingTask.name}`;
    }

    const logEntry: FieldLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      unit_id: checklist.unit_id,
      unit_number: unitNumber,
      timestamp: Date.now(),
      author_name: author.name,
      author_role: author.role,
      trade_category: checklist.trade_category,
      action_type: actionType,
      message,
      photo_url: updates.photo_url || (isNowCompleted ? updatedTask.photo_url : undefined),
      synced: isOnline
    };
    await this.putInStore('field_logs', logEntry);
    this.pushToFirestore('field_logs', logEntry.id, logEntry);

    // Check if 100% completion triggered
    if (checklist.completion_percentage < 100 && pct === 100) {
      await this.triggerTradeCompletionAlert(checklist, unitNumber, author);
    }

    // Update Unit's last_updated and check if all trades ready
    await this.reevaluateUnitStatus(checklist.unit_id);

    // If offline, queue for sync
    if (!isOnline) {
      await this.enqueueSync('checklist', updatedChecklist.id, 'update', updatedChecklist);
      await this.enqueueSync('field_log', logEntry.id, 'create', logEntry);
    }

    this.notifyListeners();
    return { checklist: updatedChecklist };
  }

  // Trigger automated supervisor notification & simulated email
  private async triggerTradeCompletionAlert(checklist: Checklist, unitNumber: string, author: TechnicianUser) {
    soundManager.playNotification();
    const notif: SupervisorNotification = {
      id: `notif-${Date.now()}`,
      timestamp: Date.now(),
      type: 'checklist_100',
      title: `${checklist.trade_category} 100% Completed`,
      message: `Unit ${unitNumber}: All punch-list items for ${checklist.trade_category} have been completed by ${author.name}. Dispatched automated supervisor alert.`,
      unit_id: checklist.unit_id,
      unit_number: unitNumber,
      trade_category: checklist.trade_category,
      read: false,
      email_dispatched: true
    };
    await this.putInStore('notifications', notif);
    this.pushToFirestore('notifications', notif.id, notif);
  }

  // Automatically check if all 6 checklists are 100% and suggest or advance to 'Ready'
  public async reevaluateUnitStatus(unitId: string): Promise<TurnoverStage> {
    const unit = await this.getUnitById(unitId);
    if (!unit || unit.current_status === 'Rent Ready') return unit?.current_status || 'In-Progress';

    const checklists = await this.getChecklistsForUnit(unitId);
    const allTrades100 = checklists.length === 6 && checklists.every(c => c.completion_percentage === 100);
    const anyStarted = checklists.some(c => c.completion_percentage > 0);

    let newStatus = unit.current_status;
    if (allTrades100) {
      newStatus = 'Ready';
    } else if (anyStarted && unit.current_status === 'Inspection') {
      newStatus = 'In-Progress';
    }

    if (newStatus !== unit.current_status || unit.last_updated < Date.now() - 5000) {
      const updatedUnit: Unit = {
        ...unit,
        current_status: newStatus,
        last_updated: Date.now()
      };
      await this.putInStore('units', updatedUnit);
      this.pushToFirestore('units', updatedUnit.id, updatedUnit);
      return newStatus;
    }
    return unit.current_status;
  }

  // Move Unit stage (e.g. from Kanban drag or supervisor action)
  public async updateUnitStage(unitId: string, newStage: TurnoverStage, author: TechnicianUser): Promise<Unit> {
    const unit = await this.getUnitById(unitId);
    if (!unit) throw new Error('Unit not found');

    const updatedUnit: Unit = {
      ...unit,
      current_status: newStage,
      last_updated: Date.now()
    };
    await this.putInStore('units', updatedUnit);
    this.pushToFirestore('units', updatedUnit.id, updatedUnit);

    const logEntry: FieldLogEntry = {
      id: `log-${Date.now()}`,
      unit_id: unit.id,
      unit_number: unit.unit_number,
      timestamp: Date.now(),
      author_name: author.name,
      author_role: author.role,
      action_type: 'stage_changed',
      message: `Advanced unit turnover stage to "${newStage}"`,
      synced: this.isConnected
    };
    await this.putInStore('field_logs', logEntry);
    this.pushToFirestore('field_logs', logEntry.id, logEntry);

    if (!this.isConnected) {
      await this.enqueueSync('unit', unit.id, 'update', updatedUnit);
      await this.enqueueSync('field_log', logEntry.id, 'create', logEntry);
    }

    this.notifyListeners();
    return updatedUnit;
  }

  // Supervisor Final Sign-Off (to Rent Ready)
  public async signOffRentReady(
    unitId: string, 
    supervisor: TechnicianUser, 
    signatureDataUrl: string, 
    notes: string
  ): Promise<Unit> {
    const unit = await this.getUnitById(unitId);
    if (!unit) throw new Error('Unit not found');

    const updatedUnit: Unit = {
      ...unit,
      current_status: 'Rent Ready',
      signed_off_by: supervisor.name,
      signed_off_at: Date.now(),
      signature_image: signatureDataUrl,
      notes: notes ? `${unit.notes}\n[Supervisor Sign-Off]: ${notes}` : unit.notes,
      last_updated: Date.now()
    };
    await this.putInStore('units', updatedUnit);
    this.pushToFirestore('units', updatedUnit.id, updatedUnit);

    const logEntry: FieldLogEntry = {
      id: `log-${Date.now()}`,
      unit_id: unit.id,
      unit_number: unit.unit_number,
      timestamp: Date.now(),
      author_name: supervisor.name,
      author_role: 'Maintenance Supervisor',
      action_type: 'sign_off',
      message: `Official Rent Ready Verification Sign-Off completed by ${supervisor.name} (${supervisor.badge_id}). Keyed and released for leasing.`,
      photo_url: signatureDataUrl,
      synced: this.isConnected
    };
    await this.putInStore('field_logs', logEntry);
    this.pushToFirestore('field_logs', logEntry.id, logEntry);

    const notif: SupervisorNotification = {
      id: `notif-${Date.now()}`,
      timestamp: Date.now(),
      type: 'rent_ready',
      title: `Unit ${unit.unit_number} Certified Rent Ready`,
      message: `Final verification certificate recorded by ${supervisor.name}. Unit released to property leasing office.`,
      unit_id: unit.id,
      unit_number: unit.unit_number,
      read: false,
      email_dispatched: true
    };
    await this.putInStore('notifications', notif);
    this.pushToFirestore('notifications', notif.id, notif);

    if (!this.isConnected) {
      await this.enqueueSync('unit', unit.id, 'update', updatedUnit);
      await this.enqueueSync('field_log', logEntry.id, 'create', logEntry);
      await this.enqueueSync('notifications', notif.id, 'create', notif);
    }

    soundManager.playSyncSuccess();
    this.notifyListeners();
    return updatedUnit;
  }

  // Create Work Order
  public async createWorkOrder(order: Omit<WorkOrder, 'id' | 'created_at' | 'sync_status'>, author: TechnicianUser): Promise<WorkOrder> {
    const isOnline = this.isConnected;
    const newOrder: WorkOrder = {
      ...order,
      id: `wo-${Date.now()}`,
      created_at: Date.now(),
      sync_status: isOnline ? 'synced' : 'pending'
    };
    await this.putInStore('work_orders', newOrder);
    this.pushToFirestore('work_orders', newOrder.id, newOrder);

    const logEntry: FieldLogEntry = {
      id: `log-${Date.now()}`,
      unit_id: newOrder.unit_id,
      unit_number: newOrder.unit_number,
      timestamp: Date.now(),
      author_name: author.name,
      author_role: author.role,
      trade_category: newOrder.trade_category,
      action_type: 'work_order_dispatched',
      message: `Dispatched ${newOrder.priority} priority Work Order: "${newOrder.description}"`,
      synced: isOnline
    };
    await this.putInStore('field_logs', logEntry);
    this.pushToFirestore('field_logs', logEntry.id, logEntry);

    if (newOrder.priority === 'Emergency' || newOrder.priority === 'High') {
      const notif: SupervisorNotification = {
        id: `notif-${Date.now()}`,
        timestamp: Date.now(),
        type: 'work_order_alert',
        title: `${newOrder.priority} Work Order: Unit ${newOrder.unit_number}`,
        message: `${newOrder.trade_category} order created by ${author.name}: ${newOrder.description}`,
        unit_id: newOrder.unit_id,
        unit_number: newOrder.unit_number,
        trade_category: newOrder.trade_category,
        read: false,
        email_dispatched: true
      };
      await this.putInStore('notifications', notif);
      this.pushToFirestore('notifications', notif.id, notif);
    }

    if (!isOnline) {
      await this.enqueueSync('work_order', newOrder.id, 'create', newOrder);
      await this.enqueueSync('field_log', logEntry.id, 'create', logEntry);
    }

    this.notifyListeners();
    return newOrder;
  }

  // Update Work Order Status
  public async updateWorkOrderStatus(id: string, status: WorkOrder['status'], notes?: string): Promise<void> {
    const orders = await this.getWorkOrders();
    const order = orders.find(o => o.id === id);
    if (!order) return;

    const updated: WorkOrder = {
      ...order,
      status,
      resolution_notes: notes || order.resolution_notes,
      resolved_at: status === 'Resolved' ? Date.now() : undefined,
      sync_status: this.isConnected ? 'synced' : 'pending'
    };
    await this.putInStore('work_orders', updated);
    this.pushToFirestore('work_orders', updated.id, updated);

    if (!this.isConnected) {
      await this.enqueueSync('work_order', updated.id, 'update', updated);
    }
    this.notifyListeners();
  }

  // Create New Unit for Turnover (Authorized via Supervisor Credentials)
  public async createUnit(unitData: Omit<Unit, 'id' | 'last_updated'>, author?: TechnicianUser): Promise<Unit> {
    const allTechs = await this.getTechnicians();
    const assignedTechObj = allTechs.find(t => t.id === unitData.assigned_technician_id);

    const newUnit: Unit = {
      ...unitData,
      assigned_tech: unitData.assigned_tech || assignedTechObj?.name || (author ? author.name : 'Supervisor'),
      id: `unit-${Date.now()}`,
      last_updated: Date.now()
    };
    await this.putInStore('units', newUnit);
    await this.pushToFirestore('units', newUnit.id, newUnit);

    // Generate fresh checklists for all 6 trades
    for (const trade of TRADE_CATEGORIES) {
      const defaultTasks = DEFAULT_TRADE_TASKS[trade];
      const chkId = `chk-${newUnit.id}-${trade.toLowerCase()}`;
      const taskList: Task[] = defaultTasks.map((t, idx) => ({
        id: `tsk-${chkId}-${idx + 1}`,
        checklist_id: chkId,
        sequence_order: idx + 1,
        name: t.name,
        description: t.description,
        is_completed: false,
        notes: '',
        assigned_to: newUnit.assigned_technician_id,
        version: 1,
        sync_status: 'synced'
      }));

      const newChecklist: Checklist = {
        id: chkId,
        unit_id: newUnit.id,
        trade_category: trade,
        task_list: taskList,
        completion_percentage: 0,
        status: 'pending',
        assigned_technician_id: newUnit.assigned_technician_id,
        last_updated: Date.now(),
        last_updated_by: author.name,
        version: 1
      };
      await this.putInStore('checklists', newChecklist);
      await this.pushToFirestore('checklists', newChecklist.id, newChecklist);
    }

    const logEntry: FieldLogEntry = {
      id: `log-${Date.now()}`,
      unit_id: newUnit.id,
      unit_number: newUnit.unit_number,
      timestamp: Date.now(),
      author_name: author.name,
      author_role: author.role,
      action_type: 'stage_changed',
      message: `Initiated unit turnover intake. Target move-in readiness: ${newUnit.target_ready_date}`,
      synced: this.isConnected
    };
    await this.putInStore('field_logs', logEntry);
    await this.pushToFirestore('field_logs', logEntry.id, logEntry);

    if (!this.isConnected) {
      await this.enqueueSync('unit', newUnit.id, 'create', newUnit);
      await this.enqueueSync('field_log', logEntry.id, 'create', logEntry);
    }

    this.notifyListeners();
    return newUnit;
  }

  // Mark notification read
  public async markNotificationRead(id: string) {
    const notifs = await this.getNotifications();
    const notif = notifs.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      await this.putInStore('notifications', notif);
      this.pushToFirestore('notifications', notif.id, notif);
      this.notifyListeners();
    }
  }

  public async markAllNotificationsRead() {
    const notifs = await this.getNotifications();
    for (const n of notifs) {
      n.read = true;
      await this.putInStore('notifications', n);
      this.pushToFirestore('notifications', n.id, n);
    }
    this.notifyListeners();
  }

  // Queue sync item when offline
  private async enqueueSync(
    entityType: SyncQueueItem['entity_type'],
    entityId: string,
    action: SyncQueueItem['action'],
    payload: any
  ) {
    const item: SyncQueueItem = {
      id: `sq-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      entity_type: entityType,
      entity_id: entityId,
      action,
      payload,
      retry_count: 0
    };
    await this.putInStore('sync_queue', item);
  }

  // Flush Sync Queue to Cloud
  public async flushSyncQueue(): Promise<{ syncedCount: number; conflicts: number }> {
    const queue = await this.getSyncQueue();
    if (queue.length === 0) return { syncedCount: 0, conflicts: 0 };

    let syncedCount = 0;
    for (const item of queue) {
      if (item.entity_type === 'unit') {
        await this.pushToFirestore('units', item.entity_id, item.payload);
      } else if (item.entity_type === 'checklist') {
        const chk = item.payload as Checklist;
        chk.task_list.forEach(t => { t.sync_status = 'synced'; });
        await this.putInStore('checklists', chk);
        await this.pushToFirestore('checklists', chk.id, chk);
      } else if (item.entity_type === 'field_log') {
        const log = item.payload as FieldLogEntry;
        log.synced = true;
        await this.putInStore('field_logs', log);
        await this.pushToFirestore('field_logs', log.id, log);
      } else if (item.entity_type === 'work_order') {
        const wo = item.payload as WorkOrder;
        wo.sync_status = 'synced';
        await this.putInStore('work_orders', wo);
        await this.pushToFirestore('work_orders', wo.id, wo);
      } else if (item.entity_type === 'notifications') {
        await this.pushToFirestore('notifications', item.entity_id, item.payload);
      }
      await this.deleteFromStore('sync_queue', item.id);
      syncedCount++;
    }

    soundManager.playSyncSuccess();

    // Log offline sync success in field log
    const syncLog: FieldLogEntry = {
      id: `log-${Date.now()}`,
      unit_id: 'system',
      unit_number: 'HQ',
      timestamp: Date.now(),
      author_name: 'Sync Engine',
      author_role: 'Maintenance Supervisor',
      action_type: 'offline_sync',
      message: `Offline Sync Successful: Merged ${syncedCount} queued field records with central cloud server.`,
      synced: true
    };
    await this.putInStore('field_logs', syncLog);
    this.pushToFirestore('field_logs', syncLog.id, syncLog);

    this.notifyListeners();
    return { syncedCount, conflicts: 0 };
  }

  // Conflict Simulation Trigger:
  // Simulates another technician in another dead zone / apartment updating the same task with different notes/status
  public async simulateConcurrentConflict(checklistId: string, taskId: string): Promise<{
    originalTask: Task;
    remoteUpdate: Task;
    mergedTask: Task;
  }> {
    const checklist = await this.getChecklistById(checklistId);
    if (!checklist) throw new Error('Checklist not found');

    const taskIndex = checklist.task_list.findIndex(t => t.id === taskId);
    if (taskIndex === -1) throw new Error('Task not found');

    const currentTask = checklist.task_list[taskIndex];

    // Create simulated remote tech update
    const remoteUpdate: Task = {
      ...currentTask,
      is_completed: true,
      notes: `${currentTask.notes ? currentTask.notes + ' | ' : ''}[Tech #2 Dave J.]: Valve replaced with quarter-turn 5/8x3/8 ball stop. Leak tested ok.`,
      photo_url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&auto=format&fit=crop&q=80',
      version: currentTask.version + 1,
      completed_at: Date.now() - 1000 * 30,
      completed_by: 'Dave Jenkins'
    };

    // Smart 3-way automatic resolution:
    // Retain completion (true wins), concatenate non-duplicate notes, keep latest photo, increment version
    const mergedTask: Task = {
      ...currentTask,
      is_completed: true,
      notes: `${currentTask.notes} [MERGED CONCURRENT NOTE: Dave Jenkins verified valve replacement & pressure test]`,
      photo_url: currentTask.photo_url || remoteUpdate.photo_url,
      completed_at: currentTask.completed_at || remoteUpdate.completed_at,
      completed_by: `${currentTask.completed_by || 'Carlos M.'} & Dave J.`,
      version: currentTask.version + 2,
      sync_status: 'synced'
    };

    checklist.task_list[taskIndex] = mergedTask;
    checklist.version += 1;
    checklist.last_updated = Date.now();
    checklist.last_updated_by = 'Conflict Resolver (Auto-merged)';
    
    // Recalculate percentage
    const completedCount = checklist.task_list.filter(t => t.is_completed).length;
    checklist.completion_percentage = Math.round((completedCount / checklist.task_list.length) * 100);
    checklist.status = checklist.completion_percentage === 100 ? 'completed' : 'in_progress';

    await this.putInStore('checklists', checklist);

    const logEntry: FieldLogEntry = {
      id: `log-${Date.now()}`,
      unit_id: checklist.unit_id,
      unit_number: 'N/A',
      timestamp: Date.now(),
      author_name: 'Conflict Resolution Engine',
      author_role: 'Maintenance Supervisor',
      trade_category: checklist.trade_category,
      action_type: 'conflict_resolved',
      message: `Auto-resolved simultaneous field update on "${currentTask.name}". Merged notes from Dave Jenkins and local technician.`,
      synced: true
    };
    await this.putInStore('field_logs', logEntry);

    const notif: SupervisorNotification = {
      id: `notif-${Date.now()}`,
      timestamp: Date.now(),
      type: 'conflict_resolved',
      title: `Simultaneous Update Resolved: ${checklist.trade_category}`,
      message: `Conflict resolution engine automatically reconciled concurrent field notes on Task "${currentTask.name}".`,
      unit_id: checklist.unit_id,
      unit_number: '204',
      trade_category: checklist.trade_category,
      read: false
    };
    await this.putInStore('notifications', notif);

    this.notifyListeners();
    return {
      originalTask: currentTask,
      remoteUpdate,
      mergedTask
    };
  }

  // Delete an individual unit and its related records from local store and Firestore
  public async deleteUnit(unitId: string, author?: TechnicianUser): Promise<void> {
    const unit = await this.getUnitById(unitId);
    if (!unit) return;

    // 1. Delete unit document
    await this.deleteFromStore('units', unitId);
    await this.deleteFromFirestore('units', unitId);

    // 2. Delete all checklists for this unit
    const checklists = await this.getChecklistsForUnit(unitId);
    for (const c of checklists) {
      await this.deleteFromStore('checklists', c.id);
      await this.deleteFromFirestore('checklists', c.id);
    }

    // 3. Delete all work orders for this unit
    const allWorkOrders = await this.getAllFromStore<WorkOrder>('work_orders');
    for (const wo of allWorkOrders) {
      if (wo.unit_id === unitId) {
        await this.deleteFromStore('work_orders', wo.id);
        await this.deleteFromFirestore('work_orders', wo.id);
      }
    }

    // 4. Log deletion
    const log: FieldLogEntry = {
      id: `log-${Date.now()}`,
      unit_id: unitId,
      unit_number: unit.unit_number,
      timestamp: Date.now(),
      author_name: author ? author.name : 'Maintenance Supervisor',
      author_role: 'Maintenance Supervisor',
      action_type: 'unit_deleted',
      message: `Unit #${unit.unit_number} removed from turnover pipeline by ${author ? author.name : 'Supervisor'}.`,
      synced: true
    };
    await this.putInStore('field_logs', log);
    this.pushToFirestore('field_logs', log.id, log);

    this.notifyListeners();
  }

  // Technicians / Maintenance Team Management
  public async getTechnicians(): Promise<TechnicianUser[]> {
    const stored = await this.getAllFromStore<TechnicianUser>('technicians');
    if (stored && stored.length > 0) {
      ACTIVE_TECHNICIANS = stored;
      return stored;
    }
    const local = localStorage.getItem('utt_technicians');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          ACTIVE_TECHNICIANS = parsed;
          return parsed;
        }
      } catch {}
    }
    return ACTIVE_TECHNICIANS;
  }

  public async addTechnician(tech: TechnicianUser): Promise<void> {
    await this.putInStore('technicians', tech);
    await this.pushToFirestore('technicians', tech.id, tech);
    ACTIVE_TECHNICIANS = [...ACTIVE_TECHNICIANS.filter(t => t.id !== tech.id), tech];
    localStorage.setItem('utt_technicians', JSON.stringify(ACTIVE_TECHNICIANS));
    this.notifyListeners();
  }

  public async deleteTechnician(id: string): Promise<void> {
    await this.deleteFromStore('technicians', id);
    await this.deleteFromFirestore('technicians', id);
    ACTIVE_TECHNICIANS = ACTIVE_TECHNICIANS.filter(t => t.id !== id);
    localStorage.setItem('utt_technicians', JSON.stringify(ACTIVE_TECHNICIANS));
    this.notifyListeners();
  }

  // Vendors & Turnaround Contractors Management
  public async getVendors(): Promise<Vendor[]> {
    const stored = await this.getAllFromStore<Vendor>('vendors');
    if (stored && stored.length > 0) {
      ACTIVE_VENDORS = stored;
      return stored;
    }
    const local = localStorage.getItem('utt_vendors');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          ACTIVE_VENDORS = parsed;
          return parsed;
        }
      } catch {}
    }
    return ACTIVE_VENDORS;
  }

  public async addVendor(vendor: Vendor): Promise<void> {
    await this.putInStore('vendors', vendor);
    await this.pushToFirestore('vendors', vendor.id, vendor);
    ACTIVE_VENDORS = [...ACTIVE_VENDORS.filter(v => v.id !== vendor.id), vendor];
    localStorage.setItem('utt_vendors', JSON.stringify(ACTIVE_VENDORS));
    this.notifyListeners();
  }

  public async updateVendor(vendor: Vendor): Promise<void> {
    await this.putInStore('vendors', vendor);
    await this.pushToFirestore('vendors', vendor.id, vendor);
    const exists = ACTIVE_VENDORS.some(v => v.id === vendor.id);
    if (exists) {
      ACTIVE_VENDORS = ACTIVE_VENDORS.map(v => v.id === vendor.id ? vendor : v);
    } else {
      ACTIVE_VENDORS = [...ACTIVE_VENDORS, vendor];
    }
    localStorage.setItem('utt_vendors', JSON.stringify(ACTIVE_VENDORS));
    this.notifyListeners();
  }

  public async deleteVendor(id: string): Promise<void> {
    await this.deleteFromStore('vendors', id);
    await this.deleteFromFirestore('vendors', id);
    ACTIVE_VENDORS = ACTIVE_VENDORS.filter(v => v.id !== id);
    localStorage.setItem('utt_vendors', JSON.stringify(ACTIVE_VENDORS));
    this.notifyListeners();
  }

  // Purge test apartments and test maintenance work orders/checklists
  public async purgeTestUnitsAndMaintenance(): Promise<void> {
    const isAlreadyPurged = localStorage.getItem('utt_test_data_purged_v2') === 'true';
    if (isAlreadyPurged) return;

    const testUnitIds = ['unit-101', 'unit-204', 'unit-305', 'unit-412'];
    const testWorkOrderIds = ['wo-1', 'wo-2', 'wo-3', 'wo-4'];

    // 1. Remove all test units from store and Firestore
    for (const id of testUnitIds) {
      await this.deleteFromStore('units', id);
      await this.deleteFromFirestore('units', id);
    }

    // 2. Remove all test checklists
    const allChecklists = await this.getAllFromStore<Checklist>('checklists');
    for (const c of allChecklists) {
      if (testUnitIds.includes(c.unit_id)) {
        await this.deleteFromStore('checklists', c.id);
        await this.deleteFromFirestore('checklists', c.id);
      }
    }

    // 3. Remove all test work orders
    const allWorkOrders = await this.getAllFromStore<WorkOrder>('work_orders');
    for (const wo of allWorkOrders) {
      if (testUnitIds.includes(wo.unit_id) || testWorkOrderIds.includes(wo.id)) {
        await this.deleteFromStore('work_orders', wo.id);
        await this.deleteFromFirestore('work_orders', wo.id);
      }
    }

    // 4. Remove test notifications
    const allNotifs = await this.getAllFromStore<SupervisorNotification>('notifications');
    for (const n of allNotifs) {
      if (testUnitIds.includes(n.unit_id)) {
        await this.deleteFromStore('notifications', n.id);
        await this.deleteFromFirestore('notifications', n.id);
      }
    }

    // Clean test cache keys
    localStorage.setItem('utt_test_data_purged_v2', 'true');
    localStorage.removeItem('utt_units');
    localStorage.removeItem('utt_checklists');
    localStorage.removeItem('utt_work_orders');

    // Log clean-up
    const log: FieldLogEntry = {
      id: `log-${Date.now()}`,
      unit_id: 'SYSTEM',
      unit_number: 'N/A',
      timestamp: Date.now(),
      author_name: 'Firebase Live',
      author_role: 'Maintenance Supervisor',
      action_type: 'clean_slate',
      message: 'Sample test units removed. Ready to track your real apartments.',
      synced: true
    };
    await this.putInStore('field_logs', log);
    await this.pushToFirestore('field_logs', log.id, log);

    this.notifyListeners();
  }

  // Clear all data to start completely fresh with Firebase
  public async clearAllAndStartFresh(): Promise<void> {
    localStorage.setItem('utt_cleared_by_user', 'true');

    // Retrieve all existing items
    const units = await this.getAllFromStore<Unit>('units');
    const checklists = await this.getAllFromStore<Checklist>('checklists');
    const workOrders = await this.getAllFromStore<WorkOrder>('work_orders');
    const fieldLogs = await this.getAllFromStore<FieldLogEntry>('field_logs');
    const notifications = await this.getAllFromStore<SupervisorNotification>('notifications');

    // Delete local and cloud
    for (const u of units) {
      await this.deleteFromStore('units', u.id);
      await this.deleteFromFirestore('units', u.id);
    }
    for (const c of checklists) {
      await this.deleteFromStore('checklists', c.id);
      await this.deleteFromFirestore('checklists', c.id);
    }
    for (const w of workOrders) {
      await this.deleteFromStore('work_orders', w.id);
      await this.deleteFromFirestore('work_orders', w.id);
    }
    for (const l of fieldLogs) {
      await this.deleteFromStore('field_logs', l.id);
      await this.deleteFromFirestore('field_logs', l.id);
    }
    for (const n of notifications) {
      await this.deleteFromStore('notifications', n.id);
      await this.deleteFromFirestore('notifications', n.id);
    }

    // Wipe fallback localStorage
    localStorage.removeItem('utt_units');
    localStorage.removeItem('utt_checklists');
    localStorage.removeItem('utt_work_orders');
    localStorage.removeItem('utt_field_logs');
    localStorage.removeItem('utt_notifications');
    localStorage.removeItem('utt_sync_queue');

    // Add initial clean-slate log
    const initialLog: FieldLogEntry = {
      id: `log-${Date.now()}`,
      unit_id: 'SYSTEM',
      unit_number: 'N/A',
      timestamp: Date.now(),
      author_name: 'Firebase Live',
      author_role: 'Maintenance Supervisor',
      action_type: 'clean_slate',
      message: 'Database reset to clean slate in Firebase Firestore. Ready to register new apartments.',
      synced: true
    };
    await this.putInStore('field_logs', initialLog);
    await this.pushToFirestore('field_logs', initialLog.id, initialLog);

    this.notifyListeners();
  }

  // Reset demo data
  public async resetToDefaults(): Promise<void> {
    localStorage.removeItem('utt_cleared_by_user');
    const { checklists, workOrders, fieldLogs, notifications } = this.generateInitialData();
    for (const u of INITIAL_UNITS) {
      await this.putInStore('units', u);
      this.pushToFirestore('units', u.id, u);
    }
    for (const c of checklists) {
      await this.putInStore('checklists', c);
      this.pushToFirestore('checklists', c.id, c);
    }
    for (const w of workOrders) {
      await this.putInStore('work_orders', w);
      this.pushToFirestore('work_orders', w.id, w);
    }
    for (const l of fieldLogs) {
      await this.putInStore('field_logs', l);
      this.pushToFirestore('field_logs', l.id, l);
    }
    for (const n of notifications) {
      await this.putInStore('notifications', n);
      this.pushToFirestore('notifications', n.id, n);
    }
    localStorage.removeItem('utt_sync_queue');
    this.notifyListeners();
  }
}

export const offlineDB = new OfflineDB();
