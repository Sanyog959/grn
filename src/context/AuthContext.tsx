'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  UserRole,
  UserProfile,
  ApprovalStatus,
  ModulePermission,
  SystemModule,
  DEFAULT_ROLE_PERMISSIONS,
} from '@/types/auth';

const ADMIN_EMAILS = [
  'sales@sanyogengineers.co.in',
  'magarsudhakar51@gmail.com',
  'vishalmagar9579@gmail.com',
  (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').toLowerCase().trim(),
].filter(Boolean);

const isAdministratorEmail = (email?: string | null): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
};

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  isLoading: boolean;
  isAuthenticated: boolean;
  isApproved: boolean;
  isPendingApproval: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  confirmPasswordReset: (
    email: string,
    code: string,
    newPassword: string
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  refreshProfile: () => Promise<void>;
  updateUserRole: (userId: string, newRole: UserRole) => Promise<{ success: boolean; error?: string }>;
  approveUser: (
    userId: string,
    assignedRole: UserRole,
    permissions?: Partial<Record<SystemModule, ModulePermission>>
  ) => Promise<{ success: boolean; error?: string }>;
  rejectUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  updateUserPermissions: (
    userId: string,
    permissions: Partial<Record<SystemModule, ModulePermission>>
  ) => Promise<{ success: boolean; error?: string }>;
  bulkUpdateUsers: (
    userIds: string[],
    updates: { role?: UserRole; isActive?: boolean; approvalStatus?: ApprovalStatus }
  ) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_SESSION_KEY = 'mims_auth_session_profile';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = getSupabaseBrowserClient();

  // Helper to fetch live profile data
  const fetchProfile = useCallback(
    async (userId: string, email: string) => {
      const normalizedEmail = email.toLowerCase().trim();

      // 1. Try querying the internal status API first (reliable source of truth)
      try {
        const res = await fetch(`/api/auth/status?email=${encodeURIComponent(normalizedEmail)}&id=${encodeURIComponent(userId)}`, {
          cache: 'no-store',
        });
        if (res.ok) {
          const statusData = await res.json();
          if (statusData.success && statusData.user) {
            const u = statusData.user;
            const updatedProfile: UserProfile = {
              id: u.id,
              email: u.email,
              fullName: u.fullName,
              role: u.role as UserRole,
              isActive: Boolean(u.isActive),
              approvalStatus: u.approvalStatus as ApprovalStatus,
              permissions: u.permissions || DEFAULT_ROLE_PERMISSIONS[u.role as UserRole],
              createdAt: u.createdAt,
              updatedAt: u.updatedAt,
            };
            setProfile(updatedProfile);
            if (typeof window !== 'undefined') {
              localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(updatedProfile));
            }
            return updatedProfile;
          }
        }
      } catch (err) {
        console.warn('API profile fetch error:', err);
      }

      // 2. Fallback to Supabase profiles table
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

          if (!error && data) {
            const isSuperAdmin = isAdministratorEmail(normalizedEmail);
            const userRole = isSuperAdmin ? 'ADMIN' : ((data.role || 'VIEWER') as UserRole);
            const userActive = isSuperAdmin ? true : Boolean(data.is_active);
            const userStatus = isSuperAdmin ? 'APPROVED' : ((data.approval_status || (data.is_active ? 'APPROVED' : 'PENDING')) as ApprovalStatus);

            const updatedProfile: UserProfile = {
              id: data.id,
              email: data.email,
              fullName: data.full_name,
              role: userRole,
              isActive: userActive,
              approvalStatus: userStatus,
              permissions: data.permissions || DEFAULT_ROLE_PERMISSIONS[userRole],
              createdAt: data.created_at,
              updatedAt: data.updated_at,
            };
            setProfile(updatedProfile);
            if (typeof window !== 'undefined') {
              localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(updatedProfile));
            }
            return updatedProfile;
          }
        } catch (dbErr) {
          console.warn('Supabase fetchProfile error:', dbErr);
        }
      }

      // 3. Fallback default profile
      const isSuperAdmin = isAdministratorEmail(normalizedEmail);
      const fallbackProfile: UserProfile = {
        id: userId,
        email: normalizedEmail,
        fullName: normalizedEmail.split('@')[0],
        role: isSuperAdmin ? 'ADMIN' : 'VIEWER',
        isActive: isSuperAdmin,
        approvalStatus: isSuperAdmin ? 'APPROVED' : 'PENDING',
        permissions: DEFAULT_ROLE_PERMISSIONS[isSuperAdmin ? 'ADMIN' : 'VIEWER'],
      };
      setProfile(fallbackProfile);
      return fallbackProfile;
    },
    [supabase]
  );

  const refreshProfile = useCallback(async () => {
    if (user?.email) {
      await fetchProfile(user.id, user.email);
    } else if (profile?.email) {
      await fetchProfile(profile.id, profile.email);
    }
  }, [user, profile, fetchProfile]);

  // Initial Session Verification
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      // Check stored local session profile first
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(LOCAL_SESSION_KEY);
        if (stored) {
          try {
            const parsed: UserProfile = JSON.parse(stored);
            if (mounted && parsed && parsed.email) {
              setProfile(parsed);
              setUser({
                id: parsed.id,
                email: parsed.email,
                app_metadata: {},
                user_metadata: { full_name: parsed.fullName },
                aud: 'authenticated',
                created_at: parsed.createdAt || new Date().toISOString(),
              } as User);
            }
          } catch {
            localStorage.removeItem(LOCAL_SESSION_KEY);
          }
        }
      }

      // Check Supabase session if configured
      if (supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (mounted && session?.user) {
            setUser(session.user);
            await fetchProfile(session.user.id, session.user.email || '');
          }
        } catch (err) {
          console.warn('Supabase session load error:', err);
        }
      }

      if (mounted) {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen to Supabase auth changes
    let subscription: { unsubscribe: () => void } | null = null;
    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (mounted) {
          if (session?.user) {
            setUser(session.user);
            await fetchProfile(session.user.id, session.user.email || '');
          }
        }
      });
      subscription = data.subscription;
    }

    return () => {
      mounted = false;
      if (subscription) subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  // Sign In: Enforces Pending Approval check
  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    const normalizedEmail = email.toLowerCase().trim();

    try {
      // 1. Authenticate with server API
      const apiRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });

      const apiData = await apiRes.json();

      // Case A: User account is PENDING approval
      if (apiRes.status === 403 || apiData.isPendingApproval) {
        const pendingProfile: UserProfile = apiData.profile || {
          id: `usr-${normalizedEmail}`,
          email: normalizedEmail,
          fullName: normalizedEmail.split('@')[0],
          role: 'VIEWER',
          isActive: false,
          approvalStatus: 'PENDING',
          permissions: DEFAULT_ROLE_PERMISSIONS.VIEWER,
        };

        setUser({
          id: pendingProfile.id,
          email: pendingProfile.email,
          app_metadata: {},
          user_metadata: { full_name: pendingProfile.fullName },
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        } as User);
        setProfile(pendingProfile);

        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(pendingProfile));
        }

        setIsLoading(false);
        return {
          success: true, // Login established, but isPendingApproval will block dashboard access!
        };
      }

      // Case B: User credentials invalid or account rejected
      if (!apiRes.ok && !apiData.isPendingApproval) {
        // If server API rejected credentials, also try Supabase if configured
        if (supabase) {
          const { data: supaData, error: supaErr } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });

          if (supaErr) {
            setIsLoading(false);
            return { success: false, error: apiData.error || supaErr.message };
          }

          if (supaData.user) {
            setUser(supaData.user);
            const prof = await fetchProfile(supaData.user.id, supaData.user.email || '');

            // Check if rejected
            if (prof && prof.approvalStatus === 'REJECTED') {
              await signOut();
              setIsLoading(false);
              return {
                success: false,
                error: 'Access Denied: Your account registration was not approved by the administrator.',
              };
            }

            setIsLoading(false);
            return { success: true };
          }
        }

        setIsLoading(false);
        return { success: false, error: apiData.error || 'Invalid credentials or user not found.' };
      }

      // Case C: Authenticated successfully via API
      if (apiData.success && apiData.profile) {
        const approvedProf: UserProfile = apiData.profile;
        setUser({
          id: approvedProf.id,
          email: approvedProf.email,
          app_metadata: {},
          user_metadata: { full_name: approvedProf.fullName },
          aud: 'authenticated',
          created_at: approvedProf.createdAt || new Date().toISOString(),
        } as User);
        setProfile(approvedProf);

        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(approvedProf));
        }

        // Also sync Supabase session if configured
        if (supabase) {
          supabase.auth.signInWithPassword({ email: normalizedEmail, password }).catch(() => {});
        }

        setIsLoading(false);
        return { success: true };
      }

      setIsLoading(false);
      return { success: false, error: 'Sign in failed.' };
    } catch (err: unknown) {
      setIsLoading(false);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Login failed. Please check your credentials.',
      };
    }
  };

  // Sign Up: Strict Duplicate Prevention & Always Sets PENDING Status
  const signUp = async (email: string, password: string, fullName: string) => {
    setIsLoading(true);
    const normalizedEmail = email.toLowerCase().trim();

    try {
      // 1. Strict Duplicate Check via API route
      const apiRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          fullName: fullName.trim(),
        }),
      });

      const apiData = await apiRes.json();

      // DUPLICATE EMAIL DETECTED (HTTP 409)
      if (apiRes.status === 409 || (apiData.error && apiData.error.toLowerCase().includes('already exists'))) {
        setIsLoading(false);
        return {
          success: false,
          error: 'An account with this email address already exists. Please sign in or use "Forgot Password".',
        };
      }

      if (!apiRes.ok && !apiData.success) {
        setIsLoading(false);
        return {
          success: false,
          error: apiData.error || 'Registration failed.',
        };
      }

      // 2. Also register in Supabase Auth if client is configured
      if (supabase) {
        try {
          // Check if profile row already exists in Supabase table
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', normalizedEmail)
            .maybeSingle();

          if (existingProfile) {
            setIsLoading(false);
            return {
              success: false,
              error: 'An account with this email address already exists. Please sign in or use "Forgot Password".',
            };
          }

          const isSuperAdmin = isAdministratorEmail(normalizedEmail);
          const assignedRole: UserRole = isSuperAdmin ? 'ADMIN' : 'VIEWER';
          const assignedStatus: ApprovalStatus = isSuperAdmin ? 'APPROVED' : 'PENDING';
          const isUserActive = isSuperAdmin;

          const { data: supaData, error: supaErr } = await supabase.auth.signUp({
            email: normalizedEmail,
            password,
            options: {
              data: {
                full_name: fullName.trim(),
                role: assignedRole,
              },
            },
          });

          // Supabase duplicate email detection:
          // In Supabase Auth, when a user already exists and email confirmation is on,
          // Supabase returns an empty identities array [] with no error!
          if (
            supaData?.user &&
            Array.isArray(supaData.user.identities) &&
            supaData.user.identities.length === 0
          ) {
            setIsLoading(false);
            return {
              success: false,
              error: 'An account with this email address already exists. Please sign in or use "Forgot Password".',
            };
          }

          if (supaErr) {
            // Check for duplicate user message from Supabase
            if (supaErr.message.toLowerCase().includes('already registered') || supaErr.message.toLowerCase().includes('already exists')) {
              setIsLoading(false);
              return {
                success: false,
                error: 'An account with this email address already exists. Please sign in or use "Forgot Password".',
              };
            }
          }

          if (supaData?.user) {
            // Upsert profile into public.profiles table
            await supabase.from('profiles').upsert(
              [
                {
                  id: supaData.user.id,
                  email: normalizedEmail,
                  full_name: fullName.trim(),
                  role: assignedRole,
                  is_active: isUserActive,
                  approval_status: assignedStatus,
                  permissions: DEFAULT_ROLE_PERMISSIONS[assignedRole],
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
              ],
              { onConflict: 'id' }
            );
          }
        } catch (supaErr) {
          console.warn('Supabase secondary registration warning:', supaErr);
        }
      }

      // 3. Set the new user state
      const isSuperAdmin = isAdministratorEmail(normalizedEmail);
      const initialRole: UserRole = isSuperAdmin ? 'ADMIN' : 'VIEWER';
      const initialStatus: ApprovalStatus = isSuperAdmin ? 'APPROVED' : 'PENDING';
      const initialActive = isSuperAdmin;

      const newProfile: UserProfile = apiData.profile || {
        id: `usr-${Date.now()}`,
        email: normalizedEmail,
        fullName: fullName.trim(),
        role: initialRole,
        isActive: initialActive,
        approvalStatus: initialStatus,
        permissions: DEFAULT_ROLE_PERMISSIONS[initialRole],
        createdAt: new Date().toISOString(),
      };

      setUser({
        id: newProfile.id,
        email: newProfile.email,
        app_metadata: {},
        user_metadata: { full_name: newProfile.fullName },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as User);
      setProfile(newProfile);

      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(newProfile));
      }

      setIsLoading(false);
      return { success: true };
    } catch (err: unknown) {
      setIsLoading(false);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Registration failed. Please try again.',
      };
    }
  };

  // Password Reset - Request OTP Code via live SMTP
  const resetPassword = async (email: string) => {
    const normalizedEmail = email.toLowerCase().trim();
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REQUEST_CODE', email: normalizedEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to send reset code.' };
      }
      return { success: true, message: data.message };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Network error sending reset code.' };
    }
  };

  // Confirm Password Reset with Code & New Password
  const confirmPasswordReset = async (email: string, code: string, newPassword: string) => {
    const normalizedEmail = email.toLowerCase().trim();
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RESET_PASSWORD',
          email: normalizedEmail,
          code,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to update password.' };
      }
      return { success: true, message: data.message };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Network error resetting password.' };
    }
  };

  // Sign Out
  const signOut = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOCAL_SESSION_KEY);
    }
    setUser(null);
    setProfile(null);
  };

  // Admin: Update User Role
  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPROVE',
          userId,
          assignedRole: newRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };

      if (profile && profile.id === userId) {
        setProfile({ ...profile, role: newRole, permissions: DEFAULT_ROLE_PERMISSIONS[newRole] });
      }
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Role update failed' };
    }
  };

  // Admin: Approve User Account
  const approveUser = async (
    userId: string,
    assignedRole: UserRole,
    permissions?: Partial<Record<SystemModule, ModulePermission>>
  ) => {
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPROVE',
          userId,
          assignedRole,
          permissions: permissions || DEFAULT_ROLE_PERMISSIONS[assignedRole],
        }),
      });

      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };

      if (profile && profile.id === userId) {
        const updated: UserProfile = {
          ...profile,
          role: assignedRole,
          isActive: true,
          approvalStatus: 'APPROVED',
          permissions: permissions || DEFAULT_ROLE_PERMISSIONS[assignedRole],
        };
        setProfile(updated);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(updated));
        }
      }

      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Approval failed' };
    }
  };

  // Admin: Reject User Account
  const rejectUser = async (userId: string) => {
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REJECT',
          userId,
        }),
      });

      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };

      if (profile && profile.id === userId) {
        setProfile({ ...profile, isActive: false, approvalStatus: 'REJECTED' });
      }
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Rejection failed' };
    }
  };

  // Admin: Update Granular Permissions
  const updateUserPermissions = async (
    userId: string,
    permissions: Partial<Record<SystemModule, ModulePermission>>
  ) => {
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_PERMISSIONS',
          userId,
          permissions,
        }),
      });

      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };

      if (profile && profile.id === userId) {
        setProfile({ ...profile, permissions });
      }
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Permission update failed' };
    }
  };

  // Admin: Bulk User Actions
  const bulkUpdateUsers = async (
    userIds: string[],
    updates: { role?: UserRole; isActive?: boolean; approvalStatus?: ApprovalStatus }
  ) => {
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'BULK_UPDATE',
          userIds,
          updates,
        }),
      });

      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };

      if (profile && userIds.includes(profile.id)) {
        setProfile({
          ...profile,
          ...(updates.role ? { role: updates.role, permissions: DEFAULT_ROLE_PERMISSIONS[updates.role] } : {}),
          ...(updates.isActive !== undefined ? { isActive: updates.isActive } : {}),
          ...(updates.approvalStatus !== undefined ? { approvalStatus: updates.approvalStatus } : {}),
        });
      }

      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Bulk update failed' };
    }
  };

  const role: UserRole = profile?.role || 'VIEWER';
  const isAuthenticated = Boolean(user && profile);

  // An account is strictly considered approved ONLY if it is an ADMIN or has approvalStatus === 'APPROVED' and isActive === true
  const isApproved = Boolean(
    isAuthenticated && (role === 'ADMIN' || (profile?.approvalStatus === 'APPROVED' && profile?.isActive))
  );

  // An account is pending approval if authenticated but not approved or active
  const isPendingApproval = Boolean(
    isAuthenticated && role !== 'ADMIN' && (profile?.approvalStatus === 'PENDING' || !profile?.isActive)
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        isLoading,
        isAuthenticated,
        isApproved,
        isPendingApproval,
        signIn,
        signUp,
        signOut,
        resetPassword,
        confirmPasswordReset,
        refreshProfile,
        updateUserRole,
        approveUser,
        rejectUser,
        updateUserPermissions,
        bulkUpdateUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
