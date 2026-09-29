'use client';

import React, { useState } from 'react';
import { GRNOrder, GRNItem, Vendor } from '@/types/inventory';

interface CreateGrnModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendors: Vendor[];
  nextGrnNumber: string;
  onCreateGrn: (order: GRNOrder, items: GRNItem[]) => Promise<void>;
}

interface NewItemRow {
  itemCode: string;
  description: string;
  category: string;
  poQty: number;
  receivedQty: number;
  unit: string;
  unitPrice: number;
  batchNumber: string;
}

export const CreateGrnModal: React.FC<CreateGrnModalProps> = ({
  isOpen,
  onClose,
  vendors,
  nextGrnNumber,
  onCreateGrn,
}) => {
  const [poNumber, setPoNumber] = useState('');
  const [vendorName, setVendorName] = useState(vendors[0]?.vendorName || '');
  const [receivedDate, setReceivedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [warehouse, setWarehouse] = useState('Main Factory Store');
  const [carrierTracking, setCarrierTracking] = useState('');
  const [inspector, setInspector] = useState('');
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<NewItemRow[]>(() => [
    {
      itemCode: '',
      description: '',
      category: '',
      poQty: 0,
      receivedQty: 0,
      unit: 'NOS',
      unitPrice: 0,
      batchNumber: '',
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        itemCode: 'SKU-' + Math.floor(100 + Math.random() * 900),
        description: 'Industrial Fastener Assembly',
        category: 'Hardware',
        poQty: 50,
        receivedQty: 50,
        unit: 'SETS',
        unitPrice: 42.5,
        batchNumber: 'LOT-' + new Date().getFullYear() + '-02',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof NewItemRow, value: unknown) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  // Computations
  const totalItems = items.reduce((sum, it) => sum + (Number(it.receivedQty) || 0), 0);
  const totalValue = items.reduce(
    (sum, it) => sum + (Number(it.receivedQty) || 0) * (Number(it.unitPrice) || 0),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const newOrder: GRNOrder = {
      grnNumber: nextGrnNumber,
      poNumber,
      vendorName,
      receivedDate,
      warehouse,
      carrierTracking,
      inspector,
      totalItems,
      totalValue,
      status: 'Pending QC',
      notes,
    };

    const newItems: GRNItem[] = items.map((it, idx) => ({
      id: `ITEM-${Date.now()}-${idx}`,
      grnNumber: nextGrnNumber,
      itemCode: it.itemCode,
      description: it.description,
      category: it.category,
      poQty: Number(it.poQty),
      receivedQty: Number(it.receivedQty),
      acceptedQty: Number(it.receivedQty), // Default initial acceptance pending review
      rejectedQty: 0,
      unit: it.unit,
      unitPrice: Number(it.unitPrice),
      batchNumber: it.batchNumber,
      qcStatus: 'Under Review',
    }));

    try {
      await onCreateGrn(newOrder, newItems);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '860px', padding: '28px' }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>
                Create Inward Goods Received Note
              </h2>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#4f46e5',
                  background: '#eef2ff',
                  padding: '3px 8px',
                  borderRadius: '6px',
                }}
              >
                {nextGrnNumber}
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Records consignment inward dock receipt into MIMS PostgreSQL Database.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              color: '#94a3b8',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Order Header Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '14px',
              marginBottom: '22px',
            }}
          >
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '5px' }}>
                Purchase Order (PO #) *
              </label>
              <input
                type="text"
                required
                className="form-input"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '5px' }}>
                Supplier / Vendor *
              </label>
              <select
                className="form-select"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
              >
                {vendors.map((v) => (
                  <option key={v.vendorCode} value={v.vendorName}>
                    {v.vendorName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '5px' }}>
                Receiving Date *
              </label>
              <input
                type="date"
                required
                className="form-input"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '5px' }}>
                Destination Warehouse *
              </label>
              <select
                className="form-select"
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value)}
              >
                <option value="Bay-3 Central Hub">Bay-3 Central Hub</option>
                <option value="Zone-A Cleanroom">Zone-A Cleanroom</option>
                <option value="Bay-1 Chemical Vault">Bay-1 Chemical Vault</option>
                <option value="Zone-B High-Bay">Zone-B High-Bay</option>
                <option value="Bay-4 Materials Lab">Bay-4 Materials Lab</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '5px' }}>
                Carrier / Tracking #
              </label>
              <input
                type="text"
                className="form-input"
                value={carrierTracking}
                onChange={(e) => setCarrierTracking(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '5px' }}>
                QC Inspector *
              </label>
              <input
                type="text"
                required
                className="form-input"
                value={inspector}
                onChange={(e) => setInspector(e.target.value)}
              />
            </div>
          </div>

          {/* Line Items Section */}
          <div style={{ marginBottom: '22px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
              }}
            >
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                Consignment Line Items ({items.length})
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: '#eef2ff',
                  color: '#4f46e5',
                  border: '1px solid #c7d2fe',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                + Add Another Item
              </button>
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px' }}>SKU Code</th>
                    <th style={{ padding: '8px 10px' }}>Description</th>
                    <th style={{ padding: '8px 10px', width: '90px' }}>PO Qty</th>
                    <th style={{ padding: '8px 10px', width: '90px' }}>Rec Qty</th>
                    <th style={{ padding: '8px 10px', width: '70px' }}>Unit</th>
                    <th style={{ padding: '8px 10px', width: '100px' }}>Price ($)</th>
                    <th style={{ padding: '8px 10px', width: '110px' }}>Batch #</th>
                    <th style={{ padding: '8px 10px', width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 8px' }}>
                        <input
                          type="text"
                          required
                          className="form-input"
                          style={{ padding: '5px 8px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}
                          value={it.itemCode}
                          onChange={(e) => handleItemChange(idx, 'itemCode', e.target.value)}
                        />
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <input
                          type="text"
                          required
                          className="form-input"
                          style={{ padding: '5px 8px', fontSize: '12px' }}
                          value={it.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        />
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <input
                          type="number"
                          min="1"
                          required
                          className="form-input"
                          style={{ padding: '5px 8px', fontSize: '12px' }}
                          value={it.poQty}
                          onChange={(e) => handleItemChange(idx, 'poQty', Number(e.target.value))}
                        />
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <input
                          type="number"
                          min="0"
                          required
                          className="form-input"
                          style={{ padding: '5px 8px', fontSize: '12px' }}
                          value={it.receivedQty}
                          onChange={(e) => handleItemChange(idx, 'receivedQty', Number(e.target.value))}
                        />
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <select
                          className="form-select"
                          style={{ padding: '5px 6px', fontSize: '12px' }}
                          value={it.unit}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                        >
                          <option value="PCS">PCS</option>
                          <option value="SETS">SETS</option>
                          <option value="ROLLS">ROLLS</option>
                          <option value="DRUMS">DRUMS</option>
                          <option value="KG">KG</option>
                        </select>
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          className="form-input"
                          style={{ padding: '5px 8px', fontSize: '12px' }}
                          value={it.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                        />
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <input
                          type="text"
                          className="form-input"
                          style={{ padding: '5px 8px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}
                          value={it.batchNumber}
                          onChange={(e) => handleItemChange(idx, 'batchNumber', e.target.value)}
                        />
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: '14px',
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total summary bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '24px',
                marginTop: '10px',
                fontSize: '13px',
                padding: '8px 14px',
                background: '#f8fafc',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
              }}
            >
              <span>
                Total Units: <strong>{totalItems.toLocaleString()}</strong>
              </span>
              <span>
                Total Consignment Value:{' '}
                <strong style={{ color: '#059669', fontSize: '14px' }}>
                  ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </span>
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '22px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '5px' }}>
              Receiving Notes / Inspector Remarks
            </label>
            <textarea
              rows={2}
              className="form-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-aurora">
              {isSubmitting ? 'Saving Inward Dock Entry...' : '✦ Create Inward Dock GRN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
