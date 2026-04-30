// filepath: app/api/admin/users/route.ts
import { NextResponse } from 'next/server';
import { getAllUsers, createUser, ensureTeamForUser } from '@/lib/db/queries';
import { USER_ROLES } from '@/lib/auth/roles';
import { getCurrentUser, isAdmin } from '@/lib/auth/admin';
import { hashPassword } from '@/lib/auth/session';
import { z } from 'zod';
import { randomBytes } from 'crypto';

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('A valid email is required'),
  role: z.enum(USER_ROLES),
  password: z.string().min(8).max(100).optional(),
  teamId: z.coerce.number().int().positive().nullable().optional(),
});

function generateTemporaryPassword() {
  return randomBytes(9).toString('base64url');
}

function isDuplicateEmailError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const databaseError = error as Error & { code?: string };
  return (
    databaseError.code === '23505' ||
    databaseError.message.includes('duplicate key value violates unique constraint') ||
    databaseError.message.includes('users_email_key')
  );
}

export async function GET() {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const users = await getAllUsers();
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const currentUser = await getCurrentUser();
    const currentUserWithTeam = currentUser ? await ensureTeamForUser(currentUser) : null;

    const body = await request.json();
    const { name, email, role, password, teamId } = createUserSchema.parse(body);
    const resolvedTeamId = teamId ?? currentUserWithTeam?.id ?? null;

    const plainPassword = password || generateTemporaryPassword();
    const passwordHash = await hashPassword(plainPassword);
    const user = await createUser({ name, email, role, passwordHash, teamId: resolvedTeamId });

    return NextResponse.json(
      {
        user,
        temporaryPassword: password ? null : plainPassword,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating user:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid user data', details: error.flatten() }, { status: 400 });
    }

    if (isDuplicateEmailError(error)) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Try signing in instead.' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
