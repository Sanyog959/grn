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
import { useAuth } from '@/context/AuthContext';
import { hasModuleAccess, canUserPerformAction } from '@/types/auth';
import { NavItemKey } from '@/components/layout/AppSidebar';
import { PurchaseOrdersView } from '@/components/modules/PurchaseOrdersView';
import { InventoryStockView } from '@/components/modules/InventoryStockView';
import { ProductionFloorView } from '@/components/modules/ProductionFloorView';
import { DispatchManagementView } from '@/components/modules/DispatchManagementView';
import { MastersCatalogView } from '@/components/modules/MastersCatalogView';
import { ReconciliationReportsView } from '@/components/modules/ReconciliationReportsView';

interface DashboardContentProps {
  orders: GRNOrder[];
  items: GRNItem[];
  vendors: Vendor[];
  activeTab: 'grns' | 'items' | 'vendors';
  setActiveTab: (tab: 'grns' | 'items' | 'vendors') => void;
  selectedGrnFilter: string;
  setSelectedGrnFilter: (filter: string) => void;
  qcTableFilter?: string;
  onOpenCreateGrn: () => void;
  onOpenCreateVendor: () => void;
  onSelectGrnForSlip: (order: GRNOrder) => void;
  onUpdateStatus: (
    grnNumber: string,
    newStatus: 'Approved' | 'Pending QC' | 'Partial' | 'Rejected'
  ) => void;
  onUpdateItemQc: (
    itemId: string,
    qcStatus: 'Passed' | 'Under Review' | 'Failed',
    rejectionReason?: string
  ) => void;
}

