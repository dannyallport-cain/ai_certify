import { jwtVerify, SignJWT } from 'jose';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { users, teamMembers, teams, teamRuntimeSafeColumns } from '@/lib/db/schema';
import { ensureTeamForUser } from '@/lib/db/queries';
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

export type MobileUser = Omit<typeof users.$inferSelect, 'passwordHash'>;

async function resolveTeamForUser(
  user: Pick<MobileUser, 'id' | 'name' | 'email'>,
  currentTeamId: number | null
) {
  if (currentTeamId !== null) {
    const [team] = await db
      .select(teamRuntimeSafeColumns)
      .from(teams)
      .where(eq(teams.id, currentTeamId))
      .limit(1);

    if (team) {
      return team;
    }
  }

  // Every mobile endpoint is scoped to a team, so an account without one would
  // sign in successfully and then fail on every screen. Provisioning the same
  // default team the web app creates for regular users keeps the app usable.
  return ensureTeamForUser(user);
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

  // Never hand the password hash to a client: /api/mobile/account serialises
  // everything this returns.
  const { passwordHash: _passwordHash, ...user } = result[0].user;

  const team = await resolveTeamForUser(user, result[0].teamId ?? null);

  return {
    user,
    team: team ?? null,
  };
}
