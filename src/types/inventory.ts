/**
 * Material Inventory Management System (MIMS)
 * Production Domain Types and Schemas
 * Connected with PostgreSQL / Supabase Ledger Engine
 */

export type StockLocationCode =
  | 'QC_PENDING'
  | 'STORE'
  | 'PRODUCTION'
  | 'HOLD'
  | 'REJECTED'
  | 'DISPATCHED';

export type POStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_RECEIVED' | 'COMPLETED' | 'CANCELLED';

export type GRNStatus = 'DRAFT' | 'Pending QC' | 'Approved' | 'Partial' | 'Rejected' | 'CANCELLED';

export type QCStatus = 'PENDING' | 'Passed' | 'Under Review' | 'Failed' | 'HOLD';

export type TransactionType =
  | 'PURCHASE_RECEIPT'
  | 'QC_ACCEPT'
  | 'QC_REJECT'
  | 'ISSUE_TO_PRODUCTION'
  | 'RETURN_FROM_PRODUCTION'
  | 'DISPATCH'
  | 'SCRAP'
  | 'AUDIT_ADJUSTMENT';

export interface UnitOfMeasure {
  id: string;
  code: string;
  name: string;
}

export interface InventoryItem {
  id: string;
  itemCode: string;
  itemName: string;
  category: string;
  uom: string;
  minStock: number;
  maxStock: number;
  reorderLevel: number;
  isActive: boolean;
}

export interface MasterCatalogItem {
  id?: string;
  itemCode: string;
  itemName: string;
  category: string;
  hsnCode?: string;
  uom: string;
  defaultPrice: number;
  minStock?: number;
  reorderQty?: number;
  status: 'ACTIVE' | 'DISCONTINUED';
  updatedAt?: string;
}

export interface Vendor {
  id?: string;
  vendorCode: string;
  vendorName: string;
  category: string;
  contactPerson: string;
  email: string;
  phone: string;
  address?: string;
  leadTimeDays: number;
  qualityRating: number;
  status: 'Active' | 'Preferred' | 'On Probation';
}

