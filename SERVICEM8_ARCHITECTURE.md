# ServiceM8 Integration Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SERVICEM8 (External)                             │
│                      https://api.servicem8.com/api_1.0                      │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
        OAuth 2.0 Flow    GET Jobs/Clients    Webhooks
        (auth code)       (read_jobs,         (job/company
                          read_customers)    change events)
                │                │                │
┌───────────────┴────────────────┴────────────────┴──────────────────────────┐
│                     AI CERTIFY WEB/MOBILE APP                              │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │ Web Server (Next.js)                                               │   │
│  │                                                                     │   │
│  │  OAuth Flow                                                         │   │
│  │  ┌──────────────────────────────────────────────────┐             │   │
│  │  │ GET /api/servicem8/activate                      │             │   │
│  │  │  → Redirects to ServiceM8 auth endpoint          │             │   │
│  │  │  → User authorizes                               │             │   │
│  │  │  → ServiceM8 redirects to callback with code     │             │   │
│  │  └─────────────────────────────┬──────────────────┘              │   │
│  │                                 │                                  │   │
│  │  ┌──────────────────────────────▼──────────────────┐             │   │
│  │  │ GET /api/servicem8/callback?code=X&state=Y     │             │   │
│  │  │  → Exchange code for access/refresh tokens      │             │   │
│  │  │  → Fetch company info from ServiceM8           │             │   │
│  │  │  → Store in servicem8Connections               │             │   │
│  │  │  → Redirect to /dashboard/servicem8?success    │             │   │
│  │  └──────────────────────────────────────────────┘              │   │
│  │                                                                     │   │
│  │  API Endpoints                                                      │   │
│  │  ┌──────────────────────────────────────────────────┐             │   │
│  │  │ Connection Management:                           │             │   │
│  │  │  GET /api/servicem8/connection                   │             │   │
│  │  │  DELETE /api/servicem8/connection                │             │   │
│  │  │  PATCH /api/servicem8/connection                 │             │   │
│  │  │                                                  │             │   │
│  │  │ Client Management:                               │             │   │
│  │  │  GET /api/servicem8/clients                      │             │   │
│  │  │  POST /api/servicem8/clients (import_all, link)  │             │   │
│  │  │                                                  │             │   │
│  │  │ Job Management:                                  │             │   │
│  │  │  GET /api/servicem8/jobs                         │             │   │
│  │  │  POST /api/servicem8/jobs (link)                │             │   │
│  │  │                                                  │             │   │
│  │  │ Webhooks:                                        │             │   │
│  │  │  POST /api/servicem8/webhook                     │             │   │
│  │  └──────────────────────────────────────────────────┘             │   │
│  │                                                                     │   │
│  │  Mobile APIs (Similar structure)                                   │   │
│  │  ┌──────────────────────────────────────────────────┐             │   │
│  │  │ GET /api/mobile/servicem8/connection             │             │   │
│  │  │ GET /api/mobile/servicem8/clients?search=X       │             │   │
│  │  │ GET /api/mobile/servicem8/jobs?search=X&status=Y │             │   │
│  │  │ GET /api/mobile/servicem8/jobs/[jobUuid]         │             │   │
│  │  │ GET /api/mobile/servicem8/jobs/[jobUuid]/...     │             │   │
│  │  └──────────────────────────────────────────────────┘             │   │
│  │                                                                     │   │
│  │  UI Components                                                      │   │
│  │  ┌──────────────────────────────────────────────────┐             │   │
│  │  │ Dashboard: /dashboard/servicem8                  │             │   │
│  │  │  - Tab: Overview (connection status)             │             │   │
│  │  │  - Tab: Jobs (list + table)                      │             │   │
│  │  │  - Tab: Clients (import UI)                      │             │   │
│  │  │  - Tab: Settings (sync direction)                │             │   │
│  │  │                                                  │             │   │
│  │  │ EICR Form: /certificates/new/eicr               │             │   │
│  │  │  - OrganisationAutocompleteField (address)       │             │   │
│  │  │  - Customer selection (local DB)                 │             │   │
│  │  │  - [MISSING] ServiceM8 job selector              │             │   │
│  │  └──────────────────────────────────────────────────┘             │   │
│  │                                                                     │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────┬─────────────────────────────────────────┬───────────────┘
                   │                                         │
                   │                                    PostgreSQL DB
                   │                              (servicem8_connections,
            Server Actions                        servicem8_job_mappings,
            (createCertificate)                   servicem8_client_mappings,
                   │                              customers,
                   │                              certificates,
                   │                              certificateItems)
                   │
                   │
```

## Data Flow Diagrams

### OAuth Connection Flow

```
User clicks "Connect ServiceM8"
         │
         ▼
GET /api/servicem8/activate
  - Generate state (CSRF protection)
  - Build OAuth URL with client_id, redirect_uri, scopes
  - Redirect to ServiceM8 auth endpoint
         │
         ▼
User authorizes AI Certify in ServiceM8
         │
         ▼
