import { NextResponse } from 'next/server';
import {
  getStoredStockLedger,
  logStockTransaction,
  getCurrentStockForItem,
} from '@/lib/store/inventoryStore';
import { notifyStockMovement } from '@/lib/email/mailer';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const itemCode = searchParams.get('itemCode');

    const ledger = getStoredStockLedger();

    if (itemCode) {
      const filtered = ledger.filter(
        (l) => l.itemCode.toLowerCase() === itemCode.toLowerCase()
      );
      const currentStock = getCurrentStockForItem(itemCode);
      return NextResponse.json({
        success: true,
        itemCode,
        currentStock,
        entries: filtered,
        total: filtered.length,
      });
    }

    return NextResponse.json({
      success: true,
      entries: ledger.reverse(), // latest first
      total: ledger.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Stock GET error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve stock ledger' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      itemCode,
      itemName,
      transactionType,
      referenceNumber,
      changeQty,
      location,
      performedBy,
      userRole,
      remarks,
    } = body;

    if (!itemCode || changeQty === undefined || !transactionType) {
      return NextResponse.json(
        { success: false, error: 'Missing required stock parameters' },
        { status: 400 }
      );
    }

    const entry = logStockTransaction({
      itemCode,
      itemName,
      transactionType,
      referenceNumber: referenceNumber || 'MANUAL-ADJ',
      changeQty: Number(changeQty),
      location: location || 'STORE',
      performedBy: performedBy || 'QC / Warehouse',
      userRole: userRole || 'STORE',
      remarks: remarks || 'Stock ledger updated',
    });

    // Notify BOTH Admin and QA about important stock movement
    try {
      await notifyStockMovement({
        itemCode: entry.itemCode,
        itemName: entry.itemName,
        transactionType: entry.transactionType,
        referenceNumber: entry.referenceNumber,
        previousStock: entry.previousStock,
        changeQty: entry.changeQty,
        newStock: entry.newStock,
        performedBy: entry.performedBy,
        remarks: entry.remarks,
      });
    } catch (mailErr) {
      console.warn('Stock movement email dispatch notice:', mailErr);
    }

    return NextResponse.json({
      success: true,
      message: `Stock for ${itemCode} updated: ${entry.previousStock} -> ${entry.newStock} (${entry.changeQty > 0 ? '+' : ''}${entry.changeQty})`,
      entry,
    });
  } catch (err) {
    console.error('Stock POST error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to log stock transaction' },
      { status: 500 }
    );
  }
}
