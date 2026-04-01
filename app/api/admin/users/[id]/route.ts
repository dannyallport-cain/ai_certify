// filepath: app/api/admin/users/[id]/route.ts
import { NextResponse } from 'next/server';
import {
  deactivateUserById,
  setUserPasswordById,
  setUserStatusById,
} from '@/lib/db/queries';
import { getCurrentUser, isAdmin } from '@/lib/auth/admin';
import { hashPassword } from '@/lib/auth/session';
import { z } from 'zod';

const patchSchema = z.object({
  action: z.enum(['suspend', 'activate', 'change-password', 'send-password-link']),
  newPassword: z.string().min(8).max(100).optional(),
});

async function getRouteUserId(context: any) {
  const maybeParams = context?.params;
  const resolvedParams =
    maybeParams && typeof maybeParams.then === 'function'
      ? await maybeParams
      : maybeParams;

  const id = parseInt(String(resolvedParams?.id ?? ''), 10);
  return id;
}

export async function DELETE(_request: Request, context: any) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const currentUser = await getCurrentUser();
  const id = await getRouteUserId(context);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
  }
  if (currentUser && currentUser.id === id) {
    return NextResponse.json({ error: 'You cannot delete your own account from this screen' }, { status: 400 });
  }
  try {
    await deactivateUserById(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deactivating user:', error);
    return NextResponse.json({ error: 'Failed to deactivate user' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: any) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const currentUser = await getCurrentUser();

  const id = await getRouteUserId(context);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const parsed = patchSchema.parse(body);

    if (parsed.action === 'suspend') {
      if (currentUser && currentUser.id === id) {
        return NextResponse.json({ error: 'You cannot suspend your own account' }, { status: 400 });
      }
      await setUserStatusById(id, 'suspended');
      return NextResponse.json({ success: true });
    }

    if (parsed.action === 'activate') {
      await setUserStatusById(id, 'active');
      return NextResponse.json({ success: true });
    }

    if (parsed.action === 'change-password') {
      if (!parsed.newPassword) {
        return NextResponse.json({ error: 'New password is required' }, { status: 400 });
      }

      const newPasswordHash = await hashPassword(parsed.newPassword);
      await setUserPasswordById(id, newPasswordHash);
      return NextResponse.json({ success: true });
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.BASE_URL ||
      process.env.NEXTAUTH_URL ||
      'http://localhost:4000';
    const signInLink = `${baseUrl.replace(/\/$/, '')}/sign-in`;
    return NextResponse.json({ success: true, signInLink });
  } catch (error) {
    console.error('Error updating user:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request payload', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
