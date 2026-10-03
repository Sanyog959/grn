import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  mode: 'smtp' | 'preview_unconfigured';
}

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Universal email sender with automatic fallback to preview mode if SMTP credentials are not yet configured
 */
export async function sendEmail({ to, subject, html, text }: EmailOptions): Promise<EmailSendResult> {
  const from = process.env.SMTP_FROM || '"MIMS Inventory System" <notifications@company.com>';
  const transporter = getTransporter();

  if (!transporter) {
    console.info(`[Email Dispatch Preview] To: ${Array.isArray(to) ? to.join(', ') : to} | Subject: "${subject}" (Configure SMTP_HOST in .env.local for live dispatch)`);
    return {
      success: true,
      mode: 'preview_unconfigured',
      messageId: `preview-${Date.now()}`,
    };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>?/gm, ''),
    });

    return {
      success: true,
      messageId: info.messageId,
      mode: 'smtp',
    };
  } catch (err: unknown) {
    console.error('SMTP email dispatch error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to send email via SMTP',
      mode: 'smtp',
    };
  }
}

// ==============================================================================
// TRANSACTIONAL NOTIFICATIONS (MIMS Material Flow Events)
// ==============================================================================

/**
 * 1. New User Registration -> Notify Plant Admin
 */
export async function notifyAdminNewUserRegistered(params: {
  userName: string;
  userEmail: string;
  registeredAt?: string;
}) {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.SMTP_USER || 'admin@company.com';
  const subject = `⚠️ [MIMS Action Required] New User Registration Pending Approval: ${params.userName}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #6b21a8; margin-top: 0;">New User Awaiting Admin Approval</h2>
      <p style="color: #334155; font-size: 15px;">A new employee has registered for the Material Inventory Management System (MIMS) and requires access authorization.</p>
      
      <div style="background: #f8fafc; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #e2e8f0;">
        <p style="margin: 6px 0;"><strong>Name:</strong> ${params.userName}</p>
        <p style="margin: 6px 0;"><strong>Email:</strong> ${params.userEmail}</p>
        <p style="margin: 6px 0;"><strong>Status:</strong> <span style="background: #fef3c7; color: #b45309; padding: 2px 8px; border-radius: 4px; font-weight: 700;">PENDING APPROVAL</span></p>
      </div>

      <p style="color: #64748b; font-size: 13px;">Please log in to the MIMS Admin Panel to review and assign their role and module permissions.</p>
    </div>
  `;
  return sendEmail({ to: adminEmail, subject, html });
}

/**
 * 2. User Account Approved -> Notify User
 */
