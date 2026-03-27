import { db } from '../lib/db/drizzle';
import { users } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const email = 'dannyallport@icloud.com';
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    console.log('User not found with email:', email);
    process.exit(1);
  }
  console.log('Found user:', user.id, user.email, 'current role:', user.role);
  await db.update(users).set({ role: 'admin' }).where(eq(users.id, user.id));
  console.log('Updated role to admin.');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
