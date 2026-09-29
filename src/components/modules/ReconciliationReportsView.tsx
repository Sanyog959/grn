'use client';

import React from 'react';
import { GRNOrder, GRNItem, Vendor } from '@/types/inventory';

interface ReconciliationReportsViewProps {
  orders: GRNOrder[];
  items: GRNItem[];
  vendors: Vendor[];
}

export const ReconciliationReportsView: React.FC<ReconciliationReportsViewProps> = ({
  orders,
  items,
  vendors,
}) => {
  const totalReceivedQty = items.reduce((sum, it) => sum + (it.receivedQty || 0), 0);
  const totalAcceptedQty = items.reduce((sum, it) => sum + (it.acceptedQty || 0), 0);
  const totalRejectedQty = items.reduce((sum, it) => sum + (it.rejectedQty || 0), 0);
  const totalUnderReview = items.filter((it) => it.qcStatus === 'Under Review').length;

  const acceptanceRate =
    totalReceivedQty > 0 ? ((totalAcceptedQty / totalReceivedQty) * 100).toFixed(1) : '100.0';
  const rejectionRate =
    totalReceivedQty > 0 ? ((totalRejectedQty / totalReceivedQty) * 100).toFixed(1) : '0.0';

  const totalGrnValue = orders.reduce((sum, o) => sum + (o.totalValue || 0), 0);

  const handlePrint = () => {
    window.print();
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
            Reconciliation & Audit Reports
          </h1>
          <p style={{ fontSize: '12.5px', color: '#64748b', margin: '2px 0 0 0' }}>
            Supplier Quality SLA, Defect Variance & Inventory Capital Valuation
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="btn-aurora"
          style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 700 }}
        >
          🖨 Print Summary
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
        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>PLANT ACCEPTANCE RATE</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#15803d', margin: '4px 0' }}>
            {acceptanceRate}%
          </div>
          <div style={{ fontSize: '12px', color: '#15803d', fontWeight: 600 }}>QC Passed Material</div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>TOTAL REJECTIONS</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#b91c1c', margin: '4px 0' }}>
            {totalRejectedQty} Units
          </div>
          <div style={{ fontSize: '12px', color: '#b91c1c', fontWeight: 600 }}>Rejection Rate: {rejectionRate}%</div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>AWAITING QC CLEARANCE</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#b45309', margin: '4px 0' }}>
            {totalUnderReview} Lines
          </div>
          <div style={{ fontSize: '12px', color: '#b45309', fontWeight: 600 }}>Under Hardness/Dimensional Test</div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>TOTAL INWARD CAPITAL</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#1e40af', margin: '4px 0' }}>
            ₹{totalGrnValue.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: 600 }}>Processed Inward Goods</div>
        </div>
      </div>

      {/* Supplier Performance Table */}
      <div className="card table-responsive-container" style={{ padding: '20px', marginBottom: '24px', overflowX: 'auto' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 14px 0' }}>
          Supplier Quality & SLA Compliance Scorecard
        </h3>
        <table className="table-aurora" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>SUPPLIER</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>CATEGORY</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>QUALITY RATING</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>LEAD TIME</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>COMPLIANCE STATUS</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((v) => (
              <tr key={v.vendorCode} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                  <div>{v.vendorName}</div>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>{v.vendorCode}</span>
                </td>
                <td style={{ padding: '12px 16px', color: '#64748b' }}>{v.category}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#f59e0b', fontWeight: 800 }}>★</span>
                    <strong style={{ color: '#0f172a' }}>{v.qualityRating} / 5.0</strong>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{v.leadTimeDays} Days SLA</td>
                <td style={{ padding: '12px 16px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '999px',
                      background: v.status === 'Preferred' ? '#dcfce7' : '#e0f2fe',
                      color: v.status === 'Preferred' ? '#15803d' : '#0369a1',
                    }}
                  >
                    ● {v.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
