'use client';

import React, { useState } from 'react';
import { Shield, Power, ExternalLink, LogOut, RefreshCw, Check, AlertTriangle, Home } from 'lucide-react';
import type { AdminUser, PlatformSettings } from '../../types';
import { api } from '../../lib/api';

interface AdminHeaderProps {
  admin: AdminUser;
  isOpen: boolean;
  onToggleStatus: () => Promise<void>;
  onLogout: () => void;
  onReturnToPublic: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  admin,
  isOpen,
  onToggleStatus,
  onLogout,
  onReturnToPublic,
}) => {
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    try {
      setToggling(true);
      await onToggleStatus();
    } finally {
      setToggling(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-[#262f3d] bg-[#0e121a]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Left: Brand / Admin identity */}
        <div className="flex items-center gap-3">
          <img
            src="/3.png"
            alt="ROBINOS Logo"
            referrerPolicy="no-referrer"
            className="w-9 h-9 object-cover border-2 border-[#facc15] rounded-xl shadow-[0_2px_10px_rgba(250,204,21,0.2)]"
            style={{ imageRendering: 'pixelated' }}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-arcade text-base text-[#facc15] tracking-wide">ROBINOS ADMIN</span>
              <span className="px-2 py-0.5 text-[9px] bg-[#292215] text-[#facc15] border border-[#6b5118] rounded font-arcade">
                {admin.role.toUpperCase()}
              </span>
            </div>
            <p className="text-[10px] text-[#94a3b8] font-code truncate max-w-[200px] sm:max-w-none">
              Logged in as: {admin.email}
            </p>
          </div>
        </div>

        {/* Right: Master Switch, Public Link, Logout */}
        <div className="flex items-center gap-3">
          {/* Master Early Access Switch */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#141922] border border-[#262f3d] rounded-xl">
            <span className="text-[10px] font-bold text-[#94a3b8] font-arcade hidden md:inline">
              EARLY ACCESS STATUS:
            </span>
            <button
              id="admin-master-switch"
              onClick={handleToggle}
              disabled={toggling}
              className={`px-2.5 py-1 text-[11px] font-arcade font-bold flex items-center gap-1.5 transition-all rounded-lg ${
                isOpen
                  ? 'bg-[#facc15] text-[#121820] hover:bg-[#fde047] shadow-[0_2px_8px_rgba(250,204,21,0.3)]'
                  : 'bg-red-600 text-white hover:bg-red-500'
              }`}
              title="Click to toggle Early Access open/closed immediately"
            >
              {toggling ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <span
                  className={`w-2 h-2 rounded-full inline-block ${
                    isOpen ? 'bg-[#121820] animate-pulse' : 'bg-white'
                  }`}
                />
              )}
              <span>{isOpen ? '🟢 OPEN' : '🔴 CLOSED'}</span>
            </button>
          </div>

          {/* Go to Home Page Button */}
          <button
            id="admin-go-home-btn"
            onClick={onReturnToPublic}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-arcade font-bold text-[#facc15] bg-[#141922] hover:bg-[#1e2430] border border-[#262f3d] hover:border-[#facc15]/60 rounded-xl transition-all shadow-sm"
            title="Go to Home Page"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">GO TO HOME PAGE</span>
          </button>

          {/* Logout */}
          <button
            id="admin-logout-btn"
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-arcade text-red-400 bg-[#141922] hover:bg-red-950/40 border border-[#262f3d] hover:border-red-500/50 rounded-xl transition-colors shadow-sm"
            title="Log out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">LOGOUT</span>
          </button>
        </div>
      </div>
    </header>
  );
};
