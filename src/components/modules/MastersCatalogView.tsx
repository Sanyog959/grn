'use client';

import React, { useState } from 'react';
import { Customer } from '@/types/inventory';

interface MastersCatalogViewProps {
  initialTab?: 'items' | 'customers' | 'units';
}

interface ItemMasterRecord {
  id: string;
  itemCode: string;
  itemName: string;
  category: string;
  hsnCode: string;
  uom: string;
  minStock: number;
  reorderQty: number;
  status: 'ACTIVE' | 'DISCONTINUED';
}

const INITIAL_ITEMS: ItemMasterRecord[] = [
  {
    id: 'itm-1',
    itemCode: 'BRG-6205-ZZ',
    itemName: 'Deep Groove Radial Ball Bearing 25x52x15mm',
    category: 'Mechanical',
    hsnCode: '84821010',
    uom: 'PCS',
    minStock: 150,
    reorderQty: 500,
    status: 'ACTIVE',
  },
  {
    id: 'itm-2',
    itemCode: 'SEAL-VIT-45',
    itemName: 'Viton Rotary Shaft Oil Seal 45x65x8mm',
    category: 'Polymers & Seals',
    hsnCode: '84842000',
    uom: 'NOS',
    minStock: 100,
    reorderQty: 250,
    status: 'ACTIVE',
  },
  {
    id: 'itm-3',
    itemCode: 'SNS-OPT-800',
    itemName: 'Fiber-Optic Reflective Proximity Sensor 0-50mm',
    category: 'Electronics & Sensors',
    hsnCode: '85365090',
    uom: 'NOS',
    minStock: 20,
    reorderQty: 50,
    status: 'ACTIVE',
  },
  {
    id: 'itm-4',
    itemCode: 'PLM-PTFE-50',
    itemName: 'PTFE Virgin Guide Ring 50x55x15mm',
    category: 'Polymers & Seals',
    hsnCode: '39269099',
    uom: 'MTR',
    minStock: 80,
    reorderQty: 200,
    status: 'ACTIVE',
  },
  {
    id: 'itm-5',
    itemCode: 'ST-BAR-316L',
    itemName: 'Stainless Steel Round Bar 316L Dia 40mm',
    category: 'Raw Material Alloys',
    hsnCode: '72221119',
    uom: 'KG',
    minStock: 500,
    reorderQty: 1500,
    status: 'ACTIVE',
  },
];

const INITIAL_CUSTOMERS: Customer[] = [
  {
    customerCode: 'CUST-01',
    customerName: 'Bharat Forge Limited',
    contactPerson: 'Aditya Deshmukh',
    email: 'purchasing@bharatforge.com',
    phone: '+91 20 6704 2777',
    address: 'Mundhwa, Pune, Maharashtra 411036',
    status: 'ACTIVE',
  },
  {
    customerCode: 'CUST-02',
    customerName: 'Tata Motors Commercial Vehicles',
    contactPerson: 'Sanjay Nair',
    email: 's.nair@tatamotors.com',
    phone: '+91 20 6613 1111',
    address: 'Pimpri, Pune, Maharashtra 411018',
    status: 'ACTIVE',
  },
  {
    customerCode: 'CUST-03',
    customerName: 'Kirloskar Pneumatic Company',
    contactPerson: 'Meera Rao',
    email: 'procurement@kirloskar.com',
    phone: '+91 20 2672 7000',
    address: 'Hadapsar Industrial Estate, Pune 411013',
    status: 'ACTIVE',
  },
];

const UOM_LIST = [
  { code: 'PCS', name: 'Pieces', type: 'Countable Discrete Units' },
  { code: 'NOS', name: 'Numbers', type: 'Standard Inventory Unit' },
  { code: 'KG', name: 'Kilograms', type: 'Weight / Bulk Alloy' },
  { code: 'MTR', name: 'Meters', type: 'Linear Extrusion / Profile' },
  { code: 'LTR', name: 'Liters', type: 'Liquid Fluids / Lubricants' },
  { code: 'BOX', name: 'Box Pack', type: 'Packaging / Shipping Kit' },
  { code: 'SET', name: 'Matched Set', type: 'Paired Bearing & Housing' },
  { code: 'PKT', name: 'Packet', type: 'Fasteners / Washers' },
];

