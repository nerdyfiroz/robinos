'use client';

import React from 'react';
import {
  LayoutDashboard,
  Sparkles,
  Users,
  Settings,
  History,
  ShieldCheck,
  Home,
  Wallet,
} from 'lucide-react';

export type AdminTab = 'dashboard' | 'quests' | 'applications' | 'whitelist' | 'settings' | 'audit_logs';

interface AdminSidebarProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  pendingCount: number;
  onReturnToPublic: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentTab,
  onSelectTab,
  pendingCount,
  onReturnToPublic,
}) => {
  const navItems: { id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { id: 'dashboard', label: 'DASHBOARD', icon: LayoutDashboard },
    { id: 'quests', label: 'QUEST MANAGEMENT', icon: Sparkles },
    { id: 'applications', label: 'APPLICATIONS', icon: Users, badge: pendingCount },
    { id: 'whitelist', label: 'WHITELIST', icon: Wallet },
    { id: 'settings', label: 'SETTINGS', icon: Settings },
    { id: 'audit_logs', label: 'AUDIT LOGS', icon: History },
  ];

  return (
    <aside className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-[#262f3d] bg-[#10141c] p-4 shrink-0">
      <nav className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center justify-between px-3.5 py-2.5 text-xs font-arcade font-bold whitespace-nowrap transition-all rounded-xl border ${
                isActive
                  ? 'bg-[#facc15] text-[#121820] border-[#facc15] shadow-[0_4px_16px_rgba(250,204,21,0.25)]'
                  : 'text-[#94a3b8] bg-[#141922] border-[#262f3d] hover:border-[#facc15]/50 hover:bg-[#1e2430] hover:text-[#f0fdf4]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#121820]' : 'text-[#facc15]'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`px-1.5 py-0.5 text-[9px] font-code rounded font-bold ${
                    isActive ? 'bg-[#121820] text-[#facc15]' : 'bg-[#292215] text-[#facc15] border border-[#6b5118]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Go to Home Page Button in Sidebar */}
      <div className="mt-4 pt-4 border-t border-[#262f3d]">
        <button
          onClick={onReturnToPublic}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-arcade font-bold text-[#facc15] bg-[#141922] hover:bg-[#1e2430] border border-[#262f3d] hover:border-[#facc15]/60 rounded-xl transition-all shadow-sm"
          title="Return to Public Home Page"
        >
          <Home className="w-3.5 h-3.5 text-[#facc15]" />
          <span>GO TO HOME PAGE</span>
        </button>
      </div>

      {/* Security pill at sidebar bottom */}
      <div className="hidden lg:block mt-8 p-3.5 bg-[#141922] border border-[#262f3d] rounded-xl text-[10px] text-[#94a3b8]">
        <div className="flex items-center gap-1.5 text-[#facc15] font-arcade font-bold mb-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>ACCESS ENFORCED</span>
        </div>
        <p className="leading-relaxed">RBAC: Token validated. Actions are stamped in the immutable audit log.</p>
      </div>
    </aside>
  );
};
