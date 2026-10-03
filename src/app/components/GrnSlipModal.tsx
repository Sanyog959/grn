'use client';

import React from 'react';
import { GRNOrder, GRNItem } from '@/types/inventory';

interface GrnSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: GRNOrder | null;
  items: GRNItem[];
}

export const GrnSlipModal: React.FC<GrnSlipModalProps> = ({
  isOpen,
  onClose,
  order,
  items,
}) => {
  if (!isOpen || !order) return null;

  const relevantItems = items.filter((it) => it.grnNumber === order.grnNumber);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '820px', padding: '18px 20px', background: '#ffffff' }}
      >
        {/* Actions bar */}
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
          <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#64748b' }}>
            Official Inward Warehouse Slip
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handlePrint} className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
              Print / Save PDF
            </button>
            <button onClick={onClose} className="btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }}>
              Close
            </button>
          </div>
        </div>

        {/* Printable Document Area */}
        <div
          id="printable-grn-slip"
          style={{
            border: '2px solid #0f172a',
            padding: '24px',
            background: '#ffffff',
            color: '#0f172a',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {/* Top Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: '2px solid #0f172a',
              paddingBottom: '16px',
              marginBottom: '18px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '22px' }}>✦</span>
                <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em' }}>
                  AURA LOGISTICS & SUPPLY CHAIN
                </h1>
              </div>
              <p style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                Automated Goods Received Note & Inward Inspection Certificate
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '18px',
                  fontWeight: 800,
                  letterSpacing: '1px',
                }}
              >
                {order.grnNumber}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                Barcode: *{order.grnNumber.replace(/-/g, '')}*
              </div>
            </div>
          </div>

          {/* Consignment Info Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              background: '#f8fafc',
              padding: '14px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              marginBottom: '20px',
              fontSize: '12.5px',
            }}
          >
            <div>
              <span style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Purchase Order</span>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>{order.poNumber}</div>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Receiving Date</span>
              <div style={{ fontWeight: 600 }}>{order.receivedDate}</div>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Receiving Bay</span>
              <div style={{ fontWeight: 600 }}>{order.warehouse}</div>
            </div>

            <div>
              <span style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Supplier / Vendor</span>
              <div style={{ fontWeight: 700, color: '#1e293b' }}>{order.vendorName}</div>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Carrier / Tracking</span>
              <div style={{ fontWeight: 600 }}>{order.carrierTracking || 'Standard Delivery'}</div>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>QC Inspector</span>
              <div style={{ fontWeight: 600 }}>{order.inspector}</div>
            </div>
          </div>

          {/* Line Items Table */}
          <div style={{ marginBottom: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>#</th>
                  <th style={{ padding: '8px' }}>SKU Code</th>
                  <th style={{ padding: '8px' }}>Item Description</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Ordered</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Received</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Accepted</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Rejected</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Price ($)</th>
                  <th style={{ padding: '8px' }}>QC Remarks</th>
                </tr>
              </thead>
              <tbody>
                {relevantItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '16px', color: '#94a3b8' }}>
                      Consignment general inward record.
                    </td>
                  </tr>
                ) : (
                  relevantItems.map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px' }}>{idx + 1}</td>
                      <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {item.itemCode}
                      </td>
                      <td style={{ padding: '8px' }}>{item.description}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>{item.poQty}</td>
                      <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700 }}>{item.receivedQty}</td>
                      <td style={{ padding: '8px', textAlign: 'center', color: '#059669', fontWeight: 700 }}>
                        {item.acceptedQty}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center', color: item.rejectedQty > 0 ? '#e11d48' : '#94a3b8' }}>
                        {item.rejectedQty}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>${item.unitPrice.toFixed(2)}</td>
                      <td style={{ padding: '8px', fontSize: '11px', color: item.rejectionReason ? '#e11d48' : '#64748b' }}>
                        {item.rejectionReason || 'Physical check passed'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Notes & Summary */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderTop: '1px solid #e2e8f0',
              paddingTop: '12px',
              fontSize: '12px',
              marginBottom: '28px',
            }}
          >
            <div style={{ maxWidth: '450px' }}>
              <strong>Inspector Remarks:</strong>
              <p style={{ color: '#475569', marginTop: '3px' }}>
                {order.notes || 'All inward physical packaging examined. Goods recorded into inventory system.'}
              </p>
            </div>
            <div style={{ textAlign: 'right', fontSize: '13px' }}>
              <div>Total Items: <strong>{order.totalItems} Units</strong></div>
              <div style={{ marginTop: '4px', fontSize: '15px' }}>
                Total Consignment Value: <strong>${order.totalValue?.toLocaleString()}</strong>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '24px',
              marginTop: '40px',
              fontSize: '11px',
              textAlign: 'center',
            }}
          >
            <div>
              <div style={{ borderBottom: '1px solid #94a3b8', height: '36px' }}></div>
              <p style={{ marginTop: '6px', fontWeight: 600 }}>Dock Receiving Agent</p>
            </div>
            <div>
              <div style={{ borderBottom: '1px solid #94a3b8', height: '36px' }}>
                <span style={{ fontStyle: 'italic', fontFamily: 'serif', fontSize: '14px', color: '#1e293b' }}>
                  {order.inspector}
                </span>
              </div>
              <p style={{ marginTop: '6px', fontWeight: 600 }}>Quality Control Inspector</p>
            </div>
            <div>
              <div style={{ borderBottom: '1px solid #94a3b8', height: '36px' }}></div>
              <p style={{ marginTop: '6px', fontWeight: 600 }}>Warehouse Manager Sign-off</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
