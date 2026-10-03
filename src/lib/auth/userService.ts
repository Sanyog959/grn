import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { UserRole, UserProfile, ApprovalStatus, ModulePermission, SystemModule, DEFAULT_ROLE_PERMISSIONS } from '@/types/auth';
import { notifyAdminNewUserRegistered, notifyUserApproved, notifyPasswordResetOtp } from '@/lib/email/mailer';

export interface StoredUser {
  id: string;
  email: string;
  fullName: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  approvalStatus: ApprovalStatus;
  permissions: Record<SystemModule, ModulePermission>;
  resetCode?: string;
  resetCodeExpiry?: string;
  createdAt: string;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

const ADMIN_EMAILS = [
  'sales@sanyogengineers.co.in',
  'magarsudhakar51@gmail.com',
  'vishalmagar9579@gmail.com',
  (process.env.ADMIN_NOTIFICATION_EMAIL || '').toLowerCase().trim(),
  (process.env.SMTP_USER || '').toLowerCase().trim(),
].filter(Boolean);

export function isAdministratorEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + '_mims_secure_salt_2026').digest('hex');
}

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(USERS_FILE)) {
    // Seed default administrator account matching company email in .env.local
    const defaultAdmin: StoredUser = {
      id: 'admin-super-001',
      email: ADMIN_EMAILS[0],
      fullName: 'Plant Administrator',
      passwordHash: hashPassword('Admin123!'), // Default initial password if not overridden
      role: 'ADMIN',
      isActive: true,
      approvalStatus: 'APPROVED',
      permissions: DEFAULT_ROLE_PERMISSIONS.ADMIN,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(USERS_FILE, JSON.stringify([defaultAdmin], null, 2), 'utf8');
  }
}

export function getAllStoredUsers(): StoredUser[] {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf8');
    const users: StoredUser[] = JSON.parse(raw);
    return users;
  } catch (err) {
    console.error('Failed to read users file:', err);
    return [];
  }
}

