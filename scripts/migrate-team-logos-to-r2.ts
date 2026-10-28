import { eq, isNotNull } from 'drizzle-orm';

import { db } from '../lib/db/drizzle';
import { teams } from '../lib/db/schema';
import { storeTeamLogoFromDataUri } from '../lib/storage/team-logo';

/**
 * Moves team logos that are still stored inline (`teams.logo_data_uri`) into R2
 * and records the object key, then clears the inline copy.
 *
 * Safe to re-run: teams that already have a key are skipped, and a team whose
 * upload fails keeps its inline logo so nothing is lost.
 *
 * Dry run by default — pass --apply to write.
 */
async function main() {
  const apply = process.argv.includes('--apply');

  // Teams still holding an inline logo; those already on R2 are filtered out
  // below so a re-run is harmless.
  const pending = await db
    .select({
      id: teams.id,
      name: teams.name,
      logoDataUri: teams.logoDataUri,
      logoR2Key: teams.logoR2Key,
    })
    .from(teams)
    .where(isNotNull(teams.logoDataUri));

  const toMigrate = pending.filter((team) => !team.logoR2Key && team.logoDataUri);

  console.log(`teams with an inline logo and no R2 key: ${toMigrate.length}`);

  if (!apply) {
    for (const team of toMigrate) {
      console.log(`  would migrate team ${team.id} (${team.name})`);
    }
    console.log('\ndry run — re-run with --apply to upload');
    process.exit(0);
  }

  let migrated = 0;
  let failed = 0;

  for (const team of toMigrate) {
    try {
      const stored = await storeTeamLogoFromDataUri(team.id, team.logoDataUri as string);

      await db
        .update(teams)
        .set({ logoR2Key: stored.key, logoDataUri: null, updatedAt: new Date() })
        .where(eq(teams.id, team.id));

      migrated += 1;
      console.log(`  migrated team ${team.id} -> ${stored.key}`);
    } catch (error) {
      failed += 1;
      console.error(`  failed team ${team.id}:`, error instanceof Error ? error.message : error);
    }
  }

  console.log(`\nmigrated ${migrated}, failed ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
