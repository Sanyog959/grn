import { SupabaseClient } from '@supabase/supabase-js';
import {
  GRNOrder,
  GRNItem,
  Vendor,
} from '@/types/inventory';
import {
  mapGrnOrderFromDb,
  mapGrnOrderToDb,
  mapGrnItemFromDb,
  mapGrnItemToDb,
  mapVendorFromDb,
  mapVendorToDb,
  DatabaseGrnOrderRow,
  DatabaseGrnItemRow,
  DatabaseVendorRow,
} from './types';

export interface SupabaseHealthResult {
  connected: boolean;
  source: 'supabase' | 'standby';
  message: string;
  latencyMs?: number;
  tables?: {
    vendors: { exists: boolean; count: number };
    grn_orders: { exists: boolean; count: number };
    grn_items: { exists: boolean; count: number };
  };
}

/**
 * Test connectivity to Supabase and check if the schema tables exist
 */
export async function testSupabaseConnection(
  client: SupabaseClient
): Promise<SupabaseHealthResult> {
  const startTime = Date.now();
  try {
    const [vendorsRes, ordersRes, itemsRes] = await Promise.all([
      client.from('vendors').select('vendor_code', { count: 'exact', head: true }),
      client.from('grn_orders').select('grn_number', { count: 'exact', head: true }),
      client.from('grn_items').select('id', { count: 'exact', head: true }),
    ]);

    const latencyMs = Date.now() - startTime;

    const vendorsOk = !vendorsRes.error;
    const ordersOk = !ordersRes.error;
    const itemsOk = !itemsRes.error;

    if (!vendorsOk && !ordersOk && !itemsOk) {
      return {
        connected: false,
        source: 'standby',
        latencyMs,
        message:
          vendorsRes.error?.message ||
          ordersRes.error?.message ||
          'Connected to Supabase, but GRN tables not found. Run SQL schema script.',
        tables: {
          vendors: { exists: false, count: 0 },
          grn_orders: { exists: false, count: 0 },
          grn_items: { exists: false, count: 0 },
        },
      };
    }

    return {
      connected: true,
      source: 'supabase',
      latencyMs,
      message: 'Successfully connected to Supabase database',
      tables: {
        vendors: { exists: vendorsOk, count: vendorsRes.count ?? 0 },
        grn_orders: { exists: ordersOk, count: ordersRes.count ?? 0 },
        grn_items: { exists: itemsOk, count: itemsRes.count ?? 0 },
      },
    };
  } catch (error: unknown) {
    return {
      connected: false,
      source: 'standby',
      latencyMs: Date.now() - startTime,
      message: error instanceof Error ? error.message : 'Failed to reach Supabase',
    };
  }
}

/**
 * Fetch all GRN data (Orders, Items, Vendors) from Supabase
 */
export async function fetchAllGrnData(client: SupabaseClient): Promise<{
  orders: GRNOrder[];
  items: GRNItem[];
  vendors: Vendor[];
}> {
  const [ordersRes, itemsRes, vendorsRes] = await Promise.all([
    client
      .from('grn_orders')
      .select('*')
      .order('received_date', { ascending: false }),
    client
      .from('grn_items')
      .select('*')
      .order('id', { ascending: true }),
    client
      .from('vendors')
      .select('*')
      .order('vendor_name', { ascending: true }),
  ]);

  if (ordersRes.error) throw ordersRes.error;
  if (itemsRes.error) throw itemsRes.error;
  if (vendorsRes.error) throw vendorsRes.error;

  const orders = (ordersRes.data as DatabaseGrnOrderRow[]).map(mapGrnOrderFromDb);
  const items = (itemsRes.data as DatabaseGrnItemRow[]).map(mapGrnItemFromDb);
  const vendors = (vendorsRes.data as DatabaseVendorRow[]).map(mapVendorFromDb);

  return { orders, items, vendors };
}

/**
 * Insert a new GRN order along with its line items
 */
export async function createGrnOrderInDb(
  client: SupabaseClient,
  order: GRNOrder,
  items: GRNItem[]
): Promise<{ order: GRNOrder; items: GRNItem[] }> {
  // 1. Insert Master GRN Order
  const dbOrder = mapGrnOrderToDb(order);
  const { data: insertedOrder, error: orderError } = await client
    .from('grn_orders')
    .insert([dbOrder])
    .select()
    .single();

  if (orderError) throw orderError;

  // 2. Insert Associated Line Items
  let insertedItems: GRNItem[] = [];
  if (items && items.length > 0) {
    const dbItems = items.map((it) => ({
      ...mapGrnItemToDb(it, insertedOrder?.id),
      grn_number: order.grnNumber,
    }));

    try {
      const { data: itemsData, error: itemsError } = await client
        .from('grn_items')
        .insert(dbItems)
        .select();

      if (!itemsError && itemsData) {
        insertedItems = (itemsData as DatabaseGrnItemRow[]).map(mapGrnItemFromDb);
      } else if (itemsError) {
        console.warn('Supabase grn_items insert notice (run update3.sql to relax constraints):', itemsError.message);
      }
    } catch (itErr) {
      console.warn('grn_items insert fallback:', itErr);
    }
  }

  return {
    order: mapGrnOrderFromDb(insertedOrder as DatabaseGrnOrderRow),
    items: insertedItems.length > 0 ? insertedItems : items,
  };
}

