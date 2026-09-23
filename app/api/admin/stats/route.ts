import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdminRequest } from '../../../../src/lib/auth';
import { db } from '../../../../src/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { errorResponse } = await authenticateAdminRequest(req);
  if (errorResponse) return errorResponse;

  try {
    const stats = await db.getStats();
    return NextResponse.json({ stats });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch stats' }, { status: 500 });
  }
}

