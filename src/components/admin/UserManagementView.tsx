'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  UserRole,
  UserProfile,
  ApprovalStatus,
  SystemModule,
  ModulePermission,
  ROLES_METADATA,
  ALL_SYSTEM_MODULES,
  DEFAULT_ROLE_PERMISSIONS,
} from '@/types/auth';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export const UserManagementView: React.FC = () => {
  const {
    role: currentAdminRole,
    profile: currentAdminProfile,
    approveUser,
    rejectUser,
    updateUserRole,
    updateUserPermissions,
    bulkUpdateUsers,
  } = useAuth();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'users' | 'matrix' | 'smtp'>('pending');
  const [toast, setToast] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Selected users for bulk operations
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [bulkTargetRole, setBulkTargetRole] = useState<UserRole>('STORE');

  // Granular Permission Matrix Editing State
  const [selectedUserForMatrix, setSelectedUserForMatrix] = useState<UserProfile | null>(null);
  const [matrixPermissions, setMatrixPermissions] = useState<Record<SystemModule, ModulePermission>>(
    DEFAULT_ROLE_PERMISSIONS.STORE
  );

  // Pending user inline role choices (key: userId, value: UserRole)
  const [pendingUserRolePicks, setPendingUserRolePicks] = useState<Record<string, UserRole>>({});

  // SMTP Test State
  const [testEmailTo, setTestEmailTo] = useState('');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<string | null>(null);

  const supabase = getSupabaseBrowserClient();

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const loadRealUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/users', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.users)) {
          setUsers(json.users);

          const rolePicks: Record<string, UserRole> = {};
          json.users.forEach((u: UserProfile) => {
            rolePicks[u.id] = u.role !== 'ADMIN' && u.role !== 'VIEWER' ? u.role : 'STORE';
          });
          setPendingUserRolePicks(rolePicks);
          setLoading(false);
          return;
        }
      }
    } catch (apiErr) {
      console.warn('API users fetch error:', apiErr);
    }

    if (!supabase) {
      if (currentAdminProfile) {
        setUsers([currentAdminProfile]);
      } else {
        setUsers([]);
      }
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const loadedUsers: UserProfile[] = data.map((row) => ({
          id: row.id,
          fullName: row.full_name || row.email.split('@')[0],
          email: row.email,
          role: (row.role || 'VIEWER') as UserRole,
          isActive: Boolean(row.is_active),
          approvalStatus: (row.approval_status || (row.is_active ? 'APPROVED' : 'PENDING')) as ApprovalStatus,
          permissions: row.permissions || DEFAULT_ROLE_PERMISSIONS[(row.role || 'VIEWER') as UserRole],
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
        setUsers(loadedUsers);

        // Pre-fill role picks
        const rolePicks: Record<string, UserRole> = {};
        loadedUsers.forEach((u) => {
          rolePicks[u.id] = u.role !== 'ADMIN' && u.role !== 'VIEWER' ? u.role : 'STORE';
        });
        setPendingUserRolePicks(rolePicks);
      } else if (currentAdminProfile) {
        setUsers([currentAdminProfile]);
      }
    } catch {
      // Ignore load error
    } finally {
      setLoading(false);
    }
  }, [supabase, currentAdminProfile]);

  useEffect(() => {
    let ignore = false;
    const timer = setTimeout(() => {
      if (!ignore) {
        loadRealUsers();
      }
    }, 0);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [loadRealUsers]);

  // When opening matrix for a user, initialize permissions
  const handleOpenMatrix = (user: UserProfile) => {
    setSelectedUserForMatrix(user);
    const existing = user.permissions || DEFAULT_ROLE_PERMISSIONS[user.role];
    setMatrixPermissions(JSON.parse(JSON.stringify(existing)));
    setActiveTab('matrix');
  };

  // Reset to default preset for a role
  const handleResetToRoleDefault = (targetRole: UserRole) => {
    setMatrixPermissions(JSON.parse(JSON.stringify(DEFAULT_ROLE_PERMISSIONS[targetRole])));
    showToast(`✓ Reset permissions to standard ${targetRole} defaults`);
  };

  // Toggle single permission checkbox
  const handleTogglePermission = (module: SystemModule, action: keyof ModulePermission) => {
    setMatrixPermissions((prev) => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: !prev[module]?.[action],
      },
    }));
  };

  // Save granular permissions to DB
  const handleSavePermissions = async () => {
    if (!selectedUserForMatrix) return;
    const res = await updateUserPermissions(selectedUserForMatrix.id, matrixPermissions);
    if (res.success) {
      showToast(`✓ Granular permissions updated for ${selectedUserForMatrix.fullName}`);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUserForMatrix.id ? { ...u, permissions: matrixPermissions } : u
        )
      );
    } else {
      showToast(`⚠️ Failed to update permissions: ${res.error}`);
    }
  };

  // Approve single user
  const handleApprove = async (userId: string) => {
    const chosenRole = pendingUserRolePicks[userId] || 'STORE';
    const res = await approveUser(userId, chosenRole);
    if (res.success) {
      showToast(`✓ User approved and activated with role ${chosenRole}`);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                approvalStatus: 'APPROVED',
                isActive: true,
                role: chosenRole,
                permissions: DEFAULT_ROLE_PERMISSIONS[chosenRole],
              }
            : u
        )
      );
    } else {
      showToast(`⚠️ Failed to approve: ${res.error}`);
    }
  };

  // Reject single user
  const handleReject = async (userId: string) => {
    const res = await rejectUser(userId);
    if (res.success) {
      showToast(`User registration rejected`);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, approvalStatus: 'REJECTED', isActive: false } : u
        )
      );
    } else {
      showToast(`⚠️ Failed to reject: ${res.error}`);
    }
  };

  // Bulk Approve Selected
  const handleBulkApprove = async () => {
    if (selectedUserIds.length === 0) return;
    const res = await bulkUpdateUsers(selectedUserIds, {
      approvalStatus: 'APPROVED',
      isActive: true,
      role: bulkTargetRole,
    });
    if (res.success) {
      showToast(`✓ Bulk approved ${selectedUserIds.length} users with role ${bulkTargetRole}`);
      setSelectedUserIds([]);
      loadRealUsers();
    } else {
      showToast(`⚠️ Bulk approval failed: ${res.error}`);
    }
  };

  // Single Role Change
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    const res = await updateUserRole(userId, newRole);
    if (res.success) {
      showToast(`✓ Role updated to ${newRole}`);
    } else {
      showToast(`⚠️ Role update failed: ${res.error}`);
    }
  };

  // Toggle active status
  const handleToggleActive = async (user: UserProfile) => {
    const newActive = !user.isActive;
    const res = await bulkUpdateUsers([user.id], { isActive: newActive });
    if (res.success) {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: newActive } : u))
      );
      showToast(`✓ Account ${newActive ? 'activated' : 'deactivated'}`);
    }
  };

  // SMTP Test Send
  const handleSendTestEmail = async () => {
    if (!testEmailTo) {
      showToast('Please enter an email address for testing');
      return;
    }
    setIsSendingTestEmail(true);
    setSmtpTestResult(null);
    try {
      const res = await fetch('/api/email/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'CUSTOM',
          payload: {
            to: testEmailTo,
            subject: '✓ [MIMS Test] SMTP Email Notification System Active',
            html: '<p>This is a verification email from your Material Inventory Management System (MIMS).</p>',
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSmtpTestResult(`✓ Test email dispatched successfully! (${data.mode || 'smtp'})`);
      } else {
        setSmtpTestResult(`⚠️ Dispatch error: ${data.error}`);
      }
    } catch (err: unknown) {
      setSmtpTestResult(`⚠️ Request failed: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const pendingUsers = users.filter((u) => u.approvalStatus === 'PENDING');
  const approvedUsers = users.filter((u) => u.approvalStatus === 'APPROVED' || u.role === 'ADMIN');

  const filteredApprovedUsers = approvedUsers.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' ? true : u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (currentAdminRole !== 'ADMIN') {
    return (
      <div style={{ padding: '32px', textAlign: 'center', background: '#fff', borderRadius: '12px' }}>
        <h2>Access Restricted</h2>
        <p style={{ color: '#64748b' }}>Only users with the Administrator role can access this panel.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#0f172a',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '10px',
            fontSize: '13.5px',
            fontWeight: 600,
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.25)',
            zIndex: 9999,
          }}
        >
          {toast}
        </div>
      )}

      {/* Mobile-First Compact Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            User Authorization & Access Control (RBAC)
          </h1>
          <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
            Approve employee accounts, assign roles, and configure granular permissions
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => loadRealUsers()}
            disabled={loading}
            className="btn-aurora"
            style={{
              padding: '8px 16px',
              fontSize: '12.5px',
              fontWeight: 700,
            }}
          >
            {loading ? 'Refreshing...' : '🔄 Refresh Users'}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '8px',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={() => setActiveTab('pending')}
          style={{
            padding: '10px 18px',
            borderRadius: '10px',
            border: 'none',
            fontSize: '13.5px',
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'pending' ? '#6b21a8' : '#f1f5f9',
            color: activeTab === 'pending' ? '#fff' : '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>⏳ Pending Approvals</span>
          <span
            style={{
              background: activeTab === 'pending' ? '#9333ea' : '#e2e8f0',
              color: activeTab === 'pending' ? '#fff' : '#0f172a',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 800,
            }}
          >
            {pendingUsers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '10px 18px',
            borderRadius: '10px',
            border: 'none',
            fontSize: '13.5px',
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'users' ? '#1e293b' : '#f1f5f9',
            color: activeTab === 'users' ? '#fff' : '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>👥 Authorized Users</span>
          <span
            style={{
              background: activeTab === 'users' ? '#334155' : '#e2e8f0',
              color: activeTab === 'users' ? '#fff' : '#0f172a',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 800,
            }}
          >
            {approvedUsers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          style={{
            padding: '10px 18px',
            borderRadius: '10px',
            border: 'none',
            fontSize: '13.5px',
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'matrix' ? '#047857' : '#f1f5f9',
            color: activeTab === 'matrix' ? '#fff' : '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>⚙️ Granular Permissions Matrix</span>
          {selectedUserForMatrix && (
            <span
              style={{
                background: '#059669',
                color: '#fff',
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              Editing: {selectedUserForMatrix.fullName.split(' ')[0]}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('smtp')}
          style={{
            padding: '10px 18px',
            borderRadius: '10px',
            border: 'none',
            fontSize: '13.5px',
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'smtp' ? '#2563eb' : '#f1f5f9',
            color: activeTab === 'smtp' ? '#fff' : '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>✉️ SMTP & Email Notifications</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PENDING APPROVALS                                                  */}
      {/* ========================================================================= */}
      {activeTab === 'pending' && (
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
                New Registrations Pending Admin Authorization
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Employees who self-registered on the portal. Assign their manufacturing role to grant access.
              </p>
            </div>

            {selectedUserIds.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#475569' }}>
                  {selectedUserIds.length} selected:
                </span>
                <select
                  value={bulkTargetRole}
                  onChange={(e) => setBulkTargetRole(e.target.value as UserRole)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    fontWeight: 600,
                  }}>
                  <option value="QC">Assign QC Inspector</option>
                  <option value="PRODUCTION">Assign Production Officer</option>
                  <option value="VIEWER">Assign General / Stock Viewer (Read-only)</option>
                  <option value="ADMIN">Assign Administrator</option>
                </select>
                <button
                  onClick={handleBulkApprove}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '8px',
                    background: '#15803d',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Bulk Approve & Activate
                </button>
              </div>
            )}
          </div>

          {pendingUsers.length === 0 ? (
            <div
              style={{
                padding: '48px',
                textAlign: 'center',
                color: '#64748b',
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px dashed #cbd5e1',
              }}
            >
              <span style={{ fontSize: '32px' }}>✓</span>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginTop: '8px' }}>
                No pending registrations
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                All user accounts are approved. When new employees register, they will appear here.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
                    <th style={{ padding: '12px', width: '36px' }}>
                      <input
                        type="checkbox"
                        checked={selectedUserIds.length === pendingUsers.length && pendingUsers.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedUserIds(pendingUsers.map((u) => u.id));
                          else setSelectedUserIds([]);
                        }}
                      />
                    </th>
                    <th style={{ padding: '12px', fontSize: '12.5px', fontWeight: 700, color: '#475569' }}>Employee Name</th>
                    <th style={{ padding: '12px', fontSize: '12.5px', fontWeight: 700, color: '#475569' }}>Work Email</th>
                    <th style={{ padding: '12px', fontSize: '12.5px', fontWeight: 700, color: '#475569' }}>Registered Date</th>
                    <th style={{ padding: '12px', fontSize: '12.5px', fontWeight: 700, color: '#475569' }}>Assign Role</th>
                    <th style={{ padding: '12px', fontSize: '12.5px', fontWeight: 700, color: '#475569', textAlign: 'right' }}>Authorization Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 12px' }}>
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(u.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedUserIds((prev) => [...prev, u.id]);
                            else setSelectedUserIds((prev) => prev.filter((id) => id !== u.id));
                          }}
                        />
                      </td>
                      <td style={{ padding: '14px 12px', fontWeight: 700, color: '#0f172a' }}>
                        {u.fullName}
                      </td>
                      <td style={{ padding: '14px 12px', color: '#64748b', fontSize: '13px' }}>
                        {u.email}
                      </td>
                      <td style={{ padding: '14px 12px', color: '#94a3b8', fontSize: '12.5px' }}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Recent'}
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <select
                          value={pendingUserRolePicks[u.id] || 'STORE'}
                          onChange={(e) =>
                            setPendingUserRolePicks((prev) => ({
                              ...prev,
                              [u.id]: e.target.value as UserRole,
                            }))
                          }
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            background: '#fff',
                          }}>
                          <option value="QC">Quality Inspector (QC)</option>
                          <option value="PRODUCTION">Production Officer</option>
                          <option value="VIEWER">General / Stock Viewer (Read-only)</option>
                          <option value="ADMIN">Administrator</option>
                        </select>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleApprove(u.id)}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '6px',
                              background: '#15803d',
                              color: '#fff',
                              fontSize: '12.5px',
                              fontWeight: 700,
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => handleReject(u.id)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              background: '#fff',
                              color: '#dc2626',
                              fontSize: '12.5px',
                              fontWeight: 600,
                              border: '1px solid #fca5a5',
                              cursor: 'pointer',
                            }}
                          >
                            ✕ Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AUTHORIZED ACTIVE USERS                                            */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            {/* Search & Filter */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search user name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  width: '260px',
                }}
              />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                <option value="ALL">All Roles</option>
                <option value="ADMIN">ADMIN</option>
                <option value="PURCHASE">PURCHASE</option>
                <option value="QC">QC</option>
                <option value="STORE">STORE</option>
                <option value="PRODUCTION">PRODUCTION</option>
                <option value="DISPATCH">DISPATCH</option>
                <option value="VIEWER">VIEWER</option>
              </select>
            </div>

            {selectedUserIds.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#475569' }}>
                  {selectedUserIds.length} users selected:
                </span>
                <select
                  value={bulkTargetRole}
                  onChange={(e) => setBulkTargetRole(e.target.value as UserRole)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                  }}>
                  <option value="QC">Role: QC Inspector</option>
                  <option value="PRODUCTION">Role: Production Officer</option>
                  <option value="VIEWER">Role: General / Stock Viewer</option>
                  <option value="ADMIN">Role: Administrator</option>
                </select>
                <button
                  onClick={async () => {
                    await bulkUpdateUsers(selectedUserIds, { role: bulkTargetRole });
                    showToast(`✓ Bulk changed role to ${bulkTargetRole}`);
                    loadRealUsers();
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: '#1e293b',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Bulk Change Role
                </button>
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="desktop-table-view" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left', minWidth: '650px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
                  <th style={{ padding: '12px', width: '36px' }}>
                    <input
                      type="checkbox"
                      checked={selectedUserIds.length === filteredApprovedUsers.length && filteredApprovedUsers.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedUserIds(filteredApprovedUsers.map((u) => u.id));
                        else setSelectedUserIds([]);
                      }}
                    />
                  </th>
                  <th style={{ padding: '12px', fontSize: '12.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>User</th>
                  <th style={{ padding: '12px', fontSize: '12.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>Assigned Role</th>
                  <th style={{ padding: '12px', fontSize: '12.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>Status</th>
                  <th style={{ padding: '12px', fontSize: '12.5px', fontWeight: 700, color: '#475569', textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApprovedUsers.map((u) => {
                  const meta = ROLES_METADATA[u.role] || ROLES_METADATA.VIEWER;
                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 12px' }}>
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(u.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedUserIds((prev) => [...prev, u.id]);
                            else setSelectedUserIds((prev) => prev.filter((id) => id !== u.id));
                          }}
                        />
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{u.fullName}</div>
                        <div style={{ fontSize: '12.5px', color: '#64748b' }}>{u.email}</div>
                      </td>
                      <td style={{ padding: '14px 12px', whiteSpace: 'nowrap' }}>
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: `1px solid ${meta.borderBadge}`,
                            background: meta.bgBadge,
                            color: meta.colorBadge,
                            fontSize: '12.5px',
                            fontWeight: 700,
                          }}>
                          <option value="ADMIN">ADMIN</option>
                          <option value="QC">QC</option>
                          <option value="PRODUCTION">PRODUCTION</option>
                          <option value="VIEWER">VIEWER (Read-only)</option>
                        </select>
                      </td>
                      <td style={{ padding: '14px 12px', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => handleToggleActive(u)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '999px',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            background: u.isActive ? '#ecfdf5' : '#fef2f2',
                            color: u.isActive ? '#065f46' : '#991b1b',
                          }}
                        >
                          {u.isActive ? '● ACTIVE' : '○ INACTIVE'}
                        </button>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => handleOpenMatrix(u)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#334155',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          ⚙ Granular Permissions
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View for Active Users */}
          <div className="mobile-card-view">
            {filteredApprovedUsers.map((u) => {
              const meta = ROLES_METADATA[u.role] || ROLES_METADATA.VIEWER;
              return (
                <div key={`m-u-${u.id}`} className="mobile-card-item">
                  <div className="mobile-card-header">
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{u.fullName}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{u.email}</div>
                    </div>
                    <button
                      onClick={() => handleToggleActive(u)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '999px',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        background: u.isActive ? '#ecfdf5' : '#fef2f2',
                        color: u.isActive ? '#065f46' : '#991b1b',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {u.isActive ? '● ACTIVE' : '○ INACTIVE'}
                    </button>
                  </div>

                  <div className="mobile-card-grid" style={{ gridTemplateColumns: '1fr' }}>
                    <div className="mobile-card-field">
                      <span className="mobile-card-field-label">ASSIGNED ROLE</span>
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: `1px solid ${meta.borderBadge}`,
                          background: meta.bgBadge,
                          color: meta.colorBadge,
                          fontSize: '12.5px',
                          fontWeight: 700,
                          marginTop: '4px',
                        }}>
                        <option value="ADMIN">ADMIN</option>
                        <option value="QC">QC</option>
                        <option value="PRODUCTION">PRODUCTION</option>
                        <option value="VIEWER">VIEWER (Read-only)</option>
                      </select>
                    </div>
                  </div>

                  <div className="mobile-card-actions">
                    <button
                      onClick={() => handleOpenMatrix(u)}
                      className="btn-outline"
                      style={{ flex: 1, padding: '7px 12px', fontSize: '12px', justifyContent: 'center' }}
                    >
                      ⚙ Granular Permissions
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: GRANULAR PERMISSION MATRIX                                         */}
      {/* ========================================================================= */}
      {activeTab === 'matrix' && (
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Granular Module Access Matrix
                </h2>
                {selectedUserForMatrix ? (
                  <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 700 }}>
                    Target: {selectedUserForMatrix.fullName} ({selectedUserForMatrix.role})
                  </span>
                ) : (
                  <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600 }}>
                    Select a user below to customize
                  </span>
                )}
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', margin: 0 }}>
                Control exactly what this employee can <strong>View</strong>, <strong>Create</strong>, <strong>Edit</strong>, <strong>Delete</strong>, or <strong>Approve</strong> across every department.
              </p>
            </div>

            {/* Quick Defaults / Presets */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Apply Preset Defaults:</span>
              {(['PURCHASE', 'QC', 'STORE', 'PRODUCTION', 'DISPATCH', 'VIEWER'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => handleResetToRoleDefault(r)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* User selector dropdown if matrix opened without target */}
          <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>Select Target Employee:</span>
            <select
              value={selectedUserForMatrix?.id || ''}
              onChange={(e) => {
                const target = users.find((u) => u.id === e.target.value);
                if (target) handleOpenMatrix(target);
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                fontWeight: 600,
                background: '#fff',
              }}
            >
              <option value="">-- Choose User --</option>
              {approvedUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.email}) — [{u.role}]
                </option>
              ))}
            </select>
          </div>

          {/* Matrix Table */}
          <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
                  <th style={{ padding: '12px 16px', fontSize: '12.5px', fontWeight: 700, color: '#475569' }}>Manufacturing Module</th>
                  <th style={{ padding: '12px 16px', fontSize: '12.5px', fontWeight: 700, color: '#475569', textAlign: 'center' }}>Can View (Read)</th>
                  <th style={{ padding: '12px 16px', fontSize: '12.5px', fontWeight: 700, color: '#475569', textAlign: 'center' }}>Can Create (Add)</th>
                  <th style={{ padding: '12px 16px', fontSize: '12.5px', fontWeight: 700, color: '#475569', textAlign: 'center' }}>Can Edit (Update)</th>
                  <th style={{ padding: '12px 16px', fontSize: '12.5px', fontWeight: 700, color: '#475569', textAlign: 'center' }}>Can Delete</th>
                  <th style={{ padding: '12px 16px', fontSize: '12.5px', fontWeight: 700, color: '#475569', textAlign: 'center' }}>Can Authorize / Approve</th>
                </tr>
              </thead>
              <tbody>
                {ALL_SYSTEM_MODULES.map((mod) => {
                  const perm = matrixPermissions[mod.id] || {
                    canView: false,
                    canCreate: false,
                    canEdit: false,
                    canDelete: false,
                    canApprove: false,
                  };

                  return (
                    <tr key={mod.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13.5px' }}>{mod.label}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{mod.description}</div>
                      </td>
                      {(['canView', 'canCreate', 'canEdit', 'canDelete', 'canApprove'] as (keyof ModulePermission)[]).map((action) => (
                        <td key={action} style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={Boolean(perm[action])}
                            onChange={() => handleTogglePermission(mod.id, action)}
                            style={{
                              width: '18px',
                              height: '18px',
                              cursor: 'pointer',
                              accentColor: '#059669',
                            }}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Save Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              onClick={handleSavePermissions}
              disabled={!selectedUserForMatrix}
              style={{
                padding: '10px 24px',
                borderRadius: '10px',
                background: selectedUserForMatrix ? '#059669' : '#cbd5e1',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 700,
                border: 'none',
                cursor: selectedUserForMatrix ? 'pointer' : 'not-allowed',
                boxShadow: selectedUserForMatrix ? '0 4px 12px rgba(5, 150, 105, 0.3)' : 'none',
              }}
            >
              ✓ Save Customized Permissions to Database
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SMTP EMAIL NOTIFICATIONS                                           */}
      {/* ========================================================================= */}
      {activeTab === 'smtp' && (
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
            SMTP Email Sender & Event Trigger Configuration
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 24px' }}>
            MIMS sends real-time transactional emails to the right department personnel upon critical manufacturing events.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '28px' }}>
            {/* Event Card 1 */}
            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#6b21a8', marginBottom: '6px' }}>
                👤 New User Registration
              </div>
              <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.5 }}>
                Recipient: <strong>Plant Administrator</strong><br />
                Trigger: When an employee registers on the portal and requires role assignment.
              </div>
            </div>

            {/* Event Card 2 */}
            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#1d4ed8', marginBottom: '6px' }}>
                📦 Goods Received Note (GRN) Inward
              </div>
              <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.5 }}>
                Recipient: <strong>Quality Inspector (QC Team)</strong><br />
                Trigger: When dock receiving unloads material and creates GRN in <code>QC_PENDING</code>.
              </div>
            </div>

            {/* Event Card 3 */}
            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#047857', marginBottom: '6px' }}>
                🔬 QC Inspection Pass / Fail
              </div>
              <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.5 }}>
                Recipient: <strong>Store Manager / Purchase Officer</strong><br />
                Trigger: Pass routes to Store; Rejection alerts Purchase for supplier debit note.
              </div>
            </div>

            {/* Event Card 4 */}
            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#4338ca', marginBottom: '6px' }}>
                🚚 Outbound Dispatch Challan
              </div>
              <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.5 }}>
                Recipient: <strong>Logistics & Customer</strong><br />
                Trigger: Delivery challan issued for ready-to-ship finished goods.
              </div>
            </div>
          </div>

          {/* Test Email Box */}
          <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#166534', margin: '0 0 6px' }}>
              Send Test Verification Email
            </h3>
            <p style={{ fontSize: '12.5px', color: '#15803d', margin: '0 0 14px' }}>
              Send a test notification to verify your SMTP mail configuration.
            </p>

            <div style={{ display: 'flex', gap: '10px', maxWidth: '500px' }}>
              <input
                type="email"
                placeholder="Enter recipient email..."
                value={testEmailTo}
                onChange={(e) => setTestEmailTo(e.target.value)}
                style={{
                  flex: 1,
                  padding: '9px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                }}
              />
              <button
                onClick={handleSendTestEmail}
                disabled={isSendingTestEmail}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  background: '#15803d',
                  color: '#fff',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: isSendingTestEmail ? 'not-allowed' : 'pointer',
                }}
              >
                {isSendingTestEmail ? 'Sending...' : 'Send Test'}
              </button>
            </div>

            {smtpTestResult && (
              <div style={{ marginTop: '12px', fontSize: '13px', fontWeight: 600, color: smtpTestResult.startsWith('✓') ? '#166534' : '#b91c1c' }}>
                {smtpTestResult}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
