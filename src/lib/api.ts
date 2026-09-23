import type {
  QuestTask,
  Applicant,
  DashboardStats,
  PlatformSettings,
  AuditLogEntry,
  AdminUser,
  SubmitApplicationPayload,
} from '../types';

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
    'Cache-Control': 'no-cache',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const DEFAULT_FALLBACK_TASKS: QuestTask[] = [
  {
    id: 'task-1',
    title: 'FOLLOW @RobinosNFT ON X',
    description: 'Follow our official handles on X to stay updated on drops and announcements.',
    type: 'Follow',
    task_url: 'https://x.com/RobinosNFT',
    proof_required: true,
    required: true,
    active: true,
    display_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'task-2',
    title: 'LIKE, REPOST & COMMENT ON PINNED POST',
    description: 'Engage with our official pinned launch announcement on X.',
    type: 'Comment',
    task_url: 'https://x.com/RobinosNFT',
    proof_required: true,
    required: true,
    active: true,
    display_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const api = {
  // Public
  async getPublicConfig(): Promise<{
    collection: PlatformSettings['collection'];
    early_access: { is_open: boolean; max_applications: number; default_allocation: string };
  }> {
    try {
      const res = await fetch('/api/public/config', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Network issue fetching public config:', err);
    }

    return {
      collection: {
        name: 'ROBINOS',
        supply: 5555,
        mint_price: '0.0004 ETH (~$1)',
        chain: 'Robinhood',
        launch_date: '24th Sept',
        x_url: 'https://x.com/RobinosNFT',
        opensea_status: 'Live',
        opensea_url: 'https://opensea.io/collection/robinosnft/overview',
      },
      early_access: {
        is_open: true,
        max_applications: 5555,
        default_allocation: '1 NFT',
      },
    };
  },

  async getPublicTasks(): Promise<QuestTask[]> {
    try {
      const res = await fetch('/api/public/tasks', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tasks)) {
          return data.tasks;
        }
      }
    } catch (err) {
      console.warn('Network issue fetching tasks from server:', err);
    }

    return DEFAULT_FALLBACK_TASKS;
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
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      cache: 'no-store',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Submission failed');
    }
    return data;
  },

  async lookupStatus(query: string): Promise<any> {
    const res = await fetch(`/api/public/status/${encodeURIComponent(query)}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.message || 'No application found');
    }
    // The API returns { found, whitelisted, application: { ... } } — unwrap it
    const result = data.application || data;
    if (data.whitelisted !== undefined) {
      result.whitelisted = data.whitelisted;
    }
    return result;
  },

  // Admin Auth
  async adminLogin(usernameOrEmail: string, password: string): Promise<{ token: string; admin: AdminUser }> {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      cache: 'no-store',
      body: JSON.stringify({
        username: usernameOrEmail,
        email: usernameOrEmail,
        password,
      }),
    });
    const text = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Server returned error (${res.status}): ${text.substring(0, 100)}`);
    }
    if (!res.ok) throw new Error(data.error || 'Login failed');
    setAdminToken(data.token);
    return data;
  },

  async verifyAdminMe(): Promise<AdminUser> {
    const res = await fetch('/api/admin/me', {
      headers: getAuthHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) {
      clearAdminToken();
      throw new Error('Unauthorized');
    }
    const data = await res.json();
    return data.admin;
  },

  async adminLogout(): Promise<void> {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: getAuthHeaders(),
        cache: 'no-store',
      });
    } finally {
      clearAdminToken();
    }
  },

  // Admin Stats
  async getAdminStats(): Promise<DashboardStats> {
    const res = await fetch('/api/admin/stats', {
      headers: getAuthHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to fetch statistics');
    const data = await res.json();
    return data.stats;
  },

  // Admin Quests
  async getAdminTasks(): Promise<QuestTask[]> {
    const res = await fetch('/api/admin/tasks', {
      headers: getAuthHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to fetch quests');
    const data = await res.json();
    return data.tasks || [];
  },

  async createQuest(task: Partial<QuestTask>): Promise<QuestTask> {
    const res = await fetch('/api/admin/tasks', {
      method: 'POST',
      headers: getAuthHeaders(),
      cache: 'no-store',
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
      cache: 'no-store',
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
      cache: 'no-store',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to toggle quest');
    return data.task;
  },

  async duplicateQuest(id: string): Promise<QuestTask> {
    const res = await fetch(`/api/admin/tasks/${id}/duplicate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      cache: 'no-store',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to duplicate quest');
    return data.task;
  },

  async deleteQuest(id: string): Promise<void> {
    const res = await fetch(`/api/admin/tasks/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to delete quest');
  },

  async reorderQuests(taskIds: string[]): Promise<QuestTask[]> {
    const res = await fetch('/api/admin/tasks/reorder', {
      method: 'POST',
      headers: getAuthHeaders(),
      cache: 'no-store',
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
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to fetch applicants');
    const data = await res.json();
    return data.applicants || [];
  },

  async getApplicantDetail(id: string): Promise<Applicant> {
    const res = await fetch(`/api/admin/applicants/${id}`, {
      headers: getAuthHeaders(),
      cache: 'no-store',
    });
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
      cache: 'no-store',
      body: JSON.stringify({ status, allocation, notes }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update applicant status');
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
      cache: 'no-store',
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update task verification');
    return data.task_record;
  },

  async bulkUpdateApplicants(
    ids: string[],
    action: 'approve' | 'reject' | 'waitlist' | 'mark_reviewed',
    allocation?: string
  ): Promise<number> {
    const res = await fetch('/api/admin/applicants/bulk', {
      method: 'POST',
      headers: getAuthHeaders(),
      cache: 'no-store',
      body: JSON.stringify({ ids, action, allocation }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Bulk action failed');
    return data.affected_count;
  },

  async bulkApplicantAction(
    ids: string[],
    action: 'approve' | 'reject' | 'waitlist' | 'mark_reviewed',
    allocation?: string
  ): Promise<number> {
    return this.bulkUpdateApplicants(ids, action, allocation);
  },

  async exportApplicantsCSV(): Promise<Blob> {
    const res = await fetch('/api/admin/export', {
      headers: getAuthHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to export CSV');
    return await res.blob();
  },

  // Admin Settings
  async getSettings(): Promise<PlatformSettings> {
    const res = await fetch('/api/admin/settings', {
      headers: getAuthHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to fetch platform settings');
    const data = await res.json();
    return data.settings;
  },

  async updateSettings(settings: Partial<PlatformSettings>): Promise<PlatformSettings> {
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: getAuthHeaders(),
      cache: 'no-store',
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update settings');
    return data.settings;
  },

  // Audit Logs
  async getAuditLogs(): Promise<AuditLogEntry[]> {
    const res = await fetch('/api/admin/audit-logs', {
      headers: getAuthHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    const data = await res.json();
    return data.logs || [];
  },

  // CSV Export URL
  getExportUrl(): string {
    const token = getAdminToken();
    return `/api/admin/export${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },

  // Admin Whitelist (CSV Import)
  async getWhitelist(): Promise<{
    count: number;
    addresses: { wallet_address: string; original_address: string; imported_at: string }[];
  }> {
    const res = await fetch('/api/admin/whitelist', {
      headers: getAuthHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to fetch whitelist');
    const data = await res.json();
    return { count: data.count || 0, addresses: data.addresses || [] };
  },

  async importWhitelistCSV(file: File): Promise<{ count: number; message: string }> {
    const token = getAdminToken();
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/admin/whitelist', {
      method: 'POST',
      headers: {
        'Cache-Control': 'no-cache',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to import whitelist');
    return { count: data.count || 0, message: data.message || 'Import complete' };
  },

  async clearWhitelist(): Promise<void> {
    const res = await fetch('/api/admin/whitelist', {
      method: 'DELETE',
      headers: getAuthHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to clear whitelist');
    }
  },
};
