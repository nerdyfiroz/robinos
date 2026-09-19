import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { postgresService } from './postgres.js';
import type {
  QuestTask,
  Applicant,
  ApplicantTaskRecord,
  AuditLogEntry,
  PlatformSettings,
  AdminUser,
  DashboardStats,
  TaskType,
} from '../src/types.js';

interface DatabaseSchema {
  tasks: QuestTask[];
  applicants: Applicant[];
  applicant_tasks: ApplicantTaskRecord[];
  admins: (AdminUser & { password_hash: string; session_tokens: string[] })[];
  audit_logs: AuditLogEntry[];
  settings: PlatformSettings;
  duplicate_attempts: number;
}

const IS_VERCEL = Boolean(process.env.VERCEL);
const DATA_DIR = IS_VERCEL
  ? path.join('/tmp', 'robinos_data')
  : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'robinos_db.json');
const BUNDLED_DB_FILE = path.join(process.cwd(), 'data', 'robinos_db.json');

// Default initial settings
const DEFAULT_SETTINGS: PlatformSettings = {
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
    min_tasks_required: 3,
  },
};

// Seed tasks
const SEED_TASKS: QuestTask[] = [
  {
    id: 'task-1',
    title: 'FOLLOW @RobinosNFT AND @RobinhoodApp',
    description: 'Follow our official handles on X to stay updated on drops and announcements.',
    type: 'Follow',
    task_url: 'https://x.com/RobinosNFT',
    proof_required: false,
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

// Simple SHA-256 for administrator credentials configured through the environment.
function hashPassword(pass: string): string {
  return crypto.createHash('sha256').update(pass).digest('hex');
}

// Starter applicants
function generateInitialApplicants(): { applicants: Applicant[]; applicant_tasks: ApplicantTaskRecord[] } {
  const applicants: Applicant[] = [
    {
      id: 'app-1',
      application_id: 'RB-184729',
      wallet_address: '0x71C83921B135334208aAb0a249A2d2f7f7229342',
      x_username: '@crypto_knight',
      x_profile_url: 'https://x.com/crypto_knight',
      status: 'Approved',
      allocation: '2 NFTs',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      reviewed_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
    {
      id: 'app-2',
      application_id: 'RB-902144',
      wallet_address: '0x94A02dEfB9213192083B10283CDe901B93220194',
      x_username: '@degen_vibes',
      x_profile_url: 'https://x.com/degen_vibes',
      status: 'Under Review',
      allocation: null,
      created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      reviewed_at: null,
    },
    {
      id: 'app-3',
      application_id: 'RB-339102',
      wallet_address: '0x1F2B4C5D6E7F8091A2B3C4D5E6F708192A3B4C5D',
      x_username: '@onchain_alpha',
      x_profile_url: 'https://x.com/onchain_alpha',
      status: 'Pending',
      allocation: null,
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      reviewed_at: null,
    },
    {
      id: 'app-4',
      application_id: 'RB-482015',
      wallet_address: '0x3B99C88D22E1A7F0182C3D4E5A6B7C8D9E0F1A2B',
      x_username: '@pixel_samurai',
      x_profile_url: 'https://x.com/pixel_samurai',
      status: 'Waitlisted',
      allocation: '1 NFT',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 1).toISOString(),
      reviewed_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    },
    {
      id: 'app-5',
      application_id: 'RB-771923',
      wallet_address: '0x000000000000000000000000000000000000dEaD',
      x_username: '@bot_farmer',
      x_profile_url: 'https://x.com/bot_farmer',
      status: 'Rejected',
      allocation: null,
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      reviewed_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
  ];

  const applicant_tasks: ApplicantTaskRecord[] = [];
  applicants.forEach((app, idx) => {
    SEED_TASKS.forEach((task) => {
      let status: 'Completed' | 'Verified' | 'Rejected' | 'Needs Review' = 'Completed';
      if (app.status === 'Approved') status = 'Verified';
      if (app.status === 'Rejected') status = 'Rejected';
      if (app.status === 'Under Review') status = task.proof_required ? 'Needs Review' : 'Verified';

      applicant_tasks.push({
        id: `at-${app.id}-${task.id}`,
        applicant_id: app.id,
        task_id: task.id,
        task_title: task.title,
        task_type: task.type,
        proof_url: task.proof_required ? `https://x.com/${app.x_username.replace('@', '')}/status/18385710000${idx}` : undefined,
        status,
        verified_at: app.reviewed_at,
        created_at: app.created_at,
      });
    });
  });

  return { applicants, applicant_tasks };
}

// Initial audit logs
const SEED_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'log-1',
    admin_id: 'admin-1',
    admin_email: 'admin@robinos.xyz',
    action: 'System initialized and quests published',
    target_type: 'system',
    target_id: 'system',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'log-2',
    admin_id: 'admin-1',
    admin_email: 'admin@robinos.xyz',
    action: 'Approved applicant RB-184729 with 2 NFTs allocation',
    target_type: 'applicant',
    target_id: 'RB-184729',
    previous_value: 'Pending',
    new_value: 'Approved (2 NFTs)',
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'log-3',
    admin_id: 'admin-1',
    admin_email: 'admin@robinos.xyz',
    action: 'Rejected applicant RB-771923 (Invalid dead address / bot activity)',
    target_type: 'applicant',
    target_id: 'RB-771923',
    previous_value: 'Pending',
    new_value: 'Rejected',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

class Database {
  private data: DatabaseSchema;
  private readonly initialization: Promise<void>;
  private readonly pendingPersistence = new Set<Promise<void>>();

  constructor() {
    this.ensureDataDir();
    this.data = this.loadDatabase();
    this.initialization = this.initPostgres();
  }

  public async waitUntilReady(): Promise<void> {
    await this.initialization;
  }

  private trackPersistence(operation: Promise<unknown>) {
    const tracked = operation.then(
      () => undefined,
      (err) => {
        console.error('Persistence operation failed:', err);
      }
    );
    this.pendingPersistence.add(tracked);
    void tracked.finally(() => this.pendingPersistence.delete(tracked));
  }

  public async flushPersistence(): Promise<void> {
    await Promise.all([...this.pendingPersistence]);
  }

  private async initPostgres() {
    try {
      const isConnected = await postgresService.initDatabase({
        tasks: this.data.tasks,
        settings: this.data.settings,
        applicants: this.data.applicants,
        applicant_tasks: this.data.applicant_tasks,
        admins: this.data.admins,
        audit_logs: this.data.audit_logs,
      });

      if (isConnected) {
        const pgData = await postgresService.loadAllData();
        if (pgData) {
          if (pgData.settings) this.data.settings = pgData.settings;
          if (pgData.tasks && pgData.tasks.length > 0) this.data.tasks = pgData.tasks;
          if (pgData.applicants && pgData.applicants.length > 0) this.data.applicants = pgData.applicants;
          if (pgData.applicant_tasks && pgData.applicant_tasks.length > 0) this.data.applicant_tasks = pgData.applicant_tasks;
          if (pgData.admins && pgData.admins.length > 0) this.data.admins = pgData.admins;
          if (pgData.audit_logs && pgData.audit_logs.length > 0) this.data.audit_logs = pgData.audit_logs;
          if (pgData.duplicate_attempts !== undefined) this.data.duplicate_attempts = pgData.duplicate_attempts;
          console.log('⚡ Neon PostgreSQL data successfully loaded into memory.');
          this.save();
        }
      }
    } catch (err) {
      console.error('Neon PostgreSQL background initialization error:', err);
    }
  }

  private ensureDataDir() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch (err) {
      console.warn('Notice: Local directory creation skipped in serverless environment:', err);
    }
  }

  private loadDatabase(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      } catch (err) {
        console.error('Failed to parse database file, checking bundled fallback...', err);
      }
    }

    if (IS_VERCEL && fs.existsSync(BUNDLED_DB_FILE)) {
      try {
        const raw = fs.readFileSync(BUNDLED_DB_FILE, 'utf-8');
        return JSON.parse(raw);
      } catch (err) {
        console.error('Failed to parse bundled database file...', err);
      }
    }

    const { applicants, applicant_tasks } = generateInitialApplicants();
    const initial: DatabaseSchema = {
      tasks: SEED_TASKS,
      applicants,
      applicant_tasks,
      admins: [],
      audit_logs: SEED_AUDIT_LOGS,
      settings: DEFAULT_SETTINGS,
      duplicate_attempts: 3,
    };

    this.save(initial);
    return initial;
  }

  private save(dataToSave?: DatabaseSchema) {
    try {
      this.ensureDataDir();
      const payload = dataToSave || this.data;
      fs.writeFileSync(DB_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (err) {
      // Safe non-fatal notice in serverless environment (Neon Postgres handles persistent cloud storage)
      console.warn('Notice: Local disk persistence skipped:', err);
    }
  }

  // --- SETTINGS ---
  public getSettings(): PlatformSettings {
    return this.data.settings;
  }

  public updateSettings(partialSettings: Partial<PlatformSettings>, adminEmail: string = 'admin'): PlatformSettings {
    const prev = JSON.stringify(this.data.settings);
    this.data.settings = {
      ...this.data.settings,
      ...partialSettings,
      collection: { ...this.data.settings.collection, ...(partialSettings.collection || {}) },
      early_access: { ...this.data.settings.early_access, ...(partialSettings.early_access || {}) },
      quests: { ...this.data.settings.quests, ...(partialSettings.quests || {}) },
    };

    this.addAuditLog({
      admin_id: 'admin-1',
      admin_email: adminEmail,
      action: 'Updated platform settings',
      target_type: 'settings',
      target_id: 'settings',
      previous_value: prev.substring(0, 100),
      new_value: JSON.stringify(this.data.settings).substring(0, 100),
    });

    this.save();
    if (postgresService.isAvailable()) {
      this.trackPersistence(postgresService.saveSettings(this.data.settings));
    }
    return this.data.settings;
  }

  // --- TASKS ---
  public getPublicTasks(): QuestTask[] {
    return this.data.tasks
      .filter((t) => t.active)
      .sort((a, b) => a.display_order - b.display_order);
  }

  public getAllTasks(): QuestTask[] {
    return [...this.data.tasks].sort((a, b) => a.display_order - b.display_order);
  }

  public createTask(
    taskData: Omit<QuestTask, 'id' | 'created_at' | 'updated_at'>,
    adminEmail: string
  ): QuestTask {
    const newTask: QuestTask = {
      ...taskData,
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.data.tasks.push(newTask);
    this.addAuditLog({
      admin_id: 'admin-1',
      admin_email: adminEmail,
      action: `Created quest "${newTask.title}" (Type: ${newTask.type})`,
      target_type: 'task',
      target_id: newTask.id,
      new_value: newTask.title,
    });

    this.save();
    if (postgresService.isAvailable()) {
      this.trackPersistence(postgresService.saveTask(newTask));
    }
    return newTask;
  }

  public updateTask(
    id: string,
    updates: Partial<QuestTask>,
    adminEmail: string
  ): QuestTask | null {
    const idx = this.data.tasks.findIndex((t) => t.id === id);
    if (idx === -1) return null;

    const oldTask = this.data.tasks[idx];
    const updated: QuestTask = {
      ...oldTask,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.data.tasks[idx] = updated;

    this.addAuditLog({
      admin_id: 'admin-1',
      admin_email: adminEmail,
      action: `Updated quest "${updated.title}"`,
      target_type: 'task',
      target_id: id,
      previous_value: JSON.stringify({ title: oldTask.title, active: oldTask.active, url: oldTask.task_url }),
      new_value: JSON.stringify({ title: updated.title, active: updated.active, url: updated.task_url }),
    });

    this.save();
    if (postgresService.isAvailable()) {
      this.trackPersistence(postgresService.saveTask(updated));
    }
    return updated;
  }

  public deleteTask(id: string, adminEmail: string): boolean {
    const idx = this.data.tasks.findIndex((t) => t.id === id);
    if (idx === -1) return false;

    const [deleted] = this.data.tasks.splice(idx, 1);

    this.addAuditLog({
      admin_id: 'admin-1',
      admin_email: adminEmail,
      action: `Deleted quest "${deleted.title}"`,
      target_type: 'task',
      target_id: id,
      previous_value: deleted.title,
    });

    this.save();
    if (postgresService.isAvailable()) {
      this.trackPersistence(postgresService.deleteTask(id));
    }
    return true;
  }

  public duplicateTask(id: string, adminEmail: string): QuestTask | null {
    const task = this.data.tasks.find((t) => t.id === id);
    if (!task) return null;

    const maxOrder = this.data.tasks.reduce((max, t) => Math.max(max, t.display_order), 0);
    const duplicated: QuestTask = {
      ...task,
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: `${task.title} (Copy)`,
      display_order: maxOrder + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.data.tasks.push(duplicated);

    this.addAuditLog({
      admin_id: 'admin-1',
      admin_email: adminEmail,
      action: `Duplicated quest "${task.title}" to "${duplicated.title}"`,
      target_type: 'task',
      target_id: duplicated.id,
      new_value: duplicated.title,
    });

    this.save();
    if (postgresService.isAvailable()) {
      this.trackPersistence(postgresService.saveTask(duplicated));
    }
    return duplicated;
  }

  public reorderTasks(taskIds: string[], adminEmail: string): QuestTask[] {
    taskIds.forEach((id, index) => {
      const task = this.data.tasks.find((t) => t.id === id);
      if (task) {
        task.display_order = index + 1;
        task.updated_at = new Date().toISOString();
        if (postgresService.isAvailable()) {
          this.trackPersistence(postgresService.saveTask(task));
        }
      }
    });

    this.addAuditLog({
      admin_id: 'admin-1',
      admin_email: adminEmail,
      action: `Reordered quests display sequence (${taskIds.length} tasks)`,
      target_type: 'task',
      target_id: 'batch',
      new_value: taskIds.join(', '),
    });

    this.save();
    return this.getAllTasks();
  }

  // --- APPLICANTS ---
  public getApplicants(filters?: {
    search?: string;
    status?: string;
    reviewed?: string;
    completion?: string;
  }): Applicant[] {
    let result = [...this.data.applicants];

    // Attach tasks and completion rate to each applicant
    result = result.map((app) => {
      const appTasks = this.data.applicant_tasks.filter((at) => at.applicant_id === app.id);
      const activeTasks = this.data.tasks.filter((t) => t.active);
      const totalReq = activeTasks.filter((t) => t.required).length || 1;
      const completedCount = appTasks.filter((at) => at.status !== 'Rejected').length;
      const completionRate = Math.min(100, Math.round((completedCount / (activeTasks.length || 1)) * 100));

      return {
        ...app,
        tasks: appTasks,
        completion_rate: completionRate,
        completed_tasks_count: completedCount,
        total_required_tasks_count: totalReq,
      };
    });

    if (filters?.status && filters.status !== 'All') {
      result = result.filter((a) => a.status.toLowerCase() === filters.status?.toLowerCase());
    }

    if (filters?.reviewed) {
      if (filters.reviewed === 'Reviewed') {
        result = result.filter((a) => a.reviewed_at !== null && a.reviewed_at !== undefined);
      } else if (filters.reviewed === 'Unreviewed') {
        result = result.filter((a) => !a.reviewed_at);
      }
    }

    if (filters?.completion) {
      if (filters.completion === '100%') {
        result = result.filter((a) => (a.completion_rate || 0) === 100);
      } else if (filters.completion === '<100%') {
        result = result.filter((a) => (a.completion_rate || 0) < 100);
      }
    }

    if (filters?.search) {
      const s = filters.search.toLowerCase().trim();
      result = result.filter(
        (a) =>
          a.application_id.toLowerCase().includes(s) ||
          a.wallet_address.toLowerCase().includes(s) ||
          a.x_username.toLowerCase().includes(s)
      );
    }

    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getApplicantById(idOrAppId: string): Applicant | null {
    const app = this.data.applicants.find(
      (a) => a.id === idOrAppId || a.application_id.toUpperCase() === idOrAppId.toUpperCase()
    );
    if (!app) return null;

    const tasks = this.data.applicant_tasks.filter((at) => at.applicant_id === app.id);
    const activeTasks = this.data.tasks.filter((t) => t.active);
    const completedCount = tasks.filter((at) => at.status !== 'Rejected').length;
    const completionRate = Math.min(100, Math.round((completedCount / (activeTasks.length || 1)) * 100));

    return {
      ...app,
      tasks,
      completion_rate: completionRate,
      completed_tasks_count: completedCount,
      total_required_tasks_count: activeTasks.filter((t) => t.required).length,
    };
  }

  public getApplicantByWallet(wallet: string): Applicant | null {
    const cleanWallet = wallet.toLowerCase().trim();
    const app = this.data.applicants.find(
      (a) => a.wallet_address.toLowerCase() === cleanWallet
    );
    if (!app) return null;
    return this.getApplicantById(app.id);
  }

  public createApplicant(payload: {
    wallet_address: string;
    x_username: string;
    x_profile_url?: string;
    tasks: { task_id: string; proof_url?: string; completed: boolean }[];
  }): { applicant: Applicant; isDuplicate: boolean } {
    const cleanWallet = payload.wallet_address.trim().toLowerCase();
    const cleanX = payload.x_username.trim().startsWith('@')
      ? payload.x_username.trim()
      : `@${payload.x_username.trim()}`;

    // Check duplicate
    const existing = this.data.applicants.find(
      (a) =>
        a.wallet_address.toLowerCase() === cleanWallet ||
        a.x_username.toLowerCase() === cleanX.toLowerCase()
    );

    if (existing) {
      this.data.duplicate_attempts += 1;
      this.save();
      return {
        applicant: this.getApplicantById(existing.id)!,
        isDuplicate: true,
      };
    }

    // Generate unique Application ID: RB-XXXXXX
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const applicationId = `RB-${randomNum}`;

    const newApplicantId = `app-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newApplicant: Applicant = {
      id: newApplicantId,
      application_id: applicationId,
      wallet_address: payload.wallet_address.trim(),
      x_username: cleanX,
      x_profile_url:
        payload.x_profile_url?.trim() || `https://x.com/${cleanX.replace('@', '')}`,
      status: 'Pending',
      allocation: null,
      created_at: now,
      updated_at: now,
      reviewed_at: null,
    };

    this.data.applicants.push(newApplicant);

    // Save applicant task records
    payload.tasks.forEach((t) => {
      const origTask = this.data.tasks.find((task) => task.id === t.task_id);
      this.data.applicant_tasks.push({
        id: `at-${newApplicantId}-${t.task_id}`,
        applicant_id: newApplicantId,
        task_id: t.task_id,
        task_title: origTask ? origTask.title : 'Task',
        task_type: origTask ? origTask.type : 'Custom',
        proof_url: t.proof_url || undefined,
        status: 'Completed',
        verified_at: null,
        created_at: now,
      });
    });

    this.addAuditLog({
      admin_id: 'system',
      admin_email: 'public_portal',
      action: `New application submitted: ${applicationId} (${cleanX})`,
      target_type: 'applicant',
      target_id: applicationId,
      new_value: `Wallet: ${payload.wallet_address.substring(0, 8)}...`,
    });

    this.save();
    if (postgresService.isAvailable()) {
      const savedApplicant = this.data.applicants.find((a) => a.id === newApplicantId);
      const savedTasks = this.data.applicant_tasks.filter((t) => t.applicant_id === newApplicantId);
      if (savedApplicant) {
        postgresService.saveApplicant(savedApplicant, savedTasks).catch(console.error);
      }
    }

    return {
      applicant: this.getApplicantById(newApplicantId)!,
      isDuplicate: false,
    };
  }

  public updateApplicantStatus(
    idOrAppId: string,
    status: Applicant['status'],
    allocation?: string | null,
    notes?: string,
    adminEmail: string = 'admin'
  ): Applicant | null {
    const app = this.data.applicants.find(
      (a) => a.id === idOrAppId || a.application_id.toUpperCase() === idOrAppId.toUpperCase()
    );
    if (!app) return null;

    const prevStatus = app.status;
    const prevAlloc = app.allocation;

    app.status = status;
    if (allocation !== undefined) {
      app.allocation = allocation;
    }
    if (notes !== undefined) {
      app.notes = notes;
    }
    app.reviewed_at = new Date().toISOString();
    app.updated_at = new Date().toISOString();

    // If approved or rejected, update task statuses as appropriate
    if (status === 'Approved') {
      this.data.applicant_tasks
        .filter((at) => at.applicant_id === app.id)
        .forEach((at) => {
          if (at.status !== 'Rejected') {
            at.status = 'Verified';
            at.verified_at = new Date().toISOString();
          }
        });
    }

    this.addAuditLog({
      admin_id: 'admin-1',
      admin_email: adminEmail,
      action: `Updated ${app.application_id} to ${status}${allocation ? ` (Allocation: ${allocation})` : ''}`,
      target_type: 'applicant',
      target_id: app.application_id,
      previous_value: `${prevStatus} (Alloc: ${prevAlloc || 'none'})`,
      new_value: `${status} (Alloc: ${allocation || prevAlloc || 'none'})`,
    });

    this.save();
    if (postgresService.isAvailable()) {
      const updatedApplicant = this.data.applicants.find((a) => a.id === app.id);
      const appTasks = this.data.applicant_tasks.filter((at) => at.applicant_id === app.id);
      if (updatedApplicant) {
        postgresService.saveApplicant(updatedApplicant, appTasks).catch(console.error);
      }
    }
    return this.getApplicantById(app.id);
  }

  public updateTaskVerification(
    applicantId: string,
    taskId: string,
    newStatus: 'Verified' | 'Rejected' | 'Needs Review',
    adminEmail: string = 'admin'
  ): ApplicantTaskRecord | null {
    const rec = this.data.applicant_tasks.find(
      (at) => at.applicant_id === applicantId && (at.task_id === taskId || at.id === taskId)
    );
    if (!rec) return null;

    const prevStatus = rec.status;
    rec.status = newStatus;
    rec.verified_at = new Date().toISOString();

    this.addAuditLog({
      admin_id: 'admin-1',
      admin_email: adminEmail,
      action: `Verified task "${rec.task_title || taskId}" for applicant`,
      target_type: 'applicant',
      target_id: applicantId,
      previous_value: prevStatus,
      new_value: newStatus,
    });

    this.save();
    if (postgresService.isAvailable()) {
      const app = this.data.applicants.find((a) => a.id === applicantId);
      const appTasks = this.data.applicant_tasks.filter((at) => at.applicant_id === applicantId);
      if (app) {
        postgresService.saveApplicant(app, appTasks).catch(console.error);
      }
    }
    return rec;
  }

  public bulkUpdateApplicants(
    ids: string[],
    action: 'approve' | 'reject' | 'waitlist' | 'mark_reviewed',
    allocation?: string,
    adminEmail: string = 'admin'
  ): number {
    let count = 0;
    ids.forEach((id) => {
      const app = this.data.applicants.find(
        (a) => a.id === id || a.application_id.toUpperCase() === id.toUpperCase()
      );
      if (!app) return;

      const prev = app.status;
      if (action === 'approve') {
        app.status = 'Approved';
        if (allocation) app.allocation = allocation;
        app.reviewed_at = new Date().toISOString();
      } else if (action === 'reject') {
        app.status = 'Rejected';
        app.reviewed_at = new Date().toISOString();
      } else if (action === 'waitlist') {
        app.status = 'Waitlisted';
        if (allocation) app.allocation = allocation;
        app.reviewed_at = new Date().toISOString();
      } else if (action === 'mark_reviewed') {
        if (app.status === 'Pending') app.status = 'Under Review';
        app.reviewed_at = new Date().toISOString();
      }

      app.updated_at = new Date().toISOString();
      count++;
    });

    this.addAuditLog({
      admin_id: 'admin-1',
      admin_email: adminEmail,
      action: `Bulk ${action} executed on ${count} applicants`,
      target_type: 'applicant',
      target_id: `batch-${count}`,
      new_value: action,
    });

    this.save();
    return count;
  }

  // --- STATS ---
  public getStats(): DashboardStats {
    const applicants = this.getApplicants();
    const today = new Date().toISOString().split('T')[0];

    const total = applicants.length;
    const pending = applicants.filter((a) => a.status === 'Pending').length;
    const approved = applicants.filter((a) => a.status === 'Approved').length;
    const rejected = applicants.filter((a) => a.status === 'Rejected').length;
    const under_review = applicants.filter((a) => a.status === 'Under Review').length;
    const waitlisted = applicants.filter((a) => a.status === 'Waitlisted').length;

    const todays_applications = applicants.filter(
      (a) => a.created_at.startsWith(today)
    ).length;

    const completed_applications = applicants.filter(
      (a) => (a.completion_rate || 0) === 100
    ).length;

    // Daily trends (last 7 days)
    const trends: { [date: string]: { count: number; approved: number } } = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      trends[d] = { count: 0, approved: 0 };
    }

    applicants.forEach((a) => {
      const d = a.created_at.split('T')[0];
      if (trends[d]) {
        trends[d].count += 1;
        if (a.status === 'Approved') {
          trends[d].approved += 1;
        }
      }
    });

    const daily_trends = Object.keys(trends).map((date) => ({
      date: date.substring(5), // MM-DD
      count: trends[date].count,
      approved: trends[date].approved,
    }));

    // Task completion counts
    const task_completion_stats = this.data.tasks.map((task) => {
      const count = this.data.applicant_tasks.filter(
        (at) => at.task_id === task.id && at.status !== 'Rejected'
      ).length;
      return {
        task_id: task.id,
        title: task.title,
        count,
      };
    });

    return {
      total_applicants: total,
      pending,
      approved,
      rejected,
      under_review,
      waitlisted,
      todays_applications,
      completed_applications,
      duplicate_attempts: this.data.duplicate_attempts,
      daily_trends,
      task_completion_stats,
    };
  }

  // --- AUDIT LOGS ---
  public addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'created_at'>): AuditLogEntry {
    const newEntry: AuditLogEntry = {
      ...entry,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString(),
    };
    this.data.audit_logs.unshift(newEntry);
    if (this.data.audit_logs.length > 500) {
      this.data.audit_logs.pop();
    }
    if (postgresService.isAvailable()) {
      this.trackPersistence(postgresService.saveAuditLog(newEntry));
    }
    return newEntry;
  }

  public getAuditLogs(limit: number = 100): AuditLogEntry[] {
    return this.data.audit_logs.slice(0, limit);
  }

  // --- AUTH / ADMINS ---
  public authenticateAdmin(emailOrUsername: string, pass: string): { token: string; admin: AdminUser } | null {
    const cleanInput = emailOrUsername.toLowerCase().trim();
    const cleanPass = pass.trim();

    // 1. Check dynamic credentials provided via Vercel / environment variables
    const envUser = (process.env.ADMIN_USERNAME || process.env.ADMIN_USER || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const envPass = (process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS || '').trim();

    if (envUser && envPass) {
      const matchesEnv = (
        cleanInput === envUser ||
        cleanInput === envUser.replace('@', '') ||
        (envUser.includes('@') && cleanInput === envUser.split('@')[0]) ||
        (!cleanInput.includes('@') && `${cleanInput}@robinos.xyz` === envUser)
      );

      if (matchesEnv && cleanPass === envPass) {
        let admin = this.data.admins.find(
          (a) => a.email.toLowerCase() === envUser || a.email.toLowerCase().split('@')[0] === envUser
        );

        if (!admin) {
          admin = {
            id: `admin-env-${envUser.replace(/[^a-zA-Z0-9]/g, '_')}`,
            email: envUser.includes('@') ? envUser : `${envUser}@robinos.xyz`,
            role: 'superadmin',
            created_at: new Date().toISOString(),
            password_hash: hashPassword(cleanPass),
            session_tokens: [],
          };
          this.data.admins.push(admin);
        }

        const token = `token-${crypto.randomBytes(24).toString('hex')}`;
        admin.session_tokens.push(token);

        this.addAuditLog({
          admin_id: admin.id,
          admin_email: admin.email,
          action: `Admin logged in successfully via Vercel environment credentials (${envUser})`,
          target_type: 'auth',
          target_id: admin.id,
        });

        this.save();
        if (postgresService.isAvailable()) {
          postgresService.saveAdminSession(admin.id, admin.session_tokens).catch(console.error);
        }

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

    // 2. Check stored database admins
    const hash = hashPassword(cleanPass);
    const admin = this.data.admins.find((a) => {
      const emailLower = a.email.toLowerCase().trim();
      const usernameLower = emailLower.split('@')[0];
      return (emailLower === cleanInput || usernameLower === cleanInput) && a.password_hash === hash;
    });

    if (!admin) return null;

    const token = `token-${crypto.randomBytes(24).toString('hex')}`;
    admin.session_tokens.push(token);

    this.addAuditLog({
      admin_id: admin.id,
      admin_email: admin.email,
      action: 'Admin logged in successfully',
      target_type: 'auth',
      target_id: admin.id,
    });

    this.save();
    if (postgresService.isAvailable()) {
      postgresService.saveAdminSession(admin.id, admin.session_tokens).catch(console.error);
    }

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

  public verifySession(token: string): AdminUser | null {
    if (!token) return null;
    const admin = this.data.admins.find((a) => a.session_tokens.includes(token));
    if (!admin) return null;
    return {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      created_at: admin.created_at,
    };
  }

  public logoutSession(token: string) {
    this.data.admins.forEach((a) => {
      a.session_tokens = a.session_tokens.filter((t) => t !== token);
    });
    this.save();
    if (postgresService.isAvailable()) {
      this.data.admins.forEach((a) => {
        postgresService.saveAdminSession(a.id, a.session_tokens).catch(console.error);
      });
    }
  }
}

export const db = new Database();
