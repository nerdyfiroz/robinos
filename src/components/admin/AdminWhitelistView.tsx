'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Trash2,
  RefreshCw,
  Check,
  AlertCircle,
  FileSpreadsheet,
  Wallet,
  Search,
  X,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import { api } from '../../lib/api';

interface WhitelistEntry {
  wallet_address: string;
  original_address: string;
  imported_at: string;
}

export const AdminWhitelistView: React.FC = () => {
  const [addresses, setAddresses] = useState<WhitelistEntry[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadWhitelist = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getWhitelist();
      setAddresses(data.addresses);
      setCount(data.count);
    } catch (err: any) {
      setError(err.message || 'Failed to load whitelist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWhitelist();
  }, []);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv' && ext !== 'txt') {
      setError('Please upload a .csv or .txt file');
      return;
    }

    try {
      setImporting(true);
      setError(null);
      setSuccessMsg(null);
      const result = await api.importWhitelistCSV(file);
      setSuccessMsg(`✅ ${result.message}`);
      setTimeout(() => setSuccessMsg(null), 5000);
      await loadWhitelist();
    } catch (err: any) {
      setError(err.message || 'Failed to import CSV');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleClearWhitelist = async () => {
    try {
      setClearing(true);
      setError(null);
      await api.clearWhitelist();
      setSuccessMsg('Whitelist cleared successfully');
      setConfirmClear(false);
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadWhitelist();
    } catch (err: any) {
      setError(err.message || 'Failed to clear whitelist');
    } finally {
      setClearing(false);
    }
  };

  const filteredAddresses = searchQuery.trim()
    ? addresses.filter(
        (a) =>
          a.wallet_address.includes(searchQuery.toLowerCase()) ||
          a.original_address.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : addresses;

  if (loading) {
    return (
      <div className="py-16 text-center text-[#facc15]">
        <RefreshCw className="w-9 h-9 animate-spin mx-auto mb-3 text-[#facc15]" />
        <p className="text-xs font-arcade tracking-wider">LOADING WHITELIST DATA...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="font-arcade text-xl sm:text-2xl text-[#f0fdf4] mb-1 tracking-wide">
          WHITELIST MANAGEMENT
        </h2>
        <p className="text-xs text-[#94a3b8]">
          Import wallet addresses via CSV file. Whitelisted wallets are automatically marked as eligible for mint when
          users check their status.
        </p>
      </div>

      {/* Feedback Banners */}
      {successMsg && (
        <div className="p-3.5 bg-[#292215]/60 border border-[#6b5118] text-[#facc15] text-xs rounded-xl flex items-center gap-2 font-arcade animate-fade-in">
          <Check className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-red-950/70 border border-red-700/80 text-red-300 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto p-0.5 hover:text-red-100 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-[#141922] border border-[#262f3d] rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#292215] border border-[#6b5118] flex items-center justify-center">
              <Wallet className="w-4 h-4 text-[#facc15]" />
            </div>
            <span className="text-[10px] font-arcade text-[#94a3b8] tracking-wider">WHITELISTED WALLETS</span>
          </div>
          <span className="font-arcade text-2xl text-[#facc15]">{count.toLocaleString()}</span>
        </div>

        <div className="p-5 bg-[#141922] border border-[#262f3d] rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-950/50 border border-green-600/40 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-green-400" />
            </div>
            <span className="text-[10px] font-arcade text-[#94a3b8] tracking-wider">STATUS</span>
          </div>
          <span className={`font-arcade text-sm ${count > 0 ? 'text-green-400' : 'text-[#94a3b8]'}`}>
            {count > 0 ? 'ACTIVE' : 'NO WHITELIST LOADED'}
          </span>
        </div>

        <div className="p-5 bg-[#141922] border border-[#262f3d] rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#1a1b2e] border border-[#3b3d5e] flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4 text-[#818cf8]" />
            </div>
            <span className="text-[10px] font-arcade text-[#94a3b8] tracking-wider">LAST IMPORT</span>
          </div>
          <span className="font-arcade text-sm text-[#cbd5e1]">
            {addresses[0]?.imported_at
              ? new Date(addresses[0].imported_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : '—'}
          </span>
        </div>
      </div>

      {/* CSV Upload Section */}
      <div className="p-6 bg-[#141922] border border-[#262f3d] rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
        <h3 className="font-arcade text-sm text-[#facc15] mb-1 flex items-center gap-2">
          <Upload className="w-4 h-4" />
          <span>IMPORT CSV FILE</span>
        </h3>
        <p className="text-[11px] text-[#94a3b8] mb-5">
          Upload a CSV file with wallet addresses. The file should contain EVM wallet addresses (0x...). Supported
          formats: single-column list, or multi-column with a &quot;wallet&quot; / &quot;address&quot; column header.
          {count > 0 && (
            <span className="text-[#facc15] font-bold"> Importing a new file will replace the existing whitelist.</span>
          )}
        </p>

        {/* Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-8 sm:p-10 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-[#facc15] bg-[#292215]/40 shadow-[0_0_24px_rgba(250,204,21,0.15)]'
              : 'border-[#2d3748] hover:border-[#facc15]/50 hover:bg-[#1e2430]'
          } ${importing ? 'pointer-events-none opacity-60' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />

          {importing ? (
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 text-[#facc15] animate-spin" />
              <span className="font-arcade text-xs text-[#facc15] tracking-wider">PROCESSING CSV FILE...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-[#292215] border border-[#6b5118] flex items-center justify-center">
                <UploadCloud className="w-7 h-7 text-[#facc15]" />
              </div>
              <div>
                <span className="font-arcade text-xs text-[#f0fdf4] block mb-1">
                  DROP CSV FILE HERE OR CLICK TO BROWSE
                </span>
                <span className="text-[10px] text-[#94a3b8]">Accepts .csv and .txt files</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Current Whitelist Table */}
      {count > 0 && (
        <div className="p-6 bg-[#141922] border border-[#262f3d] rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
            <h3 className="font-arcade text-sm text-[#facc15] flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              <span>WHITELISTED ADDRESSES ({count.toLocaleString()})</span>
            </h3>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Search */}
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5a6b82]" />
                <input
                  type="text"
                  placeholder="Search addresses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-56 pl-8 pr-3 py-2 text-xs bg-[#1e2430] border border-[#2d3748] rounded-lg text-[#f0fdf4] font-code placeholder-[#5a6b82] focus:outline-none focus:border-[#facc15]/60 transition-colors"
                />
              </div>

              {/* Clear Whitelist */}
              {!confirmClear ? (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="px-3 py-2 text-xs font-arcade font-bold text-red-400 bg-red-950/40 border border-red-800/50 hover:bg-red-950/60 hover:border-red-600/60 rounded-lg flex items-center gap-1.5 transition-all shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>CLEAR ALL</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={handleClearWhitelist}
                    disabled={clearing}
                    className="px-3 py-2 text-xs font-arcade font-bold text-[#121820] bg-red-500 hover:bg-red-400 border border-red-500 rounded-lg flex items-center gap-1.5 transition-all"
                  >
                    {clearing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>CONFIRM</span>
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="px-3 py-2 text-xs font-arcade font-bold text-[#94a3b8] bg-[#1e2430] border border-[#2d3748] hover:text-[#f0fdf4] rounded-lg transition-all"
                  >
                    CANCEL
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Address List */}
          <div className="max-h-[400px] overflow-y-auto rounded-xl border border-[#262f3d] bg-[#0d1017]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#262f3d] sticky top-0 bg-[#10141c] z-10">
                  <th className="text-left text-[10px] font-arcade text-[#94a3b8] p-3 tracking-wider">#</th>
                  <th className="text-left text-[10px] font-arcade text-[#94a3b8] p-3 tracking-wider">
                    WALLET ADDRESS
                  </th>
                  <th className="text-left text-[10px] font-arcade text-[#94a3b8] p-3 tracking-wider hidden sm:table-cell">
                    IMPORTED
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAddresses.map((entry, idx) => (
                  <tr
                    key={entry.wallet_address}
                    className="border-b border-[#262f3d]/50 hover:bg-[#141922] transition-colors"
                  >
                    <td className="text-[10px] text-[#5a6b82] font-code p-3">{idx + 1}</td>
                    <td className="text-xs text-[#f0fdf4] font-code p-3 truncate max-w-[300px]" title={entry.original_address}>
                      {entry.original_address}
                    </td>
                    <td className="text-[10px] text-[#5a6b82] font-code p-3 hidden sm:table-cell">
                      {entry.imported_at
                        ? new Date(entry.imported_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })
                        : '—'}
                    </td>
                  </tr>
                ))}
                {filteredAddresses.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-xs text-[#5a6b82] py-8 font-arcade">
                      {searchQuery ? 'NO MATCHING ADDRESSES FOUND' : 'NO ADDRESSES IN WHITELIST'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {searchQuery && (
            <p className="text-[10px] text-[#5a6b82] mt-2">
              Showing {filteredAddresses.length} of {count} addresses
            </p>
          )}
        </div>
      )}

      {/* Empty State */}
      {count === 0 && !loading && (
        <div className="p-8 bg-[#141922] border border-[#262f3d] rounded-2xl text-center">
          <div className="w-14 h-14 rounded-xl bg-[#1e2430] border border-[#2d3748] flex items-center justify-center mx-auto mb-4">
            <FileSpreadsheet className="w-7 h-7 text-[#5a6b82]" />
          </div>
          <h4 className="font-arcade text-sm text-[#f0fdf4] mb-2">NO WHITELIST IMPORTED YET</h4>
          <p className="text-xs text-[#94a3b8] max-w-md mx-auto leading-relaxed">
            Upload a CSV file with wallet addresses above. Users whose wallets are on the whitelist will see
            &quot;Eligible for Whitelist Mint&quot; when they check their status.
          </p>
        </div>
      )}
    </div>
  );
};
