import { GRNOrder, GRNItem, Vendor } from '@/types/inventory';

export interface DatabaseVendorRow {
  vendor_code: string;
  vendor_name: string;
  category: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  lead_time_days: number;
  quality_rating: number;
  status: 'Active' | 'Preferred' | 'On Probation';
  created_at?: string;
  updated_at?: string;
}

export interface DatabaseGrnOrderRow {
  grn_number: string;
  po_number: string;
  vendor_name: string;
  received_date: string;
  warehouse: string;
  carrier_tracking: string | null;
  inspector: string;
  total_items: number;
  total_value: number;
  status: 'Approved' | 'Pending QC' | 'Partial' | 'Rejected';
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DatabaseGrnItemRow {
  id: string;
  grn_number: string;
  item_code: string;
  description: string;
  category: string | null;
  po_qty: number;
  received_qty: number;
  accepted_qty: number;
  rejected_qty: number;
  unit: string;
  unit_price: number;
  batch_number: string | null;
  qc_status: 'Passed' | 'Under Review' | 'Failed';
  rejection_reason: string | null;
  created_at?: string;
  updated_at?: string;
}

// Converters: Database rows (snake_case) <-> Frontend models (camelCase)

export function mapVendorFromDb(row: DatabaseVendorRow): Vendor {
  return {
    vendorCode: row.vendor_code,
    vendorName: row.vendor_name,
    category: row.category,
    contactPerson: row.contact_person || '',
    email: row.email || '',
    phone: row.phone || '',
    leadTimeDays: Number(row.lead_time_days) || 0,
    qualityRating: Number(row.quality_rating) || 0,
    status: row.status,
  };
}

export function mapVendorToDb(vendor: Vendor): DatabaseVendorRow {
  return {
    vendor_code: vendor.vendorCode,
    vendor_name: vendor.vendorName,
    category: vendor.category,
    contact_person: vendor.contactPerson || null,
    email: vendor.email || null,
    phone: vendor.phone || null,
    lead_time_days: vendor.leadTimeDays,
    quality_rating: vendor.qualityRating,
    status: vendor.status,
  };
}

export function mapGrnOrderFromDb(row: DatabaseGrnOrderRow): GRNOrder {
  return {
    grnNumber: row.grn_number,
    poNumber: row.po_number,
    vendorName: row.vendor_name,
    receivedDate: row.received_date,
    warehouse: row.warehouse,
    carrierTracking: row.carrier_tracking || '',
    inspector: row.inspector,
    totalItems: Number(row.total_items) || 0,
    totalValue: Number(row.total_value) || 0,
    status: row.status,
    notes: row.notes || '',
  };
}

export function mapGrnOrderToDb(order: GRNOrder): DatabaseGrnOrderRow {
  return {
    grn_number: order.grnNumber,
    po_number: order.poNumber,
    vendor_name: order.vendorName,
    received_date: order.receivedDate,
    warehouse: order.warehouse,
    carrier_tracking: order.carrierTracking || null,
    inspector: order.inspector,
    total_items: order.totalItems,
    total_value: order.totalValue,
    status: order.status,
    notes: order.notes || null,
  };
}

export function mapGrnItemFromDb(row: DatabaseGrnItemRow): GRNItem {
  return {
    id: row.id,
    grnNumber: row.grn_number,
    itemCode: row.item_code,
    description: row.description,
    category: row.category || '',
    poQty: Number(row.po_qty) || 0,
    receivedQty: Number(row.received_qty) || 0,
    acceptedQty: Number(row.accepted_qty) || 0,
    rejectedQty: Number(row.rejected_qty) || 0,
    unit: row.unit || 'PCS',
    unitPrice: Number(row.unit_price) || 0,
    batchNumber: row.batch_number || '',
    qcStatus: row.qc_status,
    rejectionReason: row.rejection_reason || undefined,
  };
}

export function mapGrnItemToDb(item: GRNItem): DatabaseGrnItemRow {
  return {
    id: item.id,
    grn_number: item.grnNumber,
    item_code: item.itemCode,
    description: item.description,
    category: item.category || null,
    po_qty: item.poQty,
    received_qty: item.receivedQty,
    accepted_qty: item.acceptedQty,
    rejected_qty: item.rejectedQty,
    unit: item.unit,
    unit_price: item.unitPrice,
    batch_number: item.batchNumber || null,
    qc_status: item.qcStatus,
    rejection_reason: item.rejectionReason || null,
  };
}
