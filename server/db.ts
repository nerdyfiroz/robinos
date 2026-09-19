import crypto from 'crypto';
import type {
  QuestTask,
  Applicant,
  ApplicantTaskRecord,
  AuditLogEntry,
  PlatformSettings,
  AdminUser,
  DashboardStats,
  ApplicantStatus,
  TaskVerificationStatus,
} from '../src/types.js';
import { postgresService, hashPassword } from './postgres.js';

// --- Stateless admin session tokens ---------------------------------------
// Serverless (Vercel) spins up a fresh instance per request, so RAM-stored
// session tokens disappear between calls and the admin gets bounced back to
// the login screen. Signed tokens stay valid across instances.
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.ADMIN_PASSWORD ||
  process.env.ADMIN_PASS ||
  'robinos-local-dev-secret';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export function signStatelessToken(admin: AdminUser): string {
  const payload = Buffer.from(
    JSON.stringify({
      id: admin.id,
      email: admin.email,
      role: admin.role,
      created_at: admin.created_at,
      exp: Date.now() + SESSION_TTL_MS,
    })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return `st.${payload}.${sig}`;
}

export function verifyStatelessToken(token: string): AdminUser | null {
  if (!token || !token.startsWith('st.')) return null;
  const [, payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.exp || data.exp < Date.now()) return null;
    return {
      id: data.id,
      email: data.email,
      role: data.role,
      created_at: data.created_at,
    } as AdminUser;
  } catch {
    return null;
  }
}

// Default initial settings
export const DEFAULT_SETTINGS: PlatformSettings = {
  collection: {
    name: 'ROBINOS',
    supply: 5555,
    mint_price: '0.0004 ETH (~$1)',
    chain: 'Robinhood',
    launch_date: 'September 24',
    x_url: 'https://x.com/RobinosNFT',
    opensea_status: 'Coming Soon',
    opensea_url: 'https://opensea.io/collection/robinos-nft',
  },
  early_access: {
    is_open: true,
    max_applications: 5555,
    default_allocation: '1 NFT',
    submission_cooldown_sec: 30,
    captcha_enabled: false,
  },
  quests: {
    default_proof_required: true,
    required_task_behavior: 'Strict (All required tasks must be completed before submission)',
    min_tasks_required: 2,
  },
};

// Seed tasks used when starting with a fresh database or in-memory fallback
export const SEED_TASKS: QuestTask[] = [
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
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
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
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
];

interface InMemoryData {
  tasks: QuestTask[];
  applicants: Applicant[];
  applicant_tasks: ApplicantTaskRecord[];
  admins: (AdminUser & { password_hash: string; session_tokens: string[] })[];
  audit_logs: AuditLogEntry[];
  settings: PlatformSettings;
  duplicate_count: number;
}

class Database {
  // Pure RAM fallback when no database connection is configured
  private memoryData: InMemoryData;
  private readonly initPromise: Promise<void>;

  constructor() {
    this.memoryData = {
      tasks: JSON.parse(JSON.stringify(SEED_TASKS)),
      applicants: [],
      applicant_tasks: [],
      admins: [],
      audit_logs: [],
      settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
      duplicate_count: 0,
    };

    // Ensure default admin in memory
    const defaultUser = (process.env.ADMIN_USERNAME || process.env.ADMIN_USER || 'admin').trim();
    const defaultPass = (process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS || 'admin').trim();
    this.memoryData.admins.push({
      id: 'admin-default',
      email: defaultUser.includes('@') ? defaultUser : `${defaultUser}@robinos.xyz`,
      role: 'superadmin',
      created_at: new Date().toISOString(),
      password_hash: hashPassword(defaultPass),
      session_tokens: [],
    });

    this.initPromise = this.init();
  }

  private async init(): Promise<void> {
    try {
      await postgresService.initDatabase({
        tasks: SEED_TASKS,
        settings: DEFAULT_SETTINGS,
      });
    } catch (err) {
      console.warn('Postgres initialization warning:', err);
    }
  }

  public async waitUntilReady(): Promise<void> {
    await this.initPromise;
  }

  // --- SETTINGS ---
  public async getSettings(): Promise<PlatformSettings> {
    await this.waitUntilReady();
    if (postgresService.isAvailable()) {
      const s = await postgresService.getSettings();
      if (s) return s;
    }
    return this.memoryData.settings;
  }

