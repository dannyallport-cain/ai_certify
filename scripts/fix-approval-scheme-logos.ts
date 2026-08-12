/**
 * Corrects the logo_src / logo_alt values on the approval_scheme_types table.
 *
 * Background: the original seed referenced image files that were never served
 * from /public (NAPIT + BAFE webp only existed at the repo root, and
 * CHAS/SafeContractor/ISO pointed at /logos/*.png files that were never
 * committed). The general settings page, MEIWC certificate form, and PDF
 * ribbon all rendered broken or placeholder tiles for these schemes.
 *
 * This script points every scheme at a real, bundled asset (or clears the
 * logo for schemes we do not ship official artwork for, so the branded
 * symbol tile renders instead of a broken image).
 *
 * Run with: pnpm db:fix-approval-scheme-logos
 */
import { eq } from 'drizzle-orm';
import { db, client } from '../lib/db/drizzle';
import { approvalSchemeTypes } from '../lib/db/schema';

type SchemeLogoPatch = {
  code: string;
  logoSrc: string | null;
  logoAlt: string | null;
};

const LOGO_PATCHES: SchemeLogoPatch[] = [
  {
    code: 'gas-safe',
    logoSrc: '/gas-safe-logo.png',
    logoAlt: 'Gas Safe Register logo',
  },
  {
    code: 'niceic',
    logoSrc: '/logos/niceic-logo.png',
    logoAlt: 'NICEIC logo',
  },
  {
    code: 'napit',
    logoSrc: '/NAPIT-Member-Logo.webp',
    logoAlt: 'NAPIT Member logo',
  },
  {
    code: 'stroma',
    logoSrc: '/logos/stroma.png',
    logoAlt: 'Stroma logo',
  },
  {
    code: 'bafe',
    logoSrc: '/logos/bafe-logo.png',
    logoAlt: 'BAFE logo',
  },
  // No official artwork is bundled for these schemes - clear the broken
  // references so the branded symbol tile renders instead of a broken image.
  { code: 'chas', logoSrc: null, logoAlt: null },
  { code: 'safecontractor', logoSrc: null, logoAlt: null },
  { code: 'iso-9001', logoSrc: null, logoAlt: null },
  { code: 'iso-14001', logoSrc: null, logoAlt: null },
  { code: 'iso-45001', logoSrc: null, logoAlt: null },
];

async function fixApprovalSchemeLogos() {
  console.log('🔧 Fixing approval scheme logo references...');

  let updatedCount = 0;
  let missingCount = 0;

  for (const patch of LOGO_PATCHES) {
    const [existing] = await db
      .select({ id: approvalSchemeTypes.id })
      .from(approvalSchemeTypes)
      .where(eq(approvalSchemeTypes.code, patch.code))
      .limit(1);

    if (!existing) {
      console.warn(`  ⚠ Scheme "${patch.code}" not found - skipping.`);
      missingCount += 1;
      continue;
    }

    await db
      .update(approvalSchemeTypes)
      .set({
        logoSrc: patch.logoSrc,
        logoAlt: patch.logoAlt,
        updatedAt: new Date(),
      })
      .where(eq(approvalSchemeTypes.id, existing.id));

    updatedCount += 1;
    console.log(`  ✓ ${patch.code}: ${patch.logoSrc ?? '(cleared logo)'}`);
  }

  console.log('');
  console.log(`✅ Done - updated ${updatedCount} schemes, skipped ${missingCount} missing.`);
}

fixApprovalSchemeLogos()
  .then(async () => {
    await client.end({ timeout: 5 });
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('❌ Failed to fix approval scheme logos:', error);
    await client.end({ timeout: 5 });
    process.exit(1);
  });
