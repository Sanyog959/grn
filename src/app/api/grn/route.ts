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

      // Initialize Delivery Batch #1 for each line item
      try {
        const { addStoredInwardBatch } = await import('@/lib/store/inventoryStore');
        items.forEach((it, idx) => {
          const ordered = it.orderedQty || it.poQty || it.receivedQty;
          const received = it.receivedQty;
          addStoredInwardBatch({
            id: `BATCH-${Date.now()}-${idx + 1}`,
            grnNumber: order.grnNumber,
            itemCode: it.itemCode,
            itemName: it.description,
            batchSeq: 1,
            orderedQty: ordered,
            receivedQty: received,
            cumulativeReceivedQty: received,
            pendingQty: Math.max(0, ordered - received),
            receivedDate: order.receivedDate || new Date().toISOString(),
            deliveryChallan: order.carrierTracking || `CH-INIT-${order.grnNumber}`,
            vehicleNumber: order.carrierTracking || '',
            receivedBy: order.inspector || 'Store Receiver',
            isScrapOrJunk: Boolean(order.isScrapReceipt || it.isScrap),
            qcStatus: 'Pending QC',
            remarks: `Initial delivery installment: ${received} of ${ordered} units inwarded at dock.`,
            createdAt: new Date().toISOString(),
          });
        });
      } catch (batchErr) {
        console.warn('Initial batch generation notice:', batchErr);
      }

      // Update matching PO item receipt progress
      try {
        const { recordPoReceipt } = await import('@/lib/store/inventoryStore');
        if (order.poNumber) {
          items.forEach((it) => {
            if (it.itemCode && it.receivedQty > 0) {
              recordPoReceipt(order.poNumber, it.itemCode, it.receivedQty);
            }
          });
        }
      } catch (poErr) {
        console.warn('PO receipt update notice:', poErr);
      }
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

    // 4. Send email notification to Admin and QC Team
    try {
      const { notifyAdminSentToQc } = await import('@/lib/email/mailer');
      const firstItem = items && items[0];
      await notifyAdminSentToQc({
        grnNumber: order.grnNumber,
        poNumber: order.poNumber,
        vendorName: order.vendorName,
        itemCode: firstItem?.itemCode || 'MULTIPLE-ITEMS',
        description: firstItem ? `${firstItem.description} (${items.length} items)` : 'Industrial Consignment',
        batchSeq: 1,
        orderedQty: order.totalOrderedQty || order.totalItems,
        receivedQty: order.totalReceivedQty || order.totalItems,
        pendingQty: order.totalPendingQty || 0,
        sentBy: order.inspector || 'Store Officer',
        isScrapOrJunk: Boolean(order.isScrapReceipt),
        notes: order.notes || 'Inward consignment logged and sent to QC inspection.',
      });
    } catch (mailErr) {
      console.warn('Inward creation email notification notice:', mailErr);
    }

    return NextResponse.json({
      success: true,
      message: `GRN ${order.grnNumber} stored successfully & notified to Admin + QC`,
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
    const { grnNumber, status, notes, userRole, approvedBy } = body as {
      grnNumber: string;
      status: 'Approved' | 'Pending QC' | 'Partial' | 'Rejected';
      notes?: string;
      userRole?: string;
      approvedBy?: string;
    };

    if (!grnNumber || !status) {
      return NextResponse.json(
        { success: false, error: 'Missing grnNumber or status' },
        { status: 400 }
      );
    }

    // 1. Update local store
    updateStoredOrderStatus(grnNumber, status, approvedBy, notes);

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

    // 4. Send email notification to BOTH Admin and QA Team
    if (status !== 'Pending QC') {
      try {
        const { notifyQcCompleted } = await import('@/lib/email/mailer');
        await notifyQcCompleted({
          grnNumber,
          status: status as 'Approved' | 'Partial' | 'Rejected',
          inspectorName: approvedBy || 'Quality Inspector',
          notes: notes || `GRN marked as ${status} by Quality Inspector`,
        });
      } catch (mailErr) {
        console.warn('Status notification email dispatch notice:', mailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `GRN ${grnNumber} status updated to ${status} by ${approvedBy || 'authorized QC inspector'}`,
    });
  } catch (err) {
    console.error('GRN PATCH error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to update order status' },
      { status: 500 }
    );
  }
}

