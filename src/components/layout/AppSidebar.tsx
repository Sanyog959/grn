'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { UserRole, SystemModule, hasModuleAccess } from '@/types/auth';

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

interface MenuSection {
  title: string;
  module: SystemModule;
  allowedRoles: UserRole[];
  items: {
    key: NavItemKey;
    label: string;
    icon: string;
    allowedRoles: UserRole[];
  }[];
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeItem,
  onNavigate,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { role, profile } = useAuth();

  const menuSections: MenuSection[] = [
    {
      title: 'CORE',
      module: 'dashboard',
      allowedRoles: ['ADMIN', 'PURCHASE', 'QC', 'STORE', 'PRODUCTION', 'DISPATCH', 'VIEWER'],
      items: [
        {
          key: 'dashboard',
          label: 'Dashboard',
          icon: '📊',
          allowedRoles: ['ADMIN', 'PURCHASE', 'QC', 'STORE', 'PRODUCTION', 'DISPATCH', 'VIEWER'],
        },
      ],
    },
    {
      title: 'PURCHASE (PO)',
      module: 'purchase',
      allowedRoles: ['ADMIN', 'PURCHASE', 'VIEWER'],
      items: [
        {
          key: 'po-new',
          label: 'New Purchase PO',
          icon: '➕',
          allowedRoles: ['ADMIN', 'PURCHASE'],
        },
        {
          key: 'po-list',
          label: 'PO Orders List',
          icon: '📋',
          allowedRoles: ['ADMIN', 'PURCHASE', 'VIEWER'],
        },
      ],
    },
    {
      title: 'INWARD (GRN)',
      module: 'grn',
      allowedRoles: ['ADMIN', 'PURCHASE', 'STORE', 'VIEWER'],
      items: [
        {
          key: 'grn-new',
          label: 'New GRN Entry',
          icon: '📥',
          allowedRoles: ['ADMIN', 'PURCHASE', 'STORE'],
        },
        {
          key: 'grn-list',
          label: 'GRN Receipts Log',
          icon: '📦',
          allowedRoles: ['ADMIN', 'PURCHASE', 'STORE', 'VIEWER'],
        },
      ],
    },
    {
      title: 'QUALITY CONTROL (QC)',
      module: 'qc',
      allowedRoles: ['ADMIN', 'QC', 'VIEWER'],
      items: [
        {
          key: 'qc-pending',
          label: 'QC Pending Dock',
          icon: '🔬',
          allowedRoles: ['ADMIN', 'QC', 'VIEWER'],
        },
        {
          key: 'qc-history',
          label: 'QC Inspection Log',
          icon: '📑',
          allowedRoles: ['ADMIN', 'QC', 'VIEWER'],
        },
      ],
    },
    {
      title: 'STORE & INVENTORY',
      module: 'inventory',
      allowedRoles: ['ADMIN', 'STORE', 'PRODUCTION', 'VIEWER'],
      items: [
        {
          key: 'inventory-stock',
          label: 'Current Store Stock',
          icon: '🏢',
          allowedRoles: ['ADMIN', 'STORE', 'PRODUCTION', 'VIEWER'],
        },
        {
          key: 'inventory-ledger',
          label: 'Stock Ledger (Audit)',
          icon: '📜',
          allowedRoles: ['ADMIN', 'STORE', 'VIEWER'],
        },
      ],
    },
    {
      title: 'PRODUCTION',
      module: 'production',
      allowedRoles: ['ADMIN', 'STORE', 'PRODUCTION', 'VIEWER'],
      items: [
        {
          key: 'production-issue',
          label: 'Issue to Production',
          icon: '📤',
          allowedRoles: ['ADMIN', 'STORE'],
        },
        {
          key: 'production-stock',
          label: 'Shopfloor Stock',
          icon: '⚙️',
          allowedRoles: ['ADMIN', 'PRODUCTION', 'VIEWER'],
        },
        {
          key: 'production-return',
          label: 'Production Return',
          icon: '↩️',
          allowedRoles: ['ADMIN', 'PRODUCTION'],
        },
      ],
    },
    {
      title: 'DISPATCH',
      module: 'dispatch',
      allowedRoles: ['ADMIN', 'DISPATCH', 'STORE', 'VIEWER'],
      items: [
        {
          key: 'dispatch-new',
          label: 'New Dispatch Challan',
          icon: '🚚',
          allowedRoles: ['ADMIN', 'DISPATCH', 'STORE'],
        },
        {
          key: 'dispatch-history',
          label: 'Dispatch History',
          icon: '🏁',
          allowedRoles: ['ADMIN', 'DISPATCH', 'STORE', 'VIEWER'],
        },
      ],
    },
    {
      title: 'MASTERS & REVENUE',
      module: 'masters',
      allowedRoles: ['ADMIN', 'VIEWER', 'PURCHASE'],
      items: [
        {
          key: 'master-items',
          label: 'Item Master',
          icon: '🔩',
          allowedRoles: ['ADMIN', 'VIEWER', 'PURCHASE'],
        },
        {
          key: 'master-vendors',
          label: 'Suppliers Master',
          icon: '🏭',
          allowedRoles: ['ADMIN', 'VIEWER', 'PURCHASE'],
        },
        {
          key: 'master-customers',
          label: 'Customers Master',
          icon: '👥',
          allowedRoles: ['ADMIN', 'VIEWER'],
        },
        {
          key: 'master-units',
          label: 'Units of Measure',
          icon: '📏',
          allowedRoles: ['ADMIN', 'VIEWER'],
        },
      ],
    },
    {
      title: 'AUDIT & REPORTS',
      module: 'reports',
      allowedRoles: ['ADMIN', 'VIEWER', 'PURCHASE', 'STORE'],
      items: [
        {
          key: 'reports',
          label: 'Reconciliation Reports',
          icon: '📈',
          allowedRoles: ['ADMIN', 'VIEWER', 'PURCHASE', 'STORE'],
        },
      ],
    },
    {
      title: 'ADMINISTRATION',
      module: 'users',
      allowedRoles: ['ADMIN'],
      items: [
        {
          key: 'admin-users',
          label: 'Users & Roles RBAC',
          icon: '🛡️',
          allowedRoles: ['ADMIN'],
        },
      ],
    },
  ];

