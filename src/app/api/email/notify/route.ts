import { NextResponse } from 'next/server';
import {
  sendEmail,
  notifyAdminNewUserRegistered,
  notifyUserApproved,
  notifyGrnCreated,
  notifyQcCompleted,
  notifyDispatchCreated,
} from '@/lib/email/mailer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { eventType, payload } = body;

    let result;

    switch (eventType) {
      case 'USER_REGISTERED':
        result = await notifyAdminNewUserRegistered(payload);
        break;
      case 'USER_APPROVED':
        result = await notifyUserApproved(payload);
        break;
      case 'GRN_CREATED':
        result = await notifyGrnCreated(payload);
        break;
      case 'QC_COMPLETED':
        result = await notifyQcCompleted(payload);
        break;
      case 'DISPATCH_CREATED':
        result = await notifyDispatchCreated(payload);
        break;
      case 'CUSTOM':
        result = await sendEmail(payload);
        break;
      default:
        return NextResponse.json({ success: false, error: 'Unknown event type' }, { status: 400 });
    }

    return NextResponse.json({ ...result });
  } catch (err: unknown) {
    console.error('Email notification route error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
