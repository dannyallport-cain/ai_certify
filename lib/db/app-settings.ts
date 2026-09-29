import { inArray, sql } from 'drizzle-orm';

import { db } from './drizzle';
import { appSettings, type AppSetting } from './schema';

export type AppSettingRecord = AppSetting;

let tableReadyPromise: Promise<void> | null = null;

/**
 * Idempotently ensure the `app_settings` table exists. This keeps the settings
 * editor working on deployments where the generated migration has not yet been
 * applied, while `pnpm db:migrate` remains the source of truth.
 */
async function ensureAppSettingsTable(): Promise<void> {
  if (!tableReadyPromise) {
    tableReadyPromise = db
      .execute(sql`
        CREATE TABLE IF NOT EXISTS app_settings (
          key varchar(150) PRIMARY KEY,
          value text,
          updated_at timestamp NOT NULL DEFAULT now(),
          updated_by integer REFERENCES users(id) ON DELETE SET NULL
        )
      `)
      .then(() => undefined)
      .catch((error: unknown) => {
        tableReadyPromise = null;
        throw error;
      });
  }

  return tableReadyPromise;
}

/**
 * Read one or more application settings by key.
 * Returns a map keyed by setting name; missing keys are omitted.
 */
export async function getAppSettings(
  keys: string[]
): Promise<Record<string, AppSettingRecord>> {
  if (keys.length === 0) {
    return {};
  }

  await ensureAppSettingsTable();

  const rows = await db
    .select()
    .from(appSettings)
    .where(inArray(appSettings.key, keys));

  const result: Record<string, AppSettingRecord> = {};

  for (const row of rows) {
    result[row.key] = row;
  }

  return result;
}

export type UpsertAppSettingInput = {
  key: string;
  value: string | null;
  updatedBy?: number | null;
};

/**
 * Insert or update a batch of application settings in a single transaction.
 */
export async function upsertAppSettings(
  entries: UpsertAppSettingInput[]
): Promise<void> {
  if (entries.length === 0) {
    return;
  }

  await ensureAppSettingsTable();

  const now = new Date();

  await db.transaction(async (tx) => {
    for (const entry of entries) {
      await tx
        .insert(appSettings)
        .values({
          key: entry.key,
          value: entry.value,
          updatedAt: now,
          updatedBy: entry.updatedBy ?? null,
        })
        .onConflictDoUpdate({
          target: appSettings.key,
          set: {
            value: entry.value,
            updatedAt: now,
            updatedBy: entry.updatedBy ?? null,
          },
        });
    }
  });
}

/**
 * Remove stored overrides for the given keys. Removing an override reverts the
 * setting to its environment-variable fallback (if one is configured).
 */
export async function deleteAppSettings(keys: string[]): Promise<void> {
  if (keys.length === 0) {
    return;
  }

  await ensureAppSettingsTable();

  await db.delete(appSettings).where(inArray(appSettings.key, keys));
}
