import crypto from 'crypto';
import { getDatabase } from './mongodb';
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
} from '../types';

// --- Stateless admin session tokens ---------------------------------------
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.ADMIN_PASSWORD ||
  process.env.ADMIN_PASS ||
  'robinos-mongo-secret';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

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

export function hashPassword(pass: string): string {
  return crypto.createHash('sha256').update(pass).digest('hex');
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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'task-2',
    title: 'LIKE, REPOST & COMMENT ON PINNED POST',
    description: 'Engage with our official launch announcement on X.',
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

export class MongoDatabaseService {
  private initPromise: Promise<void> | null = null;

  public async waitUntilReady(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.init();
    }
    await this.initPromise;
  }

  private async init(): Promise<void> {
    try {
      const db = await getDatabase();

      // Collections
      const settingsCol = db.collection('settings');
      const tasksCol = db.collection('tasks');
      const applicantsCol = db.collection('applicants');
      const adminsCol = db.collection('admins');

      // Indexes
      await Promise.all([
        applicantsCol.createIndex({ wallet_address: 1 }, { unique: true }),
        applicantsCol.createIndex({ application_id: 1 }, { unique: true }),
        applicantsCol.createIndex({ x_username: 1 }),
        applicantsCol.createIndex({ status: 1 }),
        applicantsCol.createIndex({ created_at: -1 }),
        tasksCol.createIndex({ id: 1 }, { unique: true }),
        tasksCol.createIndex({ display_order: 1 }),
        adminsCol.createIndex({ username: 1 }, { unique: true }),
        adminsCol.createIndex({ email: 1 }, { unique: true }),
      ]).catch(() => {});

      // Auto-seed settings if not present
      const settingsCount = await settingsCol.countDocuments({ _id: 'default' as any });
      if (settingsCount === 0) {
        await settingsCol.updateOne(
          { _id: 'default' as any },
          { $set: { data: DEFAULT_SETTINGS, updated_at: new Date() } },
          { upsert: true }
        );
      }

      // Auto-seed tasks if not present
      const tasksCount = await tasksCol.countDocuments();
      if (tasksCount === 0) {
        await tasksCol.insertMany(SEED_TASKS as any);
      } else {
        // Ensure task-1 has updated title
        await tasksCol.updateOne(
          { id: 'task-1' },
          {
            $set: {
              title: 'FOLLOW @RobinosNFT ON X',
              task_url: 'https://x.com/RobinosNFT',
              proof_required: true,
            },
          }
        );
      }

      // Ensure admins exist
      const envUser = (process.env.ADMIN_USERNAME || process.env.ADMIN_USER || process.env.ADMIN_EMAIL || 'admin').trim();
      const envPass = (process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS || 'admin').trim();
      const email = envUser.includes('@') ? envUser : `${envUser}@robinos.xyz`;
      const username = envUser.replace('@', '');
      const passHash = hashPassword(envPass);

      await adminsCol.updateOne(
        { username },
        {
          $set: {
            id: `admin-${username}`,
            username,
            email,
            role: 'superadmin',
            password_hash: passHash,
          },
          $setOnInsert: {
            session_tokens: [],
            created_at: new Date(),
          },
        },
        { upsert: true }
      );

      // Always also ensure 0xnahid superadmin exists
      if (username !== '0xnahid') {
        await adminsCol.updateOne(
          { username: '0xnahid' },
          {
            $set: {
              id: 'admin-0xnahid',
              username: '0xnahid',
              email: '0xnahid@robinos.xyz',
              role: 'superadmin',
              password_hash: passHash,
            },
            $setOnInsert: {
              session_tokens: [],
              created_at: new Date(),
            },
          },
          { upsert: true }
        );
      }
    } catch (err) {
      console.error('MongoDB initialization error:', err);
    }
  }

  // --- SETTINGS ---
  public async getSettings(): Promise<PlatformSettings> {
    await this.waitUntilReady();
    try {
      const db = await getDatabase();
      const doc = await db.collection('settings').findOne({ _id: 'default' as any });
      if (doc && doc.data) return doc.data as PlatformSettings;
    } catch (err) {
      console.warn('Error reading settings from MongoDB:', err);
    }
    return DEFAULT_SETTINGS;
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

    const db = await getDatabase();
    await db.collection('settings').updateOne(
      { _id: 'default' as any },
      { $set: { data: updated, updated_at: new Date() } },
      { upsert: true }
    );

    await this.addAuditLog({
      admin_id: 'admin',
      admin_email: adminEmail || 'admin',
      action: 'Updated platform settings',
      target_type: 'settings',
      target_id: 'default',
      new_value: JSON.stringify(updated),
    });

    return updated;
  }

  // --- TASKS ---
  public async getPublicTasks(): Promise<QuestTask[]> {
    await this.waitUntilReady();
    try {
      const db = await getDatabase();
      const docs = await db
        .collection('tasks')
        .find({ active: true })
        .sort({ display_order: 1, created_at: 1 })
        .toArray();
      return docs.map(this.mapTaskDoc);
    } catch (err) {
      console.warn('Error fetching public tasks from MongoDB:', err);
      return SEED_TASKS;
    }
  }

  public async getAllTasks(): Promise<QuestTask[]> {
    await this.waitUntilReady();
    try {
      const db = await getDatabase();
      const docs = await db
        .collection('tasks')
        .find({})
        .sort({ display_order: 1, created_at: 1 })
        .toArray();
      return docs.map(this.mapTaskDoc);
    } catch (err) {
      console.warn('Error fetching all tasks from MongoDB:', err);
      return SEED_TASKS;
    }
  }

  public async getTaskById(id: string): Promise<QuestTask | null> {
    await this.waitUntilReady();
    try {
      const db = await getDatabase();
      const doc = await db.collection('tasks').findOne({ id });
      return doc ? this.mapTaskDoc(doc) : null;
    } catch {
      return null;
    }
  }

  public async createTask(
    data: Omit<QuestTask, 'id' | 'created_at' | 'updated_at'>,
    adminEmail?: string
  ): Promise<QuestTask> {
    await this.waitUntilReady();
    const db = await getDatabase();
    const count = await db.collection('tasks').countDocuments();
    const now = new Date().toISOString();
    const newTask: QuestTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: data.title.trim(),
      description: data.description.trim(),
      type: data.type || 'Custom',
      task_url: data.task_url?.trim() || undefined,
      proof_required: Boolean(data.proof_required),
      required: Boolean(data.required),
      active: data.active !== undefined ? Boolean(data.active) : true,
      display_order: data.display_order ?? count + 1,
      created_at: now,
      updated_at: now,
    };

    await db.collection('tasks').insertOne(newTask as any);

    await this.addAuditLog({
      admin_id: 'admin',
      admin_email: adminEmail || 'admin',
      action: `Created new quest task "${newTask.title}"`,
      target_type: 'task',
      target_id: newTask.id,
      new_value: JSON.stringify(newTask),
    });

    return newTask;
  }

  public async updateTask(
    id: string,
    data: Partial<QuestTask>,
    adminEmail?: string
  ): Promise<QuestTask | null> {
    await this.waitUntilReady();
    const db = await getDatabase();
    const existing = await this.getTaskById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updateFields: any = { updated_at: now };
    if (data.title !== undefined) updateFields.title = data.title.trim();
    if (data.description !== undefined) updateFields.description = data.description.trim();
    if (data.type !== undefined) updateFields.type = data.type;
    if (data.task_url !== undefined) updateFields.task_url = data.task_url.trim() || undefined;
    if (data.proof_required !== undefined) updateFields.proof_required = Boolean(data.proof_required);
    if (data.required !== undefined) updateFields.required = Boolean(data.required);
    if (data.active !== undefined) updateFields.active = Boolean(data.active);
    if (data.display_order !== undefined) updateFields.display_order = Number(data.display_order);

    await db.collection('tasks').updateOne({ id }, { $set: updateFields });
    const updated = await this.getTaskById(id);

    await this.addAuditLog({
      admin_id: 'admin',
      admin_email: adminEmail || 'admin',
      action: `Updated quest task "${updated?.title || id}"`,
      target_type: 'task',
      target_id: id,
      previous_value: JSON.stringify(existing),
      new_value: JSON.stringify(updated),
    });

    return updated;
  }

  public async toggleTaskActive(id: string, adminEmail?: string): Promise<QuestTask | null> {
    const task = await this.getTaskById(id);
    if (!task) return null;
    return this.updateTask(id, { active: !task.active }, adminEmail);
  }

  public async duplicateTask(id: string, adminEmail?: string): Promise<QuestTask | null> {
    const task = await this.getTaskById(id);
    if (!task) return null;
    return this.createTask(
      {
        title: `${task.title} (Copy)`,
        description: task.description,
        type: task.type,
        task_url: task.task_url,
        proof_required: task.proof_required,
        required: task.required,
        active: false,
        display_order: task.display_order + 1,
      },
      adminEmail
    );
  }

  public async deleteTask(id: string, adminEmail?: string): Promise<boolean> {
    await this.waitUntilReady();
    const task = await this.getTaskById(id);
    if (!task) return false;

    const db = await getDatabase();
    await db.collection('tasks').deleteOne({ id });

    await this.addAuditLog({
      admin_id: 'admin',
      admin_email: adminEmail || 'admin',
      action: `Deleted quest task "${task.title}"`,
      target_type: 'task',
      target_id: id,
      previous_value: JSON.stringify(task),
    });

    return true;
  }

  public async reorderTasks(taskIds: string[], adminEmail?: string): Promise<QuestTask[]> {
    await this.waitUntilReady();
    const db = await getDatabase();
    for (let i = 0; i < taskIds.length; i++) {
      await db.collection('tasks').updateOne({ id: taskIds[i] }, { $set: { display_order: i + 1, updated_at: new Date().toISOString() } });
    }

    await this.addAuditLog({
      admin_id: 'admin',
      admin_email: adminEmail || 'admin',
      action: 'Reordered quest tasks',
      target_type: 'task',
      target_id: 'bulk',
    });

    return this.getAllTasks();
  }

  // --- APPLICANTS ---
  public async getApplicants(filters?: {
    search?: string;
    status?: string;
    reviewed?: string;
    completion?: string;
  }): Promise<Applicant[]> {
    await this.waitUntilReady();
    const db = await getDatabase();
    const query: any = {};

    if (filters?.status && filters.status !== 'All') {
      query.status = { $regex: new RegExp(`^${filters.status}$`, 'i') };
    }

    if (filters?.reviewed) {
      if (filters.reviewed === 'Reviewed') {
        query.reviewed_at = { $ne: null };
      } else if (filters.reviewed === 'Unreviewed') {
        query.reviewed_at = null;
      }
    }

    if (filters?.completion) {
      if (filters.completion === '100%') {
        query.completion_rate = 100;
      } else if (filters.completion === '<100%') {
        query.completion_rate = { $lt: 100 };
      }
    }

    if (filters?.search) {
      const s = filters.search.trim();
      query.$or = [
        { application_id: { $regex: s, $options: 'i' } },
        { wallet_address: { $regex: s, $options: 'i' } },
        { x_username: { $regex: s, $options: 'i' } },
      ];
    }

    const docs = await db.collection('applicants').find(query).sort({ created_at: -1 }).toArray();
    return docs.map(this.mapApplicantDoc);
  }

  public async getApplicantById(idOrAppId: string): Promise<Applicant | null> {
    await this.waitUntilReady();
    const db = await getDatabase();
    const doc = await db.collection('applicants').findOne({
      $or: [
        { id: idOrAppId },
        { application_id: { $regex: new RegExp(`^${idOrAppId}$`, 'i') } },
      ],
    });
    return doc ? this.mapApplicantDoc(doc) : null;
  }

  public async getApplicantByWallet(wallet: string): Promise<Applicant | null> {
    await this.waitUntilReady();
    const clean = wallet.trim().toLowerCase();
    const db = await getDatabase();
    const doc = await db.collection('applicants').findOne({
      wallet_address: { $regex: new RegExp(`^${clean}$`, 'i') },
    });
    return doc ? this.mapApplicantDoc(doc) : null;
  }

  public async getApplicantByUsername(xUsername: string): Promise<Applicant | null> {
    await this.waitUntilReady();
    const clean = xUsername.trim().toLowerCase().replace(/^@/, '');
    const db = await getDatabase();
    const doc = await db.collection('applicants').findOne({
      x_username: { $regex: new RegExp(`^@?${clean}$`, 'i') },
    });
    return doc ? this.mapApplicantDoc(doc) : null;
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
      await this.incrementDuplicateCounter();
      return {
        success: false,
        error: `This wallet address (${data.wallet_address.substring(0, 6)}...${data.wallet_address.substring(data.wallet_address.length - 4)}) has already submitted an application. Application ID: ${existingWallet.application_id}`,
      };
    }

    // 2. Check duplicate X handle
    const existingX = await this.getApplicantByUsername(cleanX);
    if (existingX) {
      await this.incrementDuplicateCounter();
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

    const db = await getDatabase();
    await db.collection('applicants').insertOne(newApplicant as any);

    await this.addAuditLog({
      admin_id: 'system',
      admin_email: 'system',
      action: `New early access application received from @${cleanX} (${applicationId})`,
      target_type: 'applicant',
      target_id: newApplicantId,
    });

    console.log(`✅ Applicant registered successfully in MongoDB: ${applicationId} (@${cleanX})`);
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
    const db = await getDatabase();
    const now = new Date().toISOString();

    const updateFields: any = {
      status,
      updated_at: now,
      reviewed_at: now,
    };
    if (allocation !== undefined) updateFields.allocation = allocation;
    if (notes !== undefined) updateFields.notes = notes;

    if (status === 'Approved') {
      updateFields['tasks.$[elem].status'] = 'Verified';
      updateFields['tasks.$[elem].verified_at'] = now;
    }

    const options: any = status === 'Approved' ? { arrayFilters: [{ 'elem.status': { $ne: 'Rejected' } }] } : {};

    await db.collection('applicants').updateOne(
      {
        $or: [
          { id: idOrAppId },
          { application_id: { $regex: new RegExp(`^${idOrAppId}$`, 'i') } },
        ],
      },
      { $set: updateFields },
      options
    );

    const updated = await this.getApplicantById(idOrAppId);
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

  public async updateTaskVerification(
    applicantId: string,
    taskId: string,
    status: TaskVerificationStatus,
    adminEmail?: string
  ): Promise<ApplicantTaskRecord | null> {
    await this.waitUntilReady();
    const db = await getDatabase();
    const now = new Date().toISOString();

    await db.collection('applicants').updateOne(
      { id: applicantId, 'tasks.task_id': taskId },
      {
        $set: {
          'tasks.$.status': status,
          'tasks.$.verified_at': now,
          updated_at: now,
        },
      }
    );

    const applicant = await this.getApplicantById(applicantId);
    const rec = applicant?.tasks?.find((t) => t.task_id === taskId || t.id === taskId);
    if (rec) {
      await this.addAuditLog({
        admin_id: 'admin',
        admin_email: adminEmail || 'admin',
        action: `Updated task verification "${rec.task_title}" to ${status}`,
        target_type: 'applicant',
        target_id: rec.id,
      });
    }

    return rec || null;
  }

  public async bulkUpdateApplicants(
    ids: string[],
    action: 'approve' | 'reject' | 'waitlist' | 'mark_reviewed',
    allocation?: string,
    adminEmail?: string
  ): Promise<number> {
    await this.waitUntilReady();
    const db = await getDatabase();
    const now = new Date().toISOString();
    let status: ApplicantStatus = 'Pending';
    if (action === 'approve') status = 'Approved';
    else if (action === 'reject') status = 'Rejected';
    else if (action === 'waitlist') status = 'Waitlisted';

    const match = {
      $or: [
        { id: { $in: ids } },
        { application_id: { $in: ids } },
      ],
    };

    let result;
    if (action === 'mark_reviewed') {
      result = await db.collection('applicants').updateMany(match, {
        $set: { reviewed_at: now, updated_at: now },
      });
    } else {
      const updateFields: any = { status, reviewed_at: now, updated_at: now };
      if (allocation) updateFields.allocation = allocation;
      if (action === 'approve') {
        updateFields['tasks.$[elem].status'] = 'Verified';
        updateFields['tasks.$[elem].verified_at'] = now;
      }
      const options: any = action === 'approve' ? { arrayFilters: [{ 'elem.status': { $ne: 'Rejected' } }] } : {};
      result = await db.collection('applicants').updateMany(match, { $set: updateFields }, options);
    }

    const affected = result.modifiedCount || 0;
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
    try {
      const db = await getDatabase();
      const applicantsCol = db.collection('applicants');
      const countersCol = db.collection('counters');
      const tasksCol = db.collection('tasks');

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [counts, todayCount, dupDoc, activeTasks] = await Promise.all([
        applicantsCol
          .aggregate([
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                pending: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
                approved: { $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0] } },
                rejected: { $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] } },
                under_review: { $sum: { $cond: [{ $eq: ['$status', 'Under Review'] }, 1, 0] } },
                waitlisted: { $sum: { $cond: [{ $eq: ['$status', 'Waitlisted'] }, 1, 0] } },
              },
            },
          ])
          .toArray(),
        applicantsCol.countDocuments({ created_at: { $gte: twentyFourHoursAgo } }),
        countersCol.findOne({ key: 'duplicates' }),
        tasksCol.find({ active: true }).toArray(),
      ]);

      const c = counts[0] || {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        under_review: 0,
        waitlisted: 0,
      };

      // Compute task stats from embedded applicants
      const taskStats = await Promise.all(
        activeTasks.map(async (t) => {
          const completedCount = await applicantsCol.countDocuments({
            tasks: {
              $elemMatch: {
                task_id: t.id,
                status: { $ne: 'Rejected' },
              },
            },
          });
          return {
            task_id: t.id,
            title: t.title,
            count: completedCount,
          };
        })
      );

      return {
        total_applicants: c.total || 0,
        pending: c.pending || 0,
        approved: c.approved || 0,
        rejected: c.rejected || 0,
        under_review: c.under_review || 0,
        waitlisted: c.waitlisted || 0,
        todays_applications: todayCount || 0,
        completed_applications: (c.approved || 0) + (c.rejected || 0) + (c.waitlisted || 0),
        duplicate_attempts: dupDoc ? Number(dupDoc.count) || 0 : 0,
        daily_trends: [
          {
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            count: todayCount || 0,
            approved: c.approved || 0,
          },
        ],
        task_completion_stats: taskStats,
      };
    } catch (err) {
      console.error('Error generating stats from MongoDB:', err);
      return {
        total_applicants: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        under_review: 0,
        waitlisted: 0,
        todays_applications: 0,
        completed_applications: 0,
        duplicate_attempts: 0,
        daily_trends: [],
        task_completion_stats: [],
      };
    }
  }

  public async incrementDuplicateCounter(): Promise<void> {
    try {
      const db = await getDatabase();
      await db.collection('counters').updateOne(
        { key: 'duplicates' },
        { $inc: { count: 1 } },
        { upsert: true }
      );
    } catch (err) {
      console.warn('Error incrementing duplicate counter:', err);
    }
  }

  // --- AUDIT LOGS ---
  public async getAuditLogs(limit: number = 100): Promise<AuditLogEntry[]> {
    await this.waitUntilReady();
    try {
      const db = await getDatabase();
      const docs = await db.collection('audit_logs').find({}).sort({ created_at: -1 }).limit(limit).toArray();
      return docs.map((d: any) => ({
        id: d.id,
        admin_id: d.admin_id,
        admin_email: d.admin_email,
        action: d.action,
        target_type: d.target_type,
        target_id: d.target_id,
        previous_value: d.previous_value,
        new_value: d.new_value,
        created_at: typeof d.created_at === 'string' ? d.created_at : new Date(d.created_at).toISOString(),
      }));
    } catch (err) {
      console.warn('Error fetching audit logs:', err);
      return [];
    }
  }

  public async addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'created_at'>): Promise<void> {
    try {
      const db = await getDatabase();
      const log: AuditLogEntry = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        admin_id: entry.admin_id,
        admin_email: entry.admin_email,
        action: entry.action,
        target_type: entry.target_type,
        target_id: entry.target_id,
        previous_value: entry.previous_value,
        new_value: entry.new_value,
        created_at: new Date().toISOString(),
      };
      await db.collection('audit_logs').insertOne(log as any);
    } catch (err) {
      console.warn('Error saving audit log to MongoDB:', err);
    }
  }

  // --- AUTH / ADMIN SESSIONS ---
  public async authenticateAdmin(
    identifier: string,
    pass: string
  ): Promise<{ token: string; admin: AdminUser } | null> {
    await this.waitUntilReady();
    const clean = identifier.trim().toLowerCase();
    const hash = hashPassword(pass.trim());

    const db = await getDatabase();
    const adminDoc = await db.collection('admins').findOne({
      $or: [
        { username: { $regex: new RegExp(`^${clean}$`, 'i') } },
        { email: { $regex: new RegExp(`^${clean}$`, 'i') } },
      ],
      password_hash: hash,
    });

    if (!adminDoc) return null;

    const admin: AdminUser = {
      id: adminDoc.id || `admin-${adminDoc.username}`,
      email: adminDoc.email,
      role: adminDoc.role || 'superadmin',
      created_at: typeof adminDoc.created_at === 'string' ? adminDoc.created_at : new Date(adminDoc.created_at).toISOString(),
    };

    const token = signStatelessToken(admin);
    await db.collection('admins').updateOne(
      { _id: adminDoc._id },
      { $addToSet: { session_tokens: token } }
    );

    return { token, admin };
  }

  public async verifySession(token: string): Promise<AdminUser | null> {
    if (!token) return null;
    const stateless = verifyStatelessToken(token);
    if (stateless) return stateless;

    try {
      const db = await getDatabase();
      const doc = await db.collection('admins').findOne({ session_tokens: token });
      if (!doc) return null;
      return {
        id: doc.id,
        email: doc.email,
        role: doc.role,
        created_at: typeof doc.created_at === 'string' ? doc.created_at : new Date(doc.created_at).toISOString(),
      };
    } catch {
      return null;
    }
  }

  public async logoutSession(token: string): Promise<void> {
    try {
      const db = await getDatabase();
      await db.collection('admins').updateOne(
        { session_tokens: token },
        { $pull: { session_tokens: token } as any }
      );
    } catch {}
  }

  // --- MAPPING HELPERS ---
  private mapTaskDoc(d: any): QuestTask {
    return {
      id: d.id,
      title: d.title,
      description: d.description || '',
      type: d.type,
      task_url: d.task_url || undefined,
      proof_required: Boolean(d.proof_required),
      required: Boolean(d.required),
      active: Boolean(d.active),
      display_order: Number(d.display_order) || 1,
      created_at: typeof d.created_at === 'string' ? d.created_at : new Date(d.created_at).toISOString(),
      updated_at: typeof d.updated_at === 'string' ? d.updated_at : new Date(d.updated_at).toISOString(),
    };
  }

  private mapApplicantDoc(d: any): Applicant {
    return {
      id: d.id,
      application_id: d.application_id,
      wallet_address: d.wallet_address,
      x_username: d.x_username,
      x_profile_url: d.x_profile_url || undefined,
      status: d.status as ApplicantStatus,
      allocation: d.allocation || null,
      notes: d.notes || undefined,
      created_at: typeof d.created_at === 'string' ? d.created_at : new Date(d.created_at).toISOString(),
      updated_at: typeof d.updated_at === 'string' ? d.updated_at : new Date(d.updated_at).toISOString(),
      reviewed_at: d.reviewed_at ? (typeof d.reviewed_at === 'string' ? d.reviewed_at : new Date(d.reviewed_at).toISOString()) : null,
      tasks: (d.tasks || []).map((t: any) => ({
        id: t.id,
        applicant_id: t.applicant_id || d.id,
        task_id: t.task_id,
        task_title: t.task_title || '',
        task_type: t.task_type || 'Custom',
        proof_url: t.proof_url || undefined,
        status: t.status as TaskVerificationStatus,
        verified_at: t.verified_at ? (typeof t.verified_at === 'string' ? t.verified_at : new Date(t.verified_at).toISOString()) : null,
        created_at: typeof t.created_at === 'string' ? t.created_at : new Date(t.created_at).toISOString(),
      })),
      completion_rate: Number(d.completion_rate) || 100,
      completed_tasks_count: Number(d.completed_tasks_count) || (d.tasks?.length || 0),
      total_required_tasks_count: Number(d.total_required_tasks_count) || 2,
    };
  }
}

export const db = new MongoDatabaseService();