export const MastersCatalogView: React.FC<MastersCatalogViewProps> = ({
  initialTab = 'items',
}) => {
  const [activeTab, setActiveTab] = useState<'items' | 'customers' | 'units'>(initialTab);
  const [search, setSearch] = useState('');

  return (
    <div>
      {/* Mobile-First Compact Header */}
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
          Masters Registry & Catalogs
        </h1>
        <p style={{ fontSize: '12.5px', color: '#64748b', margin: '2px 0 0 0' }}>
          Standardized Item SKUs, Customer Consignees & Units of Measure (UOM)
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid #e2e8f0',
          marginBottom: '20px',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          paddingBottom: '4px',
        }}
      >
        <button
          onClick={() => setActiveTab('items')}
          className={`nav-tab-btn ${activeTab === 'items' ? 'active' : ''}`}
        >
          <span>🔩</span>
          <span>Item Master Catalog ({INITIAL_ITEMS.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          className={`nav-tab-btn ${activeTab === 'customers' ? 'active' : ''}`}
        >
          <span>👥</span>
          <span>Customers Master ({INITIAL_CUSTOMERS.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('units')}
          className={`nav-tab-btn ${activeTab === 'units' ? 'active' : ''}`}
        >
          <span>📏</span>
          <span>Units of Measure ({UOM_LIST.length})</span>
        </button>
      </div>

      {/* Search */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Filter catalog records..."
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

      {/* TAB 1: ITEM MASTER */}
      {activeTab === 'items' && (
        <div className="card table-responsive-container" style={{ padding: '0', overflowX: 'auto' }}>
          <table className="table-aurora" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '650px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>ITEM CODE</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>PART DESCRIPTION</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>CATEGORY</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>HSN CODE</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>UOM</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>MIN SAFETY</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>REORDER QTY</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {INITIAL_ITEMS.filter((i) =>
                i.itemCode.toLowerCase().includes(search.toLowerCase()) ||
                i.itemName.toLowerCase().includes(search.toLowerCase())
              ).map((it) => (
                <tr key={it.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0369a1' }}>{it.itemCode}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{it.itemName}</td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>{it.category}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>
                      {it.hsnCode}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{it.uom}</td>
                  <td style={{ padding: '12px 16px' }}>{it.minStock}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700 }}>{it.reorderQty}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '999px',
                        background: '#dcfce7',
                        color: '#15803d',
                      }}
                    >
                      ● {it.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: CUSTOMERS MASTER */}
      {activeTab === 'customers' && (
        <div className="card table-responsive-container" style={{ padding: '0', overflowX: 'auto' }}>
          <table className="table-aurora" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '650px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>CUSTOMER CODE</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>COMPANY NAME</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>CONTACT PERSON</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>EMAIL</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>PHONE</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>ADDRESS / PLANT</th>
              </tr>
            </thead>
            <tbody>
              {INITIAL_CUSTOMERS.filter((c) =>
                c.customerName.toLowerCase().includes(search.toLowerCase()) ||
                c.customerCode.toLowerCase().includes(search.toLowerCase())
              ).map((c) => (
                <tr key={c.customerCode} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0369a1' }}>{c.customerCode}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700 }}>{c.customerName}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{c.contactPerson}</td>
                  <td style={{ padding: '12px 16px', color: '#0284c7' }}>{c.email}</td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>{c.phone}</td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>{c.address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: UNITS OF MEASURE */}
      {activeTab === 'units' && (
        <div className="card table-responsive-container" style={{ padding: '0', overflowX: 'auto' }}>
          <table className="table-aurora" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>UOM CODE</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>UNIT NAME</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>CLASSIFICATION</th>
              </tr>
            </thead>
            <tbody>
              {UOM_LIST.map((u) => (
                <tr key={u.code} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 800, color: '#0369a1' }}>{u.code}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{u.name}</td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>{u.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
