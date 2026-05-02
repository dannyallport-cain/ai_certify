# AI Certify — Codebase Overview

## Summary
AI Certify is a Next.js 15 application for fire-safety and electrical certificate management, with admin workflows for customers, certificates, report templates, ServiceM8 integration, mobile asset capture, and AI-assisted document/image analysis. The system is backed by PostgreSQL via Drizzle ORM, uses Cloudflare R2 for user assets and backups, and delegates some analysis to external AI services or a Railway-hosted Python worker.

The biggest thing a new developer needs to know is that this codebase is integration-heavy: many features depend on remote services, environment variables, and authenticated team scoping. Most “connection problems” are not a single bug; they are usually the visible result of missing credentials, an unreachable worker/API, or a route that intentionally falls back only in limited cases.

## Architecture
### Primary pattern
The app is a layered Next.js App Router application:
- **Server-rendered pages and layouts** for authenticated dashboard areas.
- **Route handlers** for CRUD, integrations, cron jobs, and AI endpoints.
- **Server actions** for certificate/customer mutations.
- **Client components** for interactive settings, mobile capture, and admin dashboards.
- **Shared domain modules** under `lib/` for auth, database access, field analysis, PDF logic, and external-service adapters.

### Major subsystems
1. **Web app shell and marketing site**
   - `app/layout.tsx` defines global metadata and SWR context.
   - `app/page.tsx` is a landing page for the product.
   - `app/(dashboard)/layout.tsx` protects authenticated dashboard routes.
   - `app/(dashboard)/app-shell.tsx` renders the authenticated header, ServiceM8 status, and admin/user view toggle.

2. **Database and identity**
   - `lib/db/schema.ts` is the canonical data model.
   - `lib/db/queries.ts` is the main data-access layer, including session lookup, team resolution, and admin helpers.
   - Auth is cookie/session-based, with team membership auto-created when needed.

3. **Certificates and reporting**
   - `actions.ts` contains server actions for customers and certificates.
   - `app/api/admin/report-disseminator/*` manages PDF template ingestion, field extraction, versioning, and generated reports.
   - `lib/report-disseminator/*` contains the rules for interpreting PDF fields, normalizing them, and enriching them with AcroForm placements.

4. **AI and document analysis**
   - `app/api/ai/analyze-image/route.ts` performs local OCR + rule evaluation + OpenRouter calls.
   - `app/api/admin/llm-test/route.ts` forwards admin image-analysis tests to the Railway worker when configured, otherwise falls back locally.
   - `lib/ai/railway-client.ts` is the client for the Python worker’s `/analyze-image` endpoint.
   - `lib/openrouter.ts` is the OpenRouter client used by OCR/inspection analysis.

5. **Mobile workflows**
   - `app/api/user/mobile-capture/session/route.ts` creates short-lived JWT links for avatar/signature capture.
   - `app/api/user/mobile-capture/route.ts` accepts uploaded data URLs and stores them in DB/R2.
   - `components/settings/MobileCaptureClient.tsx` is the browser-side capture UI.
   - `components/settings/ProfileMediaSettings.tsx` manages QR-code generation and polling for completion.

6. **Integrations**
   - ServiceM8 connection and sync live under `app/api/servicem8/*` and `lib/servicem8/*`.
   - Stripe billing and purchase entitlements are modeled in `lib/db/schema.ts` and queried in `lib/db/queries.ts`.
   - Cron-based database backups live under `app/api/cron/db-backup`.

### Runtime characteristics
- **Language/runtime:** TypeScript on Node.js, with Next.js 15 App Router.
- **State model:** mostly stateless server routes, with database persistence and a few client-side UI state machines.
- **Concurrency model:** request/response handlers plus SWR polling on the client. There is no central event bus or queue in the inspected code paths.
- **Deployment assumptions:** Vercel hosts the web app, Railway hosts at least one AI worker, PostgreSQL is remote, and R2 is used for file storage/backups.

### How execution starts
- Public traffic lands in `app/page.tsx` or authenticated dashboard routes.
- Dashboard routes are gated by `app/(dashboard)/layout.tsx`, which redirects unauthenticated users to `/sign-in`.
- Once inside the dashboard, `AppShell` renders the header, navigation, and admin view toggle.
- Backend work happens through route handlers and server actions rather than long-lived server processes.

