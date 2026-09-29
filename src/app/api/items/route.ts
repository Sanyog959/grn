import { NextResponse } from 'next/server';
import { getSupabaseFromRequest } from '@/lib/supabase/server';
import { updateItemQcInDb } from '@/lib/supabase/service';
import { updateItemQcInPostgres, fetchAllFromPostgres } from '@/lib/db/service';
import { mapGrnItemFromDb, DatabaseGrnItemRow } from '@/lib/supabase/types';
import { getStoredItems, updateStoredItemQc } from '@/lib/store/inventoryStore';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const grnNumber = searchParams.get('grnNumber');
  const qcStatus = searchParams.get('qcStatus');

  const localItems = getStoredItems();

  // 1. Try PostgreSQL
  try {
    const pgData = await fetchAllFromPostgres();
    if (pgData && pgData.items && pgData.items.length > 0) {
      let items = pgData.items;
      if (grnNumber) {
        items = items.filter((it) => it.grnNumber === grnNumber);
      }
      if (qcStatus && qcStatus !== 'all') {
        items = items.filter((it) => it.qcStatus === qcStatus);
      }

      return NextResponse.json({
        success: true,
        source: 'supabase_postgres',
        connected: true,
        items,
        total: items.length,
      });
    }
  } catch (pgErr: unknown) {
    console.warn('PostgreSQL items query fallback:', pgErr);
  }

  // 2. Try Supabase Client
  const supabase = getSupabaseFromRequest(request);

  if (supabase) {
    try {
      let query = supabase.from('grn_items').select('*').order('id', { ascending: true });

      if (grnNumber) {
        query = query.eq('grn_number', grnNumber);
      }
      if (qcStatus && qcStatus !== 'all') {
        query = query.eq('qc_status', qcStatus);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        const items = (data as DatabaseGrnItemRow[]).map(mapGrnItemFromDb);
        return NextResponse.json({
          success: true,
          source: 'supabase',
          connected: true,
          items,
          total: items.length,
        });
      }
    } catch (err: unknown) {
      console.warn('Supabase items query fallback:', err);
    }
  }

  // 3. Fallback to Local Persistent Store
  let items = localItems;
  if (grnNumber) {
    items = items.filter((it) => it.grnNumber === grnNumber);
  }
  if (qcStatus && qcStatus !== 'all') {
    items = items.filter((it) => it.qcStatus === qcStatus);
  }

  return NextResponse.json({
    success: true,
    source: 'local_store',
    connected: false,
    items,
    total: items.length,
  });
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { itemId, qcStatus, acceptedQty, rejectedQty, rejectionReason } = body as {
      itemId: string;
      qcStatus: 'Passed' | 'Under Review' | 'Failed';
      acceptedQty?: number;
      rejectedQty?: number;
      rejectionReason?: string;
    };

    if (!itemId || !qcStatus) {
      return NextResponse.json(
        { success: false, error: 'Missing itemId or qcStatus' },
        { status: 400 }
      );
    }

    // 1. Update local store
    updateStoredItemQc(itemId, qcStatus, rejectionReason);

    // 2. Try PostgreSQL
    try {
      await updateItemQcInPostgres(
        itemId,
        qcStatus,
        acceptedQty,
        rejectedQty,
        rejectionReason
      );
    } catch (pgErr: unknown) {
      console.warn('PostgreSQL item QC update fallback:', pgErr);
    }

    // 3. Try Supabase Client
    const supabase = getSupabaseFromRequest(request);
    if (supabase) {
      try {
        await updateItemQcInDb(
          supabase,
          itemId,
          qcStatus,
          acceptedQty,
          rejectedQty,
          rejectionReason
        );
      } catch (err: unknown) {
        console.warn('Supabase item QC update fallback:', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Item ${itemId} QC marked as ${qcStatus}`,
    });
  } catch (err) {
    console.error('Items PATCH error:', err);
    return NextResponse.json(
      { success: false, error: 'Invalid request payload' },
      { status: 400 }
    );
  }
}
