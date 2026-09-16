const { initializeApp } = require("firebase/app");
const { getFirestore, collection, doc, setDoc, getDocs } = require("firebase/firestore");
const config = require("../firebase-applet-config.json");

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId || "(default)");

const DEFAULT_TRADE_TASKS = {
  Plumbing: [
    { name: 'Main Shutoff & Angle Stops Inspection', description: 'Check main water shutoff valve, inspect all under-sink angle stops for corrosion or weeping.' },
    { name: 'Faucet Aerators & Flow Test', description: 'Remove and descale aerators in kitchen and bathrooms. Test hot/cold pressure balance.' },
    { name: 'Toilet Tank & Flapper Seal Test', description: 'Dye test toilet tank for flapper leakage. Inspect fill valve shutoff height and wax ring seal.' },
    { name: 'Tub/Shower Diverter & Scald Guard', description: 'Test tub spout diverter flow leakage, verify water heater mixing valve does not exceed 120°F.' },
    { name: 'P-Trap Drainage & Disposal Clearance', description: 'Fill both sink basins and perform rapid-drain test. Run disposal under full load with cold water.' },
    { name: 'Water Heater Pressure Relief & Expansion Tank', description: 'Inspect T&P valve discharge line for drips. Check expansion tank pressure and anode rod status.' }
  ],
  Electrical: [
    { name: 'Breaker Panel & Labeling Verification', description: 'Inspect panel for hot spots, verify correct breaker amperages, ensure directory is fully labeled.' },
    { name: 'GFCI Receptacle Trip Test', description: 'Test all wet-location GFCI outlets (kitchen, baths, exterior) with dedicated 3-prong circuit tester.' },
    { name: 'Tamper-Resistant Outlets & Switches', description: 'Inspect all wall plugs for loose tension and cracked faceplates. Verify 3-way switches function properly.' },
    { name: 'LED Fixtures & Ceiling Fan Balancing', description: 'Verify all light fixtures have matching 3000K warm-white LED bulbs. Test ceiling fans on all speeds.' },
    { name: 'Smoke & CO Detector Hardwire Test', description: 'Test alarm interconnection, replace 9V backup batteries, verify manufacturer expiration date.' }
  ],
  HVAC: [
    { name: 'Thermostat Calibration & Battery Swap', description: 'Check thermostat deadband, test call for heat and cooling, replace AA/AAA backup cells.' },
    { name: 'Air Filter Replacement (MERV 8+)', description: 'Install new pleated air filter, verify snug bypass seal, write change date on frame.' },
    { name: 'Condensate Drain Line & Float Switch', description: 'Flush condensate line with vinegar solution, test primary float switch shutoff, check secondary pan.' },
    { name: 'Supply & Return Delta-T Temp Split', description: 'Measure return and supply plenum temperatures; confirm 16-20°F drop in cooling mode.' },
    { name: 'Diffusers, Grilles & Register Cleaning', description: 'Clean dust buildup on all supply registers, verify damper lever operates freely.' }
  ],
  Painting: [
    { name: 'Drywall Patching & Texture Blending', description: 'Spackle all fastener holes, repair corner bead dings, blend orange-peel/knockdown texture.' },
    { name: 'Baseboard & Door Trim Caulk Lines', description: 'Clean and apply acrylic latex caulk along baseboards, door casings, and window sills.' },
    { name: 'Full Wall Prime & 2-Coat Paint Application', description: 'Spot-prime repairs with stain blocker, apply two uniform coats of eggshell interior paint.' },
    { name: 'Doors, Trim & Cabinet Face Touchup', description: 'Semi-gloss enamel application on doors, door jambs, and shelving.' },
    { name: 'Masking Removal & Edge Inspection', description: 'Pull all blue painters tape cleanly, scrape any stray paint droplets from glass or hardware.' }
  ],
  Flooring: [
    { name: 'Subfloor Squeak & Moisture Inspection', description: 'Walk full perimeter to identify subfloor deflection or squeaks; secure with floor screws.' },
    { name: 'LVP/LVT Plank Inspection & Replacement', description: 'Replace any damaged vinyl planks, check perimeter expansion gaps, verify seam locks.' },
    { name: 'Carpet Deep Extraction & Pad Check', description: 'Perform hot water extraction, inspect carpet stretching for ripples, check tack strips.' },
    { name: 'Threshold & Transition Strip Fastening', description: 'Inspect metal/wood transitions between tile, vinyl, and carpet. Ensure secure anchoring.' }
  ],
  Cleaning: [
    { name: 'Kitchen Appliance Deep Degreasing', description: 'Run oven self-clean/degrease racks, clean range hood grease filter, sanitize refrigerator coils & gasket.' },
    { name: 'Cabinet Interiors & Shelving Wipe-down', description: 'Vacuum cabinet crumbs, wipe all interior shelves with antimicrobial cleaner, polish drawer pulls.' },
    { name: 'Bathroom Grout & Scale Eradication', description: 'Descale tile surround, polish chrome fixtures, disinfect toilet pedestal and behind tank.' },
    { name: 'Window Panes, Blinds & Sill Sanitization', description: 'Clean interior window glass, dust horizontal blinds slat by slat, sanitize sill tracks.' },
    { name: 'Floor Machine Scrub & Edge Mopping', description: 'Machine scrub hard floors with neutral pH cleaner, hand-mop along baseboards and corners.' },
    { name: 'Final Odor Neutralization & Airing Out', description: 'Place hypoallergenic charcoal odor absorber, set lockbox key for supervisor walk.' }
  ]
};

