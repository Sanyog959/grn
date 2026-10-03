'use client';

import React from 'react';
import { GRNOrder, GRNItem, Vendor } from '@/types/inventory';
import { DollarSign, CheckCircle2, Clock, Building2 } from 'lucide-react';

interface KpiMetricsProps {
  orders: GRNOrder[];
  items: GRNItem[];
  vendors: Vendor[];
  canViewGrn?: boolean;
  canViewQc?: boolean;
  canViewVendors?: boolean;
}

export const KpiMetrics: React.FC<KpiMetricsProps> = ({
  orders,
  items,
  vendors,
  canViewGrn = true,
  canViewQc = true,
  canViewVendors = true,
}) => {
  // Calculations
  const totalValue = orders.reduce((sum, o) => sum + (o.totalValue || 0), 0);
  const totalItemsCount = orders.reduce((sum, o) => sum + (o.totalItems || 0), 0);

  const totalAcceptedItems = items.reduce((sum, it) => sum + (it.acceptedQty || 0), 0);
  const totalReceivedItems = items.reduce((sum, it) => sum + (it.receivedQty || 0), 0);
  const totalRejectedItems = items.reduce((sum, it) => sum + (it.rejectedQty || 0), 0);

  const acceptanceRate =
    totalReceivedItems > 0
      ? ((totalAcceptedItems / totalReceivedItems) * 100).toFixed(1)
      : '0.0';

  const pendingGrnCount = orders.filter((o) => o.status === 'Pending QC').length;
  const activeVendorsCount = vendors.filter((v) => v.status === 'Active' || v.status === 'Preferred').length;

  const hasAnyMetricVisible = canViewGrn || canViewQc || canViewVendors;
  if (!hasAnyMetricVisible) return null;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
        gap: '10px',
        marginBottom: '16px',
      }}
    >
      {/* Metric 1: Total Inward Value */}
      {canViewGrn && (
        <div
          className="card-compact"
          style={{
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderLeft: '3px solid #0f172a',
          }}
        >
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Total Inward Value
            </p>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '2px', letterSpacing: '-0.02em' }}>
              ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </h3>
            <p style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
              {orders.length} GRNs ({totalItemsCount} units)
            </p>
          </div>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0f172a',
            }}
          >
            <DollarSign size={16} />
          </div>
        </div>
      )}

      {/* Metric 2: QC Acceptance Rate */}
      {canViewQc && (
        <div
          className="card-compact"
          style={{
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderLeft: '3px solid #2563eb',
          }}
        >
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              QC Acceptance Rate
            </p>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#2563eb', marginTop: '2px', letterSpacing: '-0.02em' }}>
              {acceptanceRate}%
            </h3>
            <p style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
              {totalAcceptedItems} passed · {totalRejectedItems} rejected
            </p>
          </div>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb',
            }}
          >
            <CheckCircle2 size={16} />
          </div>
        </div>
      )}

      {/* Metric 3: Pending QC Inward */}
      {canViewQc && (
        <div
          className="card-compact"
          style={{
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderLeft: '3px solid #475569',
          }}
        >
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Pending QC Inward
            </p>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '2px', letterSpacing: '-0.02em' }}>
              {pendingGrnCount} <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Batches</span>
            </h3>
            <p style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
              {pendingGrnCount > 0 ? 'Requires sign-off' : 'Dock queue clear'}
            </p>
          </div>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569',
            }}
          >
            <Clock size={16} />
          </div>
        </div>
      )}

      {/* Metric 4: Active Suppliers */}
      {canViewVendors && (
        <div
          className="card-compact"
          style={{
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderLeft: '3px solid #0f172a',
          }}
        >
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Active Suppliers
            </p>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '2px', letterSpacing: '-0.02em' }}>
              {activeVendorsCount} <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Vendors</span>
            </h3>
            <p style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
              {vendors.length} Total Registered
            </p>
          </div>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0f172a',
            }}
          >
            <Building2 size={16} />
          </div>
        </div>
      )}
    </div>
  );
};
