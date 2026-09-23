import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdminRequest } from '../../../../../../src/lib/auth';
import { db } from '../../../../../../src/lib/db';
import type { ApplicantStatus } from '../../../../../../src/types';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { errorResponse, admin } = await authenticateAdminRequest(req);
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { status, allocation, notes } = body;

    const validStatuses: ApplicantStatus[] = ['Pending', 'Approved', 'Rejected', 'Waitlisted', 'Under Review'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid applicant status' }, { status: 400 });
    }

    const updated = await db.updateApplicantStatus(
      id,
      status,
      allocation,
      notes,
      admin?.email || 'admin'
    );

    if (!updated) {
      return NextResponse.json({ error: 'Applicant not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, applicant: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update applicant status' }, { status: 500 });
  }
}

