# ServiceM8 Integration - Quick Reference

## Core Files Map

### Configuration & Client
- **[lib/servicem8/config.ts](lib/servicem8/config.ts)** - OAuth config, scopes, endpoints
- **[lib/servicem8/client.ts](lib/servicem8/client.ts)** - ServiceM8Client_API class (11 methods)

### Database Schema
- **[lib/db/schema.ts](lib/db/schema.ts)**:
  - `servicem8Connections` (team → tokens) 
  - `servicem8JobMappings` (certificate ↔ job)
  - `servicem8ClientMappings` (customer ↔ company)
  - `customers` (local customer DB)

### Web APIs
- **[app/api/servicem8/](app/api/servicem8/)**
  - `activate/route.ts` - START OAuth
  - `callback/route.ts` - RECEIVE code → store tokens
  - `connection/route.ts` - Status, sync settings, disconnect
  - `clients/route.ts` - GET list, POST import/link
  - `jobs/route.ts` - GET list, POST link
  - `webhook/route.ts` - Sync status updates from ServiceM8

### Mobile APIs  
- **[app/api/mobile/servicem8/](app/api/mobile/servicem8/)**
  - `_shared.ts` - Auth + normalization helpers
  - `connection/route.ts` - Company info
  - `clients/route.ts` - Search clients
  - `jobs/route.ts` - Search jobs
  - `jobs/[jobUuid]/route.ts` - Job + customer + attachments
  - `jobs/[jobUuid]/attachments/route.ts` - Job attachments

### UI Components
- **[components/OrganisationAutocompleteField.tsx](components/OrganisationAutocompleteField.tsx)** - Address/org search (Nominatim)
- **[app/(dashboard)/dashboard/servicem8/page.tsx](app/(dashboard)/dashboard/servicem8/page.tsx)** - 4-tab dashboard
- **[app/(dashboard)/certificates/new/eicr/page.tsx](app/(dashboard)/certificates/new/eicr/page.tsx)** - EICR form (3800+ lines)

### Actions
- **[app/(dashboard)/actions.ts](app/(dashboard)/actions.ts)** - `createCertificate`, `createCustomer`, `updateCustomer`, `duplicateCertificate`

---

## API Endpoint Reference

### OAuth Flow
```
GET /api/servicem8/activate 
  → Redirect to ServiceM8 auth
  
GET /api/servicem8/callback?code=X&state=Y
  → Exchange for tokens → Store in DB
  → Redirect to /dashboard/servicem8
```

### Connection Management
```
GET /api/servicem8/connection
  → { connected: bool, connection?: {...} }

DELETE /api/servicem8/connection
  → Disconnect (keep imported data)

PATCH /api/servicem8/connection
  → { syncEnabled?, syncDirection? }
```

### Client Operations (Web)
```
GET /api/servicem8/clients
  → List active companies

POST /api/servicem8/clients
  → { action: 'import_all' }    → Import all to customers table
  → { action: 'link', customerId, servicem8CompanyUuid }
```

### Job Operations (Web)
```
GET /api/servicem8/jobs?status=X
  → List jobs

POST /api/servicem8/jobs
  → { action: 'link', certificateId, servicem8JobUuid }
```

### Webhooks
```
POST /api/servicem8/webhook
  → { entry: [{uuid, type, account_uuid}], object }
  → Marks mappings as sync_status='pending'
```

### Mobile Endpoints
```
GET /api/mobile/servicem8/connection
  → Company info

GET /api/mobile/servicem8/clients?search=X
  → Clients list

GET /api/mobile/servicem8/jobs?search=X&status=Y&limit=Z
  → Jobs list

GET /api/mobile/servicem8/jobs/[jobUuid]
  → Job detail + customer + attachments

GET /api/mobile/servicem8/jobs/[jobUuid]/attachments
  → Attachments only
```

---

## Data Models

### ServiceM8Job
```typescript
uuid, status, job_address, job_description, work_done_description,
generated_job_id, date, completion_date, category_uuid, company_uuid,
active, badge, total_invoice_amount, total_paid_amount, edit_date,
first_name, last_name, job_is_scheduled
```

### ServiceM8Client
```typescript
uuid, company_name, first_name, last_name, email, phone, mobile,
billing_address, billing_address2, billing_city, billing_state,
billing_postcode, billing_country, active, edit_date
```

### ServiceM8ClientRecord (normalized)
```typescript
uuid, name, companyName, firstName, lastName, email, phone,
mobile, address, postcode
```

---

## EICR Form Customer Flow

1. **Site Name Field** - Uses `OrganisationAutocompleteField`
   - Searches Nominatim (OpenStreetMap)
   - Autocomplete 6 results
   - Returns: name + address
   - Populates `siteName` and `siteAddress` fields

2. **Customer Resolution** - In `createCertificate` action:
   - If `customerId` is numeric → lookup by ID
   - If `customerId` is text → treat as customer name
   - If not found → create new customer
   - Insert certificate with `customerId`

