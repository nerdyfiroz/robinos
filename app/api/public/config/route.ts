import { NextResponse } from 'next/server';
import { db } from '../../../../src/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await db.getSettings();
    const tasks = await db.getPublicTasks();
    const stats = await db.getStats();

    return NextResponse.json({
      collection: settings.collection,
      early_access: {
        ...settings.early_access,
        total_applicants: stats.total_applicants,
        spots_remaining: Math.max(
          0,
          settings.early_access.max_applications - stats.approved - stats.pending
        ),
      },
      active_tasks_count: tasks.length,
      required_tasks_count: tasks.filter((t) => t.required).length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch config' }, { status: 500 });
  }
}

