import { NextRequest, NextResponse } from 'next/server';
import {
  getAllStoredUsers,
  toPublicProfile,
  approveUserAccount,
  rejectUserAccount,
  updateUserCustomPermissions,
  bulkUpdateAccounts,
} from '@/lib/auth/userService';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { UserRole, DEFAULT_ROLE_PERMISSIONS, SystemModule, ModulePermission } from '@/types/auth';

export async function GET() {
  try {
    const localUsers = getAllStoredUsers().map(toPublicProfile);

    // If Supabase is connected, merge/ensure profiles are available
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data: dbProfiles } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (dbProfiles && dbProfiles.length > 0) {
          const mergedMap = new Map();
          localUsers.forEach((u) => mergedMap.set(u.email.toLowerCase(), u));
          dbProfiles.forEach((row) => {
            const emailKey = row.email.toLowerCase();
            const existing = mergedMap.get(emailKey);
            mergedMap.set(emailKey, {
              id: row.id || existing?.id,
              email: row.email,
              fullName: row.full_name || existing?.fullName || row.email.split('@')[0],
              role: (row.role || existing?.role || 'VIEWER') as UserRole,
              isActive: row.is_active !== undefined ? Boolean(row.is_active) : existing?.isActive ?? false,
              approvalStatus:
                row.approval_status || existing?.approvalStatus || (row.is_active ? 'APPROVED' : 'PENDING'),
              permissions: row.permissions || existing?.permissions || DEFAULT_ROLE_PERMISSIONS.VIEWER,
              createdAt: row.created_at || existing?.createdAt,
              updatedAt: row.updated_at || existing?.updatedAt,
            });
          });
          return NextResponse.json({ success: true, users: Array.from(mergedMap.values()) });
        }
      } catch (dbErr) {
        console.warn('Supabase profiles query error in users API:', dbErr);
      }
    }

    return NextResponse.json({ success: true, users: localUsers });
  } catch (err) {
    console.error('Get users API error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve users list' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, userId, userIds, assignedRole, permissions, updates } = body;

    const supabase = getSupabaseServerClient();

    if (action === 'APPROVE') {
      if (!userId || !assignedRole) {
        return NextResponse.json(
          { success: false, error: 'userId and assignedRole are required' },
          { status: 400 }
        );
      }

      const role = assignedRole as UserRole;
      const rolePerms = permissions || DEFAULT_ROLE_PERMISSIONS[role];

      // Update in local store
      const result = await approveUserAccount({
        userId,
        assignedRole: role,
        permissions: rolePerms,
      });

      // Update in Supabase if available
      if (supabase) {
        try {
          await supabase
            .from('profiles')
            .update({
              role,
              is_active: true,
              approval_status: 'APPROVED',
              permissions: rolePerms,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);
        } catch (dbErr) {
          console.warn('Supabase update warning during approval:', dbErr);
        }
      }

      return NextResponse.json(result);
    }

    if (action === 'REJECT') {
      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'userId is required' },
          { status: 400 }
        );
      }

      const result = rejectUserAccount(userId);

      if (supabase) {
        try {
          await supabase
            .from('profiles')
            .update({
              is_active: false,
              approval_status: 'REJECTED',
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);
        } catch (dbErr) {
          console.warn('Supabase update warning during rejection:', dbErr);
        }
      }

      return NextResponse.json(result);
    }

    if (action === 'UPDATE_PERMISSIONS') {
      if (!userId || !permissions) {
        return NextResponse.json(
          { success: false, error: 'userId and permissions are required' },
          { status: 400 }
        );
      }

      const result = updateUserCustomPermissions({
        userId,
        permissions: permissions as Record<SystemModule, ModulePermission>,
      });

      if (supabase) {
        try {
          await supabase
            .from('profiles')
            .update({
              permissions,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);
        } catch (dbErr) {
          console.warn('Supabase permissions update warning:', dbErr);
        }
      }

      return NextResponse.json(result);
    }

    if (action === 'BULK_UPDATE') {
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return NextResponse.json(
          { success: false, error: 'userIds array is required' },
          { status: 400 }
        );
      }

      const result = bulkUpdateAccounts({
        userIds,
        updates: updates || {},
      });

      if (supabase) {
        try {
          const payload: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
          };
          if (updates?.role) {
            payload.role = updates.role;
            payload.permissions = DEFAULT_ROLE_PERMISSIONS[updates.role as UserRole];
          }
          if (updates?.isActive !== undefined) payload.is_active = updates.isActive;
          if (updates?.approvalStatus !== undefined) payload.approval_status = updates.approvalStatus;

          await supabase.from('profiles').update(payload).in('id', userIds);
        } catch (dbErr) {
          console.warn('Supabase bulk update warning:', dbErr);
        }
      }

      return NextResponse.json(result);
    }

    return NextResponse.json(
      { success: false, error: 'Unknown action specified' },
      { status: 400 }
    );
  } catch (err) {
    console.error('Users API action error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to process admin user action' },
      { status: 500 }
    );
  }
}