## Directory Structure
```text
project-root/
├── app/
│   ├── (dashboard)/         — Authenticated app shell, dashboard pages, server actions
│   ├── (login)/             — Sign-in/sign-out flow
│   ├── api/                 — Route handlers for auth, certificates, customers, AI, ServiceM8, reports, cron jobs
│   ├── ai-analysis/         — AI analysis UI
│   ├── mobile-capture/      — Mobile capture page
│   ├── admin/               — Admin pages
│   └── page.tsx             — Landing page
├── components/
│   ├── settings/            — Mobile capture and branding settings panels
│   ├── admin/               — Admin UI components
│   ├── ai/                   — AI-related UI
│   ├── landing/              — Marketing site components
│   └── ui/                   — Shared design-system primitives
├── lib/
│   ├── db/                   — Schema, queries, setup, and migrations
│   ├── auth/                 — Session, role, and mobile-capture auth helpers
│   ├── report-disseminator/  — PDF field analysis and template/report schema
│   ├── ai/                   — Railway worker client
│   ├── payments/             — Stripe helpers
│   ├── servicem8/            — ServiceM8 sync/client logic
│   ├── storage/              — R2 helpers
│   └── utils/                — Shared utilities
├── mobile/                   — Separate Expo/mobile app
├── railway-ai-worker/        — Python/FastAPI worker for AI endpoints
├── ml/                       — ML tooling, datasets, and experiments
├── docs/                     — Architecture and dataflow docs
└── reports/                  — Generated reports and summaries
```

## Key Abstractions

### `getUser` / `getTeamForUser`
- **File**: `lib/db/queries.ts`
- **Responsibility**: Resolves the current session user from the `session` cookie and derives the user’s team, creating one on demand if necessary.
- **Interface**:
  - `getUser()` validates the session token, expiry, and user row.
  - `getTeamForUser()` calls `getUser()`, ensures membership, and returns the team plus members.
- **Lifecycle**: Used on almost every authenticated route and server action.
- **Used by**: dashboard layout, ServiceM8 routes, report-disseminator routes, mobile capture routes, admin routes, and most server actions.
- **Why it matters**: team scoping is a core invariant; many queries assume a valid team exists.

### `AppShell`
- **File**: `app/(dashboard)/app-shell.tsx`
- **Responsibility**: Wraps authenticated pages with navigation, user/team display, ServiceM8 connection status, and admin/user mode switching.
- **Interface**:
  - `AppShell({ children })`
  - internal `Header`, `UserMenu`, and `AdminViewModeToggle`
- **Lifecycle**: Client-side shell for all dashboard pages.
- **Used by**: `app/(dashboard)/layout.tsx`.
- **Why it matters**: this is where route-level UX and external connection status become visible to the user.

### `createMobileCaptureToken` / `verifyMobileCaptureToken`
- **File**: `lib/auth/mobile-capture.ts`
- **Responsibility**: Issues and validates short-lived JWTs for mobile avatar/signature uploads.
- **Interface**:
  - `createMobileCaptureToken({ userId, kind })`
  - `verifyMobileCaptureToken(token)`
- **Lifecycle**: Token created when the user opens the QR session; verified when the mobile upload is posted.
- **Used by**: `app/api/user/mobile-capture/session/route.ts` and `app/api/user/mobile-capture/route.ts`.
- **Why it matters**: token security depends on `AUTH_SECRET`; if unset, the whole flow fails.

### `analyzeImageWithRailwayWorker`
- **File**: `lib/ai/railway-client.ts`
- **Responsibility**: Sends image-analysis requests to a Railway-hosted worker.
- **Interface**:
  - `analyzeImageWithRailwayWorker(payload)`
- **Lifecycle**: Called only when the environment indicates the Railway worker should be used.
- **Used by**: `app/api/admin/llm-test/route.ts`.
- **Why it matters**: it has no retry/backoff layer and will fail hard on connectivity issues or bad configuration.