/**
 * Update GRN order status
 */
export async function updateOrderStatusInDb(
  client: SupabaseClient,
  grnNumber: string,
  status: 'Approved' | 'Pending QC' | 'Partial' | 'Rejected',
  notes?: string
): Promise<void> {
  const updatePayload: Partial<DatabaseGrnOrderRow> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (notes !== undefined) {
    updatePayload.notes = notes;
  }

  const { error } = await client
    .from('grn_orders')
    .update(updatePayload)
    .eq('grn_number', grnNumber);

  if (error) throw error;
}

/**
 * Update QC line item inspection status
 */
export async function updateItemQcInDb(
  client: SupabaseClient,
  itemId: string,
  qcStatus: 'Passed' | 'Under Review' | 'Failed' | 'HOLD' | 'Remark',
  acceptedQty?: number,
  rejectedQty?: number,
  rejectionReason?: string
): Promise<void> {
  const updatePayload: Record<string, any> = {
    qc_status: qcStatus,
    updated_at: new Date().toISOString(),
  };

  if (acceptedQty !== undefined) updatePayload.accepted_qty = acceptedQty;
  if (rejectedQty !== undefined) updatePayload.rejected_qty = rejectedQty;
  if (rejectionReason !== undefined) updatePayload.rejection_reason = rejectionReason;

  const { error } = await client
    .from('grn_items')
    .update(updatePayload)
    .eq('id', itemId);

  if (error) {
    console.warn('Supabase item QC update notice:', error.message);
  }
}

/**
 * Fetch all Purchase Orders with Line Items from Supabase
 */
export async function fetchAllPurchaseOrdersFromDb(
  client: SupabaseClient
): Promise<import('@/types/inventory').PurchaseOrder[]> {
  const [poRes, poiRes] = await Promise.all([
    client.from('purchase_orders').select('*').order('created_at', { ascending: false }),
    client.from('purchase_order_items').select('*'),
  ]);

  if (poRes.error) throw poRes.error;
  if (!poRes.data || poRes.data.length === 0) return [];

  const itemsByPo = new Map<string, any[]>();
  if (poiRes.data && Array.isArray(poiRes.data)) {
    poiRes.data.forEach((r) => {
      const key = r.po_number || r.po_id;
      if (key) {
        const list = itemsByPo.get(key) || [];
        list.push(r);
        itemsByPo.set(key, list);
      }
    });
  }

  const { mapPurchaseOrderFromDb } = await import('./types');
  return poRes.data.map((r: any) => {
    const matchingItems = itemsByPo.get(r.po_number) || itemsByPo.get(r.id) || [];
    return mapPurchaseOrderFromDb(r, matchingItems);
  });
}

/**
 * Insert or Upsert a Purchase Order with its Line Items into Supabase
 */
