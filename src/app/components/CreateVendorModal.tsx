'use client';

import React, { useState } from 'react';
import { Vendor } from '@/types/inventory';

interface CreateVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  nextVendorCode: string;
  onCreateVendor: (vendor: Vendor) => Promise<void>;
}

export const CreateVendorModal: React.FC<CreateVendorModalProps> = ({
  isOpen,
  onClose,
  nextVendorCode,
  onCreateVendor,
}) => {
  const [vendorName, setVendorName] = useState('');
  const [category, setCategory] = useState('Mechanical & Precision Hardware');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState(7);
  const [qualityRating, setQualityRating] = useState(5.0);
  const [status, setStatus] = useState<'Active' | 'Preferred' | 'On Probation'>('Active');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const newVendor: Vendor = {
      vendorCode: nextVendorCode,
      vendorName,
      category,
      contactPerson,
      email,
      phone,
      leadTimeDays: Number(leadTimeDays),
      qualityRating: Number(qualityRating),
      status,
    };

    try {
      await onCreateVendor(newVendor);
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
        style={{ maxWidth: '560px', padding: '18px 20px' }}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
                Add New Supplier / Vendor
              </h2>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#4f46e5',
                  background: '#eef2ff',
                  padding: '2px 8px',
                  borderRadius: '6px',
                }}
              >
                {nextVendorCode}
              </span>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Registers verified supplier profile into MIMS Master Database.
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '5px' }}>
                Supplier Legal Name *
              </label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. Apex Industrial Solutions"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '5px' }}>
                Material Category *
              </label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. Electronics & Microcontrollers"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '5px' }}>
                  Contact Person *
                </label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Sarah Jenkins"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '5px' }}>
                  Work Email *
                </label>
                <input
                  type="email"
                  required
                  className="form-input"
                  placeholder="e.g. sales@apex.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '5px' }}>
                  Phone
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '5px' }}>
                  Lead Time (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={leadTimeDays}
                  onChange={(e) => setLeadTimeDays(Number(e.target.value))}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '5px' }}>
                  Rating (0 - 5.0)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="5"
                  className="form-input"
                  value={qualityRating}
                  onChange={(e) => setQualityRating(Number(e.target.value))}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '5px' }}>
                Account Status
              </label>
              <select
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'Active' | 'Preferred' | 'On Probation')}
              >
                <option value="Active">Active</option>
                <option value="Preferred">Preferred Partner</option>
                <option value="On Probation">On Probation</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" onClick={onClose} className="btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Registering Supplier...' : 'Save & Register Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
