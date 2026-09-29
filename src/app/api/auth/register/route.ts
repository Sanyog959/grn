import { NextRequest, NextResponse } from 'next/server';
import { registerNewUser, findUserByEmail } from '@/lib/auth/userService';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, fullName } = body;

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { success: false, error: 'Email, password, and full name are required.' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    // 1. Check local persistent store for duplicate email
    const existingLocal = findUserByEmail(normalizedEmail);
    if (existingLocal) {
      return NextResponse.json(
        {
          success: false,
          error: 'An account with this email address already exists. Please sign in or use "Forgot Password".',
        },
        { status: 409 }
      );
    }

    // 2. Check Supabase profiles table for duplicate email if Supabase is configured
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('email', normalizedEmail)
          .maybeSingle();

        if (existingProfile) {
          return NextResponse.json(
            {
              success: false,
              error: 'An account with this email address already exists. Please sign in or use "Forgot Password".',
            },
            { status: 409 }
          );
        }
      } catch (dbErr) {
        console.warn('Supabase profile duplicate check warning:', dbErr);
      }
    }

    // 3. Register user via userService (strict duplicate check + pending status + email notification)
    const result = await registerNewUser({
      email: normalizedEmail,
      password,
      fullName: String(fullName).trim(),
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Registration failed' },
        { status: result.error?.includes('already exists') ? 409 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        'Registration submitted successfully! Your account is now pending administrator approval.',
      profile: result.profile,
    });
  } catch (err) {
    console.error('Registration API error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error during registration.' },
      { status: 500 }
    );
  }
}