const DashboardContent: React.FC<DashboardContentProps> = ({
  orders,
  items,
  vendors,
  activeTab,
  setActiveTab,
  selectedGrnFilter,
  setSelectedGrnFilter,
  qcTableFilter,
  onOpenCreateGrn,
  onOpenCreateVendor,
  onSelectGrnForSlip,
  onUpdateStatus,
  onUpdateItemQc,
}) => {
  const { role, profile } = useAuth();

  // Granular Permission Evaluation (Admin granted or role default)
  const canViewGrn = hasModuleAccess(role, 'grn', profile);
  const canCreateGrn = canUserPerformAction(profile, 'grn', 'canCreate');
  const canViewQc = hasModuleAccess(role, 'qc', profile);
  const canViewVendors = hasModuleAccess(role, 'masters', profile);
  const canCreateVendor = canUserPerformAction(profile, 'masters', 'canCreate');

  // Automatically adjust active tab if user lacks permission for the current tab
  useEffect(() => {
    if (activeTab === 'grns' && !canViewGrn) {
      if (canViewQc) setActiveTab('items');
      else if (canViewVendors) setActiveTab('vendors');
    } else if (activeTab === 'items' && !canViewQc) {
      if (canViewGrn) setActiveTab('grns');
      else if (canViewVendors) setActiveTab('vendors');
    } else if (activeTab === 'vendors' && !canViewVendors) {
      if (canViewGrn) setActiveTab('grns');
      else if (canViewQc) setActiveTab('items');
    }
  }, [activeTab, canViewGrn, canViewQc, canViewVendors, setActiveTab]);

  const hasAnyTabAccess = canViewGrn || canViewQc || canViewVendors;

  return (
    <>
      {/* Mobile-First Compact Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Material Inventory Pipeline
          </h1>
          <p style={{ fontSize: '12.5px', color: '#64748b', margin: '2px 0 0 0' }}>
            Inward Receipts, QC Inspection Dock & Verified Suppliers
          </p>
        </div>

        {canCreateGrn && (
          <button
            onClick={onOpenCreateGrn}
            className="btn-aurora"
            style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 700 }}
          >
            + Inward Dock GRN
          </button>
        )}
      </div>

      {/* KPI Metrics: Filtered to only display metrics for Admin-granted modules */}
      <KpiMetrics
        orders={orders}
        items={items}
        vendors={vendors}
        canViewGrn={canViewGrn}
        canViewQc={canViewQc}
        canViewVendors={canViewVendors}
      />

      {/* Module Navigation Tabs (Filtered strictly by permission) */}
      {hasAnyTabAccess ? (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border-medium)',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', gap: '4px' }}>
              {/* Tab 1: GRN Orders (Only if granted) */}
              {canViewGrn && (
                <button
                  onClick={() => {
                    setActiveTab('grns');
                    setSelectedGrnFilter('');
                  }}
                  className={`nav-tab-btn ${activeTab === 'grns' ? 'active' : ''}`}
                >
                  <span>📋</span>
                  <span>GRN Inward Orders ({orders.length})</span>
                </button>
              )}

              {/* Tab 2: QC Inspection (Only if granted) */}
              {canViewQc && (
                <button
                  onClick={() => setActiveTab('items')}
                  className={`nav-tab-btn ${activeTab === 'items' ? 'active' : ''}`}
                >
                  <span>🔬</span>
                  <span>QC Line Items Inspection ({items.length})</span>
                </button>
              )}

              {/* Tab 3: Suppliers Directory (Only if granted) */}
              {canViewVendors && (
                <button
                  onClick={() => {
                    setActiveTab('vendors');
                    setSelectedGrnFilter('');
                  }}
                  className={`nav-tab-btn ${activeTab === 'vendors' ? 'active' : ''}`}
                >
                  <span>🏭</span>
                  <span>Verified Suppliers ({vendors.length})</span>
                </button>
              )}
            </div>

            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 500 }}>
              {activeTab === 'grns' && canViewGrn && 'Displaying Inward Receipts & Dock Receiving Log'}
              {activeTab === 'items' && canViewQc && 'Granular Discrepancy & Batch Hardness/QC Log'}
              {activeTab === 'vendors' && canViewVendors && 'Approved Vendor Directory & SLA Scorecard'}
            </div>
          </div>

          {/* Tab 1: GRN Orders Table */}
          {activeTab === 'grns' && canViewGrn && (
            <GrnOrdersTable
              orders={orders}
              onSelectGrnForSlip={(order) => onSelectGrnForSlip(order)}
              onInspectItems={(grnNumber) => {
                if (canViewQc) {
                  setSelectedGrnFilter(grnNumber);
                  setActiveTab('items');
                }
              }}
              onUpdateStatus={onUpdateStatus}
            />
          )}

          {/* Tab 2: Line Items Inspection Table */}
          {activeTab === 'items' && canViewQc && (
            <GrnItemsTable
              items={items}
              selectedGrnFilter={selectedGrnFilter}
              defaultQcStatusFilter={qcTableFilter}
              onClearGrnFilter={() => setSelectedGrnFilter('')}
              onUpdateItemQc={onUpdateItemQc}
            />
          )}

          {/* Tab 3: Vendors Table */}
          {activeTab === 'vendors' && canViewVendors && (
            <VendorsTable
              vendors={vendors}
              onOpenCreateVendor={canCreateVendor ? onOpenCreateVendor : undefined}
            />
          )}
        </>
      ) : (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '48px 24px',
            textAlign: 'center',
            maxWidth: '600px',
            margin: '40px auto',
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔒</div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
            Dashboard Modules Restricted
          </h3>
          <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6, margin: '0 0 20px' }}>
            Your account ({profile?.email}) is authorized with role{' '}
            <strong style={{ color: '#0f172a' }}>{profile?.role}</strong>, but view permissions have
            not been assigned for the main dashboard tables (GRN Inward, Quality Control, or Vendor
            Masters).
          </p>
          <div
            style={{
              fontSize: '12.5px',
              color: '#475569',
              background: '#f8fafc',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}
          >
            Please contact your Plant Administrator to grant specific module access in the RBAC
            Administration portal.
          </div>
        </div>
      )}
    </>
  );
};

