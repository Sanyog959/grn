'use client';

import React, { useState } from 'react';

interface ProductionIssue {
  id: string;
  voucherNumber: string;
  jobCardNumber: string;
  station: string;
  itemCode: string;
  itemName: string;
  quantityIssued: number;
  uom: string;
  operatorName: string;
  issueDate: string;
  status: 'ISSUED' | 'IN_PROCESS' | 'COMPLETED' | 'RETURNED';
}

const INITIAL_ISSUES: ProductionIssue[] = [
  {
    id: 'iss-1',
    voucherNumber: 'MIV-2026-042',
    jobCardNumber: 'JC-HYD-88',
    station: 'Station 3: CNC Machining Bay',
    itemCode: 'BRG-6205-ZZ',
    itemName: 'Deep Groove Radial Ball Bearing 25x52x15mm',
    quantityIssued: 50,
    uom: 'PCS',
    operatorName: 'Ramesh K. (Shift A)',
    issueDate: '2026-09-28',
    status: 'IN_PROCESS',
  },
  {
    id: 'iss-2',
    voucherNumber: 'MIV-2026-041',
    jobCardNumber: 'JC-SEAL-12',
    station: 'Station 1: High Pressure Assembly',
    itemCode: 'SEAL-VIT-45',
    itemName: 'Viton Rotary Shaft Oil Seal 45x65x8mm',
    quantityIssued: 25,
    uom: 'NOS',
    operatorName: 'Vikram S.',
    issueDate: '2026-09-27',
    status: 'COMPLETED',
  },
  {
    id: 'iss-3',
    voucherNumber: 'MIV-2026-039',
    jobCardNumber: 'JC-SNS-04',
    station: 'Cleanroom Optical Bench',
    itemCode: 'SNS-OPT-800',
    itemName: 'Fiber-Optic Reflective Proximity Sensor 0-50mm',
    quantityIssued: 10,
    uom: 'NOS',
    operatorName: 'Pooja Patil',
    issueDate: '2026-09-26',
    status: 'COMPLETED',
  },
];

export const ProductionFloorView: React.FC = () => {
  const [issues, setIssues] = useState<ProductionIssue[]>(INITIAL_ISSUES);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Form state
  const [voucherNum, setVoucherNum] = useState(`MIV-2026-${String(issues.length + 43).padStart(3, '0')}`);
  const [jobCard, setJobCard] = useState('JC-PROD-99');
  const [station, setStation] = useState('Station 2: Sub-Assembly line');
  const [itemCode, setItemCode] = useState('BRG-6205-ZZ');
  const [itemName, setItemName] = useState('Deep Groove Radial Ball Bearing');
  const [qty, setQty] = useState(20);
  const [operator, setOperator] = useState('Anand Verma');

  const handleCreateIssue = (e: React.FormEvent) => {
    e.preventDefault();
    const newIssue: ProductionIssue = {
      id: `iss-${Date.now()}`,
      voucherNumber: voucherNum,
      jobCardNumber: jobCard,
      station,
      itemCode,
      itemName,
      quantityIssued: Number(qty),
      uom: 'PCS',
      operatorName: operator,
      issueDate: new Date().toISOString().slice(0, 10),
      status: 'ISSUED',
    };
    setIssues([newIssue, ...issues]);
    setIsIssueModalOpen(false);
    setVoucherNum(`MIV-2026-${String(issues.length + 44).padStart(3, '0')}`);
  };

  const filteredIssues = issues.filter(
    (i) =>
      i.voucherNumber.toLowerCase().includes(search.toLowerCase()) ||
      i.jobCardNumber.toLowerCase().includes(search.toLowerCase()) ||
      i.itemName.toLowerCase().includes(search.toLowerCase()) ||
      i.station.toLowerCase().includes(search.toLowerCase())
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
            Material Issue to Production (MIV)
          </h1>
          <p style={{ fontSize: '12.5px', color: '#64748b', margin: '2px 0 0 0' }}>
            Shopfloor Material Vouchers, Job Cards & Line WIP Tracking
          </p>
        </div>

        <button
          onClick={() => setIsIssueModalOpen(true)}
          className="btn-aurora"
          style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 700 }}
        >
          + Issue Material to Line
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
        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #4f46e5' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>ACTIVE MATERIAL VOUCHERS</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
            {issues.length}
          </div>
          <div style={{ fontSize: '12px', color: '#4f46e5', fontWeight: 600 }}>Issued to Shopfloor</div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>WIP IN PROCESS</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#b45309', margin: '4px 0' }}>
            {issues.filter((i) => i.status === 'IN_PROCESS' || i.status === 'ISSUED').length}
          </div>
          <div style={{ fontSize: '12px', color: '#b45309', fontWeight: 600 }}>Under Assembly/Machining</div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>COMPLETED JOBS</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#15803d', margin: '4px 0' }}>
            {issues.filter((i) => i.status === 'COMPLETED').length}
          </div>
          <div style={{ fontSize: '12px', color: '#15803d', fontWeight: 600 }}>Shift Production Output</div>
        </div>
      </div>

      {/* Search and Table */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search by Voucher #, Job Card, Item, or Station..."
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

      <div className="card table-responsive-container" style={{ padding: '0', overflowX: 'auto' }}>
        <table className="table-aurora" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '650px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>VOUCHER #</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>JOB CARD</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>STATION / WORK CENTER</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>MATERIAL ISSUED</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>QTY</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>OPERATOR</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filteredIssues.map((iss) => (
              <tr key={iss.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#4f46e5' }}>{iss.voucherNumber}</td>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{iss.jobCardNumber}</td>
                <td style={{ padding: '12px 16px', color: '#475569' }}>{iss.station}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontWeight: 600 }}>{iss.itemName}</div>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>{iss.itemCode}</span>
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 800 }}>
                  {iss.quantityIssued} {iss.uom}
                </td>
                <td style={{ padding: '12px 16px', color: '#64748b' }}>{iss.operatorName}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '999px',
                      background: iss.status === 'COMPLETED' ? '#dcfce7' : '#fef3c7',
                      color: iss.status === 'COMPLETED' ? '#15803d' : '#b45309',
                    }}
                  >
                    ● {iss.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isIssueModalOpen && (
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
          <div className="card" style={{ width: '100%', maxWidth: '520px', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 16px 0', color: '#0f172a' }}>
              Issue Material to Production
            </h3>
            <form onSubmit={handleCreateIssue}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>VOUCHER NUMBER</label>
                <input
                  type="text"
                  required
                  value={voucherNum}
                  onChange={(e) => setVoucherNum(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>JOB CARD NUMBER</label>
                <input
                  type="text"
                  required
                  value={jobCard}
                  onChange={(e) => setJobCard(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>PRODUCTION STATION</label>
                <input
                  type="text"
                  required
                  value={station}
                  onChange={(e) => setStation(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>MATERIAL CODE</label>
                  <input
                    type="text"
                    required
                    value={itemCode}
                    onChange={(e) => setItemCode(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>QTY</label>
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

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>RECEIVING OPERATOR</label>
                <input
                  type="text"
                  required
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsIssueModalOpen(false)}
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
                  style={{ padding: '8px 18px', background: '#4f46e5', color: '#fff' }}
                >
                  Confirm Issue to Line
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
