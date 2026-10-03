'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { UserRole, ROLES_METADATA } from '@/types/auth';
import {
  LayoutDashboard,
  FileText,
  PackageCheck,
  ShieldCheck,
  Layers,
  Truck,
  Warehouse,
  Building2,
  BarChart3,
  Shield,
  X,
  ChevronRight,
} from 'lucide-react';

export type NavItemKey =
  | 'dashboard'
  | 'po-list'
  | 'po-new'
  | 'grn-list'
  | 'grn-new'
  | 'qc-pending'
  | 'qc-history'
  | 'inventory-stock'
  | 'inventory-ledger'
  | 'production-issue'
  | 'production-stock'
  | 'production-return'
  | 'dispatch-new'
  | 'dispatch-history'
  | 'master-items'
  | 'master-vendors'
  | 'master-customers'
  | 'master-units'
  | 'reports'
  | 'admin-users';

interface AppSidebarProps {
  activeItem: NavItemKey;
  onNavigate: (item: NavItemKey) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface MenuItem {
  key: NavItemKey;
  label: string;
  badge?: string;
  badgeColor?: string;
  icon: React.ComponentType<{ size?: number; className?: string; color?: string; style?: React.CSSProperties }>;
  allowedRoles: UserRole[];
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

/**
 * Maps sub-view keys to their primary sidebar menu key for bug-free active highlighting
 */
function isItemActive(itemKey: NavItemKey, currentActive: NavItemKey): boolean {
  if (itemKey === currentActive) return true;
  if (itemKey === 'po-list' && currentActive === 'po-new') return true;
  if (itemKey === 'grn-list' && currentActive === 'grn-new') return true;
  if (itemKey === 'qc-pending' && currentActive === 'qc-history') return true;
  if (
    itemKey === 'production-issue' &&
    (currentActive === 'production-stock' || currentActive === 'production-return')
  )
    return true;
  if (itemKey === 'dispatch-new' && currentActive === 'dispatch-history') return true;
  if (itemKey === 'inventory-stock' && currentActive === 'inventory-ledger') return true;
  if (
    itemKey === 'master-vendors' &&
    (currentActive === 'master-items' ||
      currentActive === 'master-customers' ||
      currentActive === 'master-units')
  )
    return true;
  return false;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeItem,
  onNavigate,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { role, profile } = useAuth();
  const currentRoleMeta = role ? ROLES_METADATA[role] : null;

  // Streamlined, high-impact menu sections without cluttered duplicates
  const menuSections: MenuSection[] = [
    {
      title: 'FACTORY WORKFLOW',
      items: [
        {
          key: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          allowedRoles: ['ADMIN', 'QC', 'PRODUCTION', 'VIEWER', 'PURCHASE', 'STORE', 'DISPATCH'],
        },
        {
          key: 'po-list',
          label: 'Purchase Orders',
          icon: FileText,
          allowedRoles: ['ADMIN', 'VIEWER', 'PURCHASE'],
        },
        {
          key: 'grn-list',
          label: 'Dock GRN Inward',
          icon: PackageCheck,
          allowedRoles: ['ADMIN', 'VIEWER', 'PURCHASE', 'STORE'],
        },
        {
          key: 'qc-pending',
          label: 'Quality Inspection',
          badge: role === 'QC' ? 'QC Dock' : undefined,
          icon: ShieldCheck,
          allowedRoles: ['ADMIN', 'QC', 'STORE', 'VIEWER'],
        },
        {
          key: 'production-issue',
          label: 'Production Floor',
          icon: Layers,
          allowedRoles: ['ADMIN', 'PRODUCTION', 'VIEWER', 'STORE'],
        },
        {
          key: 'dispatch-new',
          label: 'Dispatch & Outward',
          icon: Truck,
          allowedRoles: ['ADMIN', 'VIEWER', 'DISPATCH', 'STORE'],
        },
      ],
    },
    {
      title: 'STOCK & CATALOGS',
      items: [
        {
          key: 'inventory-stock',
          label: 'Store Stock & Ledger',
          icon: Warehouse,
          allowedRoles: ['ADMIN', 'QC', 'PRODUCTION', 'VIEWER', 'STORE', 'PURCHASE', 'DISPATCH'],
        },
        {
          key: 'master-vendors',
          label: 'Suppliers & Masters',
          icon: Building2,
          allowedRoles: ['ADMIN', 'VIEWER', 'PURCHASE'],
        },
      ],
    },
    {
      title: 'GOVERNANCE & SYSTEM',
      items: [
        {
          key: 'reports',
          label: 'Audit & Reports',
          icon: BarChart3,
          allowedRoles: ['ADMIN', 'VIEWER', 'PURCHASE', 'STORE'],
        },
        {
          key: 'admin-users',
          label: 'Team & Access (RBAC)',
          badge: 'Admin',
          badgeColor: '#6b21a8',
          icon: Shield,
          allowedRoles: ['ADMIN'],
        },
      ],
    },
  ];

  const renderNavLinks = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {menuSections.map((section) => {
        const visibleItems = section.items.filter((item) => {
          if (role === 'ADMIN') return true;
          return item.allowedRoles.includes(role);
        });

        if (visibleItems.length === 0) return null;

        return (
          <div key={section.title}>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 800,
                color: '#94a3b8',
                letterSpacing: '0.08em',
                padding: '0 10px',
                marginBottom: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{section.title}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {visibleItems.map((item) => {
                const isActive = isItemActive(item.key, activeItem);
                const Icon = item.icon;

                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      onNavigate(item.key);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px 8px 12px',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#3730a3' : '#334155',
                      background: isActive
                        ? 'linear-gradient(90deg, #eef2ff 0%, #f8fafc 100%)'
                        : 'transparent',
                      border: isActive ? '1px solid #c7d2fe' : '1px solid transparent',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      boxShadow: isActive ? '0 1px 3px rgba(79, 70, 229, 0.08)' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.color = '#0f172a';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#334155';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
                      {/* Active indicator bar */}
                      {isActive && (
                        <span
                          style={{
                            position: 'absolute',
                            left: '3px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '3.5px',
                            height: '16px',
                            borderRadius: '4px',
                            background: '#4f46e5',
                          }}
                        />
                      )}
                      <Icon
                        size={15}
                        color={isActive ? '#4f46e5' : '#64748b'}
                        style={{ flexShrink: 0 }}
                      />
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: '12.5px',
                        }}
                      >
                        {item.label}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {item.badge && (
                        <span
                          style={{
                            fontSize: '9.5px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '999px',
                            background: item.badgeColor ? `${item.badgeColor}18` : '#e0e7ff',
                            color: item.badgeColor || '#4338ca',
                            letterSpacing: '0.02em',
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                      {isActive && (
                        <ChevronRight size={13} color="#6366f1" style={{ opacity: 0.8 }} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Mobile Drawer (Smooth slide-in) */}
      {isMobileOpen && (
        <div
          className="mobile-drawer-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
          }}
          onClick={onCloseMobile}
        >
          <div
            style={{
              width: '270px',
              maxWidth: '85vw',
              background: '#ffffff',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '4px 0 24px rgba(0, 0, 0, 0.12)',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderBottom: '1px solid #e2e8f0',
                background: '#ffffff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    background: '#4338ca',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 800,
                  }}
                >
                  M
                </div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                    MIMS Plant OS
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#64748b' }}>Operations Portal</div>
                </div>
              </div>
              <button
                onClick={onCloseMobile}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  width: '28px',
                  height: '28px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                }}
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ padding: '14px 10px', flex: 1, overflowY: 'auto' }}>
              {renderNavLinks()}
            </div>

            {/* Mobile Footer User Card */}
            {profile && (
              <div
                style={{
                  padding: '12px',
                  borderTop: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: currentRoleMeta?.bgBadge || '#e2e8f0',
                    color: currentRoleMeta?.colorBadge || '#1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 800,
                    border: `1px solid ${currentRoleMeta?.borderBadge || '#cbd5e1'}`,
                  }}
                >
                  {profile.fullName.charAt(0).toUpperCase()}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#0f172a',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {profile.fullName}
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#64748b' }}>{role}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Desktop Persistent Sidebar */}
      <aside className="desktop-sidebar">
        {/* Workspace Brand / Status Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px 10px',
            borderBottom: '1px solid #f1f5f9',
            marginBottom: '8px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 800,
                color: '#64748b',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              WORKSPACE
            </div>
            <div
              style={{
                fontSize: '12.5px',
                fontWeight: 700,
                color: '#0f172a',
                marginTop: '1px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>Factory Plant #1</span>
            </div>
          </div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: '999px',
              background: '#ecfdf5',
              color: '#059669',
              border: '1px solid #a7f3d0',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#10b981',
                display: 'inline-block',
              }}
            />
            ACTIVE
          </span>
        </div>

        {/* Scrollable Navigation */}
        <div style={{ padding: '6px 10px 14px', flex: 1, overflowY: 'auto' }}>
          {renderNavLinks()}
        </div>

        {/* Bottom User Profile Section */}
        {profile && (
          <div
            style={{
              padding: '10px 12px',
              borderTop: '1px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: currentRoleMeta?.bgBadge || '#e2e8f0',
                  color: currentRoleMeta?.colorBadge || '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  border: `1px solid ${currentRoleMeta?.borderBadge || '#cbd5e1'}`,
                  flexShrink: 0,
                }}
              >
                {profile.fullName.charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: '#0f172a',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {profile.fullName}
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: currentRoleMeta?.colorBadge || '#64748b',
                  }}
                >
                  {role}
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
