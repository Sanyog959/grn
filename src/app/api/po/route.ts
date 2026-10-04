import { NextResponse } from 'next/server';
import {
  getStoredPurchaseOrders,
  addStoredPurchaseOrder,
  updateStoredPurchaseOrder,
  recordPoReceipt,
} from '@/lib/store/inventoryStore';
import { PurchaseOrder } from '@/types/inventory';
import { getPostgresPool } from '@/lib/db/postgres';
import { getSupabaseFromRequest } from '@/lib/supabase/server';
import {
  fetchAllPurchaseOrdersFromDb,
  createPurchaseOrderInDb,
  updatePurchaseOrderStatusInDb,
} from '@/lib/supabase/service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.toLowerCase();

    const localPos = getStoredPurchaseOrders();

    // 1. Try PostgreSQL Direct Connection
    const pool = getPostgresPool();
    if (pool) {
      try {
        const client = await pool.connect();
        try {
          const poRes = await client.query('SELECT * FROM public.purchase_orders ORDER BY po_date DESC, created_at DESC');
          const poiRes = await client.query('SELECT * FROM public.purchase_order_items ORDER BY id ASC');

          if (poRes.rows && poRes.rows.length > 0) {
            const itemsByPo = new Map<string, any[]>();
            poiRes.rows.forEach((r) => {
              const list = itemsByPo.get(r.po_number) || [];
              list.push({
                id: r.id,
                poId: r.po_number,
                itemId: r.item_code,
                itemCode: r.item_code,
                description: r.description,
                orderedQty: Number(r.ordered_qty) || 0,
                receivedQty: Number(r.received_qty) || 0,
                acceptedQty: Number(r.accepted_qty) || 0,
                pendingQty: Number(r.pending_qty) || 0,
                unit: r.unit || 'PCS',
                unitPrice: Number(r.unit_price) || 0,
                taxPercent: Number(r.tax_percent) || 18,
                lineTotal: Number(r.line_total) || 0,
              });
              itemsByPo.set(r.po_number, list);
            });

            const dbPos: PurchaseOrder[] = poRes.rows.map((r) => ({
              id: r.po_number,
              poNumber: r.po_number,
              vendorId: r.vendor_code || '',
              vendorName: r.vendor_name,
              poDate: r.po_date ? new Date(r.po_date).toISOString().split('T')[0] : '',
              deliveryDueDate: r.delivery_due_date ? new Date(r.delivery_due_date).toISOString().split('T')[0] : '',
              status: r.status === 'OPEN' ? 'ISSUED' : r.status === 'CLOSED' ? 'COMPLETED' : r.status,
              totalAmount: Number(r.total_amount) || 0,
              priceType: r.price_type || 'WITH_GST',
              remarks: r.remarks || '',
              items: itemsByPo.get(r.po_number) || [],
            }));

            let filtered = dbPos;
            if (status && status !== 'ALL') {
              filtered = filtered.filter((p) => p.status === status);
            }
            if (search) {
              filtered = filtered.filter(
                (p) =>
                  p.poNumber.toLowerCase().includes(search) ||
                  p.vendorName.toLowerCase().includes(search)
              );
            }

            return NextResponse.json({
              success: true,
              source: 'postgres',
              purchaseOrders: filtered,
              total: filtered.length,
            });
          }
        } finally {
          client.release();
        }
      } catch (dbErr) {
        console.warn('Postgres PO fetch notice:', dbErr);
      }
    }

    // 2. Try Supabase REST Client
    const supabase = getSupabaseFromRequest(request);
    if (supabase) {
      try {
        const sbPos = await fetchAllPurchaseOrdersFromDb(supabase);
        if (sbPos && sbPos.length > 0) {
          // Merge with local store to ensure newly created local orders and their line items remain intact
          const mergedMap = new Map<string, PurchaseOrder>();
          localPos.forEach((p) => mergedMap.set(p.poNumber.toLowerCase(), p));
          sbPos.forEach((p) => {
            const localMatch = mergedMap.get(p.poNumber.toLowerCase());
            if (localMatch && (!p.items || p.items.length === 0) && localMatch.items && localMatch.items.length > 0) {
              p.items = localMatch.items;
            }
            mergedMap.set(p.poNumber.toLowerCase(), p);
          });
          let allPos = Array.from(mergedMap.values());

          if (status && status !== 'ALL') {
            allPos = allPos.filter((p) => p.status === status);
          }
          if (search) {
            allPos = allPos.filter(
              (p) =>
                p.poNumber.toLowerCase().includes(search) ||
                p.vendorName.toLowerCase().includes(search) ||
                (p.remarks && p.remarks.toLowerCase().includes(search))
            );
          }

          return NextResponse.json({
            success: true,
            source: 'supabase',
            purchaseOrders: allPos,
            total: allPos.length,
          });
        }
      } catch (sbErr) {
        console.warn('Supabase PO fetch fallback:', sbErr);
      }
    }

    // 3. Fallback to Local Persistent Store
    let pos = localPos;
    if (status && status !== 'ALL') {
      pos = pos.filter((p) => p.status === status);
    }
    if (search) {
      pos = pos.filter(
        (p) =>
          p.poNumber.toLowerCase().includes(search) ||
          p.vendorName.toLowerCase().includes(search) ||
          (p.remarks && p.remarks.toLowerCase().includes(search))
      );
    }

    return NextResponse.json({
      success: true,
      source: 'local_store',
      purchaseOrders: pos,
      total: pos.length,
    });
  } catch (err: unknown) {
    console.error('PO GET error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to fetch purchase orders' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const po = (body.po || body) as PurchaseOrder;

    if (!po || !po.poNumber || !po.vendorName) {
      return NextResponse.json(
        { success: false, error: 'Missing poNumber or vendorName' },
        { status: 400 }
      );
    }

    if (!po.items || !Array.isArray(po.items) || po.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Purchase Order must have at least one line item' },
        { status: 400 }
      );
    }

    // Validate and compute line items
    for (const it of po.items) {
      if ((Number(it.orderedQty) || 0) <= 0) {
        return NextResponse.json(
          { success: false, error: `Ordered quantity for item ${it.itemCode || it.description} must be greater than 0` },
          { status: 400 }
        );
      }
      if ((Number(it.unitPrice) || 0) < 0) {
        return NextResponse.json(
          { success: false, error: `Unit price for item ${it.itemCode || it.description} cannot be negative` },
          { status: 400 }
        );
      }
    }

    po.items = po.items.map((it, idx) => {
      const ordered = Number(it.orderedQty) || 1;
      const rec = Number(it.receivedQty) || 0;
      const price = Number(it.unitPrice) || 0;
      const isWithoutGst = po.priceType === 'WITHOUT_GST' || it.priceType === 'WITHOUT_GST';
      const tax = isWithoutGst ? 0 : Number(it.taxPercent ?? 18);
      const lineTotal = isWithoutGst
        ? Math.round(ordered * price * 100) / 100
        : Math.round(ordered * price * (1 + tax / 100) * 100) / 100;
      return {
        ...it,
        id: it.id || `poi-${Date.now()}-${idx}`,
        poId: po.poNumber,
        orderedQty: ordered,
        receivedQty: rec,
        pendingQty: Math.max(0, ordered - rec),
        acceptedQty: Number(it.acceptedQty) || 0,
        unit: it.unit || 'PCS',
        unitPrice: price,
        taxPercent: tax,
        priceType: isWithoutGst ? 'WITHOUT_GST' : 'WITH_GST',
        lineTotal,
      };
    });

    // Recompute total PO amount
    po.totalAmount = po.items.reduce((sum, it) => sum + it.lineTotal, 0);

    // 1. Always save in local store first (Guarantees zero data loss)
    addStoredPurchaseOrder(po);

    // 2. Try saving to Supabase Client
    const supabase = getSupabaseFromRequest(request);
    if (supabase) {
      try {
        await createPurchaseOrderInDb(supabase, po);
      } catch (sbErr) {
        console.warn('Supabase PO insert notice:', sbErr);
      }
    }

    // 3. Try saving to PostgreSQL if direct connection is active
    const pool = getPostgresPool();
    if (pool) {
      try {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query(
            `INSERT INTO public.purchase_orders (po_number, vendor_code, vendor_name, po_date, delivery_due_date, status, total_amount, price_type, remarks)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (po_number) DO UPDATE SET
               vendor_name = EXCLUDED.vendor_name,
               delivery_due_date = EXCLUDED.delivery_due_date,
               total_amount = EXCLUDED.total_amount,
               price_type = EXCLUDED.price_type,
               remarks = EXCLUDED.remarks,
               status = EXCLUDED.status`,
            [
              po.poNumber,
              po.vendorId || null,
              po.vendorName,
              po.poDate || new Date().toISOString().slice(0, 10),
              po.deliveryDueDate || null,
              po.status || 'ISSUED',
              po.totalAmount,
              po.priceType || 'WITH_GST',
              po.remarks || null,
            ]
          );

          for (const it of po.items) {
            await client.query(
              `INSERT INTO public.purchase_order_items (id, po_number, item_code, description, ordered_qty, received_qty, accepted_qty, pending_qty, unit, unit_price, tax_percent, price_type, line_total)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
               ON CONFLICT (id) DO UPDATE SET
                 ordered_qty = EXCLUDED.ordered_qty,
                 received_qty = EXCLUDED.received_qty,
                 pending_qty = EXCLUDED.pending_qty,
                 unit = EXCLUDED.unit,
                 unit_price = EXCLUDED.unit_price,
                 tax_percent = EXCLUDED.tax_percent,
                 price_type = EXCLUDED.price_type,
                 line_total = EXCLUDED.line_total`,
              [
                it.id,
                po.poNumber,
                it.itemCode,
                it.description,
                it.orderedQty,
                it.receivedQty,
                it.acceptedQty,
                it.pendingQty,
                it.unit || 'PCS',
                it.unitPrice,
                it.taxPercent,
                it.priceType || 'WITH_GST',
                it.lineTotal,
              ]
            );
          }
          await client.query('COMMIT');
        } catch (dbErr) {
          await client.query('ROLLBACK');
          console.warn('Postgres PO insert notice:', dbErr);
        } finally {
          client.release();
        }
      } catch (poolErr) {
        console.warn('Postgres connection pool error for PO:', poolErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Purchase Order ${po.poNumber} created with ${po.items.length} items`,
      purchaseOrder: po,
    });
  } catch (err: unknown) {
    console.error('PO POST error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to create purchase order' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { poNumber, status, itemCode, receivedQtyToday } = body;

    if (!poNumber) {
      return NextResponse.json({ success: false, error: 'Missing poNumber' }, { status: 400 });
    }

    // 1. Update local store
    if (itemCode && receivedQtyToday !== undefined) {
      recordPoReceipt(poNumber, itemCode, Number(receivedQtyToday));
    }

    if (status) {
      updateStoredPurchaseOrder(poNumber, { status });
    }

    // 2. Update Supabase
    const supabase = getSupabaseFromRequest(request);
    if (supabase && status) {
      try {
        await updatePurchaseOrderStatusInDb(supabase, poNumber, status);
      } catch (sbErr) {
        console.warn('Supabase PO update notice:', sbErr);
      }
    }

    // 3. Update PostgreSQL
    const pool = getPostgresPool();
    if (pool && status) {
      try {
        const client = await pool.connect();
        try {
          await client.query(
            'UPDATE public.purchase_orders SET status = $1, updated_at = NOW() WHERE po_number = $2',
            [status, poNumber]
          );
        } finally {
          client.release();
        }
      } catch (pgErr) {
        console.warn('Postgres PO update notice:', pgErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Purchase Order ${poNumber} updated successfully`,
    });
  } catch (err: unknown) {
    console.error('PO PATCH error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to update purchase order' },
      { status: 500 }
    );
  }
}
