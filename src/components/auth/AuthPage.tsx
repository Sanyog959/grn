'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

interface AuthPageProps {
  onOpenDbSetup?: () => void;
  isConnected: boolean;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onOpenDbSetup, isConnected }) => {
  const { signIn, signUp, resetPassword, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'signin' | 'register' | 'forgot'>('signin');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your work email.');
      return;
    }

    if (activeTab === 'forgot') {
      setSubmitting(true);
      const res = await resetPassword(email);
      setSubmitting(false);
      if (res.success) {
        setSuccessMessage(res.message || 'Password reset link sent! Check your inbox.');
      } else {
        setErrorMessage(res.error || 'Failed to send reset link.');
      }
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    if (activeTab === 'register') {
      if (!fullName.trim()) {
        setErrorMessage('Please enter your full name.');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match.');
        return;
      }

      setSubmitting(true);
      const res = await signUp(email, password, fullName);
      setSubmitting(false);

      if (res.success) {
        setSuccessMessage('✓ Registration submitted! Your account is now pending Administrator approval.');
      } else {
        setErrorMessage(res.error || 'Registration failed.');
      }
      return;
    }

    // Sign In
    setSubmitting(true);
    const res = await signIn(email, password);
    setSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Invalid credentials or user not found.');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #090d16 0%, #111827 50%, #1e1b4b 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Top Bar with Brand & Database Status */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '24px',
          right: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 900,
              fontSize: '18px',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
            }}
          >
            M
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: '15px', letterSpacing: '-0.02em' }}>
              MIMS Inventory
            </div>
            <div style={{ color: '#94a3b8', fontSize: '11px' }}>
              Material Inventory Management System
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '999px',
              background: isConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
              fontSize: '11.5px',
              color: isConnected ? '#34d399' : '#fbbf24',
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: isConnected ? '#10b981' : '#f59e0b',
                display: 'inline-block',
              }}
            />
            {isConnected ? 'Supabase Connected' : 'Standby Mode'}
          </div>

          {onOpenDbSetup && (
            <button
              onClick={onOpenDbSetup}
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#e2e8f0',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ⚙ Setup
            </button>
          )}
        </div>
      </div>

      {/* Main Authentication Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'rgba(255, 255, 255, 0.98)',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.15)',
          padding: '36px 32px',
          margin: '60px 0 20px',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            {activeTab === 'signin' && 'Sign In to Plant Portal'}
            {activeTab === 'register' && 'Register New Employee'}
            {activeTab === 'forgot' && 'Reset Your Password'}
          </h2>
          <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0 }}>
            {activeTab === 'signin' && 'Authorized personnel access to Purchase, GRN, QC & Store'}
            {activeTab === 'register' && 'Registration is sent to Plant Administrator for role assignment'}
            {activeTab === 'forgot' && 'Enter your registered email to receive a password reset link'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            background: '#f1f5f9',
            borderRadius: '10px',
            padding: '4px',
            marginBottom: '24px',
            gap: '4px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab('signin');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '7px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'signin' ? '#ffffff' : 'transparent',
              color: activeTab === 'signin' ? '#0f172a' : '#64748b',
              boxShadow: activeTab === 'signin' ? '0 2px 6px rgba(0, 0, 0, 0.06)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '7px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'register' ? '#ffffff' : 'transparent',
              color: activeTab === 'register' ? '#0f172a' : '#64748b',
              boxShadow: activeTab === 'register' ? '0 2px 6px rgba(0, 0, 0, 0.06)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            Register
          </button>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              fontSize: '13px',
              marginBottom: '16px',
            }}
          >
            ⚠️ {errorMessage}
          </div>
        )}

        {successMessage && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#166534',
              fontSize: '13px',
              marginBottom: '16px',
            }}
          >
            {successMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {activeTab === 'register' && (
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                Full Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Marcus Vance"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
              Work Email *
            </label>
            <input
              type="email"
              placeholder="e.g. officer@factory.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {activeTab !== 'forgot' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>
                  Password *
                </label>
                {activeTab === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('forgot');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#4f46e5',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {activeTab === 'register' && (
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                Confirm Password *
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {activeTab === 'register' && (
            <div
              style={{
                fontSize: '12px',
                color: '#64748b',
                background: '#f8fafc',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                lineHeight: 1.5,
              }}
            >
              🔒 <strong>Security Policy:</strong> Newly registered accounts are staged in <strong>PENDING APPROVAL</strong> status. An administrator must authorize your role before you can access manufacturing modules.
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || isLoading}
            style={{
              padding: '12px 18px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 700,
              border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer',
              marginTop: '8px',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
              transition: 'opacity 0.2s',
            }}
          >
            {submitting ? 'Processing...' : (
              activeTab === 'signin' ? 'Sign In to Portal' :
              activeTab === 'register' ? 'Register Account' :
              'Send Password Reset Link'
            )}
          </button>
        </form>

        {activeTab === 'forgot' && (
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ← Back to Sign In
            </button>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div style={{ color: '#64748b', fontSize: '12px', textAlign: 'center' }}>
        Manufacturing Material Inventory Management System · Role-Based Access Control (RBAC)
      </div>
    </div>
  );
};
