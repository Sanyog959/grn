import fs from 'fs';
import path from 'path';
import { getWritableDataFilePath, safeWriteJson } from '@/lib/storage/dataFile';
import {
  GRNOrder,
  GRNItem,
  Vendor,
  GRNInwardBatch,
  ProductionIssue,
  FinishedGoodsStock,
  DispatchRecord,
  StockLedgerEntry,
  PurchaseOrder,
  PurchaseOrderItem,
  MasterCatalogItem,
} from '@/types/inventory';

const VENDORS_FILE = getWritableDataFilePath('vendors.json');
const ORDERS_FILE = getWritableDataFilePath('orders.json');
const ITEMS_FILE = getWritableDataFilePath('items.json');
const PURCHASE_ORDERS_FILE = getWritableDataFilePath('purchase_orders.json');
const STOCK_LEDGER_FILE = getWritableDataFilePath('stock_ledger.json');
const INWARD_BATCHES_FILE = getWritableDataFilePath('inward_batches.json');
const PRODUCTION_ISSUES_FILE = getWritableDataFilePath('production_issues.json');
const FINISHED_GOODS_FILE = getWritableDataFilePath('finished_goods.json');
const DISPATCHES_FILE = getWritableDataFilePath('dispatches.json');
const CATALOG_ITEMS_FILE = getWritableDataFilePath('catalog_items.json');

const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [];
const INITIAL_VENDORS: Vendor[] = [];
const INITIAL_STOCK_LEDGER: StockLedgerEntry[] = [];
const INITIAL_CATALOG_ITEMS: MasterCatalogItem[] = [];

function ensureStoreFiles() {
  if (!fs.existsSync(VENDORS_FILE)) {
    safeWriteJson(VENDORS_FILE, []);
  }
  if (!fs.existsSync(ORDERS_FILE)) {
    safeWriteJson(ORDERS_FILE, []);
  }
  if (!fs.existsSync(ITEMS_FILE)) {
    safeWriteJson(ITEMS_FILE, []);
  }
  if (!fs.existsSync(STOCK_LEDGER_FILE)) {
    safeWriteJson(STOCK_LEDGER_FILE, []);
  }
  if (!fs.existsSync(INWARD_BATCHES_FILE)) {
    safeWriteJson(INWARD_BATCHES_FILE, []);
  }
  if (!fs.existsSync(PRODUCTION_ISSUES_FILE)) {
    safeWriteJson(PRODUCTION_ISSUES_FILE, []);
  }
  if (!fs.existsSync(FINISHED_GOODS_FILE)) {
    safeWriteJson(FINISHED_GOODS_FILE, []);
  }
  if (!fs.existsSync(DISPATCHES_FILE)) {
    safeWriteJson(DISPATCHES_FILE, []);
  }
  if (!fs.existsSync(PURCHASE_ORDERS_FILE)) {
    safeWriteJson(PURCHASE_ORDERS_FILE, []);
  }
  if (!fs.existsSync(CATALOG_ITEMS_FILE)) {
    safeWriteJson(CATALOG_ITEMS_FILE, []);
  }
}