### `OpenRouterClient`
- **File**: `lib/openrouter.ts`
- **Responsibility**: Wraps OpenRouter completions and converts messages into a single prompt.
- **Interface**:
  - `chatCompletion(messages, options)`
  - `analyzeImageContent(...)`
  - `createOpenRouterClient()`
- **Lifecycle**: Created on demand from environment variables.
- **Used by**: `app/api/ai/analyze-image/route.ts`.
- **Why it matters**: it is another external dependency that can fail independently of the Railway worker.

### Report-disseminator schema and field analysis
- **File**: `lib/report-disseminator/schema.ts`
- **Responsibility**: Validates template/report payloads and enforces allowed field shapes.
- **Interface**:
  - `reportFieldSchema`
  - `reportDisseminatorTemplateSchema`
  - `reportDisseminatorReportSchema`
- **Lifecycle**: Used for request validation and database payload consistency.
- **Used by**: all report-disseminator route handlers.

### `analyzeFieldDefinition`
- **File**: `lib/report-disseminator/field-analysis.ts`
- **Responsibility**: Heuristically classifies a field label into a usable editor type such as `date`, `dropdown`, `postcode`, `voltage`, or `state_enum`.
- **Interface**:
  - `analyzeFieldDefinition(rawLabel, options)`
  - helpers like `humanizeFieldLabel`, `computeNextInspectionDate`
- **Lifecycle**: Applied during field extraction and AI-assisted prompt building.
- **Used by**: `pdf-acroform.ts`, AI gateway analysis routes, report template creation.
- **Why it matters**: this is the main reason field labels become semantically rich instead of remaining raw PDF names.

### `extractAcroFormPlacements` / `enrichFieldsWithAcroFormPlacements`
- **File**: `lib/report-disseminator/pdf-acroform.ts`
- **Responsibility**: Reads PDF AcroForm widgets, maps them to pages and bounding boxes, and merges those placements into field records.
- **Interface**:
  - `extractAcroFormPlacements(bytes)`
  - `enrichFieldsWithAcroFormPlacements(fields, sourcePdfBase64)`
- **Lifecycle**: Used when ingesting a template or loading an existing report/template.
- **Used by**: report-disseminator route handlers.
- **Why it matters**: it auto-populates editor placement data without requiring manual redraw of known AcroForm fields.

### Database schema
- **File**: `lib/db/schema.ts`
- **Responsibility**: Defines users, teams, certificates, ServiceM8 mappings, report-disseminator tables, and billing tables.
- **Interface**: Drizzle table definitions and exported TypeScript types.
- **Lifecycle**: Shared by all server-side data access.
- **Used by**: almost every route and server action.
- **Why it matters**: schema choices reveal the app’s true unit of ownership: everything is team-scoped.

## Data Flow
### 1) Authenticated dashboard request
1. A request hits an authenticated route under `app/(dashboard)`.
2. `app/(dashboard)/layout.tsx` calls `getUser()`.
3. If no valid session exists, the user is redirected to `/sign-in`.
4. Otherwise, `AppShell` renders the dashboard chrome and client-side status widgets.

### 2) Certificate creation/update
1. A server action in `app/(dashboard)/actions.ts` validates input with Zod.
2. `getTeamForUser()` resolves the active team.
3. Customer and certificate rows are inserted or updated in PostgreSQL.
4. Form payloads are merged into `formData`, with profile defaults layered in.
5. ServiceM8 job mappings are synchronized if a `servicem8JobUuid` is present.
6. When a certificate transitions to completed, the system attempts PDF generation.
7. Activity logs are written for auditability.

### 3) Mobile avatar/signature capture
1. `ProfileMediaSettings` calls `/api/user/mobile-capture/session`.
2. That route creates a signed JWT via `createMobileCaptureToken()`.
3. A mobile-friendly capture URL is returned and encoded into a QR code.
4. `MobileCaptureClient` opens on the phone, lets the user draw a signature or pick an image, and posts JSON to `/api/user/mobile-capture`.
5. The upload route verifies the token, normalizes the image, stores it in R2 if configured, and updates the user row.
6. The settings panel polls `/api/user` until it sees the updated avatar/signature.

