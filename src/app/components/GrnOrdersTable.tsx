'use client';

import React, { useState } from 'react';
import { GRNOrder, GRNItem, Vendor } from '@/types/inventory';
import {
  Search,
  X,
  FileText,
  Warehouse,
  Calendar,
  Layers,
  LayoutGrid,
  ShieldCheck,
  Send,
  PackageCheck,
  Building2,
  Tag,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { GrnBatchesModal } from './GrnBatchesModal';
import { VendorHistoryModal } from './VendorHistoryModal';

interface GrnOrdersTableProps {
  orders: GRNOrder[];
  items?: GRNItem[];
  vendors?: Vendor[];
  canApproveGrn?: boolean;
  userRole?: string;
  onSelectGrnForSlip: (order: GRNOrder) => void;
  onInspectItems: (grnNumber: string) => void;
  onUpdateStatus: (
    grnNumber: string,
    newStatus: 'Approved' | 'Pending QC' | 'Partial' | 'Rejected'
  ) => void;
}

export const GrnOrdersTable: React.FC<GrnOrdersTableProps> = ({
  orders,
  items = [],
  vendors = [],
  canApproveGrn,
  userRole,
  onSelectGrnForSlip,
  onInspectItems,
  onUpdateStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'auto' | 'table' | 'cards'>('cards');
  const [selectedOrderForBatches, setSelectedOrderForBatches] = useState<GRNOrder | null>(null);
  const [selectedVendorForHistory, setSelectedVendorForHistory] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const handleSendToQc = async (target: GRNOrder | string, isScrap?: boolean) => {
    const grnNumber = typeof target === 'string' ? target : target.grnNumber;
    const scrapFlag = typeof target === 'string' ? Boolean(isScrap) : Boolean(target.isScrapReceipt);
    try {
      const res = await fetch('/api/grn/send-to-qc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grnNumber,
          sentBy: userRole || 'Administrator',
          isScrapOrJunk: scrapFlag,
          notes: `GRN ${grnNumber} dispatched to QC testing dock.`,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionNotice(`✓ GRN ${grnNumber} sent to QC! Email dispatched to Admin & QC Inspector.`);
        setTimeout(() => setActionNotice(null), 4000);
      }
    } catch {
      setActionNotice('Failed to dispatch alert to QC.');
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const isRestrictedAdmin = userRole === 'ADMIN' || canApproveGrn === false;

  const warehouses = Array.from(new Set(orders.map((o) => o.warehouse))).filter(Boolean);

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.grnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.inspector && o.inspector.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (o.carrierTracking && o.carrierTracking.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'ALL' ? true : o.status.toLowerCase() === statusFilter.toLowerCase();

    const matchesWarehouse =
      warehouseFilter === 'ALL' ? true : o.warehouse === warehouseFilter;

    return matchesSearch && matchesStatus && matchesWarehouse;
  });

  // Pagination (20 items per page)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, warehouseFilter]);

  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'badge-approved';
      case 'Pending QC':
        return 'badge-pending';
      case 'Partial':
        return 'badge-partial';
      case 'Rejected':
        return 'badge-rejected';
      default:
        return 'badge-pending';
    }
  };

  const getStatusDotColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return '#16a34a';
      case 'Pending QC':
        return '#d97706';
      case 'Partial':
        return '#64748b';
      case 'Rejected':
        return '#dc2626';
      default:
        return '#d97706';
    }
  };

  const getStatusCount = (status: string) => {
    if (status === 'ALL') return orders.length;
    return orders.filter((o) => o.status.toLowerCase() === status.toLowerCase()).length;
  };

  return (
    <div className="card-compact" style={{ padding: '16px', marginBottom: '24px' }}>
      {/* Top Filter & Toolbar Bar */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        {/* Row 1: Search & View Mode Switcher */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Search Box */}
          <div className="search-box" style={{ flex: '1 1 260px', maxWidth: '400px' }}>
            <Search size={14} className="search-icon" />
            <input
              type="text"
              className="form-input"
              placeholder="Search GRN #, PO #, Vendor, Tracking, Inspector..."
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
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Right Toolbar: Warehouse Filter & Cards/Table View Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {warehouses.length > 0 && (
              <select
                className="form-select"
                style={{ width: 'auto', minWidth: '150px', height: '28px', fontSize: '11.5px', padding: '2px 8px' }}
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
              >
                <option value="ALL">All Warehouses ({orders.length})</option>
                {warehouses.map((wh) => (
                  <option key={wh} value={wh}>
                    {wh}
                  </option>
                ))}
              </select>
            )}

            {/* View Mode Toggle */}
            <div
              style={{
                display: 'inline-flex',
                background: '#f1f5f9',
                padding: '2px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className="btn-outline"
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  height: '28px',
                  background: viewMode === 'cards' ? '#ffffff' : 'transparent',
                  border: viewMode === 'cards' ? '1px solid #cbd5e1' : 'none',
                  color: viewMode === 'cards' ? '#0f172a' : '#64748b',
                  fontWeight: viewMode === 'cards' ? 700 : 500,
                  boxShadow: viewMode === 'cards' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                }}
                title="Cards View"
              >
                <LayoutGrid size={13} />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className="btn-outline"
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  height: '28px',
                  background: viewMode === 'table' ? '#ffffff' : 'transparent',
                  border: viewMode === 'table' ? '1px solid #cbd5e1' : 'none',
                  color: viewMode === 'table' ? '#0f172a' : '#64748b',
                  fontWeight: viewMode === 'table' ? 700 : 500,
                  boxShadow: viewMode === 'table' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                }}
                title="Table View"
              >
                <FileText size={13} />
                <span>Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Status Filter Segmented Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
          {['ALL', 'Pending QC', 'Approved', 'Partial', 'Rejected'].map((status) => {
            const count = getStatusCount(status);
            const isActive = statusFilter === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`filter-pill ${isActive ? 'active' : ''}`}
                style={{ flexShrink: 0 }}
              >
                {status !== 'ALL' && (
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: isActive ? '#ffffff' : getStatusDotColor(status),
                    }}
                  />
                )}
                <span>{status === 'ALL' ? 'All GRNs' : status}</span>
                <span
                  style={{
                    fontSize: '11px',
                    opacity: isActive ? 0.9 : 0.65,
                    fontWeight: 700,
                  }}
                >
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {actionNotice && (
        <div
          style={{
            padding: '8px 14px',
            marginBottom: '14px',
            borderRadius: '6px',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            color: '#1d4ed8',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={15} color="#2563eb" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* No Results Alert */}
      {filteredOrders.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '36px 16px',
            background: '#f8fafc',
            borderRadius: '8px',
            border: '1px dashed #cbd5e1',
            color: '#64748b',
          }}
        >
          <PackageCheck size={28} color="#94a3b8" style={{ margin: '0 auto 8px', display: 'block' }} />
          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '13.5px', marginBottom: '4px' }}>
            No Matching Goods Received Notes
          </div>
          <div style={{ fontSize: '12px' }}>
            Try adjusting your search query, status filter, or warehouse selection.
          </div>
        </div>
      ) : (
        <>
          {/* =========================================================================
              VIEW 1: High-End Enterprise Card View (Structured with the requested 6 rows)
              Rows: GRN & PO Details | Supplier / Vendor | Date | Items & Value | Status | Actions
              ========================================================================= */}
          {viewMode === 'cards' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                gap: '16px',
              }}
            >
              {paginatedOrders.map((order) => {
                const orderSpecificItems = items.filter(
                  (it) => it.grnNumber.trim().toLowerCase() === order.grnNumber.trim().toLowerCase()
                );
                return (
                  <div
                    key={`card-${order.grnNumber}`}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '16px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    }}
                  >
                    {/* Row 1: GRN & PO Details */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 800,
                            fontSize: '14px',
                            color: '#0f172a',
                            background: '#f8fafc',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                          }}
                        >
                          {order.grnNumber}
                        </span>
                        <span
                          style={{
                            fontSize: '11.5px',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: '#eff6ff',
                            color: '#2563eb',
                            border: '1px solid #bfdbfe',
                          }}
                        >
                          PO #{order.poNumber}
                        </span>
                      </div>

                      {order.isScrapReceipt ? (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#b45309',
                            background: '#fef3c7',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            border: '1px solid #fde68a',
                          }}
                        >
                          ⚠️ Scrap Inward
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#64748b',
                            background: '#f8fafc',
                            padding: '2px 8px',
                            borderRadius: '12px',
                          }}
                        >
                          Standard Consignment
                        </span>
                      )}
                    </div>

                    {/* Row 2: Supplier / Vendor (with clickable Vendor History Tag) */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #f1f5f9',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            background: '#0f172a',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '12px',
                            flexShrink: 0,
                          }}
                        >
                          {order.vendorName.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: '13px',
                              color: '#0f172a',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {order.vendorName}
                          </div>
                          <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                            Supplier / Manufacturer
                          </div>
                        </div>
                      </div>

                      {/* Clickable Vendor History Tag */}
                      <button
                        type="button"
                        onClick={() => setSelectedVendorForHistory(order.vendorName)}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          color: '#2563eb',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          padding: '4px 8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          transition: 'all 0.15s ease',
                          flexShrink: 0,
                        }}
                        title="View complete purchase, sales & delivery history for this vendor"
                      >
                        <Tag size={12} color="#2563eb" />
                        <span>🏷️ History</span>
                      </button>
                    </div>

                    {/* Row 3: Date */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        color: '#475569',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Calendar size={13} color="#64748b" />
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>
                          Inward Date: {order.receivedDate}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Warehouse size={13} color="#64748b" />
                        <span>{order.warehouse}</span>
                      </div>
                    </div>

                    {/* Row 4: Items & Value */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: '#f0f9ff',
                        borderRadius: '8px',
                        border: '1px solid #e0f2fe',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' }}>
                          Total Inward Value
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-mono)' }}>
                          ₹{(Number(order.totalValue) || 0).toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' }}>
                          Inwarded Items
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0284c7' }}>
                          {order.totalItems} units {orderSpecificItems.length > 0 && `(${orderSpecificItems.length} products)`}
                        </div>
                      </div>
                    </div>

                    {/* Row 5: Status */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: '4px',
                      }}
                    >
                      <span className={`badge-status ${getStatusClass(order.status)}`}>
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: getStatusDotColor(order.status),
                          }}
                        />
                        {order.status}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: '#64748b' }}>
                        <ShieldCheck size={13} color="#2563eb" />
                        <span>Inspector: <strong style={{ color: '#0f172a' }}>{order.inspector || 'QC Lead'}</strong></span>
                      </div>
                    </div>

                    {/* Row 6: Actions (High-End, Polished UI Buttons) */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '6px',
                        paddingTop: '10px',
                        borderTop: '1px solid #f1f5f9',
                      }}
                    >
                      {/* Batches / Staggered Delivery */}
                      <button
                        type="button"
                        onClick={() => setSelectedOrderForBatches(order)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          padding: '7px 4px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          borderRadius: '6px',
                          border: '1px solid #c7d2fe',
                          background: 'linear-gradient(180deg, #f5f3ff 0%, #ede9fe 100%)',
                          color: '#4338ca',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: '0 1px 2px rgba(67, 56, 202, 0.08)',
                        }}
                        title="View & Add Staggered Inward Batches (100 -> 30, 40, 30)"
                      >
                        <Layers size={13} />
                        <span>Batches</span>
                      </button>

                      {/* To QC */}
                      <button
                        type="button"
                        onClick={() => handleSendToQc(order)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          padding: '7px 4px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          borderRadius: '6px',
                          border: '1px solid #bae6fd',
                          background: 'linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 100%)',
                          color: '#0369a1',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: '0 1px 2px rgba(2, 132, 199, 0.08)',
                        }}
                        title="Dispatch alert to QC Testing Dock and Notify Admin"
                      >
                        <Send size={13} />
                        <span>To QC</span>
                      </button>

                      {/* Inspect QC */}
                      <button
                        type="button"
                        onClick={() => onInspectItems(order.grnNumber)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          padding: '7px 4px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          borderRadius: '6px',
                          border: '1px solid #bbf7d0',
                          background: 'linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%)',
                          color: '#15803d',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: '0 1px 2px rgba(21, 128, 61, 0.08)',
                        }}
                        title="Open Quality Inspection & Dimensional Verification"
                      >
                        <ShieldCheck size={13} />
                        <span>Inspect</span>
                      </button>

                      {/* Slip */}
                      <button
                        type="button"
                        onClick={() => onSelectGrnForSlip(order)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          padding: '7px 4px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                          color: '#334155',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                        }}
                        title="Generate Official MIMS Inward Gate Slip"
                      >
                        <FileText size={13} />
                        <span>Slip</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* =========================================================================
              VIEW 2: Precision Desktop Enterprise Table
              Columns: GRN & PO Details | Supplier / Vendor | Date | Items & Value | Status | Actions
              ========================================================================= */}
          {viewMode === 'table' && (
            <div className="aurora-table-wrapper" style={{ overflowX: 'auto' }}>
              <table className="aurora-table">
                <thead>
                  <tr>
                    <th style={{ width: '160px' }}>GRN & PO Details</th>
                    <th style={{ minWidth: '200px' }}>Supplier / Vendor</th>
                    <th style={{ width: '160px' }}>Date</th>
                    <th style={{ width: '160px' }}>Items & Value</th>
                    <th style={{ width: '140px' }}>Status</th>
                    <th style={{ textAlign: 'right', width: '220px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map((order) => (
                    <tr key={`table-${order.grnNumber}`}>
                      {/* 1. GRN & PO Details */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span
                            style={{
                              fontWeight: 800,
                              color: '#0f172a',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '13px',
                            }}
                          >
                            {order.grnNumber}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontFamily: 'var(--font-mono)',
                                color: '#2563eb',
                                fontWeight: 700,
                                background: '#eff6ff',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                border: '1px solid #bfdbfe',
                              }}
                            >
                              PO #{order.poNumber}
                            </span>
                            {order.isScrapReceipt && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  color: '#b45309',
                                  background: '#fef3c7',
                                  padding: '1px 4px',
                                  borderRadius: '3px',
                                }}
                              >
                                Scrap
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Supplier / Vendor */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>
                              {order.vendorName}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              Dock: {order.warehouse}
                            </div>
                          </div>

                          {/* Vendor Tag */}
                          <button
                            type="button"
                            onClick={() => setSelectedVendorForHistory(order.vendorName)}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              borderRadius: '4px',
                              color: '#2563eb',
                              fontSize: '10.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              padding: '2px 6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              flexShrink: 0,
                            }}
                            title="View vendor sales, purchases & receipt history"
                          >
                            <Tag size={10} color="#2563eb" />
                            <span>🏷️ History</span>
                          </button>
                        </div>
                      </td>

                      {/* 3. Date */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Calendar size={12} color="#64748b" />
                            <span>{order.receivedDate}</span>
                          </div>
                          {order.carrierTracking && (
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              Trk: {order.carrierTracking}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. Items & Value */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span
                            style={{
                              fontWeight: 800,
                              color: '#0f172a',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '13.5px',
                            }}
                          >
                            ₹{(Number(order.totalValue) || 0).toLocaleString('en-IN')}
                          </span>
                          <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                            {order.totalItems} units inward
                          </span>
                        </div>
                      </td>

                      {/* 5. Status */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span className={`badge-status ${getStatusClass(order.status)}`}>
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: getStatusDotColor(order.status),
                              }}
                            />
                            {order.status}
                          </span>
                          <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                            QC: {order.inspector || 'Lead'}
                          </span>
                        </div>
                      </td>

                      {/* 6. Actions (High-End UI Buttons) */}
                      <td>
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
                          {/* Batches */}
                          <button
                            type="button"
                            onClick={() => setSelectedOrderForBatches(order)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 8px',
                              fontSize: '11px',
                              fontWeight: 700,
                              borderRadius: '5px',
                              border: '1px solid #c7d2fe',
                              background: '#f5f3ff',
                              color: '#4338ca',
                              cursor: 'pointer',
                            }}
                            title="Split Batches / Partial Inward Delivery"
                          >
                            <Layers size={12} />
                            <span>Batches</span>
                          </button>

                          {/* To QC */}
                          <button
                            type="button"
                            onClick={() => handleSendToQc(order)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 8px',
                              fontSize: '11px',
                              fontWeight: 700,
                              borderRadius: '5px',
                              border: '1px solid #bae6fd',
                              background: '#f0f9ff',
                              color: '#0369a1',
                              cursor: 'pointer',
                            }}
                            title="Dispatch to QC and email Admin"
                          >
                            <Send size={12} />
                            <span>To QC</span>
                          </button>

                          {/* Inspect */}
                          <button
                            type="button"
                            onClick={() => onInspectItems(order.grnNumber)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 8px',
                              fontSize: '11px',
                              fontWeight: 700,
                              borderRadius: '5px',
                              border: '1px solid #bbf7d0',
                              background: '#f0fdf4',
                              color: '#15803d',
                              cursor: 'pointer',
                            }}
                            title="Inspect Line Items"
                          >
                            <ShieldCheck size={12} />
                            <span>Inspect</span>
                          </button>

                          {/* Slip */}
                          <button
                            type="button"
                            onClick={() => onSelectGrnForSlip(order)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 8px',
                              fontSize: '11px',
                              fontWeight: 700,
                              borderRadius: '5px',
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#334155',
                              cursor: 'pointer',
                            }}
                            title="View Inward Slip"
                          >
                            <FileText size={12} />
                            <span>Slip</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls Bar */}
          {filteredOrders.length > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 18px',
                marginTop: '16px',
                background: '#ffffff',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> to{' '}
                <strong>{Math.min(currentPage * pageSize, filteredOrders.length)}</strong> of{' '}
                <strong>{filteredOrders.length}</strong> GRNs &bull; Page {currentPage} of {totalPages} (20 per page)
              </div>

              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: currentPage === 1 ? '#f8fafc' : '#ffffff',
                      color: currentPage === 1 ? '#94a3b8' : '#334155',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    &larr; Previous
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                    <button
                      key={pg}
                      type="button"
                      onClick={() => setCurrentPage(pg)}
                      style={{
                        minWidth: '30px',
                        height: '30px',
                        padding: '0 6px',
                        borderRadius: '6px',
                        border: pg === currentPage ? '1px solid #2563eb' : '1px solid #cbd5e1',
                        background: pg === currentPage ? '#2563eb' : '#ffffff',
                        color: pg === currentPage ? '#ffffff' : '#334155',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {pg}
                    </button>
                  ))}

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: currentPage === totalPages ? '#f8fafc' : '#ffffff',
                      color: currentPage === totalPages ? '#94a3b8' : '#334155',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Next &rarr;
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Modal for Partial & Split Delivery Batches */}
          <GrnBatchesModal
            isOpen={Boolean(selectedOrderForBatches)}
            onClose={() => setSelectedOrderForBatches(null)}
            order={selectedOrderForBatches}
            items={items}
            onSendToQc={(grnNum, scrap) => handleSendToQc(grnNum, scrap)}
          />

          {/* Vendor History Modal */}
          <VendorHistoryModal
            isOpen={Boolean(selectedVendorForHistory)}
            onClose={() => setSelectedVendorForHistory(null)}
            vendorName={selectedVendorForHistory}
            vendors={vendors}
            orders={orders}
            items={items}
          />
        </>
      )}
    </div>
  );
};
