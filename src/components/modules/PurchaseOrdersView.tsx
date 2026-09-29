'use client';

import React, { useState } from 'react';
import { PurchaseOrder, Vendor } from '@/types/inventory';

interface PurchaseOrdersViewProps {
  vendors: Vendor[];
  onInwardGrnFromPo?: (poNumber: string, vendorName: string) => void;
}

const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'po-1',
    poNumber: 'PO-2026-081',
    vendorId: 'VND-101',
    vendorName: 'Apex Precision Logistics',
    poDate: '2026-09-20',
    deliveryDueDate: '2026-09-29',
    status: 'ISSUED',
    totalAmount: 184500,
    remarks: 'Urgent line items for High-Speed Milling spindles batch',
    items: [
      {
        id: 'poi-1',
        poId: 'po-1',
        itemId: 'ITM-01',
        itemCode: 'BRG-6205-ZZ',
        description: 'Deep Groove Radial Ball Bearing 25x52x15mm',
        orderedQty: 250,
        receivedQty: 0,
        acceptedQty: 0,
        pendingQty: 250,
        unitPrice: 420,
        taxPercent: 18,
        lineTotal: 123900,
      },
      {
        id: 'poi-2',
        poId: 'po-1',
        itemId: 'ITM-02',
        itemCode: 'SEAL-VIT-45',
        description: 'Viton Rotary Shaft Oil Seal 45x65x8mm',
        orderedQty: 100,
        receivedQty: 0,
        acceptedQty: 0,
        pendingQty: 100,
        unitPrice: 510,
        taxPercent: 18,
        lineTotal: 60180,
      },
    ],
  },
  {
    id: 'po-2',
    poNumber: 'PO-2026-079',
    vendorId: 'VND-102',
    vendorName: 'Nordic MicroSensors Inc.',
    poDate: '2026-09-18',
    deliveryDueDate: '2026-09-26',
    status: 'PARTIALLY_RECEIVED',
    totalAmount: 325000,
    remarks: 'Optical laser displacement transducers calibration batch',
    items: [
      {
        id: 'poi-3',
        poId: 'po-2',
        itemId: 'ITM-03',
        itemCode: 'SNS-OPT-800',
        description: 'Fiber-Optic Reflective Proximity Sensor 0-50mm',
        orderedQty: 50,
        receivedQty: 25,
        acceptedQty: 25,
        pendingQty: 25,
        unitPrice: 6500,
        taxPercent: 18,
        lineTotal: 383500,
      },
    ],
  },
  {
    id: 'po-3',
    poNumber: 'PO-2026-072',
    vendorId: 'VND-103',
    vendorName: 'Vertex Polymer Corp',
    poDate: '2026-09-12',
    deliveryDueDate: '2026-09-22',
    status: 'COMPLETED',
    totalAmount: 94000,
    remarks: 'PTFE Guide Bushings for Hydraulic Ram Cylinders',
    items: [
      {
        id: 'poi-4',
        poId: 'po-3',
        itemId: 'ITM-04',
        itemCode: 'PLM-PTFE-50',
        description: 'PTFE Virgin Guide Ring 50x55x15mm',
        orderedQty: 200,
        receivedQty: 200,
        acceptedQty: 200,
        pendingQty: 0,
        unitPrice: 470,
        taxPercent: 18,
        lineTotal: 110920,
      },
    ],
  },
];

