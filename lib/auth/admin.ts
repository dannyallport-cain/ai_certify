import { getSession } from './session';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { isAdminRole } from './roles';

export async function requireAdmin() {
  const session = await getSession();
  
  if (!session) {
    redirect('/sign-in');
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
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
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
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
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return user || null;
} 
