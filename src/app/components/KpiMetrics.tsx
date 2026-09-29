'use client';

import React from 'react';
import { GRNOrder, GRNItem, Vendor } from '@/types/inventory';

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
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
        gap: '14px',
        marginBottom: '24px',
      }}
    >
      {/* Metric 1: Total Inward Consignment Value (Only if GRN view is granted) */}
      {canViewGrn && (
        <div
          className="glass-panel"
          style={{
            padding: '20px 22px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'var(--grad-aurora)',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Total Inward Value
              </p>
              <h3
                style={{
                  fontSize: '26px',
                  fontWeight: 800,
                  color: 'var(--text-main)',
                  marginTop: '6px',
                  letterSpacing: '-0.02em',
                }}
              >
                ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </h3>
            </div>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(99, 102, 241, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                color: '#4f46e5',
              }}
            >
              📦
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', fontSize: '12.5px' }}>
            <span style={{ color: '#059669', fontWeight: 700, background: '#ecfdf5', padding: '2px 6px', borderRadius: '4px' }}>
              ↑ +18.4%
            </span>
            <span style={{ color: 'var(--text-muted)' }}>
              Across {orders.length} GRNs ({totalItemsCount.toLocaleString()} units)
            </span>
          </div>
        </div>
      )}

      {/* Metric 2: Quality Acceptance Rate (Only if QC view is granted) */}
      {canViewQc && (
        <div
          className="glass-panel"
          style={{
            padding: '20px 22px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'var(--grad-emerald)',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                QC Acceptance Rate
              </p>
              <h3
                style={{
                  fontSize: '26px',
                  fontWeight: 800,
                  color: '#065f46',
                  marginTop: '6px',
                  letterSpacing: '-0.02em',
                }}
              >
                {acceptanceRate}%
              </h3>
            </div>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                color: '#059669',
              }}
            >
              🛡
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', fontSize: '12.5px' }}>
            <span style={{ color: '#059669', fontWeight: 600 }}>
              {totalAcceptedItems.toLocaleString()} passed
            </span>
            <span style={{ color: 'var(--text-muted)' }}>·</span>
            <span style={{ color: '#e11d48', fontWeight: 600 }}>
              {totalRejectedItems} rejected items
            </span>
          </div>
        </div>
      )}

      {/* Metric 3: Pending QC Inspection (Only if QC view is granted) */}
      {canViewQc && (
        <div
          className="glass-panel"
          style={{
            padding: '20px 22px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'var(--grad-amber)',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Pending QC Inward
              </p>
              <h3
                style={{
                  fontSize: '26px',
                  fontWeight: 800,
                  color: '#92400e',
                  marginTop: '6px',
                  letterSpacing: '-0.02em',
                }}
              >
                {pendingGrnCount} Batches
              </h3>
            </div>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                color: '#d97706',
              }}
            >
              ⏳
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', fontSize: '12.5px' }}>
            <span style={{ color: '#b45309', fontWeight: 600, background: '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>
              Requires Inspector Sign-off
            </span>
            <span style={{ color: 'var(--text-muted)' }}>Zone-A & Bay-4</span>
          </div>
        </div>
      )}

      {/* Metric 4: Verified Suppliers (Only if Suppliers/Masters view is granted) */}
      {canViewVendors && (
        <div
          className="glass-panel"
          style={{
            padding: '20px 22px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'var(--grad-violet)',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Active Suppliers
              </p>
              <h3
                style={{
                  fontSize: '26px',
                  fontWeight: 800,
                  color: '#3730a3',
                  marginTop: '6px',
                  letterSpacing: '-0.02em',
                }}
              >
                {activeVendorsCount} Vendors
              </h3>
            </div>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(139, 92, 246, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                color: '#7c3aed',
              }}
            >
              🏭
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', fontSize: '12.5px' }}>
            <span style={{ color: '#4338ca', fontWeight: 600 }}>
              98.2% On-Time SLA
            </span>
            <span style={{ color: 'var(--text-muted)' }}>· Avg rating 4.8★</span>
          </div>
        </div>
      )}
    </div>
  );
};
