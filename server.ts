import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.js';

interface AuthenticatedRequest extends Request {
  adminUser?: {
    id: string;
    email: string;
    role: string;
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Simple IP rate limiter for submissions & auth
  const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
  const checkRateLimit = (ip: string, limit: number = 20, windowMs: number = 60000): boolean => {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (entry.count >= limit) {
      return false;
    }
    entry.count += 1;
    return true;
  };

  // Admin Auth Middleware
  const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization || (req.headers['x-admin-token'] as string);
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Admin authentication token required' });
    }

    const admin = db.verifySession(token);
    if (!admin) {
      return res.status(401).json({ error: 'Session expired or invalid token' });
    }

    req.adminUser = admin;
    next();
  };

  // ==========================================
  // PUBLIC ROUTES
  // ==========================================

  // Get collection config & platform settings
  app.get('/api/public/config', (_req: Request, res: Response) => {
    try {
      const settings = db.getSettings();
      res.json({
        settings,
        collection: settings.collection,
        early_access: {
          is_open: settings.early_access.is_open,
          max_applications: settings.early_access.max_applications,
          default_allocation: settings.early_access.default_allocation,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Internal error' });
    }
  });

  // Get full public platform settings
  app.get('/api/public/settings', (_req: Request, res: Response) => {
    try {
      const settings = db.getSettings();
      res.json({ settings });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Internal error' });
    }
  });

  // Get active quest tasks (dynamically loaded from DB)
  app.get('/api/public/tasks', (_req: Request, res: Response) => {
    try {
      const tasks = db.getPublicTasks();
      res.json({ tasks });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to retrieve tasks' });
    }
  });

  // Check application status by wallet or Application ID
  app.get('/api/public/status/:query', (req: Request, res: Response) => {
    try {
      const query = req.params.query.trim();
      let applicant = null;
      if (query.startsWith('0x') || query.length >= 30) {
        applicant = db.getApplicantByWallet(query);
      } else {
        applicant = db.getApplicantById(query);
      }

      if (!applicant) {
        return res.status(404).json({ error: 'No application found for this wallet address or Application ID' });
      }

      // Return public safe view of applicant
      res.json({
        application_id: applicant.application_id,
        wallet_address: applicant.wallet_address,
        x_username: applicant.x_username,
        status: applicant.status,
        allocation: applicant.allocation,
        submitted_at: applicant.created_at,
        reviewed_at: applicant.reviewed_at,
        tasks_completed: applicant.completed_tasks_count,
        total_tasks: applicant.total_required_tasks_count,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Lookup failed' });
    }
  });

  // Submit Early Access Application
  app.post('/api/public/submit', (req: Request, res: Response) => {
    try {
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
      if (!checkRateLimit(ip, 6, 60000)) {
        return res.status(429).json({ error: 'Too many submissions. Please wait a minute before retrying.' });
      }

      const settings = db.getSettings();
      if (!settings.early_access.is_open) {
        return res.status(403).json({
          error: 'EARLY ACCESS IS CURRENTLY CLOSED. Submissions are temporarily paused by administration.',
        });
      }

      const { wallet_address, x_username, x_profile_url, tasks } = req.body;

      if (!wallet_address || typeof wallet_address !== 'string') {
        return res.status(400).json({ error: 'Public wallet address is required' });
      }

      // Validate EVM wallet format
      const ethRegex = /^0x[a-fA-F0-9]{40}$/;
      if (!ethRegex.test(wallet_address.trim())) {
        return res.status(400).json({ error: 'Invalid EVM wallet address format (must be 0x followed by 40 hex characters)' });
      }

      if (!x_username || typeof x_username !== 'string') {
        return res.status(400).json({ error: 'X (Twitter) username is required' });
      }

      const cleanX = x_username.trim();
      if (cleanX.length < 2) {
        return res.status(400).json({ error: 'Invalid X username' });
      }

      // Validate required tasks from active database tasks
      const activeTasks = db.getPublicTasks();
      const requiredTasks = activeTasks.filter((t) => t.required);
      const submittedTasks: { task_id: string; proof_url?: string; completed: boolean }[] = Array.isArray(tasks)
        ? tasks
        : [];

      for (const reqTask of requiredTasks) {
        const match = submittedTasks.find((st) => st.task_id === reqTask.id && st.completed);
        if (!match) {
          return res.status(400).json({
            error: `Required task "${reqTask.title}" must be marked as completed before submitting.`,
          });
        }
        if (reqTask.proof_required && (!match.proof_url || match.proof_url.trim().length === 0)) {
          return res.status(400).json({
            error: `Task "${reqTask.title}" requires response or proof.`,
          });
        }
      }

      const result = db.createApplicant({
        wallet_address,
        x_username: cleanX,
        x_profile_url,
        tasks: submittedTasks,
      });

      if (result.isDuplicate) {
        return res.status(409).json({
          error: 'Duplicate application detected. An application has already been recorded for this wallet address or X account.',
          application_id: result.applicant.application_id,
          status: result.applicant.status,
        });
      }

      res.status(201).json({
        success: true,
        message: 'Application received successfully!',
        applicant: {
          application_id: result.applicant.application_id,
          wallet_address: result.applicant.wallet_address,
          x_username: result.applicant.x_username,
          status: result.applicant.status,
          created_at: result.applicant.created_at,
        },
      });
    } catch (err: any) {
      console.error('Submit error:', err);
      res.status(500).json({ error: err.message || 'Internal submission error' });
    }
  });

  // ==========================================
  // ADMIN AUTH ROUTES
  // ==========================================

  // Admin login
  app.post('/api/admin/login', (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const authResult = db.authenticateAdmin(email, password);
    if (!authResult) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    res.json({
      success: true,
      token: authResult.token,
      admin: authResult.admin,
    });
  });

  // Verify admin session
  app.get('/api/admin/me', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    res.json({ admin: req.adminUser });
  });

  // Admin logout
  app.post('/api/admin/logout', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization || (req.headers['x-admin-token'] as string);
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    if (token) {
      db.logoutSession(token);
    }
    res.json({ success: true });
  });

  // ==========================================
  // ADMIN DASHBOARD & STATS
  // ==========================================

  app.get('/api/admin/stats', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
    try {
      const stats = db.getStats();
      res.json({ stats });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to calculate stats' });
    }
  });

  // ==========================================
  // ADMIN QUEST MANAGEMENT
  // ==========================================

  // List all tasks (including inactive)
  app.get('/api/admin/tasks', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
    try {
      const tasks = db.getAllTasks();
      res.json({ tasks });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create quest
  app.post('/api/admin/tasks', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { title, description, type, task_url, proof_required, required, active, display_order } = req.body;
      if (!title || !type) {
        return res.status(400).json({ error: 'Quest title and type are required' });
      }

      const task = db.createTask(
        {
          title: title.trim(),
          description: (description || '').trim(),
          type,
          task_url: (task_url || '').trim(),
          proof_required: Boolean(proof_required),
          required: Boolean(required),
          active: active !== undefined ? Boolean(active) : true,
          display_order: Number(display_order) || 1,
        },
        req.adminUser?.email || 'admin'
      );

      res.status(201).json({ success: true, task });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update quest
  app.put('/api/admin/tasks/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const taskId = req.params.id;
      const updated = db.updateTask(taskId, req.body, req.adminUser?.email || 'admin');
      if (!updated) {
        return res.status(404).json({ error: 'Quest not found' });
      }
      res.json({ success: true, task: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Toggle quest active status
  app.patch('/api/admin/tasks/:id/toggle', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const taskId = req.params.id;
      const task = db.getAllTasks().find((t) => t.id === taskId);
      if (!task) return res.status(404).json({ error: 'Quest not found' });

      const updated = db.updateTask(taskId, { active: !task.active }, req.adminUser?.email || 'admin');
      res.json({ success: true, task: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Duplicate quest
  app.post('/api/admin/tasks/:id/duplicate', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const taskId = req.params.id;
      const duplicated = db.duplicateTask(taskId, req.adminUser?.email || 'admin');
      if (!duplicated) return res.status(404).json({ error: 'Quest not found' });
      res.status(201).json({ success: true, task: duplicated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete quest
  app.delete('/api/admin/tasks/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const taskId = req.params.id;
      const ok = db.deleteTask(taskId, req.adminUser?.email || 'admin');
      if (!ok) return res.status(404).json({ error: 'Quest not found' });
      res.json({ success: true, message: 'Quest deleted' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Reorder quests
  app.post('/api/admin/tasks/reorder', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { task_ids } = req.body;
      if (!Array.isArray(task_ids)) {
        return res.status(400).json({ error: 'task_ids array is required' });
      }
      const updated = db.reorderTasks(task_ids, req.adminUser?.email || 'admin');
      res.json({ success: true, tasks: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // ADMIN APPLICANT MANAGEMENT
  // ==========================================

  // List applicants with search & filters
  app.get('/api/admin/applicants', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { search, status, reviewed, completion } = req.query;
      const applicants = db.getApplicants({
        search: typeof search === 'string' ? search : undefined,
        status: typeof status === 'string' ? status : undefined,
        reviewed: typeof reviewed === 'string' ? reviewed : undefined,
        completion: typeof completion === 'string' ? completion : undefined,
      });

      res.json({ applicants });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get detailed applicant profile
  app.get('/api/admin/applicants/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const applicant = db.getApplicantById(req.params.id);
      if (!applicant) {
        return res.status(404).json({ error: 'Applicant not found' });
      }
      res.json({ applicant });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update applicant status (Approve, Reject, Waitlist) & Allocation
  app.patch('/api/admin/applicants/:id/status', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status, allocation, notes } = req.body;
      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      const updated = db.updateApplicantStatus(
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
  app.patch('/api/admin/applicants/:id/tasks/:taskId', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status } = req.body;
      if (!['Verified', 'Rejected', 'Needs Review'].includes(status)) {
        return res.status(400).json({ error: 'Status must be Verified, Rejected, or Needs Review' });
      }

      const rec = db.updateTaskVerification(
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
  app.post('/api/admin/applicants/bulk', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ids, action, allocation } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'Applicant IDs array is required' });
      }
      if (!['approve', 'reject', 'waitlist', 'mark_reviewed'].includes(action)) {
        return res.status(400).json({ error: 'Invalid bulk action' });
      }

      const affected = db.bulkUpdateApplicants(
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
  app.get('/api/admin/export', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const applicants = db.getApplicants();
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

  app.get('/api/admin/settings', (_req: Request, res: Response) => {
    try {
      const settings = db.getSettings();
      res.json({ settings });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/admin/settings', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = db.updateSettings(req.body, req.adminUser?.email || 'admin');
      res.json({ success: true, settings: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/audit-logs', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
    try {
      const logs = db.getAuditLogs();
      res.json({ logs });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // VITE MIDDLEWARE & SPA FALLBACK
  // ==========================================

  if (process.env.NODE_ENV !== 'production') {
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

startServer();
