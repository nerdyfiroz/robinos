import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdminRequest } from '../../../../../src/lib/auth';
import { db } from '../../../../../src/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { errorResponse } = await authenticateAdminRequest(req);
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    const applicant = await db.getApplicantById(id);
    if (!applicant) {
      return NextResponse.json({ error: 'Applicant not found' }, { status: 404 });
    }
    return NextResponse.json({ applicant });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch applicant' }, { status: 500 });
  }
}

