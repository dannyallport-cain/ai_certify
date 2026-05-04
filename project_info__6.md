# AI Certify — ServiceM8 Integration Overview

## Summary
AI Certify is a Next.js 15 application for creating and managing fire/electrical certificates, with a fairly deep ServiceM8 integration layered on top of its normal certificate workflow. The ServiceM8 side is not just a one-off API call: it includes OAuth, token storage and refresh, client/job sync endpoints, webhook handling, a background sync processor, and EICR form integration for linking certificates to ServiceM8 jobs.

For the specific “connect to ServiceM8” problem, the codebase contains several working pieces but also a few hidden fault lines: environment-derived redirect URLs, a mixed team/user ownership model for the stored connection, and a callback flow that depends on the current local session. Those are the first things to verify when connection appears to succeed in one place but fail in another.

## Architecture
The app is a layered Next.js application:

- **Presentation layer**: React pages and components under `app/` and `components/`
- **Server layer**: App Router route handlers under `app/api/**`, plus server actions in `app/(dashboard)/actions.ts`
- **Integration layer**: `lib/servicem8/*` wraps OAuth, API calls, attachment upload, and sync processing
- **Persistence layer**: Drizzle ORM schema and queries in `lib/db/schema.ts` and `lib/db/queries.ts`

The ServiceM8 integration is effectively a small subsystem inside the app:

1. `public/servicem8-external-manifest.json` advertises the add-on to ServiceM8.
2. `app/api/servicem8/activate` starts OAuth.
3. `app/api/servicem8/callback` exchanges the code for tokens and stores them.
4. `lib/servicem8/client.ts` performs authenticated ServiceM8 REST calls and refreshes tokens.
5. `lib/servicem8/sync.ts` processes job mappings, field sync, and PDF attachment upload.
6. UI pages (`app/(dashboard)/dashboard/servicem8/page.tsx` and the EICR form) consume the API.

The runtime entry point for a user is usually the dashboard page. For ServiceM8 specifically, the important runtime loops are:

- OAuth redirect loop: connect button → ServiceM8 auth page → callback → stored connection
- Sync loop: webhook marks mappings pending → cron/server action runs sync processor → local records update and PDFs may upload

## Directory Structure

```text
project-root/
├── app/
│   ├── api/
│   │   └── servicem8/           — OAuth, connection, job/client APIs, webhooks
│   ├── (dashboard)/
│   │   ├── dashboard/servicem8/ — ServiceM8 admin UI
│   │   ├── certificates/new/eicr — EICR form with job linking
│   │   └── actions.ts           — certificate creation/update server actions
├── lib/
│   ├── servicem8/               — config, client, sync processor
│   ├── db/                      — schema, queries, persistence helpers
│   └── auth/                    — session and mobile auth helpers
├── public/
│   └── servicem8-external-manifest.json — ServiceM8 add-on manifest
└── vercel.json                  — cron schedule for ServiceM8 sync
```

## Key Abstractions

### `SERVICEM8_CONFIG`
- **File**: `lib/servicem8/config.ts`
- **Responsibility**: Centralizes ServiceM8 OAuth endpoints, API base URL, scopes, and callback/activation URLs.
- **Interface**:
  - `appId`, `appSecret` read from `SERVICEM8_APP_ID` / `SERVICEM8_APP_SECRET`
  - `callbackUrl` and `activationUrl` derive from env or from `NEXTAUTH_URL` / `BASE_URL` / `NEXT_PUBLIC_APP_URL`
  - `scopes` returns `read_jobs read_customers`, or adds `write_jobs` when enabled
- **Why it matters**: This is the first place to check when OAuth redirects go to the wrong host or ServiceM8 rejects scopes.

### `ServiceM8Client_API`
- **File**: `lib/servicem8/client.ts`
- **Responsibility**: Authenticated REST client for ServiceM8, including token refresh and attachment upload.
- **Interface**:
  - `fromUserId(userId)` / `fromTeamId(teamId)` load stored credentials
  - `exchangeCode(code)` exchanges the OAuth code for tokens
  - `refreshAccessToken()` refreshes and persists rotated tokens
  - job/client CRUD and read methods: `getJobs`, `getJob`, `getClients`, `getClient`, `getCompanyInfo`, `getJobAttachments`, `uploadJobAttachment`, etc.
- **Why it matters**: Every ServiceM8-facing route depends on this class, so any token, scope, or endpoint bug shows up here first.

### `servicem8_connections`
- **File**: `lib/db/schema.ts`
- **Responsibility**: Stores one ServiceM8 credential row per user, with team association, access/refresh tokens, sync flags, and timestamps.
- **Important fields**:
  - `userId` is unique
  - `teamId` is also stored
  - `syncEnabled`, `syncDirection`, `lastSyncAt`, `servicem8AccountUuid`, `servicem8CompanyName`
