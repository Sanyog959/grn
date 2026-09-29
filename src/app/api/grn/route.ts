import { NextResponse } from 'next/server';
import { getSupabaseFromRequest } from '@/lib/supabase/server';
import {
  fetchAllGrnData,
  createGrnOrderInDb,
  updateOrderStatusInDb,
} from '@/lib/supabase/service';
import {
  fetchAllFromPostgres,
  insertOrderInPostgres,
  updateOrderStatusInPostgres,
} from '@/lib/db/service';
import { GRNOrder, GRNItem } from '@/types/inventory';
import {
  getStoredOrders,
  getStoredItems,
  getStoredVendors,
  addStoredOrder,
  addStoredItems,
  updateStoredOrderStatus,
} from '@/lib/store/inventoryStore';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status');
  const search = searchParams.get('search')?.toLowerCase();

  const localOrders = getStoredOrders();
  const localItems = getStoredItems();
  const localVendors = getStoredVendors();

  // 1. Try Direct PostgreSQL Connection (DATABASE_URL)
  try {
    const pgData = await fetchAllFromPostgres();
    if (pgData && pgData.orders && pgData.orders.length > 0) {
      let orders = pgData.orders;
      if (statusFilter && statusFilter !== 'all') {
        orders = orders.filter((o) => o.status === statusFilter);
      }
      if (search) {
        orders = orders.filter(
          (o) =>
            o.grnNumber.toLowerCase().includes(search) ||
            o.poNumber.toLowerCase().includes(search) ||
            o.vendorName.toLowerCase().includes(search)
        );
      }

      return NextResponse.json({
        success: true,
        source: 'supabase_postgres',
        connected: true,
        orders,
        items: pgData.items,
        vendors: pgData.vendors,
        total: orders.length,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err: unknown) {
    console.warn('PostgreSQL query error, attempting Supabase client fallback:', err);
  }

  // 2. Try Supabase REST Client
  const supabase = getSupabaseFromRequest(request);

  if (supabase) {
    try {
      const data = await fetchAllGrnData(supabase);
      if (data && (data.orders.length > 0 || data.items.length > 0)) {
        let orders = data.orders;
        if (statusFilter && statusFilter !== 'all') {
          orders = orders.filter((o) => o.status === statusFilter);
        }
        if (search) {
          orders = orders.filter(
            (o) =>
              o.grnNumber.toLowerCase().includes(search) ||
              o.poNumber.toLowerCase().includes(search) ||
              o.vendorName.toLowerCase().includes(search)
          );
        }

        return NextResponse.json({
          success: true,
          source: 'supabase',
          connected: true,
          orders,
          items: data.items,
          vendors: data.vendors && data.vendors.length > 0 ? data.vendors : localVendors,
          total: orders.length,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err: unknown) {
      console.warn('Supabase fetch error, fallback to local store:', err);
    }
  }

  // 3. Fallback to Local Persistent Store
  let filteredOrders = localOrders;
  if (statusFilter && statusFilter !== 'all') {
    filteredOrders = filteredOrders.filter((o) => o.status === statusFilter);
  }
  if (search) {
    filteredOrders = filteredOrders.filter(
      (o) =>
        o.grnNumber.toLowerCase().includes(search) ||
        o.poNumber.toLowerCase().includes(search) ||
        o.vendorName.toLowerCase().includes(search)
    );
  }

  return NextResponse.json({
    success: true,
    source: 'local_store',
    connected: false,
    orders: filteredOrders,
    items: localItems,
    vendors: localVendors,
    total: filteredOrders.length,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { order, items } = body as { order: GRNOrder; items: GRNItem[] };

    if (!order || !order.grnNumber) {
      return NextResponse.json(
        { success: false, error: 'Missing required order payload' },
        { status: 400 }
      );
    }

    // 1. Always save to local persistent store (Guarantees zero data loss)
    addStoredOrder(order);
    if (items && Array.isArray(items)) {
      addStoredItems(items);
    }

    // 2. Try saving to PostgreSQL
    try {
      await insertOrderInPostgres(order, items || []);
    } catch (pgErr: unknown) {
      console.warn('PostgreSQL insert fallback:', pgErr);
    }

    // 3. Try Supabase client
    const supabase = getSupabaseFromRequest(request);
    if (supabase) {
      try {
        await createGrnOrderInDb(supabase, order, items || []);
      } catch (err: unknown) {
        console.warn('Supabase GRN insert fallback:', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `GRN ${order.grnNumber} stored successfully`,
      data: { order, items },
    });
  } catch (err) {
    console.error('GRN POST error:', err);
    return NextResponse.json(
      { success: false, error: 'Invalid request payload' },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { grnNumber, status, notes } = body as {
      grnNumber: string;
      status: 'Approved' | 'Pending QC' | 'Partial' | 'Rejected';
      notes?: string;
    };

    if (!grnNumber || !status) {
      return NextResponse.json(
        { success: false, error: 'Missing grnNumber or status' },
        { status: 400 }
      );
    }

    // 1. Update local store
    updateStoredOrderStatus(grnNumber, status);

    // 2. Try direct PostgreSQL
    try {
      await updateOrderStatusInPostgres(grnNumber, status, notes);
    } catch (pgErr: unknown) {
      console.warn('PostgreSQL update fallback:', pgErr);
    }

    // 3. Try Supabase client
    const supabase = getSupabaseFromRequest(request);
    if (supabase) {
      try {
        await updateOrderStatusInDb(supabase, grnNumber, status, notes);
      } catch (err: unknown) {
        console.warn('Supabase update fallback:', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `GRN ${grnNumber} status updated to ${status}`,
    });
  } catch (err) {
    console.error('GRN PATCH error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to update order status' },
      { status: 500 }
    );
  }
}
