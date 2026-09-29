import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth/userService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const authResult = authenticateUser({
      email: normalizedEmail,
      password: String(password),
    });

    if (!authResult.success) {
      if (authResult.isPendingApproval) {
        return NextResponse.json(
          {
            success: false,
            isPendingApproval: true,
            error: authResult.error || 'Your account is under review and pending administrator approval.',
            profile: authResult.profile,
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: authResult.error || 'Invalid credentials or user not found.',
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: authResult.profile,
    });
  } catch (err) {
    console.error('Login API error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error during login.' },
      { status: 500 }
    );
  }
}