export async function notifyUserApproved(params: {
  userName: string;
  userEmail: string;
  role: string;
}) {
  const subject = `✓ [MIMS] Your Account Has Been Approved - Access Granted (${params.role})`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #059669; margin-top: 0;">Account Access Approved</h2>
      <p style="color: #334155; font-size: 15px;">Hello <strong>${params.userName}</strong>,</p>
      <p style="color: #334155; font-size: 15px;">Your MIMS Material Inventory account has been reviewed and approved by the system administrator.</p>
      
      <div style="background: #f0fdf4; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #bbf7d0;">
        <p style="margin: 6px 0;"><strong>Assigned Role:</strong> <span style="background: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 4px; font-weight: 700;">${params.role}</span></p>
        <p style="margin: 6px 0;"><strong>Account Status:</strong> ACTIVE</p>
      </div>

      <p style="color: #334155; font-size: 14px;">You can now log in and access your authorized production modules.</p>
    </div>
  `;
  return sendEmail({ to: params.userEmail, subject, html });
}

function getAdminAndQaRecipients(extraEmails?: string[]): string[] {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.SMTP_USER || 'sales@sanyogengineers.co.in';
  const qaEmail = process.env.QA_NOTIFICATION_EMAIL || process.env.QC_TEAM_EMAIL || 'magarsudhakar51@gmail.com';
  const list = [adminEmail, qaEmail, ...(extraEmails || [])].filter(Boolean);
  return Array.from(new Set(list));
}

/**
 * 3. GRN Inward Receipt -> Notify Both Admin and QC/QA Team
 */
export async function notifyGrnCreated(params: {
  grnNumber: string;
  poNumber: string;
  vendorName: string;
  totalItems: number;
  warehouse: string;
  recipientEmails?: string[];
}) {
  const recipients = getAdminAndQaRecipients(params.recipientEmails);

  const subject = `📦 [MIMS GRN Inward] New Material Received: ${params.grnNumber} (PO: ${params.poNumber})`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #1d4ed8; margin-top: 0;">Goods Received Note Logged (QC Pending)</h2>
      <p style="color: #334155; font-size: 15px;">A new shipment has arrived at inward bay and is staged in <strong>QC_PENDING</strong> location.</p>
      
      <div style="background: #eff6ff; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #bfdbfe;">
        <p style="margin: 6px 0;"><strong>GRN #:</strong> ${params.grnNumber}</p>
        <p style="margin: 6px 0;"><strong>PO #:</strong> ${params.poNumber}</p>
        <p style="margin: 6px 0;"><strong>Vendor:</strong> ${params.vendorName}</p>
        <p style="margin: 6px 0;"><strong>Warehouse:</strong> ${params.warehouse}</p>
        <p style="margin: 6px 0;"><strong>Quantity:</strong> ${params.totalItems} units</p>
      </div>

      <p style="color: #1e3a8a; font-weight: 600; font-size: 13px;">Action Required: Quality Inspector must perform physical & dimensional inspection with remarks.</p>
      <p style="color: #64748b; font-size: 12px;">Notice sent to Administrator and QA Team.</p>
    </div>
  `;
  return sendEmail({ to: recipients, subject, html });
}

/**
 * 4. QC Inspection Completed -> Notify Both Admin and QA Team
 */
export async function notifyQcCompleted(params: {
  grnNumber: string;
  status: 'Approved' | 'Partial' | 'Rejected';
  inspectorName: string;
  notes?: string;
  qcRemarks?: string;
  recipientEmails?: string[];
}) {
  const recipients = getAdminAndQaRecipients(params.recipientEmails);

  const isApproved = params.status === 'Approved';
  const color = isApproved ? '#059669' : '#dc2626';

  const subject = `${isApproved ? '✓' : '⚠️'} [MIMS QC Inspection] Result for ${params.grnNumber}: ${params.status.toUpperCase()}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: ${color}; margin-top: 0;">QC Inspection Complete: ${params.status}</h2>
      
      <div style="background: #f8fafc; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #e2e8f0;">
        <p style="margin: 6px 0;"><strong>GRN #:</strong> ${params.grnNumber}</p>
        <p style="margin: 6px 0;"><strong>Decision:</strong> <span style="font-weight: 800; color: ${color};">${params.status}</span></p>
        <p style="margin: 6px 0;"><strong>Inspector:</strong> ${params.inspectorName}</p>
        ${params.qcRemarks ? `<p style="margin: 6px 0;"><strong>QC Remarks:</strong> <span style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${params.qcRemarks}</span></p>` : ''}
        ${params.notes ? `<p style="margin: 6px 0;"><strong>Notes:</strong> ${params.notes}</p>` : ''}
      </div>

      <p style="color: #334155; font-size: 13px;">
        ${isApproved
          ? 'Accepted quantities have been transferred to STORE location and are available for production issue.'
          : 'Rejected quantities have been routed to REJECTED location. Purchase officer notified for vendor debit note / return.'}
      </p>
      <p style="color: #64748b; font-size: 12px;">Real-time update broadcast to Plant Administrator and QA.</p>
    </div>
  `;
  return sendEmail({ to: recipients, subject, html });
}

/**
 * 5. Stock Movement / Ledger Update -> Notify Both Admin and QA Team
 */
