# ServiceM8 Integration - Gap Analysis & Completion Roadmap

## Executive Summary

**Status:** ~60% Complete
- ✅ Infrastructure built (OAuth, API client, database schema)
- ✅ Mobile APIs fully functional
- ✅ Web dashboard for management
- ❌ Integration with EICR form incomplete
- ❌ PDF upload to ServiceM8 not implemented
- ❌ Background sync processor missing

---

## Current Implementation Status

### ✅ COMPLETE

#### 1. OAuth Authentication (100%)
- [x] Activation endpoint (`/api/servicem8/activate`)
- [x] Callback handler with code exchange
- [x] State parameter validation (CSRF protection)
- [x] Token storage in database
- [x] Company info fetching on first auth
- [x] Connection persistence per team
- **File:** [app/api/servicem8/activate/route.ts](app/api/servicem8/activate/route.ts), [callback/route.ts](app/api/servicem8/callback/route.ts)

#### 2. ServiceM8 API Client (100%)
- [x] REST client with 11 methods
- [x] Automatic token refresh on 401
- [x] Job CRUD operations
- [x] Client/Company CRUD operations  
- [x] Staff listing
- [x] Job materials fetching
- [x] Attachment download info
- [x] Category listing
- **File:** [lib/servicem8/client.ts](lib/servicem8/client.ts)

#### 3. Database Schema (100%)
- [x] `servicem8Connections` table
- [x] `servicem8JobMappings` table
- [x] `servicem8ClientMappings` table
- [x] Relationships and constraints
- [x] Sync status tracking
- **File:** [lib/db/schema.ts](lib/db/schema.ts) (lines 418-467)

#### 4. Web API Endpoints (100%)
- [x] Connection management (GET, DELETE, PATCH)
- [x] Client operations (GET, POST import, POST link)
- [x] Job operations (GET, POST link)
- [x] Webhook receiver (POST)
- **Files:** [app/api/servicem8/**/route.ts](app/api/servicem8/)

#### 5. Mobile APIs (100%)
- [x] Connection status endpoint
- [x] Client search with filtering
- [x] Job listing with filters
- [x] Job detail with customer + attachments
- [x] Attachment listing
- [x] Helper functions for normalization
- **Files:** [app/api/mobile/servicem8/**/route.ts](app/api/mobile/servicem8/)

#### 6. Web Dashboard (100%)
- [x] Connection overview
- [x] Jobs tab with table display
- [x] Clients tab with import UI
- [x] Settings tab with sync direction
- [x] Sync enable/disable toggle
- [x] Disconnect with confirmation
- [x] Error messages and URL params
- **File:** [app/(dashboard)/dashboard/servicem8/page.tsx](app/(dashboard)/dashboard/servicem8/page.tsx) (660 lines)

#### 7. Client Import (100%)
- [x] Bulk import all active clients
- [x] Mapping creation in `servicem8ClientMappings`
- [x] Duplicate prevention
- [x] Success counter
- **Endpoint:** POST `/api/servicem8/clients` with `action: 'import_all'`

---

### ⚠️ PARTIAL/INCOMPLETE

#### 1. Job Linking (50%)
**What works:**
- [x] API endpoint to link certificate to job
- [x] Database mapping storage
- [x] Sync status tracking

**What's missing:**
- [ ] UI component to select ServiceM8 job
- [ ] Integration with EICR form
- [ ] Pre-fill site name/address from job
- [ ] Pre-fill customer from job
- [ ] Visual indicator in certificate

**Files affected:** 
- Endpoint: [app/api/servicem8/jobs/route.ts](app/api/servicem8/jobs/route.ts)
- Form: [app/(dashboard)/certificates/new/eicr/page.tsx](app/(dashboard)/certificates/new/eicr/page.tsx)

#### 2. Webhook Sync (20%)
**What works:**
- [x] Webhook receiver at `/api/servicem8/webhook`
- [x] Entry parsing and routing
- [x] Account UUID lookup
- [x] Status marking as `pending`
- [x] Respects `syncEnabled` flag

