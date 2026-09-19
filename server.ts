import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { db } from './server/db.js';
import type { AdminUser } from './src/types.js';

export const app = express();

app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token');
  if (_req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json());

// Normalize URLs so routes match whether called directly (/api/admin/login) or via serverless rewrite (/admin/login)
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.url.startsWith('/api/[...all]')) {
    const rawAll = (req.query?.all as string) || '';
    req.url = '/api/' + (Array.isArray(req.query.all) ? req.query.all.join('/') : rawAll);
  } else if (!req.url.startsWith('/api') && (
    req.url.startsWith('/public') ||
    req.url.startsWith('/admin') ||
    req.url.startsWith('/health')
  )) {
    req.url = '/api' + req.url;
  }
  next();
});

// Disable caching on all API routes to ensure real-time consistency
app.use('/api', (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Middleware to ensure DB is initialized with timeout to avoid Vercel 500
app.use(async (_req: Request, _res: Response, next: NextFunction) => {
  try {
    await Promise.race([
      db.waitUntilReady(),
      new Promise<void>((resolve) => setTimeout(resolve, 4000)),
    ]);
  } catch (err) {
    console.warn('DB waitUntilReady warning in middleware:', err);
  }
  next();
});

// Interface for authenticated requests
interface AuthenticatedRequest extends Request {
  adminUser?: AdminUser;
}

// Admin Auth Middleware
const requireAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization || (req.headers['x-admin-token'] as string);
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Admin authentication token required' });
  }

  const admin = await db.verifySession(token);
  if (!admin) {
    return res.status(401).json({ error: 'Session expired or invalid token' });
  }

  req.adminUser = admin;
  next();
};

// ==========================================
// PUBLIC ROUTES
// ==========================================

// Health Check
app.get('/api/health', async (_req: Request, res: Response) => {
  const { postgresService } = await import('./server/postgres');
  res.json({
    status: 'ok',
    database: postgresService.isAvailable() ? 'connected' : 'in-memory-fallback',
    timestamp: new Date().toISOString(),
    service: 'ROBINOS Early Access Platform API',
  });
});