3. **ServiceM8 NOT YET INTEGRATED**:
   - ❌ No UI to select ServiceM8 job
   - ❌ No pre-fill from job data
   - ❌ Manual customer entry only
   - ✅ Infrastructure ready (mappings, API, DB schema)

---

## Database Relationships

```
team (id)
├── servicem8Connections (team_id) → SINGLE connection per team
├── customers (team_id) → Many customers
│   └── servicem8ClientMappings (customer_id) → Can link to ServiceM8 company
├── certificates (team_id, customer_id)
│   └── servicem8JobMappings (certificate_id) → Can link to ServiceM8 job
└── certificateItems (certificate_id) → Observations
```

---

## OAuth Scopes

**Current:** `read_jobs`, `read_customers` (read-only)

**For full integration, would need:** `write_jobs` (to upload PDFs)

---

## What's Built vs. What's Missing

| Feature | Status | File |
|---------|--------|------|
| OAuth Connect | ✅ | `activate`, `callback` |
| Token Storage | ✅ | `servicem8Connections` table |
| Token Refresh | ✅ | ServiceM8Client_API.refreshAccessToken() |
| Fetch Jobs | ✅ | `/api/servicem8/jobs` |
| Fetch Clients | ✅ | `/api/servicem8/clients` |
| Import Clients | ✅ | POST action='import_all' |
| Link Customer to Client | ✅ | `servicem8ClientMappings` |
| Link Certificate to Job | ✅ | `servicem8JobMappings` |
| Mobile Job Search | ✅ | `/api/mobile/servicem8/jobs` |
| Mobile Job Detail | ✅ | `/api/mobile/servicem8/jobs/[jobUuid]` |
| Mobile Attachments | ✅ | `/api/mobile/servicem8/jobs/[jobUuid]/attachments` |
| Webhook Receive | ✅ | `/api/servicem8/webhook` |
| Dashboard UI | ✅ | ServiceM8 page with 4 tabs |
| Job Selection in EICR | ❌ | Needs new component |
| Auto-fill from Job | ❌ | Needs logic |
| Upload Certificate PDF | ❌ | Needs endpoint + write scope |
| Background Sync | ❌ | Needs job processor |
| Webhook Processing | ❌ | Only marks pending |

---

## Environment Setup

```bash
# .env.local
SERVICEM8_APP_ID=xxx
SERVICEM8_APP_SECRET=yyy
# Optional:
SERVICEM8_CALLBACK_URL=https://yourdomain.com/api/servicem8/callback
SERVICEM8_ACTIVATION_URL=https://yourdomain.com/api/servicem8/activate
```

---

## Key Code Snippets

### Create ServiceM8 client from team
```typescript
const client = await ServiceM8Client_API.fromTeamId(teamId);
if (!client) return null; // Not connected
```

### Get ServiceM8 jobs  
```typescript
const jobs = await client.getJobs('active eq 1');
const filtered = jobs.filter(j => j.status === 'Completed');
```

### Import all clients
```typescript
const sm8Clients = await client.getClients('active eq 1');
for (const c of sm8Clients) {
  // Create local customer
  // Create mapping in servicem8ClientMappings
}
```

### Handle token refresh
```typescript
// Automatic in ServiceM8Client_API.request()
// If 401 → try refresh → retry request
// Updates tokens in servicem8Connections table
```

---

## Testing Endpoints

```bash
# Get status
curl https://yourdomain.com/api/servicem8/connection \
  -H "Authorization: Bearer YOUR_TOKEN"

# List ServiceM8 clients
curl https://yourdomain.com/api/servicem8/clients \
  -H "Authorization: Bearer YOUR_TOKEN"

# Import all clients
curl -X POST https://yourdomain.com/api/servicem8/clients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"action":"import_all"}'

# List mobile jobs
curl https://yourdomain.com/api/mobile/servicem8/jobs?search=EICR \
  -H "Authorization: Bearer YOUR_MOBILE_TOKEN"
```

---

## Next Steps to Complete Integration

1. **Add ServiceM8 Job Selector to EICR**
   - New component that searches `/api/servicem8/jobs`
   - Auto-fills site name/address from selected job
   - Stores mapping when certificate created

2. **Implement Certificate Upload**
   - Add `write_jobs` to OAuth scopes
   - Create endpoint to upload PDF as job attachment
   - Call after PDF generation in createCertificate

3. **Add Sync Processing**
   - Scheduled job to process `pending` sync records
   - Update local data from webhook changes
   - Error handling and retry logic

4. **UI Polish**
   - Show sync status in certificate view
   - Display linked job info
   - Error notifications

---

## References
- Full guide: [SERVICEM8_IMPLEMENTATION_GUIDE.md](SERVICEM8_IMPLEMENTATION_GUIDE.md)
- ServiceM8 API Docs: https://developer.servicem8.com
- Config: [lib/servicem8/config.ts](lib/servicem8/config.ts)