### 4) Report template ingestion
1. An admin uploads a PDF to `app/api/admin/report-disseminator/route.ts`.
2. The route sanitizes the base64 payload, stores it as a draft template, and seeds wizard metadata.
3. `GET /api/admin/report-disseminator/[id]` sanitizes preview values, strips unsafe PDF data, and enriches fields with AcroForm placements.
4. `PUT /api/admin/report-disseminator/[id]` enforces status transitions and versioning rules.

### 5) AI-assisted image analysis
1. `/api/admin/llm-test` validates the request payload.
2. In production, it tries the Railway worker first if `RAILWAY_AI_WORKER_URL` is set.
3. If the worker is unreachable with a connectivity-style error, the route falls back to local analysis.
4. The local route `/api/ai/analyze-image` performs OCR, rule evaluation, and optional OpenRouter-based commentary.
5. The response combines findings, suggested codes, and report prefill sections.

## Non-Obvious Behaviors & Design Decisions
### Hidden invariants
- Almost every meaningful data access is team-scoped. If `getTeamForUser()` returns null, the feature should usually short-circuit.
- Several routes assume `AUTH_SECRET`, `OPENROUTER_API_KEY`, `AI_GATEWAY_API_KEY`, `RAILWAY_AI_WORKER_URL`, and R2 credentials exist in the right environment. Missing env vars often become “service unavailable” errors rather than graceful degradation.
- Report-disseminator templates and reports are versioned separately, and published/archived templates are treated as read-only.

### Why some failures keep recurring
This is the biggest reason for the “temporary issue / retry” pattern:
- The codebase depends on external services with no shared retry/circuit-breaker layer.
- `analyzeImageWithRailwayWorker()` does one fetch and throws on failure.
- `app/api/admin/llm-test/route.ts` only falls back for a narrow set of connectivity errors (`fetch failed`, `ECONNREFUSED`); everything else is surfaced.
- SWR polling in `ProfileMediaSettings` refreshes `/api/user` every 2.5 seconds while a mobile capture is active, so a brief backend problem can look repetitive.
- The dashboard header fetches ServiceM8 state on every render, and a transient error becomes a visible “ServiceM8 connection failed” state.
- QR/mobile flows depend on a correct reachable base URL; if the app is behind a proxy or the origin is wrong, the phone link can appear to “not connect” even though the token is valid.

### State management
- Most state is persisted in PostgreSQL.
- Client state is local UI state plus SWR cache.
- The admin view mode is stored in `localStorage` under `admin-dashboard-view-mode`.
- Mobile capture uses short-lived JWTs, so the browser and phone flows are intentionally ephemeral.

### Error propagation
- Route handlers generally return structured JSON errors with HTTP status codes.
- Some internal failures are swallowed intentionally to preserve the primary user flow:
  - PDF generation failure during certificate completion does not block the certificate update.
  - ServiceM8 mapping sync failures are logged but not fatal.
  - OpenRouter failure in image analysis is logged and the request still returns a useful local result.
- Other failures are terminal:
  - Missing auth/session data → 401/403.
  - Invalid token or expired mobile capture link → 401.
  - Misconfigured secrets → 503/500 depending on route.

### Performance-sensitive paths
- PDF parsing and AcroForm inspection are done only when needed, because they can be expensive.
- `report-disseminator` routes sanitize and enrich data opportunistically, but also persist the cleaned version back to the database to avoid repeating the work.
- Some routes cap payload sizes and text extraction lengths to keep large PDFs or images from blowing up request time and memory.

### External dependency quirks
- **Railway worker**: used as a remote AI backend; local dev defaults to `http://localhost:8000`, but production requires `RAILWAY_AI_WORKER_URL`.
- **OpenRouter**: completions are converted from chat messages into a single prompt string, and failures are surfaced as explicit API errors.
- **ServiceM8**: the dashboard only shows whether a connection row exists and whether the API call succeeds; it does not guarantee downstream sync health.
- **R2**: when disabled, mobile capture falls back to storing data URLs directly in the database.
- **Browser/mobile capture**: the QR workflow is highly sensitive to the base URL used to mint the link.

