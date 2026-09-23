import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdminRequest } from '../../../../../../src/lib/auth';
import { db } from '../../../../../../src/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { errorResponse, admin } = await authenticateAdminRequest(req);
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    const updated = await db.toggleTaskActive(id, admin?.email || 'admin');
    if (!updated) {
      return NextResponse.json({ error: 'Quest task not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, task: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to toggle task' }, { status: 500 });
  }
}

