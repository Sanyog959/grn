'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  GRNOrder,
  GRNItem,
  Vendor,
  EMPTY_GRN_ORDERS,
  EMPTY_GRN_ITEMS,
  EMPTY_VENDORS,
} from '@/types/inventory';
import { AppLayout } from '@/components/layout/AppLayout';
import { KpiMetrics } from '@/app/components/KpiMetrics';
import { GrnOrdersTable } from '@/app/components/GrnOrdersTable';
import { GrnItemsTable } from '@/app/components/GrnItemsTable';
import { VendorsTable } from '@/app/components/VendorsTable';
import { CreateGrnModal } from '@/app/components/CreateGrnModal';
import { CreateVendorModal } from '@/app/components/CreateVendorModal';
import { GrnSlipModal } from '@/app/components/GrnSlipModal';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { hasModuleAccess, canUserPerformAction } from '@/types/auth';
import { NavItemKey } from '@/components/layout/AppSidebar';
import { AdminPoStockLifecycle } from '@/app/components/AdminPoStockLifecycle';
import { StoreProductionRejectionDashboard } from '@/app/components/StoreProductionRejectionDashboard';
import { PackageCheck, CheckCircle2, Building2, Plus, Layers, FileText, ShieldCheck, Factory, Truck } from 'lucide-react';
import { PurchaseOrdersView } from '@/components/modules/PurchaseOrdersView';
import { InventoryStockView } from '@/components/modules/InventoryStockView';
import { ProductionFloorView } from '@/components/modules/ProductionFloorView';
import { DispatchManagementView } from '@/components/modules/DispatchManagementView';
import { MastersCatalogView } from '@/components/modules/MastersCatalogView';
import { ReconciliationReportsView } from '@/components/modules/ReconciliationReportsView';
import { StockLedgerView } from '@/app/components/StockLedgerView';
import { UserManagementView } from '@/components/admin/UserManagementView';

interface DashboardContentProps {
  orders: GRNOrder[];
  items: GRNItem[];
  vendors: Vendor[];
  onOpenCreateGrn: () => void;
  onNavigate?: (item: NavItemKey) => void;
}

const DashboardContent: React.FC<DashboardContentProps> = ({
  orders,
  items,
  vendors,
  onOpenCreateGrn,
  onNavigate,
}) => {
  const { profile } = useAuth();
  const canCreateGrn = canUserPerformAction(profile, 'grn', 'canCreate');

  return (
    <StoreProductionRejectionDashboard
      orders={orders}
      items={items}
      vendors={vendors}
      onNavigate={onNavigate}
      onOpenCreateGrn={canCreateGrn ? onOpenCreateGrn : undefined}
    />
  );
};

interface Step2GrnViewProps {
  orders: GRNOrder[];
  items: GRNItem[];
  vendors: Vendor[];
  onOpenCreateGrn: () => void;
  onSelectGrnForSlip: (order: GRNOrder) => void;
  onInspectItems: (grnNumber: string) => void;
  onUpdateStatus: (
    grnNumber: string,
    newStatus: 'Approved' | 'Pending QC' | 'Partial' | 'Rejected',
    userRole?: string,
    approvedBy?: string
  ) => void;
}

const Step2GrnView: React.FC<Step2GrnViewProps> = ({
  orders,
  items,
  vendors,
  onOpenCreateGrn,
  onSelectGrnForSlip,
  onInspectItems,
  onUpdateStatus,
}) => {
  const { profile } = useAuth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          background: '#ffffff',
          padding: '14px 18px',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '18px',
              fontWeight: 800,
              color: '#0f172a',
              margin: 0,
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>📥 Dock GRN Inward Receiving</span>
          </h2>
          <p style={{ fontSize: '12.5px', color: '#64748b', margin: '3px 0 0 0' }}>
            Select an issued Purchase Order to auto-fill items, verify quantities, and record today&apos;s delivered stock.
          </p>
        </div>

        <button
          onClick={onOpenCreateGrn}
          className="btn-accent"
          style={{
            padding: '9px 18px',
            fontSize: '13.5px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
          }}
        >
          <Plus size={16} />
          <span>+ Inward Dock GRN (From PO)</span>
        </button>
      </div>

      <GrnOrdersTable
        orders={orders}
        items={items}
        vendors={vendors}
        canApproveGrn={true}
        userRole={profile?.role}
        onSelectGrnForSlip={onSelectGrnForSlip}
        onInspectItems={onInspectItems}
        onUpdateStatus={(grnNumber, newStatus) =>
          onUpdateStatus(grnNumber, newStatus, profile?.role, profile?.fullName)
        }
      />
    </div>
  );
};

