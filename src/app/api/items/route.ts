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
    const {
      itemId,
      qcStatus,
      acceptedQty,
      rejectedQty,
      rejectionReason,
      qcRemarks,
      inspectedBy,
      userRole,
    } = body as {
      itemId: string;
      qcStatus: 'Passed' | 'Under Review' | 'Failed' | 'HOLD' | 'Remark';
      acceptedQty?: number;
      rejectedQty?: number;
      rejectionReason?: string;
      qcRemarks?: string;
      inspectedBy?: string;
      userRole?: string;
    };

    if (!itemId || !qcStatus) {
      return NextResponse.json(
        { success: false, error: 'Missing itemId or qcStatus' },
        { status: 400 }
      );
    }

    // 1. Update local store
    updateStoredItemQc(itemId, qcStatus, rejectionReason, qcRemarks, inspectedBy, acceptedQty, rejectedQty);

    // Retrieve updated item details for stock logging
    const allItems = getStoredItems();
    const currentItem = allItems.find((it) => it.id === itemId);

    // 2. Automatically log stock transaction if item is Passed, Failed, or Remarked
    if (currentItem) {
      try {
        const { logStockTransaction } = await import('@/lib/store/inventoryStore');
        const qty = qcStatus === 'Passed' ? (acceptedQty ?? currentItem.receivedQty) : 0;
        const isScrap = Boolean(currentItem.isScrap);

        if (qcStatus === 'Passed' && qty > 0) {
          logStockTransaction({
            itemCode: currentItem.itemCode,
            itemName: currentItem.description,
            transactionType: isScrap ? 'JUNK_SCRAP_VERIFY' : 'QC_ACCEPT',
            referenceNumber: currentItem.grnNumber,
            changeQty: isScrap ? 0 : qty,
            location: isScrap ? 'SCRAP_VERIFIED' : 'STORE',
            performedBy: inspectedBy || 'Quality Tester',
            userRole: 'QC',
            remarks: isScrap
              ? `Junk/Scrap verification PASSED. ${qcRemarks || 'Material verified for recycling / salvage.'}`
              : qcRemarks || 'Material inspected & passed QC standards. Accepted to Store.',
          });
        } else if (qcStatus === 'Failed') {
          const failQty = rejectedQty ?? currentItem.receivedQty;
          logStockTransaction({
            itemCode: currentItem.itemCode,
            itemName: currentItem.description,
            transactionType: 'QC_REJECT',
            referenceNumber: currentItem.grnNumber,
            changeQty: 0,
            location: 'REJECTED',
            performedBy: inspectedBy || 'Quality Tester',
            userRole: 'QC',
            remarks: `REJECTED (${failQty} units): ${rejectionReason || qcRemarks || 'Failed QC dimensional/hardness threshold'}. Lot segregated.`,
          });
        } else if (qcStatus === 'Under Review' || qcStatus === 'Remark') {
          logStockTransaction({
            itemCode: currentItem.itemCode,
            itemName: currentItem.description,
            transactionType: 'QC_REMARK',
            referenceNumber: currentItem.grnNumber,
            changeQty: 0,
            location: 'HOLD',
            performedBy: inspectedBy || 'Quality Tester',
            userRole: 'QC',
            remarks: `QC REMARK / CONDITIONAL: ${qcRemarks || 'Technical remarks recorded for managerial review.'}`,
          });
        }
      } catch (stockErr) {
        console.warn('Stock ledger auto-logging fallback:', stockErr);
      }
    }

    // 3. Try PostgreSQL
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

    // 4. Try Supabase Client
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

    // 5. Broadcast notification to Admin for EVERY QC verdict: Approve, Reject, or Remark!
    try {
      const { notifyQcDecisionToAdmin } = await import('@/lib/email/mailer');
      await notifyQcDecisionToAdmin({
        grnNumber: currentItem?.grnNumber || 'QC-ITEM',
        itemCode: currentItem?.itemCode || itemId,
        description: currentItem?.description,
        decision: qcStatus,
        acceptedQty: acceptedQty ?? (qcStatus === 'Passed' ? (currentItem?.receivedQty || 0) : 0),
        rejectedQty: rejectedQty ?? (qcStatus === 'Failed' ? (currentItem?.receivedQty || 0) : 0),
        qcRemarks: qcRemarks || rejectionReason || 'Inspection completed',
        rejectionReason,
        inspectorName: inspectedBy || 'Quality Inspector',
        isScrapVerification: Boolean(currentItem?.isScrap),
      });
    } catch (mailErr) {
      console.warn('QC email notification fallback:', mailErr);
    }

    return NextResponse.json({
      success: true,
      message: `Item ${itemId} QC marked as ${qcStatus} with remarks recorded & Admin notified by email`,
      item: currentItem,
    });
  } catch (err) {
    console.error('Items PATCH error:', err);
    return NextResponse.json(
      { success: false, error: 'Invalid request payload' },
      { status: 400 }
    );
  }
}
