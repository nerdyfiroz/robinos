import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdminRequest } from '../../../../src/lib/auth';
import { db } from '../../../../src/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { errorResponse } = await authenticateAdminRequest(req);
  if (errorResponse) return errorResponse;

  try {
    const tasks = await db.getAllTasks();
    return NextResponse.json({ tasks });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { errorResponse, admin } = await authenticateAdminRequest(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json().catch(() => ({}));
    const { title, description, type, task_url, proof_required, required, active, display_order } = body;

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
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
      admin?.email || 'admin'
    );

    return NextResponse.json({ success: true, task }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to create task' }, { status: 500 });
  }
}

