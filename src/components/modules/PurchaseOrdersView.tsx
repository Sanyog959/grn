'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PurchaseOrder, Vendor, GRNOrder, GRNItem } from '@/types/inventory';
import {
  Plus,
  Trash2,
  PackageCheck,
  Search,
  Building2,
  Calendar,
  Layers,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
  Tag,
  Warehouse,
  Truck,
} from 'lucide-react';

export interface CatalogItem {
  itemCode: string;
  itemName: string;
  category?: string;
  uom: string;
  defaultPrice: number;
}

const DEFAULT_CATALOG_ITEMS: CatalogItem[] = [];

interface PurchaseOrdersViewProps {
  vendors: Vendor[];
  grnOrders?: GRNOrder[];
  grnItems?: GRNItem[];
  onInwardGrnFromPo?: (poNumber: string, vendorName: string) => void;
  onInspectGrn?: (grnNumber: string) => void;
}

interface NewPoItemRow {
  id: string;
  itemCode: string;
  description: string;
  orderedQty: number;
  unit: string;
  unitPrice: number;
}

export const PurchaseOrdersView: React.FC<PurchaseOrdersViewProps> = ({
  vendors,
  grnOrders = [],
  grnItems = [],
  onInwardGrnFromPo,
  onInspectGrn,
}) => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [allGrnOrders, setAllGrnOrders] = useState<GRNOrder[]>(grnOrders);
  const [allGrnItems, setAllGrnItems] = useState<GRNItem[]>(grnItems);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [expandedPoId, setExpandedPoId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // View Related GRNs State
  const [viewingPoGrns, setViewingPoGrns] = useState<string | null>(null);

  // Master Catalog Items State
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>(DEFAULT_CATALOG_ITEMS);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [targetRowIdForNewItem, setTargetRowIdForNewItem] = useState<string | null>(null);
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Raw Material');
  const [newItemUom, setNewItemUom] = useState('PCS');
  const [newItemPrice, setNewItemPrice] = useState<number>(100);

  // New PO form state
  const [newPoNumber, setNewPoNumber] = useState('');
  const [newVendorName, setNewVendorName] = useState('');
  const [newDeliveryDate, setNewDeliveryDate] = useState(() =>
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );
  const [newRemarks, setNewRemarks] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [priceType, setPriceType] = useState<'WITH_GST' | 'WITHOUT_GST'>('WITH_GST');

  // Supplier / Vendor management state
  const [vendorList, setVendorList] = useState<Vendor[]>(vendors || []);
  const [isAddVendorModalOpen, setIsAddVendorModalOpen] = useState(false);
  const [quickVendorName, setQuickVendorName] = useState('');
  const [quickVendorCode, setQuickVendorCode] = useState('');
  const [quickVendorCategory, setQuickVendorCategory] = useState('Raw Material');
  const [quickVendorEmail, setQuickVendorEmail] = useState('');
  const [quickVendorPhone, setQuickVendorPhone] = useState('');
  const [quickVendorSaving, setQuickVendorSaving] = useState(false);

  // Sync prop updates
  useEffect(() => {
    if (vendors && vendors.length > 0) {
      setVendorList(vendors);
    }
  }, [vendors]);

  useEffect(() => {
    if (grnOrders && grnOrders.length > 0) {
      setAllGrnOrders(grnOrders);
    }
  }, [grnOrders]);

  useEffect(() => {
    if (grnItems && grnItems.length > 0) {
      setAllGrnItems(grnItems);
    }
  }, [grnItems]);

  // Multiple items in single PO
  const [items, setItems] = useState<NewPoItemRow[]>([
    {
      id: 'row-1',
      itemCode: '',
      description: '',
      orderedQty: 1,
      unit: 'PCS',
      unitPrice: 0,
    },
  ]);

  // Load POs, GRNs and Master Catalog from backend
  const fetchPurchaseOrders = useCallback(async () => {
    setLoading(true);
    try {
      const [poRes, grnRes, catRes, venRes] = await Promise.all([
        fetch('/api/po'),
        fetch('/api/grn'),
        fetch('/api/catalog'),
        fetch('/api/vendors'),
      ]);
      if (poRes.ok) {
        const data = await poRes.json();
        if (data.purchaseOrders && Array.isArray(data.purchaseOrders)) {
          setPurchaseOrders(data.purchaseOrders);
        }
      }
      if (grnRes.ok) {
        const grnData = await grnRes.json();
        if (grnData.orders) setAllGrnOrders(grnData.orders);
        if (grnData.items) setAllGrnItems(grnData.items);
      }
      if (catRes && catRes.ok) {
        const catData = await catRes.json();
        if (catData.items && Array.isArray(catData.items)) {
          setCatalogItems(
            catData.items.map((it: any) => ({
              itemCode: it.itemCode,
              itemName: it.itemName,
              category: it.category,
              uom: it.uom || 'PCS',
              defaultPrice: Number(it.defaultPrice) || 0,
            }))
          );
        }
      }
      if (venRes && venRes.ok) {
        const venData = await venRes.json();
        if (venData.vendors && Array.isArray(venData.vendors)) {
          setVendorList(venData.vendors);
        }
      }
    } catch (err) {
      console.error('Failed to load purchase orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPurchaseOrders();
  }, [fetchPurchaseOrders]);

  // Reset & prepare modal
  const handleOpenCreateModal = () => {
    const nextNum = `PO-2026-${String(purchaseOrders.length + 1).padStart(3, '0')}`;
    setNewPoNumber(nextNum);
    setNewVendorName(vendorList[0]?.vendorName || 'Apex Precision Logistics');
    setNewDeliveryDate(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
    setNewRemarks('');
    setItems([
      {
        id: `row-${Date.now()}-1`,
        itemCode: catalogItems[0]?.itemCode || 'ITM-01',
        description: catalogItems[0]?.itemName || 'Precision Machined Flange (Steel)',
        orderedQty: 100,
        unit: catalogItems[0]?.uom || 'PCS',
        unitPrice: catalogItems[0]?.defaultPrice || 500,
      },
    ]);
    setIsCreateModalOpen(true);
  };

  const handleAddItemRow = () => {
    const nextIdx = items.length + 1;
    const defaultCatalogItem = catalogItems[nextIdx % catalogItems.length] || catalogItems[0];
    setItems((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${nextIdx}`,
        itemCode: defaultCatalogItem?.itemCode || `ITM-${String(nextIdx).padStart(2, '0')}`,
        description: defaultCatalogItem?.itemName || '',
        orderedQty: 50,
        unit: defaultCatalogItem?.uom || 'PCS',
        unitPrice: defaultCatalogItem?.defaultPrice || 100,
      },
    ]);
  };

  const handleRemoveItemRow = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleUpdateItemRow = (
    id: string,
    field: keyof NewPoItemRow,
    value: string | number
  ) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  // Add Item to Master Catalog
  const handleCreateCatalogItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemCode.trim() || !newItemName.trim()) return;

    const created: CatalogItem = {
      itemCode: newItemCode.trim().toUpperCase(),
      itemName: newItemName.trim(),
      category: newItemCategory,
      uom: newItemUom,
      defaultPrice: Number(newItemPrice) || 0,
    };

    setCatalogItems((prev) => [...prev, created]);

    // Persist to backend catalog registry
    fetch('/api/catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(created),
    }).catch((err) => console.warn('Catalog save notice:', err));

    if (targetRowIdForNewItem) {
      setItems((prev) =>
        prev.map((r) =>
          r.id === targetRowIdForNewItem
            ? {
                ...r,
                itemCode: created.itemCode,
                description: created.itemName,
                unit: created.uom,
                unitPrice: created.defaultPrice,
              }
            : r
        )
      );
    }

    setIsAddItemModalOpen(false);
    setTargetRowIdForNewItem(null);
    setNewItemCode('');
    setNewItemName('');
    setNewItemPrice(100);
  };

  // Quick Add Supplier
  const handleQuickAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickVendorName.trim() || !quickVendorCode.trim()) return;

    setQuickVendorSaving(true);
    const newVendor: Vendor = {
      id: `v-${Date.now()}`,
      vendorCode: quickVendorCode.trim().toUpperCase(),
      vendorName: quickVendorName.trim(),
      category: quickVendorCategory,
      contactPerson: 'Purchasing Contact',
      email: quickVendorEmail.trim() || 'vendor@example.com',
      phone: quickVendorPhone.trim() || '+91 98000 00000',
      leadTimeDays: 7,
      qualityRating: 5.0,
      status: 'Active',
    };

    try {
      await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVendor),
      });
      setVendorList((prev) => [newVendor, ...prev]);
      setNewVendorName(newVendor.vendorName);
      setIsAddVendorModalOpen(false);
      setQuickVendorName('');
      setQuickVendorCode('');
      setQuickVendorEmail('');
      setQuickVendorPhone('');
    } catch (err) {
      console.error('Error adding vendor:', err);
      setVendorList((prev) => [newVendor, ...prev]);
      setNewVendorName(newVendor.vendorName);
      setIsAddVendorModalOpen(false);
    } finally {
      setQuickVendorSaving(false);
    }
  };

  // Total calculation based on user input
  const totalAmount = items.reduce(
    (sum, it) => sum + (Number(it.orderedQty) || 0) * (Number(it.unitPrice) || 0),
    0
  );

  const handleSavePo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPoNumber.trim() || !newVendorName.trim()) {
      alert('Please fill PO number and Supplier name');
      return;
    }

    if (items.some((it) => !it.description.trim() || Number(it.orderedQty) <= 0)) {
      alert('Please ensure all items have a description and quantity greater than 0');
      return;
    }

    setIsSaving(true);
    const vendorObj = vendorList.find((v) => v.vendorName === newVendorName);

    const formattedPo: PurchaseOrder = {
      id: newPoNumber.trim(),
      poNumber: newPoNumber.trim(),
      vendorId: vendorObj?.vendorCode || 'VND-GEN',
      vendorName: newVendorName.trim(),
      poDate: new Date().toISOString().slice(0, 10),
      deliveryDueDate: newDeliveryDate,
      status: 'ISSUED',
      totalAmount,
      priceType,
      remarks: newRemarks,
      items: items.map((it, idx) => ({
        id: `poi-${Date.now()}-${idx}`,
        poId: newPoNumber.trim(),
        itemId: it.itemCode,
        itemCode: it.itemCode,
        description: it.description,
        orderedQty: Number(it.orderedQty),
        receivedQty: 0,
        acceptedQty: 0,
        pendingQty: Number(it.orderedQty),
        unitPrice: Number(it.unitPrice),
        taxPercent: priceType === 'WITH_GST' ? 0 : 0,
        priceType,
        lineTotal: Number(it.orderedQty) * Number(it.unitPrice),
      })),
    };

    try {
      const res = await fetch('/api/po', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedPo),
      });

      if (res.ok) {
        setPurchaseOrders((prev) => [formattedPo, ...prev]);
        setIsCreateModalOpen(false);
      } else {
        const data = await res.json();
        alert(`Error saving PO: ${data.error || 'Failed'}`);
      }
    } catch {
      setPurchaseOrders((prev) => [formattedPo, ...prev]);
      setIsCreateModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredPos = purchaseOrders.filter((po) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      po.poNumber.toLowerCase().includes(q) ||
      po.vendorName.toLowerCase().includes(q) ||
      (po.remarks && po.remarks.toLowerCase().includes(q)) ||
      (po.items && po.items.some((i) => i.description.toLowerCase().includes(q) || i.itemCode.toLowerCase().includes(q)));

    const matchesStatus = statusFilter === 'ALL' || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ISSUED':
        return { bg: '#e0f2fe', color: '#0369a1', label: '● Issued / Awaiting Delivery' };
      case 'PARTIALLY_RECEIVED':
        return { bg: '#fef3c7', color: '#b45309', label: '◐ Partially Received' };
      case 'COMPLETED':
        return { bg: '#dcfce7', color: '#15803d', label: '✓ Fully Received & Closed' };
      case 'CANCELLED':
        return { bg: '#fee2e2', color: '#991b1b', label: '✕ Cancelled' };
      default:
        return { bg: '#f1f5f9', color: '#475569', label: status };
    }
  };

  // Get matching GRNs for a PO
  const getPoGrns = (poNumber: string) => {
    return allGrnOrders.filter((g) => g.poNumber.trim().toLowerCase() === poNumber.trim().toLowerCase());
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Top Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: '14px',
          padding: '20px 24px',
          color: '#ffffff',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.1)',
        }}
      >
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 4px 0', letterSpacing: '-0.02em', color: '#ffffff' }}>
            Purchase Orders (PO)
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
            Multi-Item Supplier Orders &bull; Direct Live Inward Tracking &bull; One-Click Related GRN Audits
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          style={{
            background: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
          }}
        >
          <Plus size={16} />
          <span>+ Create Purchase Order</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px', borderLeft: '4px solid #2563eb' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b' }}>TOTAL ORDERS</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
            {purchaseOrders.length}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Issued to Registered Suppliers</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b' }}>INWARD IN PROGRESS</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#b45309', margin: '4px 0' }}>
            {purchaseOrders.filter((p) => p.status === 'PARTIALLY_RECEIVED' || p.status === 'ISSUED').length}
          </div>
          <div style={{ fontSize: '11px', color: '#b45309' }}>Awaiting Full Dock Inward</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b' }}>COMPLETED ORDERS</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#15803d', margin: '4px 0' }}>
            {purchaseOrders.filter((p) => p.status === 'COMPLETED').length}
          </div>
          <div style={{ fontSize: '11px', color: '#15803d' }}>Fully Received at Warehouse</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px', borderLeft: '4px solid #6366f1' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b' }}>TOTAL ORDER VALUATION</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#4338ca', margin: '4px 0' }}>
            ₹{purchaseOrders.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Cumulative Committed Value</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '12px 18px',
          marginBottom: '18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 280px', maxWidth: '450px' }}>
          <Search size={16} color="#64748b" />
          <input
            type="text"
            placeholder="Search PO #, Supplier, Material, or Scope of Supply..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              fontSize: '13px',
              width: '100%',
              background: 'transparent',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['ALL', 'ISSUED', 'PARTIALLY_RECEIVED', 'COMPLETED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: statusFilter === st ? '#2563eb' : '#e2e8f0',
                background: statusFilter === st ? '#eff6ff' : '#ffffff',
                color: statusFilter === st ? '#2563eb' : '#64748b',
                transition: 'all 0.15s ease',
              }}
            >
              {st === 'ALL' ? 'All Orders' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Purchase Orders List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          Loading purchase orders...
        </div>
      ) : filteredPos.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '48px 24px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
            No Purchase Orders Found
          </h3>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>
            Create a multi-item purchase order to initiate inward material supply.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="btn-accent"
            style={{ padding: '8px 18px', fontSize: '13px' }}
          >
            + Create First Purchase Order
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredPos.map((po) => {
            const isExpanded = expandedPoId === po.poNumber;
            const badge = getStatusBadge(po.status);
            const totalItemsCount = po.items?.length || 0;
            const totalOrderedQty = po.items?.reduce((s, it) => s + (Number(it.orderedQty) || 0), 0) || 0;
            const totalReceivedQty = po.items?.reduce((s, it) => s + (Number(it.receivedQty) || 0), 0) || 0;
            const canInward = po.status !== 'COMPLETED' && po.status !== 'CANCELLED';
            const relatedGrns = getPoGrns(po.poNumber);

            return (
              <div
                key={po.poNumber}
                style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
                  overflow: 'hidden',
                  transition: 'border-color 0.15s ease',
                }}
              >
                {/* PO Card Header */}
                <div
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                    borderBottom: isExpanded ? '1px solid #f1f5f9' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '16px',
                            fontWeight: 800,
                            color: '#0f172a',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {po.poNumber}
                        </span>
                        <span
                          style={{
                            background: badge.bg,
                            color: badge.color,
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '999px',
                          }}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '13.5px',
                          fontWeight: 600,
                          color: '#334155',
                          marginTop: '3px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Building2 size={14} color="#64748b" />
                        <span>Supplier: <strong>{po.vendorName}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Order Total</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                        ₹{(po.totalAmount || 0).toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Delivery Due</div>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155' }}>
                        {po.deliveryDueDate || po.poDate}
                      </div>
                    </div>

                    {/* BUTTON 1: View Related GRNs only */}
                    <button
                      onClick={() => setViewingPoGrns(po.poNumber)}
                      style={{
                        background: '#f0fdf4',
                        color: '#15803d',
                        border: '1px solid #bbf7d0',
                        borderRadius: '6px',
                        padding: '7px 12px',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                      title="View all inward dock receipts generated against this PO"
                    >
                      <PackageCheck size={14} />
                      <span>View GRNs ({relatedGrns.length})</span>
                    </button>

                    {/* BUTTON 2: Inward GRN */}
                    {canInward && onInwardGrnFromPo && (
                      <button
                        onClick={() => onInwardGrnFromPo(po.poNumber, po.vendorName)}
                        style={{
                          background: '#2563eb',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '7px 14px',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <Plus size={14} />
                        <span>Inward GRN</span>
                      </button>
                    )}

                    <button
                      onClick={() => setExpandedPoId(isExpanded ? null : po.poNumber)}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '7px 10px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#475569',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>{totalItemsCount} {totalItemsCount === 1 ? 'Item' : 'Items'}</span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {/* Items Breakdown Table (Expanded) */}
                {isExpanded && (
                  <div style={{ background: '#f8fafc', padding: '14px 20px', borderTop: '1px solid #f1f5f9' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px',
                      }}
                    >
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#475569' }}>
                        📦 Items in this Order ({totalItemsCount} items &bull; {totalReceivedQty} of {totalOrderedQty} units received)
                      </span>
                      {po.remarks && (
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          Note: {po.remarks}
                        </span>
                      )}
                    </div>

                    {/* Desktop Table View */}
                    <div className="desktop-table-view" style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '12.5px', minWidth: '600px' }}>
                        <thead>
                          <tr style={{ background: '#edf2f7', color: '#475569', textAlign: 'left' }}>
                            <th style={{ padding: '8px 10px', borderRadius: '4px 0 0 4px', whiteSpace: 'nowrap' }}>Item Code</th>
                            <th style={{ padding: '8px 10px' }}>Description / Material</th>
                            <th style={{ padding: '8px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>Ordered Qty</th>
                            <th style={{ padding: '8px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>Received</th>
                            <th style={{ padding: '8px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>Pending Balance</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>Unit Price</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right', borderRadius: '0 4px 4px 0', whiteSpace: 'nowrap' }}>Line Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {po.items && po.items.length > 0 ? (
                            po.items.map((it) => {
                              const pending = Math.max(0, (it.orderedQty || 0) - (it.receivedQty || 0));
                              const isFullyReceived = (it.receivedQty || 0) >= (it.orderedQty || 0);

                              return (
                                <tr key={it.id || it.itemCode} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                  <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                                    {it.itemCode}
                                  </td>
                                  <td style={{ padding: '8px 10px', color: '#1e293b' }}>
                                    {it.description}
                                  </td>
                                  <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                    {it.orderedQty} {it.unit || 'PCS'}
                                  </td>
                                  <td style={{ padding: '8px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                    <span
                                      style={{
                                        background: isFullyReceived ? '#dcfce7' : '#fef3c7',
                                        color: isFullyReceived ? '#15803d' : '#b45309',
                                        padding: '2px 8px',
                                        borderRadius: '999px',
                                        fontWeight: 700,
                                        fontSize: '11px',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {it.receivedQty || 0} {it.unit || 'PCS'}
                                    </span>
                                  </td>
                                  <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: pending > 0 ? '#b45309' : '#15803d', whiteSpace: 'nowrap' }}>
                                    {pending} {it.unit || 'PCS'}
                                  </td>
                                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#64748b', whiteSpace: 'nowrap' }}>
                                    ₹{it.unitPrice}
                                  </td>
                                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                                    ₹{(it.lineTotal || (it.orderedQty * it.unitPrice)).toLocaleString('en-IN')}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={7} style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>
                                No items recorded on this PO.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card View for Expanded PO Items */}
                    <div className="mobile-card-view" style={{ gap: '8px', marginTop: '8px' }}>
                      {po.items && po.items.map((it) => {
                        const pending = Math.max(0, (it.orderedQty || 0) - (it.receivedQty || 0));
                        const isFullyReceived = (it.receivedQty || 0) >= (it.orderedQty || 0);
                        return (
                          <div key={`m-po-it-${it.id || it.itemCode}`} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: '12.5px', color: '#0f172a' }}>{it.itemCode}</span>
                              <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: isFullyReceived ? '#dcfce7' : '#fef3c7', color: isFullyReceived ? '#15803d' : '#b45309' }}>
                                {it.receivedQty || 0} / {it.orderedQty} {it.unit || 'PCS'}
                              </span>
                            </div>
                            <div style={{ fontWeight: 600, fontSize: '12.5px', color: '#334155', marginBottom: '6px' }}>{it.description}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748b' }}>
                              <span>₹{it.unitPrice} / {it.unit || 'PCS'}</span>
                              <span style={{ fontWeight: 800, color: '#0f172a' }}>Total: ₹{(it.lineTotal || (it.orderedQty * it.unitPrice)).toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: VIEW RELATED GRNs OF A SPECIFIC PO */}
      {viewingPoGrns && (
        <div className="modal-overlay" onClick={() => setViewingPoGrns(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '800px', padding: '24px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PackageCheck size={20} color="#2563eb" />
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Inward Dock GRNs for PO #{viewingPoGrns}
                  </h2>
                </div>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                  Showing all consignment shipments and goods received notes inwarded against this Purchase Order
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingPoGrns(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {getPoGrns(viewingPoGrns).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📥</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                  No Dock Receipts Created Yet
                </div>
                <p style={{ fontSize: '12.5px', color: '#64748b', margin: '4px 0 16px' }}>
                  The supplier has not delivered any consignment against PO #{viewingPoGrns} yet.
                </p>
                {onInwardGrnFromPo && (
                  <button
                    onClick={() => {
                      const po = purchaseOrders.find((p) => p.poNumber === viewingPoGrns);
                      setViewingPoGrns(null);
                      onInwardGrnFromPo(viewingPoGrns, po?.vendorName || '');
                    }}
                    className="btn-accent"
                    style={{ padding: '8px 16px', fontSize: '12.5px' }}
                  >
                    + Receive First Shipment at Dock (Create GRN)
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                        <th style={{ padding: '10px 12px' }}>GRN NUMBER</th>
                        <th style={{ padding: '10px 12px' }}>INWARD DATE</th>
                        <th style={{ padding: '10px 12px' }}>WAREHOUSE</th>
                        <th style={{ padding: '10px 12px' }}>VEHICLE / DC</th>
                        <th style={{ padding: '10px 12px' }}>ITEMS</th>
                        <th style={{ padding: '10px 12px' }}>QC STATUS</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPoGrns(viewingPoGrns).map((grn) => {
                        const grnLineItems = allGrnItems.filter((i) => i.grnNumber === grn.grnNumber);
                        const passedCount = grnLineItems.filter((i) => i.qcStatus === 'Passed').length;
                        const pendingQcCount = grnLineItems.filter((i) => i.qcStatus === 'Under Review').length;

                        return (
                          <tr key={grn.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: '#2563eb', fontFamily: 'var(--font-mono)' }}>
                              {grn.grnNumber}
                            </td>
                            <td style={{ padding: '10px 12px', color: '#334155' }}>
                              {grn.receivedDate}
                            </td>
                            <td style={{ padding: '10px 12px', color: '#64748b' }}>
                              {grn.warehouse}
                            </td>
                            <td style={{ padding: '10px 12px', color: '#475569' }}>
                              <div>{grn.carrierTracking || 'Standard Logistics'}</div>
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{ fontWeight: 700, color: '#0f172a' }}>{grnLineItems.length || grn.totalItems}</span>{' '}
                              <span style={{ fontSize: '11px', color: '#64748b' }}>lines</span>
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '999px',
                                  background:
                                    grn.status === 'Approved'
                                      ? '#dcfce7'
                                      : grn.status === 'Pending QC'
                                      ? '#fef3c7'
                                      : '#fee2e2',
                                  color:
                                    grn.status === 'Approved'
                                      ? '#15803d'
                                      : grn.status === 'Pending QC'
                                      ? '#b45309'
                                      : '#991b1b',
                                }}
                              >
                                {grn.status}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                              {onInspectGrn && (
                                <button
                                  onClick={() => {
                                    setViewingPoGrns(null);
                                    onInspectGrn(grn.grnNumber);
                                  }}
                                  style={{
                                    background: '#eff6ff',
                                    color: '#2563eb',
                                    border: '1px solid #bfdbfe',
                                    borderRadius: '4px',
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  QC Inspect &rarr;
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setViewingPoGrns(null)}
                    className="btn-outline"
                    style={{ padding: '6px 14px', fontSize: '12px' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE PURCHASE ORDER MODAL */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '960px', width: '95%', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Create Purchase Order (Multi-Item)
                </h2>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                  Select items from master catalog or add new items on the fly
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePo}>
              {/* Header Fields Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '14px',
                  marginBottom: '18px',
                }}
              >
                {/* PO Number */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    PO Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPoNumber}
                    onChange={(e) => setNewPoNumber(e.target.value)}
                    className="form-input"
                    style={{ fontWeight: 700 }}
                  />
                </div>

                {/* Supplier / Vendor */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', margin: 0 }}>
                      Supplier / Vendor *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickVendorCode(`VND-${String(vendorList.length + 101)}`);
                        setIsAddVendorModalOpen(true);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#2563eb',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: '0 2px',
                      }}
                    >
                      + Add Supplier
                    </button>
                  </div>
                  <select
                    value={newVendorName}
                    onChange={(e) => setNewVendorName(e.target.value)}
                    className="form-select"
                  >
                    <option value="">-- Select Registered Supplier --</option>
                    {vendorList.map((v) => (
                      <option key={v.vendorCode} value={v.vendorName}>
                        {v.vendorName} ({v.vendorCode})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Delivery Due Date */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Expected Delivery Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newDeliveryDate}
                    onChange={(e) => setNewDeliveryDate(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              {/* MULTIPLE ITEMS BUILDER SECTION */}
              <div
                style={{
                  background: '#f8fafc',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  padding: '16px',
                  marginBottom: '18px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                      <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        📦 Items in this Order ({items.length})
                      </h3>
                      <p style={{ fontSize: '11.5px', color: '#64748b', margin: '2px 0 0 0' }}>
                        Pick from catalog dropdown or add new custom items
                      </p>
                    </div>

                    {/* Rate Mode Toggle */}
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                        background: '#e2e8f0',
                        padding: '2px 4px',
                        borderRadius: '6px',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setPriceType('WITH_GST')}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: priceType === 'WITH_GST' ? '#2563eb' : 'transparent',
                          color: priceType === 'WITH_GST' ? '#ffffff' : '#475569',
                          border: 'none',
                        }}
                      >
                        With GST
                      </button>
                      <button
                        type="button"
                        onClick={() => setPriceType('WITHOUT_GST')}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: priceType === 'WITHOUT_GST' ? '#2563eb' : 'transparent',
                          color: priceType === 'WITHOUT_GST' ? '#ffffff' : '#475569',
                          border: 'none',
                        }}
                      >
                        Without GST
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetRowIdForNewItem(null);
                        setNewItemCode(`ITM-${String(catalogItems.length + 1).padStart(2, '0')}`);
                        setIsAddItemModalOpen(true);
                      }}
                      style={{
                        background: '#ffffff',
                        color: '#4338ca',
                        border: '1px solid #c7d2fe',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>+ New Catalog Item</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAddItemRow}
                      className="btn-accent"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      <Plus size={14} />
                      <span>+ Add Row</span>
                    </button>
                  </div>
                </div>

                {/* Items Rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {items.map((row) => {
                    const rowLineTotal = (Number(row.orderedQty) || 0) * (Number(row.unitPrice) || 0);

                    return (
                      <div
                        key={row.id}
                        style={{
                          background: '#ffffff',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          padding: '10px 12px',
                          display: 'grid',
                          gridTemplateColumns: 'minmax(220px, 1.8fr) minmax(130px, 1fr) 85px 75px 100px 90px 32px',
                          gap: '8px',
                          alignItems: 'center',
                        }}
                      >
                        {/* 1. Item Dropdown Selector */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748b' }}>
                              Catalog SKU *
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setTargetRowIdForNewItem(row.id);
                                setNewItemCode(`ITM-${String(catalogItems.length + 1).padStart(2, '0')}`);
                                setIsAddItemModalOpen(true);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#2563eb',
                                fontSize: '10px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                padding: 0,
                              }}
                            >
                              + Add Item
                            </button>
                          </div>
                          <select
                            value={row.itemCode}
                            onChange={(e) => {
                              const code = e.target.value;
                              if (code === '__ADD_NEW__') {
                                setTargetRowIdForNewItem(row.id);
                                setNewItemCode(`ITM-${String(catalogItems.length + 1).padStart(2, '0')}`);
                                setIsAddItemModalOpen(true);
                                return;
                              }
                              const found = catalogItems.find((c) => c.itemCode === code);
                              if (found) {
                                handleUpdateItemRow(row.id, 'itemCode', found.itemCode);
                                handleUpdateItemRow(row.id, 'description', found.itemName);
                                handleUpdateItemRow(row.id, 'unit', found.uom);
                                handleUpdateItemRow(row.id, 'unitPrice', found.defaultPrice);
                              }
                            }}
                            className="form-select"
                            style={{ fontSize: '12px', padding: '5px 8px' }}
                          >
                            <option value="">-- Choose Catalog Item --</option>
                            {catalogItems.map((c) => (
                              <option key={c.itemCode} value={c.itemCode}>
                                {c.itemCode} - {c.itemName} ({c.uom})
                              </option>
                            ))}
                            <option value="__ADD_NEW__">➕ + Add New Item to Catalog...</option>
                          </select>
                        </div>

                        {/* 2. Description (editable/auto-filled) */}
                        <div>
                          <label style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748b', display: 'block' }}>
                            Description *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Material Description"
                            value={row.description}
                            onChange={(e) => handleUpdateItemRow(row.id, 'description', e.target.value)}
                            className="form-input"
                            style={{ fontSize: '12px', padding: '5px 8px' }}
                          />
                        </div>

                        {/* 3. Ordered Qty */}
                        <div>
                          <label style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748b', display: 'block' }}>
                            Qty *
                          </label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={row.orderedQty}
                            onChange={(e) => handleUpdateItemRow(row.id, 'orderedQty', Number(e.target.value))}
                            className="form-input"
                            style={{ fontSize: '12px', padding: '5px 8px', fontWeight: 700 }}
                          />
                        </div>

                        {/* 4. Unit */}
                        <div>
                          <label style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748b', display: 'block' }}>
                            UOM
                          </label>
                          <select
                            value={row.unit}
                            onChange={(e) => handleUpdateItemRow(row.id, 'unit', e.target.value)}
                            className="form-select"
                            style={{ fontSize: '12px', padding: '5px 6px' }}
                          >
                            <option value="PCS">PCS</option>
                            <option value="KG">KG</option>
                            <option value="MTR">MTR</option>
                            <option value="NOS">NOS</option>
                            <option value="SET">SET</option>
                            <option value="BOX">BOX</option>
                            <option value="LTR">LTR</option>
                          </select>
                        </div>

                        {/* 5. Unit Price */}
                        <div>
                          <label style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748b', display: 'block' }}>
                            Unit Price (₹) *
                          </label>
                          <input
                            type="number"
                            required
                            min="0"
                            value={row.unitPrice}
                            onChange={(e) => handleUpdateItemRow(row.id, 'unitPrice', Number(e.target.value))}
                            className="form-input"
                            style={{ fontSize: '12px', padding: '5px 8px', fontWeight: 700 }}
                          />
                        </div>

                        {/* 6. Line Total */}
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block' }}>Line Total</span>
                          <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>
                            ₹{rowLineTotal.toLocaleString('en-IN')}
                          </span>
                        </div>

                        {/* 7. Delete Row */}
                        <div style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(row.id)}
                            disabled={items.length <= 1}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: items.length <= 1 ? '#cbd5e1' : '#ef4444',
                              cursor: items.length <= 1 ? 'not-allowed' : 'pointer',
                              padding: '2px',
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Subtotal Footer */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    marginTop: '12px',
                    paddingTop: '10px',
                    borderTop: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Total Amount ({priceType === 'WITH_GST' ? 'GST Included' : 'Excluding GST'}):
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#2563eb' }}>
                      ₹{totalAmount.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Scope of Supply / Order Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Standard test certificates & heat numbers must accompany delivery."
                  value={newRemarks}
                  onChange={(e) => setNewRemarks(e.target.value)}
                  className="form-input"
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn-outline"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-accent"
                  style={{ padding: '8px 20px' }}
                >
                  {isSaving ? 'Saving PO...' : '✓ Save & Issue Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW CATALOG ITEM */}
      {isAddItemModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 10001 }} onClick={() => setIsAddItemModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                ➕ Add New Item to Catalog
              </h3>
              <button
                type="button"
                onClick={() => setIsAddItemModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCatalogItem}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                  Item Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ITM-08"
                  value={newItemCode}
                  onChange={(e) => setNewItemCode(e.target.value)}
                  className="form-input"
                  style={{ fontWeight: 700 }}
                />
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                  Item Name / Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chromium Plated Piston Rod"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                    Category
                  </label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="form-select"
                  >
                    <option value="Raw Material">Raw Material</option>
                    <option value="Machined Parts">Machined Parts</option>
                    <option value="Fasteners">Fasteners</option>
                    <option value="Castings">Castings</option>
                    <option value="Consumables">Consumables</option>
                    <option value="Packaging">Packaging</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                    Unit of Measure (UOM)
                  </label>
                  <select
                    value={newItemUom}
                    onChange={(e) => setNewItemUom(e.target.value)}
                    className="form-select"
                  >
                    <option value="PCS">PCS</option>
                    <option value="KG">KG</option>
                    <option value="MTR">MTR</option>
                    <option value="NOS">NOS</option>
                    <option value="SET">SET</option>
                    <option value="BOX">BOX</option>
                    <option value="LTR">LTR</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                  Standard Unit Price (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(Number(e.target.value))}
                  className="form-input"
                  style={{ fontWeight: 700 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(false)}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-accent"
                >
                  ✓ Add & Select Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: QUICK ADD SUPPLIER */}
      {isAddVendorModalOpen && (
        <div
          className="modal-overlay"
          style={{ zIndex: 10001 }}
          onClick={() => setIsAddVendorModalOpen(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px', padding: '20px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                🏢 Add New Supplier / Vendor
              </h3>
              <button
                type="button"
                onClick={() => setIsAddVendorModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickAddVendor}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                  Supplier / Company Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Industrial Steel Corp"
                  value={quickVendorName}
                  onChange={(e) => setQuickVendorName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                    Supplier Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={quickVendorCode}
                    onChange={(e) => setQuickVendorCode(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                    Category
                  </label>
                  <select
                    value={quickVendorCategory}
                    onChange={(e) => setQuickVendorCategory(e.target.value)}
                    className="form-select"
                  >
                    <option value="Raw Material">Raw Material</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Machined Parts">Machined Parts</option>
                    <option value="Fasteners & Hardware">Fasteners & Hardware</option>
                    <option value="Consumables">Consumables</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="sales@vendor.com"
                    value={quickVendorEmail}
                    onChange={(e) => setQuickVendorEmail(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                    Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98000 00000"
                    value={quickVendorPhone}
                    onChange={(e) => setQuickVendorPhone(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddVendorModalOpen(false)}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickVendorSaving}
                  className="btn-accent"
                >
                  {quickVendorSaving ? 'Saving...' : '✓ Add Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
