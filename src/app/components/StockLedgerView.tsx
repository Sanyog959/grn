'use client';

import React, { useState, useEffect } from 'react';
import { StockLedgerEntry } from '@/types/inventory';
import { useAuth } from '@/context/AuthContext';
import {
  Layers,
  Search,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  User,
  ShieldCheck,
  RefreshCw,
  X,
  Send,
} from 'lucide-react';

export const StockLedgerView: React.FC = () => {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<StockLedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  // Modal for logging stock movement
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalItemCode, setModalItemCode] = useState('ITM-01');
  const [modalItemName, setModalItemName] = useState('Precision Machined Flange');
  const [modalType, setModalType] = useState<StockLedgerEntry['transactionType']>('PRODUCTION_ISSUE');
  const [modalChangeQty, setModalChangeQty] = useState('-30');
  const [modalRef, setModalRef] = useState('REQ-PROD-402');
  const [modalRemarks, setModalRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLedger = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/stock');
      const data = await res.json();
      if (data.success && Array.isArray(data.entries)) {
        setEntries(data.entries);
      }
    } catch (err) {
      console.error('Failed to load stock ledger:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  const handleLogMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemCode: modalItemCode,
          itemName: modalItemName,
          transactionType: modalType,
          referenceNumber: modalRef,
          changeQty: Number(modalChangeQty),
          location: modalType === 'PRODUCTION_ISSUE' ? 'PRODUCTION' : 'STORE',
          performedBy: profile?.fullName || 'Quality / Warehouse',
          userRole: profile?.role || 'STORE',
          remarks: modalRemarks || 'Stock adjustment recorded in audit ledger',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setModalRemarks('');
        await fetchLedger();
      } else {
        alert(data.error || 'Failed to record stock movement');
      }
    } catch (err) {
      console.error('Failed to record stock movement:', err);
      alert('Network error while saving stock entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      entry.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.remarks.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.performedBy.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType =
      filterType === 'ALL' ? true : entry.transactionType === filterType;

    return matchesSearch && matchesType;
  });

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'INWARD_GRN':
      case 'QC_ACCEPT':
        return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', label: 'QC Accepted Inward' };
      case 'PRODUCTION_ISSUE':
        return { bg: '#f1f5f9', color: '#334155', border: '#cbd5e1', label: 'Production Issue' };
      case 'SCRAP_ADJUSTMENT':
      case 'QC_REJECT':
        return { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', label: 'Scrap / Reject' };
      case 'RETURN':
        return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', label: 'Shopfloor Return' };
      default:
        return { bg: '#f8fafc', color: '#475569', border: '#e2e8f0', label: 'Manual Audit' };
    }
  };

  return (
    <div className="card-compact" style={{ padding: '20px', marginBottom: '28px' }}>
      {/* Top Banner: Real-time Stock Audit Tracker */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '20px',
          paddingBottom: '16px',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="#2563eb" />
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Immutable Stock Ledger & Audit Trail
            </h3>
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', margin: 0 }}>
            Real-time double-entry inventory ledger with previous stock, change delta, new balance, and tester remarks.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={fetchLedger}
            className="btn-outline"
            style={{ padding: '6px 12px', fontSize: '12px', height: '32px' }}
            title="Refresh Ledger"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span className="desktop-only-text">Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="btn-primary"
            style={{ padding: '6px 14px', fontSize: '12px', height: '32px' }}
          >
            <Plus size={14} />
            <span>Log Movement</span>
          </button>
        </div>
      </div>

      {/* Live Stock Progression Example (50 -> 100 -> 30 -> 20) */}
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '14px 16px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>
            Stock Movement Audit Trail Example (ITM-01: Precision Machined Flange)
          </span>
          <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600 }}>
            Live Balance: 100 units
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 10px', textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: '10px', color: '#64748b' }}>Opening</div>
            <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a', fontFamily: 'var(--font-mono)' }}>50</div>
          </div>

          <div style={{ color: '#2563eb', fontWeight: 700, fontSize: '13px' }}>➔</div>

          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '6px 10px', textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: '10px', color: '#1d4ed8' }}>+100 Inward GRN</div>
            <div style={{ fontWeight: 800, fontSize: '14px', color: '#1d4ed8', fontFamily: 'var(--font-mono)' }}>150</div>
          </div>

          <div style={{ color: '#2563eb', fontWeight: 700, fontSize: '13px' }}>➔</div>

          <div style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 10px', textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: '10px', color: '#475569' }}>-30 Issue Line 2</div>
            <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a', fontFamily: 'var(--font-mono)' }}>120</div>
          </div>

          <div style={{ color: '#2563eb', fontWeight: 700, fontSize: '13px' }}>➔</div>

          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '6px 10px', textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: '10px', color: '#b91c1c' }}>-20 Tool Wear Scrap</div>
            <div style={{ fontWeight: 800, fontSize: '14px', color: '#b91c1c', fontFamily: 'var(--font-mono)' }}>100</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <div className="search-box" style={{ width: '320px' }}>
          <Search size={14} className="search-icon" />
          <input
            type="text"
            className="form-input"
            placeholder="Search SKU, Ref #, Remarks, User..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto' }}>
          {['ALL', 'QC_ACCEPT', 'PRODUCTION_ISSUE', 'SCRAP_ADJUSTMENT', 'MANUAL_AUDIT'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(type)}
              className={`filter-pill ${filterType === type ? 'active' : ''}`}
            >
              {type === 'ALL' ? 'All Movements' : type.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="aurora-table-wrapper">
        <table className="aurora-table">
          <thead>
            <tr>
              <th style={{ width: '130px' }}>Timestamp</th>
              <th style={{ width: '160px' }}>Item & Material</th>
              <th style={{ width: '140px' }}>Movement Type</th>
              <th style={{ width: '120px' }}>Reference #</th>
              <th style={{ width: '180px' }}>Stock Trail (Prev → Delta → New)</th>
              <th style={{ width: '130px' }}>Performed By</th>
              <th>QC Remarks / Reason</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                  No stock transactions found matching your criteria.
                </td>
              </tr>
            ) : (
              filteredEntries.map((entry) => {
                const badge = getTransactionBadge(entry.transactionType);
                const isPositive = entry.changeQty > 0;
                const sign = isPositive ? '+' : '';

                return (
                  <tr key={entry.id}>
                    <td>
                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                        <div>{new Date(entry.timestamp).toLocaleDateString()}</div>
                        <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                          {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#0f172a', fontSize: '12.5px' }}>
                          {entry.itemCode}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '1px' }}>
                          {entry.itemName}
                        </div>
                      </div>
                    </td>

                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                        }}
                      >
                        {badge.label}
                      </span>
                    </td>

                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        {entry.referenceNumber}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}>
                        <span style={{ color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                          {entry.previousStock}
                        </span>
                        <span style={{ color: '#94a3b8' }}>➔</span>
                        <span
                          style={{
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            color: isPositive ? '#16a34a' : entry.changeQty < 0 ? '#dc2626' : '#64748b',
                            background: isPositive ? '#f0fdf4' : entry.changeQty < 0 ? '#fef2f2' : '#f8fafc',
                            padding: '1px 6px',
                            borderRadius: '4px',
                          }}
                        >
                          {sign}{entry.changeQty}
                        </span>
                        <span style={{ color: '#94a3b8' }}>➔</span>
                        <span style={{ fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-mono)' }}>
                          {entry.newStock}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <User size={12} color="#64748b" />
                          <span>{entry.performedBy}</span>
                        </div>
                        <span style={{ fontSize: '10px', color: '#64748b', background: '#f1f5f9', padding: '1px 5px', borderRadius: '3px' }}>
                          {entry.userRole}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '12px', color: '#334155', lineHeight: '1.4' }}>
                        {entry.remarks}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Log Movement */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} color="#2563eb" />
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Log Stock Movement
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleLogMovement} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Item Code & Name
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={`${modalItemCode} - ${modalItemName}`}
                  readOnly
                  disabled
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Movement Type
                  </label>
                  <select
                    className="form-select"
                    value={modalType}
                    onChange={(e) => setModalType(e.target.value as StockLedgerEntry['transactionType'])}
                  >
                    <option value="QC_ACCEPT">QC Accept (+)</option>
                    <option value="PRODUCTION_ISSUE">Production Issue (-)</option>
                    <option value="SCRAP_ADJUSTMENT">Scrap / Wear (-)</option>
                    <option value="RETURN">Shopfloor Return (+)</option>
                    <option value="MANUAL_AUDIT">Manual Audit (+/-)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Change Delta (e.g. +100, -30)
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={modalChangeQty}
                    onChange={(e) => setModalChangeQty(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Reference Document # (PO / GRN / Req #)
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={modalRef}
                  onChange={(e) => setModalRef(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Quality Tester / Operator Remarks
                </label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Enter dimensional inspection results, work order reference, or reason for scrap..."
                  value={modalRemarks}
                  onChange={(e) => setModalRemarks(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-outline"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary"
                  style={{ flex: 1 }}
                >
                  {isSubmitting ? 'Logging...' : 'Save & Notify Admin / QA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