ServiceM8 redirects to /api/servicem8/callback?code=X&state=Y
  - Validate state against stored cookie
  - POST to ServiceM8 token endpoint with code
  - Receive { access_token, refresh_token, expires_in }
  - GET /companycontactinfo to fetch company name
  - UPSERT into servicem8Connections table
         │
         ▼
Redirect to /dashboard/servicem8?success=connected
         │
         ▼
Dashboard shows:
  - ✅ Connected
  - Company name
  - Last sync time
  - Sync direction
```

### Job Fetching Flow (Web Dashboard)

```
User visits /dashboard/servicem8 (Jobs tab)
         │
         ▼
Dashboard component requests GET /api/servicem8/jobs
         │
         ▼
/api/servicem8/jobs handler:
  1. Get current team ID from auth
  2. ServiceM8Client_API.fromTeamId(teamId)
     - Fetch servicem8Connections row
     - Check if token expired
     - If expired: refreshAccessToken()
  3. Call client.getJobs() with filters
  4. Return jobs JSON
         │
         ▼
Dashboard displays jobs in table:
  - Job ID
  - Description
  - Address
  - Status (badge colored)
  - Date
```

### Client Import Flow

```
User clicks "Import All Clients"
         │
         ▼
POST /api/servicem8/clients { action: 'import_all' }
         │
         ▼
Handler:
  1. Get auth + team ID
  2. ServiceM8Client_API.fromTeamId(teamId)
  3. client.getClients('active eq 1')
  4. For each ServiceM8 client:
     - Check if mapping exists in servicem8ClientMappings
     - If not:
       - INSERT into customers table
       - INSERT into servicem8ClientMappings
       - Increment imported counter
  5. Return { imported: N, skipped: M, total: T }
         │
         ▼
UI shows: "Imported 42 clients, skipped 8 already existing"
         │
         ▼
Customers now available for certificate creation
```

### Certificate Creation with ServiceM8 Link

```
User fills EICR form and submits
         │
         ▼
createCertificate server action:
  1. Validate form data
  2. Resolve customer:
     - If customerId is numeric → look up by ID
     - Else → treat as name, create if not found
  3. Generate certificate number
  4. INSERT into certificates table
  5. [MISSING] If servicem8JobUuid provided:
     - INSERT into servicem8JobMappings
  6. INSERT certificate items (observations)
  7. Log activity
  8. Redirect to /certificates/{id}
         │
         ▼
Certificate created and available for PDF download
[MISSING] PDF upload to ServiceM8 job
```

### Token Refresh Flow

```
Any API call to ServiceM8:
  1. ServiceM8Client_API.request()
  2. Build headers with current access_token
  3. Send request
  4. If 401 Unauthorized:
     - Call refreshAccessToken()
       - POST to ServiceM8 token endpoint
       - Send refresh_token
       - Receive new access_token, refresh_token, expires_in
       - UPDATE servicem8Connections with new tokens
     - Retry original request with new token
  5. Return response
```

### Webhook Processing Flow (Partial)

```
ServiceM8 sends webhook POST to /api/servicem8/webhook
  Body: { entry: [{uuid, type, account_uuid}] }
         │
         ▼
Handler:
  1. Extract { entry, object }
  2. For each change in entry:
     - Find servicem8Connections row by account_uuid
     - If syncEnabled:
       - If type === 'job':
         - UPDATE servicem8JobMappings
           - syncStatus = 'pending'
       - If type === 'company':
         - UPDATE servicem8ClientMappings
           - syncStatus = 'pending'
  3. Return { success: true }
         │
         ▼
[MISSING] Background processor to:
  - Find all pending records
  - Fetch fresh data from ServiceM8
  - Update local certificates/customers
  - Mark as synced
```

## Data Model Relationships

```
teams (id)
  │
  ├──────────────────────────────────────────┐
  │                                          │
  ▼                                          ▼
servicem8Connections                     customers
(1 connection per team)                  (Many customers per team)
  - id                                     - id
  - team_id (FK)                          - team_id (FK)
  - access_token                          - name
  - refresh_token                         - email
  - token_expires_at                      - phone
  - servicem8_account_uuid                - address
  - servicem8_company_name                - postcode
  - is_active                             - contact_person
  - sync_direction
  - sync_enabled
  - last_sync_at
                                              │
                                              ▼
                                         servicem8ClientMappings
                                         (Customer ↔ ServiceM8 Company)
                                           - customer_id (FK)
                                           - servicem8_company_uuid
                                           - sync_status
                                           - last_sync_at

teams
  │
  ▼
certificates (Many per team)
  - id
  - team_id (FK)
  - customer_id (FK to customers)
  - certificate_type (EICR, BS5839-1, etc)
  - certificate_number
  - site_name
  - site_address
  - inspection_date
  - next_inspection_date
  - form_data (JSON)
  - status (draft, finalized)
  │
  ├─────────────────────────────────────────┐
  │                                         │
  ▼                                         ▼
