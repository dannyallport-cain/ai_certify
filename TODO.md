# Repair Plan — R2 Login Credentials / DB Backups & Restore

- [x] Inspect R2 storage and admin database backup/restore API routes
- [x] Confirm root cause around strict env-var naming for R2 credentials
- [x] Create repair todo list
- [x] Update `lib/storage/r2.ts` to support fallback credential env names
- [x] Improve error diagnostics in `app/api/admin/r2/test/route.ts`
- [x] Improve error diagnostics in `app/api/admin/database/backups/route.ts`
- [x] Harden restore config handling in `app/api/admin/database/restore/route.ts`
- [x] Run focused validation (typecheck/lint) for touched files
