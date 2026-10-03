'use client';

import React, { useMemo } from 'react';
import { GRNOrder, GRNItem, Vendor } from '@/types/inventory';
import {
  X,
  Building2,
  Calendar,
  DollarSign,
  Package,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Star,
  Phone,
  Mail,
  Truck,
  FileText,
} from 'lucide-react';

interface VendorHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorName: string | null;
  vendors?: Vendor[];
  orders?: GRNOrder[];
  items?: GRNItem[];
}

export const VendorHistoryModal: React.FC<VendorHistoryModalProps> = ({
  isOpen,
  onClose,
  vendorName,
  vendors = [],
  orders = [],
  items = [],
}) => {
  if (!isOpen || !vendorName) return null;

  // Find vendor details
  const vendorInfo = useMemo(() => {
    return (
      vendors.find(
        (v) => v.vendorName.trim().toLowerCase() === vendorName.trim().toLowerCase()
      ) || null
    );
  }, [vendors, vendorName]);

  // Orders from this vendor
  const vendorOrders = useMemo(() => {
    return orders.filter(
      (o) => o.vendorName.trim().toLowerCase() === vendorName.trim().toLowerCase()
    );
  }, [orders, vendorName]);

  const vendorGrnNumbers = useMemo(() => {
    return new Set(vendorOrders.map((o) => o.grnNumber));
  }, [vendorOrders]);

  // Items from this vendor's GRNs
  const vendorItems = useMemo(() => {
    return items.filter((it) => vendorGrnNumbers.has(it.grnNumber));
  }, [items, vendorGrnNumbers]);

  // Aggregate Metrics
  const totalSpend = useMemo(() => {
    return vendorOrders.reduce((sum, o) => sum + (Number(o.totalValue) || 0), 0);
  }, [vendorOrders]);

  const totalUnits = useMemo(() => {
    return vendorItems.reduce((sum, it) => sum + (Number(it.receivedQty) || 0), 0);
  }, [vendorItems]);

  const qcPassedCount = useMemo(() => {
    return vendorItems.filter((it) => it.qcStatus === 'Passed').length;
  }, [vendorItems]);

  const qcPassRate = useMemo(() => {
    if (vendorItems.length === 0) return 100;
    return Math.round((qcPassedCount / vendorItems.length) * 100);
  }, [vendorItems, qcPassedCount]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card-compact"
        style={{
          width: '100%',
          maxWidth: '820px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            >
              <Building2 size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#ffffff' }}>
                  {vendorName}
                </h2>
                {vendorInfo && (
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: 600,
                      background:
                        vendorInfo.status === 'Preferred'
                          ? '#10b981'
                          : vendorInfo.status === 'Active'
                          ? '#3b82f6'
                          : '#f59e0b',
                      color: '#ffffff',
                    }}
                  >
                    {vendorInfo.status}
                  </span>
                )}
                {vendorInfo?.vendorCode && (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: '#94a3b8',
                      background: 'rgba(255, 255, 255, 0.1)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    {vendorInfo.vendorCode}
                  </span>
                )}
              </div>
              <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#cbd5e1' }}>
                {vendorInfo?.category || 'Industrial Supplier & Manufacturing Partner'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '6px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Contact Details Strip */}
          {vendorInfo && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '16px',
                padding: '10px 14px',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '12px',
                color: '#475569',
              }}
            >
              {vendorInfo.contactPerson && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>Contact:</span>
                  <span>{vendorInfo.contactPerson}</span>
                </div>
              )}
              {vendorInfo.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={13} color="#64748b" />
                  <a href={`mailto:${vendorInfo.email}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                    {vendorInfo.email}
                  </a>
                </div>
              )}
              {vendorInfo.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={13} color="#64748b" />
                  <span>{vendorInfo.phone}</span>
                </div>
              )}
              {vendorInfo.leadTimeDays > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={13} color="#64748b" />
                  <span>Lead Time: <strong>{vendorInfo.leadTimeDays} days</strong></span>
                </div>
              )}
              {vendorInfo.qualityRating > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#b45309' }}>
                  <Star size={13} fill="#f59e0b" color="#f59e0b" />
                  <strong>{vendorInfo.qualityRating} / 5.0</strong>
                </div>
              )}
            </div>
          )}

          {/* Supplier Metrics Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '12px',
            }}
          >
            <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                Total Purchase Value
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                ₹{totalSpend.toLocaleString('en-IN')}
              </div>
            </div>

            <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                Total Consignments
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#2563eb', marginTop: '4px' }}>
                {vendorOrders.length} GRNs
              </div>
            </div>

            <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                Total Items Inwarded
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                {totalUnits.toLocaleString()} units
              </div>
            </div>

            <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                QC Acceptance Rate
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: qcPassRate >= 85 ? '#16a34a' : '#ea580c', marginTop: '4px' }}>
                {qcPassRate}%
              </div>
            </div>
          </div>

          {/* History of Consignments (GRN & PO Records) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Inward Purchase Orders & Goods Received History ({vendorOrders.length})
              </h3>
              <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                Tracked from Procurement to QC & Store Stock
              </span>
            </div>

            {vendorOrders.length === 0 ? (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px dashed #cbd5e1',
                  color: '#64748b',
                  fontSize: '12.5px',
                }}
              >
                No past GRN consignments recorded for this supplier yet.
              </div>
            ) : (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px' }}>GRN #</th>
                      <th style={{ padding: '8px 12px' }}>PO #</th>
                      <th style={{ padding: '8px 12px' }}>Inward Date</th>
                      <th style={{ padding: '8px 12px' }}>Dock / Warehouse</th>
                      <th style={{ padding: '8px 12px' }}>Items Received</th>
                      <th style={{ padding: '8px 12px' }}>Total Value</th>
                      <th style={{ padding: '8px 12px' }}>QC Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendorOrders.map((order) => (
                      <tr key={order.grnNumber} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#0f172a' }}>
                          {order.grnNumber}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '11px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: '#eff6ff',
                              color: '#2563eb',
                              border: '1px solid #bfdbfe',
                            }}
                          >
                            #{order.poNumber}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', color: '#475569' }}>
                          {order.receivedDate}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#475569' }}>
                          {order.warehouse}
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0f172a' }}>
                          {order.totalItems} units
                        </td>
                        <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#0f172a' }}>
                          ₹{(Number(order.totalValue) || 0).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background:
                                order.status === 'Approved'
                                  ? '#dcfce7'
                                  : order.status === 'Rejected'
                                  ? '#fee2e2'
                                  : '#fef3c7',
                              color:
                                order.status === 'Approved'
                                  ? '#15803d'
                                  : order.status === 'Rejected'
                                  ? '#b91c1c'
                                  : '#b45309',
                            }}
                          >
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Supplier Line Items Table */}
          {vendorItems.length > 0 && (
            <div>
              <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', margin: '0 0 10px 0' }}>
                Supplied Line Items & Materials ({vendorItems.length})
              </h3>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px' }}>SKU Code</th>
                      <th style={{ padding: '8px 12px' }}>Description</th>
                      <th style={{ padding: '8px 12px' }}>PO Ordered</th>
                      <th style={{ padding: '8px 12px' }}>Received</th>
                      <th style={{ padding: '8px 12px' }}>QC Verdict</th>
                      <th style={{ padding: '8px 12px' }}>Unit Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendorItems.map((it) => (
                      <tr key={it.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                          {it.itemCode}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#334155' }}>
                          {it.description}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#64748b' }}>
                          {it.poQty} {it.unit}
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0f172a' }}>
                          {it.receivedQty} {it.unit}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color:
                                it.qcStatus === 'Passed'
                                  ? '#15803d'
                                  : it.qcStatus === 'Failed'
                                  ? '#b91c1c'
                                  : '#b45309',
                            }}
                          >
                            {it.qcStatus}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>
                          ₹{it.unitPrice}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            background: '#f8fafc',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn-primary"
            style={{ padding: '6px 16px', fontSize: '12px' }}
          >
            Close Supplier History
          </button>
        </div>
      </div>
    </div>
  );
};
