'use client';

import React, { useState } from 'react';
import {
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  RefreshCw,
  ArrowUp,
  Sparkles,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { api } from '../../lib/api';

interface StatusLookupSectionProps {
  onScrollToQuests?: () => void;
}

export const StatusLookupSection: React.FC<StatusLookupSectionProps> = ({
  onScrollToQuests,
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [notApplied, setNotApplied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchedQuery, setSearchedQuery] = useState('');

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = query.trim();
    if (!clean) return;

    try {
      setLoading(true);
      setErrorMessage(null);
      setResult(null);
      setNotApplied(false);
      setSearchedQuery(clean);

      const data = await api.lookupStatus(clean);
      setResult(data);
    } catch (err: any) {
      const msg = err.message || '';
      // If 404 / no application found, user has not applied yet
      if (
        msg.toLowerCase().includes('no application found') ||
        msg.toLowerCase().includes('not found') ||
        msg.toLowerCase().includes('404')
      ) {
        setNotApplied(true);
      } else {
        setErrorMessage(msg || 'Lookup failed. Please verify your input and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApplyClick = () => {
    if (onScrollToQuests) {
      onScrollToQuests();
    } else {
      const el = document.getElementById('early-access-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <section
      id="status-lookup-section"
      className="py-10 sm:py-16 max-w-4xl mx-auto px-4 sm:px-6 w-full"
    >
      <div className="relative w-full bg-[#141922] border border-[#262f3d] rounded-2xl p-6 sm:p-10 shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
        {/* Section Header */}
        <div className="flex items-center gap-2 text-xs font-arcade text-[#facc15] mb-2 tracking-wider">
          <Search className="w-4 h-4 text-[#facc15]" />
          <span>STATUS LOOKUP</span>
        </div>

        <h3 className="font-arcade text-xl sm:text-2xl md:text-3xl text-[#f0fdf4] mb-3 uppercase tracking-wide">
          VERIFY ALLOCATION
        </h3>

        <p className="font-arcade text-xs sm:text-sm text-[#94a3b8] mb-6 sm:mb-8 leading-relaxed tracking-wider">
          ENTER YOUR PUBLIC EVM WALLET ADDRESS (0X...) TO CHECK YOUR STATUS.
        </p>

        {/* Search Input Form */}
        <form onSubmit={handleSearch} className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                id="allocation-lookup-input"
                type="text"
                required
                placeholder="0x... (EVM Wallet Address)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full px-4 sm:px-5 py-3.5 sm:py-4 text-xs sm:text-sm bg-[#1e2430] border border-[#2d3748] rounded-xl text-[#f0fdf4] font-code placeholder-[#5a6b82] focus:outline-none focus:border-[#facc15] focus:ring-1 focus:ring-[#facc15]/40 shadow-inner transition-all"
              />
            </div>

            <button
              id="allocation-lookup-btn"
              type="submit"
              disabled={loading}
              className="px-6 sm:px-8 py-3.5 sm:py-4 bg-[#facc15] hover:bg-[#fde047] text-[#121820] font-arcade font-bold text-xs sm:text-sm rounded-xl shadow-[0_4px_16px_rgba(250,204,21,0.25)] flex items-center justify-center gap-2 shrink-0 transition-all hover:scale-[1.02] active:scale-[0.99] cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#121820]" />
                  <span>CHECKING...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 text-[#121820]" />
                  <span>CHECK</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Case 1: NOT APPLIED YET */}
        {notApplied && (
          <div
            id="status-not-applied-banner"
            className="p-5 sm:p-6 bg-[#1a1711] border border-[#d97706]/60 rounded-xl space-y-4 animate-fade-in"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#facc15] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-arcade text-sm sm:text-base text-[#facc15] tracking-wide">
                  PLEASE SUBMIT YOUR APPLICATION FOR THE EARLY ACCESS FIRST.
                </h4>
                <p className="text-xs text-[#cbd5e1] font-sans leading-relaxed">
                  No submitted application was found matching{' '}
                  <span className="font-code text-[#facc15] px-1 bg-[#241f17] rounded">
                    {searchedQuery}
                  </span>
                  . Complete the required social quests and submit your wallet above to join the whitelist.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleApplyClick}
                className="px-4 py-2.5 bg-[#facc15] hover:bg-[#fde047] text-[#121820] font-arcade text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <ArrowUp className="w-4 h-4" />
                <span>COMPLETE QUESTS & APPLY NOW</span>
              </button>
            </div>
          </div>
        )}

        {/* Generic Error if any */}
        {errorMessage && !notApplied && (
          <div className="p-4 bg-red-950/60 border border-red-700 text-red-300 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="font-sans">{errorMessage}</span>
          </div>
        )}

        {/* Case 2, 3, 4: APPLICATION FOUND (APPROVED, REJECTED, PENDING) */}
        {result && (
          <div
            id="status-result-card"
            className="p-5 sm:p-7 bg-[#181d26] border border-[#262f3d] rounded-xl space-y-5 animate-fade-in"
          >
            {/* Top Status Banner according to exact user instruction */}
            {result.status === 'Approved' ? (
              /* Case: APPROVED */
              <div className="p-4 sm:p-5 bg-green-950/60 border border-green-500/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_0_24px_rgba(34,197,94,0.15)]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-green-900/80 border border-green-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-green-300" />
                  </div>
                  <div>
                    <span className="text-[10px] font-arcade text-green-400 block tracking-wider">
                      VERIFICATION RESULT
                    </span>
                    <h4 className="font-arcade text-base sm:text-lg text-green-300 tracking-wide">
                      ELIGIBLE FOR WHITELIST MINT
                    </h4>
                  </div>
                </div>

                <div className="px-3 py-1.5 bg-green-900/60 border border-green-400 rounded-md text-[11px] font-arcade text-green-200 shrink-0 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-green-300" />
                  <span>WHITELIST APPROVED</span>
                </div>
              </div>
            ) : result.status === 'Rejected' ? (
              /* Case: REJECTED */
              <div className="p-4 sm:p-5 bg-red-950/60 border border-red-600/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_0_24px_rgba(239,68,68,0.15)]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-red-900/80 border border-red-400 flex items-center justify-center shrink-0">
                    <XCircle className="w-5 h-5 text-red-300" />
                  </div>
                  <div>
                    <span className="text-[10px] font-arcade text-red-400 block tracking-wider">
                      VERIFICATION RESULT
                    </span>
                    <h4 className="font-arcade text-base sm:text-lg text-red-300 tracking-wide">
                      NOT ELIGIBLE
                    </h4>
                  </div>
                </div>

                <div className="px-3 py-1.5 bg-red-900/60 border border-red-500 rounded-md text-[11px] font-arcade text-red-200 shrink-0 flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-red-400" />
                  <span>NOT ELIGIBLE</span>
                </div>
              </div>
            ) : (
              /* Case: PENDING (or Under Review / Waitlisted) */
              <div className="p-4 sm:p-5 bg-[#292215] border border-[#6b5118] rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_0_24px_rgba(250,204,21,0.12)]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#3a2f1b] border border-[#facc15] flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-[#facc15]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-arcade text-[#facc15]/80 block tracking-wider">
                      VERIFICATION RESULT
                    </span>
                    <h4 className="font-arcade text-base sm:text-lg text-[#facc15] tracking-wide">
                      THE APPLICATION IS PENDING
                    </h4>
                  </div>
                </div>

                <div className="px-3 py-1.5 bg-[#3a2f1b] border border-[#facc15]/50 rounded-md text-[11px] font-arcade text-[#facc15] shrink-0 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#facc15]" />
                  <span>IN QUEUE / PENDING REVIEW</span>
                </div>
              </div>
            )}

            {/* Allocation Details if Approved */}
            {result.status === 'Approved' && (
              <div className="p-4 bg-[#1f281e] border border-green-600/40 rounded-xl text-center space-y-1">
                <span className="text-[10px] text-green-300/80 font-arcade block tracking-wider">
                  EARLY ACCESS ALLOCATION TIER
                </span>
                <span className="font-arcade text-base sm:text-lg text-green-300 font-bold block">
                  {result.allocation || '1 Whitelist Mint Guaranteed'}
                </span>
              </div>
            )}

            {/* Informational Summary for Pending or Rejected */}
            {result.status !== 'Approved' && result.status === 'Rejected' && (
              <p className="text-xs text-[#94a3b8] font-sans leading-relaxed">
                Your application was reviewed and determined to not meet the eligibility criteria for this specific allocation round.
              </p>
            )}

            {result.status !== 'Approved' && result.status !== 'Rejected' && (
              <p className="text-xs text-[#cbd5e1] font-sans leading-relaxed">
                Your application has been logged successfully and is queued for verification. Approvals are processed in batches by the team.
              </p>
            )}

            {/* Application Data Grid */}
            <div className="pt-2 border-t border-[#262f3d] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-code text-[#cbd5e1]">
              <div className="p-3 bg-[#141922] border border-[#262f3d] rounded-lg">
                <span className="text-[10px] text-[#94a3b8] font-arcade block mb-1">
                  APPLICATION ID
                </span>
                <span className="font-arcade text-sm text-[#facc15]">
                  {result.application_id}
                </span>
              </div>

              <div className="p-3 bg-[#141922] border border-[#262f3d] rounded-lg">
                <span className="text-[10px] text-[#94a3b8] font-arcade block mb-1">
                  WALLET ADDRESS
                </span>
                <span className="text-[#f0fdf4] truncate block" title={result.wallet_address}>
                  {result.wallet_address}
                </span>
              </div>

              <div className="p-3 bg-[#141922] border border-[#262f3d] rounded-lg">
                <span className="text-[10px] text-[#94a3b8] font-arcade block mb-1">
                  X (TWITTER) HANDLE
                </span>
                <span className="text-[#facc15] truncate block">
                  {result.x_username || '—'}
                </span>
              </div>

              <div className="p-3 bg-[#141922] border border-[#262f3d] rounded-lg">
                <span className="text-[10px] text-[#94a3b8] font-arcade block mb-1">
                  SUBMISSION DATE
                </span>
                <span className="text-[#94a3b8] block">
                  {new Date(result.submitted_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
