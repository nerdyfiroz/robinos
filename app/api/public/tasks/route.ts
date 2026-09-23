import { NextResponse } from 'next/server';
import { db } from '../../../../src/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tasks = await db.getPublicTasks();
    return NextResponse.json({ tasks });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch public tasks' }, { status: 500 });
  }
}