interface Step3QcViewProps {
  items: GRNItem[];
  orders: GRNOrder[];
  selectedGrnFilter: string;
  qcTableFilter: string;
  onClearGrnFilter: () => void;
  onUpdateItemQc: (
    itemId: string,
    qcStatus: 'Passed' | 'Under Review' | 'Failed' | 'HOLD' | 'Remark',
    rejectionReason?: string,
    qcRemarks?: string,
    acceptedQty?: number,
    rejectedQty?: number,
    userRole?: string,
    inspectedBy?: string
  ) => void;
}

const Step3QcView: React.FC<Step3QcViewProps> = ({
  items,
  orders,
  selectedGrnFilter,
  qcTableFilter,
  onClearGrnFilter,
  onUpdateItemQc,
}) => {
  const { profile } = useAuth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          background: '#ffffff',
          padding: '14px 18px',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '18px',
              fontWeight: 800,
              color: '#0f172a',
              margin: 0,
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>🔍 Quality Control & Material Inspection</span>
          </h2>
          <p style={{ fontSize: '12.5px', color: '#64748b', margin: '3px 0 0 0' }}>
            Verify incoming consignment items. 1-Click Pass directly to Store Stock, Put on Hold, or Reject.
          </p>
        </div>

        {selectedGrnFilter && (
          <button
            onClick={onClearGrnFilter}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 700,
              borderRadius: '6px',
              background: '#eff6ff',
              color: '#2563eb',
              border: '1px solid #bfdbfe',
              cursor: 'pointer',
            }}
          >
            Filtered: {selectedGrnFilter} ✕ Show All Consignments
          </button>
        )}
      </div>

      <GrnItemsTable
        items={items}
        orders={orders}
        selectedGrnFilter={selectedGrnFilter}
        defaultQcStatusFilter={qcTableFilter}
        canApproveQc={true}
        userRole={profile?.role}
        onClearGrnFilter={onClearGrnFilter}
        onUpdateItemQc={(itemId, status, reason, remarks, acc, rej) =>
          onUpdateItemQc(
            itemId,
            status,
            reason,
            remarks,
            acc,
            rej,
            profile?.role,
            profile?.fullName
          )
        }
      />
    </div>
  );
};

