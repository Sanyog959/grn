'use client';

import React from 'react';

interface HeaderProps {
  onOpenNewGrn: () => void;
  onOpenSupabaseConfig: () => void;
  isConnected: boolean;
  isSyncing: boolean;
  onRefresh: () => void;
  supabaseUrl?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNewGrn,
  onOpenSupabaseConfig,
  isConnected,
  isSyncing,
  onRefresh,
  supabaseUrl,
}) => {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 28px',
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
      }}
    >
      {/* Brand & Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'var(--grad-aurora)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
            color: '#fff',
            fontWeight: 800,
            fontSize: '20px',
            letterSpacing: '-0.02em',
          }}
        >
          ✦
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1
              style={{
                fontSize: '20px',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                margin: 0,
              }}
            >
              AURA GRN
            </h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '999px',
                background: 'rgba(99, 102, 241, 0.1)',
                color: '#4f46e5',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                letterSpacing: '0.04em',
              }}
            >
              ENTERPRISE SAAS
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '1px', margin: 0 }}>
            Inward Logistics & Quality Control · Supabase Cloud Database & REST API
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Supabase Connection Status Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '999px',
            background: isConnected ? '#ecfdf5' : '#f8fafc',
            border: `1px solid ${isConnected ? '#a7f3d0' : '#e2e8f0'}`,
            fontSize: '12px',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isConnected ? '#10b981' : '#f59e0b',
              boxShadow: isConnected
                ? '0 0 10px #10b981'
                : '0 0 8px rgba(245, 158, 11, 0.6)',
              display: 'inline-block',
            }}
          />
          <span style={{ fontWeight: 600, color: isConnected ? '#065f46' : '#92400e' }}>
            {isConnected ? 'Supabase Database Connected' : 'Connecting to Database...'}
          </span>
          {isConnected && supabaseUrl && (
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              title="Open Supabase Project Dashboard"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                color: '#059669',
                fontWeight: 600,
                textDecoration: 'underline',
                marginLeft: '4px',
              }}
            >
              Dashboard ↗
            </a>
          )}
        </div>

        {/* Refresh / Sync DB Button */}
        <button
          onClick={onRefresh}
          disabled={isSyncing}
          className="btn-supabase-sync"
          title="Refresh data from backend"
        >
          <span
            style={{
              display: 'inline-block',
              animation: isSyncing ? 'spin 1s linear infinite' : 'none',
            }}
          >
            🔄
          </span>
          {isSyncing ? 'Syncing...' : 'Sync DB'}
        </button>

        {/* Configure Supabase Backend Modal */}
        <button
          onClick={onOpenSupabaseConfig}
          className="btn-secondary"
          style={{ fontSize: '13px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span>⚡</span>
          <span>Supabase Setup</span>
        </button>

        {/* Create GRN Button */}
        <button onClick={onOpenNewGrn} className="btn-aurora" style={{ padding: '8px 16px' }}>
          <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span>
          New Inward GRN
        </button>
      </div>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </header>
  );
};
