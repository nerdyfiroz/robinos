import { NextRequest, NextResponse } from 'next/server';
import { db } from './db';
import type { AdminUser } from '../types';

export async function authenticateAdminRequest(
  req: NextRequest
): Promise<{ errorResponse?: NextResponse; admin?: AdminUser }> {
  const authHeader = req.headers.get('authorization') || req.headers.get('x-admin-token');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

  if (!token) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Unauthorized: Admin authentication token required' },
        { status: 401 }
      ),
    };
  }

  const admin = await db.verifySession(token);
  if (!admin) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Session expired or invalid token' },
        { status: 401 }
      ),
    };
  }

  return { admin };
}

