# ServiceM8 Integration Implementation Guide

## Overview
The AI Certificates codebase has a comprehensive ServiceM8 integration for syncing jobs, customers, and certificates. The implementation spans both web/dashboard and mobile APIs.

---

## 1. ServiceM8 API Client & Configuration

### Configuration Files
- **[lib/servicem8/config.ts](lib/servicem8/config.ts)** - Central configuration for ServiceM8 integration
  - OAuth endpoints: `https://go.servicem8.com/oauth/authorize`, `https://go.servicem8.com/oauth/access_token`
  - API base URL: `https://api.servicem8.com/api_1.0`
  - OAuth scopes: `read_jobs`, `read_customers` (read-only)
  - Callback URL: `/api/servicem8/callback`
  - Activation URL: `/api/servicem8/activate`

### ServiceM8 Client Library
- **[lib/servicem8/client.ts](lib/servicem8/client.ts)** - `ServiceM8Client_API` class
  - **Methods:**
    - `getJobs(filter?: string)` - Fetch jobs with optional filter
    - `getJob(uuid: string)` - Fetch single job
    - `createJob(data)`, `updateJob(uuid, data)` - Job CRUD
    - `getClients(filter?: string)` - Fetch companies/clients
    - `getClient(uuid: string)` - Fetch single client
    - `createClient(data)`, `updateClient(uuid, data)` - Client CRUD
    - `getStaff()` - Fetch staff list
    - `getCompanyInfo()` - Get authenticated company information
    - `getJobCategories()` - Fetch job categories
    - `getJobMaterials(jobUuid)` - Fetch materials for a job
    - `getJobAttachments(jobUuid)` - Fetch job attachments
    - `getJobAttachmentDownloadInfo(uuid)` - Get attachment download URL
    - `refreshAccessToken()` - Token refresh with automatic storage
  
  - **Token Management:**
    - Automatic token refresh when expired
    - Tokens stored in `servicem8Connections` table
    - `fromTeamId(teamId)` - Static factory method to load client from team's connection

### Type Definitions (from client.ts)
```typescript
ServiceM8TokenResponse
ServiceM8Job
ServiceM8Client
ServiceM8Staff
ServiceM8Company
ServiceM8JobCategory
ServiceM8JobMaterial
ServiceM8JobAttachment
ServiceM8AttachmentDownloadInfo
```

---

## 2. Database Schema for ServiceM8 Integration

### servicem8Connections Table
**[lib/db/schema.ts](lib/db/schema.ts) lines 418-437**

