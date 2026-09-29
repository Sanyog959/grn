'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export const PendingApprovalView: React.FC = () => {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshMessage(null);
    try {
      await refreshProfile();
      setRefreshMessage('✓ Status checked. If your administrator has approved your account, the dashboard will load automatically.');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'rgba(255, 255, 255, 0.98)',
          borderRadius: '20px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          padding: '40px',
          textAlign: 'center',
        }}
      >
        {/* Review Status Icon */}
        <div
          style={{
            width: '84px',
            height: '84px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 10px 25px -5px rgba(245, 158, 11, 0.35)',
            border: '4px solid #fff',
          }}
        >
          <span style={{ fontSize: '40px' }}>⏳</span>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px' }}>
          Account Under Review
        </h1>
        <p style={{ fontSize: '15px', color: '#475569', lineHeight: 1.6, margin: '0 0 24px' }}>
          Your account has been registered and is pending administrator authorization.
          <br />
          <strong style={{ color: '#0f172a' }}>Please check back in a few minutes</strong> or contact your manufacturing plant supervisor.
        </p>

        {/* User Card */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '18px 20px',
            textAlign: 'left',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Employee Profile
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: '999px',
                background: '#fef3c7',
                color: '#b45309',
                border: '1px solid #fde68a',
              }}
            >
              ● PENDING APPROVAL
            </span>
          </div>

          <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
            {profile?.fullName || user?.user_metadata?.full_name || 'Plant Personnel'}
          </div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            {profile?.email || user?.email}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
            Registered: {profile?.createdAt ? new Date(profile.createdAt).toLocaleString() : 'Just now'}
          </div>
        </div>

        {refreshMessage && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              fontSize: '13px',
              marginBottom: '20px',
              textAlign: 'left',
            }}
          >
            {refreshMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            style={{
              padding: '12px 20px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 700,
              border: 'none',
              cursor: isRefreshing ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <span>🔄</span>
            {isRefreshing ? 'Checking Authorization...' : 'Check Approval Status'}
          </button>

          <button
            onClick={() => signOut()}
            style={{
              padding: '11px 20px',
              borderRadius: '10px',
              background: '#fff',
              color: '#475569',
              fontSize: '13.5px',
              fontWeight: 600,
              border: '1px solid #cbd5e1',
              cursor: 'pointer',
            }}
          >
            Sign Out & Return Later
          </button>
        </div>

        {/* Security Notice */}
        <div style={{ marginTop: '24px', fontSize: '11.5px', color: '#94a3b8' }}>
          Manufacturing Plant Security Protocol: Unapproved accounts cannot view inventory, PO, or QC records.
        </div>
      </div>
    </div>
  );
};