- **Why it matters**: The app mixes user-scoped and team-scoped lookups, so this table is central to the “connected vs. actually usable” problem.

### `servicem8_job_mappings`
- **File**: `lib/db/schema.ts`
- **Responsibility**: Links a local certificate to a ServiceM8 job and tracks sync state.
- **Important fields**:
  - `certificateId`
  - `servicem8JobUuid`
  - `servicem8ConnectionUserId`
  - `syncStatus` (`synced`, `pending`, `error`)
- **Why it matters**: This is what the sync processor consumes; webhooks only mark these rows pending.

### `processServiceM8JobMapping` / `processPendingServiceM8Syncs`
- **File**: `lib/servicem8/sync.ts`
- **Responsibility**: Applies job-to-certificate field sync, optionally uploads completed PDFs, and updates sync state.
- **Interface**:
  - `processServiceM8JobMapping(mappingId, { pdfBytes? })`
  - `processPendingServiceM8Syncs(limit = 25)`
- **Why it matters**: This is the real workhorse after the OAuth connection exists. It is also where read-vs-write direction is enforced.

### OAuth route pair: `activate` and `callback`
- **Files**: `app/api/servicem8/activate/route.ts`, `app/api/servicem8/callback/route.ts`
- **Responsibility**: Start OAuth, validate state, exchange the code, and persist tokens.
- **Why it matters**: If connection is “still not working,” this is the path to inspect first.

### EICR integration page
- **File**: `app/(dashboard)/certificates/new/eicr/page.tsx`
- **Responsibility**: Large certificate form that now includes a ServiceM8 job selector and hidden `servicem8JobUuid` field.
- **Why it matters**: This is where the job link is captured and passed into `createCertificate`.

## Data Flow

### 1) Connect flow
1. User clicks **Connect to ServiceM8** in `app/(dashboard)/dashboard/servicem8/page.tsx`.
2. Browser navigates to `GET /api/servicem8/activate`.
3. `activate/route.ts` generates a CSRF state token and redirects to `https://go.servicem8.com/oauth/authorize`.
4. ServiceM8 sends the user back to `GET /api/servicem8/callback?code=...&state=...`.
5. `callback/route.ts` exchanges the code for tokens using `SERVICEM8_CONFIG.appId` and `appSecret`.
6. The route fetches company info and upserts `servicem8_connections`.
7. If the user is not signed in, the token is stashed in a temporary cookie and the user is sent through a sign-in completion step.

### 2) Read/sync flow
1. Dashboard tabs and mobile endpoints call `ServiceM8Client_API.fromUserId(userId)`.
2. The client loads the stored connection and refreshes expired tokens automatically.
3. `/api/servicem8/jobs` and `/api/servicem8/clients` fetch live ServiceM8 data.
4. The EICR form loads `/api/servicem8/jobs` to populate the ServiceM8 job selector.

### 3) Certificate creation flow
1. The EICR form writes `servicem8JobUuid` into the submitted `FormData`.
2. `createCertificate` in `app/(dashboard)/actions.ts` stores the certificate and copies the selected job UUID into `servicem8_job_mappings`.
3. The mapping is immediately processed by `processServiceM8JobMapping`.
4. If the certificate is completed and `write_jobs` is enabled, the generated PDF can be uploaded to the linked ServiceM8 job.

### 4) Webhook / background sync flow
1. ServiceM8 webhook hits `POST /api/servicem8/webhook`.
2. The route finds the matching connection via `servicem8_account_uuid`.
3. Matching job/company mappings are marked `pending`.
4. `vercel.json` schedules `/api/cron/servicem8-sync`.
5. The sync processor drains pending mappings and applies sync/update logic.

## Non-Obvious Behaviors & Design Decisions

### Hidden invariant: the connection model is not consistently scoped
The UI connection status route is team-scoped, but the operational client lookup is user-scoped in many web routes. That means one team member can see “connected” while another gets `ServiceM8 not connected` from jobs/clients routes if they were not the user who owns the active row.

This is the most important subtlety in the codebase for a “connection still not working” complaint.

### OAuth callback requires local session continuity
If ServiceM8 returns before the user has a valid app session, the callback stores tokens in `sm8_pending_token` and redirects the user to sign in. That makes the flow resilient, but it also means cookie/domain/session issues can make the integration appear broken even when the external OAuth step succeeded.

### Environment URL precedence can silently point OAuth at the wrong place
`SERVICEM8_CONFIG.callbackUrl` and `activationUrl` prefer `NEXTAUTH_URL`, then `BASE_URL`, then `NEXT_PUBLIC_APP_URL`, then localhost. A stale or misconfigured `NEXTAUTH_URL` will silently override the correct public deployment URL and break the redirect chain.

