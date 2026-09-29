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
      ...mapGrnItemToDb(it),
      grn_number: order.grnNumber,
    }));

    const { data: itemsData, error: itemsError } = await client
      .from('grn_items')
      .insert(dbItems)
      .select();

    if (itemsError) throw itemsError;
    insertedItems = (itemsData as DatabaseGrnItemRow[]).map(mapGrnItemFromDb);
  }

  return {
    order: mapGrnOrderFromDb(insertedOrder as DatabaseGrnOrderRow),
    items: insertedItems,
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
  qcStatus: 'Passed' | 'Under Review' | 'Failed',
  acceptedQty?: number,
  rejectedQty?: number,
  rejectionReason?: string
): Promise<void> {
  const updatePayload: Partial<DatabaseGrnItemRow> = {
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

  if (error) throw error;
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
