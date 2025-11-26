# Operational Policies

## 1. No-Deletion Safeguard
- **Rule:** Do not delete or overwrite existing files or configuration values without explicit approval from the repository owner.
- **Process:** Before any change that could remove content, a summary of the intended modification must be provided and approved.
- **Scope:** Applies to all files, especially environment/configuration files (`.env`, `.env.example`, secrets, CI configs).

## 2. Environment Backups
- Run `pnpm backup:env` before modifying any environment file. This command snapshots `.env` and `.env.example` into timestamped folders under `backups/env/`.
- Backups are ignored by git to prevent accidental commits of secrets.

## 3. Automated Daily Backups
- A GitHub Actions workflow (`daily-backup.yml`) archives the repository once per day and uploads the archive as a build artifact.
- Artifacts are retained for 30 days and can be downloaded from the Actions tab if recovery is needed.

Adhering to these policies ensures repeatable, auditable changes and protects sensitive configuration from accidental loss.