```sql
CREATE TABLE servicem8_connections (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL UNIQUE (references teams),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP,
  servicem8_account_uuid VARCHAR(255),
  servicem8_company_name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP,
  sync_enabled BOOLEAN DEFAULT true,
  sync_direction VARCHAR(20) DEFAULT 'bidirectional',  -- 'to_servicem8', 'from_servicem8', 'bidirectional'
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### servicem8JobMappings Table
**[lib/db/schema.ts](lib/db/schema.ts) lines 439-453**

Links certificates to ServiceM8 jobs
```sql
CREATE TABLE servicem8_job_mappings (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL (references teams),
  certificate_id INTEGER NOT NULL (references certificates),
  servicem8_job_uuid VARCHAR(255) NOT NULL,
  last_sync_at TIMESTAMP,
  sync_status VARCHAR(20) DEFAULT 'synced',  -- 'synced', 'pending', 'error'
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### servicem8ClientMappings Table
**[lib/db/schema.ts](lib/db/schema.ts) lines 455-467**

Links local customers to ServiceM8 companies
```sql
CREATE TABLE servicem8_client_mappings (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL (references teams),
  customer_id INTEGER NOT NULL (references customers),
  servicem8_company_uuid VARCHAR(255) NOT NULL,
  last_sync_at TIMESTAMP,
  sync_status VARCHAR(20) DEFAULT 'synced',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### customers Table
**[lib/db/schema.ts](lib/db/schema.ts) lines 271-289**

Local customer database (can be synced from ServiceM8)
```sql
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL (references teams),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  postcode VARCHAR(20),
  contact_person VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## 3. Web API Endpoints

### OAuth & Connection Management

#### [app/api/servicem8/activate/route.ts](app/api/servicem8/activate/route.ts)
- **GET** - Initiates OAuth flow when user clicks "Connect ServiceM8"
- Generates state parameter for CSRF protection
- Redirects to ServiceM8 authorization endpoint
- Returns with authorization code to callback endpoint

#### [app/api/servicem8/callback/route.ts](app/api/servicem8/callback/route.ts)
- **GET** - OAuth callback handler
- Exchanges authorization code for tokens
- Fetches ServiceM8 company info
- Stores/updates tokens in `servicem8Connections` table
- Handles pending OAuth completion flows
- Success redirect: `/dashboard/servicem8?success=connected`

#### [app/api/servicem8/connection/route.ts](app/api/servicem8/connection/route.ts)
- **GET** - Check connection status
- **DELETE** - Disconnect ServiceM8 (keeps imported data)
- **PATCH** - Update sync settings (`syncEnabled`, `syncDirection`)

### Client Management

#### [app/api/servicem8/clients/route.ts](app/api/servicem8/clients/route.ts)
- **GET** - List active ServiceM8 clients
- **POST** - `action: 'import_all'` - Import all ServiceM8 clients to local `customers` table
- **POST** - `action: 'link'` - Link local customer to ServiceM8 client UUID
  - Creates/updates entry in `servicem8ClientMappings`
  - Prevents duplicate mappings per customer

### Job Management

#### [app/api/servicem8/jobs/route.ts](app/api/servicem8/jobs/route.ts)
- **GET** - List jobs (optional status filter)
- **POST** - `action: 'link'` - Link certificate to ServiceM8 job
  - Creates/updates entry in `servicem8JobMappings`
  - Stores sync status

### Webhook Handling

#### [app/api/servicem8/webhook/route.ts](app/api/servicem8/webhook/route.ts)
- **POST** - Receives ServiceM8 webhook notifications
- Handles `job` and `company` change events
- Updates sync status to `pending` for changed objects
- Finds team by `account_uuid` to route updates
- Respects `syncEnabled` flag in connection settings

---

## 4. Mobile API Endpoints

### Shared Utilities
**[app/api/mobile/servicem8/_shared.ts](app/api/mobile/servicem8/_shared.ts)**

Helper functions for mobile endpoints:
- `getMobileServiceM8Client(request)` - Authenticate request and return ServiceM8 client
- `normalizeServiceM8Client(client)` - Convert ServiceM8 format to `ServiceM8ClientRecord`
- `normalizeServiceM8Job(job)` - Convert to `ServiceM8JobRecord`
- `normalizeServiceM8Attachment(serviceM8Client, attachment)` - Convert to `ServiceM8AttachmentRecord`
- `buildServiceM8DisplayName(input)` - Create display name from company/person names
- `buildServiceM8Address(input)` - Format address from components

### Connection Status
**[app/api/mobile/servicem8/connection/route.ts](app/api/mobile/servicem8/connection/route.ts)**
- **GET** - Get ServiceM8 company info for authenticated team

### Clients
**[app/api/mobile/servicem8/clients/route.ts](app/api/mobile/servicem8/clients/route.ts)**
- **GET** - List clients with optional search filter
  - Query param: `search` - filters by company name, first/last name, email, phone, address

### Jobs
**[app/api/mobile/servicem8/jobs/route.ts](app/api/mobile/servicem8/jobs/route.ts)**
- **GET** - List jobs with filtering
  - Query params: `search`, `status`, `limit` (default 50, max 100)

### Job Details
**[app/api/mobile/servicem8/jobs/[jobUuid]/route.ts](app/api/mobile/servicem8/jobs/[jobUuid]/route.ts)**
- **GET** - Fetch single job with:
  - Customer details (if job has `company_uuid`)
  - All attachments (sorted by date, newest first)

### Job Attachments
**[app/api/mobile/servicem8/jobs/[jobUuid]/attachments/route.ts](app/api/mobile/servicem8/jobs/[jobUuid]/attachments/route.ts)**
- **GET** - List attachments for job
  - Returns: all attachments + image-only list
  - Sorted by date (newest first)

---

## 5. Dashboard Components & Pages

### Dashboard ServiceM8 Page
**[app/(dashboard)/dashboard/servicem8/page.tsx](app/(dashboard)/dashboard/servicem8/page.tsx)**

React component with tabs:
- **Overview** - Connection status, sync direction, last sync time
- **Jobs** - Table of ServiceM8 jobs with filtering
- **Clients** - Import clients UI with bulk import button
- **Settings** - Sync direction toggle, sync enable/disable, disconnect button

Sub-components:
- `JobsTab()` - Shows jobs from `/api/servicem8/jobs`
- `ClientsTab()` - Shows clients from `/api/servicem8/clients`

### ServiceM8 Settings Page
**[app/(dashboard)/servicem8/page.tsx](app/(dashboard)/servicem8/page.tsx)**

Simple landing page for ServiceM8 integration setup.

---

## 6. EICR Form Integration

### EICR Form Page
**[app/(dashboard)/certificates/new/eicr/page.tsx](app/(dashboard)/certificates/new/eicr/page.tsx)**

Large form component for EICR (Electrical Installation Condition Report) certificates.

#### Customer Selection
**[components/OrganisationAutocompleteField.tsx](components/OrganisationAutocompleteField.tsx)**
- Uses Nominatim OpenStreetMap API for address lookup
- Returns place name and compact address
- Searches: amenity, building, shop, office, leisure, tourism
- Address format: "12 High Street, Bolton, BL1 2AB"
- Min query length: 3 characters (default)
- Country codes: 'gb' (default)

#### Form Structure
The EICR form includes:
- Certificate number (auto-generated)
- Site name (using `OrganisationAutocompleteField`)
- Site address (from address autocomplete)
- Inspection date (dropdown)
- Next inspection date (with period presets)
- Inspector name
- Multiple sections:
  - Declared supply parameters (presets for Domestic/Commercial/Industrial)
  - Supply protective device
  - Earth electrode
  - Main protective bonding conductor
  - Inspection schedule (checkboxes organized by groups)
  - Circuit table (dynamic rows with 30+ columns)
  - Observations (C1/C2/C3/FI codes)
  - General condition statements
  - Recommendation statements

#### EICR-Specific Constants
- `EICR_INTERVAL_PRESETS` - Inspection periods by building type
- `DECLARED_SUPPLY_PARAMETER_PRESETS` - Default values for different installation types
- `REASON_FOR_REPORT_OPTIONS` - Predefined reasons for inspection
- `GENERAL_CONDITION_OPTIONS` - Standard condition statements
- `OBSERVATION_CODE_GUIDANCE` - Guidance for C1/C2/C3/FI codes
- `INSPECTION_SCHEDULE_SECTION` - Structured inspection points

#### Form Submission
- Uses `createCertificate` server action from `[app/(dashboard)/actions.ts](app/(dashboard)/actions.ts)`
- Collects customer ID or customer name
- Falls back to creating new customer if not found by ID or name
- Stores all form data as JSON in `certificates.formData`
- Creates `certificateItems` records for observations

---

## 7. Server Actions

### Certificate Management
**[app/(dashboard)/actions.ts](app/(dashboard)/actions.ts)**

- `createCertificate(createCertificateSchema)` - Main certificate creation
  - Validates customer (by ID or creates new)
  - Generates certificate number
  - Stores form data as JSON
  - Creates certificate and items in single transaction
  - Logs activity
  - Redirects to certificate detail page

- `createCustomer(createCustomerSchema)` - Create local customer
- `updateCustomer(updateCustomerSchema)` - Update local customer
- `duplicateCertificate(id)` - Clone certificate with new number

---

## 8. Current Implementation Status

### ✅ What EXISTS

1. **OAuth Flow** - Complete ServiceM8 authentication
2. **Token Management** - Automatic refresh with storage
3. **Client API** - Full ServiceM8 REST client with all endpoints
4. **Database Schema** - Tables for connections, mappings (jobs and clients)
5. **Mobile APIs** - Client/job/attachment fetching
6. **Web Dashboard** - Connection management, client import, job listing, settings
7. **EICR Form** - Complete form with inspection schedule and circuit tables
8. **Customer Management** - Create/update customers, link to ServiceM8 clients
9. **Webhook Support** - Marked as pending for sync (infrastructure ready)

### ⚠️ What's PARTIALLY IMPLEMENTED

1. **Job Linking** - Can link certificates to ServiceM8 jobs, but:
   - No UI in EICR form to select ServiceM8 job
   - Not exposed to web dashboard yet
   - Only works via API call

2. **Attachment Upload** - Infrastructure exists but:
   - No endpoint to upload completed certificate PDFs back to ServiceM8
   - Attachment download/preview works on mobile only

3. **Webhook Processing** - Endpoints exist but:
   - Only marks records as `pending` sync
   - Actual sync logic not implemented
   - No scheduled background job processor

### ❌ What's MISSING for Web/EICR Forms

1. **ServiceM8 Job Selection in EICR Form**
   - Need new UI component to search/select ServiceM8 jobs
   - Would pre-fill site name, address from job data
   - Would create mapping when certificate created

2. **Pre-fill from ServiceM8 Job**
   - Extract customer details from job
   - Pre-fill site address, customer info
   - Get job materials/description for observations

3. **Certificate Upload to ServiceM8**
   - After PDF generation, upload to ServiceM8 as job attachment
   - Requires `write_jobs` scope (not currently requested)

4. **Sync Status UI**
   - Show sync status for linked jobs/customers
   - Display last sync time
   - Error states for failed syncs

5. **Web-based Job Browser**
   - Currently only in dashboard overview
   - Need to surface in certificate creation flow

6. **Batch Operations**
   - Bulk linking of existing certificates to jobs
   - Bulk customer import (UI exists but needs polish)

---

## 9. How to Integrate ServiceM8 Job Selection into EICR Form

### Required Changes

1. **Create New Component: JobSelector**
   - Search ServiceM8 jobs by status, ID, description, address
   - Similar pattern to `OrganisationAutocompleteField`
   - Call `/api/servicem8/jobs?search=...&status=...`
   - Returns: `generatedJobId`, `address`, `description`, `customer.name`

2. **Modify EICR Form Page**
   - Add "Link to ServiceM8 Job" section
   - If job selected, pre-fill:
     - Site name (from job address)
     - Site address (from job address)
     - Customer info (from job customer UUID)
   - Optional: fetch job materials to pre-populate observations

3. **Update `createCertificate` Action**
   - Accept optional `servicem8JobUuid`
   - Create mapping in `servicem8JobMappings` table
   - Log the linkage

4. **Add PDF Upload After Generation**
   - Implement `/api/servicem8/jobs/[jobUuid]/attachments/upload`
   - Requires `write_jobs` scope (need to update config and OAuth flow)
   - Call after PDF generated to attach certificate to job

---

## 10. Key File References

| File | Purpose |
|------|---------|
| [lib/servicem8/config.ts](lib/servicem8/config.ts) | OAuth & API config |
| [lib/servicem8/client.ts](lib/servicem8/client.ts) | ServiceM8 REST client |
| [lib/db/schema.ts](lib/db/schema.ts) | Database tables & relations |
| [app/(dashboard)/actions.ts](app/(dashboard)/actions.ts) | Server-side certificate creation |
| [app/(dashboard)/certificates/new/eicr/page.tsx](app/(dashboard)/certificates/new/eicr/page.tsx) | EICR form component |
| [app/api/servicem8/\*](app/api/servicem8/) | Web API endpoints |
| [app/api/mobile/servicem8/\*](app/api/mobile/servicem8/) | Mobile API endpoints |
| [components/OrganisationAutocompleteField.tsx](components/OrganisationAutocompleteField.tsx) | Address/org search |

---

## 11. Environment Variables

```bash
SERVICEM8_APP_ID=<oauth-app-id>
SERVICEM8_APP_SECRET=<oauth-app-secret>
SERVICEM8_CALLBACK_URL=<base-url>/api/servicem8/callback  # optional
SERVICEM8_ACTIVATION_URL=<base-url>/api/servicem8/activate  # optional
```

See [.env.servicem8.example](.env.servicem8.example) for template.

---

## 12. Testing Checklist

- [ ] OAuth flow: Connect → Authorize → Callback
- [ ] Token refresh: Verify tokens update after expiry
- [ ] Client import: Import all ServiceM8 clients to local DB
- [ ] Job listing: View ServiceM8 jobs in dashboard
- [ ] Mobile APIs: Fetch clients/jobs on mobile app
- [ ] Webhook: POST to `/api/servicem8/webhook` marks pending
- [ ] EICR creation: Create certificate linked to ServiceM8 customer
- [ ] Disconnect: Remove connection, data persists

---

## 13. Future Enhancement Opportunities

1. **Bi-directional Sync** - Process webhook updates to sync job changes
2. **PDF Attachments** - Auto-upload generated certificates to jobs
3. **Job Prefill** - Auto-populate form from selected job
4. **Materials Integration** - Sync job materials as observations
5. **Status Tracking** - Show sync status in UI
6. **Batch Operations** - Link multiple certs to jobs at once
7. **Custom Fields** - Map ServiceM8 custom fields to form fields
8. **Scheduling** - Background job for periodic sync
