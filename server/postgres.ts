import pg from 'pg';
import crypto from 'crypto';
import type {
  QuestTask,
  Applicant,
  ApplicantTaskRecord,
  AuditLogEntry,
  PlatformSettings,
  AdminUser,
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

function hashPassword(pass: string): string {
  return crypto.createHash('sha256').update(pass).digest('hex');
}

export class PostgresService {
  private initialized = false;
  private isConnected = false;

  public async initDatabase(initialSeed: {
    tasks: QuestTask[];
    settings: PlatformSettings;
    applicants: Applicant[];
    applicant_tasks: ApplicantTaskRecord[];
    admins: (AdminUser & { password_hash: string; session_tokens: string[] })[];
    audit_logs: AuditLogEntry[];
  }) {
    const p = getPool();
    if (!p) {
      console.log('ℹ️ No DATABASE_URL or POSTGRES_URL found. Running in local JSON storage mode.');
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

      // 2. Auto-seed if empty
      const settingsCheck = await p.query('SELECT COUNT(*) FROM robinos_settings');
      if (parseInt(settingsCheck.rows[0].count, 10) === 0) {
        console.log('🌱 Seeding initial settings to Neon PostgreSQL...');
        await p.query(
          'INSERT INTO robinos_settings (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2',
          ['default', JSON.stringify(initialSeed.settings)]
        );
      }

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

      // 2. Ensure the administrator configured through environment variables is created or updated.
      const envUser = (process.env.ADMIN_USERNAME || process.env.ADMIN_USER || process.env.ADMIN_EMAIL || '').trim();
      const envPass = (process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS || '').trim();
      if (envUser && envPass) {
        const email = envUser.includes('@') ? envUser : `${envUser}@robinos.xyz`;
        const username = envUser.replace('@', '');
        const passHash = hashPassword(envPass);
        await p.query(
          `INSERT INTO robinos_admins (id, username, email, role, password_hash, session_tokens, created_at)
           VALUES ($1, $2, $3, 'superadmin', $4, ARRAY[]::TEXT[], NOW())
           ON CONFLICT (username) DO UPDATE SET password_hash = $4, email = $3`,
          [`admin-env-${username}`, username, email, passHash]
        );
        console.log(`🔐 Admin user "${username}" synced from environment variables.`);
      }

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

  // Load all records from Postgres into memory
  public async loadAllData(): Promise<{
    tasks?: QuestTask[];
    applicants?: Applicant[];
    applicant_tasks?: ApplicantTaskRecord[];
    settings?: PlatformSettings;
    admins?: (AdminUser & { password_hash: string; session_tokens: string[] })[];
    audit_logs?: AuditLogEntry[];
    duplicate_attempts?: number;
  } | null> {
    const p = getPool();
    if (!p || !this.isAvailable()) return null;

    try {
      const [settingsRes, tasksRes, applicantsRes, applicantTasksRes, adminsRes, logsRes, countersRes] = await Promise.all([
        p.query('SELECT data FROM robinos_settings WHERE id = $1', ['default']),
        p.query('SELECT * FROM robinos_tasks ORDER BY display_order ASC'),
        p.query('SELECT * FROM robinos_applicants ORDER BY created_at DESC'),
        p.query('SELECT * FROM robinos_applicant_tasks'),
        p.query('SELECT * FROM robinos_admins'),
        p.query('SELECT * FROM robinos_audit_logs ORDER BY created_at DESC LIMIT 200'),
        p.query('SELECT count FROM robinos_counters WHERE key = $1', ['duplicates']),
      ]);

      const settings: PlatformSettings | undefined = settingsRes.rows[0]?.data;
      const tasks: QuestTask[] = tasksRes.rows.map((r) => ({
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
      }));

      const applicants: Applicant[] = applicantsRes.rows.map((r) => ({
        id: r.id,
        application_id: r.application_id,
        wallet_address: r.wallet_address,
        x_username: r.x_username,
        x_profile_url: r.x_profile_url || undefined,
        status: r.status,
        allocation: r.allocation || null,
        notes: r.notes || undefined,
        created_at: new Date(r.created_at).toISOString(),
        updated_at: new Date(r.updated_at).toISOString(),
        reviewed_at: r.reviewed_at ? new Date(r.reviewed_at).toISOString() : null,
      }));

      const applicant_tasks: ApplicantTaskRecord[] = applicantTasksRes.rows.map((r) => ({
        id: r.id,
        applicant_id: r.applicant_id,
        task_id: r.task_id,
        task_title: r.task_title || '',
        task_type: r.task_type || 'Custom',
        proof_url: r.proof_url || undefined,
        status: r.status,
        verified_at: r.verified_at ? new Date(r.verified_at).toISOString() : null,
        created_at: new Date(r.created_at).toISOString(),
      }));

      const admins = adminsRes.rows.map((r) => ({
        id: r.id,
        email: r.email,
        role: r.role,
        password_hash: r.password_hash,
        session_tokens: Array.isArray(r.session_tokens) ? r.session_tokens : [],
        created_at: new Date(r.created_at).toISOString(),
      }));

      const audit_logs: AuditLogEntry[] = logsRes.rows.map((r) => ({
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

      const duplicate_attempts = countersRes.rows[0]?.count || 0;

      return {
        settings,
        tasks,
        applicants,
        applicant_tasks,
        admins,
        audit_logs,
        duplicate_attempts,
      };
    } catch (err) {
      console.error('Error loading data from Neon PostgreSQL:', err);
      return null;
    }
  }

  // Asynchronously sync operations to Postgres
  public async saveSettings(settings: PlatformSettings) {
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

  public async saveTask(task: QuestTask) {
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
    }
  }

  public async deleteTask(id: string) {
    const p = getPool();
    if (!p) return;
    try {
      await p.query('DELETE FROM robinos_tasks WHERE id = $1', [id]);
    } catch (err) {
      console.error('Error deleting task from Neon:', err);
    }
  }

  public async saveApplicant(applicant: Applicant, tasks: ApplicantTaskRecord[]) {
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
             status = $7, verified_at = $8`,
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
    }
  }

  public async saveAuditLog(log: AuditLogEntry) {
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

  public async saveAdminSession(adminId: string, tokens: string[]) {
    const p = getPool();
    if (!p) return;
    try {
      await p.query(
        'UPDATE robinos_admins SET session_tokens = $1 WHERE id = $2',
        [tokens, adminId]
      );
    } catch (err) {
      console.error('Error updating admin session tokens in Neon:', err);
    }
  }
}

export const postgresService = new PostgresService();
