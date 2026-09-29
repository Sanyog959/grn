'use client';

import React, { useState } from 'react';
import { GRNItem } from '@/types/inventory';

interface InventoryStockViewProps {
  grnItems?: GRNItem[];
}

interface StockItem {
  id: string;
  itemCode: string;
  itemName: string;
  category: string;
  location: string;
  uom: string;
  quantity: number;
  minSafety: number;
  unitCost: number;
  lastUpdated: string;
}

const INITIAL_STOCK: StockItem[] = [
  {
    id: 'stk-1',
    itemCode: 'BRG-6205-ZZ',
    itemName: 'Deep Groove Radial Ball Bearing 25x52x15mm',
    category: 'Mechanical',
    location: 'WH-1 / Rack B-04 / Bin 12',
    uom: 'PCS',
    quantity: 480,
    minSafety: 150,
    unitCost: 420,
    lastUpdated: '2026-09-27',
  },
  {
    id: 'stk-2',
    itemCode: 'SEAL-VIT-45',
    itemName: 'Viton Rotary Shaft Oil Seal 45x65x8mm',
    category: 'Polymers & Seals',
    location: 'WH-1 / Rack C-01 / Bin 05',
    uom: 'NOS',
    quantity: 65,
    minSafety: 100,
    unitCost: 510,
    lastUpdated: '2026-09-28',
  },
  {
    id: 'stk-3',
    itemCode: 'SNS-OPT-800',
    itemName: 'Fiber-Optic Reflective Proximity Sensor 0-50mm',
    category: 'Electronics & Sensors',
    location: 'WH-2 / CleanRoom Rack A-02',
    uom: 'NOS',
    quantity: 28,
    minSafety: 20,
    unitCost: 6500,
    lastUpdated: '2026-09-28',
  },
  {
    id: 'stk-4',
    itemCode: 'PLM-PTFE-50',
    itemName: 'PTFE Virgin Guide Ring 50x55x15mm',
    category: 'Polymers & Seals',
    location: 'WH-1 / Rack D-08 / Bin 22',
    uom: 'MTR',
    quantity: 320,
    minSafety: 80,
    unitCost: 470,
    lastUpdated: '2026-09-26',
  },
  {
    id: 'stk-5',
    itemCode: 'ST-BAR-316L',
    itemName: 'Stainless Steel Round Bar 316L Dia 40mm',
    category: 'Raw Material Alloys',
    location: 'Yard Yard-3 / Heavy Pallet 09',
    uom: 'KG',
    quantity: 1450,
    minSafety: 500,
    unitCost: 380,
    lastUpdated: '2026-09-25',
  },
];

export const InventoryStockView: React.FC<InventoryStockViewProps> = ({ grnItems = [] }) => {
  const [stockList, setStockList] = useState<StockItem[]>(() => {
    // Merge any passed QC items into live stock
    const passedItems = grnItems.filter((it) => it.qcStatus === 'Passed' && it.acceptedQty > 0);
    const updated = [...INITIAL_STOCK];
    passedItems.forEach((it) => {
      const existing = updated.find((s) => s.itemCode === it.itemCode);
      if (existing) {
        existing.quantity += it.acceptedQty;
      } else {
        updated.push({
          id: `stk-${it.id}`,
          itemCode: it.itemCode,
          itemName: it.description,
          category: it.category || 'General Store',
          location: 'WH-1 / Inward Transfer Bay',
          uom: it.unit || 'PCS',
          quantity: it.acceptedQty,
          minSafety: 50,
          unitCost: it.unitPrice || 250,
          lastUpdated: new Date().toISOString().slice(0, 10),
        });
      }
    });
    return updated;
  });

  const [activeSubTab, setActiveSubTab] = useState<'balance' | 'ledger'>('balance');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const filteredStock = stockList.filter((item) => {
    const matchesSearch =
      item.itemCode.toLowerCase().includes(search.toLowerCase()) ||
      item.itemName.toLowerCase().includes(search.toLowerCase()) ||
      item.location.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === 'ALL' || item.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const totalInventoryValuation = stockList.reduce((sum, it) => sum + it.quantity * it.unitCost, 0);
  const lowStockCount = stockList.filter((it) => it.quantity <= it.minSafety).length;

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
            Store Inventory Stock Ledger
          </h1>
          <p style={{ fontSize: '12.5px', color: '#64748b', margin: '2px 0 0 0' }}>
            Central Warehouse Stock, Bin Locations & Reorder Safety Levels
          </p>
        </div>
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
        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #0d9488' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>TOTAL UNIQUE SKUS</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
            {stockList.length} Items
          </div>
          <div style={{ fontSize: '12px', color: '#0d9488', fontWeight: 600 }}>Active Central Store Stock</div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>LOW SAFETY STOCK ALERTS</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: lowStockCount > 0 ? '#b91c1c' : '#15803d', margin: '4px 0' }}>
            {lowStockCount} SKUs
          </div>
          <div style={{ fontSize: '12px', color: lowStockCount > 0 ? '#b91c1c' : '#15803d', fontWeight: 600 }}>
            {lowStockCount > 0 ? 'Requires Purchase Reorder' : 'All Stock Above Safety Margin'}
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>STORE VALUATION</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#1e40af', margin: '4px 0' }}>
            ₹{totalInventoryValuation.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: 600 }}>Total Warehouse Material Asset</div>
        </div>
      </div>

      {/* Filter and Tab Bar */}
      <div
        className="card"
        style={{
          padding: '14px 20px',
          marginBottom: '20px',
          display: 'flex',
          gap: '14px',
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search by SKU, Description, or Bin Location..."
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

        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <option value="ALL">All Categories</option>
            <option value="Mechanical">Mechanical</option>
            <option value="Polymers & Seals">Polymers & Seals</option>
            <option value="Electronics & Sensors">Electronics & Sensors</option>
            <option value="Raw Material Alloys">Raw Material Alloys</option>
          </select>
        </div>
      </div>

      {/* Stock Table */}
      <div className="card table-responsive-container" style={{ padding: '0', overflowX: 'auto' }}>
        <table className="table-aurora" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '650px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>SKU / ITEM CODE</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>DESCRIPTION</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>BIN LOCATION</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>UOM</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>ON HAND</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>MIN SAFETY</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>VALUATION</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>STOCK STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filteredStock.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                  No stock items match your search filter.
                </td>
              </tr>
            ) : (
              filteredStock.map((it) => {
                const isLow = it.quantity <= it.minSafety;
                return (
                  <tr
                    key={it.id}
                    style={{ borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f766e' }}>
                      {it.itemCode}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                      <div>{it.itemName}</div>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>{it.category}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', fontWeight: 500 }}>
                      <span
                        style={{
                          background: '#f1f5f9',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                        }}
                      >
                        📍 {it.location}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{it.uom}</td>
                    <td
                      style={{
                        padding: '12px 16px',
                        fontWeight: 800,
                        fontSize: '14px',
                        color: isLow ? '#b91c1c' : '#0f172a',
                      }}
                    >
                      {it.quantity.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{it.minSafety}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                      ₹{(it.quantity * it.unitCost).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '999px',
                          background: isLow ? '#fee2e2' : '#dcfce7',
                          color: isLow ? '#b91c1c' : '#15803d',
                        }}
                      >
                        {isLow ? '⚠️ REORDER NEEDED' : '✓ HEALTHY LEVEL'}
                      </span>
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
