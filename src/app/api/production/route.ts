import { NextResponse } from 'next/server';
import {
  getStoredProductionIssues,
  addStoredProductionIssue,
  updateStoredProductionIssue,
  saveStoredProductionIssues,
  getStoredFinishedGoods,
  addStoredFinishedGoods,
  getStoredItems,
  getCurrentStockForItem,
  logStockTransaction,
} from '@/lib/store/inventoryStore';
import {
  notifyProductionIssueCreated,
  notifyFinishedGoodsAdded,
  notifyProductionIssueAssigned,
  notifyProductionReportSubmitted,
} from '@/lib/email/mailer';
import { ProductionIssue, FinishedGoodsStock, ProductionReport } from '@/types/inventory';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const itemCode = searchParams.get('itemCode');

    const issues = getStoredProductionIssues();
    const finishedGoods = getStoredFinishedGoods();
    const allItems = getStoredItems();

    // Map approved items in STORE that are eligible for production issue
    const approvedStoreItems = allItems.filter(
      (it) => it.qcStatus === 'Passed' && (it.acceptedQty || it.receivedQty) > 0
    );

    const enrichedApprovedItems = approvedStoreItems.map((it) => {
      const currentStock = getCurrentStockForItem(it.itemCode);
      return {
        ...it,
        availableStoreStock: currentStock > 0 ? currentStock : it.acceptedQty || it.receivedQty,
      };
    });

    if (itemCode) {
      const filteredIssues = issues.filter(
        (i) => i.itemCode.toLowerCase() === itemCode.toLowerCase()
      );
      return NextResponse.json({
        success: true,
        issues: filteredIssues,
        finishedGoods: finishedGoods.filter((g) => g.productCode.toLowerCase() === itemCode.toLowerCase()),
        approvedStoreItems: enrichedApprovedItems.filter((i) => i.itemCode.toLowerCase() === itemCode.toLowerCase()),
      });
    }

    return NextResponse.json({
      success: true,
      issues,
      finishedGoods,
      approvedStoreItems: enrichedApprovedItems,
      totalIssues: issues.length,
      totalFinishedGoods: finishedGoods.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('Production GET error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to retrieve production data' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      jobCardNumber,
      station,
      itemCode,
      itemName,
      quantityIssued,
      uom,
      productionManager,
      productionOfficer,
      responsiblePerson,
      remarks,
    } = body;

    if (!itemCode || !quantityIssued || Number(quantityIssued) <= 0) {
      return NextResponse.json(
        { success: false, error: 'Missing itemCode or valid quantityIssued' },
        { status: 400 }
      );
    }

    const issues = getStoredProductionIssues();
    const voucherNumber = `MIV-2026-${String(issues.length + 101).padStart(3, '0')}`;
    const qty = Number(quantityIssued);

    const prevStock = getCurrentStockForItem(itemCode);
    if (prevStock > 0 && qty > prevStock) {
      return NextResponse.json(
        { success: false, error: `Cannot issue ${qty} units. Available Store stock for ${itemCode} is only ${prevStock} units.` },
        { status: 400 }
      );
    }
    const remainingStoreStock = Math.max(0, prevStock - qty);

    const assignedOfficer = productionOfficer || productionManager || 'Production Officer';

    const newIssue: ProductionIssue = {
      id: `iss-${Date.now()}`,
      voucherNumber,
      jobCardNumber: jobCardNumber || `JC-${Math.floor(1000 + Math.random() * 9000)}`,
      station: station || 'Assembly / CNC Workstation',
      itemCode,
      itemName: itemName || 'Approved Store Material',
      quantityIssued: qty,
      uom: uom || 'PCS',
      productionManager: productionManager || 'Plant Production Manager',
      productionOfficer: assignedOfficer,
      responsiblePerson: responsiblePerson || assignedOfficer,
      issueDate: new Date().toISOString(),
      status: 'PENDING_RECEIPT', // Starts pending receipt by production officer!
      remainingStoreStock,
      remarks: remarks || `Issued ${qty} units from Store to ${assignedOfficer} at ${station}.`,
    };

    const saved = addStoredProductionIssue(newIssue);

    // Notify Production Officer and Admin via Email
    try {
      await notifyProductionIssueAssigned({
        voucherNumber: saved.voucherNumber,
        jobCardNumber: saved.jobCardNumber,
        itemCode: saved.itemCode,
        itemName: saved.itemName,
        quantityIssued: saved.quantityIssued,
        productionOfficer: assignedOfficer,
        station: saved.station,
        remarks: saved.remarks,
      });
    } catch (mailErr) {
      console.warn('Production issue assigned email notification notice:', mailErr);
    }

    return NextResponse.json({
      success: true,
      message: `Issued ${qty} units of ${itemCode} to ${assignedOfficer} under voucher ${voucherNumber}`,
      issue: saved,
    });
  } catch (err: unknown) {
    console.error('Production POST error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to issue material to production' },
      { status: 500 }
    );
  }
}

