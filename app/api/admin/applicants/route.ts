import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdminRequest } from '../../../../src/lib/auth';
import { db } from '../../../../src/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { errorResponse } = await authenticateAdminRequest(req);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const applicants = await db.getApplicants({
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      reviewed: searchParams.get('reviewed') || undefined,
      completion: searchParams.get('completion') || undefined,
    });

    return NextResponse.json({ applicants });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch applicants' }, { status: 500 });
  }
}

