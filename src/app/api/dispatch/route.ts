import { NextResponse } from 'next/server';
import {
  getStoredDispatches,
  addStoredDispatch,
  getStoredFinishedGoods,
} from '@/lib/store/inventoryStore';
import { notifyDispatchCreated } from '@/lib/email/mailer';
import { DispatchRecord } from '@/types/inventory';

export async function GET(request: Request) {
  try {
    const dispatches = getStoredDispatches();
    const finishedGoods = getStoredFinishedGoods();

    return NextResponse.json({
      success: true,
      dispatches,
      finishedGoods,
      totalDispatches: dispatches.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('Dispatch GET error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to retrieve dispatches' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customerName,
      customerEmail,
      destination,
      productCode,
      productName,
      batchNumber,
      totalQuantity,
      dispatchDate,
      dispatchTime,
      transporterName,
      vehicleNumber,
      gatePassNumber,
      responsiblePerson,
      notes,
    } = body;

    const qty = Number(totalQuantity);
    if (!customerName || !productCode || !qty || qty <= 0) {
      return NextResponse.json(
        { success: false, error: 'Missing customerName, productCode, or valid totalQuantity' },
        { status: 400 }
      );
    }

    // Verify finished goods stock availability
    const finishedGoods = getStoredFinishedGoods();
    const matchingFg = finishedGoods.find(
      (g) => g.productCode.toLowerCase() === productCode.toLowerCase()
    );
    if (matchingFg && matchingFg.availableQuantity !== undefined && qty > matchingFg.availableQuantity) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot dispatch ${qty} units. Only ${matchingFg.availableQuantity} units available in Finished Goods stock.`,
        },
        { status: 400 }
      );
    }

    const dispatches = getStoredDispatches();
    const dcNumber = `DC-2026-${String(dispatches.length + 101).padStart(3, '0')}`;
    const gatePass = gatePassNumber || `GP-OUT-${dispatches.length + 51}`;

    const newDispatch: DispatchRecord = {
      id: `dc-${Date.now()}`,
      dcNumber,
      customerName,
      destination: destination || 'Customer Plant / Warehouse',
      productCode,
      productName: productName || 'Finished Goods Product',
      batchNumber: batchNumber || '',
      quantityDispatched: qty,
      dispatchDate: dispatchDate || new Date().toISOString().slice(0, 10),
      dispatchTime: dispatchTime || new Date().toTimeString().slice(0, 5),
      transporterName: transporterName || 'Plant Logistics Carrier',
      vehicleNumber: vehicleNumber || 'MH-12-OUT-9999',
      gatePassNumber: gatePass,
      responsiblePerson: responsiblePerson || 'Dispatch Officer',
      status: 'DISPATCHED',
      notes: notes || `Outward dispatch of ${qty} units via ${vehicleNumber || 'truck'}.`,
    };

    const saved = addStoredDispatch(newDispatch);

    // Notify Customer & Logistics via Email
    try {
      await notifyDispatchCreated({
        dispatchNumber: saved.dcNumber,
        customerName: saved.customerName,
        customerEmail: customerEmail || undefined,
        totalQuantity: saved.quantityDispatched,
        productName: saved.productName,
        vehicleNumber: saved.vehicleNumber,
        responsiblePerson: saved.responsiblePerson,
      });
    } catch (mailErr) {
      console.warn('Dispatch notification email error:', mailErr);
    }

    return NextResponse.json({
      success: true,
      message: `Delivery Challan ${dcNumber} generated: ${qty} units dispatched to ${customerName}`,
      dispatch: saved,
    });
  } catch (err: unknown) {
    console.error('Dispatch POST error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to create dispatch' },
      { status: 500 }
    );
  }
}
