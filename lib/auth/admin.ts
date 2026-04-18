import { getSession } from './session';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { isAdminRole } from './roles';

export async function requireAdmin() {
  const session = await getSession();
  
  if (!session) {
    redirect('/sign-in');
  }

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      passwordHash: users.passwordHash,
      deletedAt: users.deletedAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      activatedAt: users.activatedAt,
      avatarUrl: users.avatarUrl,
      avatarR2Key: users.avatarR2Key,
      avatarUpdatedAt: users.avatarUpdatedAt,
      signatureUrl: users.signatureUrl,
      signatureR2Key: users.signatureR2Key,
      signatureUpdatedAt: users.signatureUpdatedAt,
    })
    .from(users)
    .where(and(eq(users.id, session.user.id), isNull(users.deletedAt)))
    .limit(1);

  if (!user || !isAdminRole(user.role)) {
    redirect('/dashboard');
  }

  return user;
}

export async function isAdmin(): Promise<boolean> {
  try {
    const session = await getSession();
    
    if (!session) {
      return false;
    }

    const [user] = await db
      .select({
        id: users.id,
        role: users.role,
        deletedAt: users.deletedAt,
      })
      .from(users)
      .where(and(eq(users.id, session.user.id), isNull(users.deletedAt)))
      .limit(1);

    return !!user && isAdminRole(user.role);
  } catch {
    return false;
  }
}

export async function getCurrentUser() {
  const session = await getSession();
  
  if (!session) {
    return null;
  }

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      passwordHash: users.passwordHash,
      deletedAt: users.deletedAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      activatedAt: users.activatedAt,
      avatarUrl: users.avatarUrl,
      avatarR2Key: users.avatarR2Key,
      avatarUpdatedAt: users.avatarUpdatedAt,
      signatureUrl: users.signatureUrl,
      signatureR2Key: users.signatureR2Key,
      signatureUpdatedAt: users.signatureUpdatedAt,
    })
    .from(users)
    .where(and(eq(users.id, session.user.id), isNull(users.deletedAt)))
    .limit(1);

  return user || null;
}
