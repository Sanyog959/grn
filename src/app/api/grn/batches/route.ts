import { NextResponse } from 'next/server';
import {
  getStoredInwardBatches,
  getInwardBatchesForGrn,
  addStoredInwardBatch,
  getStoredOrders,
  getStoredItems,
} from '@/lib/store/inventoryStore';
import { notifyAdminSentToQc } from '@/lib/email/mailer';
import { GRNInwardBatch } from '@/types/inventory';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const grnNumber = searchParams.get('grnNumber');
    const itemCode = searchParams.get('itemCode');

    if (!grnNumber) {
      const allBatches = getStoredInwardBatches();
      return NextResponse.json({
        success: true,
        batches: allBatches,
        total: allBatches.length,
      });
    }

    const batches = getInwardBatchesForGrn(grnNumber, itemCode || undefined);
    return NextResponse.json({
      success: true,
      grnNumber,
      itemCode: itemCode || null,
      batches,
      total: batches.length,
    });
  } catch (err: unknown) {
    console.error('Batches GET error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to retrieve batches' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      grnNumber,
      itemCode,
      itemName,
      orderedQty,
      receivedQty,
      receivedDate,
      deliveryChallan,
      vehicleNumber,
      receivedBy,
      isScrapOrJunk,
      remarks,
    } = body;

    if (!grnNumber || !itemCode || receivedQty === undefined || Number(receivedQty) <= 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required batch fields (grnNumber, itemCode, receivedQty)' },
        { status: 400 }
      );
    }

    // Get existing batches to determine sequence number and cumulative sum
    const existing = getInwardBatchesForGrn(grnNumber, itemCode);
    const prevCumulative = existing.reduce((sum, b) => sum + Number(b.receivedQty), 0);
    const currentReceived = Number(receivedQty);
    const cumulative = prevCumulative + currentReceived;
    const totalOrder = Number(orderedQty) || (existing[0]?.orderedQty ?? cumulative);
    const pending = Math.max(0, totalOrder - cumulative);

    const newBatch: GRNInwardBatch = {
      id: `BATCH-${Date.now()}-${existing.length + 1}`,
      grnNumber,
      itemCode,
      itemName: itemName || 'Industrial Material',
      batchSeq: existing.length + 1,
      orderedQty: totalOrder,
      receivedQty: currentReceived,
      cumulativeReceivedQty: cumulative,
      pendingQty: pending,
      receivedDate: receivedDate || new Date().toISOString(),
      deliveryChallan: deliveryChallan || `CH-${Math.floor(1000 + Math.random() * 9000)}`,
      vehicleNumber: vehicleNumber || '',
      receivedBy: receivedBy || 'Store Receiver',
      isScrapOrJunk: Boolean(isScrapOrJunk),
      qcStatus: 'Pending QC',
      remarks: remarks || `Split installment #${existing.length + 1}: ${currentReceived} units inwarded.`,
      createdAt: new Date().toISOString(),
    };

    const { batch, updatedItem, updatedOrder } = addStoredInwardBatch(newBatch);

    // Retrieve order & item details for notification
    const orders = getStoredOrders();
    const order = orders.find((o) => o.grnNumber === grnNumber);
    const items = getStoredItems();
    const item = items.find((i) => i.grnNumber === grnNumber && i.itemCode === itemCode);

    // Notify Admin and QC Team via Email about this split delivery / scrap receipt
    try {
      await notifyAdminSentToQc({
        grnNumber,
        poNumber: order?.poNumber || 'N/A',
        vendorName: order?.vendorName || 'Supplier',
        itemCode,
        description: item?.description || itemName || 'Material Component',
        batchSeq: batch.batchSeq,
        orderedQty: batch.orderedQty,
        receivedQty: batch.receivedQty,
        pendingQty: batch.pendingQty,
        sentBy: receivedBy || 'Store Inward Bay',
        isScrapOrJunk: Boolean(isScrapOrJunk),
        notes: remarks || `Split Delivery Batch #${batch.batchSeq} inwarded and staged for QC inspection.`,
      });
    } catch (mailErr) {
      console.warn('Batch inward notification email dispatch note:', mailErr);
    }

    return NextResponse.json({
      success: true,
      message: `Inward batch #${batch.batchSeq} recorded: ${batch.receivedQty} units (Total Received: ${batch.cumulativeReceivedQty} / ${batch.orderedQty}, Pending: ${batch.pendingQty})`,
      batch,
      updatedItem,
      updatedOrder,
    });
  } catch (err: unknown) {
    console.error('Batches POST error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to save inward batch' },
      { status: 500 }
    );
  }
}
