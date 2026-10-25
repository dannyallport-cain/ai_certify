import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { comparePasswords } from '@/lib/auth/session';
import { signMobileToken } from '@/lib/auth/mobile';
import { ensureTeamForUser } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, String(email).toLowerCase()))
      .limit(1);

    if (userResult.length === 0) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const user = userResult[0];

    if (user.deletedAt || user.status === 'inactive' || user.status === 'suspended') {
      return NextResponse.json({ error: 'Account is not active' }, { status: 403 });
    }

    const passwordValid = await comparePasswords(String(password), user.passwordHash);
    if (!passwordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Every mobile endpoint is team-scoped, so the team is resolved (and, for an
    // account created outside sign-up, provisioned) before the token is issued.
    const team = await ensureTeamForUser(user);
    const teamId = team?.id ?? null;

    const loginAt = new Date();
    const token = await signMobileToken(user.id);

    await db
      .update(users)
      .set({
        lastLoginAt: loginAt,
        updatedAt: loginAt,
      })
      .where(eq(users.id, user.id));

    const { passwordHash: _passwordHash, ...safeUser } = user;

    return NextResponse.json({
      token,
      user: {
        ...safeUser,
        teamId,
      },
    });
  } catch (error) {
    console.error('Mobile login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
