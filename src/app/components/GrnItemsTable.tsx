'use client';

import React, { useState } from 'react';
import { GRNItem } from '@/types/inventory';

interface GrnItemsTableProps {
  items: GRNItem[];
  selectedGrnFilter: string;
  defaultQcStatusFilter?: string;
  onClearGrnFilter: () => void;
  onUpdateItemQc: (itemId: string, status: 'Passed' | 'Under Review' | 'Failed', reason?: string) => void;
}

export const GrnItemsTable: React.FC<GrnItemsTableProps> = ({
  items,
  selectedGrnFilter,
  defaultQcStatusFilter,
  onClearGrnFilter,
  onUpdateItemQc,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [qcStatusFilter, setQcStatusFilter] = useState(defaultQcStatusFilter || 'ALL');

  React.useEffect(() => {
    if (defaultQcStatusFilter !== undefined) {
      setQcStatusFilter(defaultQcStatusFilter);
    }
  }, [defaultQcStatusFilter]);

  // Filter items
  const filteredItems = items.filter((it) => {
    const matchesGrn = selectedGrnFilter
      ? it.grnNumber.toLowerCase() === selectedGrnFilter.toLowerCase()
      : true;

    const matchesSearch =
      it.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      it.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      it.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      it.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      it.grnNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesQc =
      qcStatusFilter === 'ALL' ? true : it.qcStatus.toLowerCase() === qcStatusFilter.toLowerCase();

    return matchesGrn && matchesSearch && matchesQc;
  });

  const getQcBadge = (status: string) => {
    switch (status) {
      case 'Passed':
        return 'badge-approved';
      case 'Under Review':
        return 'badge-pending';
      case 'Failed':
        return 'badge-rejected';
      default:
        return 'badge-pending';
    }
  };

  const handleRejectClick = (itemId: string) => {
    const reason = window.prompt(
      'Enter reason for QC rejection (e.g., Dimensional tolerance error, seal broken):'
    );
    if (reason !== null) {
      onUpdateItemQc(itemId, 'Failed', reason || 'QC inspection threshold failed');
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
      {/* Active GRN Filter Notice (if filtered from Master Table) */}
      {selectedGrnFilter && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            borderRadius: '8px',
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            marginBottom: '18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px' }}>📌</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#3730a3' }}>
              Showing Line Items for Consignment: <strong>{selectedGrnFilter}</strong>
            </span>
          </div>
          <button
            onClick={onClearGrnFilter}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 600,
              background: '#ffffff',
              border: '1px solid #c7d2fe',
              borderRadius: '6px',
              color: '#4f46e5',
              cursor: 'pointer',
            }}
          >
            Show All GRN Items ✕
          </button>
        </div>
      )}

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
        <div className="search-box" style={{ width: '340px' }}>
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="form-input"
            placeholder="Search SKU, Description, Batch, Category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {['ALL', 'Passed', 'Under Review', 'Failed'].map((status) => (
            <button
              key={status}
              onClick={() => setQcStatusFilter(status)}
              style={{
                padding: '6px 12px',
                fontSize: '12.5px',
                fontWeight: 600,
                borderRadius: '8px',
                border: qcStatusFilter === status ? '1px solid #6366f1' : '1px solid #e2e8f0',
                background: qcStatusFilter === status ? '#eef2ff' : '#ffffff',
                color: qcStatusFilter === status ? '#4f46e5' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {status === 'ALL' ? `All Items (${items.length})` : status}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="aurora-table-wrapper">
        <table className="aurora-table">
          <thead>
            <tr>
              <th>SKU & Description</th>
              <th>GRN Reference</th>
              <th>Quantities (PO / Rec / Acc / Rej)</th>
              <th>Unit & Pricing</th>
              <th>Batch / Lot</th>
              <th>QC Status & Findings</th>
              <th style={{ textAlign: 'right' }}>QC Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                  No line items found matching your filters.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const totalItemVal = (item.receivedQty || 0) * (item.unitPrice || 0);
                const acceptPercent =
                  item.receivedQty > 0
                    ? Math.round(((item.acceptedQty || 0) / item.receivedQty) * 100)
                    : 0;

                return (
                  <tr key={item.id}>
                    <td>
                      <div>
                        <span
                          style={{
                            fontWeight: 700,
                            color: '#0f172a',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '13px',
                          }}
                        >
                          {item.itemCode}
                        </span>
                        <div style={{ fontWeight: 600, color: '#334155', fontSize: '13px', marginTop: '2px' }}>
                          {item.description}
                        </div>
                        <span
                          style={{
                            display: 'inline-block',
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: '#f1f5f9',
                            color: '#475569',
                            marginTop: '3px',
                          }}
                        >
                          {item.category}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12px',
                          color: '#4f46e5',
                          fontWeight: 600,
                        }}
                      >
                        {item.grnNumber}
                      </span>
                    </td>
                    <td style={{ minWidth: '180px' }}>
                      <div style={{ fontSize: '12.5px' }}>
                        <div>
                          <strong>Rec: {item.receivedQty}</strong> / PO: {item.poQty} {item.unit}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '11.5px', marginTop: '2px' }}>
                          <span style={{ color: '#059669', fontWeight: 600 }}>
                            ✓ Acc: {item.acceptedQty}
                          </span>
                          {item.rejectedQty > 0 && (
                            <span style={{ color: '#e11d48', fontWeight: 600 }}>
                              ✕ Rej: {item.rejectedQty}
                            </span>
                          )}
                        </div>
                        {/* Progress bar */}
                        <div
                          style={{
                            width: '100%',
                            height: '5px',
                            background: '#e2e8f0',
                            borderRadius: '3px',
                            marginTop: '6px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${acceptPercent}%`,
                              height: '100%',
                              background:
                                item.qcStatus === 'Failed'
                                  ? '#f43f5e'
                                  : 'var(--grad-emerald)',
                              borderRadius: '3px',
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          ${item.unitPrice.toFixed(2)} / {item.unit}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                          Total: ${totalItemVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11.5px',
                          background: '#f8fafc',
                          padding: '3px 6px',
                          borderRadius: '4px',
                          border: '1px solid #e2e8f0',
                          color: '#334155',
                        }}
                      >
                        {item.batchNumber || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <div>
                        <span className={`badge-status ${getQcBadge(item.qcStatus)}`}>
                          {item.qcStatus}
                        </span>
                        {item.rejectionReason && (
                          <div
                            style={{
                              fontSize: '11px',
                              color: '#b91c1c',
                              marginTop: '4px',
                              maxWidth: '180px',
                              lineHeight: '1.3',
                            }}
                          >
                            ⚠️ {item.rejectionReason}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        {item.qcStatus !== 'Passed' && (
                          <button
                            onClick={() => onUpdateItemQc(item.id, 'Passed')}
                            title="Pass Item QC"
                            style={{
                              padding: '5px 8px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              borderRadius: '6px',
                              border: '1px solid #a7f3d0',
                              background: '#ecfdf5',
                              color: '#065f46',
                              cursor: 'pointer',
                            }}
                          >
                            Pass
                          </button>
                        )}
                        {item.qcStatus !== 'Failed' && (
                          <button
                            onClick={() => handleRejectClick(item.id)}
                            title="Flag Discrepancy / Reject"
                            style={{
                              padding: '5px 8px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              borderRadius: '6px',
                              border: '1px solid #fecdd3',
                              background: '#fff1f2',
                              color: '#be123c',
                              cursor: 'pointer',
                            }}
                          >
                            Reject
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
    </div>
  );
};
