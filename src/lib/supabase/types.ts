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
  grn_id?: string | null;
  item_id?: string | null;
  grn_number: string;
  item_code: string;
  description: string;
  category: string | null;
  po_qty: number;
  received_qty: number;
  quantity?: number;
  accepted_qty: number;
  rejected_qty: number;
  unit: string;
  unit_code?: string;
  unit_price: number;
  batch_number: string | null;
  qc_status: string;
  rejection_reason: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DatabasePurchaseOrderRow {
  id?: string;
  po_number: string;
  vendor_id?: string | null;
  vendor_code?: string | null;
  vendor_name: string;
  po_date: string;
  delivery_due_date?: string | null;
  status: string;
  total_amount: number;
  price_type?: string;
  remarks?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DatabasePurchaseOrderItemRow {
  id: string;
  po_id?: string | null;
  po_number: string;
  item_id?: string | null;
  item_code: string;
  description: string;
  ordered_qty: number;
  quantity?: number;
  received_qty: number;
  accepted_qty: number;
  pending_qty: number;
  unit: string;
  unit_code?: string;
  unit_price: number;
  tax_percent: number;
  price_type?: string;
  line_total: number;
  created_at?: string;
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

export function mapGrnItemFromDb(row: any): GRNItem {
  return {
    id: String(row.id || ''),
    grnNumber: row.grn_number || '',
    itemCode: row.item_code || '',
    description: row.description || '',
    category: row.category || '',
    poQty: Number(row.po_qty ?? row.quantity ?? row.ordered_qty ?? 0),
    orderedQty: Number(row.ordered_qty ?? row.po_qty ?? row.quantity ?? 0),
    receivedQty: Number(row.received_qty ?? row.quantity ?? 0),
    acceptedQty: Number(row.accepted_qty ?? 0),
    rejectedQty: Number(row.rejected_qty ?? 0),
    unit: row.unit || row.unit_code || 'PCS',
    unitPrice: Number(row.unit_price ?? 0),
    batchNumber: row.batch_number || '',
    qcStatus: (row.qc_status === 'PASSED' ? 'Passed' : row.qc_status === 'FAILED' ? 'Failed' : row.qc_status) || 'Under Review',
    rejectionReason: row.rejection_reason || undefined,
  };
}

export function mapGrnItemToDb(item: GRNItem, grnId?: string): DatabaseGrnItemRow {
  return {
    id: item.id,
    grn_id: grnId || null,
    grn_number: item.grnNumber,
    item_code: item.itemCode,
    description: item.description,
    category: item.category || null,
    po_qty: item.poQty,
    received_qty: item.receivedQty,
    quantity: item.receivedQty,
    accepted_qty: item.acceptedQty,
    rejected_qty: item.rejectedQty,
    unit: item.unit || 'PCS',
    unit_code: item.unit || 'PCS',
    unit_price: item.unitPrice,
    batch_number: item.batchNumber || null,
    qc_status: item.qcStatus,
    rejection_reason: item.rejectionReason || null,
  };
}

export function mapPurchaseOrderFromDb(
  row: any,
  items: any[] = []
): import('@/types/inventory').PurchaseOrder {
  const normStatus =
    row.status === 'OPEN' ? 'ISSUED' : row.status === 'CLOSED' ? 'COMPLETED' : row.status;

  return {
    id: row.po_number || row.id,
    poNumber: row.po_number,
    vendorId: row.vendor_code || row.vendor_id || '',
    vendorName: row.vendor_name || 'Supplier',
    poDate: row.po_date ? new Date(row.po_date).toISOString().split('T')[0] : '',
    deliveryDueDate: row.delivery_due_date ? new Date(row.delivery_due_date).toISOString().split('T')[0] : '',
    status: normStatus,
    totalAmount: Number(row.total_amount) || 0,
    priceType: row.price_type || 'WITH_GST',
    remarks: row.remarks || '',
    items: items.map(mapPurchaseOrderItemFromDb),
  };
}

export function mapPurchaseOrderItemFromDb(
  row: any
): import('@/types/inventory').PurchaseOrderItem {
  const ordered = Number(row.ordered_qty ?? row.quantity ?? 0);
  const rec = Number(row.received_qty ?? 0);
  const price = Number(row.unit_price ?? 0);
  const lineTotal = Number(row.line_total ?? ordered * price);

  return {
    id: String(row.id || ''),
    poId: row.po_number || row.po_id || '',
    itemId: row.item_code || row.item_id || '',
    itemCode: row.item_code || '',
    description: row.description || '',
    orderedQty: ordered,
    receivedQty: rec,
    acceptedQty: Number(row.accepted_qty ?? 0),
    pendingQty: Math.max(0, ordered - rec),
    unit: row.unit || row.unit_code || 'PCS',
    unitPrice: price,
    taxPercent: Number(row.tax_percent ?? 18),
    priceType: row.price_type || 'WITH_GST',
    lineTotal,
  };
}

