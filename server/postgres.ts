import pg from 'pg';
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

const { Pool } = pg;

// Get connection string from standard Neon / Vercel Postgres environment variables
export function getConnectionString(): string | null {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    null
  );
}

let pool: pg.Pool | null = null;

function getPool(): pg.Pool | null {
  const connectionString = getConnectionString();
  if (!connectionString) return null;

  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      console.error('Neon PostgreSQL Pool Error:', err);
    });
  }

  return pool;
}

export function hashPassword(pass: string): string {
  return crypto.createHash('sha256').update(pass).digest('hex');
}

export class PostgresService {
  private initialized = false;
  private isConnected = false;

  public async initDatabase(initialSeed: {
    tasks: QuestTask[];
    settings: PlatformSettings;
  }): Promise<boolean> {
    const p = getPool();
    if (!p) {
      console.log('ℹ️ No DATABASE_URL or POSTGRES_URL found. Running with in-memory database fallback.');
      return false;
    }

    try {
      console.log('🔄 Connecting to Neon PostgreSQL database...');

      // 1. Create tables if they do not exist
      await p.query(`
        CREATE TABLE IF NOT EXISTS robinos_settings (
          id VARCHAR(50) PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS robinos_tasks (
          id VARCHAR(100) PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          type VARCHAR(50) DEFAULT 'Custom',
          task_url TEXT,
          proof_required BOOLEAN DEFAULT true,
          required BOOLEAN DEFAULT true,
          active BOOLEAN DEFAULT true,
          display_order INT DEFAULT 1,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS robinos_applicants (
          id VARCHAR(100) PRIMARY KEY,
          application_id VARCHAR(50) UNIQUE NOT NULL,
          wallet_address VARCHAR(100) UNIQUE NOT NULL,
          x_username VARCHAR(100) NOT NULL,
          x_profile_url TEXT,
          status VARCHAR(50) DEFAULT 'Pending',
          allocation VARCHAR(100),
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          reviewed_at TIMESTAMPTZ
        );

        CREATE TABLE IF NOT EXISTS robinos_applicant_tasks (
          id VARCHAR(120) PRIMARY KEY,
          applicant_id VARCHAR(100) NOT NULL,
          task_id VARCHAR(100) NOT NULL,
          task_title TEXT,
          task_type VARCHAR(50),
          proof_url TEXT,
          status VARCHAR(50) DEFAULT 'Completed',
          verified_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS robinos_admins (
          id VARCHAR(100) PRIMARY KEY,
          username VARCHAR(100) UNIQUE NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          role VARCHAR(50) DEFAULT 'superadmin',
          password_hash TEXT NOT NULL,
          session_tokens TEXT[] DEFAULT ARRAY[]::TEXT[],
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS robinos_audit_logs (
          id VARCHAR(100) PRIMARY KEY,
          admin_id VARCHAR(100),
          admin_email VARCHAR(100),
          action TEXT NOT NULL,
          target_type VARCHAR(50),
          target_id VARCHAR(100),
          previous_value TEXT,
          new_value TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS robinos_counters (
          key VARCHAR(50) PRIMARY KEY,
          count INT DEFAULT 0
        );
      `);

      this.isConnected = true;
      this.initialized = true;
      console.log('✅ Neon PostgreSQL tables verified/created successfully.');

      // 2. Auto-seed settings if empty
      const settingsCheck = await p.query('SELECT COUNT(*) FROM robinos_settings');
      if (parseInt(settingsCheck.rows[0].count, 10) === 0) {
        console.log('🌱 Seeding initial settings to Neon PostgreSQL...');
        await p.query(
          'INSERT INTO robinos_settings (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2',
          ['default', JSON.stringify(initialSeed.settings)]
        );
      }

      // 3. Auto-seed tasks if empty
      const tasksCheck = await p.query('SELECT COUNT(*) FROM robinos_tasks');
      if (parseInt(tasksCheck.rows[0].count, 10) === 0) {
        console.log('🌱 Seeding quest tasks to Neon PostgreSQL...');
        for (const task of initialSeed.tasks) {
          await p.query(
            `INSERT INTO robinos_tasks (id, title, description, type, task_url, proof_required, required, active, display_order, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (id) DO NOTHING`,
            [
              task.id,
              task.title,
              task.description,
              task.type,
              task.task_url || null,
              task.proof_required,
              task.required,
              task.active,
              task.display_order,
              task.created_at,
              task.updated_at,
            ]
          );
        }
      }

      // 4. Ensure administrator exists in DB
      const envUser = (process.env.ADMIN_USERNAME || process.env.ADMIN_USER || process.env.ADMIN_EMAIL || 'admin').trim();
      const envPass = (process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS || 'admin').trim();
      const email = envUser.includes('@') ? envUser : `${envUser}@robinos.xyz`;
      const username = envUser.replace('@', '');
      const passHash = hashPassword(envPass);

      await p.query(
        `INSERT INTO robinos_admins (id, username, email, role, password_hash, session_tokens, created_at)
         VALUES ($1, $2, $3, 'superadmin', $4, ARRAY[]::TEXT[], NOW())
         ON CONFLICT (username) DO UPDATE SET password_hash = $4, email = $3`,
        [`admin-${username}`, username, email, passHash]
      );
      console.log(`🔐 Admin user "${username}" initialized in PostgreSQL.`);

      return true;
    } catch (err) {
      console.error('⚠️ Failed to initialize Neon PostgreSQL database:', err);
      this.isConnected = false;
      return false;
    }
  }

