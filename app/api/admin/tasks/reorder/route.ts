import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdminRequest } from '../../../../../src/lib/auth';
import { db } from '../../../../../src/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { errorResponse, admin } = await authenticateAdminRequest(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json().catch(() => ({}));
    const { task_ids } = body;
    if (!Array.isArray(task_ids)) {
      return NextResponse.json({ error: 'task_ids must be an array of IDs' }, { status: 400 });
    }

    const tasks = await db.reorderTasks(task_ids, admin?.email || 'admin');
    return NextResponse.json({ success: true, tasks });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to reorder tasks' }, { status: 500 });
  }
}

