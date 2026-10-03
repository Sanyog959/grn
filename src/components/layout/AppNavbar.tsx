'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Menu, Layers, Database, LogOut, Shield } from 'lucide-react';

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

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 14px',
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        zIndex: 90,
        height: '48px',
        gap: '8px',
      }}
    >
      {/* Left: Mobile Drawer Trigger + Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={onToggleMobileMenu}
          className="mobile-menu-btn"
          aria-label="Toggle menu"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
            color: '#0f172a',
            cursor: 'pointer',
          }}
        >
          <Menu size={16} />
        </button>

        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            flexShrink: 0,
          }}
        >
          <Layers size={15} />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '14.5px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              MIMS
            </span>
            <span
              style={{
                fontSize: '9.5px',
                fontWeight: 700,
                padding: '1px 5px',
                borderRadius: '4px',
                background: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
              }}
            >
              PLANT OS
            </span>
          </div>
        </div>
      </div>

      {/* Right Controls: Database & User Session */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          onClick={onOpenDbSetup}
          title={isConnected ? 'Database Connected' : 'Configure Database'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 9px',
            borderRadius: '6px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            fontSize: '11px',
            fontWeight: 600,
            color: isConnected ? '#0f172a' : '#64748b',
            cursor: 'pointer',
          }}
        >
          <Database size={12} color={isConnected ? '#2563eb' : '#64748b'} />
          <span className="desktop-only-text">{isConnected ? 'DB Active' : 'DB Settings'}</span>
        </button>

        {isAuthenticated && profile ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '10.5px',
                fontWeight: 700,
                background: '#0f172a',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <Shield size={10} />
              {role}
            </span>

            <span className="desktop-only-text" style={{ fontSize: '11.5px', fontWeight: 600, color: '#334155' }}>
              {profile.fullName.split(' ')[0]}
            </span>

            <button
              onClick={() => signOut()}
              title="Sign Out"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                color: '#475569',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              <LogOut size={12} />
              <span className="desktop-only-text">Exit</span>
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="btn-accent"
            style={{ padding: '4px 10px', fontSize: '11.5px' }}
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
};
