import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdminRequest } from '../../../../../../../src/lib/auth';
import { db } from '../../../../../../../src/lib/db';
import type { TaskVerificationStatus } from '../../../../../../../src/types';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const { errorResponse, admin } = await authenticateAdminRequest(req);
  if (errorResponse) return errorResponse;

  try {
    const { id, taskId } = await params;
    const body = await req.json().catch(() => ({}));
    const { status } = body;

    const validStatuses: TaskVerificationStatus[] = ['Verified', 'Rejected', 'Needs Review'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Status must be Verified, Rejected, or Needs Review' },
        { status: 400 }
      );
    }

    const rec = await db.updateTaskVerification(
      id,
      taskId,
      status,
      admin?.email || 'admin'
    );

    if (!rec) {
      return NextResponse.json({ error: 'Task record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, task_record: rec });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to update task verification' },
      { status: 500 }
    );
  }
}

