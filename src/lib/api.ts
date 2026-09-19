import type {
  QuestTask,
  Applicant,
  DashboardStats,
  PlatformSettings,
  AuditLogEntry,
  AdminUser,
  SubmitApplicationPayload,
} from '../types.js';

const ADMIN_TOKEN_KEY = 'robinos_admin_token';

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

function getAuthHeaders(): HeadersInit {
  const token = getAdminToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const api = {
  // Public
  async getPublicConfig(): Promise<{
    collection: PlatformSettings['collection'];
    early_access: { is_open: boolean; max_applications: number; default_allocation: string };
  }> {
    const res = await fetch('/api/public/config');
    if (!res.ok) throw new Error('Failed to load platform configuration');
    return res.json();
  },

  async getPublicTasks(): Promise<QuestTask[]> {
    const res = await fetch('/api/public/tasks');
    if (!res.ok) throw new Error('Failed to load active quests');
    const data = await res.json();
    return data.tasks || [];
  },

  async submitApplication(payload: SubmitApplicationPayload): Promise<{
    success: boolean;
    message: string;
    applicant: {
      application_id: string;
      wallet_address: string;
      x_username: string;
      status: string;
      created_at: string;
    };
  }> {
    const res = await fetch('/api/public/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Submission failed');
    }
    return data;
  },

  async lookupStatus(query: string): Promise<any> {
    const res = await fetch(`/api/public/status/${encodeURIComponent(query)}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'No application found');
    }
    return data;
  },

  // Admin Auth
  async adminLogin(email: string, password: string): Promise<{ token: string; admin: AdminUser }> {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    setAdminToken(data.token);
    return data;
  },

  async verifyAdminMe(): Promise<AdminUser> {
    const res = await fetch('/api/admin/me', { headers: getAuthHeaders() });
    if (!res.ok) {
      clearAdminToken();
      throw new Error('Unauthorized');
    }
    const data = await res.json();
    return data.admin;
  },

  async adminLogout(): Promise<void> {
    try {
      await fetch('/api/admin/logout', { method: 'POST', headers: getAuthHeaders() });
    } finally {
      clearAdminToken();
    }
  },

  // Admin Stats
  async getAdminStats(): Promise<DashboardStats> {
    const res = await fetch('/api/admin/stats', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch statistics');
    const data = await res.json();
    return data.stats;
  },

  // Admin Quests
  async getAdminTasks(): Promise<QuestTask[]> {
    const res = await fetch('/api/admin/tasks', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch quests');
    const data = await res.json();
    return data.tasks || [];
  },

  async createQuest(task: Partial<QuestTask>): Promise<QuestTask> {
    const res = await fetch('/api/admin/tasks', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(task),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create quest');
    return data.task;
  },

  async updateQuest(id: string, updates: Partial<QuestTask>): Promise<QuestTask> {
    const res = await fetch(`/api/admin/tasks/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update quest');
    return data.task;
  },

  async toggleQuest(id: string): Promise<QuestTask> {
    const res = await fetch(`/api/admin/tasks/${id}/toggle`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to toggle quest');
    return data.task;
  },

  async duplicateQuest(id: string): Promise<QuestTask> {
    const res = await fetch(`/api/admin/tasks/${id}/duplicate`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to duplicate quest');
    return data.task;
  },

  async deleteQuest(id: string): Promise<void> {
    const res = await fetch(`/api/admin/tasks/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete quest');
  },

  async reorderQuests(taskIds: string[]): Promise<QuestTask[]> {
    const res = await fetch('/api/admin/tasks/reorder', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ task_ids: taskIds }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to reorder quests');
    return data.tasks;
  },

  // Admin Applicants
  async getApplicants(filters?: {
    search?: string;
    status?: string;
    reviewed?: string;
    completion?: string;
  }): Promise<Applicant[]> {
    const params = new URLSearchParams();
    if (filters?.search) params.set('search', filters.search);
    if (filters?.status && filters.status !== 'All') params.set('status', filters.status);
    if (filters?.reviewed && filters.reviewed !== 'All') params.set('reviewed', filters.reviewed);
    if (filters?.completion && filters.completion !== 'All') params.set('completion', filters.completion);

    const res = await fetch(`/api/admin/applicants?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch applicants');
    const data = await res.json();
    return data.applicants || [];
  },

  async getApplicantDetail(id: string): Promise<Applicant> {
    const res = await fetch(`/api/admin/applicants/${id}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch applicant details');
    const data = await res.json();
    return data.applicant;
  },

  async updateApplicantStatus(
    id: string,
    status: Applicant['status'],
    allocation?: string | null,
    notes?: string
  ): Promise<Applicant> {
    const res = await fetch(`/api/admin/applicants/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, allocation, notes }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update status');
    return data.applicant;
  },

  async updateTaskVerification(
    applicantId: string,
    taskId: string,
    status: 'Verified' | 'Rejected' | 'Needs Review'
  ): Promise<any> {
    const res = await fetch(`/api/admin/applicants/${applicantId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update task status');
    return data.task_record;
  },

  async bulkApplicantAction(
    ids: string[],
    action: 'approve' | 'reject' | 'waitlist' | 'mark_reviewed',
    allocation?: string
  ): Promise<number> {
    const res = await fetch('/api/admin/applicants/bulk', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ids, action, allocation }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Bulk action failed');
    return data.affected_count;
  },

  async exportApplicantsCSV(): Promise<Blob> {
    const res = await fetch('/api/admin/export', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to export CSV');
    return res.blob();
  },

  // Admin Settings & Audit Logs
  async getSettings(): Promise<PlatformSettings> {
    const DEFAULT_FALLBACK_SETTINGS: PlatformSettings = {
      collection: {
        name: 'ROBINOS',
        supply: 5555,
        mint_price: '0.0004 ETH',
        chain: 'Robinhood Chain',
        launch_date: 'September 24, 2026',
        x_url: 'https://x.com/robinos_nft',
        opensea_status: 'Robinhood Chain Launch',
        opensea_url: 'https://opensea.io/collection/robinos',
      },
      early_access: {
        is_open: true,
        max_applications: 5555,
        default_allocation: '1 NFT',
        submission_cooldown_sec: 60,
        captcha_enabled: false,
      },
      quests: {
        default_proof_required: true,
        required_task_behavior: 'all_required',
        min_tasks_required: 4,
      },
    };

    try {
      const pubRes = await fetch('/api/public/settings');
      if (pubRes.ok) {
        const pubData = await pubRes.json();
        if (pubData && pubData.settings) return pubData.settings;
      }
    } catch {
      // ignore and try admin endpoint
    }

    try {
      const res = await fetch('/api/admin/settings', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data && data.settings) return data.settings;
      }
    } catch {
      // ignore and return fallback
    }

    return DEFAULT_FALLBACK_SETTINGS;
  },

  async updateSettings(settings: Partial<PlatformSettings>): Promise<PlatformSettings> {
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update settings');
    return data.settings;
  },

  async getAuditLogs(): Promise<AuditLogEntry[]> {
    const res = await fetch('/api/admin/audit-logs', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load audit logs');
    const data = await res.json();
    return data.logs || [];
  },
};
