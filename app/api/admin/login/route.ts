import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../src/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { username, email, password } = body;
    const identifier = (username || email || '').trim();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Username/Email and password are required' },
        { status: 400 }
      );
    }

    const authResult = await db.authenticateAdmin(identifier, password);
    if (!authResult) {
      return NextResponse.json(
        { error: 'Invalid admin credentials' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      token: authResult.token,
      admin: authResult.admin,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Login failed' }, { status: 500 });
  }
}

