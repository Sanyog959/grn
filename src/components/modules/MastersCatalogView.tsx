'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Customer, Vendor, MasterCatalogItem } from '@/types/inventory';
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  Star,
  Mail,
  Phone,
  Edit,
  Trash2,
  X,
  Tag,
  Package,
  DollarSign,
  MapPin,
  AlertCircle,
  Copy,
  History,
} from 'lucide-react';

interface MastersCatalogViewProps {
  initialTab?: 'items' | 'vendors' | 'customers' | 'units';
}

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

const INITIAL_CUSTOMERS: Customer[] = [];

export const MastersCatalogView: React.FC<MastersCatalogViewProps> = ({
  initialTab = 'items',
}) => {
  const [activeTab, setActiveTab] = useState<'items' | 'vendors' | 'customers' | 'units'>(initialTab);
  const [search, setSearch] = useState('');

  // ----------------------------------------------------------------------------
  // VENDORS / SUPPLIERS STATE
  // ----------------------------------------------------------------------------
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  // Vendor Form state
  const [vendorCode, setVendorCode] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [vendorCategory, setVendorCategory] = useState('Raw Material');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [vendorStatus, setVendorStatus] = useState<'Active' | 'Preferred' | 'On Probation'>('Active');
  const [vendorRating, setVendorRating] = useState<number>(5.0);
  const [savingVendor, setSavingVendor] = useState(false);

  // ----------------------------------------------------------------------------
  // PRODUCTS / ITEM MASTER CATALOG STATE
  // ----------------------------------------------------------------------------
  const [catalogItems, setCatalogItems] = useState<MasterCatalogItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MasterCatalogItem | null>(null);

  // Product Form state
  const [prodCode, setProdCode] = useState('');
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('Machined Parts');
  const [prodHsn, setProdHsn] = useState('7318');
  const [prodUom, setProdUom] = useState('PCS');
  const [prodPrice, setProdPrice] = useState<number>(100);
  const [prodMinStock, setProdMinStock] = useState<number>(20);
  const [prodReorderQty, setProdReorderQty] = useState<number>(50);
  const [prodStatus, setProdStatus] = useState<'ACTIVE' | 'DISCONTINUED'>('ACTIVE');
  const [savingProduct, setSavingProduct] = useState(false);

  // ----------------------------------------------------------------------------
  // CUSTOMERS STATE
  // ----------------------------------------------------------------------------
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [custCode, setCustCode] = useState('');
  const [custName, setCustName] = useState('');
  const [custContact, setCustContact] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');

  // ----------------------------------------------------------------------------
  // HISTORY AUDIT MODAL STATE
  // ----------------------------------------------------------------------------
  const [historyTarget, setHistoryTarget] = useState<{
    type: 'product' | 'vendor';
    code: string;
    name: string;
    extra?: string;
  } | null>(null);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const handleCopyVendor = (v: Vendor) => {
    setEditingVendor(null);
    setVendorCode(`VND-${String(vendors.length + 101)}`);
    setVendorName(`${v.vendorName} (Copy)`);
    setVendorCategory(v.category || 'Raw Material');
    setContactPerson(v.contactPerson || '');
    setEmail(v.email || '');
    setPhone(v.phone || '');
    setAddress(v.address || '');
    setVendorStatus('Active');
    setVendorRating(v.qualityRating || 5.0);
    setIsAddVendorOpen(true);
  };

  const handleCopyProduct = (item: MasterCatalogItem) => {
    setEditingProduct(null);
    const nextNum = catalogItems.length + 1;
    setProdCode(`ITM-${String(nextNum).padStart(2, '0')}`);
    setProdName(`${item.itemName} (Copy)`);
    setProdCategory(item.category || 'Machined Parts');
    setProdHsn(item.hsnCode || '7318');
    setProdUom(item.uom || 'PCS');
    setProdPrice(Number(item.defaultPrice) || 0);
    setProdMinStock(Number(item.minStock) || 20);
    setProdReorderQty(Number(item.reorderQty) || 50);
    setProdStatus('ACTIVE');
    setIsAddProductOpen(true);
  };

  const handleOpenProductHistory = async (item: MasterCatalogItem) => {
    setHistoryTarget({
      type: 'product',
      code: item.itemCode,
      name: item.itemName,
      extra: `Category: ${item.category} | UOM: ${item.uom} | Price: ₹${item.defaultPrice || 0}`,
    });
    setLoadingHistory(true);
    try {
      const [grnRes, poRes] = await Promise.all([
        fetch('/api/items?qcStatus=all').catch(() => null),
        fetch('/api/po').catch(() => null),
      ]);
      const matchedRecords: any[] = [];
      if (grnRes && grnRes.ok) {
        const d = await grnRes.json();
        if (d.items) {
          d.items
            .filter((it: any) => it.itemCode?.toUpperCase() === item.itemCode.toUpperCase())
            .forEach((it: any) => {
              matchedRecords.push({
                type: 'Inward GRN',
                refNumber: it.grnNumber,
                qty: `${it.receivedQty} ${it.unit}`,
                status: it.qcStatus,
                date: it.inspectedAt ? new Date(it.inspectedAt).toLocaleDateString() : 'Received',
                remarks: it.qcRemarks || it.rejectionReason || 'Inward verification logged',
              });
            });
        }
      }
      setHistoryRecords(matchedRecords);
    } catch {
      setHistoryRecords([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenVendorHistory = async (vendor: Vendor) => {
    setHistoryTarget({
      type: 'vendor',
      code: vendor.vendorCode,
      name: vendor.vendorName,
      extra: `Category: ${vendor.category} | Rating: ${vendor.qualityRating || 5.0}★ | Contact: ${vendor.contactPerson || 'N/A'}`,
    });
    setLoadingHistory(true);
    try {
      const [grnRes, poRes] = await Promise.all([
        fetch('/api/grn').catch(() => null),
        fetch('/api/po').catch(() => null),
      ]);
      const matchedRecords: any[] = [];
      if (grnRes && grnRes.ok) {
        const d = await grnRes.json();
        if (d.orders) {
          d.orders
            .filter((o: any) => o.vendorName?.toLowerCase() === vendor.vendorName.toLowerCase())
            .forEach((o: any) => {
              matchedRecords.push({
                type: 'Dock GRN Delivery',
                refNumber: o.grnNumber,
                qty: `${o.totalItems} items`,
                status: o.status,
                date: o.receivedDate,
                remarks: `Delivery Challan: ${o.deliveryChallan || 'Verified'} | Warehouse: ${o.warehouse || 'Store'}`,
              });
            });
        }
      }
      if (poRes && poRes.ok) {
        const d = await poRes.json();
        if (d.purchaseOrders) {
          d.purchaseOrders
            .filter((p: any) => p.vendorName?.toLowerCase() === vendor.vendorName.toLowerCase())
            .forEach((p: any) => {
              matchedRecords.push({
                type: 'Purchase Order',
                refNumber: p.poNumber,
                qty: `₹${Number(p.totalAmount || 0).toLocaleString('en-IN')}`,
                status: p.status,
                date: p.poDate,
                remarks: p.remarks || 'Purchase Order Issued',
              });
            });
        }
      }
      setHistoryRecords(matchedRecords);
    } catch {
      setHistoryRecords([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // ----------------------------------------------------------------------------
  // FETCH APIS
  // ----------------------------------------------------------------------------
  const fetchVendors = useCallback(async () => {
    setLoadingVendors(true);
    try {
      const res = await fetch('/api/vendors');
      if (res.ok) {
        const data = await res.json();
        if (data.vendors) {
          setVendors(data.vendors);
        }
      }
    } catch (err) {
      console.error('Error fetching vendors:', err);
    } finally {
      setLoadingVendors(false);
    }
  }, []);

  const fetchCatalogItems = useCallback(async () => {
    setLoadingCatalog(true);
    try {
      const res = await fetch('/api/catalog');
      if (res.ok) {
        const data = await res.json();
        if (data.items) {
          setCatalogItems(data.items);
        }
      }
    } catch (err) {
      console.error('Error fetching catalog items:', err);
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    fetchVendors();
    fetchCatalogItems();
  }, [fetchVendors, fetchCatalogItems]);

  // ----------------------------------------------------------------------------
  // VENDOR CRUD HANDLERS
  // ----------------------------------------------------------------------------
  const openAddVendorModal = () => {
    setEditingVendor(null);
    setVendorCode(`VND-${String(vendors.length + 101)}`);
    setVendorName('');
    setVendorCategory('Raw Material');
    setContactPerson('');
    setEmail('');
    setPhone('');
    setAddress('');
    setVendorStatus('Active');
    setVendorRating(5.0);
    setIsAddVendorOpen(true);
  };

  const openEditVendorModal = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setVendorCode(vendor.vendorCode);
    setVendorName(vendor.vendorName);
    setVendorCategory(vendor.category || 'Raw Material');
    setContactPerson(vendor.contactPerson || '');
    setEmail(vendor.email || '');
    setPhone(vendor.phone || '');
    setAddress(vendor.address || '');
    setVendorStatus(vendor.status || 'Active');
    setVendorRating(vendor.qualityRating || 5.0);
    setIsAddVendorOpen(true);
  };

  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorCode.trim() || !vendorName.trim()) return;

    setSavingVendor(true);
    const vendorPayload: Vendor = {
      id: editingVendor?.id || `v-${Date.now()}`,
      vendorCode: vendorCode.trim().toUpperCase(),
      vendorName: vendorName.trim(),
      category: vendorCategory,
      contactPerson: contactPerson.trim() || 'Procurement Rep',
      email: email.trim() || 'supplier@example.com',
      phone: phone.trim() || '+91 90000 00000',
      address: address.trim() || 'Industrial Estate',
      leadTimeDays: 7,
      qualityRating: vendorRating,
      status: vendorStatus,
    };

    try {
      if (editingVendor) {
        // PUT update
        const res = await fetch('/api/vendors', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vendorCode: editingVendor.vendorCode, updates: vendorPayload }),
        });
        if (res.ok) {
          setVendors((prev) =>
            prev.map((v) => (v.vendorCode === editingVendor.vendorCode ? vendorPayload : v))
          );
        }
      } else {
        // POST create
        const res = await fetch('/api/vendors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(vendorPayload),
        });
        if (res.ok) {
          setVendors((prev) => [vendorPayload, ...prev]);
        }
      }
      setIsAddVendorOpen(false);
      setEditingVendor(null);
    } catch (err) {
      console.error('Error saving vendor:', err);
    } finally {
      setSavingVendor(false);
    }
  };

  const handleDeleteVendor = async (code: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete supplier ${name} (${code})?`)) return;

    try {
      const res = await fetch(`/api/vendors?code=${encodeURIComponent(code)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setVendors((prev) => prev.filter((v) => v.vendorCode !== code));
      }
    } catch (err) {
      console.error('Error deleting vendor:', err);
    }
  };

  // ----------------------------------------------------------------------------
  // PRODUCT / CATALOG CRUD HANDLERS
  // ----------------------------------------------------------------------------
  const openAddProductModal = () => {
    setEditingProduct(null);
    const nextNum = catalogItems.length + 1;
    setProdCode(`ITM-${String(nextNum).padStart(2, '0')}`);
    setProdName('');
    setProdCategory('Machined Parts');
    setProdHsn('7318');
    setProdUom('PCS');
    setProdPrice(100);
    setProdMinStock(20);
    setProdReorderQty(50);
    setProdStatus('ACTIVE');
    setIsAddProductOpen(true);
  };

  const openEditProductModal = (item: MasterCatalogItem) => {
    setEditingProduct(item);
    setProdCode(item.itemCode);
    setProdName(item.itemName);
    setProdCategory(item.category || 'Machined Parts');
    setProdHsn(item.hsnCode || '7318');
    setProdUom(item.uom || 'PCS');
    setProdPrice(Number(item.defaultPrice) || 0);
    setProdMinStock(Number(item.minStock) || 20);
    setProdReorderQty(Number(item.reorderQty) || 50);
    setProdStatus(item.status || 'ACTIVE');
    setIsAddProductOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodCode.trim() || !prodName.trim()) return;

    setSavingProduct(true);
    const itemPayload: MasterCatalogItem = {
      id: editingProduct?.id || `cat-${Date.now()}`,
      itemCode: prodCode.trim().toUpperCase(),
      itemName: prodName.trim(),
      category: prodCategory,
      hsnCode: prodHsn.trim(),
      uom: prodUom,
      defaultPrice: Number(prodPrice) || 0,
      minStock: Number(prodMinStock) || 0,
      reorderQty: Number(prodReorderQty) || 0,
      status: prodStatus,
    };

    try {
      if (editingProduct) {
        // PUT update
        const res = await fetch('/api/catalog', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemCode: editingProduct.itemCode, updates: itemPayload }),
        });
        if (res.ok) {
          setCatalogItems((prev) =>
            prev.map((it) => (it.itemCode === editingProduct.itemCode ? itemPayload : it))
          );
        }
      } else {
        // POST create
        const res = await fetch('/api/catalog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(itemPayload),
        });
        if (res.ok) {
          setCatalogItems((prev) => [itemPayload, ...prev]);
        }
      }
      setIsAddProductOpen(false);
      setEditingProduct(null);
    } catch (err) {
      console.error('Error saving product:', err);
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (code: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete product "${name}" (${code}) from catalog?`)) return;

    try {
      const res = await fetch(`/api/catalog?code=${encodeURIComponent(code)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setCatalogItems((prev) => prev.filter((it) => it.itemCode !== code));
      }
    } catch (err) {
      console.error('Error deleting product:', err);
    }
  };

  // ----------------------------------------------------------------------------
  // CUSTOMER CRUD HANDLERS
  // ----------------------------------------------------------------------------
  const openAddCustomerModal = () => {
    setEditingCustomer(null);
    setCustCode(`CUST-${String(customers.length + 101)}`);
    setCustName('');
    setCustContact('');
    setCustEmail('');
    setCustPhone('');
    setCustAddress('');
    setIsAddCustomerOpen(true);
  };

  const openEditCustomerModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setCustCode(customer.customerCode);
    setCustName(customer.customerName);
    setCustContact(customer.contactPerson);
    setCustEmail(customer.email);
    setCustPhone(customer.phone);
    setCustAddress(customer.address || '');
    setIsAddCustomerOpen(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custCode.trim() || !custName.trim()) return;

    const newCust: Customer = {
      id: editingCustomer?.id || `cust-${Date.now()}`,
      customerCode: custCode.trim().toUpperCase(),
      customerName: custName.trim(),
      contactPerson: custContact.trim() || 'Procurement Executive',
      email: custEmail.trim() || 'purchase@client.com',
      phone: custPhone.trim() || '+91 90000 00000',
      address: custAddress.trim() || 'Client Factory Consignee',
      status: 'ACTIVE',
    };

    if (editingCustomer) {
      setCustomers((prev) =>
        prev.map((c) => (c.customerCode === editingCustomer.customerCode ? newCust : c))
      );
    } else {
      setCustomers((prev) => [newCust, ...prev]);
    }
    setIsAddCustomerOpen(false);
    setEditingCustomer(null);
  };

  const handleDeleteCustomer = (code: string, name: string) => {
    if (!window.confirm(`Delete customer ${name} (${code})?`)) return;
    setCustomers((prev) => prev.filter((c) => c.customerCode !== code));
  };

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Masters Registry & Catalogs
          </h1>
          <p style={{ fontSize: '12.5px', color: '#64748b', margin: '2px 0 0 0' }}>
            Maintain product names & prices, verified vendors/suppliers, and customer consignees
          </p>
        </div>

        {/* Dynamic Action Buttons depending on Tab */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {activeTab === 'items' && (
            <button
              onClick={openAddProductModal}
              className="btn-accent"
              style={{ padding: '8px 16px', fontSize: '12.5px', fontWeight: 700, background: '#0284c7' }}
            >
              <Plus size={14} />
              <span>+ Add New Product</span>
            </button>
          )}

          {activeTab === 'vendors' && (
            <button
              onClick={openAddVendorModal}
              className="btn-accent"
              style={{ padding: '8px 16px', fontSize: '12.5px', fontWeight: 700, background: '#2563eb' }}
            >
              <Plus size={14} />
              <span>+ Add New Supplier</span>
            </button>
          )}

          {activeTab === 'customers' && (
            <button
              onClick={openAddCustomerModal}
              className="btn-accent"
              style={{ padding: '8px 16px', fontSize: '12.5px', fontWeight: 700, background: '#059669' }}
            >
              <Plus size={14} />
              <span>+ Add New Customer</span>
            </button>
          )}
        </div>
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
          <span>Item Master Catalog ({catalogItems.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('vendors')}
          className={`nav-tab-btn ${activeTab === 'vendors' ? 'active' : ''}`}
        >
          <span>🏢</span>
          <span>Suppliers & Vendors ({vendors.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          className={`nav-tab-btn ${activeTab === 'customers' ? 'active' : ''}`}
        >
          <span>👥</span>
          <span>Customers Master ({customers.length})</span>
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
      <div className="card" style={{ padding: '12px 18px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Search size={14} color="#64748b" />
          <input
            type="text"
            placeholder={`Filter ${activeTab} records by name, code, category...`}
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

      {/* ------------------------------------------------------------------------ */}
      {/* TAB 1: ITEM MASTER CATALOG (Product Names, Prices, UOM, HSN)             */}
      {/* ------------------------------------------------------------------------ */}
      {/* ------------------------------------------------------------------------ */}
      {/* TAB 1: ITEM MASTER CATALOG (Product Names, Prices, UOM, HSN)             */}
      {/* ------------------------------------------------------------------------ */}
      {activeTab === 'items' && (
        <>
          {/* Desktop Table View */}
          <div className="desktop-table-view card table-responsive-container" style={{ padding: '0', overflowX: 'auto' }}>
            <table className="table-aurora" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: '880px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>ITEM CODE</th>
                  <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>PRODUCT / PART NAME</th>
                  <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>CATEGORY</th>
                  <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>HSN CODE</th>
                  <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>UOM</th>
                  <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>STD PRICE (₹)</th>
                  <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>MIN SAFETY</th>
                  <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>STATUS</th>
                  <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#475569', textAlign: 'center', whiteSpace: 'nowrap' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {catalogItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '36px 16px', textAlign: 'center', color: '#64748b' }}>
                      {loadingCatalog ? 'Loading catalog items...' : 'No products found. Click "+ Add New Product" to create one.'}
                    </td>
                  </tr>
                ) : (
                  catalogItems
                    .filter((it) =>
                      it.itemCode.toLowerCase().includes(search.toLowerCase()) ||
                      it.itemName.toLowerCase().includes(search.toLowerCase()) ||
                      (it.category && it.category.toLowerCase().includes(search.toLowerCase()))
                    )
                    .map((it) => (
                      <tr key={it.itemCode} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '12.5px' }} className="table-row-hover">
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0369a1', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                          {it.itemCode}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a', minWidth: '180px' }}>
                          {it.itemName}
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                            {it.category || 'General'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                            {it.hsnCode || '7318'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>
                          {it.uom}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 800, color: '#059669', fontSize: '13px', whiteSpace: 'nowrap' }}>
                          ₹{Number(it.defaultPrice || 0).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>
                          {it.minStock || 0} {it.uom}
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '999px',
                              background: it.status === 'DISCONTINUED' ? '#fee2e2' : '#dcfce7',
                              color: it.status === 'DISCONTINUED' ? '#b91c1c' : '#15803d',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            ● {it.status || 'ACTIVE'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '5px' }}>
                            <button
                              onClick={() => openEditProductModal(it)}
                              style={{
                                padding: '5px 8px',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11.5px',
                                color: '#0284c7',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                              }}
                              title="Edit Product & Price"
                            >
                              <Edit size={12} />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleCopyProduct(it)}
                              style={{
                                padding: '5px 8px',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11.5px',
                                color: '#475569',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                              }}
                              title="Duplicate / Copy Product"
                            >
                              <Copy size={12} />
                              <span>Copy</span>
                            </button>
                            <button
                              onClick={() => handleOpenProductHistory(it)}
                              style={{
                                padding: '5px 8px',
                                borderRadius: '4px',
                                border: '1px solid #c7d2fe',
                                background: '#eef2ff',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11.5px',
                                color: '#4338ca',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                              }}
                              title="View Inward & Order History"
                            >
                              <History size={12} />
                              <span>History</span>
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(it.itemCode, it.itemName)}
                              style={{
                                padding: '5px 8px',
                                borderRadius: '4px',
                                border: '1px solid #fecaca',
                                background: '#fff1f2',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                fontSize: '11.5px',
                                color: '#e11d48',
                                fontWeight: 600,
                              }}
                              title="Delete Product"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="mobile-card-view">
            {catalogItems.length === 0 ? (
              <div className="mobile-card-item" style={{ textAlign: 'center', color: '#64748b' }}>
                {loadingCatalog ? 'Loading products...' : 'No products found. Add a product to get started.'}
              </div>
            ) : (
              catalogItems
                .filter((it) =>
                  it.itemCode.toLowerCase().includes(search.toLowerCase()) ||
                  it.itemName.toLowerCase().includes(search.toLowerCase()) ||
                  (it.category && it.category.toLowerCase().includes(search.toLowerCase()))
                )
                .map((it) => (
                  <div key={it.itemCode} className="mobile-card-item">
                    <div className="mobile-card-header">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#0369a1', fontSize: '13px' }}>
                            {it.itemCode}
                          </span>
                          <span style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 600, color: '#475569' }}>
                            {it.category || 'General'}
                          </span>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{it.itemName}</div>
                      </div>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background: it.status === 'DISCONTINUED' ? '#fee2e2' : '#dcfce7',
                          color: it.status === 'DISCONTINUED' ? '#b91c1c' : '#15803d',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        ● {it.status || 'ACTIVE'}
                      </span>
                    </div>

                    <div className="mobile-card-grid">
                      <div className="mobile-card-field">
                        <span className="mobile-card-field-label">STANDARD PRICE</span>
                        <span className="mobile-card-field-val" style={{ color: '#059669', fontWeight: 800, fontSize: '13px' }}>
                          ₹{Number(it.defaultPrice || 0).toLocaleString('en-IN')} / {it.uom}
                        </span>
                      </div>
                      <div className="mobile-card-field">
                        <span className="mobile-card-field-label">HSN CODE</span>
                        <span className="mobile-card-field-val" style={{ fontFamily: 'var(--font-mono)' }}>
                          {it.hsnCode || '7318'}
                        </span>
                      </div>
                      <div className="mobile-card-field">
                        <span className="mobile-card-field-label">MIN SAFETY STOCK</span>
                        <span className="mobile-card-field-val">
                          {it.minStock || 0} {it.uom}
                        </span>
                      </div>
                      <div className="mobile-card-field">
                        <span className="mobile-card-field-label">REORDER QTY</span>
                        <span className="mobile-card-field-val">
                          {it.reorderQty || 0} {it.uom}
                        </span>
                      </div>
                    </div>

                    <div className="mobile-card-actions" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => openEditProductModal(it)}
                        className="btn-outline"
                        style={{ flex: 1, padding: '7px 8px', fontSize: '11.5px', justifyContent: 'center' }}
                      >
                        <Edit size={12} color="#0284c7" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleCopyProduct(it)}
                        className="btn-outline"
                        style={{ padding: '7px 8px', fontSize: '11.5px' }}
                      >
                        <Copy size={12} color="#475569" />
                        <span>Copy</span>
                      </button>
                      <button
                        onClick={() => handleOpenProductHistory(it)}
                        className="btn-outline"
                        style={{ padding: '7px 8px', fontSize: '11.5px', background: '#eef2ff', color: '#4338ca', borderColor: '#c7d2fe' }}
                      >
                        <History size={12} />
                        <span>History</span>
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(it.itemCode, it.itemName)}
                        className="btn-outline"
                        style={{ padding: '7px 10px', color: '#e11d48', borderColor: '#fecaca', background: '#fff1f2' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </>
      )}

      {/* ------------------------------------------------------------------------ */}
      {/* TAB 2: SUPPLIERS & VENDORS                                               */}
      {/* ------------------------------------------------------------------------ */}
      {activeTab === 'vendors' && (
        <>
          {/* Desktop Table View */}
          <div className="desktop-table-view card table-responsive-container" style={{ padding: '0', overflowX: 'auto' }}>
            <table className="table-aurora" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: '880px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>CODE</th>
                  <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>SUPPLIER / VENDOR NAME</th>
                  <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>CATEGORY</th>
                  <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>CONTACT PERSON</th>
                  <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>EMAIL & PHONE</th>
                  <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>RATING</th>
                  <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>STATUS</th>
                  <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#475569', textAlign: 'center', whiteSpace: 'nowrap' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {vendors.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '36px 16px', textAlign: 'center', color: '#64748b' }}>
                      {loadingVendors ? 'Loading suppliers...' : 'No suppliers registered yet. Click "+ Add New Supplier" to create one.'}
                    </td>
                  </tr>
                ) : (
                  vendors
                    .filter(
                      (v) =>
                        v.vendorName.toLowerCase().includes(search.toLowerCase()) ||
                        v.vendorCode.toLowerCase().includes(search.toLowerCase()) ||
                        (v.category && v.category.toLowerCase().includes(search.toLowerCase()))
                    )
                    .map((v) => (
                      <tr key={v.vendorCode} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '12.5px' }} className="table-row-hover">
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#2563eb', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                          {v.vendorCode}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a', minWidth: '160px' }}>
                          {v.vendorName}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#475569', whiteSpace: 'nowrap' }}>
                          <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                            {v.category || 'Raw Material'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#334155', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {v.contactPerson || 'Procurement Rep'}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Mail size={11} />
                            <span>{v.email || 'N/A'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <Phone size={11} />
                            <span>{v.phone || 'N/A'}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: '#b45309' }}>
                            <Star size={12} fill="#f59e0b" color="#f59e0b" />
                            <span>{v.qualityRating ? Number(v.qualityRating).toFixed(1) : '5.0'}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '999px',
                              background: v.status === 'On Probation' ? '#fef3c7' : '#dcfce7',
                              color: v.status === 'On Probation' ? '#b45309' : '#15803d',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            ● {v.status || 'Active'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '5px' }}>
                            <button
                              onClick={() => openEditVendorModal(v)}
                              style={{
                                padding: '5px 8px',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11.5px',
                                color: '#2563eb',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                              }}
                              title="Edit Supplier"
                            >
                              <Edit size={12} />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleCopyVendor(v)}
                              style={{
                                padding: '5px 8px',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11.5px',
                                color: '#475569',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                              }}
                              title="Duplicate / Copy Supplier"
                            >
                              <Copy size={12} />
                              <span>Copy</span>
                            </button>
                            <button
                              onClick={() => handleOpenVendorHistory(v)}
                              style={{
                                padding: '5px 8px',
                                borderRadius: '4px',
                                border: '1px solid #c7d2fe',
                                background: '#eef2ff',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11.5px',
                                color: '#4338ca',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                              }}
                              title="View Inward & Order History"
                            >
                              <History size={12} />
                              <span>History</span>
                            </button>
                            <button
                              onClick={() => handleDeleteVendor(v.vendorCode, v.vendorName)}
                              style={{
                                padding: '5px 8px',
                                borderRadius: '4px',
                                border: '1px solid #fecaca',
                                background: '#fff1f2',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                fontSize: '11.5px',
                                color: '#e11d48',
                                fontWeight: 600,
                              }}
                              title="Delete Supplier"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="mobile-card-view">
            {vendors.length === 0 ? (
              <div className="mobile-card-item" style={{ textAlign: 'center', color: '#64748b' }}>
                {loadingVendors ? 'Loading suppliers...' : 'No suppliers registered yet.'}
              </div>
            ) : (
              vendors
                .filter(
                  (v) =>
                    v.vendorName.toLowerCase().includes(search.toLowerCase()) ||
                    v.vendorCode.toLowerCase().includes(search.toLowerCase()) ||
                    (v.category && v.category.toLowerCase().includes(search.toLowerCase()))
                )
                .map((v) => (
                  <div key={v.vendorCode} className="mobile-card-item">
                    <div className="mobile-card-header">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#2563eb', fontSize: '13px' }}>
                            {v.vendorCode}
                          </span>
                          <span style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 600, color: '#475569' }}>
                            {v.category || 'Raw Material'}
                          </span>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{v.vendorName}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '999px',
                            background: v.status === 'On Probation' ? '#fef3c7' : '#dcfce7',
                            color: v.status === 'On Probation' ? '#b45309' : '#15803d',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          ● {v.status || 'Active'}
                        </span>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 700, color: '#b45309', fontSize: '11px' }}>
                          <Star size={11} fill="#f59e0b" color="#f59e0b" />
                          <span>{v.qualityRating ? Number(v.qualityRating).toFixed(1) : '5.0'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mobile-card-grid">
                      <div className="mobile-card-field">
                        <span className="mobile-card-field-label">CONTACT PERSON</span>
                        <span className="mobile-card-field-val">{v.contactPerson || 'Procurement Rep'}</span>
                      </div>
                      <div className="mobile-card-field">
                        <span className="mobile-card-field-label">LEAD TIME</span>
                        <span className="mobile-card-field-val">{v.leadTimeDays || 7} Days</span>
                      </div>
                      <div className="mobile-card-field" style={{ gridColumn: 'span 2' }}>
                        <span className="mobile-card-field-label">COMMUNICATION</span>
                        <span className="mobile-card-field-val" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span>✉️ {v.email || 'N/A'}</span>
                          <span>📞 {v.phone || 'N/A'}</span>
                        </span>
                      </div>
                    </div>

                    <div className="mobile-card-actions" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => openEditVendorModal(v)}
                        className="btn-outline"
                        style={{ flex: 1, padding: '7px 8px', fontSize: '11.5px', justifyContent: 'center' }}
                      >
                        <Edit size={12} color="#2563eb" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleCopyVendor(v)}
                        className="btn-outline"
                        style={{ padding: '7px 8px', fontSize: '11.5px' }}
                      >
                        <Copy size={12} color="#475569" />
                        <span>Copy</span>
                      </button>
                      <button
                        onClick={() => handleOpenVendorHistory(v)}
                        className="btn-outline"
                        style={{ padding: '7px 8px', fontSize: '11.5px', background: '#eef2ff', color: '#4338ca', borderColor: '#c7d2fe' }}
                      >
                        <History size={12} />
                        <span>History</span>
                      </button>
                      <button
                        onClick={() => handleDeleteVendor(v.vendorCode, v.vendorName)}
                        className="btn-outline"
                        style={{ padding: '7px 10px', color: '#e11d48', borderColor: '#fecaca', background: '#fff1f2' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </>
      )}

      {/* ------------------------------------------------------------------------ */}
      {/* TAB 3: CUSTOMERS MASTER                                                  */}
      {/* ------------------------------------------------------------------------ */}
      {activeTab === 'customers' && (
        <>
          {/* Desktop Table View */}
          <div className="desktop-table-view card table-responsive-container" style={{ padding: '0', overflowX: 'auto' }}>
            <table className="table-aurora" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: '800px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>CUSTOMER CODE</th>
                  <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>COMPANY NAME</th>
                  <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>CONTACT PERSON</th>
                  <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>EMAIL</th>
                  <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>PHONE</th>
                  <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>ADDRESS / PLANT</th>
                  <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#475569', textAlign: 'center', whiteSpace: 'nowrap' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {customers
                  .filter((c) =>
                    c.customerName.toLowerCase().includes(search.toLowerCase()) ||
                    c.customerCode.toLowerCase().includes(search.toLowerCase())
                  )
                  .map((c) => (
                    <tr key={c.customerCode} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '12.5px' }} className="table-row-hover">
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0369a1', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                        {c.customerCode}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a', minWidth: '160px' }}>{c.customerName}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, whiteSpace: 'nowrap' }}>{c.contactPerson}</td>
                      <td style={{ padding: '12px 16px', color: '#0284c7', whiteSpace: 'nowrap' }}>{c.email}</td>
                      <td style={{ padding: '12px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>{c.phone}</td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>{c.address}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                          <button
                            onClick={() => openEditCustomerModal(c)}
                            style={{
                              padding: '5px 8px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              fontSize: '11.5px',
                              color: '#059669',
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                            }}
                            title="Edit Customer"
                          >
                            <Edit size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(c.customerCode, c.customerName)}
                            style={{
                              padding: '5px 8px',
                              borderRadius: '4px',
                              border: '1px solid #fecaca',
                              background: '#fff1f2',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              fontSize: '11.5px',
                              color: '#e11d48',
                              fontWeight: 600,
                            }}
                            title="Delete Customer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="mobile-card-view">
            {customers
              .filter((c) =>
                c.customerName.toLowerCase().includes(search.toLowerCase()) ||
                c.customerCode.toLowerCase().includes(search.toLowerCase())
              )
              .map((c) => (
                <div key={c.customerCode} className="mobile-card-item">
                  <div className="mobile-card-header">
                    <div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#0369a1', fontSize: '13px' }}>
                        {c.customerCode}
                      </span>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a', marginTop: '2px' }}>{c.customerName}</div>
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: '#dcfce7',
                        color: '#15803d',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ● ACTIVE
                    </span>
                  </div>

                  <div className="mobile-card-grid">
                    <div className="mobile-card-field">
                      <span className="mobile-card-field-label">CONTACT PERSON</span>
                      <span className="mobile-card-field-val">{c.contactPerson}</span>
                    </div>
                    <div className="mobile-card-field">
                      <span className="mobile-card-field-label">PHONE</span>
                      <span className="mobile-card-field-val">{c.phone}</span>
                    </div>
                    <div className="mobile-card-field" style={{ gridColumn: 'span 2' }}>
                      <span className="mobile-card-field-label">EMAIL</span>
                      <span className="mobile-card-field-val" style={{ color: '#0284c7' }}>{c.email}</span>
                    </div>
                    <div className="mobile-card-field" style={{ gridColumn: 'span 2' }}>
                      <span className="mobile-card-field-label">PLANT / CONGINEE ADDRESS</span>
                      <span className="mobile-card-field-val">{c.address}</span>
                    </div>
                  </div>

                  <div className="mobile-card-actions">
                    <button
                      onClick={() => openEditCustomerModal(c)}
                      className="btn-outline"
                      style={{ flex: 1, padding: '7px 10px', fontSize: '12px', justifyContent: 'center' }}
                    >
                      <Edit size={13} color="#059669" />
                      <span>Edit Customer</span>
                    </button>
                    <button
                      onClick={() => handleDeleteCustomer(c.customerCode, c.customerName)}
                      className="btn-outline"
                      style={{ padding: '7px 12px', color: '#e11d48', borderColor: '#fecaca', background: '#fff1f2' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </>
      )}

      {/* ------------------------------------------------------------------------ */}
      {/* TAB 4: UNITS OF MEASURE (UOM)                                            */}
      {/* ------------------------------------------------------------------------ */}
      {activeTab === 'units' && (
        <div className="card table-responsive-container" style={{ padding: '0', overflowX: 'auto' }}>
          <table className="table-aurora" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>UOM CODE</th>
                <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>UNIT NAME</th>
                <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>CLASSIFICATION</th>
              </tr>
            </thead>
            <tbody>
              {UOM_LIST.map((u) => (
                <tr key={u.code} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '12.5px' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 800, color: '#0369a1', fontFamily: 'var(--font-mono)' }}>
                    {u.code}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{u.name}</td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>{u.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ======================================================================== */}
      {/* MODAL: ADD / EDIT PRODUCT (NAME & PRICE MAINTENANCE)                     */}
      {/* ======================================================================== */}
      {isAddProductOpen && (
        <div className="modal-overlay" onClick={() => setIsAddProductOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={20} color="#0284c7" />
                <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {editingProduct ? 'Edit Product & Price' : 'Add New Catalog Product'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAddProductOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Item Code *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingProduct}
                    value={prodCode}
                    onChange={(e) => setProdCode(e.target.value)}
                    className="form-input"
                    placeholder="ITM-08"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Product / Part Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    className="form-input"
                    placeholder="e.g. High Pressure Hydraulic Hose"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Category
                  </label>
                  <select
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="form-select"
                  >
                    <option value="Machined Parts">Machined Parts</option>
                    <option value="Raw Material">Raw Material</option>
                    <option value="Fasteners">Fasteners & Hardware</option>
                    <option value="Consumables">Consumables & Seals</option>
                    <option value="Castings">Castings & Forgings</option>
                    <option value="Electrical">Electrical & Sensors</option>
                    <option value="Packaging">Packaging</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Unit of Measure (UOM)
                  </label>
                  <select
                    value={prodUom}
                    onChange={(e) => setProdUom(e.target.value)}
                    className="form-select"
                  >
                    {UOM_LIST.map((u) => (
                      <option key={u.code} value={u.code}>
                        {u.code} ({u.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price & HSN */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Standard Unit Price (₹) *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#64748b' }}>
                      ₹
                    </span>
                    <input
                      type="number"
                      required
                      min={0}
                      step="any"
                      value={prodPrice}
                      onChange={(e) => setProdPrice(Number(e.target.value))}
                      className="form-input"
                      style={{ paddingLeft: '26px', fontWeight: 700, color: '#059669' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    HSN Code
                  </label>
                  <input
                    type="text"
                    value={prodHsn}
                    onChange={(e) => setProdHsn(e.target.value)}
                    className="form-input"
                    placeholder="7318"
                  />
                </div>
              </div>

              {/* Stock Thresholds */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Min Safety Stock
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={prodMinStock}
                    onChange={(e) => setProdMinStock(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Reorder Batch Qty
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={prodReorderQty}
                    onChange={(e) => setProdReorderQty(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddProductOpen(false)}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="btn-accent"
                  style={{ background: '#0284c7' }}
                >
                  {savingProduct ? 'Saving...' : editingProduct ? '✓ Update Product' : '✓ Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================== */}
      {/* MODAL: ADD / EDIT SUPPLIER (VENDOR CRUD)                                 */}
      {/* ======================================================================== */}
      {isAddVendorOpen && (
        <div className="modal-overlay" onClick={() => setIsAddVendorOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={20} color="#2563eb" />
                <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {editingVendor ? 'Edit Supplier / Vendor' : 'Add New Supplier / Vendor'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAddVendorOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveVendor}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Supplier / Vendor Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Industrial Steel Corp"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Vendor Code *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingVendor}
                    value={vendorCode}
                    onChange={(e) => setVendorCode(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Category
                  </label>
                  <select
                    value={vendorCategory}
                    onChange={(e) => setVendorCategory(e.target.value)}
                    className="form-select"
                  >
                    <option value="Raw Material">Raw Material</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Machined Parts">Machined Parts</option>
                    <option value="Fasteners & Hardware">Fasteners & Hardware</option>
                    <option value="Consumables">Consumables & Seals</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Kumar"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98000 00000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="sales@vendor.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Status
                  </label>
                  <select
                    value={vendorStatus}
                    onChange={(e) => setVendorStatus(e.target.value as any)}
                    className="form-select"
                  >
                    <option value="Active">Active</option>
                    <option value="Preferred">Preferred</option>
                    <option value="On Probation">On Probation</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Address / Plant Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bhosari Industrial Area, Pune"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddVendorOpen(false)}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingVendor}
                  className="btn-accent"
                  style={{ background: '#2563eb' }}
                >
                  {savingVendor ? 'Saving...' : editingVendor ? '✓ Update Supplier' : '✓ Add Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================== */}
      {/* MODAL: ADD / EDIT CUSTOMER                                               */}
      {/* ======================================================================== */}
      {isAddCustomerOpen && (
        <div className="modal-overlay" onClick={() => setIsAddCustomerOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {editingCustomer ? 'Edit Customer Consignee' : 'Add New Customer Consignee'}
              </h2>
              <button
                type="button"
                onClick={() => setIsAddCustomerOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCustomer}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mahindra Heavy Machinery Ltd"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Customer Code *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingCustomer}
                    value={custCode}
                    onChange={(e) => setCustCode(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Amit Kulkarni"
                    value={custContact}
                    onChange={(e) => setCustContact(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="orders@client.com"
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+91 22 2490 1234"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Address / Plant Destination
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chakan Phase 2, Pune"
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-accent"
                  style={{ background: '#059669' }}
                >
                  {editingCustomer ? '✓ Update Customer' : '✓ Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------ */}
      {/* HISTORY & AUDIT MODAL                                                    */}
      {/* ------------------------------------------------------------------------ */}
      {historyTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '750px',
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#fafbfc',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#eef2ff',
                    color: '#4338ca',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <History size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                    {historyTarget.type === 'product'
                      ? 'Product Movement & Inward History'
                      : 'Supplier Delivery & Order History'}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        fontSize: '12px',
                        color: historyTarget.type === 'product' ? '#0369a1' : '#2563eb',
                      }}
                    >
                      {historyTarget.code}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                      {historyTarget.name}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setHistoryTarget(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  color: '#64748b',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Extra details strip */}
            {historyTarget.extra && (
              <div
                style={{
                  padding: '8px 24px',
                  background: '#f8fafc',
                  borderBottom: '1px solid #f1f5f9',
                  fontSize: '12px',
                  color: '#64748b',
                  fontWeight: 500,
                }}
              >
                {historyTarget.extra}
              </div>
            )}

            {/* Modal Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      border: '3px solid #e2e8f0',
                      borderTopColor: '#4338ca',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto 12px auto',
                    }}
                  />
                  <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 600 }}>Loading transaction audit trail...</p>
                </div>
              ) : historyRecords.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '44px 20px',
                    background: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px dashed #cbd5e1',
                  }}
                >
                  <History size={32} color="#94a3b8" style={{ margin: '0 auto 10px auto' }} />
                  <p style={{ margin: '0 0 4px 0', fontWeight: 700, color: '#334155', fontSize: '14px' }}>
                    No Transactions Found Yet
                  </p>
                  <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b', maxWidth: '380px', marginInline: 'auto' }}>
                    {historyTarget.type === 'product'
                      ? 'No inward consignments, QC inspections, or purchase orders have been logged for this product SKU yet.'
                      : 'No purchase orders or dock deliveries have been issued for this vendor yet.'}
                  </p>
                </div>
              ) : (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569', fontSize: '11.5px' }}>TYPE</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569', fontSize: '11.5px' }}>REF / DOC #</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569', fontSize: '11.5px' }}>QTY / VALUATION</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569', fontSize: '11.5px' }}>DATE</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569', fontSize: '11.5px' }}>STATUS</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569', fontSize: '11.5px' }}>REMARKS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyRecords.map((rec, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                background: rec.type?.includes('GRN') ? '#e0f2fe' : '#fef3c7',
                                color: rec.type?.includes('GRN') ? '#0369a1' : '#b45309',
                                fontWeight: 700,
                              }}
                            >
                              {rec.type}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#2563eb' }}>
                            {rec.refNumber}
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: '#059669' }}>
                            {rec.qty}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>
                            {rec.date}
                          </td>
                          <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '999px',
                                background:
                                  rec.status === 'Passed' || rec.status === 'COMPLETED' || rec.status === 'APPROVED'
                                    ? '#dcfce7'
                                    : rec.status === 'Rejected'
                                    ? '#fee2e2'
                                    : '#fef3c7',
                                color:
                                  rec.status === 'Passed' || rec.status === 'COMPLETED' || rec.status === 'APPROVED'
                                    ? '#15803d'
                                    : rec.status === 'Rejected'
                                    ? '#b91c1c'
                                    : '#b45309',
                              }}
                            >
                              ● {rec.status || 'Logged'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', color: '#475569', fontSize: '12px' }}>
                            {rec.remarks}
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
                padding: '14px 24px',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'flex-end',
                background: '#fafbfc',
              }}
            >
              <button
                type="button"
                onClick={() => setHistoryTarget(null)}
                className="btn-accent"
                style={{ padding: '8px 18px', fontSize: '13px' }}
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
