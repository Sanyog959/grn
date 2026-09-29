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
}

export interface GRNItem {
  id: string;
  grnNumber: string;
  itemCode: string;
  description: string;
  category: string;
  poQty: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  unit: string;
  unitPrice: number;
  batchNumber: string;
  qcStatus: 'Passed' | 'Under Review' | 'Failed';
  rejectionReason?: string;
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
  unitPrice: number;
  taxPercent: number;
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
  remarks?: string;
  items?: PurchaseOrderItem[];
}

export interface StockLedgerEntry {
  id: string;
  transactionDate: string;
  transactionType: TransactionType;
  referenceDocType: string;
  referenceDocNumber: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  batchNumber?: string;
  fromLocation: string;
  toLocation: string;
  quantity: number;
  unitPrice?: number;
  totalValue?: number;
  userName?: string;
  remarks?: string;
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