**What's missing:**
- [ ] Background job processor
- [ ] Actual data sync logic
- [ ] Error handling and retries
- [ ] Conflict resolution
- [ ] Sync completion marking
- [ ] Activity logging
- [ ] Webhook signature verification

**Impact:** Changes in ServiceM8 are marked but never synced

#### 3. Attachment Management (40%)
**What works:**
- [x] Download info fetching
- [x] Image type detection
- [x] Mobile attachment listing
- [x] Preview URL generation

**What's missing:**
- [ ] PDF upload endpoint
- [ ] Multipart form handling
- [ ] Streaming upload
- [ ] File size validation
- [ ] MIME type validation
- [ ] Error handling
- [ ] Upload progress tracking

**Impact:** Can't attach certificates to ServiceM8 jobs

#### 4. Token Management (80%)
**What works:**
- [x] Token storage
- [x] Expiry tracking
- [x] Automatic refresh on 401
- [x] Database update on refresh

**What's missing:**
- [ ] Refresh token rotation validation
- [ ] Token revocation endpoint
- [ ] Secure encryption at rest
- [ ] Token rotation scheduling
- [ ] Expired token cleanup

**Impact:** Low - works but no advanced security features

---

### ❌ NOT IMPLEMENTED

#### 1. EICR Form Integration (0%)
**Missing:**
- [ ] ServiceM8 job selector component
- [ ] Job search/filter UI
- [ ] Auto-fill from selected job
- [ ] Service manager lookup
- [ ] Job materials → observations mapping
- [ ] Selected job display
- [ ] Unlink job functionality

**Why needed:** Users can't link certificates to ServiceM8 jobs when creating them

**Est. effort:** 2-3 days
- New component (~150 lines)
- Form integration (~100 lines)
- Server action updates (~50 lines)

#### 2. Certificate PDF Upload (0%)
**Missing:**
- [ ] Upload endpoint `/api/servicem8/jobs/[jobUuid]/attachments`
- [ ] PDF file handling
- [ ] ServiceM8 write_jobs scope
- [ ] Integration with PDF generator
- [ ] Error handling
- [ ] Upload confirmation
- [ ] UI feedback

**Why needed:** Certificates aren't stored in ServiceM8 where jobs are tracked

**Blocking issue:** `write_jobs` scope not enabled in ServiceM8 addon config

**Est. effort:** 1-2 days
- Endpoint (~80 lines)
- Form integration (~50 lines)
- Scope request to ServiceM8 support

#### 3. Background Sync Processor (0%)
**Missing:**
- [ ] Job scheduler (cron or queue)
- [ ] Pending record processor
- [ ] Conflict detection
- [ ] Retry logic with exponential backoff
- [ ] Error state handling
- [ ] Sync history logging
- [ ] Metrics/monitoring
- [ ] Graceful degradation

**Why needed:** ServiceM8 webhook events aren't acted upon

**Est. effort:** 3-4 days
- Processor logic (~200 lines)
- Scheduler setup (~50 lines)
- Error handling (~100 lines)
- Logging (~50 lines)

#### 4. Customer Profile Sync (0%)
**Missing:**
- [ ] Background sync of customer details
- [ ] Phone/email updates
- [ ] Address changes
- [ ] Contact person info
- [ ] Conflict resolution
- [ ] Sync direction validation

**Impact:** Manual updates required to keep customers in sync

**Est. effort:** 1-2 days (after processor built)

#### 5. Advanced Features (0%)
**Missing:**
- [ ] Custom field mapping
- [ ] Bi-directional sync
- [ ] Scheduled sync
- [ ] Sync history UI
- [ ] Batch operations
- [ ] Data validation rules
- [ ] Webhook signature verification
- [ ] Rate limit handling

---

## Gap Details

### Gap #1: ServiceM8 Job Selection in EICR