export function getStoredVendors(): Vendor[] {
  ensureStoreFiles();
  try {
    const raw = fs.readFileSync(VENDORS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return INITIAL_VENDORS;
  }
}

export function saveStoredVendors(vendors: Vendor[]) {
  ensureStoreFiles();
  safeWriteJson(VENDORS_FILE, vendors);
}

export function addStoredVendor(vendor: Vendor) {
  const vendors = getStoredVendors();
  const idx = vendors.findIndex((v) => v.vendorCode === vendor.vendorCode);
  if (idx >= 0) {
    vendors[idx] = vendor;
  } else {
    vendors.unshift(vendor);
  }
  saveStoredVendors(vendors);
}

export function updateStoredVendor(vendorCode: string, updates: Partial<Vendor>): Vendor | null {
  const vendors = getStoredVendors();
  const idx = vendors.findIndex((v) => v.vendorCode.toLowerCase() === vendorCode.toLowerCase());
  if (idx < 0) return null;
  vendors[idx] = { ...vendors[idx], ...updates, vendorCode: vendors[idx].vendorCode };
  saveStoredVendors(vendors);
  return vendors[idx];
}

export function deleteStoredVendor(vendorCode: string): boolean {
  const vendors = getStoredVendors();
  const filtered = vendors.filter((v) => v.vendorCode.toLowerCase() !== vendorCode.toLowerCase());
  if (filtered.length === vendors.length) return false;
  saveStoredVendors(filtered);
  return true;
}

// Master Catalog Products / Items Maintenance (Name & Price Management)
export function getStoredCatalogItems(): MasterCatalogItem[] {
  ensureStoreFiles();
  try {
    const raw = fs.readFileSync(CATALOG_ITEMS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredCatalogItems(items: MasterCatalogItem[]) {
  ensureStoreFiles();
  safeWriteJson(CATALOG_ITEMS_FILE, items);
}

export function addOrUpdateStoredCatalogItem(item: MasterCatalogItem): MasterCatalogItem {
  const items = getStoredCatalogItems();
  const idx = items.findIndex((it) => it.itemCode.toLowerCase() === item.itemCode.toLowerCase());
  const now = new Date().toISOString();
  const payload: MasterCatalogItem = {
    ...item,
    id: item.id || `cat-${Date.now()}`,
    itemCode: item.itemCode.trim().toUpperCase(),
    itemName: item.itemName.trim(),
    defaultPrice: Number(item.defaultPrice) || 0,
    updatedAt: now,
  };

  if (idx >= 0) {
    items[idx] = { ...items[idx], ...payload };
  } else {
    items.unshift(payload);
  }
  saveStoredCatalogItems(items);
  return payload;
}

export function deleteStoredCatalogItem(itemCode: string): boolean {
  const items = getStoredCatalogItems();
  const filtered = items.filter((it) => it.itemCode.toLowerCase() !== itemCode.toLowerCase());
  if (filtered.length === items.length) return false;
  saveStoredCatalogItems(filtered);
  return true;
}

export function getStoredOrders(): GRNOrder[] {
  ensureStoreFiles();
  try {
    const raw = fs.readFileSync(ORDERS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredOrders(orders: GRNOrder[]) {
  ensureStoreFiles();
  safeWriteJson(ORDERS_FILE, orders);
}

export function addStoredOrder(order: GRNOrder) {
  const orders = getStoredOrders();
  const idx = orders.findIndex((o) => o.grnNumber === order.grnNumber);
  if (idx >= 0) {
    orders[idx] = order;
  } else {
    orders.unshift(order);
  }
  saveStoredOrders(orders);
}

export function updateStoredOrderStatus(
  grnNumber: string,
  status: 'Approved' | 'Pending QC' | 'Partial' | 'Rejected',
  approvedBy?: string,
  notes?: string
) {
  const orders = getStoredOrders();
  const idx = orders.findIndex((o) => o.grnNumber === grnNumber);
  if (idx >= 0) {
    orders[idx].status = status;
    if (approvedBy) orders[idx].approvedBy = approvedBy;
    if (status === 'Approved') orders[idx].approvedAt = new Date().toISOString();
    if (notes) orders[idx].notes = notes;
    saveStoredOrders(orders);
  }
}

export function getStoredItems(): GRNItem[] {
  ensureStoreFiles();
  try {
    const raw = fs.readFileSync(ITEMS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredItems(items: GRNItem[]) {
  ensureStoreFiles();
  safeWriteJson(ITEMS_FILE, items);
}

export function addStoredItems(newItems: GRNItem[]) {
  const items = getStoredItems();
  const map = new Map<string, GRNItem>();
  newItems.forEach((it) => map.set(it.id, it));
  items.forEach((it) => {
    if (!map.has(it.id)) map.set(it.id, it);
  });
  saveStoredItems(Array.from(map.values()));
}

export function updateStoredItemQc(
  itemId: string,
  qcStatus: 'Passed' | 'Under Review' | 'Failed' | 'HOLD' | 'Remark',
  rejectionReason?: string,
  qcRemarks?: string,
  inspectedBy?: string,
  acceptedQty?: number,
  rejectedQty?: number
) {
  const items = getStoredItems();
  const idx = items.findIndex((it) => it.id === itemId);
  if (idx >= 0) {
    items[idx].qcStatus = qcStatus;
    items[idx].inspectedAt = new Date().toISOString();
    if (inspectedBy) items[idx].inspectedBy = inspectedBy;
    if (qcRemarks) items[idx].qcRemarks = qcRemarks;

    if (qcStatus === 'Passed') {
      items[idx].acceptedQty = acceptedQty !== undefined ? Number(acceptedQty) : items[idx].receivedQty;
      items[idx].rejectedQty = rejectedQty !== undefined ? Number(rejectedQty) : 0;
    } else if (qcStatus === 'Failed') {
      items[idx].acceptedQty = acceptedQty !== undefined ? Number(acceptedQty) : 0;
      items[idx].rejectedQty = rejectedQty !== undefined ? Number(rejectedQty) : items[idx].receivedQty;
    } else {
      if (acceptedQty !== undefined) items[idx].acceptedQty = Number(acceptedQty);
      if (rejectedQty !== undefined) items[idx].rejectedQty = Number(rejectedQty);
    }
    if (rejectionReason) items[idx].rejectionReason = rejectionReason;
    saveStoredItems(items);
  }
}

// ==============================================================================
// STOCK LEDGER & AUDIT TRAIL LOGGING
// ==============================================================================

export function getStoredStockLedger(): StockLedgerEntry[] {
  ensureStoreFiles();
  try {
    const raw = fs.readFileSync(STOCK_LEDGER_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return INITIAL_STOCK_LEDGER;
  }
}

export function saveStoredStockLedger(entries: StockLedgerEntry[]) {
  ensureStoreFiles();
  safeWriteJson(STOCK_LEDGER_FILE, entries);
}

export function getCurrentStockForItem(itemCode: string): number {
  const ledger = getStoredStockLedger();
  const itemEntries = ledger.filter((l) => l.itemCode.toLowerCase() === itemCode.toLowerCase());
  if (itemEntries.length === 0) return 0;
  // Return the latest newStock
  return itemEntries[itemEntries.length - 1].newStock;
}

export function logStockTransaction(params: {
  itemCode: string;
  itemName?: string;
  transactionType: StockLedgerEntry['transactionType'];
  referenceNumber: string;
  changeQty: number;
  location?: string;
  performedBy: string;
  userRole: string;
  remarks: string;
}): StockLedgerEntry {
  const ledger = getStoredStockLedger();
  const prevStock = getCurrentStockForItem(params.itemCode);
  const newStock = prevStock + params.changeQty;

  const newEntry: StockLedgerEntry = {
    id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    itemCode: params.itemCode,
    itemName: params.itemName || 'Inventory Material',
    transactionType: params.transactionType,
    referenceNumber: params.referenceNumber,
    previousStock: prevStock,
    changeQty: params.changeQty,
    newStock: Math.max(0, newStock),
    location: params.location || 'STORE',
    performedBy: params.performedBy,
    userRole: params.userRole,
    remarks: params.remarks,
  };

  ledger.push(newEntry);
  saveStoredStockLedger(ledger);
  return newEntry;
}

// ==============================================================================
// 1. INWARD BATCHES (Partial / Split Delivery Installments: e.g. 30, then 40, then 30)
// ==============================================================================

export function getStoredInwardBatches(): GRNInwardBatch[] {
  ensureStoreFiles();
  try {
    const raw = fs.readFileSync(INWARD_BATCHES_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredInwardBatches(batches: GRNInwardBatch[]) {
  ensureStoreFiles();
  safeWriteJson(INWARD_BATCHES_FILE, batches);
}

export function getInwardBatchesForGrn(grnNumber: string, itemCode?: string): GRNInwardBatch[] {
  const batches = getStoredInwardBatches();
  return batches.filter(
    (b) =>
      b.grnNumber.toLowerCase() === grnNumber.toLowerCase() &&
      (!itemCode || b.itemCode.toLowerCase() === itemCode.toLowerCase())
  );
}

export function addStoredInwardBatch(batch: GRNInwardBatch): {
  batch: GRNInwardBatch;
  updatedItem?: GRNItem;
  updatedOrder?: GRNOrder;
} {
  const batches = getStoredInwardBatches();
  batches.push(batch);
  saveStoredInwardBatches(batches);

  // Update item receivedQty and pendingQty in items.json
  const items = getStoredItems();
  const itemIdx = items.findIndex(
    (it) => it.grnNumber === batch.grnNumber && it.itemCode === batch.itemCode
  );

  let updatedItem: GRNItem | undefined;
  if (itemIdx >= 0) {
    const item = items[itemIdx];
    const ordered = item.orderedQty || item.poQty || batch.orderedQty;
    const newReceived = (item.receivedQty || 0) + Number(batch.receivedQty);
    const newPending = Math.max(0, ordered - newReceived);

    items[itemIdx] = {
      ...item,
      orderedQty: ordered,
      receivedQty: newReceived,
      pendingQty: newPending,
      acceptedQty: item.qcStatus === 'Passed' ? newReceived : item.acceptedQty,
      isScrap: batch.isScrapOrJunk || item.isScrap,
    };
    updatedItem = items[itemIdx];
    saveStoredItems(items);
  }

  // Update order total received / pending in orders.json
  const orders = getStoredOrders();
  const orderIdx = orders.findIndex((o) => o.grnNumber === batch.grnNumber);
  let updatedOrder: GRNOrder | undefined;
  if (orderIdx >= 0) {
    const order = orders[orderIdx];
    const newTotalItems = (order.totalItems || 0) + Number(batch.receivedQty);
    orders[orderIdx] = {
      ...order,
      totalItems: newTotalItems,
      totalReceivedQty: newTotalItems,
      totalPendingQty: Math.max(0, (order.totalOrderedQty || newTotalItems) - newTotalItems),
      isScrapReceipt: batch.isScrapOrJunk || order.isScrapReceipt,
    };
    updatedOrder = orders[orderIdx];
    saveStoredOrders(orders);
  }

  return { batch, updatedItem, updatedOrder };
}

// ==============================================================================
// 2. PRODUCTION ISSUES (Issue from Store to Production Floor)
// ==============================================================================

export function getStoredProductionIssues(): ProductionIssue[] {
  ensureStoreFiles();
  try {
    const raw = fs.readFileSync(PRODUCTION_ISSUES_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredProductionIssues(issues: ProductionIssue[]) {
  ensureStoreFiles();
  safeWriteJson(PRODUCTION_ISSUES_FILE, issues);
}

export function addStoredProductionIssue(issue: ProductionIssue): ProductionIssue {
  const issues = getStoredProductionIssues();
  issues.unshift(issue);
  saveStoredProductionIssues(issues);

  // Automatically deduct stock from Store and log in stock ledger
  logStockTransaction({
    itemCode: issue.itemCode,
    itemName: issue.itemName,
    transactionType: 'PRODUCTION_ISSUE',
    referenceNumber: issue.voucherNumber,
    changeQty: -Math.abs(Number(issue.quantityIssued)),
    location: 'PRODUCTION',
    performedBy: issue.productionManager || issue.responsiblePerson || 'Production Manager',
    userRole: 'PRODUCTION',
    remarks: `Issued ${issue.quantityIssued} ${issue.uom} to ${issue.station} for Job ${issue.jobCardNumber}. Authorized by ${issue.productionManager}.`,
  });

  return issue;
}

export function updateStoredProductionIssue(
  issueId: string,
  updates: Partial<ProductionIssue>
): ProductionIssue | null {
  const issues = getStoredProductionIssues();
  const idx = issues.findIndex((i) => i.id === issueId || i.voucherNumber === issueId);
  if (idx === -1) return null;
  issues[idx] = { ...issues[idx], ...updates };
  saveStoredProductionIssues(issues);
  return issues[idx];
}


// ==============================================================================
// 3. FINISHED GOODS STOCK (Production Completion into FG Inventory)
// ==============================================================================

export function getStoredFinishedGoods(): FinishedGoodsStock[] {
  ensureStoreFiles();
  try {
    const raw = fs.readFileSync(FINISHED_GOODS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredFinishedGoods(goods: FinishedGoodsStock[]) {
  ensureStoreFiles();
  safeWriteJson(FINISHED_GOODS_FILE, goods);
}

export function addStoredFinishedGoods(good: FinishedGoodsStock): FinishedGoodsStock {
  const goods = getStoredFinishedGoods();
  const existingIdx = goods.findIndex((g) => g.productCode === good.productCode && g.batchNumber === good.batchNumber);

  if (existingIdx >= 0) {
    goods[existingIdx].quantityProduced += Number(good.quantityProduced);
    goods[existingIdx].availableQuantity += Number(good.availableQuantity);
  } else {
    goods.unshift(good);
  }
  saveStoredFinishedGoods(goods);

  // Log in stock ledger as FINISHED_GOODS_RECEIPT
  logStockTransaction({
    itemCode: good.productCode,
    itemName: good.productName,
    transactionType: 'FINISHED_GOODS_RECEIPT',
    referenceNumber: good.batchNumber,
    changeQty: Math.abs(Number(good.quantityProduced)),
    location: good.storageLocation || 'FG_WAREHOUSE',
    performedBy: good.productionManager || 'Production Head',
    userRole: 'PRODUCTION',
    remarks: `Manufactured ${good.quantityProduced} ${good.uom} completed and stocked in ${good.storageLocation}. Job Card: ${good.sourceJobCard || 'N/A'}.`,
  });

  return good;
}

// ==============================================================================
// 4. DISPATCHES (Outward Delivery Challan & Finished Goods Deduction)
// ==============================================================================

export function getStoredDispatches(): DispatchRecord[] {
  ensureStoreFiles();
  try {
    const raw = fs.readFileSync(DISPATCHES_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredDispatches(dispatches: DispatchRecord[]) {
  ensureStoreFiles();
  safeWriteJson(DISPATCHES_FILE, dispatches);
}

export function addStoredDispatch(dispatch: DispatchRecord): DispatchRecord {
  const dispatches = getStoredDispatches();
  dispatches.unshift(dispatch);
  saveStoredDispatches(dispatches);

  // Deduct available quantity from Finished Goods Stock if matching product exists
  const goods = getStoredFinishedGoods();
  const goodIdx = goods.findIndex((g) => g.productCode === dispatch.productCode);
  if (goodIdx >= 0) {
    goods[goodIdx].availableQuantity = Math.max(0, goods[goodIdx].availableQuantity - Number(dispatch.quantityDispatched));
    saveStoredFinishedGoods(goods);
  }

  // Log in stock ledger as DISPATCH
  logStockTransaction({
    itemCode: dispatch.productCode,
    itemName: dispatch.productName,
    transactionType: 'DISPATCH',
    referenceNumber: dispatch.dcNumber,
    changeQty: -Math.abs(Number(dispatch.quantityDispatched)),
    location: 'DISPATCHED',
    performedBy: dispatch.responsiblePerson || 'Dispatch Officer',
    userRole: 'STORE',
    remarks: `Dispatched ${dispatch.quantityDispatched} units to ${dispatch.customerName} (${dispatch.destination}) via Vehicle ${dispatch.vehicleNumber || 'N/A'}, Gate Pass: ${dispatch.gatePassNumber || 'N/A'}.`,
  });

  return dispatch;
}

// ==============================================================================
// 5. PURCHASE ORDERS (Multi-Item PO & Tracking Inward Deliveries)
// ==============================================================================

export function getStoredPurchaseOrders(): PurchaseOrder[] {
  ensureStoreFiles();
  try {
    const raw = fs.readFileSync(PURCHASE_ORDERS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return INITIAL_PURCHASE_ORDERS;
  }
}

export function saveStoredPurchaseOrders(pos: PurchaseOrder[]): void {
  ensureStoreFiles();
  safeWriteJson(PURCHASE_ORDERS_FILE, pos);
}

export function addStoredPurchaseOrder(po: PurchaseOrder): PurchaseOrder {
  const pos = getStoredPurchaseOrders();
  const existingIdx = pos.findIndex((p) => p.poNumber === po.poNumber);
  if (existingIdx >= 0) {
    pos[existingIdx] = po;
  } else {
    pos.unshift(po);
  }
  saveStoredPurchaseOrders(pos);
  return po;
}

export function updateStoredPurchaseOrder(
  poNumber: string,
  updates: Partial<PurchaseOrder>
): PurchaseOrder | null {
  const pos = getStoredPurchaseOrders();
  const idx = pos.findIndex((p) => p.poNumber.trim().toLowerCase() === poNumber.trim().toLowerCase());
  if (idx < 0) return null;

  pos[idx] = { ...pos[idx], ...updates };
  saveStoredPurchaseOrders(pos);
  return pos[idx];
}

/**
 * Record delivery receipt against a specific PO and item.
 * Automatically updates ordered, received, pending quantities, and PO status!
 */
export function recordPoReceipt(
  poNumber: string,
  itemCode: string,
  receivedQtyToday: number
): void {
  if (!poNumber || !itemCode || receivedQtyToday <= 0) return;

  const pos = getStoredPurchaseOrders();
  const po = pos.find((p) => p.poNumber.trim().toLowerCase() === poNumber.trim().toLowerCase());
  if (!po || !po.items) return;

  const item = po.items.find(
    (it) => it.itemCode.trim().toLowerCase() === itemCode.trim().toLowerCase()
  );
  if (!item) return;

  const prevReceived = Number(item.receivedQty) || 0;
  const newReceived = prevReceived + Number(receivedQtyToday);
  const ordered = Number(item.orderedQty) || 0;

  item.receivedQty = newReceived;
  item.pendingQty = Math.max(0, ordered - newReceived);

  // Check overall PO status
  const allCompleted = po.items.every((it) => (Number(it.receivedQty) || 0) >= (Number(it.orderedQty) || 0));
  const anyReceived = po.items.some((it) => (Number(it.receivedQty) || 0) > 0);

  if (allCompleted) {
    po.status = 'COMPLETED';
  } else if (anyReceived) {
    po.status = 'PARTIALLY_RECEIVED';
  }

  saveStoredPurchaseOrders(pos);
}