export const PurchaseOrdersView: React.FC<PurchaseOrdersViewProps> = ({
  vendors,
  onInwardGrnFromPo,
}) => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(INITIAL_PURCHASE_ORDERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New PO form state
  const [newPoNumber, setNewPoNumber] = useState(`PO-2026-${String(purchaseOrders.length + 82).padStart(3, '0')}`);
  const [newVendorName, setNewVendorName] = useState(vendors[0]?.vendorName || 'Apex Precision Logistics');
  const [newDeliveryDate, setNewDeliveryDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [newDescription, setNewDescription] = useState('');
  const [newQty, setNewQty] = useState<number>(100);
  const [newUnitPrice, setNewUnitPrice] = useState<number>(350);
  const [newRemarks, setNewRemarks] = useState('');

  const filteredPos = purchaseOrders.filter((po) => {
    const matchesSearch =
      po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (po.remarks && po.remarks.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreatePo = (e: React.FormEvent) => {
    e.preventDefault();
    const vendorObj = vendors.find((v) => v.vendorName === newVendorName);
    const lineTotal = newQty * newUnitPrice * 1.18;
    const newOrder: PurchaseOrder = {
      id: `po-${Date.now()}`,
      poNumber: newPoNumber,
      vendorId: vendorObj?.vendorCode || 'VND-NEW',
      vendorName: newVendorName,
      poDate: new Date().toISOString().slice(0, 10),
      deliveryDueDate: newDeliveryDate,
      status: 'ISSUED',
      totalAmount: Math.round(lineTotal),
      remarks: newRemarks || 'Procured via Plant Central MIMS',
      items: [
        {
          id: `poi-${Date.now()}`,
          poId: `po-${Date.now()}`,
          itemId: 'ITM-NEW',
          itemCode: 'MAT-GEN-' + Math.floor(100 + Math.random() * 900),
          description: newDescription || 'Standard Plant Material',
          orderedQty: Number(newQty),
          receivedQty: 0,
          acceptedQty: 0,
          pendingQty: Number(newQty),
          unitPrice: Number(newUnitPrice),
          taxPercent: 18,
          lineTotal: Math.round(lineTotal),
        },
      ],
    };

    setPurchaseOrders([newOrder, ...purchaseOrders]);
    setIsCreateModalOpen(false);
    setNewDescription('');
    setNewRemarks('');
    setNewPoNumber(`PO-2026-${String(purchaseOrders.length + 83).padStart(3, '0')}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ISSUED':
        return { bg: '#e0f2fe', color: '#0369a1', label: '● Issued / Awaiting Dispatch' };
      case 'PARTIALLY_RECEIVED':
        return { bg: '#fef3c7', color: '#b45309', label: '◐ Partially Received' };
      case 'COMPLETED':
        return { bg: '#dcfce7', color: '#15803d', label: '✓ Completed & Closed' };
      case 'DRAFT':
        return { bg: '#f1f5f9', color: '#475569', label: '○ Draft' };
      default:
        return { bg: '#f3f4f6', color: '#374151', label: status };
    }
  };

  return (
    <div>
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
            Purchase Orders (PO)
          </h1>
          <p style={{ fontSize: '12.5px', color: '#64748b', margin: '2px 0 0 0' }}>
            Active Procurement Contracts & Dock Inward Scheduling
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-aurora"
          style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 700 }}
        >
          + Create Purchase PO
        </button>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>TOTAL ORDERS ISSUED</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
            {purchaseOrders.length}
          </div>
          <div style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 600 }}>Active Supplier Contracts</div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>AWAITING DOCK DELIVERY</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#b45309', margin: '4px 0' }}>
            {purchaseOrders.filter((p) => p.status === 'ISSUED').length}
          </div>
          <div style={{ fontSize: '12px', color: '#b45309', fontWeight: 600 }}>Scheduled this week</div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>TOTAL PO VALUE</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#15803d', margin: '4px 0' }}>
            ₹{purchaseOrders.reduce((sum, p) => sum + p.totalAmount, 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '12px', color: '#15803d', fontWeight: 600 }}>Approved Procurement Budget</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: '14px 20px',
          marginBottom: '20px',
          display: 'flex',
          gap: '14px',
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search by PO Number, Supplier name, or items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              minWidth: '320px',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {['ALL', 'ISSUED', 'PARTIALLY_RECEIVED', 'COMPLETED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                border: '1px solid',
                borderColor: statusFilter === st ? '#1e40af' : '#e2e8f0',
                background: statusFilter === st ? '#1e40af' : '#ffffff',
                color: statusFilter === st ? '#ffffff' : '#475569',
                cursor: 'pointer',
              }}
            >
              {st === 'ALL' ? 'All Orders' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="card table-responsive-container" style={{ padding: '0', overflowX: 'auto' }}>
        <table className="table-aurora" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '650px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>PO NUMBER</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>SUPPLIER</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>PO DATE</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>DELIVERY DUE</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>TOTAL AMOUNT</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>STATUS</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569', textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredPos.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                  No Purchase Orders found matching your criteria.
                </td>
              </tr>
            ) : (
              filteredPos.map((po) => {
                const badge = getStatusBadge(po.status);
                return (
                  <tr
                    key={po.id}
                    style={{ borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1e40af' }}>
                      {po.poNumber}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                      <div>{po.vendorName}</div>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>ID: {po.vendorId}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{po.poDate}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                      {po.deliveryDueDate}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                      ₹{po.totalAmount.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 700,
                          padding: '3px 9px',
                          borderRadius: '999px',
                          background: badge.bg,
                          color: badge.color,
                        }}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setSelectedPo(po)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#0f172a',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          👁 Items ({po.items?.length || 0})
                        </button>

                        {po.status !== 'COMPLETED' && onInwardGrnFromPo && (
                          <button
                            onClick={() => onInwardGrnFromPo(po.poNumber, po.vendorName)}
                            className="btn-aurora"
                            style={{
                              padding: '5px 12px',
                              fontSize: '12px',
                              fontWeight: 700,
                              background: '#10b981',
                              color: '#ffffff',
                            }}
                          >
                            📥 Inward GRN
                          </button>
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

      {/* PO Items Modal */}
      {selectedPo && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '750px',
              padding: '24px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#3b82f6', letterSpacing: '0.06em' }}>
                  PURCHASE ORDER BREAKDOWN
                </span>
                <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '2px 0 0 0' }}>
                  {selectedPo.poNumber} — {selectedPo.vendorName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPo(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ✕ Close
              </button>
            </div>

            <div style={{ fontSize: '13px', color: '#475569', marginBottom: '16px', background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
              <strong>Remarks:</strong> {selectedPo.remarks || 'Standard procurement contract.'}
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '16px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '8px 12px' }}>Code</th>
                  <th style={{ padding: '8px 12px' }}>Description</th>
                  <th style={{ padding: '8px 12px' }}>Ordered</th>
                  <th style={{ padding: '8px 12px' }}>Received</th>
                  <th style={{ padding: '8px 12px' }}>Unit Rate</th>
                  <th style={{ padding: '8px 12px' }}>Line Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedPo.items?.map((it) => (
                  <tr key={it.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1e40af' }}>{it.itemCode}</td>
                    <td style={{ padding: '10px 12px' }}>{it.description}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>{it.orderedQty}</td>
                    <td style={{ padding: '10px 12px', color: it.receivedQty > 0 ? '#15803d' : '#94a3b8' }}>
                      {it.receivedQty}
                    </td>
                    <td style={{ padding: '10px 12px' }}>₹{it.unitPrice}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>₹{it.lineTotal.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              {selectedPo.status !== 'COMPLETED' && onInwardGrnFromPo && (
                <button
                  onClick={() => {
                    const poNum = selectedPo.poNumber;
                    const vName = selectedPo.vendorName;
                    setSelectedPo(null);
                    onInwardGrnFromPo(poNum, vName);
                  }}
                  className="btn-aurora"
                  style={{ padding: '8px 16px', background: '#10b981', color: '#fff' }}
                >
                  📥 Proceed to Inward GRN Dock
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create PO Modal */}
      {isCreateModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '600px', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 16px 0', color: '#0f172a' }}>
              Create New Purchase Order (PO)
            </h3>
            <form onSubmit={handleCreatePo}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>PO NUMBER</label>
                  <input
                    type="text"
                    required
                    value={newPoNumber}
                    onChange={(e) => setNewPoNumber(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>DELIVERY DUE DATE</label>
                  <input
                    type="date"
                    required
                    value={newDeliveryDate}
                    onChange={(e) => setNewDeliveryDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>SUPPLIER</label>
                <select
                  value={newVendorName}
                  onChange={(e) => setNewVendorName(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  {vendors.map((v) => (
                    <option key={v.vendorCode} value={v.vendorName}>
                      {v.vendorName} ({v.vendorCode})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>ITEM DESCRIPTION</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. High Carbon Stainless Steel Shafts 30mm"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>ORDER QUANTITY</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newQty}
                    onChange={(e) => setNewQty(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>UNIT RATE (₹)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newUnitPrice}
                    onChange={(e) => setNewUnitPrice(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>REMARKS / SPECIAL TERMS</label>
                <input
                  type="text"
                  placeholder="Material inspection certificates required upon delivery"
                  value={newRemarks}
                  onChange={(e) => setNewRemarks(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-aurora"
                  style={{ padding: '8px 18px', background: '#1e40af', color: '#fff' }}
                >
                  Issue Purchase PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
