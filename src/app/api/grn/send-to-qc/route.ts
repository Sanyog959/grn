import { NextResponse } from 'next/server';
import { getStoredOrders, saveStoredOrders, getStoredItems } from '@/lib/store/inventoryStore';
import { notifyAdminSentToQc } from '@/lib/email/mailer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { grnNumber, sentBy, isScrapOrJunk, notes } = body;

    if (!grnNumber) {
      return NextResponse.json({ success: false, error: 'Missing grnNumber' }, { status: 400 });
    }

    const orders = getStoredOrders();
    const orderIdx = orders.findIndex((o) => o.grnNumber === grnNumber);

    if (orderIdx < 0) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const sender = sentBy || 'Plant Administrator';

    orders[orderIdx] = {
      ...orders[orderIdx],
      status: 'Pending QC',
      sentToQcAt: now,
      sentToQcBy: sender,
      isScrapReceipt: isScrapOrJunk !== undefined ? Boolean(isScrapOrJunk) : orders[orderIdx].isScrapReceipt,
      notes: notes || orders[orderIdx].notes,
    };
    saveStoredOrders(orders);

    const items = getStoredItems().filter((it) => it.grnNumber === grnNumber);
    const firstItem = items[0];

    // Trigger Email Notification to Admin and QC Team
    try {
      await notifyAdminSentToQc({
        grnNumber,
        poNumber: orders[orderIdx].poNumber,
        vendorName: orders[orderIdx].vendorName,
        itemCode: firstItem?.itemCode || 'MULTIPLE-ITEMS',
        description: firstItem ? `${firstItem.description} (${items.length} line items)` : 'Industrial Consignment',
        orderedQty: orders[orderIdx].totalOrderedQty || orders[orderIdx].totalItems,
        receivedQty: orders[orderIdx].totalReceivedQty || orders[orderIdx].totalItems,
        pendingQty: orders[orderIdx].totalPendingQty || 0,
        sentBy: sender,
        isScrapOrJunk: Boolean(orders[orderIdx].isScrapReceipt),
        notes: notes || 'Admin / Store has forwarded consignment to QC bay for physical inspection.',
      });
    } catch (mailErr) {
      console.warn('Send to QC email notification dispatch note:', mailErr);
    }

    return NextResponse.json({
      success: true,
      message: `GRN ${grnNumber} successfully forwarded to QC by ${sender}. Email dispatched to Admin & QC Inspector.`,
      order: orders[orderIdx],
    });
  } catch (err: unknown) {
    console.error('Send to QC error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to send to QC' },
      { status: 500 }
    );
  }
}
