import { getPostgresPool } from './postgres';
import { GRNOrder, GRNItem, Vendor } from '@/types/inventory';

export async function fetchAllFromPostgres(): Promise<{
  orders: GRNOrder[];
  items: GRNItem[];
  vendors: Vendor[];
} | null> {
  const pool = getPostgresPool();
  if (!pool) return null;

  const client = await pool.connect();
  try {
    const [ordersRes, itemsRes, vendorsRes] = await Promise.all([
      client.query('SELECT * FROM public.grn_orders ORDER BY received_date DESC'),
      client.query('SELECT * FROM public.grn_items ORDER BY id ASC'),
      client.query('SELECT * FROM public.vendors ORDER BY vendor_name ASC'),
    ]);

    const orders: GRNOrder[] = ordersRes.rows.map((r) => ({
      grnNumber: r.grn_number,
      poNumber: r.po_number,
      vendorName: r.vendor_name,
      receivedDate: r.received_date ? new Date(r.received_date).toISOString().split('T')[0] : '',
      warehouse: r.warehouse,
      carrierTracking: r.carrier_tracking || '',
      inspector: r.inspector,
      totalItems: Number(r.total_items) || 0,
      totalValue: Number(r.total_value) || 0,
      status: r.status,
      notes: r.notes || '',
    }));

    const items: GRNItem[] = itemsRes.rows.map((r) => ({
      id: r.id,
      grnNumber: r.grn_number,
      itemCode: r.item_code,
      description: r.description,
      category: r.category || '',
      poQty: Number(r.po_qty) || 0,
      receivedQty: Number(r.received_qty) || 0,
      acceptedQty: Number(r.accepted_qty) || 0,
      rejectedQty: Number(r.rejected_qty) || 0,
      unit: r.unit || 'PCS',
      unitPrice: Number(r.unit_price) || 0,
      batchNumber: r.batch_number || '',
      qcStatus: r.qc_status,
      rejectionReason: r.rejection_reason || undefined,
    }));

    const vendors: Vendor[] = vendorsRes.rows.map((r) => ({
      vendorCode: r.vendor_code,
      vendorName: r.vendor_name,
      category: r.category,
      contactPerson: r.contact_person || '',
      email: r.email || '',
      phone: r.phone || '',
      leadTimeDays: Number(r.lead_time_days) || 0,
      qualityRating: Number(r.quality_rating) || 0,
      status: r.status,
    }));

    return { orders, items, vendors };
  } finally {
    client.release();
  }
}

export async function insertOrderInPostgres(order: GRNOrder, items: GRNItem[]): Promise<boolean> {
  const pool = getPostgresPool();
  if (!pool) return false;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO public.grn_orders 
       (grn_number, po_number, vendor_name, received_date, warehouse, carrier_tracking, inspector, total_items, total_value, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        order.grnNumber,
        order.poNumber,
        order.vendorName,
        order.receivedDate,
        order.warehouse,
        order.carrierTracking || null,
        order.inspector,
        order.totalItems,
        order.totalValue,
        order.status,
        order.notes || null,
      ]
    );

    for (const it of items) {
      await client.query(
        `INSERT INTO public.grn_items 
         (id, grn_number, item_code, description, category, po_qty, received_qty, accepted_qty, rejected_qty, unit, unit_price, batch_number, qc_status, rejection_reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          it.id,
          order.grnNumber,
          it.itemCode,
          it.description,
          it.category || null,
          it.poQty,
          it.receivedQty,
          it.acceptedQty,
          it.rejectedQty,
          it.unit,
          it.unitPrice,
          it.batchNumber || null,
          it.qcStatus,
          it.rejectionReason || null,
        ]
      );
    }

    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateOrderStatusInPostgres(
  grnNumber: string,
  status: string,
  notes?: string
): Promise<boolean> {
  const pool = getPostgresPool();
  if (!pool) return false;

  const client = await pool.connect();
  try {
    if (notes !== undefined) {
      await client.query(
        'UPDATE public.grn_orders SET status = $1, notes = $2, updated_at = NOW() WHERE grn_number = $3',
        [status, notes, grnNumber]
      );
    } else {
      await client.query(
        'UPDATE public.grn_orders SET status = $1, updated_at = NOW() WHERE grn_number = $2',
        [status, grnNumber]
      );
    }
    return true;
  } finally {
    client.release();
  }
}

export async function updateItemQcInPostgres(
  itemId: string,
  qcStatus: string,
  acceptedQty?: number,
  rejectedQty?: number,
  rejectionReason?: string
): Promise<boolean> {
  const pool = getPostgresPool();
  if (!pool) return false;

  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE public.grn_items 
       SET qc_status = $1, 
           accepted_qty = COALESCE($2, accepted_qty), 
           rejected_qty = COALESCE($3, rejected_qty), 
           rejection_reason = COALESCE($4, rejection_reason),
           updated_at = NOW()
       WHERE id = $5`,
      [qcStatus, acceptedQty ?? null, rejectedQty ?? null, rejectionReason ?? null, itemId]
    );
    return true;
  } finally {
    client.release();
  }
}

export async function insertVendorInPostgres(vendor: Vendor): Promise<boolean> {
  const pool = getPostgresPool();
  if (!pool) return false;

  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO public.vendors 
       (vendor_code, vendor_name, category, contact_person, email, phone, lead_time_days, quality_rating, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        vendor.vendorCode,
        vendor.vendorName,
        vendor.category,
        vendor.contactPerson || null,
        vendor.email || null,
        vendor.phone || null,
        vendor.leadTimeDays,
        vendor.qualityRating,
        vendor.status,
      ]
    );
    return true;
  } finally {
    client.release();
  }
}
