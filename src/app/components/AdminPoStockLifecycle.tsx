'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PurchaseOrder, GRNOrder, GRNItem, ProductionIssue } from '@/types/inventory';
import {
  FileText,
  ChevronDown,
  ChevronRight,
  PackageCheck,
  Warehouse,
  Factory,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  ArrowRight,
  Search,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface AdminPoStockLifecycleProps {
  orders: GRNOrder[];
  items: GRNItem[];
  onOpenSendToProduction?: (itemCode: string, itemName: string) => void;
}

export const AdminPoStockLifecycle: React.FC<AdminPoStockLifecycleProps> = ({
  orders,
  items,
  onOpenSendToProduction,
}) => {
  const { role } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [productionIssues, setProductionIssues] = useState<ProductionIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedPo, setExpandedPo] = useState<string | null>(null);

  const fetchPoAndProductionData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Purchase Orders
      const poRes = await fetch('/api/po');
      if (poRes.ok) {
        const poData = await poRes.json();
        if (poData.purchaseOrders && Array.isArray(poData.purchaseOrders)) {
          setPurchaseOrders(poData.purchaseOrders);
          if (poData.purchaseOrders.length > 0 && !expandedPo) {
            setExpandedPo(poData.purchaseOrders[0].poNumber);
          }
        }
      }

      // 2. Fetch Production Issues for live shopfloor tracking
      const prodRes = await fetch('/api/production');
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        if (prodData.issues && Array.isArray(prodData.issues)) {
          setProductionIssues(prodData.issues);
        }
      }
    } catch (err) {
      console.error('Failed to load PO lifecycle data:', err);
    } finally {
      setLoading(false);
    }
  }, [expandedPo]);

  useEffect(() => {
    fetchPoAndProductionData();
  }, [fetchPoAndProductionData]);

  const filteredPos = purchaseOrders.filter(
    (po) =>
      po.poNumber.toLowerCase().includes(search.toLowerCase()) ||
      po.vendorName.toLowerCase().includes(search.toLowerCase()) ||
      (po.remarks && po.remarks.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '18px 20px',
        marginBottom: '20px',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
      }}
    >
      {/* Header */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#2563eb',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Factory Purchase Orders & Stock Pipeline Directory
              </h2>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                Click any PO to inspect its dock GRNs, Store stock, and active shopfloor production balance.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ position: 'relative', width: '240px' }}>
            <Search
              size={14}
              style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }}
            />
            <input
              type="text"
              placeholder="Search PO # or Supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px 7px 32px',
                fontSize: '12.5px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                outline: 'none',
              }}
            />
          </div>
          <button
            onClick={fetchPoAndProductionData}
            title="Refresh Data"
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* PO List Cards / Table */}
      {filteredPos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '13px' }}>
          {loading ? 'Loading Purchase Orders...' : 'No purchase orders found matching search criteria.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredPos.map((po) => {
            const isExpanded = expandedPo === po.poNumber;
            // GRNs received under this PO
            const relatedGrns = orders.filter(
              (o) => o.poNumber.trim().toLowerCase() === po.poNumber.trim().toLowerCase()
            );

            // Compute total ordered vs received for this PO
            const totalOrderedUnits =
              po.items?.reduce((sum, it) => sum + (Number(it.orderedQty) || 0), 0) || 0;
            const totalReceivedUnits =
              po.items?.reduce((sum, it) => sum + (Number(it.receivedQty) || 0), 0) || 0;
            const totalPendingUnits = Math.max(0, totalOrderedUnits - totalReceivedUnits);

            return (
              <div
                key={po.poNumber}
                style={{
                  border: isExpanded ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                  borderRadius: '10px',
                  background: isExpanded ? '#ffffff' : '#f8fafc',
                  overflow: 'hidden',
                  transition: 'all 0.15s ease',
                  boxShadow: isExpanded ? '0 4px 12px rgba(37, 99, 235, 0.08)' : 'none',
                }}
              >
                {/* PO Header Row (Clickable) */}
                <div
                  onClick={() => setExpandedPo(isExpanded ? null : po.poNumber)}
                  style={{
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    flexWrap: 'wrap',
                    gap: '10px',
                    background: isExpanded ? '#eff6ff' : '#f8fafc',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ color: isExpanded ? '#2563eb' : '#64748b' }}>
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 800,
                            fontSize: '13.5px',
                            color: '#0f172a',
                          }}
                        >
                          {po.poNumber}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background:
                              po.status === 'COMPLETED'
                                ? '#dcfce7'
                                : po.status === 'PARTIALLY_RECEIVED'
                                ? '#fef3c7'
                                : '#e0e7ff',
                            color:
                              po.status === 'COMPLETED'
                                ? '#166534'
                                : po.status === 'PARTIALLY_RECEIVED'
                                ? '#b45309'
                                : '#3730a3',
                          }}
                        >
                          {po.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        Supplier: <strong>{po.vendorName}</strong> | Date: {po.poDate || 'Recent'} | {po.items?.length || 0} Item(s)
                      </div>
                    </div>
                  </div>

                  {/* Summary Metric Pills */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Ordered / Received</div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                        {totalOrderedUnits} / <span style={{ color: '#16a34a' }}>{totalReceivedUnits}</span> units
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Pending Dock Inward</div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: totalPendingUnits > 0 ? '#b45309' : '#64748b' }}>
                        {totalPendingUnits} units
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>GRN Shipments</div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#2563eb' }}>
                        {relatedGrns.length} Inwarded
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details: GRNs & Stock Breakdown */}
                {isExpanded && (
                  <div style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', background: '#ffffff' }}>
                    {/* SECTION 1: RELATED DOCK GRNs */}
                    <div style={{ marginBottom: '20px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginBottom: '10px',
                        }}
                      >
                        <PackageCheck size={16} color="#16a34a" />
                        <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                          Shipment Consignments Received under {po.poNumber} ({relatedGrns.length})
                        </h4>
                      </div>

                      {relatedGrns.length === 0 ? (
                        <div
                          style={{
                            padding: '12px 16px',
                            background: '#f8fafc',
                            borderRadius: '8px',
                            border: '1px dashed #cbd5e1',
                            color: '#64748b',
                            fontSize: '12.5px',
                          }}
                        >
                          📦 No dock shipments received yet for this PO. Ready to receive items at Dock GRN.
                        </div>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ textAlign: 'left', padding: '8px 10px', color: '#64748b' }}>GRN Number</th>
                                <th style={{ textAlign: 'left', padding: '8px 10px', color: '#64748b' }}>Inward Date</th>
                                <th style={{ textAlign: 'left', padding: '8px 10px', color: '#64748b' }}>Items Inwarded</th>
                                <th style={{ textAlign: 'left', padding: '8px 10px', color: '#64748b' }}>Inspector</th>
                                <th style={{ textAlign: 'left', padding: '8px 10px', color: '#64748b' }}>QC Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {relatedGrns.map((grn) => (
                                <tr key={grn.grnNumber} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '8px 10px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#2563eb' }}>
                                    {grn.grnNumber}
                                  </td>
                                  <td style={{ padding: '8px 10px', color: '#334155' }}>{grn.receivedDate}</td>
                                  <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>{grn.totalItems} items</td>
                                  <td style={{ padding: '8px 10px', color: '#64748b' }}>{grn.inspector || 'QC Team'}</td>
                                  <td style={{ padding: '8px 10px' }}>
                                    <span
                                      style={{
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        background: grn.status === 'Approved' ? '#dcfce7' : '#fef3c7',
                                        color: grn.status === 'Approved' ? '#166534' : '#b45309',
                                      }}
                                    >
                                      {grn.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* SECTION 2: PER-ITEM STOCK LIFECYCLE (ALL STOCK, IN STORE, IN PRODUCTION, PENDING) */}
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginBottom: '10px',
                        }}
                      >
                        <Warehouse size={16} color="#2563eb" />
                        <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                          Material Stock Pipeline Breakdown (Per SKU)
                        </h4>
                      </div>

                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #cbd5e1' }}>
                              <th style={{ textAlign: 'left', padding: '10px 10px', color: '#475569' }}>SKU & Description</th>
                              <th style={{ textAlign: 'right', padding: '10px 10px', color: '#475569' }}>Total Ordered</th>
                              <th style={{ textAlign: 'right', padding: '10px 10px', color: '#16a34a' }}>Received at Dock</th>
                              <th style={{ textAlign: 'right', padding: '10px 10px', color: '#b45309' }}>Pending to Receive</th>
                              <th style={{ textAlign: 'right', padding: '10px 10px', color: '#2563eb' }}>Stock in Store</th>
                              <th style={{ textAlign: 'right', padding: '10px 10px', color: '#9333ea' }}>Stock in Production</th>
                              {role === 'ADMIN' && (
                                <th style={{ textAlign: 'center', padding: '10px 10px', color: '#475569' }}>Action</th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {(po.items || []).map((item) => {
                              const ordered = Number(item.orderedQty) || 0;
                              const received = Number(item.receivedQty) || 0;
                              const pending = Math.max(0, ordered - received);

                              // Find matching items in store items that passed QC
                              const matchingGrnItems = items.filter(
                                (it) => it.itemCode.toLowerCase() === item.itemCode.toLowerCase()
                              );
                              const totalAcceptedInStore = matchingGrnItems
                                .filter((it) => it.qcStatus === 'Passed')
                                .reduce((acc, it) => acc + (it.acceptedQty || it.receivedQty || 0), 0);

                              // Active issues for this item in production
                              const activeIssues = productionIssues.filter(
                                (i) =>
                                  i.itemCode.toLowerCase() === item.itemCode.toLowerCase() &&
                                  (i.status === 'PENDING_RECEIPT' || i.status === 'IN_PROCESS' || i.status === 'ISSUED')
                              );
                              const stockInProduction = activeIssues.reduce(
                                (acc, i) => acc + (Number(i.quantityIssued) || 0),
                                0
                              );

                              // Current available in store
                              const availableInStore = Math.max(0, totalAcceptedInStore - stockInProduction);

                              return (
                                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '10px 10px' }}>
                                    <div style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#0f172a' }}>
                                      {item.itemCode}
                                    </div>
                                    <div style={{ color: '#64748b', fontSize: '11.5px' }}>{item.description}</div>
                                  </td>
                                  <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                                    {ordered} {item.unit || 'PCS'}
                                  </td>
                                  <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 800, color: '#16a34a' }}>
                                    {received} {item.unit || 'PCS'}
                                  </td>
                                  <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 800, color: pending > 0 ? '#b45309' : '#94a3b8' }}>
                                    {pending} {item.unit || 'PCS'}
                                  </td>
                                  <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 800, color: '#2563eb' }}>
                                    <span style={{ background: '#eff6ff', padding: '3px 8px', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
                                      {availableInStore} in Store
                                    </span>
                                  </td>
                                  <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 800, color: '#9333ea' }}>
                                    <span style={{ background: '#faf5ff', padding: '3px 8px', borderRadius: '4px', border: '1px solid #e9d5ff' }}>
                                      {stockInProduction} in Production
                                    </span>
                                  </td>
                                  {role === 'ADMIN' && (
                                    <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                                      <button
                                        onClick={() =>
                                          onOpenSendToProduction
                                            ? onOpenSendToProduction(item.itemCode, item.description)
                                            : null
                                        }
                                        disabled={availableInStore <= 0}
                                        style={{
                                          padding: '5px 10px',
                                          fontSize: '11.5px',
                                          fontWeight: 700,
                                          borderRadius: '6px',
                                          background: availableInStore > 0 ? '#9333ea' : '#f1f5f9',
                                          color: availableInStore > 0 ? '#ffffff' : '#94a3b8',
                                          border: 'none',
                                          cursor: availableInStore > 0 ? 'pointer' : 'not-allowed',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          boxShadow: availableInStore > 0 ? '0 2px 6px rgba(147, 51, 234, 0.3)' : 'none',
                                        }}
                                      >
                                        <span>Send to Production</span>
                                        <ArrowRight size={12} />
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
