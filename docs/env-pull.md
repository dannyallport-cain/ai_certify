# Pulling environment variables from Vercel and Railway

This project's runtime configuration lives in two places:

| Provider | Project | Environments | Services |
| --- | --- | --- | --- |
| Vercel | `ai_certify` (`prj_HGgrqErg3jhroBbAPHdwRJhdUkTv`) | `production`, `preview`, `development` | — |
| Railway | `Certify-AI` (`064bdc27-471a-4c21-8750-f50f4f4441c3`) | `production` | `Postgres`, `backup-worker`, `setup-pg-extensions`, `pg-install-extension`, `install-pg-stat-statements` |
| Railway | `ai-worker` (`af43b5df-8b7b-4a19-a845-6dbf0a8f8136`) | `production` | `ai-worker` |

The Next.js app runs on Vercel. Railway hosts the Postgres database, the
`backup-worker` that produces `pg_dump` backups, and the `ai-worker` FastAPI
service. Railway variables are scoped **per service**, which is why Vercel and
Railway values are not interchangeable.

## Quick start

```bash
./scripts/pull-env.sh
```

The script verifies both CLIs are installed and authenticated, then writes:

```
.env.vercel.production
.env.vercel.preview
.env.vercel.development
.env.railway.postgres.production
.env.railway.backup-worker.production
.env.railway.setup-pg-extensions.production
.env.railway.pg-install-extension.production
.env.railway.install-pg-stat-statements.production
.env.railway.ai-worker.production
```

Every file matches the `.env*` rule in `.gitignore` and must never be committed.

`.env.pulled` is a hand-maintained consolidated snapshot (production values,
with the Railway service values namespaced by prefix). Re-generate it by hand
after a refresh if you rely on it.

## Manual commands

```bash
# Vercel — one environment at a time
vercel env pull .env.vercel.production  --environment=production  --yes
vercel env pull .env.vercel.preview     --environment=preview     --yes
vercel env pull .env.vercel.development --environment=development --yes

# Railway — one service at a time (--kv prints raw values)
railway variables \
  --project 064bdc27-471a-4c21-8750-f50f4f4441c3 \
  --service backup-worker \
  --environment production \
  --kv > .env.railway.backup-worker.production
```

`railway variables` only resolves variables for the project/environment that is
linked or explicitly passed with `--project`. `railway status` shows which
project and service the current directory is linked to.

## Vercel "Secret" variables cannot be exported

Seven production variables are stored by Vercel as **Secret** type. Vercel
encrypts them at rest and never exposes the plaintext again — not through the
CLI, the REST API, nor the dashboard. `vercel env pull` writes the literal
string `[SENSITIVE]` in their place:

- `BASE_URL`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_APP_URL`
- `SERVICEM8_ACTIVATION_URL`
- `SERVICEM8_APP_ID`
- `SERVICEM8_APP_SECRET`
- `SERVICEM8_CALLBACK_URL`

Recovering them means re-creating the values:

1. The three URL variables are derivable from the deployment domain
   (`https://ai-certificates.app`).
2. The four `SERVICEM8_*` values come from the ServiceM8 developer dashboard
   for the app registered against this project. `SERVICEM8_CALLBACK_URL` is this
   app's own callback route; see `app/api/servicem8/callback/route.ts`.

Once the plaintext is known, either update the Vercel variable with the value
and clear the Secret flag, or keep the value only in local `.env` files.

## Known discrepancy: two Postgres endpoints

`DATABASE_URL` / `POSTGRES_URL` on Vercel point at
`nozomi.proxy.rlwy.net:37487`. The live `Certify-AI` Postgres service currently
exposes its TCP proxy at `shuttle.proxy.rlwy.net:13823` with a different
password, plus a private address `postgres.railway.internal:5432` that is only
reachable inside Railway.

These are different endpoints. Confirm which database production actually
reads before pointing a local run at either one — connecting the app to the
wrong instance will silently operate on stale data.

## Refreshing .env.local

`./scripts/pull-env.sh` never touches `.env.local`. To refresh it, back it up
first (the pull overwrites everything it writes to):

```bash
cp .env.local ".env.local.backup-$(date +%Y%m%d-%H%M%S)"
vercel env pull .env.local --environment=development --yes
```

Then re-add any local-only overrides such as `NEXTAUTH_URL=http://localhost:4000`.
