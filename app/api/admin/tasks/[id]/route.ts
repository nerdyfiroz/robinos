import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdminRequest } from '../../../../../src/lib/auth';
import { db } from '../../../../../src/lib/db';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { errorResponse, admin } = await authenticateAdminRequest(req);
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const updated = await db.updateTask(id, body, admin?.email || 'admin');
    if (!updated) {
      return NextResponse.json({ error: 'Quest task not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, task: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { errorResponse, admin } = await authenticateAdminRequest(req);
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    const deleted = await db.deleteTask(id, admin?.email || 'admin');
    if (!deleted) {
      return NextResponse.json({ error: 'Quest task not found or could not be deleted' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Quest task deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to delete task' }, { status: 500 });
  }
}