const samplePhotos = [
  'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=400&auto=format&fit=crop&q=80'
];

const FOUR_UNITS = [
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

async function seed() {
  console.log("Seeding 4 units and their complete fichas...");

  // 1. Seed Units
  for (const unit of FOUR_UNITS) {
    await setDoc(doc(db, "units", unit.id), unit);
    console.log(`Saved Unit #${unit.unit_number} (${unit.id})`);

    // Generate and save 6 trade checklists for each unit
    for (const [trade, defaultTasks] of Object.entries(DEFAULT_TRADE_TASKS)) {
      const chkId = `chk-${unit.id}-${trade.toLowerCase()}`;
      
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

      const taskList = defaultTasks.map((t, idx) => {
        const isDone = idx < completedCount;
        const hasPhoto = isDone && (idx % 2 === 0);
        const taskObj = {
          id: `tsk-${chkId}-${idx + 1}`,
          checklist_id: chkId,
          sequence_order: idx + 1,
          name: t.name,
          description: t.description,
          is_completed: isDone,
          notes: isDone ? 'Inspected and verified to code specification.' : '',
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

      const checklist = {
        id: chkId,
        unit_id: unit.id,
        trade_category: trade,
        task_list: taskList,
        completion_percentage: pct,
        status: status,
        assigned_technician_id: unit.assigned_technician_id,
        last_updated: Date.now() - 1000 * 60 * 30,
        last_updated_by: unit.assigned_tech || 'Dave Jenkins',
        version: 1
      };

      await setDoc(doc(db, "checklists", checklist.id), checklist);
    }
  }

  // 2. Work Orders for the 4 units
  const workOrders = [
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
  ];

  for (const wo of workOrders) {
    await setDoc(doc(db, "work_orders", wo.id), wo);
    console.log(`Saved Work Order ${wo.id} for Unit #${wo.unit_number}`);
  }

  // 3. Field Logs
  const logs = [
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
  ];

  for (const log of logs) {
    await setDoc(doc(db, "field_logs", log.id), log);
  }

  // 4. Notifications
  const notifs = [
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
  ];

  for (const n of notifs) {
    await setDoc(doc(db, "notifications", n.id), n);
  }

  console.log("Seeding complete!");
}

seed().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