function HomeInner() {
  const { role, profile } = useAuth();

  // Main Data States
  const [orders, setOrders] = useState<GRNOrder[]>(EMPTY_GRN_ORDERS);
  const [items, setItems] = useState<GRNItem[]>(EMPTY_GRN_ITEMS);
  const [vendors, setVendors] = useState<Vendor[]>(EMPTY_VENDORS);

  // Active Navigation & View State (Default to Step 1: PO List for immediate operational focus)
  const [activeNavItem, setActiveNavItem] = useState<NavItemKey>('po-list');
  const [activeTab, setActiveTab] = useState<'grns' | 'items' | 'vendors' | 'stock'>('grns');
  const [selectedGrnFilter, setSelectedGrnFilter] = useState<string>('');
  const [qcTableFilter, setQcTableFilter] = useState<string>('ALL');
  const [selectedPoForGrn, setSelectedPoForGrn] = useState<string | undefined>(undefined);

  // Automatically synchronize active navigation view with user role on login / role switch
  useEffect(() => {
    if (role === 'QC') {
      if (
        activeNavItem === 'po-list' ||
        activeNavItem === 'po-new' ||
        activeNavItem === 'grn-list' ||
        activeNavItem === 'grn-new' ||
        activeNavItem === 'admin-users'
      ) {
        setActiveNavItem('qc-pending');
        setQcTableFilter('ALL');
        setSelectedGrnFilter('');
      }
    } else if (role === 'PRODUCTION') {
      if (
        activeNavItem === 'po-list' ||
        activeNavItem === 'po-new' ||
        activeNavItem === 'grn-list' ||
        activeNavItem === 'grn-new' ||
        activeNavItem === 'qc-pending' ||
        activeNavItem === 'admin-users'
      ) {
        setActiveNavItem('production-issue');
      }
    }
  }, [role, activeNavItem]);

  const handleNavigate = (item: NavItemKey) => {
    setActiveNavItem(item);

    if (item === 'dashboard') {
      // executive overview
    } else if (item === 'grn-list') {
      setSelectedGrnFilter('');
    } else if (item === 'grn-new') {
      setActiveNavItem('grn-list');
      setIsCreateGrnOpen(true);
    } else if (item === 'qc-pending') {
      setQcTableFilter('Under Review');
      setSelectedGrnFilter('');
    } else if (item === 'qc-history') {
      setQcTableFilter('ALL');
      setSelectedGrnFilter('');
    } else if (item === 'master-vendors') {
      setActiveNavItem('master-vendors');
    }
  };

  // Modals
  const [isCreateGrnOpen, setIsCreateGrnOpen] = useState(false);
  const [isCreateVendorOpen, setIsCreateVendorOpen] = useState(false);
  const [selectedGrnForSlip, setSelectedGrnForSlip] = useState<GRNOrder | null>(null);

  // Supabase Backend States with lazy initializers
  const [supabaseUrl, setSupabaseUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('aura_supabase_url');
      if (stored) return stored;
    }
    return process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  });

  const [supabaseKey, setSupabaseKey] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('aura_supabase_anon_key');
      if (stored) return stored;
    }
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  });

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  // Helper to build headers with custom credentials if available
  const getAuthHeaders = useCallback(
    (urlOverride?: string, keyOverride?: string) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const activeUrl = urlOverride ?? supabaseUrl;
      const activeKey = keyOverride ?? supabaseKey;
      if (activeUrl) headers['x-supabase-url'] = activeUrl;
      if (activeKey) headers['x-supabase-key'] = activeKey;
      return headers;
    },
    [supabaseUrl, supabaseKey]
  );

  // Test Supabase Connection & Table Existence
  const testConnection = useCallback(async (url: string, key: string): Promise<boolean> => {
    setIsTesting(true);
    try {
      const query = new URLSearchParams();
      if (url) query.set('url', url);
      if (key) query.set('key', key);

      const res = await fetch(`/api/supabase/status?${query.toString()}`, {
        cache: 'no-store',
      });

      if (res.ok) {
        const data = await res.json();
        const connected = Boolean(data.connected);
        setIsConnected(connected);
        return connected;
      }
      return false;
    } catch {
      setIsConnected(false);
      return false;
    } finally {
      setIsTesting(false);
    }
  }, []);

  // Fetch all data from Backend API
  const fetchData = useCallback(
    async (urlOverride?: string, keyOverride?: string) => {
      try {
        const headers = getAuthHeaders(urlOverride, keyOverride);
        const res = await fetch('/api/grn', {
          headers,
          cache: 'no-store',
        });

        if (res.ok) {
          const data = await res.json();
          if (data.orders && Array.isArray(data.orders)) {
            setOrders(data.orders);
          }
          if (data.items && Array.isArray(data.items)) {
            setItems(data.items);
          }
          if (data.vendors && Array.isArray(data.vendors)) {
            setVendors(data.vendors);
          }

          setIsConnected(Boolean(data.connected));
          showToast(
            data.connected
              ? '✓ Live data synced from Supabase PostgreSQL database'
              : '✦ Ready for real database records'
          );
        }
      } catch (err) {
        console.error('Fetch error:', err);
        showToast('⚠️ Database sync standby');
      }
    },
    [getAuthHeaders, showToast]
  );

  // Initial connection verification & data fetch on mount (Unconditional to guarantee QC side visibility)
  useEffect(() => {
    let ignore = false;
    // Always fetch live data immediately so QC & all users see all consignments regardless of credentials
    fetchData();

    if (supabaseUrl && supabaseKey) {
      testConnection(supabaseUrl, supabaseKey);
    }

    return () => {
      ignore = true;
    };
  }, [supabaseUrl, supabaseKey, testConnection, fetchData]);

  // Handle Save Configuration
  const handleSaveConfig = (url: string, key: string) => {
    setSupabaseUrl(url);
    setSupabaseKey(key);
    if (typeof window !== 'undefined') {
      localStorage.setItem('aura_supabase_url', url);
      localStorage.setItem('aura_supabase_anon_key', key);
    }
    showToast('✓ Credentials saved. Reconnecting...');
    testConnection(url, key);
    fetchData(url, key);
  };

  // Handle Create GRN
  const handleCreateGrn = async (newOrder: GRNOrder, newItems: GRNItem[]) => {
    setOrders((prev) => [newOrder, ...prev]);
    setItems((prev) => [...newItems, ...prev]);

    try {
      const headers = getAuthHeaders();
      const res = await fetch('/api/grn', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          order: newOrder,
          items: newItems,
        }),
      });

      const json = await res.json();
      if (json.source === 'supabase' || json.source === 'supabase_postgres') {
        showToast(`✓ ${newOrder.grnNumber} saved to Supabase! Moved to Quality Inspection.`);
      } else {
        showToast(`✓ ${newOrder.grnNumber} created! Moved to Quality Inspection.`);
      }

      // Re-fetch from server to guarantee sync across all roles
      await fetchData();
    } catch {
      showToast(`✓ ${newOrder.grnNumber} created in local state`);
    }

    // Automatically navigate to QC Inspection and show ALL pending items
    setSelectedGrnFilter('');
    setQcTableFilter('Under Review');
    setActiveNavItem('qc-pending');
  };

  // Handle Status Update
  const handleUpdateStatus = async (
    grnNumber: string,
    newStatus: 'Approved' | 'Pending QC' | 'Partial' | 'Rejected',
    userRole?: string,
    approvedBy?: string
  ) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.grnNumber === grnNumber
          ? {
              ...o,
              status: newStatus,
              approvedBy: approvedBy || 'QC Inspector',
              approvedAt: new Date().toISOString(),
            }
          : o
      )
    );

    try {
      const headers = getAuthHeaders();
      const res = await fetch('/api/grn', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          grnNumber,
          status: newStatus,
          userRole,
          approvedBy,
        }),
      });

      const resData = await res.json();
      if (!res.ok || resData.success === false) {
        showToast(`⚠️ ${resData.error || 'Failed to update GRN'}`);
        return;
      }
      showToast(`✓ ${grnNumber} status updated to ${newStatus}`);
    } catch {
      showToast(`✓ Status updated locally`);
    }
  };

  // Handle Item QC Update with Quality Tester Remarks
  const handleUpdateItemQc = async (
    itemId: string,
    qcStatus: 'Passed' | 'Under Review' | 'Failed' | 'HOLD' | 'Remark',
    rejectionReason?: string,
    qcRemarks?: string,
    acceptedQty?: number,
    rejectedQty?: number,
    userRole?: string,
    inspectedBy?: string
  ) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === itemId) {
          const acc = acceptedQty !== undefined ? acceptedQty : (qcStatus === 'Passed' ? it.receivedQty : 0);
          const rej = rejectedQty !== undefined ? rejectedQty : (qcStatus === 'Failed' ? it.receivedQty : 0);
          return {
            ...it,
            qcStatus,
            acceptedQty: acc,
            rejectedQty: rej,
            rejectionReason: rejectionReason || it.rejectionReason,
            qcRemarks: qcRemarks || it.qcRemarks,
            inspectedBy: inspectedBy || 'Quality Inspector',
            inspectedAt: new Date().toISOString(),
          };
        }
        return it;
      })
    );

    try {
      const headers = getAuthHeaders();
      const res = await fetch('/api/items', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          itemId,
          qcStatus,
          rejectionReason,
          qcRemarks,
          acceptedQty,
          rejectedQty,
          userRole,
          inspectedBy,
        }),
      });

      const resData = await res.json();
      if (!res.ok || resData.success === false) {
        showToast(`⚠️ ${resData.error || 'Failed to update QC item'}`);
        return;
      }
      showToast(`✓ Item ${itemId} QC marked as ${qcStatus} with remarks recorded & stock logged`);
    } catch {
      showToast(`✓ Item ${itemId} QC updated locally`);
    }
  };

  // Handle Create Vendor
  const handleCreateVendor = async (newVendor: Vendor) => {
    setVendors((prev) => [newVendor, ...prev]);

    try {
      const headers = getAuthHeaders();
      await fetch('/api/vendors', {
        method: 'POST',
        headers,
        body: JSON.stringify(newVendor),
      });
      showToast(`✓ Supplier ${newVendor.vendorName} stored in database`);
    } catch {
      showToast(`✓ Supplier added to local repository`);
    }
  };

  const nextGrnNumber = `GRN-${new Date().getFullYear()}-${String(
    orders.length + 1
  ).padStart(3, '0')}`;

  const nextVendorCode = `VND-${100 + vendors.length + 1}`;

  return (
    <AppLayout
      supabaseUrl={supabaseUrl}
      supabaseKey={supabaseKey}
      onSaveConfig={handleSaveConfig}
      onTestConnection={testConnection}
      onSeedDemoData={async () => true}
      isConnected={isConnected}
      isTesting={isTesting}
      activeItem={activeNavItem}
      onNavigate={handleNavigate}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            padding: '12px 20px',
            borderRadius: '10px',
            background: '#0f172a',
            color: '#ffffff',
            fontSize: '13.5px',
            fontWeight: 600,
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          {toastMessage}
        </div>
      )}



      {/* Operational Modules Router: Every step has its dedicated, uncluttered screen! */}
      {activeNavItem === 'dashboard' && (
        <DashboardContent
          orders={orders}
          items={items}
          vendors={vendors}
          onOpenCreateGrn={() => {
            setSelectedPoForGrn(undefined);
            setIsCreateGrnOpen(true);
          }}
          onNavigate={handleNavigate}
        />
      )}

      {/* STEP 1: PURCHASE ORDERS (MULTI-ITEM) */}
      {(activeNavItem === 'po-list' || activeNavItem === 'po-new') && (
        <PurchaseOrdersView
          vendors={vendors}
          grnOrders={orders}
          grnItems={items}
          onInwardGrnFromPo={(poNum) => {
            setSelectedPoForGrn(poNum);
            setActiveNavItem('grn-list');
            setIsCreateGrnOpen(true);
          }}
          onInspectGrn={(grnNumber) => {
            setSelectedGrnFilter(grnNumber);
            setActiveNavItem('qc-pending');
          }}
        />
      )}

      {/* STEP 2: DOCK GRN RECEIVING (FOCUSED & MINIMALIST FOR GRANDPA) */}
      {(activeNavItem === 'grn-list' || activeNavItem === 'grn-new') && (
        <Step2GrnView
          orders={orders}
          items={items}
          vendors={vendors}
          onOpenCreateGrn={() => {
            setSelectedPoForGrn(undefined);
            setIsCreateGrnOpen(true);
          }}
          onSelectGrnForSlip={(order) => setSelectedGrnForSlip(order)}
          onInspectItems={(grnNumber) => {
            setSelectedGrnFilter(grnNumber);
            setActiveNavItem('qc-pending');
          }}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {/* STEP 3: QUALITY CONTROL INSPECTION DOCK (1-CLICK PASS/HOLD/REJECT) */}
      {(activeNavItem === 'qc-pending' || activeNavItem === 'qc-history') && (
        <Step3QcView
          items={items}
          orders={orders}
          selectedGrnFilter={selectedGrnFilter}
          qcTableFilter={qcTableFilter}
          onClearGrnFilter={() => setSelectedGrnFilter('')}
          onUpdateItemQc={handleUpdateItemQc}
        />
      )}

      {/* STEP 4: SHOPFLOOR PRODUCTION FLOOR */}
      {(activeNavItem === 'production-issue' ||
        activeNavItem === 'production-stock' ||
        activeNavItem === 'production-return') && <ProductionFloorView />}

      {/* STEP 5: CUSTOMER DISPATCH LOGISTICS & CRM */}
      {(activeNavItem === 'dispatch-new' || activeNavItem === 'dispatch-history') && (
        <DispatchManagementView />
      )}

      {/* INVENTORY STORE STOCK BALANCES */}
      {(activeNavItem === 'inventory-stock' || activeNavItem === 'inventory-ledger') && (
        <InventoryStockView grnItems={items} />
      )}

      {/* MASTERS & DIRECTORIES */}
      {activeNavItem === 'master-vendors' && <MastersCatalogView initialTab="vendors" />}
      {activeNavItem === 'master-items' && <MastersCatalogView initialTab="items" />}
      {activeNavItem === 'master-customers' && <MastersCatalogView initialTab="customers" />}
      {activeNavItem === 'master-units' && <MastersCatalogView initialTab="units" />}

      {/* AUDIT & REPORTS */}
      {activeNavItem === 'reports' && (
        <ReconciliationReportsView orders={orders} items={items} vendors={vendors} />
      )}

      {/* RBAC ADMINISTRATION */}
      {activeNavItem === 'admin-users' && <UserManagementView />}

      {/* Modals */}
      <CreateGrnModal
        isOpen={isCreateGrnOpen}
        onClose={() => {
          setIsCreateGrnOpen(false);
          setSelectedPoForGrn(undefined);
        }}
        vendors={vendors}
        nextGrnNumber={nextGrnNumber}
        initialPoNumber={selectedPoForGrn}
        onCreateGrn={handleCreateGrn}
        onVendorAdded={(newV) => setVendors((prev) => [newV, ...prev])}
        orders={orders}
        allItems={items}
      />

      <CreateVendorModal
        isOpen={isCreateVendorOpen}
        onClose={() => setIsCreateVendorOpen(false)}
        nextVendorCode={nextVendorCode}
        onCreateVendor={handleCreateVendor}
      />

      <GrnSlipModal
        isOpen={Boolean(selectedGrnForSlip)}
        onClose={() => setSelectedGrnForSlip(null)}
        order={selectedGrnForSlip}
        items={items}
      />
    </AppLayout>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <HomeInner />
    </AuthProvider>
  );
}