  public isAvailable(): boolean {
    return this.initialized && this.isConnected && getPool() !== null;
  }

  // --- SETTINGS ---
  public async getSettings(): Promise<PlatformSettings | null> {
    const p = getPool();
    if (!p) return null;
    try {
      const res = await p.query('SELECT data FROM robinos_settings WHERE id = $1', ['default']);
      return res.rows[0]?.data || null;
    } catch (err) {
      console.error('Error fetching settings from Postgres:', err);
      return null;
    }
  }

  public async saveSettings(settings: PlatformSettings): Promise<void> {
    const p = getPool();
    if (!p) return;
    try {
      await p.query(
        'INSERT INTO robinos_settings (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()',
        ['default', JSON.stringify(settings)]
      );
    } catch (err) {
      console.error('Error saving settings to Neon:', err);
    }
  }

  // --- TASKS ---
  public async getPublicTasks(): Promise<QuestTask[]> {
    const p = getPool();
    if (!p) return [];
    try {
      const res = await p.query(
        'SELECT * FROM robinos_tasks WHERE active = true ORDER BY display_order ASC, created_at ASC'
      );
      return res.rows.map(this.mapTaskRow);
    } catch (err) {
      console.error('Error fetching public tasks from Postgres:', err);
      return [];
    }
  }

  public async getAllTasks(): Promise<QuestTask[]> {
    const p = getPool();
    if (!p) return [];
    try {
      const res = await p.query(
        'SELECT * FROM robinos_tasks ORDER BY display_order ASC, created_at ASC'
      );
      return res.rows.map(this.mapTaskRow);
    } catch (err) {
      console.error('Error fetching all tasks from Postgres:', err);
      return [];
    }
  }

  public async getTaskById(id: string): Promise<QuestTask | null> {
    const p = getPool();
    if (!p) return null;
    try {
      const res = await p.query('SELECT * FROM robinos_tasks WHERE id = $1', [id]);
      return res.rows[0] ? this.mapTaskRow(res.rows[0]) : null;
    } catch (err) {
      console.error('Error fetching task by ID from Postgres:', err);
      return null;
    }
  }

