import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdminRequest } from '../../../../src/lib/auth';
import { db } from '../../../../src/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { errorResponse } = await authenticateAdminRequest(req);
  if (errorResponse) return errorResponse;

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

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="robinos_early_access_applicants_${Date.now()}.csv"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Export failed' }, { status: 500 });
  }
}