certificateItems                   servicem8JobMappings
(Observations for certificate)     (Certificate ↔ ServiceM8 Job)
  - certificate_id (FK)              - certificate_id (FK)
  - item_type                        - servicem8_job_uuid
  - description                      - sync_status
  - location                         - last_sync_at
  - status
```

## Mobile API Integration Flow

```
Mobile App (Expo)
  │
  ├─ POST login → Get JWT + Team ID
  │
  ├─ GET /api/mobile/servicem8/connection
  │   → Verify ServiceM8 is connected for team
  │   → Show "Connect ServiceM8" if not
  │
  ├─ GET /api/mobile/servicem8/clients?search=acme
  │   → Search local + ServiceM8 clients
  │   → Build list for job selection
  │
  ├─ GET /api/mobile/servicem8/jobs?search=EICR&status=Completed
  │   → Get list of jobs to inspect
  │   → Filter by status, search
  │
  ├─ GET /api/mobile/servicem8/jobs/job-uuid-123
  │   → Get job details:
  │     - Job info (address, description, etc)
  │     - Customer info (name, phone, email, address)
  │     - Attachments (photos, documents)
  │
  ├─ GET /api/mobile/servicem8/jobs/job-uuid-123/attachments
  │   → Download job photos for reference during inspection
  │
  └─ POST /api/mobile/servicem8/attachments/upload
      [MISSING] Upload inspection photos back to ServiceM8
```

## Authentication Flows

### Web User → API
```
Web User
  │
  ├─ Logs in (NextAuth)
  │  → JWT token stored in secure cookie
  │  → Middleware validates on each request
  │
  └─ Makes request to /api/servicem8/*
     │
     └─ Handler calls getUser() + getTeamForUser()
        → Validates user + team ownership
        → Fetches team's ServiceM8 connection
        → Returns error if not connected
```

### Mobile User → API
```
Mobile User (Expo)
  │
  ├─ Logs in via /api/mobile/auth
  │  → Returns JWT + Team ID
  │  → Token stored in secure storage
  │
  └─ Makes request to /api/mobile/servicem8/*
     │
     └─ Handler calls getMobileUser(request)
        → Validates JWT
        → Extracts team from token
        → Fetches team's ServiceM8 connection
        → Returns error if not connected
```

## Sync Direction Modes

```
from_servicem8 (Import only)
  ┌─ ServiceM8 jobs → local DB
  ├─ ServiceM8 clients → customers table
  └─ Updates → marked pending but not auto-synced

to_servicem8 (Export only)
  └─ [NOT IMPLEMENTED]
  └─ Would: certificates → ServiceM8 job attachments

bidirectional (Default, not full bi-sync yet)
  ├─ Import from ServiceM8 ✅
  └─ Export to ServiceM8 ❌
```

## Scopes & Permissions

```
Current Scopes: read_jobs, read_customers
└─ Can fetch jobs and customers
└─ Can list job attachments

For Complete Integration, need:
├─ read_jobs ✅
├─ read_customers ✅
├─ write_jobs (for PDF upload)
└─ [Currently blocked by ServiceM8 addon permissions]
```

## Error Handling Paths

```
404 Not Found / 401 Unauthorized / 400 Bad Request
         │
         ├─ Missing/invalid credentials
         ├─ User not part of team
         ├─ ServiceM8 not connected
         ├─ Invalid sync settings
         └─ Returns { error: 'message' } + HTTP status
                │
                └─ UI shows error toast/message
```

---

## Key Implementation Notes

1. **One Connection Per Team**
   - `servicem8Connections` has UNIQUE constraint on `team_id`
   - All team members share same ServiceM8 account tokens

2. **Immutable Mappings**
   - Customers can only map to ONE ServiceM8 company
   - Certificates can only map to ONE ServiceM8 job
   - Mappings can be updated but not duplicated

3. **Sync Direction**
   - Currently only `from_servicem8` works (partial)
   - Webhooks mark records pending but no processor
   - `to_servicem8` not implemented (needs write scope)

4. **Token Security**
   - Stored in DB (encrypted in production)
   - Refresh token rotates with each refresh
   - Expires after OAuth timeout
   - No tokens in URLs or logs

5. **Address Lookup**
   - Uses Nominatim (OpenStreetMap) public API
   - No API key required
   - Client-side (no data sent to backend until form submit)
   - Limited to 6 results, 3 char minimum

---

## Future State (After All Features Complete)

```
┌──────────────────────────┐
│   EICR Form Creation     │
├──────────────────────────┤
│ 1. Start inspection      │
│ 2. Search ServiceM8 job  │
│ 3. Auto-fill from job   │
│ 4. Complete form        │
│ 5. Generate PDF         │
│ 6. Auto-upload to job   │
│ 7. Link in certificate  │
└──────────────────────────┘
         ▼
┌──────────────────────────┐
│   Background Processor   │
├──────────────────────────┤
│ - Sync job changes      │
│ - Update local data     │
│ - Handle errors/retries │
│ - Log activity          │
└──────────────────────────┘
```