// PATCH / PUT: Handle Production Officer receiving stock OR Submitting Production Report
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { action, issueId } = body;

    if (!issueId) {
      return NextResponse.json({ success: false, error: 'Missing issueId' }, { status: 400 });
    }

    const issues = getStoredProductionIssues();
    const existing = issues.find((i) => i.id === issueId || i.voucherNumber === issueId);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Production issue record not found' }, { status: 404 });
    }

    // ACTION 1: Production Officer Acknowledges Receipt
    if (action === 'RECEIVE') {
      const officer = body.receivedBy || existing.productionOfficer || 'Production Officer';
      const updated = updateStoredProductionIssue(issueId, {
        status: 'IN_PROCESS',
        receivedAt: new Date().toISOString(),
        receivedBy: officer,
      });

      return NextResponse.json({
        success: true,
        message: `Stock acknowledged & received by ${officer}. Status updated to IN_PROCESS.`,
        issue: updated,
      });
    }

    // ACTION 2: Production Officer Submits Report (Ready to Use, Process Failed, Supplier Failed, 3 files, Remarks)
    if (action === 'REPORT') {
      const readyToUseQty = Math.max(0, Number(body.readyToUseQty) || 0);
      const failedProcessingQty = Math.max(0, Number(body.failedProcessingQty) || 0);
      const supplierFailedQty = Math.max(0, Number(body.supplierFailedQty) || 0);
      const totalReported = readyToUseQty + failedProcessingQty + supplierFailedQty;

      if (totalReported > Number(existing.quantityIssued)) {
        return NextResponse.json(
          {
            success: false,
            error: `Total reported units (${totalReported}) exceeds total issued quantity (${existing.quantityIssued}). Please reconcile batch numbers.`,
          },
          { status: 400 }
        );
      }

      const fileUrls: string[] = Array.isArray(body.fileUrls) ? body.fileUrls.filter(Boolean).slice(0, 3) : [];
      const remarks = String(body.remarks || '').trim();
      const reportedBy = body.reportedBy || existing.productionOfficer || 'Production Officer';

      const report: ProductionReport = {
        readyToUseQty,
        failedProcessingQty,
        supplierFailedQty,
        fileUrls,
        remarks,
        reportedBy,
        reportedAt: new Date().toISOString(),
      };

      const updated = updateStoredProductionIssue(issueId, {
        status: 'COMPLETED',
        report,
      });

      // 1. If readyToUseQty > 0, automatically stock into Finished Goods
      if (readyToUseQty > 0) {
        const batchNum = `BATCH-FG-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
        addStoredFinishedGoods({
          id: `fg-${Date.now()}`,
          productCode: `FG-${existing.itemCode}`,
          productName: `Finished ${existing.itemName}`,
          batchNumber: batchNum,
          sourceJobCard: existing.jobCardNumber,
          quantityProduced: readyToUseQty,
          availableQuantity: readyToUseQty,
          uom: existing.uom,
          productionManager: reportedBy,
          completionDate: new Date().toISOString(),
          qcPassed: true,
          storageLocation: 'FG_WAREHOUSE',
          remarks: `Production report completed. Ready to Use: ${readyToUseQty} units. ${remarks}`,
        });
      }

      // 2. If Process Failed > 0, log in stock ledger as Shopfloor scrap audit (changeQty: 0 since material was already deducted from Store during initial issue)
      if (failedProcessingQty > 0) {
        logStockTransaction({
          itemCode: existing.itemCode,
          itemName: existing.itemName,
          transactionType: 'SCRAP_ADJUSTMENT',
          referenceNumber: existing.voucherNumber,
          changeQty: 0,
          location: 'SHOPFLOOR_SCRAP',
          performedBy: reportedBy,
          userRole: 'PRODUCTION',
          remarks: `Internal processing defect: ${failedProcessingQty} units ruined during machining/assembly. Documented in scrap quarantine registry.`,
        });
      }

      // 3. If Supplier Failed > 0, log in stock ledger as Supplier Reject Hold (changeQty: 0 since material was already deducted from Store during initial issue)
      if (supplierFailedQty > 0) {
        logStockTransaction({
          itemCode: existing.itemCode,
          itemName: existing.itemName,
          transactionType: 'QC_REJECT',
          referenceNumber: existing.voucherNumber,
          changeQty: 0,
          location: 'SUPPLIER_REJECT_HOLD',
          performedBy: reportedBy,
          userRole: 'PRODUCTION',
          remarks: `Supplier raw material defect: ${supplierFailedQty} units segregated for supplier RMA / debit memo.`,
        });
      }

      // 4. Send email report to Admin
      try {
        await notifyProductionReportSubmitted({
          voucherNumber: existing.voucherNumber,
          jobCardNumber: existing.jobCardNumber,
          itemCode: existing.itemCode,
          itemName: existing.itemName,
          totalIssued: existing.quantityIssued,
          readyToUseQty,
          failedProcessingQty,
          supplierFailedQty,
          fileUrls,
          remarks,
          reportedBy,
        });
      } catch (mailErr) {
        console.warn('Production report email dispatch notice:', mailErr);
      }

      return NextResponse.json({
        success: true,
        message: `Production report submitted: ${readyToUseQty} ready to use, ${failedProcessingQty} process failure, ${supplierFailedQty} supplier failure. Admin notified!`,
        issue: updated,
      });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    console.error('Production PATCH error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to update production issue' },
      { status: 500 }
    );
  }
}

// Fallback PUT for legacy calls
export async function PUT(request: Request) {
  return PATCH(request);
}
