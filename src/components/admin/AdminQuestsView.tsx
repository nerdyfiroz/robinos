import React, { useState } from 'react';
import {
  Plus,
  Edit,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Sparkles,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import type { QuestTask, TaskType } from '../../types.js';
import { api } from '../../lib/api.js';

interface AdminQuestsViewProps {
  tasks: QuestTask[];
  onTasksUpdated: () => void;
}

const TASK_TYPES: TaskType[] = [
  'Follow',
  'Like',
  'Repost',
  'Comment',
  'Quote Post',
  'Visit Link',
  'Join Discord',
  'Join Telegram',
  'Custom',
];

export const AdminQuestsView: React.FC<AdminQuestsViewProps> = ({ tasks, onTasksUpdated }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<QuestTask | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TaskType>('Follow');
  const [taskUrl, setTaskUrl] = useState('');
  const [proofRequired, setProofRequired] = useState(false);
  const [required, setRequired] = useState(true);
  const [active, setActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState<number>(1);

  const openCreateModal = () => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setType('Follow');
    setTaskUrl('https://x.com/RobinosNFT');
    setProofRequired(false);
    setRequired(true);
    setActive(true);
    setDisplayOrder(tasks.length + 1);
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (task: QuestTask) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description);
    setType(task.type);
    setTaskUrl(task.task_url);
    setProofRequired(task.proof_required);
    setRequired(task.required);
    setActive(task.active);
    setDisplayOrder(task.display_order);
    setError(null);
    setModalOpen(true);
  };

  const handleSaveQuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Quest title is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        title: title.trim(),
        description: description.trim(),
        type,
        task_url: taskUrl.trim(),
        proof_required: proofRequired,
        required,
        active,
        display_order: Number(displayOrder) || 1,
      };

      if (editingTask) {
        await api.updateQuest(editingTask.id, payload);
        showNotification(`Quest "${title}" updated successfully`);
      } else {
        await api.createQuest(payload);
        showNotification(`Quest "${title}" created and published to live database`);
      }

      setModalOpen(false);
      onTasksUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to save quest');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await api.duplicateQuest(id);
      showNotification('Quest duplicated successfully');
      onTasksUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to duplicate quest');
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await api.toggleQuest(id);
      onTasksUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle quest status');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteQuest(id);
      setDeleteConfirmId(null);
      showNotification('Quest deleted from database');
      onTasksUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to delete quest');
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= tasks.length) return;

    const reordered = [...tasks];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    const taskIds = reordered.map((t) => t.id);
    try {
      await api.reorderQuests(taskIds);
      onTasksUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to reorder quests');
    }
  };

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-arcade text-xl sm:text-2xl text-[#f0fdf4] mb-1 tracking-wide">
            QUEST MANAGEMENT (CMS)
          </h2>
          <p className="text-xs text-[#94a3b8]">
            Define, reorder, and configure Early Access quests and links. Changes sync to the public portal immediately.
          </p>
        </div>

        <button
          id="btn-create-new-quest"
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-[#facc15] hover:bg-[#fde047] text-[#121820] font-arcade font-bold text-xs flex items-center justify-center gap-2 rounded-xl shadow-[0_4px_16px_rgba(250,204,21,0.25)] transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>CREATE QUEST</span>
        </button>
      </div>

      {/* Success Banner */}
      {successMsg && (
        <div className="p-3.5 bg-[#292215]/60 border border-[#6b5118] text-[#facc15] text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 font-arcade">
            <Check className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="p-1 hover:opacity-80">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Quests Table */}
      <div className="bg-[#141922] border border-[#262f3d] rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.3)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#262f3d] bg-[#10141c] text-[#94a3b8]">
                <th className="p-4 font-arcade text-[10px] w-20 text-center">ORDER</th>
                <th className="p-4 font-arcade text-[10px]">QUEST</th>
                <th className="p-4 font-arcade text-[10px]">TYPE</th>
                <th className="p-4 font-arcade text-[10px]">REQUIRED</th>
                <th className="p-4 font-arcade text-[10px]">PROOF</th>
                <th className="p-4 font-arcade text-[10px]">STATUS</th>
                <th className="p-4 font-arcade text-[10px] text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262f3d]/60">
              {tasks.map((task, index) => (
                <tr
                  key={task.id}
                  className={`hover:bg-[#181d26] transition-colors ${
                    !task.active ? 'opacity-60 bg-[#10141c]' : ''
                  }`}
                >
                  {/* Order & Reorder arrows */}
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="font-arcade text-[#facc15] font-bold">{task.display_order}</span>
                      <div className="flex flex-col">
                        <button
                          onClick={() => handleMoveOrder(index, 'up')}
                          disabled={index === 0}
                          className="text-[#94a3b8] hover:text-[#facc15] disabled:opacity-20 p-0.5 transition-colors"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleMoveOrder(index, 'down')}
                          disabled={index === tasks.length - 1}
                          className="text-[#94a3b8] hover:text-[#facc15] disabled:opacity-20 p-0.5 transition-colors"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </td>

                  {/* Title & Description & Managed Link */}
                  <td className="p-4">
                    <div className="font-bold text-[#f0fdf4] mb-0.5">{task.title}</div>
                    <div className="text-[11px] text-[#94a3b8] line-clamp-1 max-w-sm">
                      {task.description}
                    </div>
                    {task.task_url ? (
                      <a
                        href={task.task_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] text-[#facc15] hover:text-[#fde047] underline underline-offset-2 mt-1 transition-colors"
                        title="Managed Quest Link"
                      >
                        <span className="truncate max-w-[240px] font-code">{task.task_url}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-[10px] text-[#94a3b8]/50 italic block mt-0.5">No link set</span>
                    )}
                  </td>

                  {/* Type */}
                  <td className="p-4">
                    <span className="px-2.5 py-1 bg-[#292215] text-[#facc15] border border-[#6b5118] text-[10px] font-arcade font-bold rounded-md">
                      {task.type}
                    </span>
                  </td>

                  {/* Required */}
                  <td className="p-4">
                    {task.required ? (
                      <span className="px-2.5 py-0.5 bg-red-950/70 text-red-300 border border-red-700/70 text-[10px] font-arcade rounded-md">
                        YES
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 bg-[#1e2430] text-[#94a3b8] border border-[#2d3748] text-[10px] font-arcade rounded-md">
                        NO
                      </span>
                    )}
                  </td>

                  {/* Proof */}
                  <td className="p-4">
                    {task.proof_required ? (
                      <span className="px-2.5 py-0.5 bg-blue-950/70 text-blue-300 border border-blue-700/70 text-[10px] font-arcade rounded-md">
                        YES (URL)
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 bg-[#1e2430] text-[#94a3b8] border border-[#2d3748] text-[10px] font-arcade rounded-md">
                        NO
                      </span>
                    )}
                  </td>

                  {/* Status Toggle */}
                  <td className="p-4">
                    <button
                      onClick={() => handleToggleActive(task.id)}
                      className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-arcade font-bold rounded-lg border transition-all ${
                        task.active
                          ? 'bg-emerald-950/50 text-emerald-400 border-emerald-600/70'
                          : 'bg-[#1e2430] text-[#94a3b8] border-[#2d3748]'
                      }`}
                    >
                      {task.active ? 'ACTIVE' : 'INACTIVE'}
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(task)}
                        className="p-2 bg-[#181d26] hover:bg-[#1e2430] text-[#cbd5e1] hover:text-[#facc15] border border-[#262f3d] hover:border-[#facc15]/50 rounded-lg transition-all"
                        title="Edit Quest & Link"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDuplicate(task.id)}
                        className="p-2 bg-[#181d26] hover:bg-[#1e2430] text-[#cbd5e1] hover:text-[#facc15] border border-[#262f3d] hover:border-[#facc15]/50 rounded-lg transition-all"
                        title="Duplicate Quest"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(task.id)}
                        className="p-2 bg-[#181d26] hover:bg-red-950/40 text-[#cbd5e1] hover:text-red-400 border border-[#262f3d] hover:border-red-600/50 rounded-lg transition-all"
                        title="Delete Quest"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#141922] border border-red-700/60 rounded-2xl p-6 shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
            <h3 className="font-arcade text-base text-red-400 mb-2">
              CONFIRM QUEST DELETION
            </h3>
            <p className="text-xs text-[#94a3b8] mb-6 leading-relaxed">
              Are you sure you want to permanently delete this quest? Existing applicant completion proofs for this quest will remain in audit logs.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-xs font-arcade text-[#94a3b8] bg-[#1e2430] hover:bg-[#283040] rounded-xl border border-[#2d3748] transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 text-xs font-arcade font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl transition-all shadow-md"
              >
                DELETE PERMANENTLY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Quest Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-[#141922] border border-[#262f3d] rounded-2xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.7)] max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 text-[#94a3b8] hover:text-[#facc15] p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-arcade text-lg text-[#facc15] mb-1">
              {editingTask ? 'EDIT QUEST & LINK' : 'CREATE QUEST & LINK'}
            </h3>
            <p className="text-xs text-[#94a3b8] mb-5">
              Configure quest details and destination links for early access participants.
            </p>

            {error && (
              <div className="p-3 bg-red-950/70 border border-red-700/80 text-red-300 text-xs rounded-xl mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSaveQuest} className="space-y-4">
              {/* Quest Name */}
              <div>
                <label className="block text-xs font-arcade font-bold text-[#f0fdf4] mb-1.5">
                  QUEST NAME *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Follow @RobinosNFT on X"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-[#1e2430] border border-[#2d3748] rounded-xl focus:border-[#facc15] text-[#f0fdf4] font-code focus:outline-none transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-arcade font-bold text-[#f0fdf4] mb-1.5">
                  DESCRIPTION
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Follow @RobinosNFT on X to stay updated on whitelist announcements."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-[#1e2430] border border-[#2d3748] rounded-xl focus:border-[#facc15] text-[#f0fdf4] font-code focus:outline-none transition-colors"
                />
              </div>

              {/* Type and Display Order */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-arcade font-bold text-[#f0fdf4] mb-1.5">
                    TASK TYPE
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as TaskType)}
                    className="w-full px-3.5 py-2.5 text-xs bg-[#1e2430] border border-[#2d3748] rounded-xl focus:border-[#facc15] text-[#facc15] font-arcade focus:outline-none transition-colors"
                  >
                    {TASK_TYPES.map((t) => (
                      <option key={t} value={t} className="bg-[#141922] text-[#f0fdf4]">
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-arcade font-bold text-[#f0fdf4] mb-1.5">
                    DISPLAY ORDER
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 text-xs bg-[#1e2430] border border-[#2d3748] rounded-xl focus:border-[#facc15] text-[#f0fdf4] font-code focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Task URL / Link Management */}
              <div>
                <label className="block text-xs font-arcade font-bold text-[#f0fdf4] mb-1.5">
                  MANAGED LINK (QUEST TARGET URL)
                </label>
                <input
                  type="url"
                  placeholder="https://x.com/RobinosNFT or tweet link"
                  value={taskUrl}
                  onChange={(e) => setTaskUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-[#1e2430] border border-[#2d3748] rounded-xl focus:border-[#facc15] text-[#facc15] font-code focus:outline-none transition-colors"
                />
                <p className="text-[11px] text-[#94a3b8] mt-1.5 leading-relaxed">
                  Admins can manage where users are sent. For follow tasks, use profile URL (e.g. <span className="text-[#facc15]">https://x.com/RobinosNFT</span>). For like/retweet/comment tasks, provide the post URL.
                </p>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {/* Proof Required */}
                <div className="p-3 bg-[#181d26] border border-[#262f3d] rounded-xl">
                  <span className="block text-[11px] font-arcade font-bold text-[#94a3b8] mb-1.5">
                    PROOF REQUIRED
                  </span>
                  <button
                    type="button"
                    onClick={() => setProofRequired(!proofRequired)}
                    className={`w-full py-1.5 text-xs font-arcade font-bold rounded-lg border transition-all ${
                      proofRequired
                        ? 'bg-[#facc15] text-[#121820] border-[#facc15]'
                        : 'bg-[#1e2430] text-[#94a3b8] border-[#2d3748]'
                    }`}
                  >
                    {proofRequired ? 'ON (URL)' : 'OFF'}
                  </button>
                </div>

                {/* Required */}
                <div className="p-3 bg-[#181d26] border border-[#262f3d] rounded-xl">
                  <span className="block text-[11px] font-arcade font-bold text-[#94a3b8] mb-1.5">
                    REQUIRED
                  </span>
                  <button
                    type="button"
                    onClick={() => setRequired(!required)}
                    className={`w-full py-1.5 text-xs font-arcade font-bold rounded-lg border transition-all ${
                      required
                        ? 'bg-[#facc15] text-[#121820] border-[#facc15]'
                        : 'bg-[#1e2430] text-[#94a3b8] border-[#2d3748]'
                    }`}
                  >
                    {required ? 'ON (MANDATORY)' : 'OFF (BONUS)'}
                  </button>
                </div>

                {/* Active */}
                <div className="p-3 bg-[#181d26] border border-[#262f3d] rounded-xl">
                  <span className="block text-[11px] font-arcade font-bold text-[#94a3b8] mb-1.5">
                    ACTIVE
                  </span>
                  <button
                    type="button"
                    onClick={() => setActive(!active)}
                    className={`w-full py-1.5 text-xs font-arcade font-bold rounded-lg border transition-all ${
                      active
                        ? 'bg-emerald-500 text-[#121820] border-emerald-500'
                        : 'bg-red-950/60 text-red-300 border-red-800/80'
                    }`}
                  >
                    {active ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-[#262f3d]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-arcade text-[#94a3b8] bg-[#1e2430] hover:bg-[#283040] rounded-xl border border-[#2d3748] transition-colors"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 text-xs font-arcade font-bold text-[#121820] bg-[#facc15] hover:bg-[#fde047] rounded-xl flex items-center gap-1.5 shadow-[0_4px_16px_rgba(250,204,21,0.25)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{editingTask ? 'SAVE CHANGES' : 'CREATE QUEST'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
