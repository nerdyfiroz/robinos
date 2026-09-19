import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  ShieldCheck,
  Award,
  RefreshCw,
  Edit,
} from 'lucide-react';
import type { Applicant, ApplicantStatus, TaskVerificationStatus } from '../../types.js';
import { api } from '../../lib/api.js';

interface ApplicantDetailModalProps {
  applicant: Applicant;
  onClose: () => void;
  onUpdated: (updated: Applicant) => void;
}

export const ApplicantDetailModal: React.FC<ApplicantDetailModalProps> = ({
  applicant,
  onClose,
  onUpdated,
}) => {
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [allocation, setAllocation] = useState(applicant.allocation || '1 NFT');
  const [notes, setNotes] = useState(applicant.notes || '');
  const [savingStatus, setSavingStatus] = useState(false);
  const [verifyingTaskId, setVerifyingTaskId] = useState<string | null>(null);

  const copyWallet = () => {
    navigator.clipboard.writeText(applicant.wallet_address);
    setCopiedWallet(true);
    setTimeout(() => setCopiedWallet(false), 2000);
  };

  const handleStatusChange = async (newStatus: ApplicantStatus) => {
    try {
      setSavingStatus(true);
      const updated = await api.updateApplicantStatus(
        applicant.id,
        newStatus,
        newStatus === 'Approved' || newStatus === 'Waitlisted' ? allocation : null,
        notes
      );
      onUpdated(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to update applicant status');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: 'Verified' | 'Rejected' | 'Needs Review') => {
    try {
      setVerifyingTaskId(taskId);
      await api.updateTaskVerification(applicant.id, taskId, newStatus);
      // Refresh applicant
      const fresh = await api.getApplicantDetail(applicant.id);
      onUpdated(fresh);
    } catch (err: any) {
      alert(err.message || 'Failed to update task verification');
    } finally {
      setVerifyingTaskId(null);
    }
  };

  const getStatusBadge = (status: ApplicantStatus) => {
    switch (status) {
      case 'Approved':
        return <span className="px-2.5 py-1 bg-emerald-950/70 text-emerald-300 border border-emerald-500/50 rounded-lg text-xs font-arcade font-bold">APPROVED</span>;
      case 'Rejected':
        return <span className="px-2.5 py-1 bg-red-950/70 text-red-300 border border-red-500/50 rounded-lg text-xs font-arcade font-bold">REJECTED</span>;
      case 'Waitlisted':
        return <span className="px-2.5 py-1 bg-blue-950/70 text-blue-300 border border-blue-500/50 rounded-lg text-xs font-arcade font-bold">WAITLISTED</span>;
      case 'Under Review':
        return <span className="px-2.5 py-1 bg-purple-950/70 text-purple-300 border border-purple-500/50 rounded-lg text-xs font-arcade font-bold">UNDER REVIEW</span>;
      default:
        return <span className="px-2.5 py-1 bg-amber-950/70 text-amber-300 border border-amber-500/50 rounded-lg text-xs font-arcade font-bold">PENDING</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-[#141922] border border-[#262f3d] rounded-2xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)] max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#94a3b8] hover:text-[#facc15] p-1.5 rounded-lg hover:bg-[#1e2430] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#262f3d]">
          <div>
            <div className="text-[10px] text-[#94a3b8] font-arcade tracking-wide">APPLICANT DOSSIER</div>
            <div className="flex items-center gap-2.5 mt-1">
              <h3 className="font-arcade text-xl text-[#facc15] tracking-wide">
                {applicant.application_id}
              </h3>
              {getStatusBadge(applicant.status)}
            </div>
          </div>

          <div className="text-right text-[11px] text-[#94a3b8] font-code">
            <div>Submitted: {new Date(applicant.created_at).toLocaleString()}</div>
            {applicant.reviewed_at && (
              <div className="text-[#facc15]">Reviewed: {new Date(applicant.reviewed_at).toLocaleString()}</div>
            )}
          </div>
        </div>

        {/* Identity Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-5 p-4 bg-[#10141c] border border-[#262f3d] rounded-xl">
          {/* Wallet */}
          <div>
            <span className="text-[10px] text-[#94a3b8] block mb-1 font-arcade font-bold">PUBLIC WALLET ADDRESS</span>
            <div className="flex items-center gap-1.5">
              <span className="font-code text-xs text-[#f0fdf4] truncate max-w-[200px]" title={applicant.wallet_address}>
                {applicant.wallet_address}
              </span>
              <button
                onClick={copyWallet}
                className="p-1 text-[#94a3b8] hover:text-[#facc15] transition-colors"
                title="Copy Address"
              >
                {copiedWallet ? <Check className="w-3.5 h-3.5 text-[#facc15]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <a
              href={`https://etherscan.io/address/${applicant.wallet_address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-[#facc15] hover:underline inline-flex items-center gap-1 mt-1 font-arcade"
            >
              <span>View Explorer</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>

          {/* X Username */}
          <div>
            <span className="text-[10px] text-[#94a3b8] block mb-1 font-arcade font-bold">X (TWITTER) ACCOUNT</span>
            <div className="font-code text-sm text-[#facc15] font-bold">
              {applicant.x_username}
            </div>
            <a
              href={applicant.x_profile_url || `https://x.com/${applicant.x_username.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-[#94a3b8] hover:text-[#facc15] hover:underline inline-flex items-center gap-1 mt-1 font-arcade"
            >
              <span>Open Profile Link</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>

        {/* Task Verification Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-arcade text-xs text-[#facc15] flex items-center gap-1.5 tracking-wide">
              <ShieldCheck className="w-4 h-4" />
              <span>TASK VERIFICATION & PROOF AUDIT</span>
            </h4>
            <span className="text-[11px] text-[#94a3b8] font-code">
              Completed: {applicant.completed_tasks_count || 0} tasks ({applicant.completion_rate || 0}%)
            </span>
          </div>

          <div className="divide-y divide-[#262f3d] border border-[#262f3d] rounded-xl overflow-hidden bg-[#10141c]">
            {applicant.tasks && applicant.tasks.length > 0 ? (
              applicant.tasks.map((taskRec) => {
                const isTaskVerifying = verifyingTaskId === taskRec.id || verifyingTaskId === taskRec.task_id;
                return (
                  <div key={taskRec.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left info */}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-xs text-[#f0fdf4]">
                          {taskRec.task_title || 'Community Quest'}
                        </span>
                        <span className="px-2 py-0.5 bg-[#1e2430] text-[#94a3b8] border border-[#2d3748] rounded-md text-[9px] font-arcade">
                          {taskRec.task_type || 'Task'}
                        </span>
                      </div>

                      {/* Proof link */}
                      {taskRec.proof_url ? (
                        <div className="flex items-center gap-1.5 text-[11px] mt-1">
                          <span className="text-[#94a3b8]">Proof:</span>
                          <a
                            href={taskRec.proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#facc15] hover:underline inline-flex items-center gap-1 font-code"
                          >
                            <span>View Proof / Action</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      ) : (
                        <div className="text-[10px] text-[#94a3b8]/60">No URL required for this quest</div>
                      )}
                    </div>

                    {/* Verification status and admin buttons */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-arcade font-bold rounded-md border ${
                          taskRec.status === 'Verified'
                            ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/60'
                            : taskRec.status === 'Rejected'
                            ? 'bg-red-950/70 text-red-300 border-red-500/60'
                            : 'bg-amber-950/70 text-amber-300 border-amber-500/60'
                        }`}
                      >
                        {taskRec.status.toUpperCase()}
                      </span>

                      {/* Quick verification selector */}
                      <div className="flex items-center gap-1">
                        <button
                          disabled={isTaskVerifying}
                          onClick={() => handleTaskStatusChange(taskRec.task_id, 'Verified')}
                          className="px-2.5 py-1 text-[10px] bg-[#1e2430] hover:bg-emerald-950/60 text-emerald-400 border border-[#2d3748] hover:border-emerald-600 rounded-md transition-colors"
                          title="Mark Verified"
                        >
                          ✓
                        </button>
                        <button
                          disabled={isTaskVerifying}
                          onClick={() => handleTaskStatusChange(taskRec.task_id, 'Needs Review')}
                          className="px-2.5 py-1 text-[10px] bg-[#1e2430] hover:bg-amber-950/60 text-amber-300 border border-[#2d3748] hover:border-amber-600 rounded-md transition-colors"
                          title="Mark Needs Review"
                        >
                          ?
                        </button>
                        <button
                          disabled={isTaskVerifying}
                          onClick={() => handleTaskStatusChange(taskRec.task_id, 'Rejected')}
                          className="px-2.5 py-1 text-[10px] bg-[#1e2430] hover:bg-red-950/60 text-red-400 border border-[#2d3748] hover:border-red-600 rounded-md transition-colors"
                          title="Reject Proof"
                        >
                          ✗
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-[#94a3b8]">
                No individual task records found.
              </div>
            )}
          </div>
        </div>

        {/* Allocation Selector */}
        <div className="p-4 bg-[#10141c] border border-[#262f3d] rounded-xl mb-6">
          <label className="block text-xs font-arcade font-bold text-[#facc15] mb-2 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5" />
            <span>EARLY ACCESS ALLOCATION (UPON APPROVAL)</span>
          </label>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {['1 NFT', '2 NFTs', '3 NFTs', '5 NFTs'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAllocation(preset)}
                className={`px-3 py-1.5 text-xs font-arcade font-bold rounded-lg border transition-all ${
                  allocation === preset
                    ? 'bg-[#facc15] text-[#121820] border-[#facc15] shadow-sm'
                    : 'bg-[#1e2430] text-[#94a3b8] border-[#2d3748] hover:text-[#f0fdf4]'
                }`}
              >
                {preset}
              </button>
            ))}
            <input
              type="text"
              placeholder="Custom e.g. 10 NFTs"
              value={allocation}
              onChange={(e) => setAllocation(e.target.value)}
              className="px-3 py-1.5 text-xs bg-[#1e2430] border border-[#2d3748] rounded-lg text-[#facc15] font-code focus:outline-none focus:border-[#facc15] max-w-[150px]"
            />
          </div>
          <span className="text-[10px] text-[#94a3b8]">
            Current assigned allocation: <strong className="text-[#facc15] font-arcade">{allocation || 'None'}</strong>
          </span>
        </div>

        {/* Approval Actions Toolbar */}
        <div className="pt-4 border-t border-[#262f3d] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStatusChange('Approved')}
              disabled={savingStatus}
              className="px-4 py-2.5 text-xs font-arcade font-bold text-[#121820] bg-[#facc15] hover:bg-[#fde047] rounded-xl shadow-[0_4px_16px_rgba(250,204,21,0.25)] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              APPROVE EARLY ACCESS
            </button>
            <button
              onClick={() => handleStatusChange('Waitlisted')}
              disabled={savingStatus}
              className="px-4 py-2.5 text-xs font-arcade font-bold text-blue-200 bg-blue-950/70 hover:bg-blue-900 border border-blue-700/80 rounded-xl transition-all"
            >
              WAITLIST
            </button>
            <button
              onClick={() => handleStatusChange('Rejected')}
              disabled={savingStatus}
              className="px-4 py-2.5 text-xs font-arcade font-bold text-red-200 bg-red-950/70 hover:bg-red-900 border border-red-700/80 rounded-xl transition-all"
            >
              REJECT
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-arcade text-[#94a3b8] hover:text-[#f0fdf4] bg-[#1e2430] hover:bg-[#262f3d] border border-[#2d3748] rounded-xl transition-all"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
