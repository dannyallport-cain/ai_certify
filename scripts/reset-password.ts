import { db } from '../lib/db/drizzle';
import { users } from '../lib/db/schema';
import { hashPassword } from '../lib/auth/session';
import { eq } from 'drizzle-orm';

async function main() {
  const email = 'dannyallport@icloud.com';
  const newPassword = 'Verify123!';
  const passwordHash = await hashPassword(newPassword);
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    console.log('User not found:', email);
    process.exit(1);
  }
  await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));
  console.log('Password updated for', email);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