export async function notifyStockMovement(params: {
  itemCode: string;
  itemName?: string;
  transactionType: string;
  referenceNumber: string;
  previousStock: number;
  changeQty: number;
  newStock: number;
  performedBy: string;
  remarks?: string;
  recipientEmails?: string[];
}) {
  const recipients = getAdminAndQaRecipients(params.recipientEmails);

  const sign = params.changeQty > 0 ? '+' : '';
  const subject = `📊 [MIMS Stock Audit] ${params.itemCode}: ${params.previousStock} → ${params.newStock} (${sign}${params.changeQty})`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0f172a; margin-top: 0;">Stock Movement Logged in Ledger</h2>
      
      <div style="background: #f8fafc; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #e2e8f0;">
        <p style="margin: 6px 0;"><strong>Item Code:</strong> <span style="font-family: monospace; font-weight: 700;">${params.itemCode}</span></p>
        <p style="margin: 6px 0;"><strong>Material:</strong> ${params.itemName || 'Industrial Part'}</p>
        <p style="margin: 6px 0;"><strong>Movement:</strong> ${params.transactionType}</p>
        <p style="margin: 6px 0;"><strong>Ref #:</strong> ${params.referenceNumber}</p>
        <p style="margin: 6px 0;"><strong>Stock Trail:</strong> <span style="font-weight: 700; color: #2563eb;">${params.previousStock}</span> → <span style="font-weight: 700; color: ${params.changeQty >= 0 ? '#16a34a' : '#dc2626'};">${sign}${params.changeQty}</span> → <span style="font-weight: 700; color: #0f172a;">${params.newStock}</span></p>
        <p style="margin: 6px 0;"><strong>Logged By:</strong> ${params.performedBy}</p>
        ${params.remarks ? `<p style="margin: 6px 0;"><strong>Remarks:</strong> ${params.remarks}</p>` : ''}
      </div>

      <p style="color: #64748b; font-size: 12px;">This immutable audit entry has been logged to the MIMS double-entry ledger and broadcast to Administrator and QA.</p>
    </div>
  `;
  return sendEmail({ to: recipients, subject, html });
}

/**
 * 5. Outbound Dispatch Challan -> Notify Logistics & Customer
 */
export async function notifyDispatchCreated(params: {
  dispatchNumber: string;
  customerName: string;
  customerEmail?: string;
  totalQuantity: number;
  productName?: string;
  vehicleNumber?: string;
  responsiblePerson?: string;
}) {
  const recipients = [
    params.customerEmail,
    process.env.DISPATCH_TEAM_EMAIL || process.env.SMTP_USER || 'dispatch@company.com',
  ].filter(Boolean) as string[];

  const subject = `🚚 [MIMS Dispatch] Outbound Delivery Challan Generated: ${params.dispatchNumber}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #4338ca; margin-top: 0;">Material Dispatch Challan Ready</h2>
      <p style="color: #334155; font-size: 15px;">Materials have been released from Store and packaged for customer delivery.</p>
      
      <div style="background: #eef2ff; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #c7d2fe;">
        <p style="margin: 6px 0;"><strong>Challan #:</strong> ${params.dispatchNumber}</p>
        <p style="margin: 6px 0;"><strong>Customer:</strong> ${params.customerName}</p>
        ${params.productName ? `<p style="margin: 6px 0;"><strong>Item / Product:</strong> ${params.productName}</p>` : ''}
        <p style="margin: 6px 0;"><strong>Quantity:</strong> ${params.totalQuantity} units</p>
        ${params.vehicleNumber ? `<p style="margin: 6px 0;"><strong>Vehicle:</strong> ${params.vehicleNumber}</p>` : ''}
        ${params.responsiblePerson ? `<p style="margin: 6px 0;"><strong>Dispatch Officer:</strong> ${params.responsiblePerson}</p>` : ''}
      </div>

      <p style="color: #64748b; font-size: 13px;">Stock ledger updated with DISPATCH transaction.</p>
    </div>
  `;
  return sendEmail({ to: recipients, subject, html });
}

/**
 * 6. Admin / Store Sends Material to QC (Inward GRN or Junk/Scrap Stock Verification)
 */
export async function notifyAdminSentToQc(params: {
  grnNumber: string;
  poNumber: string;
  vendorName: string;
  itemCode: string;
  description: string;
  batchSeq?: number;
  orderedQty: number;
  receivedQty: number;
  pendingQty: number;
  sentBy: string;
  isScrapOrJunk?: boolean;
  notes?: string;
  recipientEmails?: string[];
}) {
  const recipients = getAdminAndQaRecipients(params.recipientEmails);
  const tag = params.isScrapOrJunk ? '⚠️ [JUNK/SCRAP VERIFICATION]' : '🔍 [QC INWARD DOCK]';
  const subject = `${tag} Material Forwarded to QC for Verification: ${params.grnNumber} (${params.itemCode})`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: ${params.isScrapOrJunk ? '#b45309' : '#1d4ed8'}; margin-top: 0;">
        ${params.isScrapOrJunk ? 'Junk / Scrap Stock Received for QC Verification' : 'Material Staged for Quality Control Inspection'}
      </h2>
      <p style="color: #334155; font-size: 15px;">
        Administrator / Store Officer <strong>${params.sentBy}</strong> has forwarded consignment to QC inspection.
      </p>

      <div style="background: ${params.isScrapOrJunk ? '#fffbeb' : '#eff6ff'}; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid ${params.isScrapOrJunk ? '#fde68a' : '#bfdbfe'};">
        <p style="margin: 6px 0;"><strong>GRN #:</strong> ${params.grnNumber}</p>
        <p style="margin: 6px 0;"><strong>PO #:</strong> ${params.poNumber || 'N/A'}</p>
        <p style="margin: 6px 0;"><strong>Supplier / Source:</strong> ${params.vendorName}</p>
        <p style="margin: 6px 0;"><strong>Item Code:</strong> <span style="font-family: monospace; font-weight: 700;">${params.itemCode}</span></p>
        <p style="margin: 6px 0;"><strong>Description:</strong> ${params.description}</p>
        <p style="margin: 6px 0;"><strong>Batch Delivery:</strong> Batch #${params.batchSeq || 1} (Received: <strong>${params.receivedQty}</strong> / Total Ordered: <strong>${params.orderedQty}</strong> | Pending: <strong>${params.pendingQty}</strong>)</p>
        ${params.isScrapOrJunk ? `<p style="margin: 6px 0; color: #b45309; font-weight: 700;">⚠️ JUNK / SCRAP VERIFICATION REQUIRED PRIOR TO WRITE-OFF</p>` : ''}
        ${params.notes ? `<p style="margin: 6px 0;"><strong>Remarks:</strong> ${params.notes}</p>` : ''}
      </div>

      <p style="color: #1e3a8a; font-weight: 600; font-size: 13px;">Action Required: QC Inspector must log test results (Approve, Reject, or Remark).</p>
      <p style="color: #64748b; font-size: 12px;">Automated notification sent to Administrator and QC Team.</p>
    </div>
  `;
  return sendEmail({ to: recipients, subject, html });
}

