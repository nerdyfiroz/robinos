'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Save, Check, RefreshCw, Shield, AlertCircle, Layers } from 'lucide-react';
import type { PlatformSettings } from '../../types';
import { api } from '../../lib/api';

interface AdminSettingsViewProps {
  onSettingsSaved?: () => void;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({ onSettingsSaved }) => {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const data = await api.getSettings();
        setSettings(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      setSaving(true);
      setError(null);
      await api.updateSettings(settings);
      setSuccessMsg('Settings saved successfully and synced to live platform!');
      setTimeout(() => setSuccessMsg(null), 3500);
      if (onSettingsSaved) onSettingsSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="py-16 text-center text-[#facc15]">
        <RefreshCw className="w-9 h-9 animate-spin mx-auto mb-3 text-[#facc15]" />
        <p className="text-xs font-arcade tracking-wider">LOADING PLATFORM SETTINGS...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="font-arcade text-xl sm:text-2xl text-[#f0fdf4] mb-1 tracking-wide">
          ADMIN CONFIGURATION
        </h2>
        <p className="text-xs text-[#94a3b8]">
          Manage all platform links, collection details, early access parameters, and quest behaviors.
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-[#292215]/60 border border-[#6b5118] text-[#facc15] text-xs rounded-xl flex items-center gap-2 font-arcade">
          <Check className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-red-950/70 border border-red-700/80 text-red-300 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Official Links & Collection */}
        <div className="p-6 bg-[#141922] border border-[#262f3d] rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
          <h3 className="font-arcade text-sm text-[#facc15] mb-1 flex items-center gap-2">
            <Layers className="w-4 h-4" />
            <span>PLATFORM LINKS & COLLECTION METADATA</span>
          </h3>
          <p className="text-[11px] text-[#94a3b8] mb-5">
            Manage all primary external links (X / Twitter, OpenSea marketplace) and collection metadata displayed across the site.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-arcade font-bold text-[#f0fdf4] mb-1.5">
                COLLECTION NAME
              </label>
              <input
                type="text"
                value={settings.collection.name}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    collection: { ...settings.collection, name: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 text-xs bg-[#1e2430] border border-[#2d3748] rounded-xl text-[#f0fdf4] font-code focus:outline-none focus:border-[#facc15] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-arcade font-bold text-[#f0fdf4] mb-1.5">
                TOTAL SUPPLY
              </label>
              <input
                type="number"
                value={settings.collection.supply}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    collection: { ...settings.collection, supply: Number(e.target.value) },
                  })
                }
                className="w-full px-3.5 py-2.5 text-xs bg-[#1e2430] border border-[#2d3748] rounded-xl text-[#facc15] font-code focus:outline-none focus:border-[#facc15] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-arcade font-bold text-[#f0fdf4] mb-1.5">
                MINT PRICE (ETH & USD)
              </label>
              <input
                type="text"
                value={settings.collection.mint_price}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    collection: { ...settings.collection, mint_price: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 text-xs bg-[#1e2430] border border-[#2d3748] rounded-xl text-[#f0fdf4] font-code focus:outline-none focus:border-[#facc15] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-arcade font-bold text-[#f0fdf4] mb-1.5">
                TARGET BLOCKCHAIN
              </label>
              <input
                type="text"
                value={settings.collection.chain}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    collection: { ...settings.collection, chain: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 text-xs bg-[#1e2430] border border-[#2d3748] rounded-xl text-[#f0fdf4] font-code focus:outline-none focus:border-[#facc15] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-arcade font-bold text-[#f0fdf4] mb-1.5">
                LAUNCH DATE
              </label>
              <input
                type="text"
                value={settings.collection.launch_date}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    collection: { ...settings.collection, launch_date: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 text-xs bg-[#1e2430] border border-[#2d3748] rounded-xl text-[#f0fdf4] font-code focus:outline-none focus:border-[#facc15] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-arcade font-bold text-[#f0fdf4] mb-1.5">
                OFFICIAL X / TWITTER LINK
              </label>
              <input
                type="url"
                value={settings.collection.x_url}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    collection: { ...settings.collection, x_url: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 text-xs bg-[#1e2430] border border-[#2d3748] rounded-xl text-[#facc15] font-code focus:outline-none focus:border-[#facc15] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-arcade font-bold text-[#f0fdf4] mb-1.5">
                OPENSEA BUTTON STATUS
              </label>
              <div className="flex gap-2 mb-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setSettings({
                      ...settings,
                      collection: {
                        ...settings.collection,
                        opensea_status: 'Coming Soon',
                      },
                    })
                  }
                  className={`flex-1 py-2 px-2.5 text-xs font-arcade font-bold rounded-xl border transition-all ${
                    settings.collection.opensea_status === 'Coming Soon'
                      ? 'bg-[#facc15] text-[#121820] border-[#facc15] shadow-sm'
                      : 'bg-[#1e2430] text-[#94a3b8] border-[#2d3748] hover:text-[#f0fdf4]'
                  }`}
                >
                  Coming Soon (Animated)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSettings({
                      ...settings,
                      collection: {
                        ...settings.collection,
                        opensea_status: 'Live',
                      },
                    })
                  }
                  className={`flex-1 py-2 px-2.5 text-xs font-arcade font-bold rounded-xl border transition-all ${
                    settings.collection.opensea_status === 'Live'
                      ? 'bg-[#facc15] text-[#121820] border-[#facc15] shadow-sm'
                      : 'bg-[#1e2430] text-[#94a3b8] border-[#2d3748] hover:text-[#f0fdf4]'
                  }`}
                >
                  Live (Opens Link)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-arcade font-bold text-[#f0fdf4] mb-1.5">
                OPENSEA MARKETPLACE LINK
              </label>
              <input
                type="url"
                placeholder="https://opensea.io/collection/robinosnft/overview"
                value={settings.collection.opensea_url}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    collection: { ...settings.collection, opensea_url: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 text-xs bg-[#1e2430] border border-[#2d3748] rounded-xl text-[#facc15] font-code focus:outline-none focus:border-[#facc15] transition-colors"
              />
              <p className="text-[10px] text-[#94a3b8] mt-1.5 leading-relaxed">
                When status is "Live", users clicking OpenSea will be directed to this URL. When "Coming Soon", users see the animated badge.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Early Access Control */}
        <div className="p-6 bg-[#141922] border border-[#262f3d] rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
          <h3 className="font-arcade text-sm text-[#facc15] mb-1 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span>EARLY ACCESS SUBMISSION RULES</span>
          </h3>
          <p className="text-[11px] text-[#94a3b8] mb-5">
            Access gates, application caps, and automated cooldown rate limiting.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-arcade font-bold text-[#f0fdf4] mb-1.5">
                EARLY ACCESS PORTAL STATUS
              </label>
              <button
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    early_access: {
                      ...settings.early_access,
                      is_open: !settings.early_access.is_open,
                    },
                  })
                }
                className={`w-full py-2.5 px-3 text-xs font-arcade font-bold rounded-xl border transition-all ${
                  settings.early_access.is_open
                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-600/70'
                    : 'bg-red-950/60 text-red-300 border-red-800/80'
                }`}
              >
                {settings.early_access.is_open ? '🟢 OPEN (ACCEPTING SUBMISSIONS)' : '🔴 CLOSED (SUBMISSIONS PAUSED)'}
              </button>
            </div>

            <div>
              <label className="block text-xs font-arcade font-bold text-[#f0fdf4] mb-1.5">
                MAXIMUM APPLICATIONS CAP
              </label>
              <input
                type="number"
                value={settings.early_access.max_applications}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    early_access: {
                      ...settings.early_access,
                      max_applications: Number(e.target.value),
                    },
                  })
                }
                className="w-full px-3.5 py-2.5 text-xs bg-[#1e2430] border border-[#2d3748] rounded-xl text-[#f0fdf4] font-code focus:outline-none focus:border-[#facc15] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-arcade font-bold text-[#f0fdf4] mb-1.5">
                DEFAULT ALLOCATION PRESET
              </label>
              <input
                type="text"
                value={settings.early_access.default_allocation}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    early_access: {
                      ...settings.early_access,
                      default_allocation: e.target.value,
                    },
                  })
                }
                className="w-full px-3.5 py-2.5 text-xs bg-[#1e2430] border border-[#2d3748] rounded-xl text-[#facc15] font-code focus:outline-none focus:border-[#facc15] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-arcade font-bold text-[#f0fdf4] mb-1.5">
                SUBMISSION COOLDOWN (SECONDS)
              </label>
              <input
                type="number"
                value={settings.early_access.submission_cooldown_sec}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    early_access: {
                      ...settings.early_access,
                      submission_cooldown_sec: Number(e.target.value),
                    },
                  })
                }
                className="w-full px-3.5 py-2.5 text-xs bg-[#1e2430] border border-[#2d3748] rounded-xl text-[#f0fdf4] font-code focus:outline-none focus:border-[#facc15] transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Quest Settings */}
        <div className="p-6 bg-[#141922] border border-[#262f3d] rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
          <h3 className="font-arcade text-sm text-[#facc15] mb-1">
            GLOBAL QUEST BEHAVIORS
          </h3>
          <p className="text-[11px] text-[#94a3b8] mb-5">
            Default behaviors applied when generating new quests and validating submissions. Individual quest links can be managed directly in the QUESTS CMS tab.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-arcade font-bold text-[#f0fdf4] mb-1.5">
                REQUIRED TASK ENFORCEMENT
              </label>
              <input
                type="text"
                value={settings.quests.required_task_behavior}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    quests: {
                      ...settings.quests,
                      required_task_behavior: e.target.value,
                    },
                  })
                }
                className="w-full px-3.5 py-2.5 text-xs bg-[#1e2430] border border-[#2d3748] rounded-xl text-[#f0fdf4] font-code focus:outline-none focus:border-[#facc15] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-arcade font-bold text-[#f0fdf4] mb-1.5">
                DEFAULT PROOF REQUIREMENT
              </label>
              <button
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    quests: {
                      ...settings.quests,
                      default_proof_required: !settings.quests.default_proof_required,
                    },
                  })
                }
                className={`w-full py-2.5 px-3 text-xs font-arcade font-bold rounded-xl border transition-all ${
                  settings.quests.default_proof_required
                    ? 'bg-[#facc15] text-[#121820] border-[#facc15]'
                    : 'bg-[#1e2430] text-[#94a3b8] border-[#2d3748]'
                }`}
              >
                {settings.quests.default_proof_required ? 'ENABLE BY DEFAULT' : 'DISABLE BY DEFAULT'}
              </button>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-7 py-3 bg-[#facc15] hover:bg-[#fde047] text-[#121820] font-arcade font-bold text-xs sm:text-sm flex items-center gap-2 rounded-xl shadow-[0_4px_16px_rgba(250,204,21,0.25)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>SAVE SETTINGS & LINKS</span>
          </button>
        </div>
      </form>
    </div>
  );
};