export interface Customer {
  id?: string;
  customerCode: string;
  customerName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface GRNInwardBatch {
  id: string;
  grnNumber: string;
  itemCode: string;
  itemName?: string;
  batchSeq: number;
  orderedQty: number;
  receivedQty: number;
  cumulativeReceivedQty: number;
  pendingQty: number;
  receivedDate: string;
  deliveryChallan?: string;
  vehicleNumber?: string;
  receivedBy: string;
  isScrapOrJunk?: boolean;
  qcStatus?: 'Pending QC' | 'Passed' | 'Under Review' | 'Failed' | 'Remark';
  remarks?: string;
  createdAt?: string;
}

export interface GRNOrder {
  id?: string;
  grnNumber: string;
  poNumber: string;
  vendorName: string;
  receivedDate: string;
  warehouse: string;
  carrierTracking: string;
  inspector: string;
  totalItems: number;
  totalValue: number;
  status: 'Approved' | 'Pending QC' | 'Partial' | 'Rejected';
  notes: string;
  approvedBy?: string;
  approvedAt?: string;
  qcSummary?: string;
  totalOrderedQty?: number;
  totalReceivedQty?: number;
  totalPendingQty?: number;
  isScrapReceipt?: boolean;
  sentToQcAt?: string;
  sentToQcBy?: string;
}

export interface GRNItem {
  id: string;
  grnNumber: string;
  itemCode: string;
  description: string;
  category: string;
  poQty: number;
  orderedQty?: number;
  receivedQty: number;
  pendingQty?: number;
  acceptedQty: number;
  rejectedQty: number;
  unit: string;
  unitPrice: number;
  batchNumber: string;
  qcStatus: 'Passed' | 'Under Review' | 'Failed' | 'HOLD' | 'Remark';
  rejectionReason?: string;
  qcRemarks?: string;
  inspectedBy?: string;
  inspectedAt?: string;
  isScrap?: boolean;
  scrapSource?: string;
  inwardBatches?: GRNInwardBatch[];
}

export interface ProductionReport {
  readyToUseQty: number; // Units successfully processed & ready for FG/dispatch
  failedProcessingQty: number; // Internal process/machining failure
  supplierFailedQty: number; // Supplier raw material defect failure
  fileUrls: string[]; // Up to 3 proof file attachments / photos
  remarks: string;
  reportedBy?: string;
  reportedAt?: string;
}

export interface ProductionIssue {
  id: string;
  voucherNumber: string;
  jobCardNumber: string;
  station: string;
  itemCode: string;
  itemName: string;
  quantityIssued: number;
  uom: string;
  productionManager: string;
  productionOfficer?: string; // Production Officer assigned to receive and process
  responsiblePerson: string;
  issueDate: string;
  status: 'PENDING_RECEIPT' | 'ISSUED' | 'IN_PROCESS' | 'COMPLETED' | 'RETURNED';
  receivedAt?: string;
  receivedBy?: string;
  remainingStoreStock?: number;
  remarks?: string;
  report?: ProductionReport;
}

export interface FinishedGoodsStock {
  id: string;
  productCode: string;
  productName: string;
  batchNumber: string;
  sourceJobCard?: string;
  quantityProduced: number;
  availableQuantity: number;
  uom: string;
  productionManager: string;
  completionDate: string;
  qcPassed: boolean;
  storageLocation: string;
  remarks?: string;
}

export interface DispatchRecord {
  id: string;
  dcNumber: string;
  customerName: string;
  destination: string;
  productCode: string;
  productName: string;
  batchNumber?: string;
  quantityDispatched: number;
  dispatchDate: string;
  dispatchTime?: string;
  transporterName?: string;
  vehicleNumber?: string;
  gatePassNumber?: string;
  responsiblePerson: string;
  status: 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  notes?: string;
}

export interface StockLedgerEntry {
  id: string;
  timestamp: string;
  transactionDate?: string;
  transactionType:
    | TransactionType
    | 'INWARD_GRN'
    | 'QC_ACCEPT'
    | 'QC_REJECT'
    | 'QC_REMARK'
    | 'PRODUCTION_ISSUE'
    | 'PRODUCTION_RETURN'
    | 'FINISHED_GOODS_RECEIPT'
    | 'DISPATCH'
    | 'DISPATCH_DELIVERY'
    | 'SCRAP_ADJUSTMENT'
    | 'JUNK_SCRAP_VERIFY'
    | 'RETURN'
    | 'MANUAL_AUDIT';
  referenceNumber: string;
  referenceDocType?: string;
  referenceDocNumber?: string;
  itemId?: string;
  itemCode: string;
  itemName: string;
  batchNumber?: string;
  previousStock: number;
  changeQty: number;
  newStock: number;
  quantity?: number;
  location?: string;
  fromLocation?: string;
  toLocation?: string;
  unitPrice?: number;
  totalValue?: number;
  performedBy: string;
  userName?: string;
  userRole: string;
  remarks: string;
}

export interface PurchaseOrderItem {
  id: string;
  poId: string;
  itemId: string;
  itemCode: string;
  description: string;
  orderedQty: number;
  receivedQty: number;
  acceptedQty: number;
  pendingQty: number;
  unit?: string;
  unitPrice: number;
  taxPercent?: number;
  priceType?: 'WITH_GST' | 'WITHOUT_GST';
  lineTotal: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  poDate: string;
  deliveryDueDate: string;
  status: POStatus;
  totalAmount: number;
  priceType?: 'WITH_GST' | 'WITHOUT_GST';
  remarks?: string;
  items?: PurchaseOrderItem[];
}

export interface CurrentStockBalance {
  itemId: string;
  itemCode: string;
  itemName: string;
  category: string;
  uom: string;
  locationCode: StockLocationCode;
  batchNumber: string;
  currentQuantity: number;
  availableQuantity: number;
  lastUpdated: string;
}

// Default initial production states: strictly empty arrays awaiting real records from database
export const EMPTY_GRN_ORDERS: GRNOrder[] = [];
export const EMPTY_GRN_ITEMS: GRNItem[] = [];
export const EMPTY_VENDORS: Vendor[] = [];

// Aliases for clean backward compatibility
export const INITIAL_GRN_ORDERS = EMPTY_GRN_ORDERS;
export const INITIAL_GRN_ITEMS = EMPTY_GRN_ITEMS;
export const INITIAL_VENDORS = EMPTY_VENDORS;
