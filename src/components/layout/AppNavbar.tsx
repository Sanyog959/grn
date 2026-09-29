'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { ROLES_METADATA } from '@/types/auth';

interface AppNavbarProps {
  onOpenAuth: () => void;
  onOpenDbSetup: () => void;
  isConnected: boolean;
  onToggleMobileMenu?: () => void;
}

export const AppNavbar: React.FC<AppNavbarProps> = ({
  onOpenAuth,
  onOpenDbSetup,
  isConnected,
  onToggleMobileMenu,
}) => {
  const { profile, role, signOut, isAuthenticated } = useAuth();
  const currentRoleMeta = ROLES_METADATA[role] || ROLES_METADATA.VIEWER;

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        background: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        zIndex: 90,
        gap: '8px',
      }}
    >
      {/* Left: Mobile Hamburger + Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Mobile Hamburger Drawer Trigger */}
        <button
          onClick={onToggleMobileMenu}
          className="mobile-menu-btn"
          aria-label="Toggle navigation menu"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            background: '#f8fafc',
            color: '#0f172a',
            fontSize: '18px',
            cursor: 'pointer',
          }}
        >
          ☰
        </button>

        <div
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 800,
            fontSize: '16px',
            boxShadow: '0 3px 8px rgba(5, 150, 105, 0.25)',
            flexShrink: 0,
          }}
        >
          🏭
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              MIMS
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px',
                background: '#f1f5f9',
                color: '#475569',
              }}
            >
              OS
            </span>
          </div>
          <p className="desktop-only-text" style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
            PO → GRN → QC → Store → Production → Dispatch
          </p>
        </div>
      </div>

      {/* Right Controls: Database Status, User Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Database Status Button */}
        <button
          onClick={onOpenDbSetup}
          title={isConnected ? 'Connected to database' : 'Configure database'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '5px 10px',
            borderRadius: '999px',
            background: isConnected ? '#ecfdf5' : '#f8fafc',
            border: `1px solid ${isConnected ? '#a7f3d0' : '#e2e8f0'}`,
            fontSize: '11.5px',
            fontWeight: 600,
            color: isConnected ? '#065f46' : '#475569',
            cursor: 'pointer',
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: isConnected ? '#10b981' : '#94a3b8',
            }}
          />
          <span className="desktop-only-text">{isConnected ? 'Supabase Live' : 'DB Settings'}</span>
        </button>

        {/* User Profile Pill or Sign In Button */}
        {isAuthenticated && profile ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                padding: '2px 7px',
                borderRadius: '5px',
                fontSize: '11px',
                fontWeight: 800,
                background: currentRoleMeta.bgBadge,
                color: currentRoleMeta.colorBadge,
                border: `1px solid ${currentRoleMeta.borderBadge}`,
              }}
            >
              {role}
            </span>

            <div className="desktop-only-text" style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>
                {profile.fullName.split(' ')[0]}
              </span>
            </div>

            <button
              onClick={() => signOut()}
              title="Sign Out"
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '11.5px',
                color: '#64748b',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="btn-aurora"
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
};