**Current State:**
```typescript
// EICR form collects:
- siteName: string (address lookup only)
- customer: string (local customer name)
- formData: {...} (no job reference)
```

**Desired State:**
```typescript
// Add to EICR form:
- servicem8Job: {
    uuid: string,
    address: string,
    description: string,
    customer: ServiceM8Client
  }
- Auto-filled siteName from job.job_address
- Auto-filled customer from job.company_uuid
```

**Implementation Steps:**

1. **Create JobSelector Component** (similar to OrganisationAutocompleteField)
```typescript
// File: components/ServiceM8JobSelector.tsx
export function ServiceM8JobSelector({
  value: string | null,
  onChange: (jobUuid: string) => void,
  onJobSelected: (job: ServiceM8JobRecord) => void,
  placeholder?: string,
}) {
  // Search via /api/servicem8/jobs?search=X
  // Display: [Job ID] - Address - Status
  // On select: fetch full job with customer
  // Call onJobSelected with job details
}
```

2. **Update EICR Form Page**
```typescript
// In /app/(dashboard)/certificates/new/eicr/page.tsx
const [selectedJob, setSelectedJob] = useState<ServiceM8JobRecord | null>(null);

useEffect(() => {
  if (selectedJob) {
    setSiteName(selectedJob.address);
    setClientAddress(selectedJob.address);
    // Pre-fill customer if available
    if (selectedJob.customer) {
      setCustomerName(selectedJob.customer.name);
    }
  }
}, [selectedJob]);

// In form JSX:
<ServiceM8JobSelector 
  value={selectedJob?.uuid}
  onChange={(uuid) => {
    // Fetch job details
    fetchJob(uuid).then(setSelectedJob);
  }}
/>
```

3. **Update createCertificate Action**
```typescript
const createCertificateSchema = z.object({
  servicem8JobUuid: z.string().uuid().optional(), // ADD THIS
  // ... other fields
});

export const createCertificate = async (data) => {
  // ... existing logic ...
  
  if (data.servicem8JobUuid) {
    await db.insert(servicem8JobMappings).values({
      teamId: team.id,
      certificateId: certificate.id,
      servicem8JobUuid: data.servicem8JobUuid,
      syncStatus: 'synced',
      lastSyncAt: new Date(),
    });
  }
};
```

### Gap #2: PDF Upload to ServiceM8

**Current State:**
- PDFs generated locally but not stored in ServiceM8
- No link between jobs and generated certificates
- Users must manually attach PDFs to jobs

**Desired State:**
```typescript
// After PDF generation in createCertificate:
if (servicem8JobUuid && certificatePDF) {
  await uploadCertificateToServiceM8(
    servicem8JobUuid,
    certificatePDF,
    `${certificateNumber}.pdf`
  );
}
```

**Implementation Steps:**

1. **Request write_jobs Scope**
   - Contact ServiceM8 support
   - Enable `write_jobs` in addon configuration
   - Update config after approval

2. **Create Upload Endpoint**
```typescript
// File: app/api/servicem8/jobs/[jobUuid]/attachments/upload/route.ts
export async function POST(request: NextRequest, { params }: { params: { jobUuid: string } }) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });
  
  const buffer = await file.arrayBuffer();
  const teamId = await getTeamId();
  const client = await ServiceM8Client_API.fromTeamId(teamId);
  
  // POST to ServiceM8 /jobattachment.json
  const response = await client.createJobAttachment(jobUuid, {
    file: buffer,
    fileName: file.name,
    mimeType: file.type,
  });
  
  return NextResponse.json(response);
}
```

3. **Add to ServiceM8Client**
```typescript
// In lib/servicem8/client.ts
async uploadJobAttachment(
  jobUuid: string,
  file: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ uuid: string }> {
  // Multipart form data request
  // POST /jobattachment.json
}
```