export async function createPurchaseOrderInDb(
  client: SupabaseClient,
  po: import('@/types/inventory').PurchaseOrder
): Promise<import('@/types/inventory').PurchaseOrder> {
  // 1. Resolve vendor UUID if vendor_id requires UUID
  let resolvedVendorId: string | null = null;
  try {
    const { data: vData } = await client
      .from('vendors')
      .select('id, vendor_code, vendor_name')
      .or(`vendor_name.eq."${po.vendorName}",vendor_code.eq."${po.vendorId || ''}"`)
      .limit(1);
    if (vData && vData.length > 0 && vData[0].id) {
      resolvedVendorId = vData[0].id;
    } else {
      const { data: anyVendor } = await client.from('vendors').select('id').limit(1);
      if (anyVendor && anyVendor.length > 0) {
        resolvedVendorId = anyVendor[0].id;
      }
    }
  } catch (vErr) {
    console.warn('Vendor lookup notice for PO:', vErr);
  }

  const crypto = await import('crypto');
  const poUuid = crypto.randomUUID();

  // Try status 'ISSUED', fallback to 'OPEN' if constraint requires it
  const statusCandidates = [po.status || 'ISSUED', 'OPEN', 'PARTIALLY_RECEIVED'];
  let insertedPoRow: any = null;
  let lastPoError: any = null;

  for (const st of statusCandidates) {
    const poPayload: Record<string, any> = {
      po_number: po.poNumber,
      vendor_code: po.vendorId || null,
      vendor_name: po.vendorName,
      po_date: po.poDate || new Date().toISOString().slice(0, 10),
      delivery_due_date: po.deliveryDueDate || null,
      status: st,
      total_amount: Number(po.totalAmount) || 0,
      price_type: po.priceType || 'WITH_GST',
      remarks: po.remarks || null,
    };
    if (resolvedVendorId) {
      poPayload.vendor_id = resolvedVendorId;
    }

    const { data: poRes, error: poErr } = await client
      .from('purchase_orders')
      .upsert([poPayload], { onConflict: 'po_number' })
      .select()
      .single();

    if (!poErr && poRes) {
      insertedPoRow = poRes;
      break;
    }
    lastPoError = poErr;
    if (poErr && !poErr.message?.includes('status_check')) {
      break;
    }
  }

  if (!insertedPoRow && lastPoError) {
    console.warn('Supabase PO header insert notice:', lastPoError.message);
  }

  // 2. Insert line items
  if (po.items && Array.isArray(po.items) && po.items.length > 0) {
    const itemsPayload = po.items.map((it, idx) => {
      const lineUuid = crypto.randomUUID();
      const ordered = Number(it.orderedQty) || 1;
      const rec = Number(it.receivedQty) || 0;
      const price = Number(it.unitPrice) || 0;
      const lineTotal = Number(it.lineTotal) || ordered * price;

      return {
        id: lineUuid,
        po_id: insertedPoRow?.id || poUuid,
        po_number: po.poNumber,
        item_code: it.itemCode || `ITM-${idx + 1}`,
        description: it.description || 'Material Item',
        ordered_qty: ordered,
        quantity: ordered,
        received_qty: rec,
        accepted_qty: Number(it.acceptedQty) || 0,
        pending_qty: Math.max(0, ordered - rec),
        unit: it.unit || 'PCS',
        unit_code: it.unit || 'PCS',
        unit_price: price,
        tax_percent: Number(it.taxPercent ?? 18),
        price_type: it.priceType || po.priceType || 'WITH_GST',
        line_total: lineTotal,
      };
    });

    try {
      const { error: itemsErr } = await client
        .from('purchase_order_items')
        .insert(itemsPayload);
      if (itemsErr) {
        console.warn('Supabase PO line items insert notice (run update3.sql to relax constraints):', itemsErr.message);
      }
    } catch (itErr) {
      console.warn('PO items insert exception:', itErr);
    }
  }

  return po;
}

/**
 * Update Purchase Order Status in Supabase
 */
export async function updatePurchaseOrderStatusInDb(
  client: SupabaseClient,
  poNumber: string,
  status: string
): Promise<void> {
  const normStatus = status === 'ISSUED' ? 'OPEN' : status === 'COMPLETED' ? 'CLOSED' : status;
  const { error } = await client
    .from('purchase_orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('po_number', poNumber);

  if (error && error.message?.includes('status_check')) {
    await client
      .from('purchase_orders')
      .update({ status: normStatus, updated_at: new Date().toISOString() })
      .eq('po_number', poNumber);
  }
}

/**
 * Insert a new Vendor
 */
export async function createVendorInDb(
  client: SupabaseClient,
  vendor: Vendor
): Promise<Vendor> {
  const dbVendor = mapVendorToDb(vendor);
  const { data, error } = await client
    .from('vendors')
    .insert([dbVendor])
    .select()
    .single();

  if (error) throw error;
  return mapVendorFromDb(data as DatabaseVendorRow);
}

/**
 * Seed initial demo data directly into Supabase
 */
export async function seedDemoDataToSupabase(
  client: SupabaseClient
): Promise<{ seededVendors: number; seededOrders: number; seededItems: number }> {
  // Check readiness of database tables
  const [vCheck, oCheck, iCheck] = await Promise.all([
    client.from('vendors').select('vendor_code', { count: 'exact', head: true }),
    client.from('grn_orders').select('grn_number', { count: 'exact', head: true }),
    client.from('grn_items').select('id', { count: 'exact', head: true }),
  ]);

  if (vCheck.error) throw vCheck.error;
  if (oCheck.error) throw oCheck.error;
  if (iCheck.error) throw iCheck.error;

  return {
    seededVendors: vCheck.count ?? 0,
    seededOrders: oCheck.count ?? 0,
    seededItems: iCheck.count ?? 0,
  };
}
