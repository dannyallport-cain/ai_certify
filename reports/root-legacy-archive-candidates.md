# Root-level legacy/archive candidate assessment

Scope: root-level files only. This report classifies likely legacy or unused files that appear safe to archive later, and explicitly excludes high-risk/current-app files.

Context checked:
- `package.json`
- `README.md`
- root-level file list

## Summary

The current app is a Next.js 15 App Router app with active runtime/build/deploy roots including `app/`, `components/`, `lib/`, `public/`, `types/`, `next.config.ts`, `drizzle.config.ts`, `vercel.json`, and the Railway worker integration described in `README.md`.

At the root, there is a large collection of one-off debug scripts, patch scripts, test scripts, loose sample/reference PDFs, screenshots, logs, and historical docs. Most of these are not wired into `package.json` scripts, are not part of documented deployment flow, and look like manual troubleshooting or historical implementation artifacts.

## Likely safe archive candidates

### 1) One-off debug and investigation scripts

These are not referenced by `package.json`, appear ad hoc, and are clearly diagnostic/manual:

- `certificate-debug-report.js`
  - Prints a static troubleshooting summary for local auth/certificate visibility.
- `debug-certs.js`
  - Direct DB inspection helper for certificates/teams/users.
- `debug-certs.mjs`
  - ESM variant of the same DB inspection helper.

### 2) Patch/migration-by-file-rewrite scripts

These directly mutate source files in place and look like temporary local fixups rather than maintained tooling:

- `patch_circuit.js`
  - Regex-rewrites `lib/pdf/generator.ts`.
- `patch_colors.js`
  - Regex-rewrites `lib/pdf/generator.ts`.
- `patch_state.js`
  - Regex-rewrites `app/(dashboard)/admin/reports/disseminator/page.tsx`.
- `patch_types.js`
  - Regex-rewrites `app/(dashboard)/admin/reports/disseminator/page.tsx`.
- `run_fix.js`
  - Another source-rewrite script for `lib/pdf/generator.ts`.

Reasoning:
- Not listed in `package.json`.
- Unsafe as recurring operational tooling.
- Strong signal of temporary local intervention after a bug/layout issue.

### 3) One-off PDF/layout analysis scripts

These inspect sample PDFs and page geometry; they look like historical reverse-engineering tools:

- `analyze-circuit-table.py`
- `analyze-circuit-table2.py`
- `analyze-layout.py`

Reasoning:
- Hard-coded sample PDF filenames.
- Not part of app runtime/build.
- Pure offline analysis utilities.

### 4) Root-level manual test scripts and ad hoc generators

These appear to be local/manual experiments rather than current automated test infrastructure:

- `test-auto-extract.js`
- `test-color-pdf.js`
- `test-comprehensive-fire-detection.js`
- `test-db-templates.mjs`
- `test-eicr-gen-setup.js`
- `test-eicr-gen.ts`
- `test-fire-detection-pdf.js`
- `test-pdf-generation.js`
- `test-pdf-parse.mjs`
- `test-pdf.js`
- `test-pdf.ts`
- `test-workflow.sh`

Reasoning:
- Not wired into `package.json` test scripts.
- Several depend on local manual behavior or hard-coded sample files.
- Several are clearly exploratory validation for PDF generation and report dissemination work.

### 5) Loose logs / extracted text / local artifacts

These are classic archive-or-delete style local byproducts, not source-of-truth app code:

- `dev.log`
- `log.txt`
- `eicr_extracted_text.txt`
- `tsconfig.tsbuildinfo`
- `.DS_Store`

Reasoning:
- Generated/local machine artifacts.
- Not part of runtime or deployment.

### 6) Loose sample/reference/customer PDFs likely used for historical testing only

These appear to be reference documents or test fixtures sitting at root, not app runtime assets:

- `146 Fitzwarren Street_Vincente Dos Santos_CE202706_SATISFACTORY.pdf`
- `26 The Sheddings_R Sandford_CE202692_SATISFACTORY.pdf`
- `86 Knott Lane_Gillian Crowley_CA202751a_SATISFACTORY.pdf`
- `ESN3_04969916_Certificate.pdf`
- `Fire detection and alarm system inspection and servicing report.pdf`
- `Marsh Lane_(Highfield Hall Community Centre)_CE-3948573_SATISFACTORY.pdf`
- `Marsh Lane_Highfield Hall Community Centre_CE202702 FIRE_SATISFACTORY.pdf`
- `Marsh Lane_Highfield Hall Community Centre__SATISFACTORY.pdf`
- `_Highfield Hall Community Centre_CE202695_SATISFACTORY.pdf`
- `test-comprehensive-fire-detection-report.pdf`
- `test-rotate.pdf`

Reasoning:
- Hard-coded sample/reference documents.
- Not part of documented runtime/deploy flow.
- Multiple analysis/test scripts reference root-level PDFs directly, which is a sign they are developer fixtures.

### 7) Loose standards/reference PDFs and cloud placeholders

These appear to be downloaded reference material, not app assets:

- `18th edition IET wiring regulations. Electric wiring for domestic installers ( PDFDrive ).pdf`
- `BS 7671 2018 ( PDFDrive ).pdf`
- `On-Site Guide (BS 7671_2018) (Electrical Regulations) ( PDFDrive ).pdf`
- `Guidance Note 3 Inspection & Testing 18th ( PDFDrive ).pdf`
- `bs-7671-2018_a1_2020-inc-corrigendum-may-2020_read-only.pdf`
- `bs7671-eicr.pdf`
- `.BS 7671 2018 ( PDFDrive ).pdf.icloud`
- `.On-Site Guide (BS 7671_2018) (Electrical Regulations) ( PDFDrive ).pdf.icloud`

Reasoning:
- Root-level loose reference library.
- Not imported by the app.
- `.icloud` files are definitely local sync placeholders.

### 8) Loose screenshots/images/branding files not obviously wired into current app

These are candidates, but slightly lower confidence than logs/scripts because some images could still be manually referenced in docs or future work:

- `speedcert-fullpage.png`
- `sysadmin-login-fail.png`
- `BAFE-DS301-Domestic-Scheme.webp`
- `ECA-logo-NEW.jpg`
- `NAPIT Phenna Logo.svg`
- `NAPIT-Member-Logo -Electrical-1080x1080.webp`

Reasoning:
- Root-level loose image assets rather than being under `public/`.
- No evidence from checked project entry points that these are required by current runtime.
- Good archive candidates if not referenced elsewhere.

### 9) Historical/setup/process documentation likely not required for current runtime

These look like implementation notes, handoff docs, or historical setup instructions rather than current source code:

- `AZURE_SETUP.md`
- `CODEBASE_EXPLORATION_SUMMARY.md`
- `FIRE_DETECTION_README.md`
- `LIVE_PREVIEW_GUIDE.md`
- `POLICIES.md`
- `SETUP_COMPLETE.md`
- `SPEEDCERT_ANALYSIS.md`
- `TEST_CREDENTIALS.md`
- `TODO.md`

Reasoning:
- Not part of app execution.
- Several names suggest historical milestone docs or exploratory notes.
- Safe to archive if the team wants a cleaner root.

### 10) Sensitive or legacy operational miscellany that should be reviewed for secure archival

These are likely not needed by the current app, but they are sensitive enough that they should be archived carefully, not casually shared:

- `.vercel.cron-secret.txt`
  - Secret file; likely superseded by environment variables and `vercel.json`.
- `.vercel.backup.env`
  - Likely historical/local backup env file.
- `users.txt`
  - Potentially sensitive local notes/credentials/user list.
- `ai_certify.code-workspace`
  - Editor-local workspace config.

Reasoning:
- Not part of runtime.
- Sensitive or workstation-specific.
- Good archive candidates, but treat securely.

## Needs extra caution before archiving

These look legacy-ish, but I would verify with search/reference checks before moving:

- `add_email_dns.sh`
  - Contains embedded Cloudflare credentials and hard-coded domain operations.
  - Very likely legacy and unsafe to keep, but could still reflect a one-time provisioning process someone relies on for reference.
- `add_vercel_dns.sh`
  - Interactive provisioning helper for Cloudflare/Vercel DNS.
  - Probably not current app runtime, but could still be kept as ops helper.
- `start-webhook.sh`
  - Local Stripe CLI helper.
  - Not part of production runtime, but still potentially useful for local development.
- `pipeline.py`
  - Root-level Python module that imports `app.schemas`; could be part of historical/alternate AI worker work.
  - Since the project currently includes `railway-ai-worker/` and README documents Railway/FastAPI AI analysis, this root file should not be auto-archived without checking whether it belongs to an abandoned prototype or an active worker path.
- `actions.ts`
  - Root barrel re-export: `export * from './app/(dashboard)/actions';`
  - Even though no direct import was found in the limited check done here, this kind of file can exist for path stability and external imports. Do not classify as safe root legacy yet.

## Explicit high-risk exclusions from archive candidate list

These should be treated as current app/build/deploy files and excluded from root legacy cleanup:

- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `tsconfig.json`
- `next-env.d.ts`
- `next.config.ts`
- `postcss.config.mjs`
- `drizzle.config.ts`
- `vercel.json`
- `.env`
- `.env copy.example`
- `.env.servicem8.example`
- `.gitignore`
- `README.md`
- `components.json`

Also exclude current app/deploy directories from root-legacy archiving decisions here:

- `app/`
- `components/`
- `lib/`
- `public/`
- `types/`
- `scripts/`
- `railway-ai-worker/`
- `mobile/`
- `reports/`
- `certificates/`
- `backups/`
- `test-results/`
- `tmp/`
- `.github/`

And local dependency/build folders should not be “archived as legacy” in the same sense; they are generated or environment-specific:

- `node_modules/`
- `.next/`
- `.vercel/`
- `.expo/`
- `.cursor/`
- `.git/`
- `.sixth/`

## Recommended archive priority

### High-confidence archive candidates
- Debug/investigation scripts
- Patch scripts
- Analysis scripts
- Loose logs/text artifacts
- Historical docs
- Sample/reference PDFs at root
- `.icloud` placeholders
- editor/local files like `.DS_Store` and workspace config

### Medium-confidence archive candidates
- Loose root images/branding assets
- DNS helper scripts
- local Stripe helper script
- secret/env backup text files, with secure handling

### Hold for verification
- `pipeline.py`
- `actions.ts`

## Notes

This report is intentionally conservative. A few items are almost certainly unused but were left in caution buckets because the parent task requested safety first.