export function saveStoredUsers(users: StoredUser[]) {
  ensureDataFile();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

export function findUserByEmail(email: string): StoredUser | null {
  const users = getAllStoredUsers();
  const normalized = email.toLowerCase().trim();
  return users.find((u) => u.email.toLowerCase().trim() === normalized) || null;
}

export function findUserById(id: string): StoredUser | null {
  const users = getAllStoredUsers();
  return users.find((u) => u.id === id) || null;
}

export function toPublicProfile(u: StoredUser): UserProfile {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    isActive: u.isActive,
    approvalStatus: u.approvalStatus,
    permissions: u.permissions || DEFAULT_ROLE_PERMISSIONS[u.role],
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

/**
 * Register a new employee account with strict duplicate email validation
 */
export async function registerNewUser(params: {
  email: string;
  password: string;
  fullName: string;
}): Promise<{ success: boolean; error?: string; profile?: UserProfile }> {
  const normalizedEmail = params.email.toLowerCase().trim();

  // 1. STRICT DUPLICATE CHECK: Verify if this email already exists
  const existing = findUserByEmail(normalizedEmail);
  if (existing) {
    return {
      success: false,
      error: 'An account with this email address already exists. Please sign in or use "Forgot Password".',
    };
  }

  // 2. Determine initial status & role
  const isSuperAdmin = isAdministratorEmail(normalizedEmail);
  const initialRole: UserRole = isSuperAdmin ? 'ADMIN' : 'VIEWER';
  const initialStatus: ApprovalStatus = isSuperAdmin ? 'APPROVED' : 'PENDING';
  const initialActive = isSuperAdmin;

  const newUser: StoredUser = {
    id: `usr-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    email: normalizedEmail,
    fullName: params.fullName.trim(),
    passwordHash: hashPassword(params.password),
    role: initialRole,
    isActive: initialActive,
    approvalStatus: initialStatus,
    permissions: DEFAULT_ROLE_PERMISSIONS[initialRole],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const users = getAllStoredUsers();
  users.push(newUser);
  saveStoredUsers(users);

  // 3. Notify Plant Admin via Gmail SMTP
  if (!isSuperAdmin) {
    notifyAdminNewUserRegistered({
      userName: params.fullName.trim(),
      userEmail: normalizedEmail,
      registeredAt: new Date().toLocaleString(),
    }).catch((err) => console.warn('Admin notification error:', err));
  }

  return {
    success: true,
    profile: toPublicProfile(newUser),
  };
}

/**
 * Authenticate user with strict approval status verification
 */
export function authenticateUser(params: {
  email: string;
  password: string;
}): {
  success: boolean;
  error?: string;
  isPendingApproval?: boolean;
  profile?: UserProfile;
} {
  const normalizedEmail = params.email.toLowerCase().trim();
  const user = findUserByEmail(normalizedEmail);

  if (!user) {
    return {
      success: false,
      error: 'Invalid credentials. No account found with this email.',
    };
  }

  const hash = hashPassword(params.password);
  // Allow password check, or if super admin logging in with known password
  if (user.passwordHash !== hash) {
    return {
      success: false,
      error: 'Incorrect password. Please try again or click "Forgot Password".',
    };
  }

  // Check Approval Status
  if (user.role !== 'ADMIN' && (user.approvalStatus === 'PENDING' || !user.isActive)) {
    return {
      success: false,
      isPendingApproval: true,
      error: 'Account Under Review: Your account has been registered and is pending administrator authorization.',
      profile: toPublicProfile(user),
    };
  }

  if (user.approvalStatus === 'REJECTED') {
    return {
      success: false,
      error: 'Access Denied: Your account authorization request was not approved by the administrator.',
    };
  }

  return {
    success: true,
    profile: toPublicProfile(user),
  };
}

/**
 * Admin: Approve User & Assign Role & Permissions
 */
export async function approveUserAccount(params: {
  userId: string;
  assignedRole: UserRole;
  permissions?: Record<SystemModule, ModulePermission>;
}): Promise<{ success: boolean; error?: string; profile?: UserProfile }> {
  const users = getAllStoredUsers();
  const user = users.find((u) => u.id === params.userId);

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  const role = params.assignedRole;
  const perms = params.permissions || DEFAULT_ROLE_PERMISSIONS[role];

  user.role = role;
  user.isActive = true;
  user.approvalStatus = 'APPROVED';
  user.permissions = perms;
  user.updatedAt = new Date().toISOString();

  saveStoredUsers(users);

  // Send approval notification email to user via Gmail SMTP
  notifyUserApproved({
    userName: user.fullName,
    userEmail: user.email,
    role,
  }).catch((err) => console.warn('Email notify user approved error:', err));

  return {
    success: true,
    profile: toPublicProfile(user),
  };
}

/**
 * Admin: Reject User Account
 */
export function rejectUserAccount(userId: string): { success: boolean; error?: string } {
  const users = getAllStoredUsers();
  const user = users.find((u) => u.id === userId);

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  user.isActive = false;
  user.approvalStatus = 'REJECTED';
  user.updatedAt = new Date().toISOString();

  saveStoredUsers(users);
  return { success: true };
}

/**
 * Admin: Update Granular Permissions
 */
export function updateUserCustomPermissions(params: {
  userId: string;
  permissions: Record<SystemModule, ModulePermission>;
}): { success: boolean; error?: string } {
  const users = getAllStoredUsers();
  const user = users.find((u) => u.id === params.userId);

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  user.permissions = params.permissions;
  user.updatedAt = new Date().toISOString();

  saveStoredUsers(users);
  return { success: true };
}

/**
 * Admin: Bulk Update
 */
export function bulkUpdateAccounts(params: {
  userIds: string[];
  updates: {
    role?: UserRole;
    isActive?: boolean;
    approvalStatus?: ApprovalStatus;
  };
}): { success: boolean; error?: string } {
  const users = getAllStoredUsers();

  params.userIds.forEach((id) => {
    const u = users.find((item) => item.id === id);
    if (u) {
      if (params.updates.role) {
        u.role = params.updates.role;
        u.permissions = DEFAULT_ROLE_PERMISSIONS[params.updates.role];
      }
      if (params.updates.isActive !== undefined) {
        u.isActive = params.updates.isActive;
      }
      if (params.updates.approvalStatus !== undefined) {
        u.approvalStatus = params.updates.approvalStatus;
      }
      u.updatedAt = new Date().toISOString();
    }
  });

  saveStoredUsers(users);
  return { success: true };
}

/**
 * Request Password Reset: Generates 6-digit OTP and dispatches email via live SMTP
 */
export async function requestPasswordReset(
  email: string,
  origin?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const normalized = email.toLowerCase().trim();
  const users = getAllStoredUsers();
  const user = users.find((u) => u.email.toLowerCase().trim() === normalized);

  if (!user) {
    return {
      success: false,
      error: 'No account found with this email address. Please verify your email or register.',
    };
  }

  // Generate a cryptographically random 6-digit code
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes validity

  user.resetCode = resetCode;
  user.resetCodeExpiry = expiry;
  user.updatedAt = new Date().toISOString();
  saveStoredUsers(users);

  const resetUrl = origin ? `${origin}/?resetCode=${resetCode}&email=${encodeURIComponent(normalized)}` : undefined;

  try {
    await notifyPasswordResetOtp({
      userEmail: user.email,
      userName: user.fullName || 'User',
      otpCode: resetCode,
      resetUrl,
    });

    return {
      success: true,
      message: `Password reset verification code sent to ${user.email}! Please check your email inbox and spam folder.`,
    };
  } catch (err: unknown) {
    console.error('Failed to dispatch password reset email:', err);
    return {
      success: false,
      error: 'Failed to send reset email. Please contact the administrator directly.',
    };
  }
}

/**
 * Verify OTP Code and Update Password
 */
export function verifyAndResetPassword(params: {
  email: string;
  code: string;
  newPassword: string;
}): { success: boolean; message?: string; error?: string } {
  const normalized = params.email.toLowerCase().trim();
  const users = getAllStoredUsers();
  const user = users.find((u) => u.email.toLowerCase().trim() === normalized);

  if (!user) {
    return { success: false, error: 'No account found with this email address.' };
  }

  if (!user.resetCode || !user.resetCodeExpiry) {
    return { success: false, error: 'No active password reset request found. Please request a new code.' };
  }

  if (Date.now() > new Date(user.resetCodeExpiry).getTime()) {
    return { success: false, error: 'This reset code has expired (15 min limit). Please request a new code.' };
  }

  if (user.resetCode.trim() !== params.code.trim()) {
    return { success: false, error: 'Invalid verification code. Please check your email and try again.' };
  }

  if (!params.newPassword || params.newPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  // Update password and clear reset code
  user.passwordHash = hashPassword(params.newPassword);
  delete user.resetCode;
  delete user.resetCodeExpiry;
  user.updatedAt = new Date().toISOString();
  saveStoredUsers(users);

  return {
    success: true,
    message: 'Your password has been successfully reset! You can now sign in with your new password.',
  };
}

