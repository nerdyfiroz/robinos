import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdminRequest } from '../../../../src/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { errorResponse, admin } = await authenticateAdminRequest(req);
  if (errorResponse) return errorResponse;

  return NextResponse.json({ admin });
}