  public async saveTask(task: QuestTask): Promise<void> {
    const p = getPool();
    if (!p) return;
    try {
      await p.query(
        `INSERT INTO robinos_tasks (id, title, description, type, task_url, proof_required, required, active, display_order, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET
           title = $2, description = $3, type = $4, task_url = $5,
           proof_required = $6, required = $7, active = $8,
           display_order = $9, updated_at = NOW()`,
        [
          task.id,
          task.title,
          task.description,
          task.type,
          task.task_url || null,
          task.proof_required,
          task.required,
          task.active,
          task.display_order,
          task.created_at,
          task.updated_at,
        ]
      );
    } catch (err) {
      console.error('Error saving task to Neon:', err);
      throw err;
    }
  }

  public async deleteTask(id: string): Promise<boolean> {
    const p = getPool();
    if (!p) return false;
    try {
      const res = await p.query('DELETE FROM robinos_tasks WHERE id = $1', [id]);
      return (res.rowCount || 0) > 0;
    } catch (err) {
      console.error('Error deleting task from Neon:', err);
      return false;
    }
  }

  public async reorderTasks(taskIds: string[]): Promise<void> {
    const p = getPool();
    if (!p) return;
    try {
      for (let i = 0; i < taskIds.length; i++) {
        await p.query(
          'UPDATE robinos_tasks SET display_order = $1, updated_at = NOW() WHERE id = $2',
          [i + 1, taskIds[i]]
        );
      }
    } catch (err) {
      console.error('Error reordering tasks in Neon:', err);
    }
  }

  // --- APPLICANTS ---
  public async getApplicants(filters?: {
    search?: string;
    status?: string;
    reviewed?: string;
    completion?: string;
  }): Promise<Applicant[]> {
    const p = getPool();
    if (!p) return [];

    try {
      // Get all applicants and their tasks in parallel
      const [applicantsRes, tasksRes, activeTasksRes] = await Promise.all([
        p.query('SELECT * FROM robinos_applicants ORDER BY created_at DESC'),
        p.query('SELECT * FROM robinos_applicant_tasks'),
        p.query('SELECT id, required FROM robinos_tasks WHERE active = true'),
      ]);

      const allTasks = tasksRes.rows.map(this.mapApplicantTaskRow);
      const totalActiveTasks = activeTasksRes.rows.length || 1;
      const totalRequiredTasks = activeTasksRes.rows.filter((t) => t.required).length || 1;

      let applicants: Applicant[] = applicantsRes.rows.map((r) => {
        const appTasks = allTasks.filter((t) => t.applicant_id === r.id);
        const completedCount = appTasks.filter((at) => at.status !== 'Rejected').length;
        const completionRate = Math.min(100, Math.round((completedCount / totalActiveTasks) * 100));

        return {
          id: r.id,
          application_id: r.application_id,
          wallet_address: r.wallet_address,
          x_username: r.x_username,
          x_profile_url: r.x_profile_url || undefined,
          status: r.status as ApplicantStatus,
          allocation: r.allocation || null,
          notes: r.notes || undefined,
          created_at: new Date(r.created_at).toISOString(),
          updated_at: new Date(r.updated_at).toISOString(),
          reviewed_at: r.reviewed_at ? new Date(r.reviewed_at).toISOString() : null,
          tasks: appTasks,
          completion_rate: completionRate,
          completed_tasks_count: completedCount,
          total_required_tasks_count: totalRequiredTasks,
        };
      });

      // Filter in memory for instant responsive querying
      if (filters?.status && filters.status !== 'All') {
        applicants = applicants.filter(
          (a) => a.status.toLowerCase() === filters.status?.toLowerCase()
        );
      }

      if (filters?.reviewed) {
        if (filters.reviewed === 'Reviewed') {
          applicants = applicants.filter((a) => a.reviewed_at !== null);
        } else if (filters.reviewed === 'Unreviewed') {
          applicants = applicants.filter((a) => !a.reviewed_at);
        }
      }

      if (filters?.completion) {
        if (filters.completion === '100%') {
          applicants = applicants.filter((a) => (a.completion_rate || 0) === 100);
        } else if (filters.completion === '<100%') {
          applicants = applicants.filter((a) => (a.completion_rate || 0) < 100);
        }
      }

      if (filters?.search) {
        const s = filters.search.toLowerCase().trim();
        applicants = applicants.filter(
          (a) =>
            a.application_id.toLowerCase().includes(s) ||
            a.wallet_address.toLowerCase().includes(s) ||
            a.x_username.toLowerCase().includes(s)
        );
      }

      return applicants;
    } catch (err) {
      console.error('Error fetching applicants from Postgres:', err);
      return [];
    }
  }