4. **Call After PDF Generation**
```typescript
// In app/(dashboard)/actions.ts createCertificate function
if (servicem8JobUuid && certificate.id) {
  try {
    const pdfBuffer = await generateCertificatePDF(certificate);
    await uploadCertificateToServiceM8(
      servicem8JobUuid,
      pdfBuffer,
      `${certificate.certificateNumber}.pdf`
    );
  } catch (error) {
    console.error('Failed to upload certificate to ServiceM8:', error);
    // Don't fail certificate creation, just log
  }
}
```

### Gap #3: Background Sync Processor

**Current State:**
- Webhooks received and stored
- Sync status set to `pending`
- Nothing processes pending records
- Changes in ServiceM8 never propagate to local DB

**Desired State:**
```typescript
// Every 5 minutes:
// 1. Find all pending job mappings
// 2. Fetch latest job from ServiceM8
// 3. Update local certificate if needed
// 4. Mark as synced
```

**Implementation Steps:**

1. **Create Processor Function**
```typescript
// File: lib/servicem8/sync-processor.ts
export async function processPendingServiceM8Syncs() {
  const pendingMappings = await db
    .select()
    .from(servicem8JobMappings)
    .where(eq(servicem8JobMappings.syncStatus, 'pending'));
  
  for (const mapping of pendingMappings) {
    try {
      const client = await ServiceM8Client_API.fromTeamId(mapping.teamId);
      if (!client) continue;
      
      const job = await client.getJob(mapping.servicem8JobUuid);
      
      // Update certificate if needed
      // Check for changes in job_description, work_done_description, etc
      
      await db
        .update(servicem8JobMappings)
        .set({
          syncStatus: 'synced',
          lastSyncAt: new Date(),
        })
        .where(eq(servicem8JobMappings.id, mapping.id));
    } catch (error) {
      // Mark as error, don't retry immediately
      await db
        .update(servicem8JobMappings)
        .set({
          syncStatus: 'error',
          updatedAt: new Date(),
        })
        .where(eq(servicem8JobMappings.id, mapping.id));
    }
  }
}
```

2. **Add Scheduler**
```typescript
// Option A: Use Next.js cron (Vercel)
// File: app/api/cron/servicem8-sync.ts
import { processPendingServiceM8Syncs } from '@/lib/servicem8/sync-processor';

export const maxDuration = 60; // 60 seconds
export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  await processPendingServiceM8Syncs();
  return Response.json({ success: true });
}

// Option B: Use node-cron (self-hosted)
// In server startup
import cron from 'node-cron';
cron.schedule('*/5 * * * *', () => processPendingServiceM8Syncs());
```

3. **Add to vercel.json** (if using Vercel)
```json
{
  "crons": [{
    "path": "/api/cron/servicem8-sync",
    "schedule": "*/5 * * * *"
  }]
}
```

---

## Implementation Roadmap

### Phase 1: Job Selection & Linking (2-3 days)
**Priority:** HIGH (enables core feature)

- [ ] Create ServiceM8JobSelector component
- [ ] Integrate into EICR form
- [ ] Update createCertificate action
- [ ] Add job UUID to form submission
- [ ] Test job selection and pre-fill
- **Deliverable:** Users can select and link jobs when creating certificates

### Phase 2: PDF Upload (1-2 days)
**Priority:** MEDIUM (requires ServiceM8 scope approval)

- [ ] Request `write_jobs` scope from ServiceM8
- [ ] Create attachment upload endpoint
- [ ] Add upload method to ServiceM8Client
- [ ] Integrate with PDF generation
- [ ] Add error handling
- [ ] Test upload flow
- **Deliverable:** Generated certificates stored in ServiceM8

### Phase 3: Background Sync (3-4 days)
**Priority:** MEDIUM (infrastructure feature)

- [ ] Create sync processor function
- [ ] Implement conflict detection
- [ ] Add retry logic
- [ ] Set up scheduler (cron)
- [ ] Add logging/monitoring
- [ ] Test webhook → sync flow
- **Deliverable:** ServiceM8 changes automatically sync to local DB

