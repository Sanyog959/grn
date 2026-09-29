'use client';

import React, { useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AppNavbar } from './AppNavbar';
import { AppSidebar, NavItemKey } from './AppSidebar';
import { AuthModal } from '@/components/auth/AuthModal';
import { AuthPage } from '@/components/auth/AuthPage';
import { PendingApprovalView } from '@/components/auth/PendingApprovalView';
import { SupabaseConfigModal } from '@/app/components/SupabaseConfigModal';
import { UserManagementView } from '@/components/admin/UserManagementView';
import { ROLES_METADATA } from '@/types/auth';

interface AppLayoutProps {
  children?: React.ReactNode;
  supabaseUrl: string;
  supabaseKey: string;
  onSaveConfig: (url: string, key: string) => void;
  onTestConnection: (url: string, key: string) => Promise<boolean>;
  onSeedDemoData: (url: string, key: string) => Promise<boolean>;
  isConnected: boolean;
  isTesting: boolean;
  activeItem?: NavItemKey;
  onNavigate?: (item: NavItemKey) => void;
}

const AppContent: React.FC<AppLayoutProps> = ({
  children,
  supabaseUrl,
  supabaseKey,
  onSaveConfig,
  onTestConnection,
  onSeedDemoData,
  isConnected,
  isTesting,
  activeItem: activeItemProp,
  onNavigate: onNavigateProp,
}) => {
  const { role, profile, isAuthenticated, isPendingApproval, isApproved, isLoading } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [internalActiveItem, setInternalActiveItem] = useState<NavItemKey>('dashboard');
  const activeItem = activeItemProp !== undefined ? activeItemProp : internalActiveItem;

  const handleNavigate = (item: NavItemKey) => {
    setIsMobileSidebarOpen(false);
    if (onNavigateProp) {
      onNavigateProp(item);
    } else {
      setInternalActiveItem(item);
    }
  };

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isDbSetupOpen, setIsDbSetupOpen] = useState(false);

  // 1. Initial Auth Loading State
  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #090d16 0%, #111827 50%, #1e1b4b 100%)',
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '14px', animation: 'spin 1.5s linear infinite' }}>
            ⚙️
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>
            Connecting to MIMS Plant Portal...
          </div>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px' }}>
            Verifying security session and permissions
          </div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated User Gate: Show Login / Register Page first (NOT dashboard directly!)
  if (!isAuthenticated) {
    return (
      <>
        <AuthPage onOpenDbSetup={() => setIsDbSetupOpen(true)} isConnected={isConnected} />
        <SupabaseConfigModal
          isOpen={isDbSetupOpen}
          onClose={() => setIsDbSetupOpen(false)}
          supabaseUrl={supabaseUrl}
          supabaseKey={supabaseKey}
          onSaveConfig={onSaveConfig}
          onTestConnection={onTestConnection}
          onSeedDemoData={onSeedDemoData}
          isConnected={isConnected}
          isTesting={isTesting}
        />
      </>
    );
  }

  // 3. User Registered but Pending Admin Approval: Show "Account Under Review" screen
  if (isPendingApproval || (!isApproved && role !== 'ADMIN')) {
    return <PendingApprovalView />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      {/* Top Navbar with Mobile Hamburger */}
      <AppNavbar
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenDbSetup={() => setIsDbSetupOpen(true)}
        isConnected={isConnected}
        onToggleMobileMenu={() => setIsMobileSidebarOpen((prev) => !prev)}
      />

      {/* Main Layout Container: Sidebar + Content */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <AppSidebar
          activeItem={activeItem}
          onNavigate={handleNavigate}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        <main
          style={{
            flex: 1,
            padding: '16px 20px',
            width: '100%',
            minWidth: 0,
            overflowX: 'auto',
          }}
        >
          {/* Views Router: Never show stubs or placeholders! */}
          {activeItem === 'admin-users' ? <UserManagementView /> : children}
        </main>
      </div>

      {/* Modals */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <SupabaseConfigModal
        isOpen={isDbSetupOpen}
        onClose={() => setIsDbSetupOpen(false)}
        supabaseUrl={supabaseUrl}
        supabaseKey={supabaseKey}
        onSaveConfig={onSaveConfig}
        onTestConnection={onTestConnection}
        onSeedDemoData={onSeedDemoData}
        isConnected={isConnected}
        isTesting={isTesting}
      />
    </div>
  );
};

export const AppLayout: React.FC<AppLayoutProps> = (props) => {
  return (
    <AuthProvider>
      <AppContent {...props} />
    </AuthProvider>
  );
};