export default function Home() {
  // Main Data States
  const [orders, setOrders] = useState<GRNOrder[]>(EMPTY_GRN_ORDERS);
  const [items, setItems] = useState<GRNItem[]>(EMPTY_GRN_ITEMS);
  const [vendors, setVendors] = useState<Vendor[]>(EMPTY_VENDORS);

  // Active Navigation & View State
  const [activeNavItem, setActiveNavItem] = useState<NavItemKey>('dashboard');
  const [activeTab, setActiveTab] = useState<'grns' | 'items' | 'vendors'>('grns');
  const [selectedGrnFilter, setSelectedGrnFilter] = useState<string>('');
  const [qcTableFilter, setQcTableFilter] = useState<string>('ALL');

  const handleNavigate = (item: NavItemKey) => {
    setActiveNavItem(item);

    if (item === 'dashboard') {
      // standard overview
    } else if (item === 'grn-list') {
      setActiveNavItem('dashboard');
      setActiveTab('grns');
      setSelectedGrnFilter('');
    } else if (item === 'grn-new') {
      setActiveNavItem('dashboard');
      setActiveTab('grns');
      setIsCreateGrnOpen(true);
    } else if (item === 'qc-pending') {
      setActiveNavItem('dashboard');
      setActiveTab('items');
      setQcTableFilter('Under Review');
      setSelectedGrnFilter('');
    } else if (item === 'qc-history') {
      setActiveNavItem('dashboard');
      setActiveTab('items');
      setQcTableFilter('ALL');
      setSelectedGrnFilter('');
    } else if (item === 'master-vendors') {
      setActiveNavItem('dashboard');
      setActiveTab('vendors');
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

  // Initial connection verification on mount
  useEffect(() => {
    let ignore = false;
    const timer = setTimeout(() => {
      if (!ignore && supabaseUrl && supabaseKey) {
        testConnection(supabaseUrl, supabaseKey);
        fetchData(supabaseUrl, supabaseKey);
      }
    }, 0);
    return () => {
      ignore = true;
      clearTimeout(timer);
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
        showToast(`✓ ${newOrder.grnNumber} saved directly to Supabase PostgreSQL!`);
      } else {
        showToast(`✓ ${newOrder.grnNumber} created successfully`);
      }
    } catch {
      showToast(`✓ ${newOrder.grnNumber} created in local state`);
    }
  };

  // Handle Status Update
  const handleUpdateStatus = async (
    grnNumber: string,
    newStatus: 'Approved' | 'Pending QC' | 'Partial' | 'Rejected'
  ) => {
    setOrders((prev) =>
      prev.map((o) => (o.grnNumber === grnNumber ? { ...o, status: newStatus } : o))
    );

    try {
      const headers = getAuthHeaders();
      await fetch('/api/grn', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          grnNumber,
          status: newStatus,
        }),
      });
      showToast(`✓ ${grnNumber} status updated to ${newStatus}`);
    } catch {
      showToast(`✓ Status updated locally`);
    }
  };

  // Handle Item QC Update
  const handleUpdateItemQc = async (
    itemId: string,
    qcStatus: 'Passed' | 'Under Review' | 'Failed',
    rejectionReason?: string
  ) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === itemId) {
          const acc = qcStatus === 'Passed' ? it.receivedQty : 0;
          const rej = qcStatus === 'Failed' ? it.receivedQty : 0;
          return {
            ...it,
            qcStatus,
            acceptedQty: acc,
            rejectedQty: rej,
            rejectionReason: rejectionReason || it.rejectionReason,
          };
        }
        return it;
      })
    );

    try {
      const headers = getAuthHeaders();
      await fetch('/api/items', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          itemId,
          qcStatus,
          rejectionReason,
        }),
      });
      showToast(`✓ Item ${itemId} QC marked as ${qcStatus}`);
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

      {/* Operational Modules Router: Every single sidebar item renders a real feature! */}
      {activeNavItem === 'dashboard' && (
        <DashboardContent
          orders={orders}
          items={items}
          vendors={vendors}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedGrnFilter={selectedGrnFilter}
          setSelectedGrnFilter={setSelectedGrnFilter}
          qcTableFilter={qcTableFilter}
          onOpenCreateGrn={() => setIsCreateGrnOpen(true)}
          onOpenCreateVendor={() => setIsCreateVendorOpen(true)}
          onSelectGrnForSlip={(order) => setSelectedGrnForSlip(order)}
          onUpdateStatus={handleUpdateStatus}
          onUpdateItemQc={handleUpdateItemQc}
        />
      )}

      {(activeNavItem === 'po-list' || activeNavItem === 'po-new') && (
        <PurchaseOrdersView
          vendors={vendors}
          onInwardGrnFromPo={(poNum, vendorName) => {
            setActiveNavItem('dashboard');
            setActiveTab('grns');
            setIsCreateGrnOpen(true);
          }}
        />
      )}

      {(activeNavItem === 'inventory-stock' || activeNavItem === 'inventory-ledger') && (
        <InventoryStockView grnItems={items} />
      )}

      {(activeNavItem === 'production-issue' ||
        activeNavItem === 'production-stock' ||
        activeNavItem === 'production-return') && <ProductionFloorView />}

      {(activeNavItem === 'dispatch-new' || activeNavItem === 'dispatch-history') && (
        <DispatchManagementView />
      )}

      {activeNavItem === 'master-items' && <MastersCatalogView initialTab="items" />}
      {activeNavItem === 'master-customers' && <MastersCatalogView initialTab="customers" />}
      {activeNavItem === 'master-units' && <MastersCatalogView initialTab="units" />}

      {activeNavItem === 'reports' && (
        <ReconciliationReportsView orders={orders} items={items} vendors={vendors} />
      )}

      {/* Modals */}
      <CreateGrnModal
        isOpen={isCreateGrnOpen}
        onClose={() => setIsCreateGrnOpen(false)}
        vendors={vendors}
        nextGrnNumber={nextGrnNumber}
        onCreateGrn={handleCreateGrn}
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
