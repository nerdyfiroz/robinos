'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  CheckSquare,
  Square,
  RefreshCw,
  Eye,
} from 'lucide-react';
import type { Applicant, ApplicantStatus } from '../../types';
import { api } from '../../lib/api';
import { ApplicantDetailModal } from './ApplicantDetailModal';

interface AdminApplicationsViewProps {
  initialStatusFilter?: string;
  onApplicantReviewed?: () => void;
}

export const AdminApplicationsView: React.FC<AdminApplicationsViewProps> = ({
  initialStatusFilter = 'All',
  onApplicantReviewed,
}) => {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [reviewedFilter, setReviewedFilter] = useState('All');
  const [completionFilter, setCompletionFilter] = useState('All');

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkModalAction, setBulkModalAction] = useState<
    'approve' | 'reject' | 'waitlist' | 'mark_reviewed' | null
  >(null);
  const [bulkAllocation, setBulkAllocation] = useState('1 NFT');
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Detail Modal
  const [inspectApplicant, setInspectApplicant] = useState<Applicant | null>(null);

  const fetchApplicants = async () => {
    try {
      setLoading(true);
      const data = await api.getApplicants({
        search,
        status: statusFilter,
        reviewed: reviewedFilter,
        completion: completionFilter,
      });
      setApplicants(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicants();
  }, [statusFilter, reviewedFilter, completionFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchApplicants();
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === applicants.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(applicants.map((a) => a.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkConfirm = async () => {
    if (!bulkModalAction || selectedIds.length === 0) return;

    try {
      setBulkProcessing(true);
      await api.bulkApplicantAction(
        selectedIds,
        bulkModalAction,
        bulkModalAction === 'approve' || bulkModalAction === 'waitlist' ? bulkAllocation : undefined
      );
      setBulkModalAction(null);
      setSelectedIds([]);
      fetchApplicants();
      if (onApplicantReviewed) onApplicantReviewed();
    } catch (err: any) {
      alert(err.message || 'Bulk operation failed');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const blob = await api.exportApplicantsCSV();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `robinos_early_access_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Failed to export CSV');
    }
  };

  const getStatusBadge = (status: ApplicantStatus) => {
    switch (status) {
      case 'Approved':
        return <span className="px-2.5 py-1 bg-emerald-950/70 text-emerald-300 border border-emerald-500/50 rounded-lg text-[10px] font-arcade font-bold">APPROVED</span>;
      case 'Rejected':
        return <span className="px-2.5 py-1 bg-red-950/70 text-red-300 border border-red-500/50 rounded-lg text-[10px] font-arcade font-bold">REJECTED</span>;
      case 'Waitlisted':
        return <span className="px-2.5 py-1 bg-blue-950/70 text-blue-300 border border-blue-500/50 rounded-lg text-[10px] font-arcade font-bold">WAITLISTED</span>;
      case 'Under Review':
        return <span className="px-2.5 py-1 bg-purple-950/70 text-purple-300 border border-purple-500/50 rounded-lg text-[10px] font-arcade font-bold">UNDER REVIEW</span>;
      default:
        return <span className="px-2.5 py-1 bg-amber-950/70 text-amber-300 border border-amber-500/50 rounded-lg text-[10px] font-arcade font-bold">PENDING</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-arcade text-xl sm:text-2xl text-[#f0fdf4] mb-1 tracking-wide">
            APPLICANT MANAGEMENT
          </h2>
          <p className="text-xs text-[#94a3b8]">
            Review submissions, inspect quest proofs, assign NFT allocations, and execute bulk moderation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchApplicants}
            className="p-2.5 bg-[#141922] hover:bg-[#1e2430] border border-[#262f3d] rounded-xl text-[#94a3b8] hover:text-[#facc15] transition-colors"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            id="btn-export-csv"
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-[#141922] hover:bg-[#1e2430] text-[#facc15] border border-[#262f3d] hover:border-[#facc15]/50 rounded-xl text-xs font-arcade font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT CSV</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-5 bg-[#141922] border border-[#262f3d] rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.3)] space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
            <input
              type="text"
              placeholder="Search by Wallet (0x...), X username (@...), or Application ID (RB-...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-[#1e2430] border border-[#2d3748] rounded-xl focus:border-[#facc15] text-[#f0fdf4] font-code focus:outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-[#facc15] hover:bg-[#fde047] text-[#121820] font-arcade font-bold text-xs rounded-xl transition-all shadow-sm"
          >
            SEARCH
          </button>
        </form>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#1e2430] text-xs">
          <div className="flex items-center gap-1.5 text-[#94a3b8]">
            <Filter className="w-3.5 h-3.5 text-[#facc15]" />
            <span className="text-[11px] font-arcade font-bold">FILTERS:</span>
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#1e2430] border border-[#2d3748] rounded-lg text-[#facc15] text-xs font-arcade focus:outline-none focus:border-[#facc15]"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Under Review">Under Review</option>
            <option value="Approved">Approved</option>
            <option value="Waitlisted">Waitlisted</option>
            <option value="Rejected">Rejected</option>
          </select>

          {/* Completion filter */}
          <select
            value={completionFilter}
            onChange={(e) => setCompletionFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#1e2430] border border-[#2d3748] rounded-lg text-[#94a3b8] text-xs focus:outline-none focus:border-[#facc15]"
          >
            <option value="All">All Completion</option>
            <option value="100%">100% Completed Only</option>
            <option value="<100%">&lt;100% Completed</option>
          </select>

          {/* Reviewed filter */}
          <select
            value={reviewedFilter}
            onChange={(e) => setReviewedFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#1e2430] border border-[#2d3748] rounded-lg text-[#94a3b8] text-xs focus:outline-none focus:border-[#facc15]"
          >
            <option value="All">All Review Status</option>
            <option value="Unreviewed">Unreviewed Only</option>
            <option value="Reviewed">Reviewed Only</option>
          </select>

          <span className="text-[11px] text-[#94a3b8] ml-auto font-arcade">
            Showing {applicants.length} applicants
          </span>
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="p-4 bg-[#141922] border-2 border-[#facc15] rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-2">
            <span className="font-arcade text-xs text-[#facc15]">
              {selectedIds.length} APPLICANTS SELECTED
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setBulkModalAction('approve')}
              className="px-3.5 py-1.5 bg-[#facc15] hover:bg-[#fde047] text-[#121820] font-arcade font-bold text-xs rounded-xl shadow-sm transition-all"
            >
              APPROVE SELECTED
            </button>
            <button
              onClick={() => setBulkModalAction('waitlist')}
              className="px-3.5 py-1.5 bg-blue-950 hover:bg-blue-900 text-blue-200 border border-blue-700 font-arcade text-xs font-bold rounded-xl transition-all"
            >
              WAITLIST SELECTED
            </button>
            <button
              onClick={() => setBulkModalAction('reject')}
              className="px-3.5 py-1.5 bg-red-950 hover:bg-red-900 text-red-200 border border-red-700 font-arcade text-xs font-bold rounded-xl transition-all"
            >
              REJECT SELECTED
            </button>
            <button
              onClick={() => setBulkModalAction('mark_reviewed')}
              className="px-3.5 py-1.5 bg-[#1e2430] hover:bg-[#262f3d] text-[#f0fdf4] border border-[#2d3748] font-arcade text-xs font-bold rounded-xl transition-all"
            >
              MARK REVIEWED
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 text-xs text-[#94a3b8] hover:text-white font-arcade"
            >
              CLEAR
            </button>
          </div>
        </div>
      )}

      {/* Applicants Table */}
      <div className="bg-[#141922] border border-[#262f3d] rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.3)] overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#262f3d] bg-[#10141c] text-[#94a3b8]">
              <th className="p-3.5 w-10 text-center">
                <button onClick={toggleSelectAll} className="p-1">
                  {selectedIds.length === applicants.length && applicants.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-[#facc15]" />
                  ) : (
                    <Square className="w-4 h-4 text-[#475569]" />
                  )}
                </button>
              </th>
              <th className="p-3.5 font-arcade text-[10px]">APPLICATION ID</th>
              <th className="p-3.5 font-arcade text-[10px]">WALLET</th>
              <th className="p-3.5 font-arcade text-[10px]">X USERNAME</th>
              <th className="p-3.5 font-arcade text-[10px]">COMPLETION</th>
              <th className="p-3.5 font-arcade text-[10px]">STATUS</th>
              <th className="p-3.5 font-arcade text-[10px]">ALLOCATION</th>
              <th className="p-3.5 font-arcade text-[10px]">SUBMITTED</th>
              <th className="p-3.5 font-arcade text-[10px]">REVIEWED</th>
              <th className="p-3.5 font-arcade text-[10px] text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e2430]">
            {loading ? (
              <tr>
                <td colSpan={10} className="p-12 text-center text-[#facc15]">
                  <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-[#facc15]" />
                  <p className="font-arcade text-xs">LOADING APPLICANTS DATABASE...</p>
                </td>
              </tr>
            ) : applicants.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-10 text-center text-[#94a3b8]">
                  No applicants match current search or filters.
                </td>
              </tr>
            ) : (
              applicants.map((app) => {
                const isSelected = selectedIds.includes(app.id);
                return (
                  <tr
                    key={app.id}
                    className={`hover:bg-[#1e2430]/70 transition-colors cursor-pointer ${
                      isSelected ? 'bg-[#292215]/40' : ''
                    }`}
                    onClick={() => setInspectApplicant(app)}
                  >
                    {/* Checkbox */}
                    <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => toggleSelectOne(app.id)} className="p-1">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#facc15]" />
                        ) : (
                          <Square className="w-4 h-4 text-[#475569]" />
                        )}
                      </button>
                    </td>

                    {/* ID */}
                    <td className="p-3.5 font-arcade text-[#facc15]">
                      {app.application_id}
                    </td>

                    {/* Wallet */}
                    <td className="p-3.5 font-code text-[#f0fdf4]" title={app.wallet_address}>
                      {app.wallet_address.substring(0, 6)}...{app.wallet_address.substring(app.wallet_address.length - 4)}
                    </td>

                    {/* X Username */}
                    <td className="p-3.5 font-code text-[#94a3b8]">
                      {app.x_username}
                    </td>

                    {/* Completion */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-code font-bold ${
                            app.completion_rate === 100 ? 'text-[#facc15]' : 'text-amber-400'
                          }`}
                        >
                          {app.completion_rate}%
                        </span>
                        <span className="text-[10px] text-[#94a3b8]">
                          ({app.completed_tasks_count} tasks)
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-3.5">{getStatusBadge(app.status)}</td>

                    {/* Allocation */}
                    <td className="p-3.5 font-arcade text-[11px] text-[#facc15]">
                      {app.allocation || '—'}
                    </td>

                    {/* Submitted */}
                    <td className="p-3.5 text-[10px] text-[#94a3b8] font-code whitespace-nowrap">
                      {new Date(app.created_at).toLocaleDateString()}
                    </td>

                    {/* Reviewed */}
                    <td className="p-3.5 text-[10px] text-[#94a3b8] font-code whitespace-nowrap">
                      {app.reviewed_at ? new Date(app.reviewed_at).toLocaleDateString() : 'Pending'}
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setInspectApplicant(app)}
                        className="px-3 py-1 bg-[#1e2430] hover:bg-[#262f3d] text-[#facc15] border border-[#2d3748] rounded-lg text-[11px] font-arcade font-bold inline-flex items-center gap-1 transition-all"
                      >
                        <Eye className="w-3 h-3" />
                        <span>VERIFY</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk Action Confirmation Modal */}
      {bulkModalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#141922] border border-[#262f3d] rounded-2xl p-6 shadow-[0_16px_36px_rgba(0,0,0,0.5)]">
            <h3 className="font-arcade text-base text-[#facc15] mb-2 tracking-wide">
              CONFIRM BULK ACTION: {bulkModalAction.toUpperCase()}
            </h3>
            <p className="text-xs text-[#94a3b8] mb-4">
              You are about to execute <strong className="text-[#facc15]">{bulkModalAction}</strong> on {selectedIds.length} applicants.
            </p>

            {(bulkModalAction === 'approve' || bulkModalAction === 'waitlist') && (
              <div className="mb-5 p-3.5 bg-[#10141c] border border-[#262f3d] rounded-xl">
                <label className="block text-xs font-arcade font-bold text-[#f0fdf4] mb-2">
                  ASSIGN ALLOCATION:
                </label>
                <div className="flex gap-2">
                  {['1 NFT', '2 NFTs', '5 NFTs'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setBulkAllocation(preset)}
                      className={`px-3 py-1.5 text-xs font-arcade rounded-lg border transition-all ${
                        bulkAllocation === preset
                          ? 'bg-[#facc15] text-[#121820] border-[#facc15] font-bold shadow-sm'
                          : 'bg-[#1e2430] text-[#94a3b8] border-[#2d3748] hover:text-[#f0fdf4]'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setBulkModalAction(null)}
                className="px-4 py-2 text-xs text-[#94a3b8] hover:text-[#f0fdf4] bg-[#1e2430] border border-[#2d3748] rounded-xl font-arcade"
              >
                CANCEL
              </button>
              <button
                onClick={handleBulkConfirm}
                disabled={bulkProcessing}
                className="px-4 py-2 text-xs font-arcade font-bold text-[#121820] bg-[#facc15] hover:bg-[#fde047] rounded-xl transition-all shadow-sm"
              >
                {bulkProcessing ? 'EXECUTING...' : 'CONFIRM & EXECUTE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Profile & Verification Drawer */}
      {inspectApplicant && (
        <ApplicantDetailModal
          applicant={inspectApplicant}
          onClose={() => setInspectApplicant(null)}
          onUpdated={(updated) => {
            setInspectApplicant(updated);
            fetchApplicants();
            if (onApplicantReviewed) onApplicantReviewed();
          }}
        />
      )}
    </div>
  );
};
