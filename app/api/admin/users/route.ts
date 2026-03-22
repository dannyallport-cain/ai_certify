// filepath: app/api/admin/users/route.ts
import { NextResponse } from 'next/server';
import { getAllUsers, createUser } from '@/lib/db/queries';
import { USER_ROLES } from '@/lib/auth/roles';
import { isAdmin } from '@/lib/auth/admin';
import { hashPassword } from '@/lib/auth/session';
import { z } from 'zod';
import { randomBytes } from 'crypto';

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('A valid email is required'),
  role: z.enum(USER_ROLES),
  password: z.string().min(8).max(100).optional(),
});

function generateTemporaryPassword() {
  return randomBytes(9).toString('base64url');
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
    const body = await request.json();
    const { name, email, role, password } = createUserSchema.parse(body);

    const plainPassword = password || generateTemporaryPassword();
    const passwordHash = await hashPassword(plainPassword);
    const user = await createUser({ name, email, role, passwordHash });

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
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
