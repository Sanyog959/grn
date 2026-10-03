'use client';

import React, { useState, useMemo } from 'react';
import { GRNItem, GRNOrder } from '@/types/inventory';
import {
  Search,
  X,
  ShieldCheck,
  Check,
  AlertCircle,
  Filter,
  FileText,
  MessageSquare,
  ClipboardCheck,
  Lock,
  Layers,
  Calendar,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { GrnBatchesModal } from './GrnBatchesModal';

interface GrnItemsTableProps {
  items: GRNItem[];
  orders?: GRNOrder[];
  selectedGrnFilter: string;
  defaultQcStatusFilter?: string;
  canApproveQc?: boolean;
  userRole?: string;
  onClearGrnFilter: () => void;
  onUpdateItemQc: (
    itemId: string,
    status: 'Passed' | 'Under Review' | 'Failed' | 'HOLD' | 'Remark',
    reason?: string,
    qcRemarks?: string,
    acceptedQty?: number,
    rejectedQty?: number
  ) => void;
}

export const GrnItemsTable: React.FC<GrnItemsTableProps> = ({
  items,
  orders = [],
  selectedGrnFilter,
  defaultQcStatusFilter,
  canApproveQc = true,
  userRole,
  onClearGrnFilter,
  onUpdateItemQc,
}) => {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [qcStatusFilter, setQcStatusFilter] = useState(defaultQcStatusFilter || 'ALL');

  // Modal State for Item Inward Batches
  const [batchItemModal, setBatchItemModal] = useState<GRNItem | null>(null);

  // Read-only inspection details modal for Admin / Viewer
  const [viewingAuditItem, setViewingAuditItem] = useState<GRNItem | null>(null);

  // Scope filter: ALL_CRM (Default: all QC records across CRM) vs MY_QC (QC Inspector's own inspected items)
  const [scopeMode, setScopeMode] = useState<'ALL_CRM' | 'MY_QC'>('ALL_CRM');

  // Inspection Modal State for Quality Tester
  const [inspectingItem, setInspectingItem] = useState<GRNItem | null>(null);
  const [modalStatus, setModalStatus] = useState<'Passed' | 'Under Review' | 'Failed' | 'HOLD' | 'Remark'>('Passed');
  const [modalAcceptedQty, setModalAcceptedQty] = useState<number>(0);
  const [modalRejectedQty, setModalRejectedQty] = useState<number>(0);
  const [modalRemarks, setModalRemarks] = useState<string>('');
  const [modalRejectionReason, setModalRejectionReason] = useState<string>('');

  // Users with role QC, role ADMIN, or canApproveQc permission can perform inspection / Pass / Hold / Reject.
  const isQcInspector =
    userRole === 'QC' ||
    profile?.role === 'QC' ||
    profile?.role === 'ADMIN' ||
    canApproveQc === true;
  const inspectorName = profile?.fullName || profile?.email || '';

  const PRESET_REMARKS = [
    '✓ Dimensional tolerances verified within specs',
    '✓ Surface finish, coating & hardness approved',
    '✓ Chemical mill test certificate verified',
    '⚠️ Minor cosmetic scratch - conditional accept',
    '✕ Dimensional deviation beyond drawing tolerance',
    '✕ Packaging damage / surface corrosion defect',
    '⏸ Awaiting supplier metallurgical test certificate',
  ];

  React.useEffect(() => {
    if (defaultQcStatusFilter !== undefined) {
      setQcStatusFilter(defaultQcStatusFilter);
    }
  }, [defaultQcStatusFilter]);

  // Quick 1-click Approve
  const handleQuickApprove = (item: GRNItem) => {
    onUpdateItemQc(
      item.id,
      'Passed',
      undefined,
      'Passed all QC dimensional & material standards. Accepted into Store.',
      item.receivedQty,
      0
    );
  };

  // Quick 1-click Hold
  const handleQuickHold = (item: GRNItem) => {
    const reason = window.prompt(
      'Enter reason for putting this item ON HOLD (e.g. Awaiting lab test report):',
      'Under lab inspection & test verification'
    );
    if (reason !== null && reason.trim()) {
      onUpdateItemQc(item.id, 'HOLD', reason.trim(), reason.trim(), 0, 0);
    }
  };

  // Quick 1-click Reject
  const handleQuickReject = (item: GRNItem) => {
    const reason = window.prompt(
      'Enter rejection reason for this item:',
      'Surface defect / dimensional tolerance deviation'
    );
    if (reason !== null && reason.trim()) {
      onUpdateItemQc(item.id, 'Failed', reason.trim(), reason.trim(), 0, item.receivedQty);
    }
  };

  // Open inspection modal for an item
  const openInspectionModal = (item: GRNItem, initialStatus?: 'Passed' | 'Under Review' | 'Failed' | 'HOLD' | 'Remark') => {
    setInspectingItem(item);
    const status = initialStatus || item.qcStatus || 'Passed';
    setModalStatus(status);
    setModalAcceptedQty(status === 'Passed' ? item.receivedQty : item.acceptedQty || 0);
    setModalRejectedQty(status === 'Failed' ? item.receivedQty : item.rejectedQty || 0);
    setModalRemarks(item.qcRemarks || '');
    setModalRejectionReason(item.rejectionReason || '');
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectingItem) return;

    onUpdateItemQc(
      inspectingItem.id,
      modalStatus,
      modalStatus === 'Failed' ? modalRejectionReason || modalRemarks : undefined,
      modalRemarks,
      modalAcceptedQty,
      modalRejectedQty
    );

    setInspectingItem(null);
  };

  // Scope items specifically to selected GRN if filter is active
  const scopedItems = useMemo(() => {
    return selectedGrnFilter
      ? items.filter((it) => it.grnNumber.trim().toLowerCase() === selectedGrnFilter.trim().toLowerCase())
      : items;
  }, [items, selectedGrnFilter]);

  // QC records scope: by default ALL_CRM displays all QC records across CRM (Admin & QC can see all history).
  // QC inspector can also toggle to MY_QC to see only items they personally inspected.
  const userScopedItems = useMemo(() => {
    return scopedItems.filter((it) => {
      if (scopeMode === 'MY_QC' && inspectorName) {
        if (it.qcStatus === 'Under Review' || it.qcStatus === 'HOLD' || it.qcStatus === 'Remark' || !it.qcStatus) return true;
        return (
          it.inspectedBy &&
          (it.inspectedBy.toLowerCase().includes(inspectorName.toLowerCase()) ||
            inspectorName.toLowerCase().includes(it.inspectedBy.toLowerCase()))
        );
      }
      return true;
    });
  }, [scopedItems, scopeMode, inspectorName]);

  // Priority counts for QC in exact required order: Pending first, Passed, Failed, Hold
  const pendingCount = userScopedItems.filter(
    (i) => i.qcStatus === 'Under Review' || !i.qcStatus || (i.qcStatus as string) === 'Pending QC'
  ).length;
  const passedCount = userScopedItems.filter((i) => i.qcStatus === 'Passed').length;
  const failedCount = userScopedItems.filter((i) => i.qcStatus === 'Failed').length;
  const holdCount = userScopedItems.filter((i) => i.qcStatus === 'HOLD' || i.qcStatus === 'Remark').length;

  // Status counts scoped to active inward consignment
  const getScopedStatusCount = (status: string) => {
    if (status === 'ALL') return userScopedItems.length;
    if (status === 'Under Review') return pendingCount;
    if (status === 'Passed') return passedCount;
    if (status === 'Failed') return failedCount;
    if (status === 'HOLD') return holdCount;
    if (status === 'SCRAP') return userScopedItems.filter((it) => it.isScrap).length;
    return userScopedItems.filter((it) => it.qcStatus === status).length;
  };

  // Filtered items based on search and status filter
  const filteredItems = userScopedItems.filter((it) => {
    const matchesSearch =
      it.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      it.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (it.batchNumber && it.batchNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (it.qcRemarks && it.qcRemarks.toLowerCase().includes(searchTerm.toLowerCase())) ||
      it.grnNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      qcStatusFilter === 'ALL'
        ? true
        : qcStatusFilter === 'Under Review'
        ? it.qcStatus === 'Under Review' || !it.qcStatus || (it.qcStatus as string) === 'Pending QC'
        : qcStatusFilter === 'HOLD'
        ? it.qcStatus === 'HOLD' || it.qcStatus === 'Remark'
        : qcStatusFilter === 'SCRAP'
        ? it.isScrap
        : it.qcStatus === qcStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const getQcBadge = (status: string) => {
    switch (status) {
      case 'Passed':
        return 'badge-passed';
      case 'Failed':
        return 'badge-failed';
      case 'HOLD':
        return 'badge-remark';
      case 'Remark':
        return 'badge-remark';
      case 'Under Review':
      default:
        return 'badge-review';
    }
  };

  // Bulk approve all pending items in view
  const handleApproveAllPending = () => {
    const pendingItems = filteredItems.filter(
      (it) => it.qcStatus === 'Under Review' || it.qcStatus === 'HOLD'
    );
    if (pendingItems.length === 0) {
      alert('No pending items to approve.');
      return;
    }
    if (
      window.confirm(
        `Approve all ${pendingItems.length} pending item(s) and accept into Store Stock?`
      )
    ) {
      pendingItems.forEach((it) => handleQuickApprove(it));
    }
  };

  // Find order associated with batchItemModal
  const activeOrderForBatch = useMemo(() => {
    if (!batchItemModal) return null;
    return (
      orders.find(
        (o) => o.grnNumber.trim().toLowerCase() === batchItemModal.grnNumber.trim().toLowerCase()
      ) ||
      ({
        grnNumber: batchItemModal.grnNumber,
        poNumber: 'PO-REF',
        vendorName: 'Consignment Supplier',
        receivedDate: new Date().toISOString().slice(0, 10),
        warehouse: 'Main Factory Store',
        carrierTracking: '',
        inspector: batchItemModal.inspectedBy || 'Quality Inspector',
        totalItems: batchItemModal.receivedQty,
        totalValue: 0,
        status: 'Pending QC',
      } as GRNOrder)
    );
  }, [batchItemModal, orders]);

  // Dynamic empty state explaining why items might not be visible and how to reveal them
  const renderEmptyQcState = () => {
    if (selectedGrnFilter) {
      return (
        <div style={{ textAlign: 'center', padding: '36px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔍</div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            No line items found for Consignment: {selectedGrnFilter}
          </div>
          <div style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '14px' }}>
            There are {items.length} total line items across all factory inward consignments.
          </div>
          <button
            type="button"
            onClick={onClearGrnFilter}
            className="btn-accent"
            style={{ padding: '6px 16px', fontSize: '12px', fontWeight: 700 }}
          >
            Show All Plant Consignments ({items.length} items) ✕
          </button>
        </div>
      );
    }

    if (qcStatusFilter === 'Under Review' && pendingCount === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '36px 16px', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
          <div style={{ fontSize: '28px', marginBottom: '6px' }}>✓</div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#166534', marginBottom: '4px' }}>
            Dock Inward Check Complete!
          </div>
          <div style={{ fontSize: '12.5px', color: '#15803d', marginBottom: '14px' }}>
            0 items pending QC verification. All inward consignments have been inspected!
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setQcStatusFilter('Passed')}
              className="btn-outline"
              style={{ padding: '6px 14px', fontSize: '12px', background: '#ffffff', color: '#166534', borderColor: '#86efac', fontWeight: 700 }}
            >
              View Passed Stock ({passedCount})
            </button>
            <button
              type="button"
              onClick={() => setQcStatusFilter('ALL')}
              className="btn-primary"
              style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 700 }}
            >
              View All Consignments ({userScopedItems.length})
            </button>
          </div>
        </div>
      );
    }

    if (scopeMode === 'MY_QC' && userScopedItems.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '36px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            No personal inspections recorded under your name
          </div>
          <div style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '14px' }}>
            No inspection verdicts logged under {inspectorName || 'your account'} yet.
          </div>
          <button
            type="button"
            onClick={() => setScopeMode('ALL_CRM')}
            className="btn-accent"
            style={{ padding: '6px 16px', fontSize: '12px', fontWeight: 700 }}
          >
            Switch to All Plant History ({scopedItems.length} items)
          </button>
        </div>
      );
    }

    return (
      <div style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8' }}>
        No line items found matching your filters.
      </div>
    );
  };

  return (
    <div className="card-compact" style={{ padding: '16px', marginBottom: '24px' }}>
      {/* Active GRN Filter Notice */}
      {selectedGrnFilter && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderRadius: '8px',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={15} color="#2563eb" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e3a8a' }}>
              Consignment: <strong style={{ fontFamily: 'var(--font-mono)' }}>{selectedGrnFilter}</strong> ({scopedItems.length} Products in this Inward)
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {isQcInspector && (
              <button
                onClick={handleApproveAllPending}
                style={{
                  background: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ✓ Pass All in this GRN
              </button>
            )}
            <button
              onClick={onClearGrnFilter}
              className="btn-outline"
              style={{ padding: '4px 10px', fontSize: '11.5px', height: '28px', background: '#ffffff' }}
            >
              Show All GRNs ✕
            </button>
          </div>
        </div>
      )}

      {/* Priority QC Status Cards - EXACT ORDER: Pending First, Passed, Failed, Hold */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        {/* 1. PENDING FIRST */}
        <div
          onClick={() => setQcStatusFilter('Under Review')}
          style={{
            background: qcStatusFilter === 'Under Review' ? '#fff7ed' : '#ffffff',
            border: `1.5px solid ${qcStatusFilter === 'Under Review' ? '#ea580c' : '#fed7aa'}`,
            borderRadius: '10px',
            padding: '14px',
            cursor: 'pointer',
            boxShadow: qcStatusFilter === 'Under Review' ? '0 4px 12px rgba(234, 88, 12, 0.15)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#ea580c', letterSpacing: '0.05em' }}>
              ⏳ Pending QC First
            </span>
            <AlertCircle size={16} color="#ea580c" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#9a3412' }}>{pendingCount}</div>
          <div style={{ fontSize: '11.5px', color: '#c2410c' }}>Awaiting dock verification</div>
        </div>

        {/* 2. PASSED */}
        <div
          onClick={() => setQcStatusFilter('Passed')}
          style={{
            background: qcStatusFilter === 'Passed' ? '#f0fdf4' : '#ffffff',
            border: `1.5px solid ${qcStatusFilter === 'Passed' ? '#16a34a' : '#bbf7d0'}`,
            borderRadius: '10px',
            padding: '14px',
            cursor: 'pointer',
            boxShadow: qcStatusFilter === 'Passed' ? '0 4px 12px rgba(22, 163, 74, 0.15)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#16a34a', letterSpacing: '0.05em' }}>
              ✓ Passed Stock
            </span>
            <Check size={16} color="#16a34a" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#166534' }}>{passedCount}</div>
          <div style={{ fontSize: '11.5px', color: '#15803d' }}>Accepted to Store</div>
        </div>

        {/* 3. FAILED / REJECTED */}
        <div
          onClick={() => setQcStatusFilter('Failed')}
          style={{
            background: qcStatusFilter === 'Failed' ? '#fef2f2' : '#ffffff',
            border: `1.5px solid ${qcStatusFilter === 'Failed' ? '#dc2626' : '#fecaca'}`,
            borderRadius: '10px',
            padding: '14px',
            cursor: 'pointer',
            boxShadow: qcStatusFilter === 'Failed' ? '0 4px 12px rgba(220, 38, 38, 0.15)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#dc2626', letterSpacing: '0.05em' }}>
              ✕ Failed / Rejected
            </span>
            <X size={16} color="#dc2626" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#991b1b' }}>{failedCount}</div>
          <div style={{ fontSize: '11.5px', color: '#b91c1c' }}>Quarantined / Return</div>
        </div>

        {/* 4. ON HOLD */}
        <div
          onClick={() => setQcStatusFilter('HOLD')}
          style={{
            background: qcStatusFilter === 'HOLD' ? '#fffbeb' : '#ffffff',
            border: `1.5px solid ${qcStatusFilter === 'HOLD' ? '#d97706' : '#fde68a'}`,
            borderRadius: '10px',
            padding: '14px',
            cursor: 'pointer',
            boxShadow: qcStatusFilter === 'HOLD' ? '0 4px 12px rgba(217, 119, 6, 0.15)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#d97706', letterSpacing: '0.05em' }}>
              ⏸ On Hold
            </span>
            <AlertCircle size={16} color="#d97706" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#92400e' }}>{holdCount}</div>
          <div style={{ fontSize: '11.5px', color: '#b45309' }}>Under testing / remark</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        {/* Search */}
        <div className="search-box" style={{ width: '280px' }}>
          <Search size={14} className="search-icon" />
          <input
            type="text"
            className="form-input"
            placeholder="Search SKU, Description, Batch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: '8px',
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '2px',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Scope Pill: All CRM History vs My Inspected Items */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
          <button
            type="button"
            onClick={() => setScopeMode('ALL_CRM')}
            style={{
              padding: '5px 12px',
              fontSize: '11.5px',
              fontWeight: scopeMode === 'ALL_CRM' ? 700 : 500,
              background: scopeMode === 'ALL_CRM' ? '#ffffff' : 'transparent',
              color: scopeMode === 'ALL_CRM' ? '#0f172a' : '#64748b',
              border: 'none',
              borderRadius: '6px',
              boxShadow: scopeMode === 'ALL_CRM' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
            }}
          >
            All CRM History
          </button>
          {isQcInspector && (
            <button
              type="button"
              onClick={() => setScopeMode('MY_QC')}
              style={{
                padding: '5px 12px',
                fontSize: '11.5px',
                fontWeight: scopeMode === 'MY_QC' ? 700 : 500,
                background: scopeMode === 'MY_QC' ? '#ffffff' : 'transparent',
                color: scopeMode === 'MY_QC' ? '#0f172a' : '#64748b',
                border: 'none',
                borderRadius: '6px',
                boxShadow: scopeMode === 'MY_QC' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
              }}
            >
              My Inspections
            </button>
          )}
        </div>

        {/* Priority Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'Under Review', label: `⏳ Pending (${pendingCount})` },
            { id: 'Passed', label: `✓ Passed (${passedCount})` },
            { id: 'Failed', label: `✕ Failed (${failedCount})` },
            { id: 'HOLD', label: `⏸ On Hold (${holdCount})` },
            { id: 'ALL', label: `All In View (${userScopedItems.length})` },
          ].map((tab) => {
            const isActive = qcStatusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setQcStatusFilter(tab.id)}
                className={`filter-pill ${isActive ? 'active' : ''}`}
                style={{
                  fontWeight: isActive ? 800 : 600,
                  fontSize: '12px',
                  padding: '6px 12px',
                }}
              >
                {tab.label}
              </button>
            );
          })}

          {isQcInspector && (
            <button
              onClick={handleApproveAllPending}
              style={{
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                marginLeft: '6px',
              }}
            >
              <Check size={14} />
              <span>Pass All Pending</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="desktop-table-view aurora-table-wrapper" style={{ overflowX: 'auto' }}>
        <table className="aurora-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: '920px' }}>
          <thead>
            <tr>
              <th style={{ width: '150px' }}>SKU & Description</th>
              <th style={{ width: '110px', whiteSpace: 'nowrap' }}>GRN Reference</th>
              <th style={{ width: '180px', whiteSpace: 'nowrap' }}>Quantities (PO / Inward / Pending)</th>
              <th style={{ width: '110px', whiteSpace: 'nowrap' }}>Unit & Price</th>
              <th style={{ width: '95px', whiteSpace: 'nowrap' }}>Batch / Lot</th>
              <th style={{ width: '115px', whiteSpace: 'nowrap' }}>QC Status</th>
              <th>Tester Remarks & Audit</th>
              <th style={{ textAlign: 'right', width: '200px', whiteSpace: 'nowrap' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '24px 16px' }}>
                  {renderEmptyQcState()}
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const po = Number(item.orderedQty || item.poQty) || 0;
                const rec = Number(item.receivedQty) || 0;
                const pending = Math.max(0, po - rec);
                return (
                  <tr key={item.id}>
                    {/* SKU & Description */}
                    <td>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              fontWeight: 800,
                              fontFamily: 'var(--font-mono)',
                              fontSize: '12.5px',
                              color: '#0f172a',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.itemCode}
                          </span>
                          {item.isScrap && (
                            <span
                              style={{
                                fontSize: '9.5px',
                                fontWeight: 700,
                                background: '#fef3c7',
                                color: '#b45309',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                border: '1px solid #fde68a',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              SCRAP
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: '11.5px',
                            color: '#64748b',
                            marginTop: '2px',
                            maxWidth: '180px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={item.description}
                        >
                          {item.description}
                        </div>
                      </div>
                    </td>

                    {/* GRN Reference */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11.5px',
                          color: '#2563eb',
                          fontWeight: 700,
                          background: '#eff6ff',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: '1px solid #bfdbfe',
                        }}
                      >
                        {item.grnNumber}
                      </span>
                    </td>

                    {/* Quantities (PO / Inward / Pending) */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ fontSize: '12px', color: '#0f172a' }}>
                          PO Target: <strong>{po}</strong> {item.unit}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#16a34a', fontWeight: 700 }}>
                          Received: +{rec} {item.unit}
                        </div>
                        {pending > 0 ? (
                          <div style={{ fontSize: '11px', color: '#b45309', fontWeight: 600 }}>
                            Pending Balance: {pending} {item.unit}
                          </div>
                        ) : (
                          <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>
                            ✓ 100% Inward Completed
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Unit & Pricing */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: '12px' }}>
                        <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#0f172a' }}>
                          ₹{item.unitPrice}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          per {item.unit}
                        </div>
                      </div>
                    </td>

                    {/* Batch / Lot */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11px',
                          background: '#f8fafc',
                          padding: '3px 6px',
                          borderRadius: '4px',
                          border: '1px solid #e2e8f0',
                          color: '#334155',
                        }}
                      >
                        {item.batchNumber || 'BATCH-01'}
                      </span>
                    </td>

                    {/* QC Status */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className={`badge-status ${getQcBadge(item.qcStatus)}`}>
                        {item.qcStatus}
                      </span>
                    </td>

                    {/* Tester Remarks & Inspector Column */}
                    <td>
                      <div style={{ fontSize: '12px', maxWidth: '240px' }}>
                        {item.qcRemarks ? (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', color: '#334155' }}>
                            <MessageSquare size={13} color="#2563eb" style={{ marginTop: '2px', flexShrink: 0 }} />
                            <span style={{ lineHeight: '1.3' }}>{item.qcRemarks}</span>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '11px' }}>
                            No remarks recorded
                          </span>
                        )}

                        {item.rejectionReason && (
                          <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '3px', fontWeight: 600 }}>
                            Reason: {item.rejectionReason}
                          </div>
                        )}

                        {item.inspectedBy && (
                          <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>
                            By {item.inspectedBy}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* QC & Inward Actions */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {/* Batches Button for this specific product */}
                        <button
                          type="button"
                          onClick={() => setBatchItemModal(item)}
                          className="btn-outline"
                          style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            height: '28px',
                            borderColor: '#c7d2fe',
                            color: '#4338ca',
                            background: '#f5f3ff',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                          }}
                          title="Track split inward installments & receive history for this product"
                        >
                          <Layers size={12} />
                          <span>Batches</span>
                        </button>

                        {/* QC Inspection Actions: Restricted to QC Inspector. Admin/Viewer only sees status & audit remarks */}
                        {!isQcInspector ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: '6px',
                                background: item.qcStatus === 'Passed' ? '#dcfce7' : item.qcStatus === 'Failed' ? '#fee2e2' : item.qcStatus === 'HOLD' ? '#fef3c7' : '#f1f5f9',
                                color: item.qcStatus === 'Passed' ? '#15803d' : item.qcStatus === 'Failed' ? '#b91c1c' : item.qcStatus === 'HOLD' ? '#b45309' : '#64748b',
                                border: `1px solid ${item.qcStatus === 'Passed' ? '#86efac' : item.qcStatus === 'Failed' ? '#fca5a5' : item.qcStatus === 'HOLD' ? '#fde68a' : '#cbd5e1'}`,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {item.qcStatus === 'Passed' ? '✓ QC Passed' : item.qcStatus === 'Failed' ? '✕ QC Rejected' : item.qcStatus === 'HOLD' ? '⏸ On Hold' : '⏳ Pending QC'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setViewingAuditItem(item)}
                              title="View Inspector Technical Remarks & Inspection Audit"
                              className="btn-outline"
                              style={{ padding: '3px 8px', fontSize: '11px', height: '26px', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                            >
                              <FileText size={12} color="#2563eb" />
                              <span>Remarks</span>
                            </button>
                          </div>
                        ) : item.qcStatus !== 'Passed' ? (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              type="button"
                              onClick={() => handleQuickApprove(item)}
                              title="Approve immediately & move to Store Stock"
                              style={{
                                background: '#10b981',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <Check size={12} />
                              <span>Pass</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleQuickHold(item)}
                              title="Put on Hold with reason"
                              style={{
                                background: '#f59e0b',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <span>Hold</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleQuickReject(item)}
                              title="Reject with defect reason"
                              style={{
                                background: '#ef4444',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <span>Reject</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => openInspectionModal(item)}
                              title="Detailed Inspection & Remarks"
                              className="btn-outline"
                              style={{ padding: '4px 6px', fontSize: '11px', height: '26px' }}
                            >
                              <ClipboardCheck size={12} color="#2563eb" />
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                background: '#dcfce7',
                                color: '#15803d',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: '6px',
                                border: '1px solid #86efac',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <Check size={12} />
                              <span>In Store Stock</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => openInspectionModal(item)}
                              title="Edit Inspection Details"
                              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '11px' }}
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View for QC & GRN Line Items */}
      <div className="mobile-card-view">
        {filteredItems.length === 0 ? (
          <div className="mobile-card-item" style={{ padding: '0', background: 'transparent', border: 'none' }}>
            {renderEmptyQcState()}
          </div>
        ) : (
          filteredItems.map((item) => {
            const po = Number(item.orderedQty || item.poQty) || 0;
            const rec = Number(item.receivedQty) || 0;
            const pending = Math.max(0, po - rec);

            return (
              <div key={`m-${item.id}`} className="mobile-card-item">
                <div className="mobile-card-header">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#0f172a' }}>
                        {item.itemCode}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11px',
                          color: '#2563eb',
                          fontWeight: 700,
                          background: '#eff6ff',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          border: '1px solid #bfdbfe',
                        }}
                      >
                        {item.grnNumber}
                      </span>
                      {item.isScrap && (
                        <span style={{ fontSize: '9.5px', fontWeight: 700, background: '#fef3c7', color: '#b45309', padding: '1px 5px', borderRadius: '3px', border: '1px solid #fde68a' }}>
                          SCRAP
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                      {item.description}
                    </div>
                  </div>
                  <span className={`badge-status ${getQcBadge(item.qcStatus)}`} style={{ whiteSpace: 'nowrap' }}>
                    {item.qcStatus}
                  </span>
                </div>

                <div className="mobile-card-grid">
                  <div className="mobile-card-field">
                    <span className="mobile-card-field-label">RECEIVED / INWARD</span>
                    <span className="mobile-card-field-val" style={{ color: '#16a34a', fontWeight: 800, fontSize: '13px' }}>
                      +{rec} {item.unit}
                    </span>
                  </div>
                  <div className="mobile-card-field">
                    <span className="mobile-card-field-label">PO TARGET</span>
                    <span className="mobile-card-field-val">{po} {item.unit}</span>
                  </div>
                  <div className="mobile-card-field">
                    <span className="mobile-card-field-label">PENDING BALANCE</span>
                    <span className="mobile-card-field-val" style={{ color: pending > 0 ? '#b45309' : '#16a34a', fontWeight: 700 }}>
                      {pending > 0 ? `${pending} ${item.unit}` : '✓ Inward Complete'}
                    </span>
                  </div>
                  <div className="mobile-card-field">
                    <span className="mobile-card-field-label">UNIT PRICE & BATCH</span>
                    <span className="mobile-card-field-val">
                      ₹{item.unitPrice}/{item.unit} &bull; {item.batchNumber || 'BATCH-01'}
                    </span>
                  </div>
                </div>

                {/* Remarks & Audit trail */}
                {(item.qcRemarks || item.rejectionReason || item.inspectedBy) && (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px', fontSize: '11.5px' }}>
                    {item.qcRemarks && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', color: '#334155' }}>
                        <MessageSquare size={12} color="#2563eb" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <span>{item.qcRemarks}</span>
                      </div>
                    )}
                    {item.rejectionReason && (
                      <div style={{ color: '#dc2626', fontWeight: 600, marginTop: '2px' }}>
                        Reason: {item.rejectionReason}
                      </div>
                    )}
                    {item.inspectedBy && (
                      <div style={{ color: '#64748b', fontSize: '10.5px', marginTop: '2px' }}>
                        Inspected by {item.inspectedBy}
                      </div>
                    )}
                  </div>
                )}

                {/* Mobile Actions */}
                <div className="mobile-card-actions" style={{ flexWrap: 'wrap', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setBatchItemModal(item)}
                    className="btn-outline"
                    style={{ flex: 1, padding: '6px 10px', fontSize: '11.5px', justifyContent: 'center', borderColor: '#c7d2fe', color: '#4338ca', background: '#f5f3ff' }}
                  >
                    <Layers size={13} />
                    <span>Batches</span>
                  </button>

                  {!isQcInspector ? (
                    <button
                      type="button"
                      onClick={() => setViewingAuditItem(item)}
                      className="btn-outline"
                      style={{ flex: 1, padding: '6px 10px', fontSize: '11.5px', justifyContent: 'center' }}
                    >
                      <FileText size={13} color="#2563eb" />
                      <span>Remarks & Audit</span>
                    </button>
                  ) : item.qcStatus !== 'Passed' ? (
                    <div style={{ display: 'flex', gap: '6px', flex: 2 }}>
                      <button
                        type="button"
                        onClick={() => handleQuickApprove(item)}
                        style={{
                          flex: 1,
                          background: '#10b981',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 8px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '3px',
                        }}
                      >
                        <Check size={13} />
                        <span>Pass</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickHold(item)}
                        style={{
                          flex: 1,
                          background: '#f59e0b',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 8px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Hold
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickReject(item)}
                        style={{
                          flex: 1,
                          background: '#ef4444',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 8px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => openInspectionModal(item)}
                        className="btn-outline"
                        style={{ padding: '6px 8px' }}
                        title="Detailed Inspection"
                      >
                        <ClipboardCheck size={13} color="#2563eb" />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'flex-end' }}>
                      <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', border: '1px solid #86efac' }}>
                        ✓ In Store Stock
                      </span>
                      <button
                        type="button"
                        onClick={() => openInspectionModal(item)}
                        style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline' }}
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* QC Inspection & Remarks Modal */}
      {inspectingItem && (
        <div className="modal-overlay" onClick={() => setInspectingItem(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px', padding: '24px' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} color="#2563eb" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                    QC Inspection & Verification
                  </h3>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    SKU: {inspectingItem.itemCode} &bull; {inspectingItem.description}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setInspectingItem(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleModalSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Inspection Verdict *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setModalStatus('Passed');
                      setModalAcceptedQty(inspectingItem.receivedQty);
                      setModalRejectedQty(0);
                    }}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      border: modalStatus === 'Passed' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                      background: modalStatus === 'Passed' ? '#dcfce7' : '#ffffff',
                      color: modalStatus === 'Passed' ? '#15803d' : '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    ✓ Pass
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setModalStatus('HOLD');
                      setModalAcceptedQty(0);
                      setModalRejectedQty(0);
                    }}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      border: modalStatus === 'HOLD' ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                      background: modalStatus === 'HOLD' ? '#fef3c7' : '#ffffff',
                      color: modalStatus === 'HOLD' ? '#b45309' : '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    ⏸ Hold
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setModalStatus('Remark');
                    }}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      border: modalStatus === 'Remark' ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                      background: modalStatus === 'Remark' ? '#eff6ff' : '#ffffff',
                      color: modalStatus === 'Remark' ? '#1d4ed8' : '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    💬 Review
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setModalStatus('Failed');
                      setModalAcceptedQty(0);
                      setModalRejectedQty(inspectingItem.receivedQty);
                    }}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      border: modalStatus === 'Failed' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                      background: modalStatus === 'Failed' ? '#fee2e2' : '#ffffff',
                      color: modalStatus === 'Failed' ? '#b91c1c' : '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Accepted Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={inspectingItem.receivedQty}
                    className="form-input"
                    value={modalAcceptedQty}
                    onChange={(e) => setModalAcceptedQty(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Rejected Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={inspectingItem.receivedQty}
                    className="form-input"
                    value={modalRejectedQty}
                    onChange={(e) => setModalRejectedQty(Number(e.target.value))}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>
                    Technical QC Remarks & Test Observations *
                  </label>
                  <span style={{ fontSize: '10.5px', color: '#64748b' }}>Click preset to add 👇</span>
                </div>

                {/* Preset Remark Chips for Quality Inspector */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
                  {PRESET_REMARKS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setModalRemarks((prev) => (prev ? `${prev} | ${preset}` : preset));
                      }}
                      style={{
                        padding: '3px 8px',
                        fontSize: '11px',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: '#334155',
                        textAlign: 'left',
                        transition: 'all 0.1s ease',
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <textarea
                  required
                  rows={3}
                  className="form-input"
                  style={{ resize: 'vertical' }}
                  placeholder="Dimensional tolerance, hardness check results, surface finish..."
                  value={modalRemarks}
                  onChange={(e) => setModalRemarks(e.target.value)}
                />
              </div>

              {modalStatus === 'Failed' && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: '4px' }}>
                    Primary Rejection Reason *
                  </label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Diameter out of spec (+0.05mm), thread burr"
                    value={modalRejectionReason}
                    onChange={(e) => setModalRejectionReason(e.target.value)}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setInspectingItem(null)}
                  className="btn-outline"
                  style={{ padding: '6px 14px', fontSize: '12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '6px 18px', fontSize: '12px' }}
                >
                  Confirm Verdict & Notify Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Read-Only QC Audit Log Modal for Admin / Manager / Viewer */}
      {viewingAuditItem && (
        <div className="modal-overlay" onClick={() => setViewingAuditItem(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px', padding: '24px' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} color="#0f766e" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                    QC Verification Audit Record
                  </h3>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    Consignment: {viewingAuditItem.grnNumber} &bull; {viewingAuditItem.itemCode}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewingAuditItem(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              <div
                style={{
                  background: '#f8fafc',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '2px' }}>
                  {viewingAuditItem.description}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  SKU: <strong style={{ color: '#0f766e' }}>{viewingAuditItem.itemCode}</strong> &bull; Batch: {viewingAuditItem.batchNumber || 'N/A'}
                </div>
              </div>

              {/* Status and Quantities */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>RECEIVED</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                    {viewingAuditItem.receivedQty} {viewingAuditItem.unit}
                  </div>
                </div>

                <div style={{ background: '#f0fdf4', padding: '10px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700 }}>QC ACCEPTED</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#166534' }}>
                    {viewingAuditItem.acceptedQty || (viewingAuditItem.qcStatus === 'Passed' ? viewingAuditItem.receivedQty : 0)} {viewingAuditItem.unit}
                  </div>
                </div>

                <div style={{ background: '#fef2f2', padding: '10px', borderRadius: '6px', border: '1px solid #fecaca' }}>
                  <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: 700 }}>REJECTED</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#991b1b' }}>
                    {viewingAuditItem.rejectedQty || (viewingAuditItem.qcStatus === 'Failed' ? viewingAuditItem.receivedQty : 0)} {viewingAuditItem.unit}
                  </div>
                </div>
              </div>

              {/* Inspector & Status */}
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>QC VERDICT STATUS:</span>
                  <span className={`badge-status ${getQcBadge(viewingAuditItem.qcStatus)}`}>
                    {viewingAuditItem.qcStatus || 'Under Review'}
                  </span>
                </div>
                <div style={{ fontSize: '12.5px', color: '#334155' }}>
                  {viewingAuditItem.qcStatus === 'Passed' ? 'Accepted by: ' : viewingAuditItem.qcStatus === 'Failed' ? 'Rejected by: ' : 'Inspected by: '}
                  <strong style={{ color: '#0f172a' }}>{viewingAuditItem.inspectedBy || 'Quality Control Officer'}</strong>
                  {viewingAuditItem.inspectedAt && (
                    <span style={{ color: '#64748b', marginLeft: '6px' }}>
                      on {new Date(viewingAuditItem.inspectedAt).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              </div>

              {/* Technical Remarks */}
              <div style={{ background: '#eff6ff', padding: '12px 14px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: '11px', color: '#1e40af', fontWeight: 700, marginBottom: '4px' }}>
                  INSPECTOR TECHNICAL REMARKS & OBSERVATIONS:
                </div>
                <div style={{ fontSize: '13px', color: '#1e3a8a', lineHeight: 1.5 }}>
                  {viewingAuditItem.qcRemarks || 'No detailed technical remarks were logged.'}
                </div>
                {viewingAuditItem.rejectionReason && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #bfdbfe', color: '#b91c1c', fontWeight: 600 }}>
                    Rejection Defect: {viewingAuditItem.rejectionReason}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
              <button
                type="button"
                onClick={() => setViewingAuditItem(null)}
                className="btn-primary"
                style={{ padding: '6px 18px', fontSize: '12px' }}
              >
                Close Audit Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Partial & Split Delivery Batches for a specific item */}
      {batchItemModal && activeOrderForBatch && (
        <GrnBatchesModal
          isOpen={Boolean(batchItemModal)}
          onClose={() => setBatchItemModal(null)}
          order={activeOrderForBatch}
          item={batchItemModal}
          items={items}
        />
      )}
    </div>
  );
};
