'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GRNOrder, GRNItem, Vendor, ProductionIssue, MasterCatalogItem } from '@/types/inventory';
import { NavItemKey } from '@/components/layout/AppSidebar';
import { useAuth } from '@/context/AuthContext';
import {
  Warehouse,
  Factory,
  AlertTriangle,
  ShieldAlert,
  Calendar,
  RefreshCw,
  Search,
  ArrowRight,
  Clock,
  Plus,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface StoreProductionRejectionDashboardProps {
  orders: GRNOrder[];
  items: GRNItem[];
  vendors: Vendor[];
  onNavigate?: (tab: NavItemKey) => void;
  onOpenCreateGrn?: () => void;
}

export type FilterPeriod = 'day' | 'month' | 'all';
export type ActivePillar = 'store' | 'production' | 'process-reject' | 'supplier-reject';

export interface StoreStockItemRow {
  itemCode: string;
  itemName: string;
  category: string;
  storeLocation: string;
  uom: string;
  inwardAccepted: number;
  issuedToLine: number;
  currentStoreStock: number;
  minSafetyStock: number;
  unitPrice: number;
  totalValuation: number;
  stockHealth: 'Normal' | 'Low Stock' | 'Critical';
}

export interface ProductionLineItemRow {
  id: string;
  voucherNumber: string;
  jobCardNumber: string;
  station: string;
  itemCode: string;
  itemName: string;
  quantityOnLine: number;
  uom: string;
  issueDate: string;
  responsiblePerson: string;
  productionOfficer?: string;
  status: string;
}

export interface ProcessRejectionRow {
  id: string;
  jobCardNumber: string;
  voucherNumber: string;
  station: string;
  itemCode: string;
  itemName: string;
  rejectedQty: number;
  uom: string;
  reason: string;
  reportedBy: string;
  reportedAt: string;
}

export interface SupplierRejectionRow {
  id: string;
  referenceDoc: string;
  source: 'QC Dock Inward' | 'Shopfloor Raw Material Defect';
  vendorName: string;
  itemCode: string;
  itemName: string;
  rejectedQty: number;
  uom: string;
  reason: string;
  inspectedBy: string;
  date: string;
}

export const StoreProductionRejectionDashboard: React.FC<StoreProductionRejectionDashboardProps> = ({
  orders,
  items,
  vendors: _vendors,
  onNavigate,
  onOpenCreateGrn,
}) => {
  const { role } = useAuth();

  // 1. Live Auxiliary Data States
  const [productionIssues, setProductionIssues] = useState<ProductionIssue[]>([]);
  const [catalogItems, setCatalogItems] = useState<MasterCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  // 2. Date Filter States
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const currentMonthStr = useMemo(() => todayStr.slice(0, 7), [todayStr]);

  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('month');
  const [selectedDay, setSelectedDay] = useState<string>(todayStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activePillar, setActivePillar] = useState<ActivePillar>('store');

  // Fetch production issues & catalog items
  const fetchAuxiliaryData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch('/api/production', { cache: 'no-store' }).catch(() => null),
        fetch('/api/catalog', { cache: 'no-store' }).catch(() => null),
      ]);

      if (prodRes && prodRes.ok) {
        const prodData = await prodRes.json();
        if (prodData.issues && Array.isArray(prodData.issues)) {
          setProductionIssues(prodData.issues);
        }
      }

      if (catRes && catRes.ok) {
        const catData = await catRes.json();
        if (catData.items && Array.isArray(catData.items)) {
          setCatalogItems(catData.items);
        }
      }
      setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.error('Failed to sync stock & rejection monitor:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuxiliaryData();
  }, [fetchAuxiliaryData]);

  // Date Filtering Helper
  const matchesDateFilter = useCallback(
    (dateStr?: string | null): boolean => {
      if (!dateStr) return filterPeriod === 'all';
      if (filterPeriod === 'all') return true;

      const datePart = dateStr.slice(0, 10);
      if (filterPeriod === 'day') {
        return datePart === selectedDay;
      }
      if (filterPeriod === 'month') {
        return datePart.slice(0, 7) === selectedMonth;
      }
      return true;
    },
    [filterPeriod, selectedDay, selectedMonth]
  );

  // GRN Orders lookup map
  const orderMap = useMemo(() => {
    const map = new Map<string, GRNOrder>();
    orders.forEach((o) => map.set(o.grnNumber.toUpperCase(), o));
    return map;
  }, [orders]);

  // Catalog item lookup map
  const catalogMap = useMemo(() => {
    const map = new Map<string, MasterCatalogItem>();
    catalogItems.forEach((c) => map.set(c.itemCode.toUpperCase(), c));
    return map;
  }, [catalogItems]);

  // =========================================================================
  // PILLAR 1: STORE LOCATION STOCK
  // =========================================================================
  const storeStockRows: StoreStockItemRow[] = useMemo(() => {
    const skuSet = new Set<string>();
    catalogItems.forEach((c) => skuSet.add(c.itemCode.toUpperCase()));
    items.forEach((it) => skuSet.add(it.itemCode.toUpperCase()));
    productionIssues.forEach((p) => skuSet.add(p.itemCode.toUpperCase()));

    // Only track real SKUs from registered products, inward items, or production issues
    if (skuSet.size === 0) {
      return [];
    }

    const rows: StoreStockItemRow[] = [];

    skuSet.forEach((upperCode) => {
      const catMeta = catalogMap.get(upperCode);
      const matchingItems = items.filter((it) => it.itemCode.toUpperCase() === upperCode);
      const matchingIssues = productionIssues.filter((iss) => iss.itemCode.toUpperCase() === upperCode);

      const filteredAcceptedItems = matchingItems.filter(
        (it) =>
          it.qcStatus === 'Passed' &&
          matchesDateFilter(it.inspectedAt || orderMap.get(it.grnNumber?.toUpperCase() || '')?.receivedDate)
      );
      const periodAcceptedQty = filteredAcceptedItems.reduce(
        (sum, it) => sum + (Number(it.acceptedQty) || Number(it.receivedQty) || 0),
        0
      );

      const totalAcceptedAllTime = matchingItems
        .filter((it) => it.qcStatus === 'Passed')
        .reduce((sum, it) => sum + (Number(it.acceptedQty) || Number(it.receivedQty) || 0), 0);

      const filteredIssues = matchingIssues.filter(
        (iss) => iss.status !== 'RETURNED' && matchesDateFilter(iss.issueDate)
      );
      const periodIssuedQty = filteredIssues.reduce(
        (sum, iss) => sum + (Number(iss.quantityIssued) || 0),
        0
      );

      const totalIssuedAllTime = matchingIssues
        .filter((iss) => iss.status !== 'RETURNED')
        .reduce((sum, iss) => sum + (Number(iss.quantityIssued) || 0), 0);

      // Only show items in Store Location Stock if actual material has arrived at the dock or been issued
      if (totalAcceptedAllTime === 0 && totalIssuedAllTime === 0 && matchingItems.length === 0) {
        return;
      }

      let storeLocation = 'Central Store - Bay A1';
      if (matchingItems.length > 0) {
        const latestOrder = orderMap.get(matchingItems[0].grnNumber?.toUpperCase() || '');
        if (latestOrder?.warehouse) {
          storeLocation = latestOrder.warehouse;
        }
      }
      if (catMeta?.category === 'Fasteners') storeLocation = 'Hardware Store - Bin B4';
      if (catMeta?.category === 'Raw Material') storeLocation = 'Raw Yard - Bay C2';

      // Real balance from accepted inward minus shopfloor issued
      const currentStock = Math.max(0, totalAcceptedAllTime - totalIssuedAllTime);
      const minSafety = catMeta?.minStock ?? 50;

      let stockHealth: 'Normal' | 'Low Stock' | 'Critical' = 'Normal';
      if (currentStock === 0) {
        stockHealth = 'Critical';
      } else if (currentStock <= minSafety * 0.4) {
        stockHealth = 'Critical';
      } else if (currentStock <= minSafety) {
        stockHealth = 'Low Stock';
      }

      const unitPrice = Number(catMeta?.defaultPrice) || (matchingItems[0] ? Number(matchingItems[0].unitPrice) : 0) || 0;
      const totalValuation = currentStock * unitPrice;
      const itemName = catMeta?.itemName || matchingItems[0]?.description || upperCode;
      const uom = catMeta?.uom || matchingItems[0]?.unit || 'PCS';
      const category = catMeta?.category || matchingItems[0]?.category || 'Store Stock';

      rows.push({
        itemCode: upperCode,
        itemName,
        category,
        storeLocation,
        uom,
        inwardAccepted: filterPeriod === 'all' ? totalAcceptedAllTime : periodAcceptedQty,
        issuedToLine: filterPeriod === 'all' ? totalIssuedAllTime : periodIssuedQty,
        currentStoreStock: currentStock,
        minSafetyStock: minSafety,
        unitPrice,
        totalValuation,
        stockHealth,
      });
    });

    return rows.sort((a, b) => b.totalValuation - a.totalValuation);
  }, [catalogItems, items, productionIssues, catalogMap, orderMap, matchesDateFilter, filterPeriod]);

  // =========================================================================
  // PILLAR 2: PRODUCTION LINE STOCK (WIP)
  // =========================================================================
  const productionLineRows: ProductionLineItemRow[] = useMemo(() => {
    return productionIssues
      .filter((iss) => {
        const isPeriodMatch = matchesDateFilter(iss.issueDate);
        if (filterPeriod === 'all') {
          return iss.status === 'PENDING_RECEIPT' || iss.status === 'ISSUED' || iss.status === 'IN_PROCESS';
        }
        return isPeriodMatch;
      })
      .map((iss) => ({
        id: iss.id,
        voucherNumber: iss.voucherNumber,
        jobCardNumber: iss.jobCardNumber,
        station: iss.station || 'CNC Machining Line 1',
        itemCode: iss.itemCode,
        itemName: iss.itemName,
        quantityOnLine: Number(iss.quantityIssued) || 0,
        uom: iss.uom || 'PCS',
        issueDate: iss.issueDate,
        responsiblePerson: iss.responsiblePerson || 'Operator',
        productionOfficer: iss.productionOfficer,
        status: iss.status,
      }))
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
  }, [productionIssues, matchesDateFilter, filterPeriod]);

  // =========================================================================
  // PILLAR 3: PROCESS REJECTION (INTERNAL SCRAP)
  // =========================================================================
  const processRejectionRows: ProcessRejectionRow[] = useMemo(() => {
    const list: ProcessRejectionRow[] = [];

    productionIssues.forEach((iss) => {
      const failedQty = Number(iss.report?.failedProcessingQty) || 0;
      if (failedQty > 0) {
        const reportDate = iss.report?.reportedAt || iss.issueDate;
        if (matchesDateFilter(reportDate)) {
          list.push({
            id: `rej-proc-${iss.id}`,
            jobCardNumber: iss.jobCardNumber,
            voucherNumber: iss.voucherNumber,
            station: iss.station || 'CNC Machining Line 1',
            itemCode: iss.itemCode,
            itemName: iss.itemName,
            rejectedQty: failedQty,
            uom: iss.uom || 'PCS',
            reason: iss.report?.remarks || 'Machining tolerance defect / tool wear',
            reportedBy: iss.report?.reportedBy || iss.responsiblePerson || 'Production Officer',
            reportedAt: reportDate,
          });
        }
      }
    });

    return list.sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
  }, [productionIssues, matchesDateFilter]);

  // =========================================================================
  // PILLAR 4: SUPPLIER REJECTION (VENDOR DEFECT)
  // =========================================================================
  const supplierRejectionRows: SupplierRejectionRow[] = useMemo(() => {
    const list: SupplierRejectionRow[] = [];

    // Dock QC Rejections
    items.forEach((it) => {
      const rejQty = Number(it.rejectedQty) || 0;
      const isFailedQc = it.qcStatus === 'Failed' || rejQty > 0;
      if (isFailedQc) {
        const docDate = it.inspectedAt || orderMap.get(it.grnNumber?.toUpperCase() || '')?.receivedDate;
        if (matchesDateFilter(docDate)) {
          const matchedOrder = orderMap.get(it.grnNumber?.toUpperCase() || '');
          list.push({
            id: `supp-dock-${it.id}`,
            referenceDoc: it.grnNumber || 'GRN-DOCK',
            source: 'QC Dock Inward',
            vendorName: matchedOrder?.vendorName || 'Consignment Supplier',
            itemCode: it.itemCode,
            itemName: it.description || it.itemCode,
            rejectedQty: rejQty > 0 ? rejQty : Number(it.receivedQty) || 1,
            uom: it.unit || 'PCS',
            reason: it.rejectionReason || it.qcRemarks || 'Dimensional variation & visual surface flaw',
            inspectedBy: it.inspectedBy || matchedOrder?.inspector || 'QC Inspector',
            date: docDate || todayStr,
          });
        }
      }
    });

    // Shopfloor Supplier Raw Material Defects
    productionIssues.forEach((iss) => {
      const suppDefect = Number(iss.report?.supplierFailedQty) || 0;
      if (suppDefect > 0) {
        const reportDate = iss.report?.reportedAt || iss.issueDate;
        if (matchesDateFilter(reportDate)) {
          list.push({
            id: `supp-floor-${iss.id}`,
            referenceDoc: `${iss.voucherNumber} (${iss.jobCardNumber})`,
            source: 'Shopfloor Raw Material Defect',
            vendorName: 'Supplier (Segregated on Line)',
            itemCode: iss.itemCode,
            itemName: iss.itemName,
            rejectedQty: suppDefect,
            uom: iss.uom || 'PCS',
            reason: iss.report?.remarks || 'Raw material internal porosity / hardness defect',
            inspectedBy: iss.report?.reportedBy || iss.responsiblePerson || 'Production Lead',
            date: reportDate,
          });
        }
      }
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [items, productionIssues, orderMap, matchesDateFilter, todayStr]);

  // Aggregate Numbers
  const totalStoreStockUnits = useMemo(
    () => storeStockRows.reduce((sum, r) => sum + r.currentStoreStock, 0),
    [storeStockRows]
  );
  const totalStoreStockValuation = useMemo(
    () => storeStockRows.reduce((sum, r) => sum + r.totalValuation, 0),
    [storeStockRows]
  );
  const totalLineStockUnits = useMemo(
    () => productionLineRows.reduce((sum, r) => sum + r.quantityOnLine, 0),
    [productionLineRows]
  );
  const totalProcessRejectionUnits = useMemo(
    () => processRejectionRows.reduce((sum, r) => sum + r.rejectedQty, 0),
    [processRejectionRows]
  );
  const totalSupplierRejectionUnits = useMemo(
    () => supplierRejectionRows.reduce((sum, r) => sum + r.rejectedQty, 0),
    [supplierRejectionRows]
  );

  const processScrapRate = useMemo(() => {
    const totalIssued = totalLineStockUnits + totalProcessRejectionUnits;
    if (totalIssued <= 0) return '0.0';
    return ((totalProcessRejectionUnits / totalIssued) * 100).toFixed(1);
  }, [totalLineStockUnits, totalProcessRejectionUnits]);

  const supplierRejectRate = useMemo(() => {
    const totalInward = storeStockRows.reduce((sum, r) => sum + r.inwardAccepted, 0) + totalSupplierRejectionUnits;
    if (totalInward <= 0) return '0.0';
    return ((totalSupplierRejectionUnits / totalInward) * 100).toFixed(1);
  }, [storeStockRows, totalSupplierRejectionUnits]);

  // Filtered rows by search
  const filteredStoreRows = useMemo(
    () =>
      storeStockRows.filter(
        (r) =>
          r.itemCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.storeLocation.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [storeStockRows, searchQuery]
  );

  const filteredLineRows = useMemo(
    () =>
      productionLineRows.filter(
        (r) =>
          r.itemCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.station.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.jobCardNumber.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [productionLineRows, searchQuery]
  );

  const filteredProcessRows = useMemo(
    () =>
      processRejectionRows.filter(
        (r) =>
          r.itemCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.station.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.jobCardNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.reason.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [processRejectionRows, searchQuery]
  );

  const filteredSupplierRows = useMemo(
    () =>
      supplierRejectionRows.filter(
        (r) =>
          r.itemCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.referenceDoc.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.reason.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [supplierRejectionRows, searchQuery]
  );

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
      {/* =====================================================================
          APPLE-GRADE AURORA HERO HEADER
          ===================================================================== */}
      <div
        style={{
          position: 'relative',
          background: 'linear-gradient(180deg, #ffffff 0%, #fbfbfd 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(0, 0, 0, 0.06)',
          padding: '20px 24px',
          marginBottom: '20px',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.03)',
          overflow: 'hidden',
        }}
      >
        {/* Soft Aurora Glow Backdrop */}
        <div
          style={{
            position: 'absolute',
            top: '-50%',
            left: '30%',
            width: '40%',
            height: '200%',
            background: 'radial-gradient(ellipse at center, rgba(37, 99, 235, 0.04) 0%, rgba(255, 255, 255, 0) 70%)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#059669',
                  background: '#ecfdf5',
                  padding: '2px 8px',
                  borderRadius: '20px',
                  letterSpacing: '0.02em',
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                Factory Live Engine
              </span>
              {lastRefreshed && (
                <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                  Updated {lastRefreshed}
                </span>
              )}
            </div>

            <h1
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#1d1d1f',
                letterSpacing: '-0.025em',
                margin: '6px 0 2px 0',
              }}
            >
              Plant Material Intelligence & Quality Monitor
            </h1>
            <p style={{ fontSize: '13px', color: '#86868b', margin: 0, fontWeight: 400 }}>
              Live Store Stock · Production Lines · In-Process Rejections · Supplier Defect Quarantine
            </p>
          </div>

          {/* Action & Sync Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={fetchAuxiliaryData}
              disabled={isLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '980px',
                background: '#ffffff',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                color: '#1d1d1f',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              }}
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} color="#64748b" />
              <span>{isLoading ? 'Syncing...' : 'Sync'}</span>
            </button>

            {onOpenCreateGrn && (
              <button
                onClick={onOpenCreateGrn}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 16px',
                  borderRadius: '980px',
                  background: '#0071e3',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                  boxShadow: '0 2px 8px rgba(0, 113, 227, 0.25)',
                }}
              >
                <Plus size={14} />
                <span>Inward Dock GRN</span>
              </button>
            )}
          </div>
        </div>

        {/* =====================================================================
            MINIMALIST APPLE-STYLE SEGMENTED TIME FILTER
            ===================================================================== */}
        <div
          style={{
            position: 'relative',
            marginTop: '16px',
            paddingTop: '14px',
            borderTop: '1px solid rgba(0, 0, 0, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* Segmented Control */}
          <div
            style={{
              display: 'inline-flex',
              background: '#f1f5f9',
              padding: '3px',
              borderRadius: '980px',
              border: '1px solid rgba(0,0,0,0.04)',
            }}
          >
            <button
              onClick={() => setFilterPeriod('day')}
              style={{
                padding: '5px 14px',
                fontSize: '12px',
                fontWeight: filterPeriod === 'day' ? 700 : 500,
                borderRadius: '980px',
                border: 'none',
                background: filterPeriod === 'day' ? '#ffffff' : 'transparent',
                color: filterPeriod === 'day' ? '#1d1d1f' : '#64748b',
                boxShadow: filterPeriod === 'day' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Day Wise
            </button>
            <button
              onClick={() => setFilterPeriod('month')}
              style={{
                padding: '5px 14px',
                fontSize: '12px',
                fontWeight: filterPeriod === 'month' ? 700 : 500,
                borderRadius: '980px',
                border: 'none',
                background: filterPeriod === 'month' ? '#ffffff' : 'transparent',
                color: filterPeriod === 'month' ? '#1d1d1f' : '#64748b',
                boxShadow: filterPeriod === 'month' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Month Wise
            </button>
            <button
              onClick={() => setFilterPeriod('all')}
              style={{
                padding: '5px 14px',
                fontSize: '12px',
                fontWeight: filterPeriod === 'all' ? 700 : 500,
                borderRadius: '980px',
                border: 'none',
                background: filterPeriod === 'all' ? '#ffffff' : 'transparent',
                color: filterPeriod === 'all' ? '#1d1d1f' : '#64748b',
                boxShadow: filterPeriod === 'all' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              All Time
            </button>
          </div>

          {/* Time Picker Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {filterPeriod === 'day' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} color="#64748b" />
                <input
                  type="date"
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: 500,
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    color: '#1d1d1f',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={() => setSelectedDay(todayStr)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  Today
                </button>
              </div>
            )}

            {filterPeriod === 'month' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} color="#64748b" />
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: 500,
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    color: '#1d1d1f',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={() => setSelectedMonth(currentMonthStr)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  This Month
                </button>
              </div>
            )}

            {filterPeriod === 'all' && (
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                Showing all lifetime records
              </span>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================================
          4 MINIMALIST APPLE-STYLE CARDS
          Clicking any card smoothly activates the corresponding data table!
          ===================================================================== */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        {/* CARD 1: STORE STOCK */}
        <div
          onClick={() => setActivePillar('store')}
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: activePillar === 'store' ? '2px solid #0071e3' : '1px solid rgba(0, 0, 0, 0.06)',
            padding: '18px 20px',
            boxShadow: activePillar === 'store' ? '0 8px 24px rgba(0, 113, 227, 0.08)' : '0 2px 8px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#86868b', margin: 0 }}>
                Store Location Stock
              </p>
              <h3 style={{ fontSize: '26px', fontWeight: 700, color: '#1d1d1f', margin: '4px 0 2px 0', letterSpacing: '-0.03em' }}>
                {totalStoreStockUnits.toLocaleString()}
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#86868b', marginLeft: '4px' }}>units</span>
              </h3>
            </div>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#f0f7ff',
                color: '#0071e3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Warehouse size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '12px', color: '#86868b' }}>
            <span>{storeStockRows.length} SKUs across Bays</span>
            <span style={{ fontWeight: 600, color: '#1d1d1f' }}>
              ₹{totalStoreStockValuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        {/* CARD 2: LINE WIP */}
        <div
          onClick={() => setActivePillar('production')}
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: activePillar === 'production' ? '2px solid #6366f1' : '1px solid rgba(0, 0, 0, 0.06)',
            padding: '18px 20px',
            boxShadow: activePillar === 'production' ? '0 8px 24px rgba(99, 102, 241, 0.08)' : '0 2px 8px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#86868b', margin: 0 }}>
                Production Line Stock
              </p>
              <h3 style={{ fontSize: '26px', fontWeight: 700, color: '#1d1d1f', margin: '4px 0 2px 0', letterSpacing: '-0.03em' }}>
                {totalLineStockUnits.toLocaleString()}
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#86868b', marginLeft: '4px' }}>WIP</span>
              </h3>
            </div>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#f5f3ff',
                color: '#6366f1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Factory size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '12px', color: '#86868b' }}>
            <span>{productionLineRows.length} Active Vouchers</span>
            <span style={{ fontWeight: 600, color: '#6366f1' }}>On Shopfloor</span>
          </div>
        </div>

        {/* CARD 3: PROCESS REJECTION */}
        <div
          onClick={() => setActivePillar('process-reject')}
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: activePillar === 'process-reject' ? '2px solid #f59e0b' : '1px solid rgba(0, 0, 0, 0.06)',
            padding: '18px 20px',
            boxShadow: activePillar === 'process-reject' ? '0 8px 24px rgba(245, 158, 11, 0.08)' : '0 2px 8px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#86868b', margin: 0 }}>
                Process Rejection
              </p>
              <h3 style={{ fontSize: '26px', fontWeight: 700, color: totalProcessRejectionUnits > 0 ? '#d97706' : '#1d1d1f', margin: '4px 0 2px 0', letterSpacing: '-0.03em' }}>
                {totalProcessRejectionUnits.toLocaleString()}
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#86868b', marginLeft: '4px' }}>scrap</span>
              </h3>
            </div>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#fffbeb',
                color: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '12px', color: '#86868b' }}>
            <span>Internal Machining</span>
            <span style={{ fontWeight: 600, color: '#d97706' }}>Scrap Rate: {processScrapRate}%</span>
          </div>
        </div>

        {/* CARD 4: SUPPLIER REJECTION */}
        <div
          onClick={() => setActivePillar('supplier-reject')}
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: activePillar === 'supplier-reject' ? '2px solid #ef4444' : '1px solid rgba(0, 0, 0, 0.06)',
            padding: '18px 20px',
            boxShadow: activePillar === 'supplier-reject' ? '0 8px 24px rgba(239, 68, 68, 0.08)' : '0 2px 8px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#86868b', margin: 0 }}>
                Supplier Rejection
              </p>
              <h3 style={{ fontSize: '26px', fontWeight: 700, color: totalSupplierRejectionUnits > 0 ? '#dc2626' : '#1d1d1f', margin: '4px 0 2px 0', letterSpacing: '-0.03em' }}>
                {totalSupplierRejectionUnits.toLocaleString()}
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#86868b', marginLeft: '4px' }}>defective</span>
              </h3>
            </div>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#fef2f2',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldAlert size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '12px', color: '#86868b' }}>
            <span>Dock QC + Floor RMA</span>
            <span style={{ fontWeight: 600, color: '#dc2626' }}>Defect Rate: {supplierRejectRate}%</span>
          </div>
        </div>
      </div>

      {/* =====================================================================
          DETAILED DRILLDOWN SECTION - PURE MINIMALIST TABLE
          ===================================================================== */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid rgba(0, 0, 0, 0.06)',
          padding: '20px 24px',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.02)',
        }}
      >
        {/* Sub-Header & Search */}
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
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#1d1d1f', margin: 0 }}>
              {activePillar === 'store' && `Store Location Stock (${filteredStoreRows.length} items)`}
              {activePillar === 'production' && `Active Production Line Stock (${filteredLineRows.length} issues)`}
              {activePillar === 'process-reject' && `Process Scrap Log (${filteredProcessRows.length} events)`}
              {activePillar === 'supplier-reject' && `Supplier Defect Registry (${filteredSupplierRows.length} events)`}
            </h2>
            <p style={{ fontSize: '12px', color: '#86868b', margin: '2px 0 0 0' }}>
              {activePillar === 'store' && 'Real-time inventory available in factory stores & warehouses.'}
              {activePillar === 'production' && 'Material currently allocated and being processed on workstations.'}
              {activePillar === 'process-reject' && 'Defects caused by internal machining or manufacturing operations.'}
              {activePillar === 'supplier-reject' && 'Vendor defects rejected at dock QC inspection or on shopfloor.'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Minimalist Search */}
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search SKU, Line, Vendor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px 6px 30px',
                  fontSize: '12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: '#fbfbfd',
                  outline: 'none',
                }}
              />
            </div>

            {activePillar === 'store' && role === 'ADMIN' && onNavigate && (
              <button
                onClick={() => onNavigate('production-issue')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: '#f5f3ff',
                  border: '1px solid #e0e7ff',
                  color: '#4f46e5',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>Issue to Line</span>
                <ArrowRight size={12} />
              </button>
            )}
          </div>
        </div>

        {/* PILLAR 1 TABLE: STORE STOCK */}
        {activePillar === 'store' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <th style={{ textAlign: 'left', padding: '10px 8px', color: '#86868b', fontWeight: 600 }}>SKU & Description</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px', color: '#86868b', fontWeight: 600 }}>Store Location</th>
                  <th style={{ textAlign: 'right', padding: '10px 8px', color: '#059669', fontWeight: 600 }}>Inward Qty</th>
                  <th style={{ textAlign: 'right', padding: '10px 8px', color: '#6366f1', fontWeight: 600 }}>Issued to Line</th>
                  <th style={{ textAlign: 'right', padding: '10px 8px', color: '#0071e3', fontWeight: 600 }}>Available Stock</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px', color: '#86868b', fontWeight: 600 }}>Health</th>
                  <th style={{ textAlign: 'right', padding: '10px 8px', color: '#1d1d1f', fontWeight: 600 }}>Valuation</th>
                </tr>
              </thead>
              <tbody>
                {filteredStoreRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                      No store stock items found.
                    </td>
                  </tr>
                ) : (
                  filteredStoreRows.map((row) => (
                    <tr key={row.itemCode} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '11px 8px' }}>
                        <div style={{ fontWeight: 600, color: '#1d1d1f', fontFamily: 'var(--font-mono)' }}>
                          {row.itemCode}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#86868b' }}>{row.itemName}</div>
                      </td>
                      <td style={{ padding: '11px 8px' }}>
                        <span style={{ fontSize: '11.5px', color: '#475569', background: '#f8fafc', padding: '3px 8px', borderRadius: '6px' }}>
                          {row.storeLocation}
                        </span>
                      </td>
                      <td style={{ padding: '11px 8px', textAlign: 'right', fontWeight: 600, color: '#059669' }}>
                        {row.inwardAccepted} {row.uom}
                      </td>
                      <td style={{ padding: '11px 8px', textAlign: 'right', fontWeight: 600, color: '#6366f1' }}>
                        {row.issuedToLine} {row.uom}
                      </td>
                      <td style={{ padding: '11px 8px', textAlign: 'right' }}>
                        <span
                          style={{
                            background: '#eff6ff',
                            color: '#0071e3',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontWeight: 700,
                          }}
                        >
                          {row.currentStoreStock} {row.uom}
                        </span>
                      </td>
                      <td style={{ padding: '11px 8px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: 600,
                            background:
                              row.stockHealth === 'Normal'
                                ? '#ecfdf5'
                                : row.stockHealth === 'Low Stock'
                                ? '#fffbeb'
                                : '#fef2f2',
                            color:
                              row.stockHealth === 'Normal'
                                ? '#059669'
                                : row.stockHealth === 'Low Stock'
                                ? '#d97706'
                                : '#dc2626',
                          }}
                        >
                          {row.stockHealth}
                        </span>
                      </td>
                      <td style={{ padding: '11px 8px', textAlign: 'right', fontWeight: 600, color: '#1d1d1f' }}>
                        ₹{row.totalValuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* PILLAR 2 TABLE: LINE STOCK (WIP) */}
        {activePillar === 'production' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <th style={{ textAlign: 'left', padding: '10px 8px', color: '#86868b', fontWeight: 600 }}>Workstation / Line</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px', color: '#86868b', fontWeight: 600 }}>Job Card & Voucher</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px', color: '#86868b', fontWeight: 600 }}>SKU & Description</th>
                  <th style={{ textAlign: 'right', padding: '10px 8px', color: '#6366f1', fontWeight: 600 }}>Qty on Line</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px', color: '#86868b', fontWeight: 600 }}>Issued Time</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px', color: '#86868b', fontWeight: 600 }}>In-Charge</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px', color: '#86868b', fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLineRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                      No active line stock issues found for this period.
                    </td>
                  </tr>
                ) : (
                  filteredLineRows.map((row) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '11px 8px', fontWeight: 600, color: '#1d1d1f' }}>
                        {row.station}
                      </td>
                      <td style={{ padding: '11px 8px' }}>
                        <div style={{ fontWeight: 600, color: '#0071e3', fontFamily: 'var(--font-mono)' }}>
                          {row.jobCardNumber}
                        </div>
                        <div style={{ fontSize: '11px', color: '#86868b' }}>{row.voucherNumber}</div>
                      </td>
                      <td style={{ padding: '11px 8px' }}>
                        <div style={{ fontWeight: 600, color: '#1d1d1f', fontFamily: 'var(--font-mono)' }}>
                          {row.itemCode}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#86868b' }}>{row.itemName}</div>
                      </td>
                      <td style={{ padding: '11px 8px', textAlign: 'right' }}>
                        <span style={{ background: '#f5f3ff', color: '#6366f1', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                          {row.quantityOnLine} {row.uom}
                        </span>
                      </td>
                      <td style={{ padding: '11px 8px', color: '#64748b' }}>
                        {new Date(row.issueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </td>
                      <td style={{ padding: '11px 8px', color: '#334155' }}>
                        {row.productionOfficer || row.responsiblePerson}
                      </td>
                      <td style={{ padding: '11px 8px', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: 600,
                            background: row.status === 'COMPLETED' ? '#ecfdf5' : '#f5f3ff',
                            color: row.status === 'COMPLETED' ? '#059669' : '#6366f1',
                          }}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* PILLAR 3 TABLE: PROCESS REJECTION */}
        {activePillar === 'process-reject' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <th style={{ textAlign: 'left', padding: '10px 8px', color: '#86868b', fontWeight: 600 }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px', color: '#86868b', fontWeight: 600 }}>Line & Job Card</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px', color: '#86868b', fontWeight: 600 }}>SKU & Description</th>
                  <th style={{ textAlign: 'right', padding: '10px 8px', color: '#d97706', fontWeight: 600 }}>Scrapped Qty</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px', color: '#86868b', fontWeight: 600 }}>Root Cause Remarks</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px', color: '#86868b', fontWeight: 600 }}>Reported By</th>
                </tr>
              </thead>
              <tbody>
                {filteredProcessRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                      No internal process scrap recorded in this timeframe. Excellent operation!
                    </td>
                  </tr>
                ) : (
                  filteredProcessRows.map((row) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '11px 8px', color: '#64748b' }}>
                        {row.reportedAt.slice(0, 10)}
                      </td>
                      <td style={{ padding: '11px 8px' }}>
                        <div style={{ fontWeight: 600, color: '#1d1d1f' }}>{row.jobCardNumber}</div>
                        <div style={{ fontSize: '11px', color: '#86868b' }}>{row.station}</div>
                      </td>
                      <td style={{ padding: '11px 8px' }}>
                        <div style={{ fontWeight: 600, color: '#1d1d1f', fontFamily: 'var(--font-mono)' }}>
                          {row.itemCode}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#86868b' }}>{row.itemName}</div>
                      </td>
                      <td style={{ padding: '11px 8px', textAlign: 'right' }}>
                        <span style={{ background: '#fffbeb', color: '#d97706', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                          {row.rejectedQty} {row.uom}
                        </span>
                      </td>
                      <td style={{ padding: '11px 8px', color: '#b45309', fontWeight: 500 }}>
                        {row.reason}
                      </td>
                      <td style={{ padding: '11px 8px', color: '#334155' }}>
                        {row.reportedBy}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* PILLAR 4 TABLE: SUPPLIER REJECTION */}
        {activePillar === 'supplier-reject' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <th style={{ textAlign: 'left', padding: '10px 8px', color: '#86868b', fontWeight: 600 }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px', color: '#86868b', fontWeight: 600 }}>Supplier</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px', color: '#86868b', fontWeight: 600 }}>Ref Doc & Source</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px', color: '#86868b', fontWeight: 600 }}>SKU & Description</th>
                  <th style={{ textAlign: 'right', padding: '10px 8px', color: '#dc2626', fontWeight: 600 }}>Rejected Qty</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px', color: '#86868b', fontWeight: 600 }}>Defect Reason</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px', color: '#86868b', fontWeight: 600 }}>Inspector / Lead</th>
                </tr>
              </thead>
              <tbody>
                {filteredSupplierRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                      No supplier rejections recorded in this timeframe. Supplier quality meets standards!
                    </td>
                  </tr>
                ) : (
                  filteredSupplierRows.map((row) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '11px 8px', color: '#64748b' }}>
                        {row.date.slice(0, 10)}
                      </td>
                      <td style={{ padding: '11px 8px', fontWeight: 600, color: '#1d1d1f' }}>
                        {row.vendorName}
                      </td>
                      <td style={{ padding: '11px 8px' }}>
                        <div style={{ fontWeight: 600, color: '#0071e3', fontFamily: 'var(--font-mono)' }}>
                          {row.referenceDoc}
                        </div>
                        <div style={{ fontSize: '11px', color: '#86868b' }}>{row.source}</div>
                      </td>
                      <td style={{ padding: '11px 8px' }}>
                        <div style={{ fontWeight: 600, color: '#1d1d1f', fontFamily: 'var(--font-mono)' }}>
                          {row.itemCode}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#86868b' }}>{row.itemName}</div>
                      </td>
                      <td style={{ padding: '11px 8px', textAlign: 'right' }}>
                        <span style={{ background: '#fef2f2', color: '#dc2626', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                          {row.rejectedQty} {row.uom}
                        </span>
                      </td>
                      <td style={{ padding: '11px 8px', color: '#dc2626', fontWeight: 500 }}>
                        {row.reason}
                      </td>
                      <td style={{ padding: '11px 8px', color: '#334155' }}>
                        {row.inspectedBy}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