/**
 * 7. QC Inspection Decision -> Sent to Admin (Every Approve, Reject, or Remark)
 */
export async function notifyQcDecisionToAdmin(params: {
  grnNumber: string;
  itemCode: string;
  description?: string;
  decision: 'Approved' | 'Rejected' | 'Remark' | 'Passed' | 'Failed' | 'Under Review' | 'HOLD';
  acceptedQty: number;
  rejectedQty: number;
  qcRemarks: string;
  rejectionReason?: string;
  inspectorName: string;
  isScrapVerification?: boolean;
  recipientEmails?: string[];
}) {
  const recipients = getAdminAndQaRecipients(params.recipientEmails);
  const isApproved = params.decision === 'Approved' || params.decision === 'Passed';
  const isRejected = params.decision === 'Rejected' || params.decision === 'Failed';
  const isRemark = !isApproved && !isRejected;

  const color = isApproved ? '#059669' : isRejected ? '#dc2626' : '#d97706';
  const icon = isApproved ? '✓' : isRejected ? '❌' : '💬';
  const decisionLabel = isApproved ? 'APPROVED' : isRejected ? 'REJECTED' : 'REMARK / CONDITIONAL';

  const subject = `${icon} [MIMS QC Decision for Admin] ${params.grnNumber} - ${params.itemCode}: ${decisionLabel}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: ${color}; margin-top: 0;">
        QC Inspection Outcome: ${decisionLabel}
      </h2>
      <p style="color: #334155; font-size: 15px;">
        Quality Inspector <strong>${params.inspectorName}</strong> has logged inspection verdict for <strong>${params.grnNumber}</strong>.
      </p>

      <div style="background: #f8fafc; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #e2e8f0;">
        <p style="margin: 6px 0;"><strong>GRN #:</strong> ${params.grnNumber}</p>
        <p style="margin: 6px 0;"><strong>Item Code:</strong> <span style="font-family: monospace; font-weight: 700;">${params.itemCode}</span></p>
        ${params.description ? `<p style="margin: 6px 0;"><strong>Material:</strong> ${params.description}</p>` : ''}
        <p style="margin: 6px 0;"><strong>Decision:</strong> <span style="background: ${color}20; color: ${color}; padding: 3px 8px; border-radius: 4px; font-weight: 800;">${decisionLabel}</span></p>
        <p style="margin: 6px 0;"><strong>Accepted Qty:</strong> <span style="color: #059669; font-weight: 700;">${params.acceptedQty}</span></p>
        <p style="margin: 6px 0;"><strong>Rejected Qty:</strong> <span style="color: #dc2626; font-weight: 700;">${params.rejectedQty}</span></p>
        <p style="margin: 6px 0;"><strong>QC Remarks:</strong> <span style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; display: block; margin-top: 4px;">${params.qcRemarks}</span></p>
        ${params.rejectionReason ? `<p style="margin: 6px 0; color: #dc2626;"><strong>Rejection Reason:</strong> ${params.rejectionReason}</p>` : ''}
        ${params.isScrapVerification ? `<p style="margin: 6px 0; color: #b45309; font-weight: 700;">⚠️ Scrap / Junk Stock verification logged in audit ledger.</p>` : ''}
      </div>

      <p style="color: #334155; font-size: 13px;">
        ${isApproved ? 'Approved material is stocked into STORE and available to Issue to Production.' : isRejected ? 'Rejected material quarantined for vendor return / debit note.' : 'Material flagged with technical remarks for supervisory review.'}
      </p>
      <p style="color: #64748b; font-size: 12px;">Direct report sent to Administrator and QC Team.</p>
    </div>
  `;
  return sendEmail({ to: recipients, subject, html });
}

