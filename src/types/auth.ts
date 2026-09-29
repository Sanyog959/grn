export type UserRole =
  | 'ADMIN'
  | 'PURCHASE'
  | 'QC'
  | 'STORE'
  | 'PRODUCTION'
  | 'DISPATCH'
  | 'VIEWER';

export type ApprovalStatus = 'APPROVED' | 'PENDING' | 'REJECTED';

export type SystemModule =
  | 'dashboard'
  | 'purchase'
  | 'grn'
  | 'qc'
  | 'inventory'
  | 'production'
  | 'dispatch'
  | 'masters'
  | 'reports'
  | 'users';

export interface ModulePermission {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  approvalStatus: ApprovalStatus;
  permissions?: Partial<Record<SystemModule, ModulePermission>>;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoleConfig {
  name: UserRole;
  label: string;
  description: string;
  colorBadge: string;
  bgBadge: string;
  borderBadge: string;
}

export const ROLES_METADATA: Record<UserRole, RoleConfig> = {
  ADMIN: {
    name: 'ADMIN',
    label: 'Administrator',
    description: 'Full master access, role management, user approval, and system configuration',
    colorBadge: '#6b21a8',
    bgBadge: '#f3e8ff',
    borderBadge: '#d8b4fe',
  },
  PURCHASE: {
    name: 'PURCHASE',
    label: 'Purchase Officer',
    description: 'PO creation, vendor directory management, and balance tracking',
    colorBadge: '#1d4ed8',
    bgBadge: '#dbeafe',
    borderBadge: '#93c5fd',
  },
  QC: {
    name: 'QC',
    label: 'Quality Inspector',
    description: 'Dock inward material inspection, pass/reject decisions and defect logging',
    colorBadge: '#b45309',
    bgBadge: '#fef3c7',
    borderBadge: '#fde68a',
  },
  STORE: {
    name: 'STORE',
    label: 'Store / Warehouse',
    description: 'Warehouse stock balances, production issues, returns, and dispatch check',
    colorBadge: '#047857',
    bgBadge: '#d1fae5',
    borderBadge: '#6ee7b7',
  },
  PRODUCTION: {
    name: 'PRODUCTION',
    label: 'Production Engineer',
    description: 'Shopfloor material issue requests, consumption, and unused returns',
    colorBadge: '#0e7490',
    bgBadge: '#cffafe',
    borderBadge: '#67e8f9',
  },
  DISPATCH: {
    name: 'DISPATCH',
    label: 'Dispatch Logistics',
    description: 'Outbound sales delivery challans and customer order shipping',
    colorBadge: '#4338ca',
    bgBadge: '#e0e7ff',
    borderBadge: '#a5b4fc',
  },
  VIEWER: {
    name: 'VIEWER',
    label: 'Auditor / Viewer',
    description: 'Read-only access across inventory dashboards, ledgers, and reports',
    colorBadge: '#334155',
    bgBadge: '#f1f5f9',
    borderBadge: '#cbd5e1',
  },
};

export const ALL_SYSTEM_MODULES: { id: SystemModule; label: string; description: string }[] = [
  { id: 'dashboard', label: 'Overview Dashboard', description: 'Real-time KPIs, alerts, and workflow cards' },
  { id: 'purchase', label: 'Purchase Orders (PO)', description: 'Create and track Purchase Orders & PO Balances' },
  { id: 'grn', label: 'Goods Received Notes (GRN)', description: 'Inward dock material receiving and unloader logs' },
  { id: 'qc', label: 'Quality Control (QC)', description: 'Inspect inward lots, accept/reject, record reasons' },
  { id: 'inventory', label: 'Store & Stock Ledger', description: 'Current stock balances and immutable double-entry ledger' },
  { id: 'production', label: 'Production Floor', description: 'Issue materials to shopfloor & log returns from lines' },
  { id: 'dispatch', label: 'Dispatch & Shipping', description: 'Customer delivery notes and outbound dispatch challans' },
  { id: 'masters', label: 'Master Data', description: 'Vendors, Items, Customers, Locations, Units, Rejection reasons' },
  { id: 'reports', label: 'Reports & Analytics', description: 'Traceability, audit history, vendor quality scorecards' },
  { id: 'users', label: 'User & Access Control', description: 'Manage accounts, approve signups, and customize permissions' },
];

/**
 * Standard default permissions per role preset
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Record<SystemModule, ModulePermission>> = {
  ADMIN: {
    dashboard: { canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true },
    purchase: { canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true },
    grn: { canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true },
    qc: { canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true },
    inventory: { canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true },
    production: { canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true },
    dispatch: { canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true },
    masters: { canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true },
    reports: { canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true },
    users: { canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true },
  },
  PURCHASE: {
    dashboard: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    purchase: { canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: true },
    grn: { canView: true, canCreate: true, canEdit: false, canDelete: false, canApprove: false },
    qc: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    inventory: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    production: { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    dispatch: { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    masters: { canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: false },
    reports: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    users: { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
  },
  QC: {
    dashboard: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    purchase: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    grn: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    qc: { canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: true },
    inventory: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    production: { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    dispatch: { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    masters: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    reports: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    users: { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
  },
  STORE: {
    dashboard: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    purchase: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    grn: { canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: false },
    qc: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    inventory: { canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: true },
    production: { canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: true },
    dispatch: { canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: true },
    masters: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    reports: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    users: { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
  },
  PRODUCTION: {
    dashboard: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    purchase: { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    grn: { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    qc: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    inventory: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    production: { canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: false },
    dispatch: { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    masters: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    reports: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    users: { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
  },
  DISPATCH: {
    dashboard: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    purchase: { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    grn: { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    qc: { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    inventory: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    production: { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    dispatch: { canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: true },
    masters: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    reports: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    users: { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
  },
  VIEWER: {
    dashboard: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    purchase: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    grn: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    qc: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    inventory: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    production: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    dispatch: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    masters: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    reports: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    users: { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
  },
};

/**
 * Checks whether a given role or customized user profile has view access to a module
 */
export function hasModuleAccess(role: UserRole, module: string, profile?: UserProfile | null): boolean {
  if (role === 'ADMIN') return true;

  // Check custom permission override if present
  if (profile?.permissions && profile.permissions[module as SystemModule]) {
    return Boolean(profile.permissions[module as SystemModule]?.canView);
  }

  const roleDefaults = DEFAULT_ROLE_PERMISSIONS[role];
  if (roleDefaults && roleDefaults[module as SystemModule]) {
    return roleDefaults[module as SystemModule].canView;
  }

  return false;
}

/**
 * Checks whether a user can perform a specific action (view, create, edit, delete, approve)
 */
export function canUserPerformAction(
  profile: UserProfile | null,
  module: SystemModule,
  action: keyof ModulePermission
): boolean {
  if (!profile) return false;
  if (profile.role === 'ADMIN') return true;
  if (!profile.isActive || profile.approvalStatus !== 'APPROVED') return false;

  // Check custom permissions first
  if (profile.permissions && profile.permissions[module]) {
    return Boolean(profile.permissions[module]?.[action]);
  }

  // Fallback to role defaults
  const defaults = DEFAULT_ROLE_PERMISSIONS[profile.role]?.[module];
  return Boolean(defaults?.[action]);
}
