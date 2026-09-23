import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdminRequest } from '../../../../../src/lib/auth';
import { db } from '../../../../../src/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { errorResponse, admin } = await authenticateAdminRequest(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json().catch(() => ({}));
    const { ids, action, allocation } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Applicant IDs array is required' }, { status: 400 });
    }
    if (!['approve', 'reject', 'waitlist', 'mark_reviewed'].includes(action)) {
      return NextResponse.json({ error: 'Invalid bulk action' }, { status: 400 });
    }

    const affected = await db.bulkUpdateApplicants(
      ids,
      action,
      allocation,
      admin?.email || 'admin'
    );

    return NextResponse.json({ success: true, affected_count: affected });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Bulk update failed' }, { status: 500 });
  }
}

