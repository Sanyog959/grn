import { NextResponse } from 'next/server';
import { requestPasswordReset, verifyAndResetPassword } from '@/lib/auth/userService';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, email, code, newPassword } = body;

    const origin = req.headers.get('origin') || undefined;

    if (action === 'REQUEST_CODE') {
      if (!email || typeof email !== 'string') {
        return NextResponse.json({ success: false, error: 'Email is required.' }, { status: 400 });
      }

      const result = await requestPasswordReset(email, origin);
      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    if (action === 'RESET_PASSWORD') {
      if (!email || !code || !newPassword) {
        return NextResponse.json(
          { success: false, error: 'Email, verification code, and new password are required.' },
          { status: 400 }
        );
      }

      const result = verifyAndResetPassword({ email, code, newPassword });
      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    return NextResponse.json({ success: false, error: 'Invalid action.' }, { status: 400 });
  } catch (err: unknown) {
    console.error('Password reset API error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
