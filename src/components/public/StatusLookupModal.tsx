'use client';

import React, { useState } from 'react';
import { Search, X, CheckCircle2, Clock, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';

interface StatusLookupModalProps {
  initialQuery?: string;
  onClose: () => void;
}

export const StatusLookupModal: React.FC<StatusLookupModalProps> = ({
  initialQuery = '',
  onClose,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [notApplied, setNotApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = query.trim();
    if (!clean) return;

    try {
      setLoading(true);
      setError(null);
      setResult(null);
      setNotApplied(false);
      const data = await api.lookupStatus(clean);
      setResult(data);
    } catch (err: any) {
      const msg = err.message || '';
      if (
        msg.toLowerCase().includes('no application found') ||
        msg.toLowerCase().includes('not found') ||
        msg.toLowerCase().includes('404')
      ) {
        setNotApplied(true);
      } else {
        setError(msg || 'Lookup failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (initialQuery) {
      handleSearch();
    }
  }, [initialQuery]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#141922] border border-[#262f3d] rounded-2xl p-5 sm:p-8 shadow-[0_16px_48px_rgba(0,0,0,0.6)] my-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#94a3b8] hover:text-[#facc15] p-1 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs font-arcade text-[#facc15] mb-1">
          <Search className="w-4 h-4 text-[#facc15]" />
          <span>STATUS LOOKUP</span>
        </div>
        <h3 className="font-arcade text-lg sm:text-xl text-[#f0fdf4] mb-2 sm:mb-3 break-words uppercase">
          VERIFY ALLOCATION
        </h3>
        <p className="text-xs text-[#94a3b8] mb-5 sm:mb-6 leading-relaxed">
          Enter your public EVM wallet address (0x...) to check your status.
        </p>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="mb-5 sm:mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              required
              placeholder="0x... (EVM Wallet Address)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 min-w-0 px-4 py-3 text-xs sm:text-sm bg-[#1e2430] border border-[#2d3748] rounded-xl text-[#f0fdf4] font-code placeholder-[#5a6b82] focus:outline-none focus:border-[#d97706] focus:ring-1 focus:ring-[#d97706]/40 shadow-inner"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 sm:px-5 py-3 bg-[#facc15] hover:bg-[#fde047] text-[#121820] font-arcade font-bold text-xs rounded-xl shadow-[0_4px_12px_rgba(250,204,21,0.25)] flex items-center gap-1.5 shrink-0 transition-all hover:scale-[1.02] active:scale-[0.99]"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>CHECK</span>
            </button>
          </div>
        </form>

        {/* Not Applied State */}
        {notApplied && (
          <div className="p-4 bg-[#1a1711] border border-[#d97706]/70 rounded-xl mb-4 space-y-2">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-[#facc15] shrink-0 mt-0.5" />
              <div>
                <h4 className="font-arcade text-xs sm:text-sm text-[#facc15]">
                  PLEASE SUBMIT YOUR APPLICATION FOR THE EARLY ACCESS FIRST.
                </h4>
                <p className="text-[11px] text-[#cbd5e1] mt-1">
                  No application was found for this query. Complete the quests above to apply for whitelist entry.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && !notApplied && (
          <div className="p-3 bg-red-950/60 border border-red-700 text-red-300 text-xs rounded-xl mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Result Card */}
        {result && (
          <div className="p-4 bg-[#181d26] border border-[#262f3d] rounded-xl space-y-4">
            {/* Status Heading based on requirement */}
            {result.status === 'Approved' ? (
              <div className="p-3.5 bg-green-950/70 border border-green-500 rounded-lg flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-300 shrink-0" />
                  <span className="font-arcade text-xs sm:text-sm text-green-300 font-bold">
                    ELIGIBLE FOR WHITELIST MINT
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-green-900/80 text-green-200 border border-green-400 rounded text-[9px] font-arcade shrink-0">
                  APPROVED
                </span>
              </div>
            ) : result.status === 'Rejected' ? (
              <div className="p-3.5 bg-red-950/70 border border-red-600 rounded-lg flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-300 shrink-0" />
                  <span className="font-arcade text-xs sm:text-sm text-red-300 font-bold">
                    NOT ELIGIBLE
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-red-900/80 text-red-200 border border-red-400 rounded text-[9px] font-arcade shrink-0">
                  REJECTED
                </span>
              </div>
            ) : (
              <div className="p-3.5 bg-[#292215] border border-[#6b5118] rounded-lg flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#facc15] shrink-0" />
                  <span className="font-arcade text-xs sm:text-sm text-[#facc15] font-bold">
                    THE APPLICATION IS PENDING
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-[#3a2f1b] text-[#facc15] border border-[#facc15]/50 rounded text-[9px] font-arcade shrink-0">
                  PENDING
                </span>
              </div>
            )}

            {/* Allocation highlight if approved */}
            {result.status === 'Approved' && (
              <div className="p-3 bg-[#1f281e] border border-green-600/50 rounded-lg text-center">
                <span className="text-[10px] text-green-300/80 block font-arcade mb-0.5">
                  ASSIGNED EARLY ACCESS ALLOCATION
                </span>
                <span className="font-arcade text-sm sm:text-base text-green-300 font-bold">
                  {result.allocation || '1 Whitelist Mint Guaranteed'}
                </span>
              </div>
            )}

            <div className="text-xs font-code space-y-1.5 pt-1 text-[#cbd5e1]">
              <div className="flex justify-between gap-2">
                <span className="text-[#94a3b8] shrink-0 font-sans text-[11px]">APPLICATION ID:</span>
                <span className="font-arcade text-[#facc15]">{result.application_id}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#94a3b8] shrink-0 font-sans text-[11px]">WALLET:</span>
                <span className="text-[#f0fdf4] truncate max-w-[150px] sm:max-w-[240px]">{result.wallet_address}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#94a3b8] shrink-0 font-sans text-[11px]">X HANDLE:</span>
                <span className="text-[#facc15] truncate">{result.x_username || '—'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#94a3b8] shrink-0 font-sans text-[11px]">SUBMITTED:</span>
                <span>{new Date(result.submitted_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
