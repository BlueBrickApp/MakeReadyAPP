/**
 * Unit Turnover Tracker - Main Application Entry
 * High-Contrast Field Operations Management (Neon Rush)
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Navigation, ScreenTab } from './components/Navigation';
import { UnitPipeline } from './components/UnitPipeline';
import { TurnoverDashboard } from './components/TurnoverDashboard';
import { InspectionChecklist } from './components/InspectionChecklist';
import { FieldLog } from './components/FieldLog';
import { Dispatcher } from './components/Dispatcher';
import { ReadinessSignOff } from './components/ReadinessSignOff';
import { NotificationModal } from './components/NotificationModal';
import { ConflictModal } from './components/ConflictModal';
import { NewUnitModal } from './components/NewUnitModal';
import { ShareTeamModal } from './components/ShareTeamModal';
import { ManageTeamModal } from './components/ManageTeamModal';
import { ManageVendorsModal } from './components/ManageVendorsModal';

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
  TurnoverStage 
} from './types';
import { offlineDB, ACTIVE_TECHNICIANS, ACTIVE_VENDORS } from './services/db';
import { soundManager } from './services/audio';

export default function App() {
  // Active User Profile (Defaults to Field Tech Carlos Mendez)
  const [currentUser, setCurrentUser] = useState<TechnicianUser>(ACTIVE_TECHNICIANS[0]);
  const [technicians, setTechnicians] = useState<TechnicianUser[]>(ACTIVE_TECHNICIANS);

  // Primary Navigation State
  const [currentTab, setCurrentTab] = useState<ScreenTab>('pipeline');

  // Database State
  const [units, setUnits] = useState<Unit[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [fieldLogs, setFieldLogs] = useState<FieldLogEntry[]>([]);
  const [notifications, setNotifications] = useState<SupervisorNotification[]>([]);
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selected Scope State
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<TradeCategory>('Plumbing');

  // Dispatcher Prefill State
  const [dispatcherPrefill, setDispatcherPrefill] = useState<{
    unitId?: string;
    trade?: TradeCategory;
    taskName?: string;
  }>({});

  // Modals State
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isNewUnitModalOpen, setIsNewUnitModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isManageTeamModalOpen, setIsManageTeamModalOpen] = useState(false);
  const [isManageVendorsModalOpen, setIsManageVendorsModalOpen] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>(ACTIVE_VENDORS);
  const [conflictData, setConflictData] = useState<{
    originalTask: Task;
    remoteUpdate: Task;
    mergedTask: Task;
  } | null>(null);

  // Initialize DB and load initial records
  const loadData = async () => {
    try {
      const [u, w, l, n, q, techs, vends] = await Promise.all([
        offlineDB.getUnits(),
        offlineDB.getWorkOrders(),
        offlineDB.getFieldLogs(),
        offlineDB.getNotifications(),
        offlineDB.getSyncQueue(),
        offlineDB.getTechnicians(),
        offlineDB.getVendors()
      ]);

      // Load all checklists for overall progress across units
      const allChecklists: Checklist[] = [];
      for (const unit of u) {
        const chks = await offlineDB.getChecklistsForUnit(unit.id);
        allChecklists.push(...chks);
      }

      setUnits(u);
      setChecklists(allChecklists);
      setWorkOrders(w);
      setFieldLogs(l);
      setNotifications(n);
      setSyncQueue(q);
      if (techs && techs.length > 0) {
        setTechnicians(techs);
      }
      if (vends && vends.length > 0) {
        setVendors(vends);
      }

      // If selected unit not valid, default to first unit or null
      setSelectedUnitId(prev => {
        if (u.length > 0) {
          if (!prev || !u.some(unit => unit.id === prev)) {
            return u[0].id;
          }
          return prev;
        }
        return null;
      });
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Safety timeout: Ensure spinner disappears after at most 1200ms
    const safetyTimer = setTimeout(() => {
      if (isMounted) setIsLoading(false);
    }, 1200);

    offlineDB.init()
      .then(() => {
        if (isMounted) {
          loadData().finally(() => {
            if (isMounted) setIsLoading(false);
          });
        }
      })
      .catch((err) => {
        console.warn('DB init note:', err);
        if (isMounted) setIsLoading(false);
      });

    const unsub = offlineDB.subscribe(() => {
      if (isMounted) loadData();
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      unsub();
    };
  }, []);

  // Handler: Move Unit stage (Kanban)
  const handleMoveUnitStage = async (unitId: string, newStage: TurnoverStage) => {
    await offlineDB.updateUnitStage(unitId, newStage, currentUser);
    await loadData();
  };

  // Handler: Update Task Punch-List
  const handleUpdateTask = async (checklistId: string, taskId: string, updates: Partial<Task>) => {
    const currentUnit = units.find(u => u.id === selectedUnitId);
    const unitNumber = currentUnit?.unit_number || 'N/A';
    await offlineDB.updateTask(checklistId, taskId, updates, currentUser, unitNumber);
    await loadData();
  };

  // Handler: Simulate simultaneous conflict
  const handleSimulateConflict = async (checklistId: string, taskId: string) => {
    const result = await offlineDB.simulateConcurrentConflict(checklistId, taskId);
    setConflictData(result);
    await loadData();
  };

  // Handler: Create Work Order
  const handleCreateWorkOrder = async (order: Omit<WorkOrder, 'id' | 'created_at' | 'sync_status'>) => {
    await offlineDB.createWorkOrder(order, currentUser);
    await loadData();
  };

  // Handler: Update Work Order Status
  const handleUpdateWorkOrderStatus = async (id: string, status: WorkOrder['status'], notes?: string) => {
    await offlineDB.updateWorkOrderStatus(id, status, notes);
    await loadData();
  };

  // Handler: Sign Off Rent Ready (Supervisor only)
  const handleSignOffRentReady = async (
    unitId: string, 
    supervisor: TechnicianUser, 
    signatureDataUrl: string, 
    notes: string
  ) => {
    await offlineDB.signOffRentReady(unitId, supervisor, signatureDataUrl, notes);
    await loadData();
  };

  // Handler: Create Unit
  const handleCreateUnit = async (unitData: Omit<Unit, 'id' | 'last_updated'>) => {
    const newUnit = await offlineDB.createUnit(unitData, currentUser);
    setSelectedUnitId(newUnit.id);
    await loadData();
  };

  // Handler: Delete Unit
  const handleDeleteUnit = async (unitId: string) => {
    await offlineDB.deleteUnit(unitId, currentUser);
    if (selectedUnitId === unitId) {
      setSelectedUnitId(null);
    }
    await loadData();
  };

  // Quick navigation routing helpers
  const handleOpenChecklist = (unitId: string, trade?: TradeCategory) => {
    setSelectedUnitId(unitId);
    if (trade) setSelectedTrade(trade);
    setCurrentTab('inspection-checklist');
  };

  const handleOpenDashboard = (unitId: string) => {
    setSelectedUnitId(unitId);
    setCurrentTab('turnover-dashboard');
  };

  const handleOpenDispatcherForUnit = (unitId: string, trade: TradeCategory, taskName?: string) => {
    setSelectedUnitId(unitId);
    setDispatcherPrefill({ unitId, trade, taskName });
    setCurrentTab('dispatcher');
  };

  const handleOpenSignOff = (unitId: string) => {
    setSelectedUnitId(unitId);
    setCurrentTab('readiness-signoff');
  };

  const handleSwitchToSupervisor = () => {
    const sup = technicians.find(t => t.role === 'Maintenance Supervisor') || ACTIVE_TECHNICIANS.find(t => t.role === 'Maintenance Supervisor');
    if (sup) setCurrentUser(sup);
  };

  // Handler: Add technician to maintenance team
  const handleAddTechnician = async (tech: TechnicianUser) => {
    await offlineDB.addTechnician(tech);
    const updated = await offlineDB.getTechnicians();
    setTechnicians(updated);
  };

  // Handler: Delete technician from maintenance team
  const handleDeleteTechnician = async (id: string) => {
    await offlineDB.deleteTechnician(id);
    const updated = await offlineDB.getTechnicians();
    setTechnicians(updated);
    if (currentUser.id === id && updated.length > 0) {
      setCurrentUser(updated[0]);
    }
  };

  // Handler: Add vendor to directory
  const handleAddVendor = async (vendor: Vendor) => {
    await offlineDB.addVendor(vendor);
    const updated = await offlineDB.getVendors();
    setVendors(updated);
  };

  // Handler: Update existing vendor details
  const handleUpdateVendor = async (vendor: Vendor) => {
    await offlineDB.updateVendor(vendor);
    const updated = await offlineDB.getVendors();
    setVendors(updated);
  };

  // Handler: Delete vendor from directory
  const handleDeleteVendor = async (id: string) => {
    await offlineDB.deleteVendor(id);
    const updated = await offlineDB.getVendors();
    setVendors(updated);
  };

  const openWorkOrdersCount = workOrders.filter(w => w.status !== 'Resolved').length;
  const readyUnitsCount = units.filter(u => u.current_status === 'Ready').length;

  return (
    <div className="min-h-screen bg-[#080C14] text-slate-100 flex flex-col font-sans selection:bg-[#00FFB4] selection:text-black">
      
      {/* Top Header with Offline Indicator, Dead-Zone Simulator, Role Switcher, Team & Vendors */}
      <Header
        currentUser={currentUser}
        technicians={technicians}
        vendors={vendors}
        onUserChange={setCurrentUser}
        onOpenNotifications={() => setIsNotificationModalOpen(true)}
        onOpenNewUnit={() => setIsNewUnitModalOpen(true)}
        onOpenShare={() => setIsShareModalOpen(true)}
        onOpenManageTeam={() => setIsManageTeamModalOpen(true)}
        onOpenManageVendors={() => setIsManageVendorsModalOpen(true)}
        notifications={notifications}
        syncQueue={syncQueue}
        onSyncCompleted={loadData}
      />

      {/* Primary Navigation Tabs */}
      <Navigation
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        currentUser={currentUser}
        openWorkOrdersCount={openWorkOrdersCount}
        readyUnitsCount={readyUnitsCount}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
            <div className="w-10 h-10 border-4 border-[#00FFB4] border-t-transparent rounded-full animate-spin" />
            <p className="font-mono text-xs text-slate-400">Loading offline database...</p>
          </div>
        ) : (
          <>
            {currentTab === 'pipeline' && (
              <UnitPipeline
                units={units}
                checklists={checklists}
                workOrders={workOrders}
                currentUser={currentUser}
                onSelectUnit={(id) => {
                  setSelectedUnitId(id);
                  setCurrentTab('turnover-dashboard');
                }}
                onOpenChecklist={handleOpenChecklist}
                onOpenDashboard={handleOpenDashboard}
                onMoveStage={handleMoveUnitStage}
                onDeleteUnit={handleDeleteUnit}
                onOpenNewUnit={() => setIsNewUnitModalOpen(true)}
              />
            )}

            {currentTab === 'turnover-dashboard' && (
              <TurnoverDashboard
                units={units}
                selectedUnitId={selectedUnitId}
                onSelectUnitId={setSelectedUnitId}
                checklists={checklists}
                workOrders={workOrders}
                currentUser={currentUser}
                onOpenChecklistForTrade={handleOpenChecklist}
                onOpenDispatcherForUnit={(uId, trade) => handleOpenDispatcherForUnit(uId, trade)}
                onOpenSignOff={handleOpenSignOff}
              />
            )}

            {currentTab === 'inspection-checklist' && (
              <InspectionChecklist
                units={units}
                selectedUnitId={selectedUnitId}
                onSelectUnitId={setSelectedUnitId}
                selectedTrade={selectedTrade}
                onSelectTrade={setSelectedTrade}
                checklists={checklists}
                currentUser={currentUser}
                onUpdateTask={handleUpdateTask}
                onCreateWorkOrderFromTask={(uId, uNum, trade, taskName) => {
                  handleOpenDispatcherForUnit(uId, trade, taskName);
                }}
                onSimulateConflict={handleSimulateConflict}
              />
            )}

            {currentTab === 'field-log' && (
              <FieldLog
                logs={fieldLogs}
                units={units}
                selectedUnitId={selectedUnitId}
                onSelectUnitId={setSelectedUnitId}
              />
            )}

            {currentTab === 'dispatcher' && (
              <Dispatcher
                workOrders={workOrders}
                units={units}
                currentUser={currentUser}
                technicians={technicians}
                onCreateWorkOrder={handleCreateWorkOrder}
                onUpdateStatus={handleUpdateWorkOrderStatus}
                prefilledUnitId={dispatcherPrefill.unitId || selectedUnitId || undefined}
                prefilledTrade={dispatcherPrefill.trade || selectedTrade}
                prefilledTaskName={dispatcherPrefill.taskName}
              />
            )}

            {currentTab === 'readiness-signoff' && (
              <ReadinessSignOff
                units={units}
                selectedUnitId={selectedUnitId || ''}
                onSelectUnitId={setSelectedUnitId}
                checklists={checklists}
                workOrders={workOrders}
                currentUser={currentUser}
                onSwitchToSupervisor={handleSwitchToSupervisor}
                onSignOff={handleSignOffRentReady}
              />
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        notifications={notifications}
        onMarkRead={offlineDB.markNotificationRead.bind(offlineDB)}
        onMarkAllRead={offlineDB.markAllNotificationsRead.bind(offlineDB)}
        onNavigateToUnit={(uId) => {
          setSelectedUnitId(uId);
          setCurrentTab('turnover-dashboard');
        }}
      />

      <ConflictModal
        isOpen={!!conflictData}
        onClose={() => setConflictData(null)}
        conflictData={conflictData}
      />

      <NewUnitModal
        isOpen={isNewUnitModalOpen}
        onClose={() => setIsNewUnitModalOpen(false)}
        currentUser={currentUser}
        technicians={technicians}
        onSwitchToSupervisor={handleSwitchToSupervisor}
        onCreateUnit={handleCreateUnit}
      />

      <ShareTeamModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      <ManageTeamModal
        isOpen={isManageTeamModalOpen}
        onClose={() => setIsManageTeamModalOpen(false)}
        technicians={technicians}
        currentUser={currentUser}
        onAddTechnician={handleAddTechnician}
        onDeleteTechnician={handleDeleteTechnician}
      />

      <ManageVendorsModal
        isOpen={isManageVendorsModalOpen}
        onClose={() => setIsManageVendorsModalOpen(false)}
        vendors={vendors}
        onAddVendor={handleAddVendor}
        onUpdateVendor={handleUpdateVendor}
        onDeleteVendor={handleDeleteVendor}
      />

      {/* Footer System Status Bar */}
      <footer className="bg-[#0A0E17] border-t border-slate-800/80 px-4 py-2.5 sm:px-6 text-slate-500 font-mono text-[11px]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00FFB4] shadow-[0_0_6px_#00FFB4]" />
            <span>UNIT TURNOVER TRACKER • LOCAL DB ENCRYPTION READY</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>IndexedDB Store: Active</span>
            <span>•</span>
            <span>Trades: 6 Categories</span>
            <span>•</span>
            <span>Session: {currentUser.role} ({currentUser.badge_id})</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