// Public Config / Overview
app.get('/api/public/config', async (_req: Request, res: Response) => {
  try {
    const settings = await db.getSettings();
    const tasks = await db.getPublicTasks();
    const stats = await db.getStats();

    res.json({
      collection: settings.collection,
      early_access: {
        ...settings.early_access,
        total_applicants: stats.total_applicants,
        spots_remaining: Math.max(
          0,
          settings.early_access.max_applications - stats.approved - stats.pending
        ),
      },
      active_tasks_count: tasks.length,
      required_tasks_count: tasks.filter((t) => t.required).length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Public Platform Settings
app.get('/api/public/settings', async (_req: Request, res: Response) => {
  try {
    const settings = await db.getSettings();
    res.json({ settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Public Active Quest Tasks (Direct from Database)
app.get('/api/public/tasks', async (_req: Request, res: Response) => {
  try {
    const tasks = await db.getPublicTasks();
    res.json({ tasks });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Public Status Lookup by Wallet, X handle, or Application ID
app.get('/api/public/status/:query', async (req: Request, res: Response) => {
  try {
    const query = req.params.query.trim();
    if (!query) {
      return res.status(400).json({ error: 'Lookup query is required' });
    }

    const applicant =
      (await db.getApplicantById(query)) ||
      (await db.getApplicantByWallet(query)) ||
      (await db.getApplicantByUsername(query));

    if (!applicant) {
      return res.status(404).json({
        found: false,
        message: 'No early access application found matching that criteria.',
      });
    }

    res.json({
      found: true,
      application: {
        application_id: applicant.application_id,
        wallet_address: applicant.wallet_address,
        x_username: applicant.x_username,
        status: applicant.status,
        allocation: applicant.allocation,
        submitted_at: applicant.created_at,
        reviewed_at: applicant.reviewed_at,
        completion_rate: applicant.completion_rate,
        completed_tasks_count: applicant.completed_tasks_count,
        total_required_tasks_count: applicant.total_required_tasks_count,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Submit Application (Direct to Database)
app.post('/api/public/submit', async (req: Request, res: Response) => {
  try {
    const settings = await db.getSettings();

    // 1. Check if early access portal is open
    if (!settings.early_access.is_open) {
      return res.status(403).json({
        error: 'Early Access applications are currently paused by administration.',
      });
    }

    const { wallet_address, x_username, x_profile_url, tasks } = req.body;

    // 2. Validate wallet address
    if (!wallet_address || typeof wallet_address !== 'string' || wallet_address.trim().length < 10) {
      return res.status(400).json({ error: 'A valid EVM/Robinhood wallet address is required.' });
    }

    // 3. Validate X username
    if (!x_username || typeof x_username !== 'string' || x_username.trim().length < 2) {
      return res.status(400).json({ error: 'A valid X (Twitter) username is required.' });
    }

    const cleanX = x_username.trim().replace(/^@/, '');

    // 4. Validate required tasks from active database tasks
    const activeTasks = await db.getPublicTasks();
    const requiredTasks = activeTasks.filter((t) => t.required);
    const submittedTasks: { task_id: string; proof_url?: string; completed: boolean }[] = Array.isArray(tasks)
      ? tasks
      : [];

    for (const reqTask of requiredTasks) {
      const match = submittedTasks.find((st) => st.task_id === reqTask.id && st.completed);
      if (!match) {
        return res.status(400).json({
          error: `Required task "${reqTask.title}" must be completed before submitting.`,
        });
      }
      if (reqTask.proof_required && (!match.proof_url || match.proof_url.trim().length === 0)) {
        return res.status(400).json({
          error: `Task "${reqTask.title}" requires proof or username.`,
        });
      }
    }

    // 5. Create applicant directly in PostgreSQL
    const result = await db.createApplicant({
      wallet_address,
      x_username: cleanX,
      x_profile_url,
      tasks: submittedTasks,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.status(201).json({
      success: true,
      applicant: result.applicant,
      message: 'Application successfully registered in the database!',
    });
  } catch (err: any) {
    console.error('Error in /api/public/submit:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// ==========================================
// ADMIN AUTHENTICATION
// ==========================================

app.post('/api/admin/login', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    const identifier = (username || email || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Username/Email and password are required' });
    }

    const authResult = await db.authenticateAdmin(identifier, password);
    if (!authResult) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    res.json({
      success: true,
      token: authResult.token,
      admin: authResult.admin,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/me', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    admin: req.adminUser,
  });
});

app.post('/api/admin/logout', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization || (req.headers['x-admin-token'] as string);
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    if (token) {
      await db.logoutSession(token);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ADMIN DASHBOARD & STATS
// ==========================================

app.get('/api/admin/stats', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await db.getStats();
    res.json({ stats });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ADMIN QUEST TASKS MANAGEMENT
// ==========================================

// Get all quest tasks (including inactive)
app.get('/api/admin/tasks', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const tasks = await db.getAllTasks();
    res.json({ tasks });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create new quest task
app.post('/api/admin/tasks', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, description, type, task_url, proof_required, required, active, display_order } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const task = await db.createTask(
      {
        title,
        description,
        type: type || 'Custom',
        task_url,
        proof_required: Boolean(proof_required),
        required: Boolean(required),
        active: active !== undefined ? Boolean(active) : true,
        display_order,
      },
      req.adminUser?.email || 'admin'
    );

    res.status(201).json({ success: true, task });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update quest task
app.put('/api/admin/tasks/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const taskId = req.params.id;
    const updated = await db.updateTask(taskId, req.body, req.adminUser?.email || 'admin');
    if (!updated) {
      return res.status(404).json({ error: 'Quest task not found' });
    }
    res.json({ success: true, task: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle quest active status
app.patch('/api/admin/tasks/:id/toggle', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const taskId = req.params.id;
    const updated = await db.toggleTaskActive(taskId, req.adminUser?.email || 'admin');
    if (!updated) {
      return res.status(404).json({ error: 'Quest task not found' });
    }
    res.json({ success: true, task: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Duplicate quest task
app.post('/api/admin/tasks/:id/duplicate', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const taskId = req.params.id;
    const duplicated = await db.duplicateTask(taskId, req.adminUser?.email || 'admin');
    if (!duplicated) {
      return res.status(404).json({ error: 'Quest task not found' });
    }
    res.status(201).json({ success: true, task: duplicated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete quest task
app.delete('/api/admin/tasks/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const taskId = req.params.id;
    const deleted = await db.deleteTask(taskId, req.adminUser?.email || 'admin');
    if (!deleted) {
      return res.status(404).json({ error: 'Quest task not found or could not be deleted' });
    }
    res.json({ success: true, message: 'Quest task deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reorder quest tasks
app.post('/api/admin/tasks/reorder', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { task_ids } = req.body;
    if (!Array.isArray(task_ids)) {
      return res.status(400).json({ error: 'task_ids must be an array of IDs' });
    }
    const tasks = await db.reorderTasks(task_ids, req.adminUser?.email || 'admin');
    res.json({ success: true, tasks });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ADMIN APPLICANTS MANAGEMENT
// ==========================================

// Get applicants with filters
app.get('/api/admin/applicants', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, status, reviewed, completion } = req.query;
    const applicants = await db.getApplicants({
      search: search as string,
      status: status as string,
      reviewed: reviewed as string,
      completion: completion as string,
    });
    res.json({ applicants });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get single applicant with full task proofs
app.get('/api/admin/applicants/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const applicant = await db.getApplicantById(req.params.id);
    if (!applicant) {
      return res.status(404).json({ error: 'Applicant not found' });
    }
    res.json({ applicant });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update applicant status (Approve, Reject, Waitlist, etc.)
app.patch('/api/admin/applicants/:id/status', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, allocation, notes } = req.body;
    if (!['Pending', 'Approved', 'Rejected', 'Waitlisted', 'Under Review'].includes(status)) {
      return res.status(400).json({ error: 'Invalid applicant status' });
    }

    const updated = await db.updateApplicantStatus(
      req.params.id,
      status,
      allocation,
      notes,
      req.adminUser?.email || 'admin'
    );

    if (!updated) return res.status(404).json({ error: 'Applicant not found' });
    res.json({ success: true, applicant: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update individual task verification status for applicant
app.patch('/api/admin/applicants/:id/tasks/:taskId', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = req.body;
    if (!['Verified', 'Rejected', 'Needs Review'].includes(status)) {
      return res.status(400).json({ error: 'Status must be Verified, Rejected, or Needs Review' });
    }

    const rec = await db.updateTaskVerification(
      req.params.id,
      req.params.taskId,
      status,
      req.adminUser?.email || 'admin'
    );

    if (!rec) return res.status(404).json({ error: 'Task record not found' });
    res.json({ success: true, task_record: rec });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk actions on applicants
app.post('/api/admin/applicants/bulk', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { ids, action, allocation } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Applicant IDs array is required' });
    }
    if (!['approve', 'reject', 'waitlist', 'mark_reviewed'].includes(action)) {
      return res.status(400).json({ error: 'Invalid bulk action' });
    }

    const affected = await db.bulkUpdateApplicants(
      ids,
      action,
      allocation,
      req.adminUser?.email || 'admin'
    );

    res.json({ success: true, affected_count: affected });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// CSV Export of applicants
app.get('/api/admin/export', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const applicants = await db.getApplicants();
    const headers = [
      'Application ID',
      'Wallet Address',
      'X Username',
      'X Profile URL',
      'Status',
      'Allocation',
      'Tasks Completed',
      'Completion Rate (%)',
      'Task Proofs & Statuses',
      'Submitted Date',
      'Reviewed Date',
    ];

    const escapeCSV = (str: any) => {
      if (str === null || str === undefined) return '""';
      const val = String(str).replace(/"/g, '""');
      return `"${val}"`;
    };

    const rows = applicants.map((app) => {
      const taskDetails = (app.tasks || [])
        .map(
          (t) =>
            `[${t.task_title || t.task_id}: ${t.status}${t.proof_url ? ` | Proof: ${t.proof_url}` : ''}]`
        )
        .join('; ');

      return [
        escapeCSV(app.application_id),
        escapeCSV(app.wallet_address),
        escapeCSV(app.x_username),
        escapeCSV(app.x_profile_url),
        escapeCSV(app.status),
        escapeCSV(app.allocation || 'None'),
        escapeCSV(app.completed_tasks_count),
        escapeCSV(app.completion_rate),
        escapeCSV(taskDetails),
        escapeCSV(app.created_at),
        escapeCSV(app.reviewed_at || 'Unreviewed'),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="robinos_early_access_applicants_${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ADMIN SETTINGS & AUDIT LOGS
// ==========================================

app.get('/api/admin/settings', async (_req: Request, res: Response) => {
  try {
    const settings = await db.getSettings();
    res.json({ settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/settings', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await db.updateSettings(req.body, req.adminUser?.email || 'admin');
    res.json({ success: true, settings: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/audit-logs', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await db.getAuditLogs();
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// VITE MIDDLEWARE & SPA FALLBACK
// ==========================================

async function startServer() {
  const PORT = 3000;
  if (process.env.NODE_ENV !== 'production') {
    // Dynamic specifier keeps Vite (and its native deps) out of the serverless bundle
    const vitePackage = 'vite';
    const { createServer: createViteServer } = await import(/* @vite-ignore */ vitePackage);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ROBINOS Platform Server running on port ${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