  public async getApplicantById(idOrAppId: string): Promise<Applicant | null> {
    const p = getPool();
    if (!p) return null;

    try {
      const res = await p.query(
        'SELECT * FROM robinos_applicants WHERE id = $1 OR UPPER(application_id) = UPPER($1)',
        [idOrAppId]
      );
      if (res.rows.length === 0) return null;

      const r = res.rows[0];
      const [tasksRes, activeTasksRes] = await Promise.all([
        p.query('SELECT * FROM robinos_applicant_tasks WHERE applicant_id = $1', [r.id]),
        p.query('SELECT id, required FROM robinos_tasks WHERE active = true'),
      ]);

      const tasks = tasksRes.rows.map(this.mapApplicantTaskRow);
      const totalActive = activeTasksRes.rows.length || 1;
      const totalRequired = activeTasksRes.rows.filter((t) => t.required).length || 1;
      const completedCount = tasks.filter((at) => at.status !== 'Rejected').length;
      const completionRate = Math.min(100, Math.round((completedCount / totalActive) * 100));

      return {
        id: r.id,
        application_id: r.application_id,
        wallet_address: r.wallet_address,
        x_username: r.x_username,
        x_profile_url: r.x_profile_url || undefined,
        status: r.status as ApplicantStatus,
        allocation: r.allocation || null,
        notes: r.notes || undefined,
        created_at: new Date(r.created_at).toISOString(),
        updated_at: new Date(r.updated_at).toISOString(),
        reviewed_at: r.reviewed_at ? new Date(r.reviewed_at).toISOString() : null,
        tasks,
        completion_rate: completionRate,
        completed_tasks_count: completedCount,
        total_required_tasks_count: totalRequired,
      };
    } catch (err) {
      console.error('Error fetching applicant by ID from Postgres:', err);
      return null;
    }
  }

  public async getApplicantByWallet(wallet: string): Promise<Applicant | null> {
    const p = getPool();
    if (!p) return null;

    try {
      const res = await p.query(
        'SELECT id FROM robinos_applicants WHERE LOWER(wallet_address) = LOWER($1)',
        [wallet.trim()]
      );
      if (res.rows.length === 0) return null;
      return this.getApplicantById(res.rows[0].id);
    } catch (err) {
      console.error('Error fetching applicant by wallet from Postgres:', err);
      return null;
    }
  }

  public async getApplicantByUsername(xUsername: string): Promise<Applicant | null> {
    const p = getPool();
    if (!p) return null;

    try {
      const clean = xUsername.trim().toLowerCase().replace('@', '');
      const res = await p.query(
        'SELECT id FROM robinos_applicants WHERE LOWER(REPLACE(x_username, \'@\', \'\')) = $1',
        [clean]
      );
      if (res.rows.length === 0) return null;
      return this.getApplicantById(res.rows[0].id);
    } catch (err) {
      console.error('Error fetching applicant by username from Postgres:', err);
      return null;
    }
  }