### What the code does not explain well
- There is no dedicated settings subsystem for “auto-approval”, “browser behavior”, or “terminal settings” in the inspected code. The only terminal-related component is a decorative onboarding demo (`app/(dashboard)/terminal.tsx`), not a real terminal controller.
- The repeated “couldn’t connect” style failures are usually integration outages or misconfiguration, not a single app bug.
- The codebase is resilient in some places and brittle in others; the fallbacks are feature-specific, not centralized.

## Module Reference
| File | Purpose |
|------|---------|
| `app/layout.tsx` | Global metadata, fonts, and SWR provider |
| `app/page.tsx` | Marketing landing page |
| `app/(dashboard)/layout.tsx` | Auth gate for the dashboard |
| `app/(dashboard)/app-shell.tsx` | Dashboard chrome, ServiceM8 status, admin/user mode toggle |
| `app/(dashboard)/actions.ts` | Server actions for customers, certificates, PDF export, and ServiceM8 sync |
| `app/(dashboard)/terminal.tsx` | Animated terminal demo component |
| `lib/db/schema.ts` | Full database schema and exported types |
| `lib/db/queries.ts` | Session lookup, team resolution, and data access helpers |
| `lib/auth/mobile-capture.ts` | JWT creation and verification for mobile capture links |
| `lib/ai/railway-client.ts` | Railway worker client for image analysis |
| `lib/openrouter.ts` | OpenRouter client and OCR/image-analysis helper |
| `lib/report-disseminator/schema.ts` | Zod schemas for template/report payloads |
| `lib/report-disseminator/field-analysis.ts` | Field-type inference and normalization |
| `lib/report-disseminator/pdf-acroform.ts` | PDF AcroForm extraction and field enrichment |
| `app/api/ai/analyze-image/route.ts` | Local OCR + rules + OpenRouter analysis endpoint |
| `app/api/admin/llm-test/route.ts` | Admin-facing worker/local analysis forwarder with fallback |
| `app/api/admin/report-disseminator/route.ts` | Create/list report disseminator templates |
| `app/api/admin/report-disseminator/[id]/route.ts` | Read/update/clone/archive template versions |
| `app/api/admin/report-disseminator/reports/route.ts` | Create/list generated reports |
| `app/api/admin/report-disseminator/reports/[id]/route.ts` | Read/update reports |
| `app/api/admin/report-disseminator/advisor/route.ts` | AI advice for report template editing steps |
| `app/api/admin/report-disseminator/ai-gateway-analyze/route.ts` | AI Gateway-powered PDF field extraction |
| `app/api/admin/report-disseminator/extract-fields/route.ts` | AcroForm extraction from uploaded PDFs |
| `app/api/admin/report-disseminator/ocr-text/route.ts` | Raw PDF text extraction |
| `app/api/admin/report-disseminator/option-search/route.ts` | Web-search-backed option research |
| `app/api/servicem8/connection/route.ts` | ServiceM8 connection status and settings |
| `app/api/user/mobile-capture/session/route.ts` | Mobile capture session/link creation |
| `app/api/user/mobile-capture/route.ts` | Mobile upload persistence |
| `app/api/mobile/analyse-image/route.ts` | Mobile OpenAI-based consumer-unit analysis endpoint |
| `app/api/mobile/servicem8/connection/route.ts` | Mobile ServiceM8 connection status endpoint |
| `components/settings/MobileCaptureClient.tsx` | Phone-side avatar/signature capture UI |
| `components/settings/ProfileMediaSettings.tsx` | QR-based mobile capture settings panel |
| `components/settings/TeamBrandingSettings.tsx` | Team logo upload/delete panel |

## Suggested Reading Order
1. `lib/db/schema.ts` — Defines the actual domain model and team-scoping rules.
2. `lib/db/queries.ts` — Shows how auth, team lookup, and data access really work.
3. `app/(dashboard)/actions.ts` — Demonstrates the certificate/customer mutation flow and ServiceM8 sync.
4. `app/api/admin/report-disseminator/route.ts` and `[id]/route.ts` — Best view of the report-template lifecycle.
5. `lib/report-disseminator/field-analysis.ts` and `pdf-acroform.ts` — Explains the PDF template intelligence.
6. `app/api/admin/llm-test/route.ts` plus `lib/ai/railway-client.ts` and `lib/openrouter.ts` — Best place to understand the recurring AI connectivity failures and fallbacks.
