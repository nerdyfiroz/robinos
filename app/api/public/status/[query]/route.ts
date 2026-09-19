import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../src/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ query: string }> }
) {
  try {
    const { query: rawQuery } = await params;
    const query = decodeURIComponent(rawQuery || '').trim();
    if (!query) {
      return NextResponse.json({ error: 'Lookup query is required' }, { status: 400 });
    }

    const applicant =
      (await db.getApplicantById(query)) ||
      (await db.getApplicantByWallet(query)) ||
      (await db.getApplicantByUsername(query));

    if (!applicant) {
      return NextResponse.json(
        {
          found: false,
          message: 'No early access application found matching that criteria.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      found: true,
      application: {
        application_id: applicant.application_id,
        wallet_address: applicant.wallet_address,
        x_username: applicant.x_username,
        status: applicant.status,
        allocation: applicant.allocation,
        submitted_at: applicant.created_at,
        reviewed_at: applicant.reviewed_at,
        completion_rate: applicant.completion_rate,
        completed_tasks_count: applicant.completed_tasks_count,
        total_required_tasks_count: applicant.total_required_tasks_count,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to lookup status' }, { status: 500 });
  }
}

