'use client';

import React, { useState } from 'react';
import { SUPABASE_SCHEMA_SQL } from '@/lib/supabase/schema-sql';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  supabaseUrl: string;
  supabaseKey: string;
  onSaveConfig: (url: string, key: string) => void;
  onTestConnection: (url: string, key: string) => Promise<boolean>;
  onSeedDemoData: (url: string, key: string) => Promise<boolean>;
  isConnected: boolean;
  isTesting: boolean;
  tableStats?: {
    vendors: { exists: boolean; count: number };
    grn_orders: { exists: boolean; count: number };
    grn_items: { exists: boolean; count: number };
  };
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  supabaseUrl,
  supabaseKey,
  onSaveConfig,
  onTestConnection,
  onSeedDemoData,
  isConnected,
  isTesting,
  tableStats,
}) => {
  const [activeTab, setActiveTab] = useState<'connection' | 'sql' | 'api'>('connection');
  const [urlInput, setUrlInput] = useState(supabaseUrl);
  const [keyInput, setKeyInput] = useState(supabaseKey);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [prevUrl, setPrevUrl] = useState(supabaseUrl);
  const [prevKey, setPrevKey] = useState(supabaseKey);

  if (supabaseUrl !== prevUrl || supabaseKey !== prevKey) {
    setPrevUrl(supabaseUrl);
    setPrevKey(supabaseKey);
    setUrlInput(supabaseUrl);
    setKeyInput(supabaseKey);
  }

  if (!isOpen) return null;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSave = () => {
    onSaveConfig(urlInput.trim(), keyInput.trim());
    setStatusMessage('Configuration saved to local browser cache and memory.');
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleTest = async () => {
    setStatusMessage(null);
    const ok = await onTestConnection(urlInput.trim(), keyInput.trim());
    if (ok) {
      setStatusMessage('✓ Connected successfully to Supabase database!');
    } else {
      setStatusMessage('⚠️ Could not connect. Please check credentials or run the SQL schema.');
    }
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    setStatusMessage(null);
    try {
      const ok = await onSeedDemoData(urlInput.trim(), keyInput.trim());
      if (ok) {
        setStatusMessage('✓ Successfully verified database schema and table readiness!');
      } else {
        setStatusMessage('⚠️ Verification failed. Please ensure tables are created with the SQL schema.');
      }
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '820px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header" style={{ paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '20px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
              }}
            >
              ⚡
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  Supabase Cloud Database & Backend Setup
                </h2>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: isConnected ? '#ecfdf5' : '#fef3c7',
                    color: isConnected ? '#065f46' : '#92400e',
                    border: `1px solid ${isConnected ? '#a7f3d0' : '#fde68a'}`,
                  }}
                >
                  {isConnected ? '● Connected' : '○ Standby / Awaiting Connection'}
                </span>
              </div>
              <p style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px', margin: 0 }}>
                Enterprise PostgreSQL backend with Row-Level Security, real-time sync, and REST API
              </p>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid #e2e8f0',
            padding: '0 24px',
            background: '#f8fafc',
          }}
        >
          <button
            onClick={() => setActiveTab('connection')}
            className={`tab-sub-btn ${activeTab === 'connection' ? 'active' : ''}`}
          >
            🔌 Database Connection
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`tab-sub-btn ${activeTab === 'sql' ? 'active' : ''}`}
          >
            📜 SQL Schema & Migration
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`tab-sub-btn ${activeTab === 'api' ? 'active' : ''}`}
          >
            🚀 REST API Endpoints
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {statusMessage && (
            <div
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                background: statusMessage.startsWith('✓') ? '#ecfdf5' : '#fffbeb',
                border: `1px solid ${statusMessage.startsWith('✓') ? '#a7f3d0' : '#fde68a'}`,
                color: statusMessage.startsWith('✓') ? '#065f46' : '#92400e',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>{statusMessage}</span>
              <button
                onClick={() => setStatusMessage(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
              >
                ✕
              </button>
            </div>
          )}

          {/* TAB 1: CONNECTION */}
          {activeTab === 'connection' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.06) 0%, rgba(6, 182, 212, 0.06) 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  fontSize: '13px',
                  color: '#1e293b',
                  lineHeight: '1.5',
                }}
              >
                <strong style={{ color: '#065f46' }}>Quick 2-Step Supabase Connection:</strong>
                <ol style={{ margin: '8px 0 0 18px', padding: 0 }}>
                  <li>
                    Create a free project at{' '}
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#059669', fontWeight: 600, textDecoration: 'underline' }}
                    >
                      supabase.com ↗
                    </a>
                  </li>
                  <li>
                    Run the <strong>SQL Schema</strong> (tab above) in your Supabase SQL Editor, then paste your Project URL and Anon Key below.
                  </li>
                </ol>
              </div>

              {/* Input Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Supabase Project URL
                  </label>
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://your-project-id.supabase.co"
                    className="form-input"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}
                  />
                  <span style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    Found in: Supabase Project Settings → API → Project URL
                  </span>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                      Anon Public API Key (or Service Role Key)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#059669',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      {showKey ? 'Hide Key' : 'Reveal Key'}
                    </button>
                  </div>
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="form-input"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}
                  />
                  <span style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    Found in: Supabase Project Settings → API → Project API Keys (anon public)
                  </span>
                </div>
              </div>

              {/* Table Stats (if tested) */}
              {tableStats && (
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: '10px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    PostgreSQL Tables Detected:
                  </span>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
                    <div
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: tableStats.vendors.exists ? '#ecfdf5' : '#fee2e2',
                        border: `1px solid ${tableStats.vendors.exists ? '#a7f3d0' : '#fecaca'}`,
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color: tableStats.vendors.exists ? '#065f46' : '#991b1b',
                      }}
                    >
                      vendors: {tableStats.vendors.exists ? `${tableStats.vendors.count} rows` : 'Table Missing'}
                    </div>
                    <div
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: tableStats.grn_orders.exists ? '#ecfdf5' : '#fee2e2',
                        border: `1px solid ${tableStats.grn_orders.exists ? '#a7f3d0' : '#fecaca'}`,
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color: tableStats.grn_orders.exists ? `${tableStats.grn_orders.count} rows` : 'Table Missing',
                      }}
                    >
                      grn_orders: {tableStats.grn_orders.exists ? `${tableStats.grn_orders.count} rows` : 'Table Missing'}
                    </div>
                    <div
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: tableStats.grn_items.exists ? '#ecfdf5' : '#fee2e2',
                        border: `1px solid ${tableStats.grn_items.exists ? '#a7f3d0' : '#fecaca'}`,
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color: tableStats.grn_items.exists ? `${tableStats.grn_items.count} rows` : 'Table Missing',
                      }}
                    >
                      grn_items: {tableStats.grn_items.exists ? `${tableStats.grn_items.count} rows` : 'Table Missing'}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', paddingTop: '6px' }}>
                <button
                  type="button"
                  onClick={handleSave}
                  className="btn-aurora"
                  style={{ padding: '9px 18px', fontSize: '13px' }}
                >
                  💾 Save Configuration
                </button>

                <button
                  type="button"
                  onClick={handleTest}
                  disabled={isTesting}
                  className="btn-secondary"
                  style={{ padding: '9px 18px', fontSize: '13px', fontWeight: 600 }}
                >
                  {isTesting ? '🔄 Testing...' : '⚡ Test Connection'}
                </button>

                <button
                  type="button"
                  onClick={handleSeed}
                  disabled={isSeeding}
                  className="btn-secondary"
                  style={{
                    padding: '9px 18px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#059669',
                    borderColor: '#a7f3d0',
                    background: '#f0fdf4',
                  }}
                  title="Initialize Master Categories and Schema Verification"
                >
                  {isSeeding ? '⚡ Initializing...' : '⚡ Initialize Master Config'}
                </button>
              </div>

              <div
                style={{
                  fontSize: '12px',
                  color: '#64748b',
                  background: '#f1f5f9',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <strong>Pro-tip:</strong> You can also set these environment variables in your{' '}
                <code>.env.local</code> file:
                <pre style={{ margin: '6px 0 0 0', fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: '#0f172a' }}>
                  NEXT_PUBLIC_SUPABASE_URL={urlInput || 'https://xyz.supabase.co'}{'\n'}
                  NEXT_PUBLIC_SUPABASE_ANON_KEY={keyInput ? keyInput.substring(0, 20) + '...' : 'eyJhbGci...'}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 2: SQL SCHEMA & MIGRATION */}
          {activeTab === 'sql' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#f8fafc',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div>
                  <strong style={{ fontSize: '13px', color: '#1e293b' }}>
                    PostgreSQL Migration Script (Tables, RLS, Indexes, & Seed Data)
                  </strong>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                    Open Supabase Dashboard → <strong>SQL Editor</strong> → Paste and click <strong>Run</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="btn-aurora"
                  style={{
                    padding: '8px 16px',
                    fontSize: '12.5px',
                    background: copied ? '#10b981' : undefined,
                  }}
                >
                  {copied ? '✓ Copied SQL!' : '📋 Copy Full SQL Script'}
                </button>
              </div>

              <div
                style={{
                  position: 'relative',
                  background: '#0f172a',
                  borderRadius: '10px',
                  padding: '16px',
                  maxHeight: '380px',
                  overflowY: 'auto',
                }}
              >
                <pre
                  style={{
                    margin: 0,
                    color: '#38bdf8',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {SUPABASE_SCHEMA_SQL}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: REST API ENDPOINTS */}
          {activeTab === 'api' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '13px', color: '#475569', margin: 0 }}>
                This Next.js application provides a modular backend API interfacing directly with your Supabase database:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#dbeafe', color: '#1d4ed8', fontSize: '11px', fontWeight: 700 }}>GET</span>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: 700 }}>POST</span>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#fef3c7', color: '#b45309', fontSize: '11px', fontWeight: 700 }}>PATCH</span>
                    <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '13px' }}>/api/grn</code>
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '6px 0 0 0' }}>
                    Full lifecycle management for Master Goods Received Notes. Handles inward receipts, automatic total calculations, and batch item linking.
                  </p>
                </div>

                <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#dbeafe', color: '#1d4ed8', fontSize: '11px', fontWeight: 700 }}>GET</span>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#fef3c7', color: '#b45309', fontSize: '11px', fontWeight: 700 }}>PATCH</span>
                    <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '13px' }}>/api/items</code>
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '6px 0 0 0' }}>
                    Quality Control & Inspection line-item workflow. Supports marking QC as Passed, Under Review, or Failed with custom rejection notes.
                  </p>
                </div>

                <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#dbeafe', color: '#1d4ed8', fontSize: '11px', fontWeight: 700 }}>GET</span>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: 700 }}>POST</span>
                    <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '13px' }}>/api/vendors</code>
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '6px 0 0 0' }}>
                    Supplier Directory & Vendor SLA management. Stores lead times, quality ratings, and vendor status levels.
                  </p>
                </div>

                <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#dbeafe', color: '#1d4ed8', fontSize: '11px', fontWeight: 700 }}>GET</span>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: 700 }}>POST</span>
                    <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '13px' }}>/api/supabase/status</code>
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '6px 0 0 0' }}>
                    Connection ping diagnostics and table integrity validator.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '14px 24px', background: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#64748b' }}>
            <span>Status:</span>
            <span style={{ fontWeight: 700, color: isConnected ? '#059669' : '#d97706' }}>
              {isConnected ? 'Connected to Supabase PostgreSQL' : 'Standby / Ready for Database Connection'}
            </span>
          </div>
          <button onClick={onClose} className="btn-secondary" style={{ padding: '7px 16px', fontSize: '13px' }}>
            Close
          </button>
        </div>
      </div>

      <style jsx>{`
        .tab-sub-btn {
          padding: 12px 16px;
          border: none;
          background: transparent;
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .tab-sub-btn:hover {
          color: #0f172a;
        }
        .tab-sub-btn.active {
          color: #059669;
          border-bottom-color: #059669;
          background: rgba(16, 185, 129, 0.05);
        }
      `}</style>
    </div>
  );
};
