import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../src/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const settings = await db.getSettings();

    // 1. Check if early access portal is open
    if (!settings.early_access.is_open) {
      return NextResponse.json(
        { error: 'Early Access applications are currently paused by administration.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { wallet_address, x_username, x_profile_url, tasks } = body;

    // 2. Validate wallet address
    if (!wallet_address || typeof wallet_address !== 'string' || wallet_address.trim().length < 10) {
      return NextResponse.json(
        { error: 'A valid EVM/Robinhood wallet address is required.' },
        { status: 400 }
      );
    }

    // 3. Validate X username
    if (!x_username || typeof x_username !== 'string' || x_username.trim().length < 2) {
      return NextResponse.json(
        { error: 'A valid X (Twitter) username is required.' },
        { status: 400 }
      );
    }

    const cleanX = x_username.trim().replace(/^@/, '');

    // 4. Validate required tasks from active database tasks
    const activeTasks = await db.getPublicTasks();
    const requiredTasks = activeTasks.filter((t) => t.required);
    const submittedTasks: { task_id: string; proof_url?: string; completed: boolean }[] = Array.isArray(tasks)
      ? tasks
      : [];

    for (const reqTask of requiredTasks) {
      const match = submittedTasks.find((st) => st.task_id === reqTask.id && st.completed);
      if (!match) {
        return NextResponse.json(
          { error: `Required task "${reqTask.title}" must be completed before submitting.` },
          { status: 400 }
        );
      }
      if (reqTask.proof_required && (!match.proof_url || match.proof_url.trim().length === 0)) {
        return NextResponse.json(
          { error: `Task "${reqTask.title}" requires proof or username.` },
          { status: 400 }
        );
      }
    }

    // 5. Create applicant directly in MongoDB
    const result = await db.createApplicant({
      wallet_address,
      x_username: cleanX,
      x_profile_url,
      tasks: submittedTasks,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: true,
        applicant: result.applicant,
        message: 'Application successfully registered in MongoDB!',
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Error in /api/public/submit:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

