import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { users, teamMembers } from '@/lib/db/schema';
import { eq, isNull } from 'drizzle-orm';
import { comparePasswords } from '@/lib/auth/session';
import { signMobileToken } from '@/lib/auth/mobile';

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

    const teamResult = await db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(eq(teamMembers.userId, user.id))
      .limit(1);

    const token = await signMobileToken(user.id);

    const { passwordHash, ...safeUser } = user;

    return NextResponse.json({
      token,
      user: {
        ...safeUser,
        teamId: teamResult[0]?.teamId ?? null,
      },
    });
  } catch (error) {
    console.error('Mobile login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
