import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, findUserById } from '@/lib/auth/userService';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    const userId = searchParams.get('id');

    if (!email && !userId) {
      return NextResponse.json(
        { success: false, error: 'Email or user ID is required' },
        { status: 400 }
      );
    }

    // 1. Check local store
    let user = null;
    if (email) {
      user = findUserByEmail(email.toLowerCase().trim());
    } else if (userId) {
      user = findUserById(userId);
    }

    if (user) {
      return NextResponse.json({
        success: true,
        approvalStatus: user.approvalStatus,
        isActive: user.isActive,
        role: user.role,
        permissions: user.permissions,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          isActive: user.isActive,
          approvalStatus: user.approvalStatus,
          permissions: user.permissions,
        },
      });
    }

    // 2. Fallback to Supabase profiles
    const supabase = getSupabaseServerClient();
    if (supabase) {
      let query = supabase.from('profiles').select('*');
      if (email) {
        query = query.eq('email', email.toLowerCase().trim());
      } else if (userId) {
        query = query.eq('id', userId);
      }
      const { data, error } = await query.maybeSingle();

      if (!error && data) {
        return NextResponse.json({
          success: true,
          approvalStatus: data.approval_status || (data.is_active ? 'APPROVED' : 'PENDING'),
          isActive: Boolean(data.is_active),
          role: data.role || 'VIEWER',
          permissions: data.permissions,
          user: {
            id: data.id,
            email: data.email,
            fullName: data.full_name,
            role: data.role || 'VIEWER',
            isActive: Boolean(data.is_active),
            approvalStatus: data.approval_status || (data.is_active ? 'APPROVED' : 'PENDING'),
            permissions: data.permissions,
          },
        });
      }
    }

    return NextResponse.json(
      { success: false, error: 'User not found' },
      { status: 404 }
    );
  } catch (err) {
    console.error('Status check API error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to check status' },
      { status: 500 }
    );
  }
}