  const renderNavLinks = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {menuSections
        .filter((section) => {
          if (role === 'ADMIN') return true;
          if (section.module === 'users') return false;
          return hasModuleAccess(role, section.module, profile);
        })
        .map((section) => {
          const visibleItems = section.items.filter((item) => {
            if (role === 'ADMIN') return true;
            return item.allowedRoles.includes(role);
          });
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#94a3b8',
                  letterSpacing: '0.06em',
                  padding: '0 8px',
                  display: 'block',
                  marginBottom: '6px',
                }}
              >
                {section.title}
              </span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {visibleItems.map((item) => {
                  const isActive = activeItem === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        onNavigate(item.key);
                        if (onCloseMobile) onCloseMobile();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? '#0f172a' : '#475569',
                        background: isActive ? '#f1f5f9' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.background = '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <span style={{ fontSize: '15px' }}>{item.icon}</span>
                      <span>{item.label}</span>
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
      {/* Mobile Drawer (Only visible on phones/tablets when hamburger is open) */}
      {isMobileOpen && (
        <div
          className="mobile-drawer-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
          }}
          onClick={onCloseMobile}
        >
          <div
            style={{
              width: '280px',
              maxWidth: '85vw',
              background: '#ffffff',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '4px 0 24px rgba(0, 0, 0, 0.25)',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header with Close */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>🏭</span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>MIMS Modules</span>
              </div>
              <button
                onClick={onCloseMobile}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '6px',
                  width: '32px',
                  height: '32px',
                  fontSize: '16px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '16px 12px' }}>{renderNavLinks()}</div>
          </div>
        </div>
      )}

      {/* Desktop Persistent Sidebar (Hidden on mobile via CSS) */}
      <aside className="desktop-sidebar">
        <div style={{ padding: '16px 12px' }}>{renderNavLinks()}</div>
      </aside>
    </>
  );
};
