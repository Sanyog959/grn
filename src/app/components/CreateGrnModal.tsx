'use client';

import React, { useState, useEffect } from 'react';
import { GRNOrder, GRNItem, Vendor, PurchaseOrder, MasterCatalogItem } from '@/types/inventory';
import { useAuth } from '@/context/AuthContext';
import {
  X,
  Plus,
  Trash2,
  PackageCheck,
  Building2,
  ShieldCheck,
  History,
  Tag,
  CheckCircle2,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { VendorHistoryModal } from './VendorHistoryModal';

interface CreateGrnModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendors: Vendor[];
  nextGrnNumber: string;
  initialPoNumber?: string;
  onCreateGrn: (order: GRNOrder, items: GRNItem[]) => Promise<void>;
  onVendorAdded?: (newVendor: Vendor) => void;
  orders?: GRNOrder[];
  allItems?: GRNItem[];
}

interface NewItemRow {
  itemCode: string;
  description: string;
  category: string;
  poQty: number;
  alreadyReceivedQty?: number;
  pendingQty?: number;
  receivedQty: number;
  unit: string;
  unitPrice: number;
  batchNumber: string;
  isScrap?: boolean;
}

interface CrmUser {
  fullName: string;
  role: string;
  email: string;
}

export const CreateGrnModal: React.FC<CreateGrnModalProps> = ({
  isOpen,
  onClose,
  vendors,
  nextGrnNumber,
  initialPoNumber,
  onCreateGrn,
  onVendorAdded,
  orders = [],
  allItems = [],
}) => {
  const { profile } = useAuth();

  const [availablePos, setAvailablePos] = useState<PurchaseOrder[]>([]);
  const [selectedPoId, setSelectedPoId] = useState(initialPoNumber || '');
  const [isManualPo, setIsManualPo] = useState(false);

  const [poNumber, setPoNumber] = useState(initialPoNumber || '');
  const [vendorName, setVendorName] = useState('');
  const [customVendor, setCustomVendor] = useState(false);
  const [receivedDate, setReceivedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [warehouse, setWarehouse] = useState('Main Factory Store');
  const [carrierTracking, setCarrierTracking] = useState('');
  const [inspector, setInspector] = useState('');
  const [customInspector, setCustomInspector] = useState(false);
  const [isScrapReceipt, setIsScrapReceipt] = useState(false);
  const [notes, setNotes] = useState('');

  // CRM Users list for QC Inspector dropdown
  const [crmUsers, setCrmUsers] = useState<CrmUser[]>([
    { fullName: 'Plant Administrator', role: 'ADMIN', email: 'sales@sanyogengineers.co.in' },
    { fullName: 'Sudhakar Magar', role: 'ADMIN', email: 'magarsudhakar51@gmail.com' },
    { fullName: 'Vishal Magar', role: 'ADMIN', email: 'vishalmagar9579@gmail.com' },
    { fullName: 'QC Lead Inspector', role: 'QC', email: 'qc@factory.internal' },
    { fullName: 'Quality Tester Ramesh', role: 'QC', email: 'tester@factory.internal' },
  ]);

  // Vendor History Modal State
  const [showVendorHistory, setShowVendorHistory] = useState(false);

  // Quick Add Supplier State
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [newVendorCode, setNewVendorCode] = useState('');
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorCategory, setNewVendorCategory] = useState('Mechanical & Precision Hardware');
  const [newVendorContact, setNewVendorContact] = useState('');
  const [newVendorEmail, setNewVendorEmail] = useState('');
  const [newVendorPhone, setNewVendorPhone] = useState('');
  const [isCreatingVendor, setIsCreatingVendor] = useState(false);
  const [vendorCreateError, setVendorCreateError] = useState<string | null>(null);

  const [items, setItems] = useState<NewItemRow[]>([
    {
      itemCode: 'ITM-01',
      description: '',
      category: 'General',
      poQty: 100,
      receivedQty: 30,
      unit: 'PCS',
      unitPrice: 0,
      batchNumber: '',
      isScrap: false,
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [catalogItems, setCatalogItems] = useState<MasterCatalogItem[]>([]);

  // Fetch CRM registered users and catalog items
  useEffect(() => {
    async function loadCrmUsers() {
      try {
        const res = await fetch('/api/auth/users');
        if (res.ok) {
          const data = await res.json();
          if (data.users && Array.isArray(data.users)) {
            const mapped: CrmUser[] = data.users.map((u: { fullName: string; role: string; email: string }) => ({
              fullName: u.fullName,
              role: u.role,
              email: u.email,
            }));
            if (mapped.length > 0) {
              setCrmUsers(mapped);
            }
          }
        }
      } catch {
        // Fallback to default list
      }
    }
    if (isOpen) {
      loadCrmUsers();
      // Load Master Catalog items for instant SKU autocomplete
      fetch('/api/catalog')
        .then((r) => r.json())
        .then((data) => {
          if (data.items && Array.isArray(data.items)) {
            setCatalogItems(data.items);
          }
        })
        .catch((err) => console.warn('Catalog load error in GRN modal:', err));

      // Load active purchase orders
      fetch('/api/po')
        .then((r) => r.json())
        .then((data) => {
          if (data.purchaseOrders && Array.isArray(data.purchaseOrders)) {
            setAvailablePos(data.purchaseOrders);
            const targetPoNum = initialPoNumber || (data.purchaseOrders.length > 0 ? data.purchaseOrders[0].poNumber : '');
            if (targetPoNum) {
              const matched = data.purchaseOrders.find((p: PurchaseOrder) => p.poNumber === targetPoNum);
              if (matched) applyPoData(matched);
            }
          }
        })
        .catch((err) => console.warn('PO load error:', err));
    }
  }, [isOpen, initialPoNumber]);

  const applyPoData = (po: PurchaseOrder) => {
    setSelectedPoId(po.poNumber);
    setPoNumber(po.poNumber);
    if (po.vendorName) {
      setVendorName(po.vendorName);
      setCustomVendor(false);
    }
    if (po.items && po.items.length > 0) {
      setItems(
        po.items.map((it) => {
          const ordered = Number(it.orderedQty) || 0;
          const already = Number(it.receivedQty) || 0;
          const pending = Math.max(0, ordered - already);
          return {
            itemCode: it.itemCode,
            description: it.description,
            category: 'General',
            poQty: ordered,
            alreadyReceivedQty: already,
            pendingQty: pending,
            receivedQty: pending > 0 ? pending : 0,
            unit: it.unit || 'PCS',
            unitPrice: Number(it.unitPrice) || 0,
            batchNumber: `BATCH-${po.poNumber.replace(/[^a-zA-Z0-9]/g, '')}-${it.itemCode}`,
            isScrap: false,
          };
        })
      );
    }
  };

  // Prepopulate inspector and vendor when modal opens
  useEffect(() => {
    if (isOpen) {
      if (profile?.fullName && !inspector) {
        setInspector(profile.fullName);
      }
      if (vendors.length > 0 && !vendorName) {
        setVendorName(vendors[0].vendorName);
        setCustomVendor(false);
      } else if (vendors.length === 0) {
        setCustomVendor(true);
      }
    }
  }, [isOpen, profile, vendors, inspector, vendorName]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        itemCode: `ITM-0${prev.length + 1}`,
        description: '',
        category: 'General',
        poQty: 100,
        receivedQty: 30,
        unit: 'PCS',
        unitPrice: 0,
        batchNumber: '',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof NewItemRow, value: string | number | boolean) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === 'itemCode' && typeof value === 'string') {
        const matched = catalogItems.find(
          (c) => c.itemCode.toLowerCase() === value.trim().toLowerCase()
        );
        if (matched) {
          if (!next[index].description || next[index].description === '') {
            next[index].description = matched.itemName || '';
          }
          if (matched.uom) next[index].unit = matched.uom;
          if (matched.defaultPrice && (!next[index].unitPrice || next[index].unitPrice === 0)) {
            next[index].unitPrice = matched.defaultPrice;
          }
          if (matched.category) next[index].category = matched.category;
        }
      }
      return next;
    });
  };

  // Quick Create Supplier Handler
  const handleQuickCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setVendorCreateError(null);

    if (!newVendorName.trim()) {
      setVendorCreateError('Supplier name is required');
      return;
    }

    const code = newVendorCode.trim() || `VND-${Math.floor(100 + Math.random() * 900)}`;

    const newVendor: Vendor = {
      vendorCode: code,
      vendorName: newVendorName.trim(),
      category: newVendorCategory,
      contactPerson: newVendorContact.trim(),
      email: newVendorEmail.trim(),
      phone: newVendorPhone.trim(),
      leadTimeDays: 7,
      qualityRating: 5.0,
      status: 'Active',
    };

    setIsCreatingVendor(true);
    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVendor),
      });

      if (res.ok) {
        onVendorAdded?.(newVendor);
        setVendorName(newVendor.vendorName);
        setCustomVendor(false);
        setShowAddSupplierModal(false);
        setNewVendorName('');
        setNewVendorContact('');
        setNewVendorEmail('');
        setNewVendorPhone('');
      } else {
        const data = await res.json();
        setVendorCreateError(data.error || 'Failed to create supplier');
      }
    } catch {
      setVendorCreateError('Network error registering supplier');
    } finally {
      setIsCreatingVendor(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!poNumber.trim()) {
      setFormError('Purchase Order (PO #) is required');
      return;
    }
    if (!vendorName.trim()) {
      setFormError('Supplier / Vendor name is required');
      return;
    }
    if (!inspector.trim()) {
      setFormError('QC Inspector name is required');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.itemCode.trim()) {
        setFormError(`Row #${i + 1}: SKU Code is required`);
        return;
      }
      if (!it.description.trim()) {
        setFormError(`Row #${i + 1}: Description is required`);
        return;
      }
      if (it.poQty <= 0) {
        setFormError(`Row #${i + 1}: PO Quantity must be greater than 0`);
        return;
      }
      if (it.receivedQty < 0) {
        setFormError(`Row #${i + 1}: Received Quantity cannot be negative`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const totalItemsCount = items.reduce((sum, it) => sum + Number(it.receivedQty), 0);
      const totalOrderedCount = items.reduce((sum, it) => sum + Number(it.poQty), 0);
      const totalVal = items.reduce((sum, it) => sum + Number(it.receivedQty) * Number(it.unitPrice), 0);

      const newOrder: GRNOrder = {
        grnNumber: nextGrnNumber,
        poNumber: poNumber.trim(),
        vendorName: vendorName.trim(),
        receivedDate,
        warehouse,
        carrierTracking: carrierTracking.trim(),
        inspector: inspector.trim(),
        totalItems: totalItemsCount,
        totalOrderedQty: totalOrderedCount,
        totalReceivedQty: totalItemsCount,
        totalPendingQty: Math.max(0, totalOrderedCount - totalItemsCount),
        totalValue: totalVal,
        status: 'Pending QC',
        isScrapReceipt,
        notes: notes.trim(),
      };

      const newItems: GRNItem[] = items.map((it, idx) => ({
        id: `ITEM-${Date.now()}-${idx}`,
        grnNumber: nextGrnNumber,
        itemCode: it.itemCode.trim(),
        description: it.description.trim(),
        category: it.category || 'General',
        poQty: Number(it.poQty),
        receivedQty: Number(it.receivedQty),
        orderedQty: Number(it.poQty),
        pendingQty: Math.max(0, Number(it.poQty) - Number(it.receivedQty)),
        acceptedQty: 0,
        rejectedQty: 0,
        unit: it.unit,
        unitPrice: Number(it.unitPrice),
        batchNumber: it.batchNumber.trim() || 'BATCH-01',
        qcStatus: 'Under Review',
        isScrap: isScrapReceipt || Boolean(it.isScrap),
      }));

      await onCreateGrn(newOrder, newItems);
      onClose();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create GRN');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPoOrderedSum = items.reduce((sum, it) => sum + (Number(it.poQty) || 0), 0);
  const totalInwardNowSum = items.reduce((sum, it) => sum + (Number(it.receivedQty) || 0), 0);
  const totalPendingSum = Math.max(0, totalPoOrderedSum - totalInwardNowSum);
  const totalValSum = items.reduce((sum, it) => sum + (Number(it.receivedQty) || 0) * (Number(it.unitPrice) || 0), 0);

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content"
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: '900px',
            padding: '24px',
            maxHeight: '92vh',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PackageCheck size={20} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Create Inward Goods Received Note
                  </h2>
                  <span
                    style={{
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      background: '#eff6ff',
                      color: '#2563eb',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid #bfdbfe',
                    }}
                  >
                    {nextGrnNumber}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                  Inward consignments, split delivery installments, and assign to CRM QC inspectors
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label="Close modal"
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          </div>

          {formError && (
            <div
              style={{
                padding: '10px 14px',
                marginBottom: '14px',
                borderRadius: '6px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                fontSize: '12.5px',
                fontWeight: 600,
              }}
            >
              ⚠️ {formError}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* STEP 1: PO SELECTOR WITH AUTO-FETCH (GRANDPA FRIENDLY) */}
            <div
              style={{
                background: '#f0fdf4',
                border: '1.5px solid #86efac',
                borderRadius: '10px',
                padding: '14px 16px',
                marginBottom: '18px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18} color="#16a34a" />
                  <strong style={{ fontSize: '14px', color: '#14532d' }}>
                    1. Choose Purchase Order (PO) to Inward
                  </strong>
                </div>
                <button
                  type="button"
                  onClick={() => setIsManualPo(!isManualPo)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  {isManualPo ? '← Choose from active POs list' : '+ Enter custom PO manually'}
                </button>
              </div>

              {!isManualPo ? (
                <div>
                  <select
                    value={selectedPoId}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__MANUAL__') {
                        setIsManualPo(true);
                      } else {
                        setSelectedPoId(val);
                        const matched = availablePos.find((p) => p.poNumber === val);
                        if (matched) applyPoData(matched);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '14px',
                      fontWeight: 600,
                      borderRadius: '8px',
                      border: '1.5px solid #22c55e',
                      background: '#ffffff',
                      color: '#0f172a',
                    }}
                  >
                    <option value="">-- Click here to select a Purchase Order --</option>
                    {availablePos.map((p) => {
                      const pendingQty = p.items?.reduce((s, it) => s + (it.pendingQty ?? Math.max(0, it.orderedQty - it.receivedQty)), 0) || 0;
                      return (
                        <option key={p.poNumber} value={p.poNumber}>
                          {p.poNumber} — {p.vendorName} ({p.items?.length || 0} items, {pendingQty} units pending)
                        </option>
                      );
                    })}
                    <option value="__MANUAL__">+ Enter PO Number Manually...</option>
                  </select>

                  {selectedPoId && (
                    <div style={{ marginTop: '8px', fontSize: '12.5px', color: '#166534', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={15} color="#16a34a" />
                      <span>
                        Auto-loaded <strong>{items.length} products</strong> from <strong>{poNumber}</strong> (Supplier: {vendorName}). Today&apos;s inward quantities pre-filled below!
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    required
                    placeholder="Enter PO Number (e.g. PO-2026-001)"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      fontSize: '14px',
                      fontWeight: 700,
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const matched = availablePos.find((p) => p.poNumber.trim().toLowerCase() === poNumber.trim().toLowerCase());
                      if (matched) {
                        applyPoData(matched);
                        alert(`✓ Found ${matched.poNumber} with ${matched.items?.length || 0} items! Loaded successfully.`);
                      } else {
                        alert(`PO ${poNumber} not found in database. You can continue entering items manually below.`);
                      }
                    }}
                    style={{
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0 16px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Fetch PO Info
                  </button>
                </div>
              )}
            </div>

            {/* Header Metadata Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              {/* PO Number Display / Edit */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Purchase Order (PO #) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PO-2026-101"
                  className="form-input"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                />
              </div>

              {/* Supplier / Vendor Selection */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>
                    Supplier / Vendor *
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setShowAddSupplierModal(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2563eb',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      + New Supplier
                    </button>
                    {vendorName && (
                      <button
                        type="button"
                        onClick={() => setShowVendorHistory(true)}
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          color: '#0f172a',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          padding: '1px 6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                        title="View complete purchase and receipt history for this vendor"
                      >
                        <Tag size={10} color="#2563eb" />
                        <span>🏷️ History</span>
                      </button>
                    )}
                  </div>
                </div>

                {!customVendor && vendors.length > 0 ? (
                  <select
                    className="form-select"
                    value={vendorName}
                    onChange={(e) => {
                      if (e.target.value === '__NEW_SUPPLIER__') {
                        setShowAddSupplierModal(true);
                      } else {
                        setVendorName(e.target.value);
                      }
                    }}
                  >
                    {vendors.map((v) => (
                      <option key={v.vendorCode} value={v.vendorName}>
                        {v.vendorName} ({v.vendorCode})
                      </option>
                    ))}
                    <option value="__NEW_SUPPLIER__">+ Add New Supplier...</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="Enter supplier / company name"
                    className="form-input"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                  />
                )}
              </div>

              {/* Receiving Date */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
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

              {/* Warehouse Location */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Destination Dock / Warehouse *
                </label>
                <select
                  className="form-select"
                  value={warehouse}
                  onChange={(e) => setWarehouse(e.target.value)}
                >
                  <option value="Main Factory Store">Main Factory Store</option>
                  <option value="Bay-3 Central Hub">Bay-3 Central Hub</option>
                  <option value="Zone-A Cleanroom">Zone-A Cleanroom</option>
                  <option value="Bay-1 Raw Material Yard">Bay-1 Raw Material Yard</option>
                  <option value="Zone-B Heavy Storage">Zone-B Heavy Storage</option>
                </select>
              </div>

              {/* Carrier / Vehicle Tracking */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Vehicle # / Carrier Tracking
                </label>
                <input
                  type="text"
                  placeholder="e.g. MH-12-Q-4455 / SafeXpress"
                  className="form-input"
                  value={carrierTracking}
                  onChange={(e) => setCarrierTracking(e.target.value)}
                />
              </div>

              {/* QC Dock Inspector Dropdown (Populated from CRM users) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>
                    QC Dock Inspector (CRM Registered) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setCustomInspector((prev) => !prev)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontSize: '10.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {customInspector ? 'Select from CRM' : '+ Type Custom'}
                  </button>
                </div>

                {!customInspector ? (
                  <select
                    className="form-select"
                    value={inspector}
                    onChange={(e) => setInspector(e.target.value)}
                    required
                  >
                    <option value="">-- Choose QC Inspector --</option>
                    {crmUsers.map((u) => (
                      <option key={u.email} value={u.fullName}>
                        {u.fullName} ({u.role})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="Enter inspector full name"
                    className="form-input"
                    value={inspector}
                    onChange={(e) => setInspector(e.target.value)}
                  />
                )}
              </div>
            </div>

            {/* Junk / Scrap Consignment Flag */}
            <div style={{ marginBottom: '14px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: isScrapReceipt ? '#b45309' : '#475569',
                  background: isScrapReceipt ? '#fffbeb' : '#f8fafc',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: isScrapReceipt ? '1px solid #fde68a' : '1px solid #e2e8f0',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={isScrapReceipt}
                  onChange={(e) => setIsScrapReceipt(e.target.checked)}
                />
                <span>
                  <strong>Junk / Scrap Stock Receipt:</strong> Consignment contains scrap or rejected parts requiring mandatory QC physical audit before disposal/return.
                </span>
              </label>
            </div>

            {/* Line Items Table */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Inward Products / Line Items ({items.length})
                </h3>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Supports up to 10+ items per inward with separate installment tracking
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="btn-outline"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  fontSize: '11.5px',
                  height: '28px',
                  borderColor: '#2563eb',
                  color: '#2563eb',
                }}
              >
                <Plus size={13} />
                <span>Add Product Row</span>
              </button>
            </div>

            {/* Responsive Table Container */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflowX: 'auto', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <table style={{ width: '100%', minWidth: '760px', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px', width: '95px' }}>SKU Code *</th>
                    <th style={{ padding: '8px 10px' }}>Description / Material *</th>
                    <th style={{ padding: '8px 8px', width: '80px', textAlign: 'center' }}>PO Total</th>
                    <th style={{ padding: '8px 8px', width: '80px', textAlign: 'center' }}>Prior Rec</th>
                    <th style={{ padding: '8px 8px', width: '95px', textAlign: 'center', background: '#dcfce7', color: '#166534' }}>Today Inward *</th>
                    <th style={{ padding: '8px 8px', width: '75px', textAlign: 'center' }}>Balance</th>
                    <th style={{ padding: '8px 8px', width: '65px' }}>Unit</th>
                    <th style={{ padding: '8px 8px', width: '75px' }}>Price (₹)</th>
                    <th style={{ padding: '8px 8px', width: '90px' }}>Batch #</th>
                    <th style={{ padding: '8px 8px', width: '32px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => {
                    const ordered = Number(it.poQty) || 0;
                    const prior = Number(it.alreadyReceivedQty) || 0;
                    const recToday = Number(it.receivedQty) || 0;
                    const pendingAfterToday = Math.max(0, ordered - (prior + recToday));
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 8px' }}>
                          <input
                            type="text"
                            required
                            placeholder="e.g. ITM-01"
                            list="grn-modal-catalog-skus"
                            className="form-input"
                            style={{ padding: '4px 6px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}
                            value={it.itemCode}
                            onChange={(e) => handleItemChange(idx, 'itemCode', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <input
                            type="text"
                            required
                            placeholder="Item specifications..."
                            className="form-input"
                            style={{ padding: '4px 6px', fontSize: '12px' }}
                            value={it.description}
                            onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 600 }}>
                          {ordered}
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'center', color: '#64748b' }}>
                          {prior}
                        </td>
                        <td style={{ padding: '6px 8px', background: '#f0fdf4' }}>
                          <input
                            type="number"
                            min="0"
                            required
                            className="form-input"
                            style={{
                              padding: '5px 6px',
                              fontSize: '13px',
                              fontWeight: 800,
                              textAlign: 'center',
                              borderColor: '#22c55e',
                              background: '#ffffff',
                              color: '#15803d',
                            }}
                            value={it.receivedQty}
                            onChange={(e) => handleItemChange(idx, 'receivedQty', Number(e.target.value))}
                          />
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <span
                            style={{
                              fontSize: '11.5px',
                              fontWeight: 700,
                              color: pendingAfterToday > 0 ? '#b45309' : '#15803d',
                              background: pendingAfterToday > 0 ? '#fef3c7' : '#dcfce7',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {pendingAfterToday}
                          </span>
                        </td>
                        <td style={{ padding: '5px 6px' }}>
                          <select
                            className="form-select"
                            style={{ padding: '4px 4px', fontSize: '11px' }}
                            value={it.unit}
                            onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                          >
                            <option value="PCS">PCS</option>
                            <option value="NOS">NOS</option>
                            <option value="SETS">SETS</option>
                            <option value="KG">KG</option>
                            <option value="MTR">MTR</option>
                            <option value="ROLLS">ROLLS</option>
                          </select>
                        </td>
                        <td style={{ padding: '5px 6px' }}>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            className="form-input"
                            style={{ padding: '4px 6px', fontSize: '11.5px' }}
                            value={it.unitPrice}
                            onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                          />
                        </td>
                        <td style={{ padding: '5px 6px' }}>
                          <input
                            type="text"
                            placeholder="BATCH-01"
                            className="form-input"
                            style={{ padding: '4px 6px', fontSize: '11.5px', fontFamily: 'var(--font-mono)' }}
                            value={it.batchNumber}
                            onChange={(e) => handleItemChange(idx, 'batchNumber', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: '5px 6px', textAlign: 'center' }}>
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              title="Remove line item"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#64748b',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Datalist for Master Catalog Autocomplete */}
            <datalist id="grn-modal-catalog-skus">
              {catalogItems.map((c) => (
                <option key={c.itemCode} value={c.itemCode}>
                  {c.itemName} ({c.category || 'General'})
                </option>
              ))}
            </datalist>

            {/* Total Summary Strip */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '16px',
                marginTop: '8px',
                fontSize: '12px',
                padding: '6px 12px',
                background: '#f8fafc',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                flexWrap: 'wrap',
              }}
            >
              <span>Total PO Target: <strong>{totalPoOrderedSum}</strong></span>
              <span>Inward Now: <strong style={{ color: '#2563eb' }}>{totalInwardNowSum}</strong></span>
              <span>Pending Balance: <strong style={{ color: totalPendingSum > 0 ? '#b45309' : '#16a34a' }}>{totalPendingSum}</strong></span>
              <span>Total Inward Value: <strong style={{ color: '#0f172a' }}>₹{totalValSum.toLocaleString('en-IN')}</strong></span>
            </div>

            {/* Notes */}
            <div style={{ marginTop: '12px', marginBottom: '18px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Consignment Remarks / Receiving Notes
              </label>
              <textarea
                rows={2}
                placeholder="Remarks about physical shipment, delivery notes, or QC instructions..."
                className="form-input"
                style={{ resize: 'vertical' }}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn-outline"
                style={{ padding: '6px 14px', fontSize: '12px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary"
                style={{ padding: '6px 20px', fontSize: '12px' }}
              >
                {isSubmitting ? 'Creating Inward GRN...' : 'Save & Inward Consignment'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Quick Add Supplier Modal */}
      {showAddSupplierModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(3px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setShowAddSupplierModal(false)}
        >
          <div
            className="card-compact"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '480px',
              background: '#ffffff',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={18} color="#2563eb" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                  Register New Supplier / Vendor
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSupplierModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={16} />
              </button>
            </div>

            {vendorCreateError && (
              <div
                style={{
                  padding: '8px 12px',
                  background: '#fee2e2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  color: '#b91c1c',
                  fontSize: '12px',
                  marginBottom: '12px',
                }}
              >
                {vendorCreateError}
              </div>
            )}

            <form onSubmit={handleQuickCreateVendor}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>
                    Supplier / Vendor Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Precision Logistics"
                    className="form-input"
                    value={newVendorName}
                    onChange={(e) => setNewVendorName(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>
                      Vendor Code (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. VND-105"
                      className="form-input"
                      value={newVendorCode}
                      onChange={(e) => setNewVendorCode(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>
                      Category
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Hardware & Seals"
                      className="form-input"
                      value={newVendorCategory}
                      onChange={(e) => setNewVendorCategory(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>
                    Contact Person Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Elena Rostova"
                    className="form-input"
                    value={newVendorContact}
                    onChange={(e) => setNewVendorContact(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="sales@vendor.com"
                      className="form-input"
                      value={newVendorEmail}
                      onChange={(e) => setNewVendorEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>
                      Phone / Mobile
                    </label>
                    <input
                      type="text"
                      placeholder="+91 98220 12345"
                      className="form-input"
                      value={newVendorPhone}
                      onChange={(e) => setNewVendorPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  className="btn-outline"
                  style={{ padding: '6px 14px', fontSize: '12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingVendor}
                  className="btn-primary"
                  style={{ padding: '6px 16px', fontSize: '12px' }}
                >
                  {isCreatingVendor ? 'Saving...' : 'Save & Select Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vendor History Modal */}
      <VendorHistoryModal
        isOpen={showVendorHistory}
        onClose={() => setShowVendorHistory(false)}
        vendorName={vendorName}
        vendors={vendors}
        orders={orders}
        items={allItems}
      />
    </>
  );
};
