'use client';

import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  AlertTriangle,
  Send,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import type { QuestTask, SubmitApplicationPayload } from '../../types';
import { api } from '../../lib/api';

interface EarlyAccessQuestsProps {
  isOpen: boolean;
  onSuccess: (data: { application_id: string; wallet_address: string; x_username: string }) => void;
}

// Crisp X icon matching the screenshot
const XIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={`fill-current ${className}`}
    fill="currentColor"
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// Wallet SVG icon matching the screenshot card
const WalletCardIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
  </svg>
);

export const EarlyAccessQuests: React.FC<EarlyAccessQuestsProps> = ({ isOpen, onSuccess }) => {
  const [tasks, setTasks] = useState<QuestTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [xUsername, setXUsername] = useState<string>('');
  const [taskInputs, setTaskInputs] = useState<Record<string, string>>({});

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch dynamic quests from database
  const loadQuests = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) setRefreshing(true);
      setError(null);
      const data = await api.getPublicTasks();
      setTasks(data);

      setTaskInputs((prev) => {
        const next = { ...prev };
        data.forEach((t) => {
          if (next[t.id] === undefined) {
            next[t.id] = '';
          }
        });
        return next;
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load quests from server');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadQuests();
    const pollInterval = setInterval(() => {
      loadQuests();
    }, 8000);
    return () => clearInterval(pollInterval);
  }, []);

  const handleTaskInputChange = (taskId: string, value: string) => {
    setTaskInputs((prev) => ({
      ...prev,
      [taskId]: value,
    }));
  };

  // Helper to determine if a task is a Follow task
  const isFollowTask = (task: QuestTask) => {
    return task.type === 'Follow' || task.title.toLowerCase().includes('follow');
  };

  // Helper to get input placeholder matching the screenshot style
  const getTaskPlaceholder = (task: QuestTask) => {
    if (isFollowTask(task)) {
      return '@yourusername (or profile link)';
    }
    if (task.type === 'Comment') {
      return 'https://x.com/.../status/... (comment link)';
    }
    if (task.type === 'Repost' || task.type === 'Quote Post') {
      return 'https://x.com/.../status/... (repost or quote link)';
    }
    if (task.proof_required) {
      return 'https://x.com/.../status/... (proof link)';
    }
    return '@yourusername or proof link';
  };

  // Parse links inside task title so user can click on the username to follow the profiles
  // or click the title itself to open the target quest link on X
  const renderFormattedTaskTitle = (title: string, taskUrl?: string) => {
    // Regex to match words starting with @, #, or specific handles
    const parts = title.split(/(@[a-zA-Z0-9_]+|#[a-zA-Z0-9_]+)/g);
    const hasHandles = parts.some((p) => p.startsWith('@'));

    // If there are no @ handles and taskUrl exists, make the entire title the link directly in yellow
    if (!hasHandles && taskUrl) {
      return (
        <a
          href={taskUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Click to view and complete quest on X"
          className="font-arcade text-[13px] sm:text-[15px] md:text-[16px] text-[#facc15] hover:text-[#fde047] tracking-wider leading-relaxed transition-colors cursor-pointer inline-block hover:brightness-110"
        >
          {title}
        </a>
      );
    }

    return (
      <span className={`font-arcade text-[13px] sm:text-[15px] md:text-[16px] tracking-wider leading-relaxed ${taskUrl ? 'text-[#facc15]' : 'text-[#f0fdf4]'}`}>
        {parts.map((part, i) => {
          if (part.startsWith('@')) {
            const handle = part.substring(1);
            const targetUrl =
              taskUrl && taskUrl.toLowerCase().includes(handle.toLowerCase())
                ? taskUrl
                : `https://x.com/${handle}`;
            return (
              <a
                key={i}
                href={targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={`Click to follow ${part} on X`}
                className="text-[#facc15] hover:text-[#fde047] underline underline-offset-4 decoration-[#facc15] transition-all inline-block mx-0.5 cursor-pointer font-bold hover:brightness-125"
                onClick={(e) => e.stopPropagation()}
              >
                {part}
              </a>
            );
          }
          if (part.startsWith('#')) {
            return (
              <span key={i} className="text-[#facc15] underline underline-offset-4 decoration-[#facc15] inline-block mx-0.5">
                {part}
              </span>
            );
          }
          if (taskUrl && part.trim().length > 0) {
            return (
              <a
                key={i}
                href={taskUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#facc15] hover:text-[#fde047] transition-colors cursor-pointer"
              >
                {part}
              </a>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </span>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!isOpen) {
      setSubmitError('Early Access is currently closed. Submissions are temporarily paused.');
      return;
    }

    // 1. Validate EVM wallet address
    const cleanWallet = walletAddress.trim();
    if (!cleanWallet) {
      setSubmitError('Please submit your EVM wallet address.');
      return;
    }

    const ethRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethRegex.test(cleanWallet)) {
      setSubmitError('Invalid EVM wallet address format. Must begin with 0x followed by 40 hex characters (42 characters total).');
      return;
    }

    // 2. Derive or validate X username
    // Check if user entered username in a follow task or the dedicated x username
    let derivedX = xUsername.trim();
    if (!derivedX) {
      // Find the first follow task input
      const followTask = tasks.find((t) => isFollowTask(t));
      if (followTask && taskInputs[followTask.id]) {
        derivedX = taskInputs[followTask.id].trim();
      }
    }

    // If it's a URL, extract handle
    if (derivedX.includes('x.com/') || derivedX.includes('twitter.com/')) {
      const match = derivedX.match(/(?:x|twitter)\.com\/([a-zA-Z0-9_]+)/i);
      if (match && match[1]) {
        derivedX = `@${match[1]}`;
      }
    } else if (derivedX && !derivedX.startsWith('@')) {
      derivedX = `@${derivedX}`;
    }

    if (!derivedX || derivedX.length < 2) {
      setSubmitError('Please enter your X (Twitter) username in the Follow quest input field.');
      return;
    }

    // 3. Validate required tasks
    const requiredTasks = tasks.filter((t) => t.required);
    for (const reqTask of requiredTasks) {
      const val = (taskInputs[reqTask.id] || '').trim();
      if (!val) {
        setSubmitError(`Please provide your response or link for "${reqTask.title}".`);
        return;
      }
      if (reqTask.proof_required) {
        const isUrlRequired =
          reqTask.type === 'Comment' ||
          reqTask.type === 'Like' ||
          reqTask.title.toLowerCase().includes('link') ||
          reqTask.title.toLowerCase().includes('post') ||
          reqTask.description.toLowerCase().includes('link') ||
          reqTask.description.toLowerCase().includes('http');

        if (isUrlRequired && !val.startsWith('http://') && !val.startsWith('https://')) {
          setSubmitError(`"${reqTask.title}" requires a valid link starting with http:// or https://`);
          return;
        }
      }
    }

    // 4. Construct payload
    const submissionPayload: SubmitApplicationPayload = {
      wallet_address: cleanWallet,
      x_username: derivedX,
      x_profile_url: `https://x.com/${derivedX.replace('@', '')}`,
      tasks: tasks.map((t) => {
        const val = (taskInputs[t.id] || '').trim();
        return {
          task_id: t.id,
          proof_url: val.length > 0 ? val : undefined,
          completed: val.length > 0,
        };
      }),
    };

    try {
      setSubmitting(true);
      const res = await api.submitApplication(submissionPayload);
      onSuccess({
        application_id: res.applicant.application_id,
        wallet_address: res.applicant.wallet_address,
        x_username: res.applicant.x_username,
      });
    } catch (err: any) {
      setSubmitError(err.message || 'Submission failed. Please check your details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="early-access-section" className="py-12 sm:py-16 max-w-4xl mx-auto px-4 sm:px-6 w-full">
      {/* Title matching screenshot style: Pixelated yellow heading */}
      <div className="mb-6 sm:mb-8">
        <h2 className="font-arcade text-lg sm:text-xl md:text-2xl text-[#facc15] tracking-wider uppercase drop-shadow-[0_2px_10px_rgba(250,204,21,0.2)]">
          EARLY ACCESS QUESTS
        </h2>
      </div>

      {/* Master Closed Notice */}
      {!isOpen && (
        <div className="mb-8 p-4 sm:p-5 bg-red-950/70 border border-red-500 text-red-200 text-center rounded-xl shadow-[0_4px_20px_rgba(239,68,68,0.2)]">
          <div className="font-arcade text-xs sm:text-sm text-red-400 mb-2">
            ⚠️ EARLY ACCESS IS CURRENTLY CLOSED
          </div>
          <p className="text-xs">
            The allocation window is temporarily paused. Please check back shortly or monitor official announcements.
          </p>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="py-16 text-center text-[#94a3b8]">
          <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-[#facc15]" />
          <p className="font-arcade text-xs tracking-wider">LOADING EARLY ACCESS QUESTS...</p>
        </div>
      ) : error ? (
        <div className="py-8 text-center text-red-400 bg-red-950/20 border border-red-800 rounded-xl p-4 my-4">
          <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-red-500" />
          <p className="text-xs">{error}</p>
          <button
            onClick={() => loadQuests()}
            className="mt-3 px-4 py-1.5 text-xs font-arcade bg-red-900/50 hover:bg-red-800 border border-red-500 rounded"
          >
            RETRY
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
          {/* Dynamic Quest Cards rendered in screenshot style */}
          {tasks.map((task) => {
            const isFollow = isFollowTask(task);
            const value = taskInputs[task.id] || '';

            return (
              <div
                key={task.id}
                className="bg-[#181d26] border border-[#262f3d] rounded-2xl p-4 sm:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-all hover:border-[#384556]"
              >
                {/* Header row: Icon, Title, and REQUIRED badge */}
                <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                  {/* Square dark icon container with rounded corners */}
                  {task.task_url ? (
                    <a
                      href={task.task_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open quest on X"
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#232a37] hover:bg-[#2c3545] border border-[#303a4c] hover:border-[#facc15]/50 flex items-center justify-center shrink-0 text-[#f0fdf4] hover:text-[#facc15] transition-all cursor-pointer"
                    >
                      {isFollow || task.type === 'Repost' || task.type === 'Comment' || task.type === 'Quote Post' ? (
                        <XIcon className="w-5 h-5" />
                      ) : (
                        <span className="font-arcade text-xs text-[#facc15]">#{task.display_order}</span>
                      )}
                    </a>
                  ) : (
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#232a37] border border-[#303a4c] flex items-center justify-center shrink-0 text-[#f0fdf4]">
                      {isFollow || task.type === 'Repost' || task.type === 'Comment' || task.type === 'Quote Post' ? (
                        <XIcon className="w-5 h-5 text-[#f0fdf4]" />
                      ) : (
                        <span className="font-arcade text-xs text-[#facc15]">#{task.display_order}</span>
                      )}
                    </div>
                  )}

                  {/* Title & Badge */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {renderFormattedTaskTitle(task.title, task.task_url)}
                      </div>

                      {/* REQUIRED badge (Screenshot exact styling: gold text, dark brown bg, gold border) */}
                      {task.required && (
                        <span className="px-2.5 py-1 text-[10px] sm:text-[11px] font-arcade tracking-wide text-[#facc15] bg-[#292215] border border-[#6b5118] rounded-md shrink-0 uppercase">
                          REQUIRED
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Input field with golden glow on focus matching the screenshot */}
                <div className="relative mt-2">
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => {
                      handleTaskInputChange(task.id, e.target.value);
                      if (isFollow) {
                        setXUsername(e.target.value);
                      }
                    }}
                    placeholder={getTaskPlaceholder(task)}
                    disabled={!isOpen || submitting}
                    className="w-full px-4 sm:px-5 py-3 sm:py-3.5 text-xs sm:text-sm bg-[#1e2430] border border-[#2d3748] rounded-xl text-[#f0fdf4] font-code placeholder-[#5a6b82] focus:outline-none focus:border-[#d97706] focus:ring-1 focus:ring-[#d97706]/40 shadow-inner transition-all"
                  />
                </div>
              </div>
            );
          })}

          {/* Third Card: SUBMIT EVM WALLET ADDRESS (Screenshot exact match) */}
          <div className="bg-[#181d26] border border-[#262f3d] rounded-2xl p-4 sm:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-all hover:border-[#384556]">
            {/* Header row: Wallet Icon, Title, and REQUIRED badge */}
            <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
              {/* Square dark icon container with rounded corners */}
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#232a37] border border-[#303a4c] flex items-center justify-center shrink-0 text-[#f0fdf4]">
                <WalletCardIcon className="w-5 h-5 text-[#f0fdf4]" />
              </div>

              {/* Title and REQUIRED badge */}
              <div className="flex-1 flex flex-wrap items-center justify-between gap-2 min-w-0">
                <span className="font-arcade text-[13px] sm:text-[15px] md:text-[16px] text-[#f0fdf4] tracking-wider uppercase">
                  SUBMIT EVM WALLET ADDRESS
                </span>

                <span className="px-2.5 py-1 text-[10px] sm:text-[11px] font-arcade tracking-wide text-[#facc15] bg-[#292215] border border-[#6b5118] rounded-md shrink-0 uppercase">
                  REQUIRED
                </span>
              </div>
            </div>

            {/* Input field with EVM address placeholder from screenshot */}
            <div className="relative mt-2">
              <input
                id="input-wallet-address"
                type="text"
                required
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="0x1234567890abcdef1234567890abcdef12345678"
                disabled={!isOpen || submitting}
                className="w-full px-4 sm:px-5 py-3 sm:py-3.5 text-xs sm:text-sm bg-[#1e2430] border border-[#2d3748] rounded-xl text-[#f0fdf4] font-code placeholder-[#5a6b82] focus:outline-none focus:border-[#d97706] focus:ring-1 focus:ring-[#d97706]/40 shadow-inner transition-all"
              />
            </div>
          </div>

          {/* Submit Error banner if any */}
          {submitError && (
            <div className="p-3.5 sm:p-4 bg-red-950/60 border border-red-600 rounded-xl text-red-200 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span className="font-sans leading-normal">{submitError}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            id="submit-early-access-application-btn"
            type="submit"
            disabled={!isOpen || submitting}
            className={`w-full py-4 px-6 text-sm font-arcade tracking-wider rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-[0_4px_16px_rgba(250,204,21,0.25)] ${
              !isOpen
                ? 'bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed shadow-none'
                : submitting
                ? 'bg-[#facc15]/70 text-[#121820] cursor-wait'
                : 'bg-[#facc15] hover:bg-[#fde047] text-[#121820] font-bold active:scale-[0.99]'
            }`}
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin shrink-0 text-[#121820]" />
                <span>RECORDING APPLICATION...</span>
              </>
            ) : !isOpen ? (
              <span>EARLY ACCESS CLOSED</span>
            ) : (
              <>
                <Send className="w-4 h-4 shrink-0 text-[#121820]" />
                <span>SUBMIT APPLICATION</span>
              </>
            )}
          </button>
        </form>
      )}
    </section>
  );
};
