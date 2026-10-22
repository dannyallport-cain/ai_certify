import { eq } from 'drizzle-orm';

import { db } from '../lib/db/drizzle';
import { users } from '../lib/db/schema';

/**
 * Promotes an existing account to the admin role.
 *
 * Usage: pnpm db:promote-admin you@example.com
 *
 * The account must already exist (sign up through the app first). Without an
 * argument the default owner address is used.
 */
const DEFAULT_EMAIL = 'dannyallport@icloud.com';

async function main() {
  const email = (process.argv[2] ?? DEFAULT_EMAIL).trim();

  if (!email) {
    throw new Error('No email provided');
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user) {
    console.error(`No account found for ${email}. Sign up first, then re-run this command.`);
    process.exit(1);
  }

  if (user.role === 'admin') {
    console.log(`${user.email} is already an admin (user ${user.id}).`);
    return;
  }

  await db.update(users).set({ role: 'admin' }).where(eq(users.id, user.id));
  console.log(`Promoted ${user.email} (user ${user.id}) from ${user.role ?? 'user'} to admin.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
