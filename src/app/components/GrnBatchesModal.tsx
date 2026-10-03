'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GRNOrder, GRNItem, GRNInwardBatch } from '@/types/inventory';
import { useAuth } from '@/context/AuthContext';
import {
  X,
  Plus,
  Truck,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  Send,
  AlertTriangle,
  FileText,
  User,
  Package,
} from 'lucide-react';

interface GrnBatchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: GRNOrder | null;
  item?: GRNItem | null;
  items?: GRNItem[];
  onBatchAdded?: (batch: GRNInwardBatch) => void;
  onSendToQc?: (grnNumber: string, isScrap?: boolean) => void;
}

export const GrnBatchesModal: React.FC<GrnBatchesModalProps> = ({
  isOpen,
  onClose,
  order,
  item,
  items = [],
  onBatchAdded,
  onSendToQc,
}) => {
  const { profile } = useAuth();
  const [batches, setBatches] = useState<GRNInwardBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Available items for this GRN
  const orderItems = useMemo(() => {
    if (!order) return [];
    if (items && items.length > 0) {
      const matched = items.filter(
        (it) => it.grnNumber.trim().toLowerCase() === order.grnNumber.trim().toLowerCase()
      );
      if (matched.length > 0) return matched;
    }
    if (item) return [item];
    return [];
  }, [order, items, item]);

  // Selected item code
  const [selectedItemCode, setSelectedItemCode] = useState<string>(
    item?.itemCode || orderItems[0]?.itemCode || 'ITM-01'
  );

  // Sync selected item when item prop or modal opens
  useEffect(() => {
    if (item?.itemCode) {
      setSelectedItemCode(item.itemCode);
    } else if (orderItems.length > 0) {
      setSelectedItemCode(orderItems[0].itemCode);
    }
  }, [item, orderItems]);

  const activeItem = useMemo(() => {
    return (
      orderItems.find((it) => it.itemCode === selectedItemCode) ||
      item ||
      orderItems[0] ||
      null
    );
  }, [orderItems, selectedItemCode, item]);

  const grnNumber = order?.grnNumber || '';
  const itemCode = activeItem?.itemCode || 'ITM-01';
  const itemName = activeItem?.description || 'Industrial Material';
  const orderedTotal =
    Number(activeItem?.orderedQty) ||
    Number(activeItem?.poQty) ||
    Number(order?.totalOrderedQty) ||
    Number(order?.totalItems) ||
    100;

  // New batch form state
  const [receivedQty, setReceivedQty] = useState<number>(30);
  const [receivedDate, setReceivedDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [deliveryChallan, setDeliveryChallan] = useState<string>('');
  const [vehicleNumber, setVehicleNumber] = useState<string>('');
  const [receivedBy, setReceivedBy] = useState<string>(
    profile?.fullName || 'Store Receiver'
  );
  const [isScrapOrJunk, setIsScrapOrJunk] = useState<boolean>(false);
  const [remarks, setRemarks] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Fetch batches for this GRN and active item
  const fetchBatches = useCallback(async () => {
    if (!grnNumber) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/grn/batches?grnNumber=${encodeURIComponent(
          grnNumber
        )}&itemCode=${encodeURIComponent(itemCode)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.batches && Array.isArray(data.batches)) {
          setBatches(data.batches);
        }
      }
    } catch (err) {
      console.error('Error fetching batches:', err);
    } finally {
      setLoading(false);
    }
  }, [grnNumber, itemCode]);

  useEffect(() => {
    if (isOpen && grnNumber) {
      fetchBatches();
      setDeliveryChallan(`CH-${Math.floor(1000 + Math.random() * 9000)}`);
      setFormError(null);
      setSuccessMessage(null);
      setShowAddForm(false);
    }
  }, [isOpen, grnNumber, itemCode, fetchBatches]);

  if (!isOpen || !order) return null;

  // Calculate totals for active item
  const totalReceivedSoFar = batches.reduce(
    (sum, b) => sum + Number(b.receivedQty),
    0
  );
  const currentItemReceived =
    totalReceivedSoFar > 0
      ? totalReceivedSoFar
      : activeItem?.receivedQty || order.totalItems;
  const pendingQty = Math.max(0, orderedTotal - currentItemReceived);
  const percentComplete = Math.min(
    100,
    Math.round((currentItemReceived / orderedTotal) * 100)
  );

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    const qty = Number(receivedQty);
    if (!qty || qty <= 0) {
      setFormError('Please enter a valid received quantity greater than 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/grn/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grnNumber,
          itemCode,
          itemName,
          orderedQty: orderedTotal,
          receivedQty: qty,
          receivedDate,
          deliveryChallan,
          vehicleNumber,
          receivedBy,
          isScrapOrJunk,
          remarks,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        setFormError(data.error || 'Failed to record inward batch');
        return;
      }

      setSuccessMessage(
        `✓ Installment recorded for ${itemCode}: ${qty} units inwarded. Email notification dispatched to Admin and QC!`
      );
      setShowAddForm(false);
      setRemarks('');
      await fetchBatches();
      if (onBatchAdded && data.batch) {
        onBatchAdded(data.batch);
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error submitting batch');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForwardToQc = async () => {
    try {
      const res = await fetch('/api/grn/send-to-qc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grnNumber,
          sentBy: profile?.fullName || 'Store Inward Bay',
          isScrapOrJunk: isScrapOrJunk || order.isScrapReceipt,
          notes: `Consignment with ${batches.length} delivery installment(s) forwarded for QC physical inspection.`,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage(
          '✓ Consignment successfully forwarded to QC. Real-time alert dispatched to Admin & QC Inspector.'
        );
        onSendToQc?.(grnNumber, isScrapOrJunk || order.isScrapReceipt);
      }
    } catch {
      setFormError('Failed to dispatch QC alert.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '840px',
          padding: '24px',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: '12px',
        }}
      >
        {/* Modal Header */}
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
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  background: '#eff6ff',
                  color: '#2563eb',
                  fontWeight: 800,
                  fontSize: '11px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {grnNumber}
              </span>
              <span
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  fontSize: '11px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                }}
              >
                PO #{order.poNumber}
              </span>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Split Delivery & Inward Batches
              </h2>
            </div>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: '4px 0 0 0' }}>
              Supplier: <strong style={{ color: '#0f172a' }}>{order.vendorName}</strong> &bull; Dock: {order.warehouse}
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
            }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Multi-Product Selector (If GRN has multiple products, e.g. 10 products) */}
        {orderItems.length > 1 && (
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#475569',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Package size={13} color="#2563eb" />
              <span>Select Product to Inward & Track History ({orderItems.length} Products in this Inward):</span>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '4px',
              }}
            >
              {orderItems.map((it) => {
                const isSelected = it.itemCode === selectedItemCode;
                const po = Number(it.orderedQty || it.poQty) || 0;
                const rec = Number(it.receivedQty) || 0;
                return (
                  <button
                    key={it.itemCode}
                    type="button"
                    onClick={() => {
                      setSelectedItemCode(it.itemCode);
                      setShowAddForm(false);
                      setSuccessMessage(null);
                      setFormError(null);
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: isSelected ? 700 : 500,
                      background: isSelected ? '#1e293b' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#334155',
                      border: isSelected ? '1px solid #0f172a' : '1px solid #cbd5e1',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: isSelected ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{it.itemCode}</span>
                    <span style={{ opacity: 0.85, fontSize: '11px' }}>
                      ({rec}/{po} {it.unit || 'units'})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Product Title & Highlight Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0369a1' }}>
              Tracking Product: {itemName}
            </div>
            <div style={{ fontSize: '11.5px', color: '#0284c7', fontFamily: 'var(--font-mono)' }}>
              SKU: {itemCode} &bull; Total PO Target: {orderedTotal} {activeItem?.unit || 'units'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              className="btn-primary"
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Plus size={14} />
              <span>{showAddForm ? 'Cancel Form' : '+ Inward Next Installment'}</span>
            </button>
          </div>
        </div>

        {/* Progress & Staggered Status Metrics */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '14px',
            marginBottom: '18px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12.5px' }}>
            <span style={{ color: '#475569', fontWeight: 600 }}>
              Delivery Completion Progress:
            </span>
            <span style={{ fontWeight: 800, color: '#0f172a' }}>
              {currentItemReceived} / {orderedTotal} {activeItem?.unit || 'units'} ({percentComplete}%)
            </span>
          </div>

          {/* Progress Bar */}
          <div
            style={{
              width: '100%',
              height: '9px',
              background: '#e2e8f0',
              borderRadius: '999px',
              overflow: 'hidden',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                width: `${percentComplete}%`,
                height: '100%',
                background: percentComplete >= 100 ? '#16a34a' : 'linear-gradient(90deg, #3b82f6, #6366f1)',
                transition: 'width 0.4s ease',
              }}
            />
          </div>

          {/* Metric Tiles */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
              textAlign: 'center',
            }}
          >
            <div style={{ padding: '8px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                Total PO Ordered
              </div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-mono)' }}>
                {orderedTotal}
              </div>
            </div>

            <div style={{ padding: '8px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '10.5px', color: '#16a34a', fontWeight: 600, textTransform: 'uppercase' }}>
                Cumulative Received
              </div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#16a34a', fontFamily: 'var(--font-mono)' }}>
                {currentItemReceived}
              </div>
            </div>

            <div style={{ padding: '8px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '10.5px', color: pendingQty > 0 ? '#b45309' : '#16a34a', fontWeight: 600, textTransform: 'uppercase' }}>
                Pending Balance
              </div>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 800,
                  color: pendingQty > 0 ? '#b45309' : '#16a34a',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {pendingQty}
              </div>
            </div>
          </div>
        </div>

        {/* Notices */}
        {successMessage && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '6px',
              background: '#dcfce7',
              border: '1px solid #bbf7d0',
              color: '#15803d',
              fontSize: '12px',
              fontWeight: 600,
              marginBottom: '16px',
            }}
          >
            {successMessage}
          </div>
        )}

        {formError && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '6px',
              background: '#fee2e2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: '12px',
              fontWeight: 600,
              marginBottom: '16px',
            }}
          >
            ⚠️ {formError}
          </div>
        )}

        {/* Form: Add New Inward Installment */}
        {showAddForm && (
          <form
            onSubmit={handleCreateBatch}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a', marginBottom: '12px' }}>
              Record Next Delivery Installment for: <span style={{ color: '#2563eb' }}>{itemName} ({itemCode})</span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                marginBottom: '12px',
              }}
            >
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Quantity Arrived Now *
                </label>
                <input
                  type="number"
                  min="1"
                  max={pendingQty > 0 ? pendingQty : 9999}
                  required
                  className="form-input"
                  value={receivedQty}
                  onChange={(e) => setReceivedQty(Number(e.target.value))}
                />
                <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                  Remaining pending: {pendingQty}
                </span>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Arrival Date & Time *
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
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Delivery Challan / DC #
                </label>
                <input
                  type="text"
                  placeholder="e.g. DC-9842"
                  className="form-input"
                  value={deliveryChallan}
                  onChange={(e) => setDeliveryChallan(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Vehicle / Transporter #
                </label>
                <input
                  type="text"
                  placeholder="e.g. MH-12-AB-9988"
                  className="form-input"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Receiver Name
                </label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={receivedBy}
                  onChange={(e) => setReceivedBy(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Stock Type
                </label>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11.5px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    background: isScrapOrJunk ? '#fffbeb' : '#f8fafc',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isScrapOrJunk}
                    onChange={(e) => setIsScrapOrJunk(e.target.checked)}
                  />
                  <span>Junk / Scrap Inward</span>
                </label>
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Delivery Remarks / Package Inspection Notes
              </label>
              <input
                type="text"
                placeholder="e.g. 4 boxes intact, verified against vendor invoice"
                className="form-input"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn-outline"
                style={{ padding: '6px 14px', fontSize: '12px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary"
                style={{ padding: '6px 16px', fontSize: '12px' }}
              >
                {isSubmitting ? 'Recording Inward...' : 'Confirm Inward Receipt'}
              </button>
            </div>
          </form>
        )}

        {/* History Timeline of Past Installments for Selected Product */}
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
              Inward Installment History for {itemCode} ({batches.length} Installments Recorded)
            </div>
            <button
              type="button"
              onClick={fetchBatches}
              className="btn-outline"
              style={{ padding: '3px 8px', fontSize: '11px', height: '24px' }}
            >
              Refresh Batches
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#64748b', fontSize: '12px' }}>
              Loading installment timeline...
            </div>
          ) : batches.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '28px',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px dashed #cbd5e1',
                color: '#64748b',
                fontSize: '12.5px',
              }}
            >
              No partial installments recorded for {itemCode} yet.
              <div style={{ marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="btn-primary"
                  style={{ padding: '5px 12px', fontSize: '11.5px' }}
                >
                  + Record First Installment
                </button>
              </div>
            </div>
          ) : (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px', width: '50px' }}>Seq #</th>
                    <th style={{ padding: '8px 10px' }}>Arrival Date</th>
                    <th style={{ padding: '8px 10px' }}>Qty Inwarded</th>
                    <th style={{ padding: '8px 10px' }}>Cumulative Total</th>
                    <th style={{ padding: '8px 10px' }}>Pending Remaining</th>
                    <th style={{ padding: '8px 10px' }}>Delivery Challan</th>
                    <th style={{ padding: '8px 10px' }}>Vehicle #</th>
                    <th style={{ padding: '8px 10px' }}>Received By</th>
                    <th style={{ padding: '8px 10px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: '#64748b' }}>
                        #{b.batchSeq}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#0f172a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} color="#64748b" />
                          <span>{new Date(b.receivedDate).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: 800, color: '#16a34a' }}>
                        +{b.receivedQty} units
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>
                        {b.cumulativeReceivedQty || b.receivedQty} / {orderedTotal}
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: Number(b.pendingQty) > 0 ? '#b45309' : '#16a34a' }}>
                        {b.pendingQty !== undefined ? b.pendingQty : Math.max(0, orderedTotal - Number(b.cumulativeReceivedQty))}
                      </td>
                      <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)' }}>
                        {b.deliveryChallan || '—'}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#475569' }}>
                        {b.vehicleNumber || '—'}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#475569' }}>
                        {b.receivedBy}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: b.isScrapOrJunk ? '#fef3c7' : '#eff6ff',
                            color: b.isScrapOrJunk ? '#b45309' : '#2563eb',
                          }}
                        >
                          {b.isScrapOrJunk ? 'Scrap' : 'Standard'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '16px',
            borderTop: '1px solid #e2e8f0',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
            <Clock size={13} />
            <span>Automatic notifications dispatched to Admin on every inward update</span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleForwardToQc}
              className="btn-outline"
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                borderColor: '#bfdbfe',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="Alert QC testing dock and notify Admin"
            >
              <Send size={13} />
              <span>Forward to QC Inspection Dock</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="btn-primary"
              style={{ padding: '6px 16px', fontSize: '12px' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
