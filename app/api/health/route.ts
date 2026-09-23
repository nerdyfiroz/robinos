import { NextResponse } from 'next/server';
import { getDatabase } from '../../../src/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET() {
  let dbStatus = 'disconnected';
  try {
    const db = await getDatabase();
    await db.command({ ping: 1 });
    dbStatus = 'connected';
  } catch (err: any) {
    dbStatus = 'error: ' + (err?.message || 'failed to connect');
  }

  return NextResponse.json({
    status: 'ok',
    database: dbStatus,
    timestamp: new Date().toISOString(),
    service: 'ROBINOS Early Access Platform (Next.js + MongoDB)',
  });
}