  public async saveApplicant(applicant: Applicant, tasks: ApplicantTaskRecord[]): Promise<void> {
    const p = getPool();
    if (!p) return;

    try {
      await p.query(
        `INSERT INTO robinos_applicants (id, application_id, wallet_address, x_username, x_profile_url, status, allocation, notes, created_at, updated_at, reviewed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET
           status = $6, allocation = $7, notes = $8, updated_at = NOW(), reviewed_at = $11`,
        [
          applicant.id,
          applicant.application_id,
          applicant.wallet_address,
          applicant.x_username,
          applicant.x_profile_url || null,
          applicant.status,
          applicant.allocation || null,
          applicant.notes || null,
          applicant.created_at,
          applicant.updated_at,
          applicant.reviewed_at || null,
        ]
      );

      for (const t of tasks) {
        await p.query(
          `INSERT INTO robinos_applicant_tasks (id, applicant_id, task_id, task_title, task_type, proof_url, status, verified_at, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO UPDATE SET
             status = $7, verified_at = $8, proof_url = $6`,
          [
            t.id,
            t.applicant_id,
            t.task_id,
            t.task_title,
            t.task_type,
            t.proof_url || null,
            t.status,
            t.verified_at || null,
            t.created_at,
          ]
        );
      }
    } catch (err) {
      console.error('Error saving applicant to Neon:', err);
      throw err;
    }
  }

  public async updateApplicantStatus(
    idOrAppId: string,
    status: ApplicantStatus,
    allocation?: string | null,
    notes?: string
  ): Promise<Applicant | null> {
    const p = getPool();
    if (!p) return null;

    try {
      const now = new Date().toISOString();
      const res = await p.query(
        `UPDATE robinos_applicants
         SET status = $1, allocation = COALESCE($2, allocation), notes = COALESCE($3, notes), reviewed_at = $4, updated_at = $4
         WHERE id = $5 OR UPPER(application_id) = UPPER($5)
         RETURNING id`,
        [status, allocation, notes, now, idOrAppId]
      );

      if (res.rows.length === 0) return null;
      const appKeyId = res.rows[0].id;

      if (status === 'Approved') {
        await p.query(
          `UPDATE robinos_applicant_tasks
           SET status = 'Verified', verified_at = NOW()
           WHERE applicant_id = $1 AND status != 'Rejected'`,
          [appKeyId]
        );
      }

      return this.getApplicantById(appKeyId);
    } catch (err) {
      console.error('Error updating applicant status in Postgres:', err);
      return null;
    }
  }

  public async updateTaskVerification(
    applicantId: string,
    taskId: string,
    status: TaskVerificationStatus
  ): Promise<ApplicantTaskRecord | null> {
    const p = getPool();
    if (!p) return null;

    try {
      const now = new Date().toISOString();
      const res = await p.query(
        `UPDATE robinos_applicant_tasks
         SET status = $1, verified_at = $2
         WHERE applicant_id = $3 AND (task_id = $4 OR id = $4)
         RETURNING *`,
        [status, now, applicantId, taskId]
      );

      if (res.rows.length === 0) return null;
      return this.mapApplicantTaskRow(res.rows[0]);
    } catch (err) {
      console.error('Error updating task verification in Postgres:', err);
      return null;
    }
  }

  public async bulkUpdateApplicants(
    ids: string[],
    action: 'approve' | 'reject' | 'waitlist' | 'mark_reviewed',
    allocation?: string
  ): Promise<number> {
    const p = getPool();
    if (!p) return 0;

    try {
      const now = new Date().toISOString();
      let status: ApplicantStatus = 'Pending';
      if (action === 'approve') status = 'Approved';
      else if (action === 'reject') status = 'Rejected';
      else if (action === 'waitlist') status = 'Waitlisted';

      let query = '';
      let params: any[] = [];

      if (action === 'mark_reviewed') {
        query = `UPDATE robinos_applicants SET reviewed_at = $1, updated_at = $1 WHERE id = ANY($2) OR application_id = ANY($2)`;
        params = [now, ids];
      } else {
        query = `UPDATE robinos_applicants SET status = $1, allocation = COALESCE($2, allocation), reviewed_at = $3, updated_at = $3 WHERE id = ANY($4) OR application_id = ANY($4)`;
        params = [status, allocation || null, now, ids];
      }

      const res = await p.query(query, params);

      if (action === 'approve') {
        await p.query(
          `UPDATE robinos_applicant_tasks
           SET status = 'Verified', verified_at = NOW()
           WHERE applicant_id = ANY($1) AND status != 'Rejected'`,
          [ids]
        );
      }

      return res.rowCount || 0;
    } catch (err) {
      console.error('Error in bulk update in Postgres:', err);
      return 0;
    }
  }