### Phase 4: Polish & Monitoring (2 days)
**Priority:** LOW (quality features)

- [ ] Add sync status UI
- [ ] Show sync history
- [ ] Error notifications
- [ ] Rate limit handling
- [ ] Webhook signature verification
- [ ] Performance monitoring
- **Deliverable:** Production-ready sync system

---

## Testing Checklist for Completion

### Manual Tests
- [ ] OAuth flow end-to-end
- [ ] Token refresh after expiry
- [ ] Client import with duplicates
- [ ] Job selection in EICR form
- [ ] Pre-fill site name from job
- [ ] Pre-fill customer from job
- [ ] Create certificate with job link
- [ ] PDF upload to ServiceM8
- [ ] Verify PDF in ServiceM8 job
- [ ] Webhook received and processed
- [ ] Sync status updated
- [ ] Error handling in sync

### Automated Tests
- [ ] API endpoint tests
- [ ] Database schema tests
- [ ] OAuth flow mocking
- [ ] Token refresh logic
- [ ] Job selector component
- [ ] Form submission validation
- [ ] Sync processor logic
- [ ] Error scenarios

### Integration Tests
- [ ] Full OAuth → Certificate creation flow
- [ ] Job selection → PDF upload flow
- [ ] Webhook → Sync → Database flow

---

## Risk Analysis

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|-----------|
| ServiceM8 scope denial | Cannot upload PDFs | Low | Alternative: manual upload UI |
| Token expiry during sync | Sync fails | Low | Refresh before request |
| Webhook signature issue | Security risk | Medium | Verify signature on receipt |
| Sync conflict | Data corruption | Medium | Last-write-wins + logging |
| Rate limiting | Sync blocked | Low | Implement backoff |
| Large PDF upload | Timeout | Medium | Stream upload, chunking |

---

## Resource Estimation

| Task | Effort | Complexity | Owner |
|------|--------|-----------|-------|
| Job selector component | 1 day | Medium | Frontend |
| EICR integration | 1 day | Low | Frontend |
| PDF upload endpoint | 1 day | Medium | Backend |
| Scope request + setup | 0.5 day | Low | DevOps |
| Sync processor | 2 days | High | Backend |
| Scheduler setup | 0.5 day | Low | DevOps |
| Testing | 2 days | Medium | QA/Dev |
| Documentation | 1 day | Low | Tech Writer |
| **Total** | **~9 days** | - | - |

---

## Next Action Items

### Immediate (This Week)
1. [ ] Request `write_jobs` scope from ServiceM8 support
2. [ ] Create `ServiceM8JobSelector` component design
3. [ ] Plan sync processor architecture

### Short Term (Next 2 Weeks)
1. [ ] Build job selector component
2. [ ] Integrate with EICR form
3. [ ] Implement PDF upload endpoint
4. [ ] Set up background processor

### Medium Term (Month 2)
1. [ ] Launch with job linking + PDF upload
2. [ ] Monitor sync performance
3. [ ] Add advanced features (custom fields, history UI)
4. [ ] Performance optimization

---

## References

- Full Implementation Guide: [SERVICEM8_IMPLEMENTATION_GUIDE.md](SERVICEM8_IMPLEMENTATION_GUIDE.md)
- Quick Reference: [SERVICEM8_QUICK_REFERENCE.md](SERVICEM8_QUICK_REFERENCE.md)
- Architecture: [SERVICEM8_ARCHITECTURE.md](SERVICEM8_ARCHITECTURE.md)
- Current Code:
  - EICR Form: [app/(dashboard)/certificates/new/eicr/page.tsx](app/(dashboard)/certificates/new/eicr/page.tsx)
  - API Endpoints: [app/api/servicem8/](app/api/servicem8/)
  - ServiceM8Client: [lib/servicem8/client.ts](lib/servicem8/client.ts)
