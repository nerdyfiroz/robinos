import React, { useState } from 'react';
import { Lock, Mail, Key, ShieldCheck, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { api } from '../../lib/api.js';
import type { AdminUser } from '../../types.js';

interface AdminLoginProps {
  onSuccess: (admin: AdminUser) => void;
  onBackToPublic: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess, onBackToPublic }) => {
  const [email, setEmail] = useState('admin@robinos.xyz');
  const [password, setPassword] = useState('robinos2026!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.adminLogin(email.trim(), password);
      onSuccess(res.admin);
    } catch (err: any) {
      setError(err.message || 'Invalid admin credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('admin@robinos.xyz');
    setPassword('robinos2026!');
  };

  return (
    <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center p-4 bg-grid-pattern">
      <div className="w-full max-w-md bg-[#141922] border border-[#262f3d] p-6 sm:p-8 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
        {/* Back Button */}
        <button
          onClick={onBackToPublic}
          className="inline-flex items-center gap-1.5 text-xs text-[#94a3b8] hover:text-[#facc15] mb-6 transition-colors font-arcade"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>RETURN TO PUBLIC WEBSITE</span>
        </button>

        {/* Lock Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-[#292215] border border-[#6b5118] text-[#facc15] mx-auto flex items-center justify-center mb-3 rounded-xl shadow-[0_4px_12px_rgba(250,204,21,0.2)]">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="font-arcade text-xl text-[#f0fdf4] mb-1 tracking-wide">
            ROBINOS COMMAND CENTER
          </h2>
          <p className="text-xs text-[#94a3b8]">
            RESTRICTED ACCESS FOR EARLY ACCESS MODERATORS
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-950/80 border border-red-600/80 text-red-300 text-xs mb-5 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#cbd5e1] mb-1.5 flex items-center gap-1.5 font-arcade">
              <Mail className="w-3.5 h-3.5 text-[#facc15]" />
              <span>ADMINISTRATOR EMAIL</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 text-xs sm:text-sm bg-[#1e2430] border border-[#2d3748] rounded-xl focus:border-[#facc15] text-[#f0fdf4] font-code focus:outline-none focus:ring-1 focus:ring-[#facc15]/30 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#cbd5e1] mb-1.5 flex items-center gap-1.5 font-arcade">
              <Key className="w-3.5 h-3.5 text-[#facc15]" />
              <span>SECURITY PASSPHRASE</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 text-xs sm:text-sm bg-[#1e2430] border border-[#2d3748] rounded-xl focus:border-[#facc15] text-[#f0fdf4] font-code focus:outline-none focus:ring-1 focus:ring-[#facc15]/30 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 text-xs sm:text-sm font-arcade font-bold text-[#121820] bg-[#facc15] hover:bg-[#fde047] rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(250,204,21,0.3)] transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            <span>AUTHENTICATE</span>
          </button>
        </form>

        {/* Demo Credentials Box */}
        <div className="mt-6 pt-4 border-t border-[#262f3d] text-center">
          <p className="text-[11px] text-[#94a3b8] mb-2 font-arcade">Pre-configured Administrator Account:</p>
          <button
            type="button"
            onClick={handleFillDemo}
            className="text-[11px] font-code text-[#facc15] hover:text-[#fde047] hover:underline bg-[#1e2430] px-3 py-1.5 rounded-lg border border-[#2d3748] transition-all"
          >
            Fill default (admin@robinos.xyz / robinos2026!)
          </button>
        </div>
      </div>
    </div>
  );
};