### The manifest and runtime scopes must stay aligned
The published manifest file currently declares only `read_jobs read_customers`. The runtime config can optionally add `write_jobs`, but that only works if ServiceM8 has granted it and the addon configuration is aligned. That is a likely blocker for PDF upload, not for basic connect, but it is easy to confuse the two.

### Sync is intentionally split into “mark pending” and “process later”
Webhooks do not perform expensive sync work directly. They only mark mappings pending so a cron job or manual processor can handle the actual API calls. If pending rows are never processed, the webhook path will look healthy while no real data changes arrive locally.

### PDF upload is guarded by both feature flag and deduping
The upload helper only runs when `SERVICEM8_ENABLE_WRITE_JOBS=true`, and it checks existing attachments by filename before uploading again. That avoids duplicate PDFs, but it also means the integration can quietly skip uploads if the feature flag is off.

### The EICR page already supports ServiceM8 linking
This codebase is past the “missing UI” phase. The form already exposes a ServiceM8 job select and writes `servicem8JobUuid` into the submit payload, so connection issues are more likely backend/auth/config related than form integration related.

## Likely Reasons “Connect to ServiceM8” Still Fails

1. **Wrong callback URL in production**
   - `NEXTAUTH_URL` / `BASE_URL` may still be pointing at localhost or an outdated domain.
   - ServiceM8 will redirect to the exact registered callback URL; if the app generates the wrong one, OAuth completes externally but never returns correctly.

2. **User/team ownership mismatch**
   - The connection row is team-aware, but API routes like jobs/clients often resolve the client by `userId`.
   - If another user in the same team tries to use the integration, the dashboard can say “connected” while API calls fail.

3. **Missing session at callback time**
   - If the browser loses cookies during the OAuth round trip, the callback can only stash a pending token.
   - If the sign-in completion step doesn’t restore the session cleanly, the connection never finalizes.

4. **Missing ServiceM8 app credentials**
   - `SERVICEM8_APP_ID` and `SERVICEM8_APP_SECRET` are mandatory and will throw if absent.
   - This usually surfaces as a server error during activation or callback.

5. **Scope mismatch**
   - Basic connect uses read-only scopes, which match the manifest.
   - If write access is enabled in env but the ServiceM8 app config still only allows read scopes, OAuth may fail with invalid scope errors.

## Module Reference

| File | Purpose |
|---|---|
| `public/servicem8-external-manifest.json` | ServiceM8 add-on manifest and declared OAuth scope |
| `lib/servicem8/config.ts` | Env-driven OAuth and API configuration |
| `lib/servicem8/client.ts` | ServiceM8 REST client, token refresh, attachment upload |
| `lib/servicem8/sync.ts` | Mapping processor, PDF upload gating, cron-friendly sync loop |
| `lib/db/schema.ts` | `servicem8_connections`, mappings, and related database tables |
| `lib/db/queries.ts` | Auth/team resolution and certificate lookup helpers |
| `app/api/servicem8/activate/route.ts` | Starts the OAuth flow |
| `app/api/servicem8/callback/route.ts` | Exchanges code and stores tokens |
| `app/api/servicem8/connection/route.ts` | Connection status, disconnect, sync settings |
| `app/api/servicem8/clients/route.ts` | List/import/link/export ServiceM8 clients |
| `app/api/servicem8/jobs/route.ts` | List/link/create ServiceM8 jobs |
| `app/api/servicem8/webhook/route.ts` | Marks job/company mappings pending on webhook |
| `app/api/mobile/servicem8/_shared.ts` | Mobile auth + normalization helpers |
| `app/api/mobile/servicem8/connection/route.ts` | Mobile ServiceM8 connection status |
| `app/(dashboard)/dashboard/servicem8/page.tsx` | ServiceM8 admin dashboard |
| `app/(dashboard)/certificates/new/eicr/page.tsx` | EICR form with ServiceM8 job selection |
| `app/(dashboard)/actions.ts` | Certificate creation/update and ServiceM8 mapping sync |
| `vercel.json` | Cron schedule for `servicem8-sync` |

## Suggested Reading Order

1. `lib/servicem8/config.ts` — establishes the URL and scope rules that the whole integration depends on.
2. `app/api/servicem8/callback/route.ts` — shows how the OAuth result becomes a persisted connection.
3. `lib/servicem8/client.ts` — explains how every ServiceM8 request is authenticated and refreshed.
4. `lib/servicem8/sync.ts` — shows how mappings, PDF uploads, and sync direction interact.
5. `app/(dashboard)/actions.ts` — demonstrates how certificates are linked to ServiceM8 jobs during create/update.
6. `app/(dashboard)/dashboard/servicem8/page.tsx` — shows the UI surface users interact with when connecting and checking status.
