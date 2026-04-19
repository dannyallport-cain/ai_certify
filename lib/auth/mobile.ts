import { jwtVerify, SignJWT } from 'jose';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { users, teamMembers, teams, teamRuntimeSafeColumns } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

const key = new TextEncoder().encode(process.env.AUTH_SECRET);

type MobileSessionData = {
  user: { id: number };
  expires: string;
  mobile: true;
};

export async function signMobileToken(userId: number): Promise<string> {
  const expiresIn30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const payload: MobileSessionData = {
    user: { id: userId },
    expires: expiresIn30Days.toISOString(),
    mobile: true,
  };
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30 days from now')
    .sign(key);
}

export async function verifyMobileToken(token: string): Promise<MobileSessionData | null> {
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
    const data = payload as MobileSessionData;
    if (new Date(data.expires) < new Date()) return null;
    return data;
  } catch {
    return null;
  }
}

export async function getMobileUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const session = await verifyMobileToken(token);
  if (!session) return null;

  const result = await db
    .select({
      user: users,
      teamId: teamMembers.teamId,
    })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .where(and(eq(users.id, session.user.id), isNull(users.deletedAt)))
    .limit(1);

  if (!result[0]) return null;

  const teamResult = await db
    .select(teamRuntimeSafeColumns)
    .from(teams)
    .where(eq(teams.id, result[0].teamId!))
    .limit(1);

  return {
    user: result[0].user,
    team: teamResult[0] ?? null,
  };
}
