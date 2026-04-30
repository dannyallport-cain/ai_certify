# AI Certify

A Next.js 15 application for generating and managing electrical certificates and reports with AI-assisted document analysis, backed by PostgreSQL on Railway and Cloudflare R2 object storage.

## Features

- Certificate and report generation workflows
- AI-assisted document/image analysis via a Railway worker
- PostgreSQL database with Drizzle ORM
- Cloudflare R2 storage for generated assets and backups
- Vercel deployment for the web app and cron routes

## Tech Stack

- Next.js 15 App Router
- TypeScript
- PostgreSQL
- Drizzle ORM
- Cloudflare R2
- Vercel
- Railway
- FastAPI

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Copy environment variables:
   ```bash
   cp ".env copy.example" .env
   ```

3. Start local development:
   ```bash
   pnpm dev
   ```

## Deployment Overview

- Vercel hosts the Next.js app and cron trigger route
- Railway hosts the Python worker
- Railway Postgres stores application data
- Cloudflare R2 stores uploaded files and database backups

## Project Dataflow Diagram

- [View the project dataflow diagram](docs/dataflow-diagram.md)

## Database Backup Architecture

The old GitHub daily backup workflow has been removed.

Backups now run every 6 hours using the deployed app infrastructure:

1. Vercel Cron calls `GET /api/cron/db-backup`
2. The Next.js route validates the cron request
3. The Next.js app sends `POST ${RAILWAY_BACKUP_WORKER_URL}/backup-database`
4. The Railway worker validates `X-Backup-Token`
5. The Railway worker runs `pg_dump` against `POSTGRES_URL` or `DATABASE_URL`
6. The dump is compressed to a real PostgreSQL `.sql.gz` file
7. The file is uploaded to Cloudflare R2

This produces a real `pg_dump`-generated PostgreSQL backup, not an application-level export.

### R2 object path format

```text
database-backups/YYYY/MM/ai-certify-db-YYYYMMDD-HHMMSS.sql.gz
```

Example:

```text
database-backups/2026/04/ai-certify-db-20260408-120000.sql.gz
```

## Backup Setup

### Vercel environment variables

- `RAILWAY_BACKUP_WORKER_URL` — Railway worker base URL, no trailing slash
- `BACKUP_SHARED_SECRET` — shared secret sent to Railway as `X-Backup-Token`
- `CRON_SECRET` — optional but recommended; Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`

### Railway worker environment variables

- `BACKUP_SHARED_SECRET` — must exactly match the Vercel value
- `POSTGRES_URL` or `DATABASE_URL` — PostgreSQL connection string for `pg_dump`
- `R2_ACCOUNT_ID`
- `R2_BUCKET`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_PUBLIC_BASE_URL` — optional

### Security headers

- Vercel Cron → Next.js route:
  - `Authorization: Bearer ${CRON_SECRET}` when `CRON_SECRET` is configured
- Next.js route → Railway worker:
  - `X-Backup-Token: ${BACKUP_SHARED_SECRET}`

## Notes

- Keep `RAILWAY_BACKUP_WORKER_URL` pointed at the Railway worker root URL with no trailing slash.
- The actual backup job must run on Railway so `pg_dump` can be installed and executed there.
- Existing AI worker endpoints such as `/health` and `/analyze-image` remain available alongside the backup endpoint.