/**
 * 8. Material Issued to Production -> Notify Plant Admin & Production
 */
export async function notifyProductionIssueCreated(params: {
  voucherNumber: string;
  jobCardNumber: string;
  itemCode: string;
  itemName: string;
  quantityIssued: number;
  productionManager: string;
  responsiblePerson: string;
  station: string;
  remainingStoreStock?: number;
  recipientEmails?: string[];
}) {
  const recipients = getAdminAndQaRecipients(params.recipientEmails);
  const subject = `⚙️ [MIMS Production Issue] ${params.quantityIssued} units of ${params.itemCode} Issued to ${params.station}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #4f46e5; margin-top: 0;">Material Issued to Production Line</h2>
      
      <div style="background: #f5f3ff; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #ddd6fe;">
        <p style="margin: 6px 0;"><strong>MIV Voucher #:</strong> ${params.voucherNumber}</p>
        <p style="margin: 6px 0;"><strong>Job Card:</strong> ${params.jobCardNumber}</p>
        <p style="margin: 6px 0;"><strong>Material:</strong> ${params.itemName} (${params.itemCode})</p>
        <p style="margin: 6px 0;"><strong>Quantity Issued:</strong> <span style="font-weight: 800; color: #4f46e5;">${params.quantityIssued}</span> units</p>
        <p style="margin: 6px 0;"><strong>Station / Machine:</strong> ${params.station}</p>
        <p style="margin: 6px 0;"><strong>Production Manager:</strong> ${params.productionManager}</p>
        <p style="margin: 6px 0;"><strong>Responsible Operator:</strong> ${params.responsiblePerson}</p>
        ${params.remainingStoreStock !== undefined ? `<p style="margin: 6px 0;"><strong>Remaining Store Stock:</strong> ${params.remainingStoreStock} units</p>` : ''}
      </div>

      <p style="color: #64748b; font-size: 12px;">Logged in stock ledger (STORE -> PRODUCTION) and broadcast to Plant Administrator.</p>
    </div>
  `;
  return sendEmail({ to: recipients, subject, html });
}

