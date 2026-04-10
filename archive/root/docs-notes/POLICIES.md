# Operational Policies

## 1. No-Deletion Safeguard
- **Rule:** Do not delete or overwrite existing files or configuration values without explicit approval from the repository owner.
- **Process:** Before any change that could remove content, a summary of the intended modification must be provided and approved.
- **Scope:** Applies to all files, especially environment/configuration files (`.env`, `.env.example`, secrets, CI configs).

## 2. Environment Backups
- Run `pnpm backup:env` before modifying any environment file. This command snapshots `.env` and `.env.example` into timestamped folders under `backups/env/`.
- Backups are ignored by git to prevent accidental commits of secrets.

## 3. Automated Database Backups
- The previous GitHub Actions daily backup flow has been removed.
- Database backups now run every 6 hours through the deployed infrastructure:
  1. Vercel Cron calls `/api/cron/db-backup`
  2. The Next.js route forwards the request to the Railway worker
  3. The Railway worker runs `pg_dump`, gzips the dump, and uploads it to Cloudflare R2
- This design is required so backups are real PostgreSQL `.sql.gz` dumps produced by `pg_dump`, rather than app-level exports.

Adhering to these policies ensures repeatable, auditable changes and protects sensitive configuration from accidental loss.
