'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DispatchRecord, FinishedGoodsStock } from '@/types/inventory';
import { useAuth } from '@/context/AuthContext';
import {
  Truck,
  Plus,
  Search,
  Calendar,
  Clock,
  Package,
  ShieldCheck,
  Eye,
} from 'lucide-react';

export const DispatchManagementView: React.FC = () => {
  const { profile } = useAuth();
  const [dispatches, setDispatches] = useState<DispatchRecord[]>([]);
  const [finishedGoods, setFinishedGoods] = useState<FinishedGoodsStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Minimalist Form State
  const [selectedProductCode, setSelectedProductCode] = useState('');
  const [dispatchDate, setDispatchDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dispatchTime, setDispatchTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [qty, setQty] = useState<number>(5);
  const [customer, setCustomer] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [destination, setDestination] = useState('');
  const [transporter, setTransporter] = useState('SafeXpress Logistics');
  const [vehicle, setVehicle] = useState('MH-12-TR-8899');
  const [gatePass, setGatePass] = useState('');
  const [responsiblePerson, setResponsiblePerson] = useState(profile?.fullName || 'Dispatch Officer');
  const [notes, setNotes] = useState('');

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const isViewer = profile?.role === 'VIEWER';

  const fetchDispatchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dispatch');
      if (res.ok) {
        const data = await res.json();
        if (data.dispatches) setDispatches(data.dispatches);
        if (data.finishedGoods) setFinishedGoods(data.finishedGoods);
      }
    } catch (err) {
      console.error('Error fetching dispatch data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDispatchData();
  }, [fetchDispatchData]);

  // Set default product when finishedGoods load
  useEffect(() => {
    if (finishedGoods.length > 0 && !selectedProductCode) {
      setSelectedProductCode(finishedGoods[0].productCode);
      setQty(Math.min(5, finishedGoods[0].availableQuantity || 5));
    }
  }, [finishedGoods, selectedProductCode]);

  const selectedFg = finishedGoods.find((g) => g.productCode === selectedProductCode);
  const availableFgQty = selectedFg?.availableQuantity ?? 10;

  const handleCreateDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewer) {
      showToast('⚠️ Action restricted: Viewer account has read-only permission.');
      return;
    }

    if (!customer.trim() || !selectedProductCode || qty <= 0) {
      showToast('⚠️ Please enter customer and valid quantity to dispatch');
      return;
    }
    if (qty > availableFgQty) {
      showToast(`⚠️ Cannot dispatch ${qty} units: Only ${availableFgQty} units available in Finished Goods stock`);
      return;
    }

    try {
      const res = await fetch('/api/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customer.trim(),
          customerEmail: customerEmail.trim() || undefined,
          destination: destination.trim() || 'Customer Warehouse',
          productCode: selectedProductCode,
          productName: selectedFg?.productName || 'Manufactured Item',
          batchNumber: selectedFg?.batchNumber || '',
          totalQuantity: qty,
          dispatchDate: dispatchDate || new Date().toISOString().slice(0, 10),
          dispatchTime: dispatchTime || new Date().toTimeString().slice(0, 5),
          transporterName: transporter,
          vehicleNumber: vehicle,
          gatePassNumber: gatePass || `GP-OUT-${dispatches.length + 101}`,
          responsiblePerson,
          notes,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`✓ Outward Challan ${data.dispatch.dcNumber} created: ${qty} units deducted from stock!`);
        setIsModalOpen(false);
        setCustomer('');
        setNotes('');
        await fetchDispatchData();
      } else {
        showToast(`⚠️ ${data.error || 'Failed to create dispatch'}`);
      }
    } catch {
      showToast('⚠️ Error submitting dispatch challan');
    }
  };

  const filteredDispatches = dispatches.filter(
    (d) =>
      d.dcNumber.toLowerCase().includes(search.toLowerCase()) ||
      d.customerName.toLowerCase().includes(search.toLowerCase()) ||
      d.productName.toLowerCase().includes(search.toLowerCase()) ||
      (d.vehicleNumber && d.vehicleNumber.toLowerCase().includes(search.toLowerCase())) ||
      (d.gatePassNumber && d.gatePassNumber.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      {/* Toast */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            padding: '12px 18px',
            borderRadius: '8px',
            background: '#0f172a',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 700,
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          }}
        >
          {toastMsg}
        </div>
      )}

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
                background: '#4338ca',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Truck size={18} />
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Dispatch & Outward Delivery Challan (DC)
            </h1>
          </div>
          <p style={{ fontSize: '12.5px', color: '#64748b', margin: '4px 0 0 0' }}>
            Finished Goods Outward Consignments &bull; Automatic stock deduction & customer dispatch notes
          </p>
        </div>

        {isViewer ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '999px',
              background: '#f1f5f9',
              color: '#64748b',
              fontSize: '12px',
              fontWeight: 600,
              border: '1px solid #cbd5e1',
            }}
          >
            <Eye size={13} />
            <span>Viewer Mode (Read-Only)</span>
          </div>
        ) : (
          <button
            onClick={() => {
              setGatePass(`GP-OUT-${dispatches.length + 101}`);
              setDispatchDate(new Date().toISOString().slice(0, 10));
              setDispatchTime(new Date().toTimeString().slice(0, 5));
              setIsModalOpen(true);
            }}
            className="btn-accent"
            style={{ padding: '8px 16px', fontSize: '12.5px', fontWeight: 700, background: '#4338ca' }}
          >
            <Plus size={14} />
            <span>New Dispatch Entry</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #4338ca' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>TOTAL OUTWARD CHALLANS</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
            {dispatches.length}
          </div>
          <div style={{ fontSize: '11.5px', color: '#4338ca', fontWeight: 600 }}>Active Consignments</div>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>AVAILABLE FG FOR DISPATCH</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#1e40af', margin: '4px 0' }}>
            {finishedGoods.reduce((sum, g) => sum + Number(g.availableQuantity || 0), 0)}{' '}
            <span style={{ fontSize: '13px', fontWeight: 600 }}>units</span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#1e40af', fontWeight: 600 }}>In Warehouse Storage</div>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>TOTAL UNITS DISPATCHED</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#15803d', margin: '4px 0' }}>
            {dispatches.reduce((sum, d) => sum + Number(d.quantityDispatched || 0), 0)}{' '}
            <span style={{ fontSize: '13px', fontWeight: 600 }}>units</span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#15803d', fontWeight: 600 }}>Deducted from FG Stock</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ padding: '12px 18px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Search size={14} color="#64748b" />
          <input
            type="text"
            placeholder="Search by DC #, Customer, Product, Vehicle, or Gate Pass..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              fontSize: '13px',
              width: '100%',
              background: 'transparent',
            }}
          />
        </div>
      </div>

      {/* Dispatches Table */}
      <div className="desktop-table-view card table-responsive-container" style={{ padding: '0', overflowX: 'auto' }}>
        <table className="table-aurora" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: '780px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '12px 14px', fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>CHALLAN #</th>
              <th style={{ padding: '12px 14px', fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>ITEM / PRODUCT</th>
              <th style={{ padding: '12px 14px', fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>DATE & TIME</th>
              <th style={{ padding: '12px 14px', fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>QTY</th>
              <th style={{ padding: '12px 14px', fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>CUSTOMER & DESTINATION</th>
              <th style={{ padding: '12px 14px', fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>VEHICLE & GP</th>
              <th style={{ padding: '12px 14px', fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filteredDispatches.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                  {loading ? 'Loading dispatches...' : 'No outward delivery challans logged yet. Click "+ New Dispatch Entry" to dispatch from Finished Goods.'}
                </td>
              </tr>
            ) : (
              filteredDispatches.map((d) => (
                <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '12.5px' }} className="table-row-hover">
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: '#4338ca', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                    {d.dcNumber}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{d.productName}</div>
                    <span style={{ fontSize: '11px', color: '#2563eb', fontFamily: 'var(--font-mono)' }}>{d.productCode}</span>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#334155', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                      <Calendar size={12} color="#64748b" />
                      <span>{new Date(d.dispatchDate).toLocaleDateString()}</span>
                    </div>
                    {d.dispatchTime && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        <Clock size={11} />
                        <span>{d.dispatchTime}</span>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a' }}>
                      {d.quantityDispatched}
                    </span>{' '}
                    <span style={{ fontSize: '11px', color: '#64748b' }}>units</span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{d.customerName}</div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>{d.destination}</span>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#334155', whiteSpace: 'nowrap' }}>
                    <div><strong>Vehicle:</strong> {d.vehicleNumber || 'N/A'}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>GP: {d.gatePassNumber}</div>
                  </td>
                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: d.status === 'DELIVERED' ? '#dcfce7' : '#e0e7ff',
                        color: d.status === 'DELIVERED' ? '#15803d' : '#4338ca',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ● {d.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View for Dispatches */}
      <div className="mobile-card-view">
        {filteredDispatches.length === 0 ? (
          <div className="mobile-card-item" style={{ textAlign: 'center', color: '#64748b' }}>
            {loading ? 'Loading dispatches...' : 'No outward delivery challans logged yet.'}
          </div>
        ) : (
          filteredDispatches.map((d) => (
            <div key={`m-dc-${d.id}`} className="mobile-card-item">
              <div className="mobile-card-header">
                <div>
                  <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: '13.5px', color: '#4338ca' }}>
                    {d.dcNumber}
                  </span>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a', marginTop: '2px' }}>{d.productName}</div>
                  <span style={{ fontSize: '11px', color: '#2563eb', fontFamily: 'var(--font-mono)' }}>{d.productCode}</span>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: d.status === 'DELIVERED' ? '#dcfce7' : '#e0e7ff',
                    color: d.status === 'DELIVERED' ? '#15803d' : '#4338ca',
                    whiteSpace: 'nowrap',
                  }}
                >
                  ● {d.status}
                </span>
              </div>

              <div className="mobile-card-grid">
                <div className="mobile-card-field">
                  <span className="mobile-card-field-label">QTY DISPATCHED</span>
                  <span className="mobile-card-field-val" style={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a' }}>
                    {d.quantityDispatched} units
                  </span>
                </div>
                <div className="mobile-card-field">
                  <span className="mobile-card-field-label">DATE & TIME</span>
                  <span className="mobile-card-field-val">
                    {new Date(d.dispatchDate).toLocaleDateString()} {d.dispatchTime || ''}
                  </span>
                </div>
                <div className="mobile-card-field" style={{ gridColumn: 'span 2' }}>
                  <span className="mobile-card-field-label">CUSTOMER & DESTINATION</span>
                  <span className="mobile-card-field-val" style={{ fontWeight: 600 }}>
                    {d.customerName} &bull; <span style={{ color: '#64748b', fontWeight: 400 }}>{d.destination}</span>
                  </span>
                </div>
                <div className="mobile-card-field" style={{ gridColumn: 'span 2' }}>
                  <span className="mobile-card-field-label">TRANSPORT DETAILS</span>
                  <span className="mobile-card-field-val">
                    Vehicle: <strong>{d.vehicleNumber || 'N/A'}</strong> &bull; Gate Pass: <strong>{d.gatePassNumber}</strong>
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Minimalist New Dispatch Entry */}
      {isModalOpen && !isViewer && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '16.5px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Dispatch Entry (Outward Challan)
                </h2>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 0 0' }}>
                  Record outgoing shipment and deduct finished goods stock
                </p>
              </div>
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#4338ca', background: '#e0e7ff', padding: '3px 8px', borderRadius: '6px' }}>
                ADMIN DISPATCH
              </span>
            </div>

            <form onSubmit={handleCreateDispatch}>
              {/* 1. Item / Product */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  1. ITEM / FINISHED PRODUCT *
                </label>
                {finishedGoods.length === 0 ? (
                  <div style={{ padding: '10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '12px', color: '#b91c1c' }}>
                    ⚠️ No finished goods in stock. Production must complete jobs first.
                  </div>
                ) : (
                  <select
                    className="form-select"
                    required
                    value={selectedProductCode}
                    onChange={(e) => {
                      setSelectedProductCode(e.target.value);
                      const obj = finishedGoods.find((g) => g.productCode === e.target.value);
                      if (obj) setQty(Math.min(5, obj.availableQuantity || 5));
                    }}
                  >
                    {finishedGoods.map((g) => (
                      <option key={g.id} value={g.productCode}>
                        {g.productCode} - {g.productName} ({g.batchNumber}) &bull; Stock: {g.availableQuantity} {g.uom}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 2. Date & Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    2. DISPATCH DATE *
                  </label>
                  <input
                    type="date"
                    required
                    value={dispatchDate}
                    onChange={(e) => setDispatchDate(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    3. DISPATCH TIME *
                  </label>
                  <input
                    type="time"
                    required
                    value={dispatchTime}
                    onChange={(e) => setDispatchTime(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              {/* 3. Quantity */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155' }}>
                    4. DISPATCH QUANTITY *
                  </label>
                  <span style={{ fontSize: '11.5px', color: '#2563eb', fontWeight: 600 }}>
                    Available in FG: {availableFgQty} units
                  </span>
                </div>
                <input
                  type="number"
                  required
                  min={1}
                  max={availableFgQty}
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  className="form-input"
                  style={{ fontWeight: 800, fontSize: '14px' }}
                />
              </div>

              {/* 4. Customer Name & Email */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    5. CUSTOMER / CLIENT NAME *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Industrial Corp"
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    CUSTOMER EMAIL (NOTIFICATION)
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. client@apexcorp.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              {/* 5. Destination */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  6. DESTINATION / DELIVERY ADDRESS *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pune Logistics Park, Warehouse Bay 4"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="form-input"
                />
              </div>

              {/* 6. Vehicle & Gate Pass */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    VEHICLE NUMBER
                  </label>
                  <input
                    type="text"
                    value={vehicle}
                    onChange={(e) => setVehicle(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    GATE PASS #
                  </label>
                  <input
                    type="text"
                    value={gatePass}
                    onChange={(e) => setGatePass(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              {/* 7. Notes */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  REMARKS / INSTRUCTIONS
                </label>
                <input
                  type="text"
                  placeholder="e.g. Handle with care, fragile packaging"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-accent"
                  style={{ padding: '8px 18px', background: '#4338ca' }}
                >
                  Confirm Dispatch & Deduct Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