  public async updateSettings(
    newSettings: Partial<PlatformSettings>,
    adminEmail?: string
  ): Promise<PlatformSettings> {
    await this.waitUntilReady();
    const current = await this.getSettings();
    const updated: PlatformSettings = {
      collection: { ...current.collection, ...(newSettings.collection || {}) },
      early_access: { ...current.early_access, ...(newSettings.early_access || {}) },
      quests: { ...current.quests, ...(newSettings.quests || {}) },
    };

    if (postgresService.isAvailable()) {
      await postgresService.saveSettings(updated);
    } else {
      this.memoryData.settings = updated;
    }

    await this.addAuditLog({
      admin_id: 'admin',
      admin_email: adminEmail || 'admin',
      action: 'Platform settings updated',
      target_type: 'settings',
      target_id: 'default',
    });

    return updated;
  }

  // --- TASKS ---
  public async getPublicTasks(): Promise<QuestTask[]> {
    await this.waitUntilReady();
    if (postgresService.isAvailable()) {
      return await postgresService.getPublicTasks();
    }
    return this.memoryData.tasks
      .filter((t) => t.active)
      .sort((a, b) => a.display_order - b.display_order);
  }

  public async getAllTasks(): Promise<QuestTask[]> {
    await this.waitUntilReady();
    if (postgresService.isAvailable()) {
      return await postgresService.getAllTasks();
    }
    return [...this.memoryData.tasks].sort((a, b) => a.display_order - b.display_order);
  }

  public async getTaskById(id: string): Promise<QuestTask | null> {
    await this.waitUntilReady();
    if (postgresService.isAvailable()) {
      return await postgresService.getTaskById(id);
    }
    return this.memoryData.tasks.find((t) => t.id === id) || null;
  }

  public async createTask(
    data: Omit<QuestTask, 'id' | 'created_at' | 'updated_at' | 'display_order'> & {
      display_order?: number;
    },
    adminEmail?: string
  ): Promise<QuestTask> {
    await this.waitUntilReady();
    const all = await this.getAllTasks();
    const maxOrder = all.reduce((max, t) => Math.max(max, t.display_order), 0);
    const now = new Date().toISOString();

    const newTask: QuestTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: data.title.trim(),
      description: data.description.trim(),
      type: data.type || 'Custom',
      task_url: data.task_url?.trim() || '',
      proof_required: Boolean(data.proof_required),
      required: Boolean(data.required),
      active: data.active !== undefined ? Boolean(data.active) : true,
      display_order: data.display_order ?? maxOrder + 1,
      created_at: now,
      updated_at: now,
    };

    if (postgresService.isAvailable()) {
      await postgresService.saveTask(newTask);
    } else {
      this.memoryData.tasks.push(newTask);
    }

    await this.addAuditLog({
      admin_id: 'admin',
      admin_email: adminEmail || 'admin',
      action: `Created quest task "${newTask.title}"`,
      target_type: 'task',
      target_id: newTask.id,
      new_value: JSON.stringify(newTask),
    });

