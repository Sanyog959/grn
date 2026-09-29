'use client';

import React, { useState } from 'react';
import { Vendor } from '@/types/inventory';

interface VendorsTableProps {
  vendors: Vendor[];
  onOpenCreateVendor?: () => void;
}

export const VendorsTable: React.FC<VendorsTableProps> = ({
  vendors,
  onOpenCreateVendor,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredVendors = vendors.filter((v) => {
    const matchesSearch =
      v.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.vendorCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ? true : v.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Preferred':
        return 'badge-approved';
      case 'Active':
        return 'badge-partial';
      case 'On Probation':
        return 'badge-rejected';
      default:
        return 'badge-pending';
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
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
            placeholder="Search Supplier, Code, Category, Contact..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Status Filters & Add Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {['ALL', 'Preferred', 'Active', 'On Probation'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              style={{
                padding: '6px 12px',
                fontSize: '12.5px',
                fontWeight: 600,
                borderRadius: '8px',
                border: statusFilter === status ? '1px solid #6366f1' : '1px solid #e2e8f0',
                background: statusFilter === status ? '#eef2ff' : '#ffffff',
                color: statusFilter === status ? '#4f46e5' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {status === 'ALL' ? `All Suppliers (${vendors.length})` : status}
            </button>
          ))}

          {onOpenCreateVendor && (
            <button onClick={onOpenCreateVendor} className="btn-aurora" style={{ padding: '7px 14px', fontSize: '13px' }}>
              + Add Supplier
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="aurora-table-wrapper">
        <table className="aurora-table">
          <thead>
            <tr>
              <th>Supplier Code & Name</th>
              <th>Material Category</th>
              <th>Primary Contact</th>
              <th>Lead Time</th>
              <th>Quality Score</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredVendors.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                  No suppliers found matching your query.
                </td>
              </tr>
            ) : (
              filteredVendors.map((vendor) => (
                <tr key={vendor.vendorCode}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
                          color: '#4338ca',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '13px',
                        }}
                      >
                        {vendor.vendorName.charAt(0)}
                      </div>
                      <div>
                        <span
                          style={{
                            fontWeight: 700,
                            color: '#0f172a',
                            fontSize: '14px',
                          }}
                        >
                          {vendor.vendorName}
                        </span>
                        <div
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '11.5px',
                            color: '#6366f1',
                            fontWeight: 600,
                          }}
                        >
                          {vendor.vendorCode}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '13px', color: '#334155', fontWeight: 500 }}>
                      {vendor.category}
                    </span>
                  </td>
                  <td>
                    <div>
                      <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '13px' }}>
                        {vendor.contactPerson}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                        {vendor.email} · {vendor.phone}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>
                      {vendor.leadTimeDays} Days
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#f59e0b', fontSize: '14px' }}>★</span>
                      <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>
                        {vendor.qualityRating.toFixed(2)}
                      </span>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>/ 5.0</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge-status ${getStatusBadge(vendor.status)}`}>
                      {vendor.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <a
                        href={`mailto:${vendor.email}`}
                        title="Send Email"
                        style={{
                          padding: '5px 9px',
                          fontSize: '12px',
                          fontWeight: 600,
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                          background: '#ffffff',
                          color: '#475569',
                          textDecoration: 'none',
                        }}
                      >
                        ✉ Email
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
