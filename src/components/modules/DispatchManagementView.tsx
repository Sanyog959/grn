'use client';

import React, { useState } from 'react';

interface DispatchChallan {
  id: string;
  dcNumber: string;
  customerName: string;
  destination: string;
  transporterName: string;
  vehicleNumber: string;
  gatePassNumber: string;
  itemDescription: string;
  totalQuantity: number;
  dispatchDate: string;
  status: 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED';
}

const INITIAL_DISPATCHES: DispatchChallan[] = [
  {
    id: 'dc-1',
    dcNumber: 'DC-2026-104',
    customerName: 'Bharat Forge Ltd. — Pune Plant',
    destination: 'Pune, Maharashtra',
    transporterName: 'SafeXpress Logistics',
    vehicleNumber: 'MH-12-RN-4820',
    gatePassNumber: 'GP-OUT-992',
    itemDescription: 'High-Pressure Hydraulic Cylinders & Bearing Hubs',
    totalQuantity: 85,
    dispatchDate: '2026-09-28',
    status: 'IN_TRANSIT',
  },
  {
    id: 'dc-2',
    dcNumber: 'DC-2026-103',
    customerName: 'Tata Motors Powertrain Division',
    destination: 'Pimpri Chinchwad',
    transporterName: 'VRL Logistics',
    vehicleNumber: 'MH-14-BT-1190',
    gatePassNumber: 'GP-OUT-991',
    itemDescription: 'Machined Spindle Assemblies & Viton Seals',
    totalQuantity: 140,
    dispatchDate: '2026-09-27',
    status: 'DELIVERED',
  },
  {
    id: 'dc-3',
    dcNumber: 'DC-2026-102',
    customerName: 'Kirloskar Pneumatic Co.',
    destination: 'Hadapsar Industrial Estate',
    transporterName: 'Direct Plant Dispatch Van',
    vehicleNumber: 'MH-12-EQ-8831',
    gatePassNumber: 'GP-OUT-989',
    itemDescription: 'Fiber-Optic Proximity Sensors Calibrated Kits',
    totalQuantity: 25,
    dispatchDate: '2026-09-26',
    status: 'DELIVERED',
  },
];

export const DispatchManagementView: React.FC = () => {
  const [dispatches, setDispatches] = useState<DispatchChallan[]>(INITIAL_DISPATCHES);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Form State
  const [dcNumber, setDcNumber] = useState(`DC-2026-${String(dispatches.length + 105).padStart(3, '0')}`);
  const [customer, setCustomer] = useState('Mahindra Heavy Engineering');
  const [destination, setDestination] = useState('Chakan MIDC, Pune');
  const [transporter, setTransporter] = useState('BlueDart Surface Cargo');
  const [vehicle, setVehicle] = useState('MH-12-AB-9988');
  const [gatePass, setGatePass] = useState(`GP-OUT-${dispatches.length + 993}`);
  const [itemDesc, setItemDesc] = useState('Precision Machined Assemblies');
  const [qty, setQty] = useState(50);

  const handleCreateDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    const newDc: DispatchChallan = {
      id: `dc-${Date.now()}`,
      dcNumber,
      customerName: customer,
      destination,
      transporterName: transporter,
      vehicleNumber: vehicle,
      gatePassNumber: gatePass,
      itemDescription: itemDesc,
      totalQuantity: Number(qty),
      dispatchDate: new Date().toISOString().slice(0, 10),
      status: 'DISPATCHED',
    };
    setDispatches([newDc, ...dispatches]);
    setIsModalOpen(false);
    setDcNumber(`DC-2026-${String(dispatches.length + 106).padStart(3, '0')}`);
  };

  const filteredDispatches = dispatches.filter(
    (d) =>
      d.dcNumber.toLowerCase().includes(search.toLowerCase()) ||
      d.customerName.toLowerCase().includes(search.toLowerCase()) ||
      d.vehicleNumber.toLowerCase().includes(search.toLowerCase()) ||
      d.gatePassNumber.toLowerCase().includes(search.toLowerCase())
  );

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
            Dispatch & Delivery Challan (DC)
          </h1>
          <p style={{ fontSize: '12.5px', color: '#64748b', margin: '2px 0 0 0' }}>
            Outward Shipments, Vehicle Gate Passes & Consignment Delivery
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-aurora"
          style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 700 }}
        >
          + New Dispatch Challan
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
        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #7c3aed' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>TOTAL OUTWARD CHALLANS</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
            {dispatches.length}
          </div>
          <div style={{ fontSize: '12px', color: '#7c3aed', fontWeight: 600 }}>Active Shipments</div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>VEHICLES IN TRANSIT</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#1e40af', margin: '4px 0' }}>
            {dispatches.filter((d) => d.status === 'IN_TRANSIT' || d.status === 'DISPATCHED').length}
          </div>
          <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: 600 }}>On Road to Customer</div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>DELIVERED TODAY</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#15803d', margin: '4px 0' }}>
            {dispatches.filter((d) => d.status === 'DELIVERED').length}
          </div>
          <div style={{ fontSize: '12px', color: '#15803d', fontWeight: 600 }}>Acknowledged Deliveries</div>
        </div>
      </div>

      {/* Search */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search by DC #, Customer, Vehicle Number, or Gate Pass..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            fontSize: '13px',
            minWidth: '320px',
          }}
        />
      </div>

      {/* Table */}
      <div className="card table-responsive-container" style={{ padding: '0', overflowX: 'auto' }}>
        <table className="table-aurora" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '650px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>DC NUMBER</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>CUSTOMER</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>DESTINATION</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>VEHICLE & TRANSPORTER</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>GATE PASS</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>QTY</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filteredDispatches.map((dc) => (
              <tr key={dc.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#7c3aed' }}>{dc.dcNumber}</td>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{dc.customerName}</td>
                <td style={{ padding: '12px 16px', color: '#64748b' }}>{dc.destination}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{dc.vehicleNumber}</div>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>{dc.transporterName}</span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                    {dc.gatePassNumber}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 800 }}>{dc.totalQuantity} Units</td>
                <td style={{ padding: '12px 16px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '999px',
                      background: dc.status === 'DELIVERED' ? '#dcfce7' : '#e0f2fe',
                      color: dc.status === 'DELIVERED' ? '#15803d' : '#0369a1',
                    }}
                  >
                    ● {dc.status.replace('_', ' ')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '540px', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 16px 0', color: '#0f172a' }}>
              Create Outward Dispatch Challan
            </h3>
            <form onSubmit={handleCreateDispatch}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>DC NUMBER</label>
                  <input
                    type="text"
                    required
                    value={dcNumber}
                    onChange={(e) => setDcNumber(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>GATE PASS NUMBER</label>
                  <input
                    type="text"
                    required
                    value={gatePass}
                    onChange={(e) => setGatePass(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>CUSTOMER NAME</label>
                <input
                  type="text"
                  required
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>DESTINATION LOCATION</label>
                <input
                  type="text"
                  required
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>VEHICLE NUMBER</label>
                  <input
                    type="text"
                    required
                    value={vehicle}
                    onChange={(e) => setVehicle(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>TRANSPORTER</label>
                  <input
                    type="text"
                    required
                    value={transporter}
                    onChange={(e) => setTransporter(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>ITEMS DESCRIPTION</label>
                  <input
                    type="text"
                    required
                    value={itemDesc}
                    onChange={(e) => setItemDesc(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>QUANTITY</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-aurora"
                  style={{ padding: '8px 18px', background: '#7c3aed', color: '#fff' }}
                >
                  Issue Gate Pass & DC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