    return newTask;
  }

  public async updateTask(
    id: string,
    updates: Partial<QuestTask>,
    adminEmail?: string
  ): Promise<QuestTask | null> {
    await this.waitUntilReady();
    const existing = await this.getTaskById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updated: QuestTask = {
      ...existing,
      ...updates,
      id: existing.id,
      created_at: existing.created_at,
      updated_at: now,
    };

    if (postgresService.isAvailable()) {
      await postgresService.saveTask(updated);
    } else {
      const idx = this.memoryData.tasks.findIndex((t) => t.id === id);
      if (idx !== -1) this.memoryData.tasks[idx] = updated;
    }

    await this.addAuditLog({
      admin_id: 'admin',
      admin_email: adminEmail || 'admin',
      action: `Updated quest task "${updated.title}"`,
      target_type: 'task',
      target_id: updated.id,
      previous_value: JSON.stringify(existing),
      new_value: JSON.stringify(updated),
    });

    return updated;
  }

  public async deleteTask(id: string, adminEmail?: string): Promise<boolean> {
    await this.waitUntilReady();
    const existing = await this.getTaskById(id);
    if (!existing) return false;

    let success = false;
    if (postgresService.isAvailable()) {
      success = await postgresService.deleteTask(id);
    } else {
      const idx = this.memoryData.tasks.findIndex((t) => t.id === id);
      if (idx !== -1) {
        this.memoryData.tasks.splice(idx, 1);
        success = true;
      }
    }

    if (success) {
      await this.addAuditLog({
        admin_id: 'admin',
        admin_email: adminEmail || 'admin',
        action: `Deleted quest task "${existing.title}"`,
        target_type: 'task',
        target_id: id,
        previous_value: JSON.stringify(existing),
      });
    }

    return success;
  }

  public async toggleTaskActive(id: string, adminEmail?: string): Promise<QuestTask | null> {
    const task = await this.getTaskById(id);
    if (!task) return null;
    return this.updateTask(id, { active: !task.active }, adminEmail);
  }

  public async duplicateTask(id: string, adminEmail?: string): Promise<QuestTask | null> {
    const original = await this.getTaskById(id);
    if (!original) return null;

    return this.createTask(
      {
        title: `${original.title} (Copy)`,
        description: original.description,
        type: original.type,
        task_url: original.task_url,
        proof_required: original.proof_required,
        required: original.required,
        active: false,
      },
      adminEmail
    );
  }

  public async reorderTasks(taskIds: string[], adminEmail?: string): Promise<QuestTask[]> {
    await this.waitUntilReady();
    if (postgresService.isAvailable()) {
      await postgresService.reorderTasks(taskIds);
      return await postgresService.getAllTasks();
    }

    taskIds.forEach((id, index) => {
      const task = this.memoryData.tasks.find((t) => t.id === id);
      if (task) {
        task.display_order = index + 1;
        task.updated_at = new Date().toISOString();
      }
    });

    await this.addAuditLog({
      admin_id: 'admin',
      admin_email: adminEmail || 'admin',
      action: 'Reordered quest tasks',
      target_type: 'task',
      target_id: 'bulk',
    });

    return [...this.memoryData.tasks].sort((a, b) => a.display_order - b.display_order);
  }

  // --- APPLICANTS ---
  public async getApplicants(filters?: {
    search?: string;
    status?: string;
    reviewed?: string;
    completion?: string;
  }): Promise<Applicant[]> {
    await this.waitUntilReady();
    if (postgresService.isAvailable()) {
      return await postgresService.getApplicants(filters);
    }

    let applicants = this.memoryData.applicants.map((a) => {
      const tasks = this.memoryData.applicant_tasks.filter((t) => t.applicant_id === a.id);
      const activeTasks = this.memoryData.tasks.filter((t) => t.active);
      const completed = tasks.filter((t) => t.status !== 'Rejected').length;
      const rate = activeTasks.length > 0 ? Math.min(100, Math.round((completed / activeTasks.length) * 100)) : 100;
      return {
        ...a,
        tasks,
        completion_rate: rate,
        completed_tasks_count: completed,
        total_required_tasks_count: activeTasks.filter((t) => t.required).length,
      };
    });

    if (filters?.status && filters.status !== 'All') {
      applicants = applicants.filter((a) => a.status.toLowerCase() === filters.status?.toLowerCase());
    }
    if (filters?.reviewed) {
      if (filters.reviewed === 'Reviewed') applicants = applicants.filter((a) => a.reviewed_at !== null);
      if (filters.reviewed === 'Unreviewed') applicants = applicants.filter((a) => !a.reviewed_at);
    }
    if (filters?.completion) {
      if (filters.completion === '100%') applicants = applicants.filter((a) => (a.completion_rate || 0) === 100);
      if (filters.completion === '<100%') applicants = applicants.filter((a) => (a.completion_rate || 0) < 100);
    }
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      applicants = applicants.filter(
        (a) =>
          a.application_id.toLowerCase().includes(s) ||
          a.wallet_address.toLowerCase().includes(s) ||
          a.x_username.toLowerCase().includes(s)
      );
    }

    return applicants;
  }

  public async getApplicantById(idOrAppId: string): Promise<Applicant | null> {
    await this.waitUntilReady();
    if (postgresService.isAvailable()) {
      return await postgresService.getApplicantById(idOrAppId);
    }

    const applicant = this.memoryData.applicants.find(
      (a) => a.id === idOrAppId || a.application_id.toUpperCase() === idOrAppId.toUpperCase()
    );
    if (!applicant) return null;

    const tasks = this.memoryData.applicant_tasks.filter((t) => t.applicant_id === applicant.id);
    const activeTasks = this.memoryData.tasks.filter((t) => t.active);
    const completed = tasks.filter((t) => t.status !== 'Rejected').length;
    const rate = activeTasks.length > 0 ? Math.min(100, Math.round((completed / activeTasks.length) * 100)) : 100;

    return {
      ...applicant,
      tasks,
      completion_rate: rate,
      completed_tasks_count: completed,
      total_required_tasks_count: activeTasks.filter((t) => t.required).length,
    };
  }

  public async getApplicantByWallet(wallet: string): Promise<Applicant | null> {
    await this.waitUntilReady();
    if (postgresService.isAvailable()) {
      return await postgresService.getApplicantByWallet(wallet);
    }
    const a = this.memoryData.applicants.find(
      (app) => app.wallet_address.toLowerCase() === wallet.toLowerCase()
    );
    return a ? this.getApplicantById(a.id) : null;
  }

  public async getApplicantByUsername(xUsername: string): Promise<Applicant | null> {
    await this.waitUntilReady();
    if (postgresService.isAvailable()) {
      return await postgresService.getApplicantByUsername(xUsername);
    }
    const clean = xUsername.toLowerCase().replace('@', '');
    const a = this.memoryData.applicants.find(
      (app) => app.x_username.toLowerCase().replace('@', '') === clean
    );
    return a ? this.getApplicantById(a.id) : null;
  }

  public async createApplicant(data: {
    wallet_address: string;
    x_username: string;
    x_profile_url?: string;
    tasks: { task_id: string; proof_url?: string; completed: boolean }[];
  }): Promise<{ success: boolean; applicant?: Applicant; error?: string }> {
    await this.waitUntilReady();

    const cleanWallet = data.wallet_address.trim().toLowerCase();
    const cleanX = data.x_username.trim().replace(/^@/, '');

    // 1. Check duplicate wallet
    const existingWallet = await this.getApplicantByWallet(cleanWallet);
    if (existingWallet) {
      if (postgresService.isAvailable()) await postgresService.incrementDuplicateCounter();
      else this.memoryData.duplicate_count++;
      return {
        success: false,
        error: `This wallet address (${data.wallet_address.substring(0, 6)}...${data.wallet_address.substring(data.wallet_address.length - 4)}) has already submitted an application. Application ID: ${existingWallet.application_id}`,
      };
    }

    // 2. Check duplicate X username
    const existingX = await this.getApplicantByUsername(cleanX);
    if (existingX) {
      if (postgresService.isAvailable()) await postgresService.incrementDuplicateCounter();
      else this.memoryData.duplicate_count++;
      return {
        success: false,
        error: `The X/Twitter handle @${cleanX} is already associated with application ${existingX.application_id}. Each handle may only apply once.`,
      };
    }

    const newApplicantId = `app-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const applicationId = `ROB-${randomHex}`;
    const now = new Date().toISOString();

    const activeTasks = await this.getPublicTasks();
    const newTasks: ApplicantTaskRecord[] = (data.tasks || []).map((t) => {
      const taskDef = activeTasks.find((at) => at.id === t.task_id);
      return {
        id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        applicant_id: newApplicantId,
        task_id: t.task_id,
        task_title: taskDef ? taskDef.title : 'Custom Quest Task',
        task_type: taskDef ? taskDef.type : 'Custom',
        proof_url: t.proof_url || undefined,
        status: 'Completed' as TaskVerificationStatus,
        verified_at: null,
        created_at: now,
      };
    });

    const settings = await this.getSettings();
    const newApplicant: Applicant = {
      id: newApplicantId,
      application_id: applicationId,
      wallet_address: data.wallet_address.trim(),
      x_username: cleanX,
      x_profile_url: data.x_profile_url || `https://x.com/${cleanX}`,
      status: 'Pending',
      allocation: settings.early_access.default_allocation || '1 NFT',
      notes: undefined,
      created_at: now,
      updated_at: now,
      reviewed_at: null,
      tasks: newTasks,
      completion_rate: 100,
      completed_tasks_count: newTasks.length,
      total_required_tasks_count: activeTasks.filter((t) => t.required).length,
    };

    if (postgresService.isAvailable()) {
      await postgresService.saveApplicant(newApplicant, newTasks);
    } else {
      this.memoryData.applicants.unshift(newApplicant);
      this.memoryData.applicant_tasks.push(...newTasks);
    }

    await this.addAuditLog({
      admin_id: 'system',
      admin_email: 'system',
      action: `New early access application received from @${cleanX} (${applicationId})`,
      target_type: 'applicant',
      target_id: newApplicantId,
    });

    console.log(`✅ Applicant registered successfully: ${applicationId} (@${cleanX})`);
    return { success: true, applicant: newApplicant };
  }

  public async updateApplicantStatus(
    idOrAppId: string,
    status: ApplicantStatus,
    allocation?: string | null,
    notes?: string,
    adminEmail?: string
  ): Promise<Applicant | null> {
    await this.waitUntilReady();
    if (postgresService.isAvailable()) {
      const updated = await postgresService.updateApplicantStatus(idOrAppId, status, allocation, notes);
      if (updated) {
        await this.addAuditLog({
          admin_id: 'admin',
          admin_email: adminEmail || 'admin',
          action: `Changed status of applicant ${updated.application_id} to ${status}`,
          target_type: 'applicant',
          target_id: updated.id,
          new_value: JSON.stringify({ status, allocation, notes }),
        });
      }
      return updated;
    }

    const app = this.memoryData.applicants.find(
      (a) => a.id === idOrAppId || a.application_id.toUpperCase() === idOrAppId.toUpperCase()
    );
    if (!app) return null;

    app.status = status;
    if (allocation !== undefined) app.allocation = allocation;
    if (notes !== undefined) app.notes = notes;
    app.reviewed_at = new Date().toISOString();
    app.updated_at = new Date().toISOString();

    if (status === 'Approved') {
      this.memoryData.applicant_tasks
        .filter((t) => t.applicant_id === app.id && t.status !== 'Rejected')
        .forEach((t) => {
          t.status = 'Verified';
          t.verified_at = new Date().toISOString();
        });
    }

    await this.addAuditLog({
      admin_id: 'admin',
      admin_email: adminEmail || 'admin',
      action: `Changed status of applicant ${app.application_id} to ${status}`,
      target_type: 'applicant',
      target_id: app.id,
      new_value: JSON.stringify({ status, allocation, notes }),
    });

    return this.getApplicantById(app.id);
  }

  public async updateTaskVerification(
    applicantId: string,
    taskId: string,
    status: TaskVerificationStatus,
    adminEmail?: string
  ): Promise<ApplicantTaskRecord | null> {
    await this.waitUntilReady();
    if (postgresService.isAvailable()) {
      const rec = await postgresService.updateTaskVerification(applicantId, taskId, status);
      if (rec) {
        await this.addAuditLog({
          admin_id: 'admin',
          admin_email: adminEmail || 'admin',
          action: `Updated task verification "${rec.task_title}" to ${status}`,
          target_type: 'applicant',
          target_id: rec.id,
        });
      }
      return rec;
    }

    const rec = this.memoryData.applicant_tasks.find(
      (t) => t.applicant_id === applicantId && (t.task_id === taskId || t.id === taskId)
    );
    if (!rec) return null;

    rec.status = status;
    rec.verified_at = new Date().toISOString();

    await this.addAuditLog({
      admin_id: 'admin',
      admin_email: adminEmail || 'admin',
      action: `Updated task verification "${rec.task_title}" to ${status}`,
      target_type: 'applicant',
      target_id: rec.id,
    });

    return rec;
  }

  public async bulkUpdateApplicants(
    ids: string[],
    action: 'approve' | 'reject' | 'waitlist' | 'mark_reviewed',
    allocation?: string,
    adminEmail?: string
  ): Promise<number> {
    await this.waitUntilReady();
    if (postgresService.isAvailable()) {
      const count = await postgresService.bulkUpdateApplicants(ids, action, allocation);
      await this.addAuditLog({
        admin_id: 'admin',
        admin_email: adminEmail || 'admin',
        action: `Bulk action "${action}" executed on ${count} applicants`,
        target_type: 'applicant',
        target_id: 'bulk',
      });
      return count;
    }

    let affected = 0;
    const now = new Date().toISOString();

    for (const id of ids) {
      const app = this.memoryData.applicants.find(
        (a) => a.id === id || a.application_id.toUpperCase() === id.toUpperCase()
      );
      if (!app) continue;

      if (action === 'approve') {
        app.status = 'Approved';
        if (allocation) app.allocation = allocation;
        app.reviewed_at = now;
        this.memoryData.applicant_tasks
          .filter((t) => t.applicant_id === app.id && t.status !== 'Rejected')
          .forEach((t) => {
            t.status = 'Verified';
            t.verified_at = now;
          });
      } else if (action === 'reject') {
        app.status = 'Rejected';
        app.reviewed_at = now;
      } else if (action === 'waitlist') {
        app.status = 'Waitlisted';
        if (allocation) app.allocation = allocation;
        app.reviewed_at = now;
      } else if (action === 'mark_reviewed') {
        app.reviewed_at = now;
      }

      app.updated_at = now;
      affected++;
    }

    await this.addAuditLog({
      admin_id: 'admin',
      admin_email: adminEmail || 'admin',
      action: `Bulk action "${action}" executed on ${affected} applicants`,
      target_type: 'applicant',
      target_id: 'bulk',
    });

    return affected;
  }

  // --- STATS ---
  public async getStats(): Promise<DashboardStats> {
    await this.waitUntilReady();
    if (postgresService.isAvailable()) {
      return await postgresService.getStats();
    }

    const applicants = this.memoryData.applicants;
    const tasks = this.memoryData.tasks;
    const activeTasks = tasks.filter((t) => t.active);

    const taskStats = activeTasks.map((task) => {
      const completedCount = this.memoryData.applicant_tasks.filter(
        (at) => at.task_id === task.id && at.status !== 'Rejected'
      ).length;
      return {
        task_id: task.id,
        title: task.title,
        count: completedCount,
      };
    });

    const oneDayAgo = Date.now() - 86400000;
    const todaySubmissions = applicants.filter(
      (a) => new Date(a.created_at).getTime() >= oneDayAgo
    ).length;

    const approvedCount = applicants.filter((a) => a.status === 'Approved').length;
    const rejectedCount = applicants.filter((a) => a.status === 'Rejected').length;
    const waitlistedCount = applicants.filter((a) => a.status === 'Waitlisted').length;

    return {
      total_applicants: applicants.length,
      pending: applicants.filter((a) => a.status === 'Pending').length,
      approved: approvedCount,
      rejected: rejectedCount,
      under_review: applicants.filter((a) => a.status === 'Under Review').length,
      waitlisted: waitlistedCount,
      todays_applications: todaySubmissions,
      completed_applications: approvedCount + rejectedCount + waitlistedCount,
      duplicate_attempts: this.memoryData.duplicate_count,
      daily_trends: [
        {
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count: todaySubmissions,
          approved: approvedCount,
        },
      ],
      task_completion_stats: taskStats,
    };
  }

  // --- AUDIT LOGS ---
  public async addAuditLog(
    entry: Omit<AuditLogEntry, 'id' | 'created_at'>
  ): Promise<AuditLogEntry> {
    const newEntry: AuditLogEntry = {
      ...entry,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString(),
    };

    if (postgresService.isAvailable()) {
      await postgresService.saveAuditLog(newEntry);
    } else {
      this.memoryData.audit_logs.unshift(newEntry);
      if (this.memoryData.audit_logs.length > 500) {
        this.memoryData.audit_logs.pop();
      }
    }

    return newEntry;
  }

  public async getAuditLogs(limit: number = 100): Promise<AuditLogEntry[]> {
    await this.waitUntilReady();
    if (postgresService.isAvailable()) {
      return await postgresService.getAuditLogs(limit);
    }
    return this.memoryData.audit_logs.slice(0, limit);
  }

  // --- AUTH / ADMINS ---
  public async authenticateAdmin(
    emailOrUsername: string,
    pass: string
  ): Promise<{ token: string; admin: AdminUser } | null> {
    await this.waitUntilReady();
    const cleanInput = emailOrUsername.toLowerCase().trim();
    const cleanPass = pass.trim();

    // 1. Check environment variables
    const envUser = (
      process.env.ADMIN_USERNAME ||
      process.env.ADMIN_USER ||
      process.env.ADMIN_EMAIL ||
      'admin'
    )
      .trim()
      .toLowerCase();
    const envPass = (process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS || 'admin').trim();

    const matchesEnv =
      cleanInput === envUser ||
      cleanInput === envUser.replace('@', '') ||
      (envUser.includes('@') && cleanInput === envUser.split('@')[0]) ||
      (!cleanInput.includes('@') && `${cleanInput}@robinos.xyz` === envUser);

    if (matchesEnv && cleanPass === envPass) {
      const admin: AdminUser = {
        id: `admin-${envUser.replace(/[^a-zA-Z0-9]/g, '_')}`,
        email: envUser.includes('@') ? envUser : `${envUser}@robinos.xyz`,
        role: 'superadmin',
        created_at: new Date().toISOString(),
      };

      const token = signStatelessToken(admin);

      if (postgresService.isAvailable()) {
        await postgresService.saveAdminSession(admin.id, token);
      } else {
        let memAdmin = this.memoryData.admins.find((a) => a.id === admin.id);
        if (!memAdmin) {
          memAdmin = {
            ...admin,
            password_hash: hashPassword(cleanPass),
            session_tokens: [],
          };
          this.memoryData.admins.push(memAdmin);
        }
        memAdmin.session_tokens.push(token);
      }

      await this.addAuditLog({
        admin_id: admin.id,
        admin_email: admin.email,
        action: 'Admin logged in successfully',
        target_type: 'auth',
        target_id: admin.id,
      });

      return { token, admin };
    }

    // 2. Check stored database admins
    if (postgresService.isAvailable()) {
      const admin = await postgresService.authenticateAdmin(cleanInput, cleanPass);
      if (admin) {
        const token = signStatelessToken(admin);
        await postgresService.saveAdminSession(admin.id, token);
        await this.addAuditLog({
          admin_id: admin.id,
          admin_email: admin.email,
          action: 'Admin logged in successfully',
          target_type: 'auth',
          target_id: admin.id,
        });
        return { token, admin };
      }
    } else {
      const hash = hashPassword(cleanPass);
      const admin = this.memoryData.admins.find((a) => {
        const emailLower = a.email.toLowerCase().trim();
        const usernameLower = emailLower.split('@')[0];
        return (
          (emailLower === cleanInput || usernameLower === cleanInput) &&
          a.password_hash === hash
        );
      });

      if (admin) {
        const token = `token-${crypto.randomBytes(24).toString('hex')}`;
        admin.session_tokens.push(token);
        await this.addAuditLog({
          admin_id: admin.id,
          admin_email: admin.email,
          action: 'Admin logged in successfully',
          target_type: 'auth',
          target_id: admin.id,
        });
        return {
          token,
          admin: {
            id: admin.id,
            email: admin.email,
            role: admin.role,
            created_at: admin.created_at,
          },
        };
      }
    }

    return null;
  }

  public async verifySession(token: string): Promise<AdminUser | null> {
    if (!token) return null;

    const stateless = verifyStatelessToken(token);
    if (stateless) return stateless;

    await this.waitUntilReady();

    if (postgresService.isAvailable()) {
      const dbAdmin = await postgresService.getAdminByToken(token);
      if (dbAdmin) return dbAdmin;
    }

    const memAdmin = this.memoryData.admins.find((a) => a.session_tokens.includes(token));
    if (memAdmin) {
      return {
        id: memAdmin.id,
        email: memAdmin.email,
        role: memAdmin.role,
        created_at: memAdmin.created_at,
      };
    }

    return null;
  }

  public async logoutSession(token: string): Promise<void> {
    if (!token) return;
    await this.waitUntilReady();

    if (postgresService.isAvailable()) {
      await postgresService.removeAdminToken(token);
    }

    this.memoryData.admins.forEach((a) => {
      a.session_tokens = a.session_tokens.filter((t) => t !== token);
    });
  }
}

export const db = new Database();
