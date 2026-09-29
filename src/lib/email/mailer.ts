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

/**
 * 3. GRN Inward Receipt -> Notify QC Team
 */
export async function notifyGrnCreated(params: {
  grnNumber: string;
  poNumber: string;
  vendorName: string;
  totalItems: number;
  warehouse: string;
  recipientEmails?: string[];
}) {
  const recipients = params.recipientEmails && params.recipientEmails.length > 0
    ? params.recipientEmails
    : [process.env.QC_TEAM_EMAIL || process.env.SMTP_USER || 'qc-team@company.com'];

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

      <p style="color: #1e3a8a; font-weight: 600; font-size: 13px;">Action Required: Quality Inspector must perform physical & dimensional inspection to accept or reject materials.</p>
    </div>
  `;
  return sendEmail({ to: recipients, subject, html });
}

/**
 * 4. QC Inspection Completed -> Notify Store / Purchase
 */
export async function notifyQcCompleted(params: {
  grnNumber: string;
  status: 'Approved' | 'Partial' | 'Rejected';
  inspectorName: string;
  notes?: string;
  recipientEmails?: string[];
}) {
  const recipients = params.recipientEmails && params.recipientEmails.length > 0
    ? params.recipientEmails
    : [process.env.STORE_TEAM_EMAIL || process.env.SMTP_USER || 'store@company.com'];

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
        ${params.notes ? `<p style="margin: 6px 0;"><strong>Notes:</strong> ${params.notes}</p>` : ''}
      </div>

      <p style="color: #334155; font-size: 13px;">
        ${isApproved
          ? 'Accepted quantities have been transferred to STORE location and are available for production issue.'
          : 'Rejected quantities have been routed to REJECTED location. Purchase officer notified for vendor debit note / return.'}
      </p>
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
        <p style="margin: 6px 0;"><strong>Quantity:</strong> ${params.totalQuantity} units</p>
      </div>

      <p style="color: #64748b; font-size: 13px;">Stock ledger updated with DISPATCH transaction.</p>
    </div>
  `;
  return sendEmail({ to: recipients, subject, html });
}
