'use client';

import React, { useState, useEffect } from 'react';
import type { AdminUser, DashboardStats, QuestTask, PlatformSettings } from '../../types';
import { api } from '../../lib/api';
import { AdminLogin } from './AdminLogin';
import { AdminHeader } from './AdminHeader';
import { AdminSidebar, type AdminTab } from './AdminSidebar';
import { AdminStatsView } from './AdminStatsView';
import { AdminQuestsView } from './AdminQuestsView';
import { AdminApplicationsView } from './AdminApplicationsView';
import { AdminSettingsView } from './AdminSettingsView';
import { AdminAuditLogsView } from './AdminAuditLogsView';

interface AdminDashboardProps {
  onReturnToPublic: () => void;
  isOpen: boolean;
  onRefreshGlobalConfig: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onReturnToPublic,
  isOpen,
  onRefreshGlobalConfig,
}) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [currentTab, setCurrentTab] = useState<AdminTab>('dashboard');

  // Stats & tasks state
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tasks, setTasks] = useState<QuestTask[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [appStatusFilter, setAppStatusFilter] = useState('All');

  // Verify auth session on load
  const checkAuth = async () => {
    try {
      setCheckingAuth(true);
      const user = await api.verifyAdminMe();
      setAdmin(user);
    } catch {
      setAdmin(null);
    } finally {
      setCheckingAuth(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const loadData = async () => {
    if (!admin) return;
    try {
      setStatsLoading(true);
      const [s, t] = await Promise.all([api.getAdminStats(), api.getAdminTasks()]);
      setStats(s);
      setTasks(t);
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (admin) {
      loadData();
    }
  }, [admin]);

  const handleLogout = async () => {
    await api.adminLogout();
    setAdmin(null);
  };

  // Master Early Access toggle
  const handleToggleEarlyAccess = async () => {
    try {
      const currentSettings = await api.getSettings();
      await api.updateSettings({
        early_access: {
          ...currentSettings.early_access,
          is_open: !isOpen,
        },
      });
      onRefreshGlobalConfig();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center p-4 bg-grid-pattern">
        <div className="text-center text-[#facc15]">
          <div className="w-9 h-9 border-2 border-[#facc15] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-arcade text-[#facc15] tracking-wider">VERIFYING SECURITY TOKENS...</p>
        </div>
      </div>
    );
  }

  if (!admin) {
    return (
      <AdminLogin
        onSuccess={(loggedUser) => {
          setAdmin(loggedUser);
          loadData();
        }}
        onBackToPublic={onReturnToPublic}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0e14] text-[#f0fdf4] flex flex-col bg-grid-pattern">
      {/* Admin Top Header */}
      <AdminHeader
        admin={admin}
        isOpen={isOpen}
        onToggleStatus={handleToggleEarlyAccess}
        onLogout={handleLogout}
        onReturnToPublic={onReturnToPublic}
      />

      {/* Main Admin Body */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto border-x border-[#262f3d]/60 shadow-[0_16px_48px_rgba(0,0,0,0.4)]">
        {/* Sidebar */}
        <AdminSidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          pendingCount={stats?.pending || 0}
          onReturnToPublic={onReturnToPublic}
        />

        {/* Tab Content Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <AdminStatsView
              stats={stats}
              loading={statsLoading}
              onNavigateToApplications={(filter) => {
                if (filter) setAppStatusFilter(filter);
                setCurrentTab('applications');
              }}
            />
          )}

          {currentTab === 'quests' && (
            <AdminQuestsView
              tasks={tasks}
              onTasksUpdated={() => {
                loadData();
                onRefreshGlobalConfig();
              }}
            />
          )}

          {currentTab === 'applications' && (
            <AdminApplicationsView
              initialStatusFilter={appStatusFilter}
              onApplicantReviewed={() => loadData()}
            />
          )}

          {currentTab === 'settings' && (
            <AdminSettingsView
              onSettingsSaved={() => {
                loadData();
                onRefreshGlobalConfig();
              }}
            />
          )}

          {currentTab === 'audit_logs' && <AdminAuditLogsView />}
        </main>
      </div>
    </div>
  );
};
