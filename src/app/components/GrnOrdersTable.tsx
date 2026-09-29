'use client';

import React, { useState } from 'react';
import { GRNOrder } from '@/types/inventory';

interface GrnOrdersTableProps {
  orders: GRNOrder[];
  onSelectGrnForSlip: (order: GRNOrder) => void;
  onInspectItems: (grnNumber: string) => void;
  onUpdateStatus: (grnNumber: string, newStatus: 'Approved' | 'Pending QC' | 'Partial' | 'Rejected') => void;
}

export const GrnOrdersTable: React.FC<GrnOrdersTableProps> = ({
  orders,
  onSelectGrnForSlip,
  onInspectItems,
  onUpdateStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('ALL');

  // Available warehouses
  const warehouses = Array.from(new Set(orders.map((o) => o.warehouse).filter(Boolean)));

  // Filter logic
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.grnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.inspector.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.carrierTracking.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ? true : o.status.toLowerCase() === statusFilter.toLowerCase();

    const matchesWarehouse =
      warehouseFilter === 'ALL' ? true : o.warehouse === warehouseFilter;

    return matchesSearch && matchesStatus && matchesWarehouse;
  });

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

  return (
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
      {/* Top Filter Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '14px',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
        }}
      >
        {/* Search */}
        <div className="search-box" style={{ width: '320px' }}>
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="form-input"
            placeholder="Search GRN #, PO #, Vendor, Inspector..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {['ALL', 'Approved', 'Pending QC', 'Partial', 'Rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              style={{
                padding: '6px 12px',
                fontSize: '12.5px',
                fontWeight: 600,
                borderRadius: '8px',
                border: statusFilter === status ? '1px solid #6366f1' : '1px solid #e2e8f0',
                background: statusFilter === status ? '#eef2ff' : '#ffffff',
                color: statusFilter === status ? '#4f46e5' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {status === 'ALL' ? `All GRNs (${orders.length})` : status}
            </button>
          ))}

          {/* Warehouse Dropdown */}
          <select
            className="form-select"
            style={{ width: 'auto', padding: '6px 12px', fontSize: '12.5px' }}
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
          >
            <option value="ALL">All Warehouses ({warehouses.length})</option>
            {warehouses.map((wh) => (
              <option key={wh} value={wh}>
                {wh}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="aurora-table-wrapper">
        <table className="aurora-table">
          <thead>
            <tr>
              <th>GRN & PO Details</th>
              <th>Supplier / Vendor</th>
              <th>Warehouse & Date</th>
              <th>Items & Value</th>
              <th>QC Inspector</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                  No matching Goods Received Notes found.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order.grnNumber}>
                  <td>
                    <div>
                      <span
                        style={{
                          fontWeight: 700,
                          color: '#1e293b',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '13.5px',
                        }}
                      >
                        {order.grnNumber}
                      </span>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#6366f1',
                          fontWeight: 600,
                          marginTop: '2px',
                        }}
                      >
                        {order.poNumber}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: 'rgba(99, 102, 241, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#4f46e5',
                          fontWeight: 700,
                          fontSize: '12px',
                        }}
                      >
                        {order.vendorName.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{order.vendorName}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          Trk: {order.carrierTracking || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>
                      <div style={{ fontWeight: 500, color: '#334155' }}>{order.warehouse}</div>
                      <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>{order.receivedDate}</div>
                    </div>
                  </td>
                  <td>
                    <div>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>
                        ${order.totalValue?.toLocaleString() || 0}
                      </span>
                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                        {order.totalItems} units inward
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '12.5px', color: '#475569', fontWeight: 500 }}>
                      👤 {order.inspector}
                    </span>
                  </td>
                  <td>
                    <span className={`badge-status ${getStatusClass(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      {/* Inspect Items */}
                      <button
                        onClick={() => onInspectItems(order.grnNumber)}
                        title="Inspect Line Items in QC View"
                        style={{
                          padding: '5px 9px',
                          fontSize: '12px',
                          fontWeight: 600,
                          borderRadius: '6px',
                          border: '1px solid #c7d2fe',
                          background: '#eef2ff',
                          color: '#4338ca',
                          cursor: 'pointer',
                        }}
                      >
                        Inspect
                      </button>

                      {/* Quick Status toggle */}
                      {order.status !== 'Approved' && (
                        <button
                          onClick={() => onUpdateStatus(order.grnNumber, 'Approved')}
                          title="Quick Approve GRN"
                          style={{
                            padding: '5px 9px',
                            fontSize: '12px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: '1px solid #a7f3d0',
                            background: '#ecfdf5',
                            color: '#065f46',
                            cursor: 'pointer',
                          }}
                        >
                          ✓ Approve
                        </button>
                      )}

                      {/* Print/View Slip */}
                      <button
                        onClick={() => onSelectGrnForSlip(order)}
                        title="View Official GRN Slip"
                        style={{
                          padding: '5px 9px',
                          fontSize: '12px',
                          fontWeight: 600,
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                          background: '#ffffff',
                          color: '#475569',
                          cursor: 'pointer',
                        }}
                      >
                        📄 Slip
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