  // --- STATS ---
  public async getStats(): Promise<DashboardStats> {
    const p = getPool();
    if (!p) {
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

    try {
      const [countsRes, todayRes, counterRes, taskStatsRes] = await Promise.all([
        p.query(`
          SELECT
            COUNT(*)::int as total,
            COUNT(CASE WHEN status = 'Pending' THEN 1 END)::int as pending,
            COUNT(CASE WHEN status = 'Approved' THEN 1 END)::int as approved,
            COUNT(CASE WHEN status = 'Rejected' THEN 1 END)::int as rejected,
            COUNT(CASE WHEN status = 'Under Review' THEN 1 END)::int as under_review,
            COUNT(CASE WHEN status = 'Waitlisted' THEN 1 END)::int as waitlisted
          FROM robinos_applicants
        `),
        p.query(`
          SELECT COUNT(*)::int as count
          FROM robinos_applicants
          WHERE created_at >= NOW() - INTERVAL '24 hours'
        `),
        p.query(`
          SELECT count FROM robinos_counters WHERE key = 'duplicates'
        `),
        p.query(`
          SELECT
            t.id as task_id,
            t.title as title,
            COUNT(at.id)::int as count
          FROM robinos_tasks t
          LEFT JOIN robinos_applicant_tasks at ON t.id = at.task_id AND at.status != 'Rejected'
          WHERE t.active = true
          GROUP BY t.id, t.title
        `),
      ]);

      const counts = countsRes.rows[0];
      const todayCount = todayRes.rows[0]?.count || 0;
      const dupCount = counterRes.rows[0]?.count || 0;

      const taskStats = taskStatsRes.rows.map((r) => ({
        task_id: r.task_id,
        title: r.title,
        count: r.count,
      }));

      return {
        total_applicants: counts.total || 0,
        pending: counts.pending || 0,
        approved: counts.approved || 0,
        rejected: counts.rejected || 0,
        under_review: counts.under_review || 0,
        waitlisted: counts.waitlisted || 0,
        todays_applications: todayCount,
        completed_applications:
          (counts.approved || 0) + (counts.rejected || 0) + (counts.waitlisted || 0),
        duplicate_attempts: dupCount,
        daily_trends: [
          {
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            count: todayCount,
            approved: counts.approved || 0,
          },
        ],
        task_completion_stats: taskStats,
      };
    } catch (err) {
      console.error('Error generating stats from Postgres:', err);
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
    const p = getPool();
    if (!p) return;
    try {
      await p.query(`
        INSERT INTO robinos_counters (key, count)
        VALUES ('duplicates', 1)
        ON CONFLICT (key) DO UPDATE SET count = robinos_counters.count + 1
      `);
    } catch (err) {
      console.error('Error incrementing duplicate counter:', err);
    }
  }

  // --- AUDIT LOGS ---
  public async getAuditLogs(limit: number = 100): Promise<AuditLogEntry[]> {
    const p = getPool();
    if (!p) return [];
    try {
      const res = await p.query(
        'SELECT * FROM robinos_audit_logs ORDER BY created_at DESC LIMIT $1',
        [limit]
      );
      return res.rows.map((r) => ({
        id: r.id,
        admin_id: r.admin_id,
        admin_email: r.admin_email,
        action: r.action,
        target_type: r.target_type,
        target_id: r.target_id,
        previous_value: r.previous_value || undefined,
        new_value: r.new_value || undefined,
        created_at: new Date(r.created_at).toISOString(),
      }));
    } catch (err) {
      console.error('Error fetching audit logs from Postgres:', err);
      return [];
    }
  }

  public async saveAuditLog(log: AuditLogEntry): Promise<void> {
    const p = getPool();
    if (!p) return;
    try {
      await p.query(
        `INSERT INTO robinos_audit_logs (id, admin_id, admin_email, action, target_type, target_id, previous_value, new_value, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          log.id,
          log.admin_id,
          log.admin_email,
          log.action,
          log.target_type,
          log.target_id,
          log.previous_value || null,
          log.new_value || null,
          log.created_at,
        ]
      );
    } catch (err) {
      console.error('Error saving audit log to Neon:', err);
    }
  }

  // --- AUTH / ADMIN SESSIONS ---
  public async authenticateAdmin(identifier: string, pass: string): Promise<AdminUser | null> {
    const p = getPool();
    if (!p) return null;

    try {
      const cleanIdent = identifier.toLowerCase().trim();
      const hash = hashPassword(pass.trim());

      const res = await p.query(
        `SELECT id, username, email, role, created_at FROM robinos_admins
         WHERE (LOWER(username) = $1 OR LOWER(email) = $1) AND password_hash = $2`,
        [cleanIdent, hash]
      );

      if (res.rows.length === 0) return null;
      const r = res.rows[0];
      return {
        id: r.id,
        email: r.email,
        role: r.role,
        created_at: new Date(r.created_at).toISOString(),
      };
    } catch (err) {
      console.error('Error authenticating admin in Postgres:', err);
      return null;
    }
  }

  public async saveAdminSession(adminId: string, token: string): Promise<void> {
    const p = getPool();
    if (!p) return;
    try {
      await p.query(
        'UPDATE robinos_admins SET session_tokens = array_append(session_tokens, $1) WHERE id = $2',
        [token, adminId]
      );
    } catch (err) {
      console.error('Error saving session to Neon:', err);
    }
  }

  public async getAdminByToken(token: string): Promise<AdminUser | null> {
    const p = getPool();
    if (!p) return null;
    try {
      const res = await p.query(
        'SELECT id, username, email, role, created_at FROM robinos_admins WHERE $1 = ANY(session_tokens)',
        [token]
      );
      if (res.rows.length === 0) return null;
      const r = res.rows[0];
      return {
        id: r.id,
        email: r.email,
        role: r.role,
        created_at: new Date(r.created_at).toISOString(),
      };
    } catch (err) {
      console.error('Error verifying admin token in Postgres:', err);
      return null;
    }
  }

  public async removeAdminToken(token: string): Promise<void> {
    const p = getPool();
    if (!p) return;
    try {
      await p.query(
        'UPDATE robinos_admins SET session_tokens = array_remove(session_tokens, $1)',
        [token]
      );
    } catch (err) {
      console.error('Error removing admin token in Postgres:', err);
    }
  }

  private mapTaskRow(r: any): QuestTask {
    return {
      id: r.id,
      title: r.title,
      description: r.description || '',
      type: r.type,
      task_url: r.task_url || undefined,
      proof_required: Boolean(r.proof_required),
      required: Boolean(r.required),
      active: Boolean(r.active),
      display_order: Number(r.display_order),
      created_at: new Date(r.created_at).toISOString(),
      updated_at: new Date(r.updated_at).toISOString(),
    };
  }

  private mapApplicantTaskRow(r: any): ApplicantTaskRecord {
    return {
      id: r.id,
      applicant_id: r.applicant_id,
      task_id: r.task_id,
      task_title: r.task_title || '',
      task_type: r.task_type || 'Custom',
      proof_url: r.proof_url || undefined,
      status: r.status as TaskVerificationStatus,
      verified_at: r.verified_at ? new Date(r.verified_at).toISOString() : null,
      created_at: new Date(r.created_at).toISOString(),
    };
  }
}

export const postgresService = new PostgresService();
