/**
 * Creates or repairs an admin account in whichever database POSTGRES_URL points at.
 *
 * Usage:
 *   pnpm exec tsx scripts/create-admin-user.ts <email> <password> [--name "Full Name"] [--dry-run]
 *
 * The script loads .env.local (then .env) itself when POSTGRES_URL is not already
 * exported, because lib/db/drizzle.ts only reads .env via dotenv and this project
 * keeps its real credentials in .env.local.
 *
 * Behaviour:
 * - creates the account when the email is unknown, otherwise updates it in place
 * - always ends with role=admin and status=active, so the account skips the
 *   pending-email-verification gate in signIn (`isEmailVerificationRequired`)
 * - never touches teams: admins reach /admin without a team (see signIn), and
 *   inventing a team here would skew subscription reporting
 */
import { config } from 'dotenv';
import { hash, compare } from 'bcryptjs';
import { eq, sql } from 'drizzle-orm';

// Mirrors SALT_ROUNDS in lib/auth/session.ts so hashes stay interchangeable.
const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;

type Options = {
  email: string;
  password: string;
  name: string | null;
  dryRun: boolean;
};

function parseOptions(argv: string[]): Options {
  const positional: string[] = [];
  let name: string | null = null;
  let dryRun = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--dry-run') {
      dryRun = true;
      continue;
    }

    if (argument === '--name') {
      name = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    positional.push(argument);
  }

  const [rawEmail, password] = positional;
  const email = rawEmail?.trim().toLowerCase() ?? '';

  if (!email || !email.includes('@')) {
    throw new Error('A valid email address is required as the first argument.');
  }

  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `A password of at least ${MIN_PASSWORD_LENGTH} characters is required as the second argument.`
    );
  }

  return { email, password, name, dryRun };
}

function describeTarget(databaseUrl: string | undefined): string {
  if (!databaseUrl) {
    return 'POSTGRES_URL is not set';
  }

  try {
    const parsed = new URL(databaseUrl);
    const databaseName = parsed.pathname.replace(/^\//, '') || '(default)';
    return `${parsed.hostname}:${parsed.port || '5432'}/${databaseName}`;
  } catch {
    return 'POSTGRES_URL could not be parsed';
  }
}

function loadEnvironment(): void {
  if (process.env.POSTGRES_URL) {
    return;
  }

  config({ path: ['.env.local', '.env'], quiet: true });
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));

  loadEnvironment();

  if (!process.env.POSTGRES_URL) {
    throw new Error(
      'POSTGRES_URL is not set. Add it to .env.local or export it before running this script.'
    );
  }

  console.log(`Target database: ${describeTarget(process.env.POSTGRES_URL)}`);
  console.log(`Account: ${options.email}`);

  // Imported after the environment is loaded: lib/db/drizzle.ts captures
  // POSTGRES_URL at module scope, so it must be present before the import runs.
  const { client } = await import('../lib/db/drizzle');
  const { db } = await import('../lib/db/drizzle');
  const { users } = await import('../lib/db/schema');

  try {
    const [existing] = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        status: users.status,
      })
      .from(users)
      .where(sql`lower(${users.email}) = ${options.email}`)
      .limit(1);

    if (options.dryRun) {
      console.log(
        existing
          ? `Dry run: would update user ${existing.id} (role ${existing.role}, status ${existing.status}).`
          : 'Dry run: would create a new admin account.'
      );
      return;
    }

    const passwordHash = await hash(options.password, SALT_ROUNDS);

    let userId: number;

    if (existing) {
      const [updated] = await db
        .update(users)
        .set({
          passwordHash,
          role: 'admin',
          status: 'active',
          activatedAt: sql`coalesce(${users.activatedAt}, now())`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing.id))
        .returning({ id: users.id });

      userId = updated.id;
      console.log(`Updated existing account ${userId} to role=admin, status=active.`);
    } else {
      const [created] = await db
        .insert(users)
        .values({
          name: options.name ?? options.email.split('@')[0],
          email: options.email,
          passwordHash,
          role: 'admin',
          status: 'active',
          activatedAt: new Date(),
        })
        .returning({ id: users.id });

      userId = created.id;
      console.log(`Created admin account ${userId}.`);
    }

    const [stored] = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        status: users.status,
        teamId: users.teamId,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const { passwordHash: storedHash } = (
      await db
        .select({ passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
    )[0];

    const passwordValid = await compare(options.password, storedHash);

    console.log(
      JSON.stringify({ ...stored, passwordValid }, null, 2)
    );

    if (!passwordValid) {
      throw new Error('Password verification failed after write.');
    }
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
