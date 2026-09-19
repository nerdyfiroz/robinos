'use client';

import React from 'react';
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Calendar,
  Sparkles,
  ShieldAlert,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import type { DashboardStats } from '../../types';

interface AdminStatsViewProps {
  stats: DashboardStats | null;
  loading: boolean;
  onNavigateToApplications: (filterStatus?: string) => void;
}

export const AdminStatsView: React.FC<AdminStatsViewProps> = ({
  stats,
  loading,
  onNavigateToApplications,
}) => {
  if (loading || !stats) {
    return (
      <div className="py-16 text-center text-[#facc15]">
        <div className="w-9 h-9 border-2 border-[#facc15] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-arcade tracking-wider">CALCULATING ONCHAIN EARLY ACCESS METRICS...</p>
      </div>
    );
  }

  const statCards = [
    {
      label: 'TOTAL APPLICANTS',
      value: stats.total_applicants,
      icon: Users,
      color: 'text-[#f0fdf4]',
      border: 'border-[#262f3d]',
      bg: 'bg-[#181d26]',
      filter: 'All',
    },
    {
      label: 'PENDING REVIEW',
      value: stats.pending,
      icon: Clock,
      color: 'text-amber-400',
      border: 'border-amber-700/50',
      bg: 'bg-amber-950/20',
      filter: 'Pending',
    },
    {
      label: 'APPROVED ACCESS',
      value: stats.approved,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      border: 'border-emerald-700/50',
      bg: 'bg-emerald-950/20',
      filter: 'Approved',
    },
    {
      label: 'REJECTED',
      value: stats.rejected,
      icon: XCircle,
      color: 'text-red-400',
      border: 'border-red-700/50',
      bg: 'bg-red-950/20',
      filter: 'Rejected',
    },
    {
      label: 'UNDER REVIEW',
      value: stats.under_review,
      icon: HelpCircle,
      color: 'text-purple-400',
      border: 'border-purple-700/50',
      bg: 'bg-purple-950/20',
      filter: 'Under Review',
    },
    {
      label: "TODAY'S APPLICATIONS",
      value: stats.todays_applications,
      icon: Calendar,
      color: 'text-[#facc15]',
      border: 'border-[#262f3d]',
      bg: 'bg-[#181d26]',
    },
    {
      label: 'COMPLETED (100% TASKS)',
      value: stats.completed_applications,
      icon: Sparkles,
      color: 'text-[#facc15]',
      border: 'border-[#6b5118]/60',
      bg: 'bg-[#292215]/30',
    },
    {
      label: 'DUPLICATE ATTEMPTS BLOCKED',
      value: stats.duplicate_attempts,
      icon: ShieldAlert,
      color: 'text-orange-400',
      border: 'border-orange-700/50',
      bg: 'bg-orange-950/20',
    },
  ];

  // Calculate max count for daily trends
  const maxTrend = Math.max(1, ...stats.daily_trends.map((t) => t.count));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="font-arcade text-xl sm:text-2xl text-[#f0fdf4] mb-1 tracking-wide">
          SYSTEM STATISTICS
        </h2>
        <p className="text-xs text-[#94a3b8]">
          Real-time snapshot of the ROBINOS Early Access campaign, moderation queue, and quest engagement.
        </p>
      </div>

      {/* 8 Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={() => card.filter && onNavigateToApplications(card.filter)}
              className={`p-4 sm:p-5 border ${card.border} ${card.bg} rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-all ${
                card.filter ? 'cursor-pointer hover:border-[#facc15]/70 hover:scale-[1.02]' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] text-[#94a3b8] font-arcade font-bold truncate">
                  {card.label}
                </span>
                <Icon className={`w-4 h-4 ${card.color} shrink-0`} />
              </div>
              <div className={`font-arcade text-2xl sm:text-3xl font-bold ${card.color}`}>
                {card.value}
              </div>
              {card.filter && (
                <div className="text-[9px] font-arcade text-[#94a3b8] mt-1.5 hover:text-[#facc15] transition-colors">
                  FILTER LIST →
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Bar Chart */}
        <div className="p-5 sm:p-6 bg-[#141922] border border-[#262f3d] rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-[#262f3d]">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#facc15]" />
              <h3 className="font-arcade text-xs sm:text-sm text-[#f0fdf4] tracking-wide">
                DAILY SUBMISSIONS (LAST 7 DAYS)
              </h3>
            </div>
            <span className="text-[10px] text-[#94a3b8] font-arcade">VOLUME</span>
          </div>

          <div className="h-44 flex items-end justify-between gap-2 pt-4 px-2">
            {stats.daily_trends.map((item, idx) => {
              const heightPercent = Math.max(8, Math.round((item.count / maxTrend) * 100));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  {/* Tooltip on hover */}
                  <div className="text-[9px] text-[#facc15] font-code opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {item.count} subs
                  </div>

                  {/* Pixel bar */}
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full bg-[#facc15] hover:bg-[#fde047] rounded-t-md transition-all relative overflow-hidden shadow-sm"
                  >
                    {item.approved > 0 && (
                      <div
                        style={{
                          height: `${Math.round((item.approved / (item.count || 1)) * 100)}%`,
                        }}
                        className="w-full bg-emerald-500 absolute bottom-0 left-0"
                        title={`${item.approved} approved`}
                      />
                    )}
                  </div>

                  {/* Date label */}
                  <span className="text-[10px] text-[#94a3b8] font-code">{item.date}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-6 mt-4 pt-3 border-t border-[#262f3d] text-[10px] text-[#94a3b8] font-arcade">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#facc15] rounded-sm inline-block" />
              <span>Total Submissions</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm inline-block" />
              <span>Approved</span>
            </div>
          </div>
        </div>

        {/* Quest Completion Distribution */}
        <div className="p-5 sm:p-6 bg-[#141922] border border-[#262f3d] rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-[#262f3d]">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#facc15]" />
              <h3 className="font-arcade text-xs sm:text-sm text-[#f0fdf4] tracking-wide">
                QUEST COMPLETION RATE
              </h3>
            </div>
            <span className="text-[10px] text-[#94a3b8] font-arcade">ENGAGEMENT</span>
          </div>

          <div className="space-y-4">
            {stats.task_completion_stats.map((t, idx) => {
              const maxTask = Math.max(1, stats.total_applicants);
              const percent = Math.min(100, Math.round((t.count / maxTask) * 100));

              return (
                <div key={idx}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-[#f0fdf4] font-bold truncate max-w-[240px]">
                      {t.title}
                    </span>
                    <span className="text-[#facc15] font-code font-bold">
                      {t.count} ({percent}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-[#1e2430] border border-[#2d3748] rounded-full overflow-hidden">
                    <div
                      style={{ width: `${percent}%` }}
                      className="h-full bg-[#facc15] rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
