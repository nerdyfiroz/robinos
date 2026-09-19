'use client';

import React, { useState, useEffect } from 'react';
import { History, Search, RefreshCw, Shield, ArrowRight } from 'lucide-react';
import type { AuditLogEntry } from '../../types';
import { api } from '../../lib/api';

export const AdminAuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getAuditLogs();
      setLogs(data);
    } catch (err: any) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter(
    (log) =>
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.admin_email.toLowerCase().includes(search.toLowerCase()) ||
      log.target_id.toLowerCase().includes(search.toLowerCase()) ||
      log.target_type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-arcade text-xl sm:text-2xl text-[#f0fdf4] mb-1 tracking-wide">
            IMMUTABLE AUDIT LOG
          </h2>
          <p className="text-xs text-[#94a3b8]">
            Cryptographically timestamped ledger of all moderator decisions, quest edits, and state transitions.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2.5 bg-[#141922] hover:bg-[#1e2430] border border-[#262f3d] rounded-xl text-[#94a3b8] hover:text-[#facc15] self-start sm:self-auto transition-colors"
          title="Refresh Logs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
        <input
          type="text"
          placeholder="Filter logs by action, administrator, target ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-[#141922] border border-[#262f3d] rounded-xl focus:border-[#facc15] text-[#f0fdf4] font-code focus:outline-none transition-colors"
        />
      </div>

      {/* Logs Table */}
      <div className="bg-[#141922] border border-[#262f3d] rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.3)] overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#262f3d] bg-[#10141c] text-[#94a3b8]">
              <th className="p-3.5 font-arcade text-[10px] whitespace-nowrap">TIMESTAMP</th>
              <th className="p-3.5 font-arcade text-[10px]">ADMIN</th>
              <th className="p-3.5 font-arcade text-[10px]">ACTION</th>
              <th className="p-3.5 font-arcade text-[10px]">TARGET</th>
              <th className="p-3.5 font-arcade text-[10px]">PREVIOUS VALUE</th>
              <th className="p-3.5 font-arcade text-[10px]">NEW VALUE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e2430]">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-[#facc15]">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#facc15]" />
                  <span className="font-arcade text-xs">FETCHING AUDIT TRAIL...</span>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-[#94a3b8]">
                  No audit records found.
                </td>
              </tr>
            ) : (
              filtered.map((log) => (
                <tr key={log.id} className="hover:bg-[#1e2430]/60 transition-colors font-code">
                  <td className="p-3.5 text-[#94a3b8] text-[11px] whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="p-3.5 text-[#facc15] text-[11px] whitespace-nowrap">
                    {log.admin_email}
                  </td>
                  <td className="p-3.5 text-[#f0fdf4] font-arcade text-xs">
                    {log.action}
                  </td>
                  <td className="p-3.5 text-[11px]">
                    <span className="px-2 py-0.5 bg-[#10141c] text-[#94a3b8] border border-[#262f3d] rounded-md font-arcade text-[10px]">
                      {log.target_type}: {log.target_id}
                    </span>
                  </td>
                  <td className="p-3.5 text-red-300/80 text-[11px] max-w-[160px] truncate" title={log.previous_value}>
                    {log.previous_value || '—'}
                  </td>
                  <td className="p-3.5 text-emerald-400 text-[11px] max-w-[160px] truncate" title={log.new_value}>
                    {log.new_value || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