/**
 * 9. Production Finished Goods Stocked -> Notify Management
 */
export async function notifyFinishedGoodsAdded(params: {
  productCode: string;
  productName: string;
  batchNumber: string;
  quantityProduced: number;
  productionManager: string;
  sourceJobCard?: string;
  storageLocation: string;
  recipientEmails?: string[];
}) {
  const recipients = getAdminAndQaRecipients(params.recipientEmails);
  const subject = `🏭 [MIMS Production Complete] ${params.quantityProduced} units of ${params.productName} Added to FG Stock`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #059669; margin-top: 0;">Finished Product Received into Stock</h2>
      
      <div style="background: #ecfdf5; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #a7f3d0;">
        <p style="margin: 6px 0;"><strong>Product Code:</strong> <span style="font-family: monospace; font-weight: 700;">${params.productCode}</span></p>
        <p style="margin: 6px 0;"><strong>Product Name:</strong> ${params.productName}</p>
        <p style="margin: 6px 0;"><strong>Batch #:</strong> ${params.batchNumber}</p>
        <p style="margin: 6px 0;"><strong>Quantity Completed:</strong> <span style="font-weight: 800; color: #059669;">${params.quantityProduced}</span> units</p>
        <p style="margin: 6px 0;"><strong>Production Manager:</strong> ${params.productionManager}</p>
        ${params.sourceJobCard ? `<p style="margin: 6px 0;"><strong>Job Card:</strong> ${params.sourceJobCard}</p>` : ''}
        <p style="margin: 6px 0;"><strong>Location:</strong> ${params.storageLocation}</p>
      </div>

      <p style="color: #64748b; font-size: 12px;">Available in Finished Goods inventory for customer delivery challan generation.</p>
    </div>
  `;
  return sendEmail({ to: recipients, subject, html });
}

/**
 * 10. Production Officer Assigned Stock -> Notify Production Officer & Plant Admin
 */
export async function notifyProductionIssueAssigned(params: {
  voucherNumber: string;
  jobCardNumber: string;
  itemCode: string;
  itemName: string;
  quantityIssued: number;
  productionOfficer: string;
  station: string;
  remarks?: string;
  recipientEmails?: string[];
}) {
  const recipients = getAdminAndQaRecipients(params.recipientEmails);
  const subject = `⚙️ [Action: Receive Stock] ${params.quantityIssued} units of ${params.itemCode} assigned to ${params.productionOfficer}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #4f46e5; margin-top: 0;">Stock Issued to Production - Awaiting Receipt</h2>
      <p style="color: #334155; font-size: 14px;">Store has issued material to the shopfloor. The assigned production officer must acknowledge receipt.</p>
      
      <div style="background: #f5f3ff; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #ddd6fe;">
        <p style="margin: 6px 0;"><strong>Voucher #:</strong> ${params.voucherNumber}</p>
        <p style="margin: 6px 0;"><strong>Job Card:</strong> ${params.jobCardNumber}</p>
        <p style="margin: 6px 0;"><strong>Material:</strong> ${params.itemName} (${params.itemCode})</p>
        <p style="margin: 6px 0;"><strong>Quantity Issued:</strong> <span style="font-weight: 800; color: #4f46e5;">${params.quantityIssued}</span> units</p>
        <p style="margin: 6px 0;"><strong>Production Officer:</strong> ${params.productionOfficer}</p>
        <p style="margin: 6px 0;"><strong>Station:</strong> ${params.station}</p>
        ${params.remarks ? `<p style="margin: 6px 0;"><strong>Remarks:</strong> ${params.remarks}</p>` : ''}
      </div>

      <p style="color: #64748b; font-size: 12px;">Login to MIMS Production Floor to click 'Receive Stock'.</p>
    </div>
  `;
  return sendEmail({ to: recipients, subject, html });
}

/**
 * 11. Production Report Completed -> Notify Admin with full breakdown & file links
 */
export async function notifyProductionReportSubmitted(params: {
  voucherNumber: string;
  jobCardNumber: string;
  itemCode: string;
  itemName: string;
  totalIssued: number;
  readyToUseQty: number;
  failedProcessingQty: number;
  supplierFailedQty: number;
  fileUrls: string[];
  remarks: string;
  reportedBy: string;
  recipientEmails?: string[];
}) {
  const recipients = getAdminAndQaRecipients(params.recipientEmails);
  const subject = `📋 [Production Report] ${params.readyToUseQty} Ready, ${params.failedProcessingQty} Process Fail, ${params.supplierFailedQty} Supplier Fail - ${params.itemCode}`;

  const filesHtml = params.fileUrls && params.fileUrls.length > 0
    ? `<div style="margin-top: 10px;"><strong>Attachments / Defect Files:</strong><ul>` +
      params.fileUrls.map((url, idx) => `<li><a href="${url}" target="_blank" style="color: #2563eb;">Attachment ${idx + 1} (${url})</a></li>`).join('') +
      `</ul></div>`
    : '';

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0f172a; margin-top: 0;">Production Job Completed & Reported</h2>
      <p style="color: #475569; font-size: 14px;">Production Officer <strong>${params.reportedBy}</strong> has submitted the material processing report.</p>
      
      <div style="background: #f8fafc; padding: 16px; border-radius: 6px; margin: 16px 0; border: 1px solid #e2e8f0;">
        <p style="margin: 6px 0;"><strong>Voucher #:</strong> ${params.voucherNumber} | <strong>Job Card:</strong> ${params.jobCardNumber}</p>
        <p style="margin: 6px 0;"><strong>Item:</strong> ${params.itemName} (<code>${params.itemCode}</code>)</p>
        <p style="margin: 6px 0;"><strong>Total Issued:</strong> ${params.totalIssued} units</p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 16px;">
        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 12px; border-radius: 6px; text-align: center;">
          <div style="font-size: 11px; font-weight: 700; color: #047857; text-transform: uppercase;">Ready to Use (FG)</div>
          <div style="font-size: 20px; font-weight: 800; color: #065f46;">${params.readyToUseQty}</div>
        </div>
        <div style="background: #fff1f2; border: 1px solid #fecdd3; padding: 12px; border-radius: 6px; text-align: center;">
          <div style="font-size: 11px; font-weight: 700; color: #b91c1c; text-transform: uppercase;">Process Failed</div>
          <div style="font-size: 20px; font-weight: 800; color: #991b1b;">${params.failedProcessingQty}</div>
        </div>
        <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 12px; border-radius: 6px; text-align: center;">
          <div style="font-size: 11px; font-weight: 700; color: #b45309; text-transform: uppercase;">Supplier Failed</div>
          <div style="font-size: 20px; font-weight: 800; color: #92400e;">${params.supplierFailedQty}</div>
        </div>
      </div>

      <div style="background: #f1f5f9; padding: 12px; border-radius: 6px; margin-bottom: 14px;">
        <p style="margin: 0; font-size: 13px; color: #334155;"><strong>Officer Remarks:</strong> ${params.remarks || 'No remarks provided.'}</p>
      </div>

      ${filesHtml}

      <p style="color: #64748b; font-size: 12px; margin-top: 18px;">Ready to Use units have been automatically transferred to Finished Goods for customer dispatch.</p>
    </div>
  `;
  return sendEmail({ to: recipients, subject, html });
}

