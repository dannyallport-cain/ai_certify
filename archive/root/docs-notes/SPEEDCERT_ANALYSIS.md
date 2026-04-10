# SpeedCert.com Application Analysis

## Executive Summary
SpeedCert is a UK-based electrical certificate management platform specifically designed for electricians. The application offers AI-powered certificate creation, offline functionality, team collaboration, and BS7671 compliance. This document maps out their complete structure as a reference for ai_certify development.

---

## Application Architecture

### Navigation Structure (Sidebar)
The app uses a sidebar navigation with the following sections:

| Section | URL | Description |
|---------|-----|-------------|
| Certificates (Dashboard) | `/dashboard` | Main certificate management hub |
| Clients | `/clients` | Client/customer CRM |
| Installations | `/installations` | Physical location tracking |
| Fire Log Books | `/fire-log-books` | Digital fire safety compliance |
| Assets | `/assets` | Equipment/asset register |
| Team | `/team` | Team member management |
| Paid Files | `/paid-files` | Monetization: sell files behind payment links |
| Questions | `/questions` | Customer Q&A across certificates |
| Pricing | `/pricing` | Subscription management |
| Settings | `/settings` | Company & account settings |
| Email Builder | `/email-builder` | Custom email templates |
| Roadmap | `/roadmap` | Feature requests & issue tracking |
| Videos | `/videos` | Tutorial content |
| Free Software | `/other` | Free tools/resources |
| Pocket Guides | `/pocket-guides` | Quick reference guides |

---

## Core Features

### 1. Certificates Dashboard (`/dashboard`)
**Key UI Elements:**
- Search bar for certificates
- Filter dropdown
- Sort by: Created Date (with toggle direction)
- View toggle: Cards / Table
- "New Certificate" CTA button
- Certificate count display

**Table Columns:**
- Number
- Client
- Installation
- Type
- Status
- Created
- Actions

**Empty State:**
- "No certificates found" message
- "Create Your First Certificate" CTA
- Note about browser storage vs database sync

---

### 2. Clients Management (`/clients`)
**Description:** Manage client relationships and contact information

**Key Features:**
- "New Client" button
- "Import from CSV" - bulk import capability
- "Paste to Add" - quick paste import
- Search box
- View toggle: Cards / Table

**Table Columns:**
- Client (name)
- Contact
- Email
- Phone
- Actions

**Empty State:**
- "No clients found"
- "Add Your First Client" CTA

---

### 3. Installations (`/installations`)
**Description:** Manage installation locations and inspection schedules

**Key Features:**
- "New Installation" button
- Search box
- View toggle: Cards / Table

**Table Columns:**
- Installation (address/name)
- Client
- Actions

---

### 4. Fire Log Books (`/fire-log-books`)
**Description:** Digital fire safety compliance records

**Categories Tracked:**
- Fire Alarms
- Fire Extinguishers
- Emergency Lighting
- Fire Drills
- Fire Doors
- Fire Blankets
- Sprinklers
- And more...

**Entry Types:**
- Weekly tests
- Monthly inspections
- Quarterly services
- Annual maintenance
- Repairs
- Fire drills
- Ad-hoc entries

**Features:**
- Automatic next due date calculations
- Photo attachments
- Link entries to related certificates
- Client portal access (secure share links)
- Complete audit trail

---

### 5. Asset Register (`/assets`)
**Description:** Manage and track physical assets across sites

**Dashboard Metrics:**
- Total Assets (with active count)
- Due Inspections
- Open Defects
- Sites count

**Key Features:**
- Export functionality
- Manage Sites
- Templates
- QR Code scanning
- Add Asset

**Search/Filter:**
- Search by: name, ID, type, category, serial number
- Filter by status
- Filter by site

---

### 6. Team Management (`/team`)
**Description:** Add team members, generate invitation codes, manage certificate assignments

**Key Features:**
- Add Team Member button
- Team subscription model: £5/month per member slot
- Team member slots quantity selector
- Search team members
- Toggle: Show disabled members

---

### 7. Settings (`/settings`)
**Tabs:**
1. **Company**
2. **Account**
3. **Payments**
4. **Certificate Types**
5. **Templates**

#### Company Tab - Quick Navigation:
- Offline Mode
- Company Logo
- Registration Logo
- Additional Logo 1
- Additional Logo 2
- Company Information
- Equipment
- ServiceM8 (integration)
- Company Actions

#### Company Settings Details:

**Offline Mode:**
- Force offline mode toggle
- Auto offline mode (switch on poor network)
- Network notifications
- Network quality testing every 30 seconds
- Auto-recovery when connection improves

**Logos:**
- Company Logo (main)
- Registration Logo (NICEIC, ELECSA, etc.)
- Additional Logo 1
- Additional Logo 2
- Each logo has:
  - File upload (PNG/JPG, 256×256 recommended)
  - Size selector (Small/Medium/Large)
  - White square & shadow toggle

**Company Information:**
- Company/Client Name
- Email
- Phone
- Website
- Address (with "Use Current Location" button)
  - Address Line 1
  - Address Line 2
  - Town/City
  - Postcode
- Electrician Registration Number
- VAT Number
- Gas Safe Registration Number
- Save button

**Equipment Management:**
- Name
- Type
- Serial number
- Last calibrated date
- Calibration due date
- Notes
- Add/Sync buttons

**ServiceM8 Integration:** (Premium feature)
- Connect ServiceM8 for job data sync
- Customer information
- Site addresses and contacts
- Work order references

**Company Actions:**
- Join or Switch Company
- Leave Company
- Delete Company

---

## Pricing Model

### Tier 1: Free Forever (£0)
- Offline mobile access
- Basic certificate forms
- Local data storage
- Basic PDF export
- Essential tools only
- Email support
- No AI features
- Unlimited certificates

### Tier 2: Pay Per Certificate (£1)
- First certificate completely free
- Single certificate generation
- Full inspection forms with AI features
- PDF export
- Basic support
- Valid for 30 days

### Tier 3: Monthly Subscription (£10/month) - MOST POPULAR
- Unlimited certificates with AI features
- All inspection forms
- PDF export & email
- ServiceM8 integration
- Priority support
- Team collaboration
- 1 team seat included (extra £5/month each)
- Advanced analytics
- Custom branding

---

## Certificate Types Supported

### Electrical:
1. **EICR** - Electrical Installation Condition Report (Most Popular)
2. **EIC** - Electrical Installation Certificate
3. **Minor Works** - Minor Electrical Installation Works
4. **PAT Testing** - Portable Appliance Testing
5. **Solar PV** - Solar PV System Inspection

### Fire Safety:
6. **Fire Alarm** - Fire Detection & Alarm System
7. **Fire Alarm Grade CDF** - Grade C, D, F Systems
8. **Fire Extinguisher** - Servicing Worksheet (BS 5306-3:2017)
9. **Smoke Vent Service** - AOV Systems Checklist
10. **Emergency Lighting** - Testing Report
11. **Emergency Lighting Completion** - Completion Certificate

### General:
12. **Call Out Report** - Emergency Call Out Report (NEW)

---

## AI Features

### AI Circuit Detection
- Snap photos of consumer units/distribution boards
- Automatic detection of:
  - Circuits
  - RCDs
  - MCBs
- Auto-populate certificate fields

### PDF to EICR Conversion
1. Upload existing PDF document
2. AI extracts and structures data automatically
3. View formatted EICR with circuit details
4. Download BS7671-compliant certificate

---

## Key UI Patterns

### Header Bar
- Back button (←)
- Toggle Sidebar button
- Company logo area
- Certificate count badge
- "Certificates" title with description
- Network quality indicator (Fair/Poor)
- Local/Online mode indicator
- Notifications bell

### Empty States
- Icon or illustration
- Clear message ("No [items] found")
- Description text
- Primary CTA button ("Add Your First [Item]")

### List Views
- Toggle between Cards and Table views
- Search functionality
- Filter options
- Sort controls

### Support Channels
- WhatsApp floating button (bottom right)
- Live chat button (below WhatsApp)
- WhatsApp number: +447440737918

### Mobile Support
- PWA (Progressive Web App) installable
- Google Play Store app
- Works offline
- Syncs when back online

---

## Technical Features

### Offline Capabilities
- Local data storage
- Auto-sync when online
- Network quality monitoring
- Force offline mode option

### Data Import/Export
- CSV import for clients
- Paste to add functionality
- PDF export
- QR code scanning for assets

### Integrations
- ServiceM8 (job management)
- WhatsApp (support)
- Google Play Store

---

## ServiceM8 API Integration Details

SpeedCert integrates with ServiceM8 to auto-populate certificate data from existing jobs. This is how they pull client/installation data.

### Key ServiceM8 API Endpoints for Certificate Integration:

#### 1. Clients (`/api_1.0/company.json`)
**OAuth Scope:** `read_customers`

| Field | Type | Use in Certificate |
|-------|------|-------------------|
| `name` | string | Client name |
| `address_street` | string | Installation address line 1 |
| `address_city` | string | Town/City |
| `address_state` | string | County/Region |
| `address_postcode` | string | Postcode |
| `address_country` | string | Country |
| `website` | string | Client website |
| `abn_number` | string | Business/VAT number |
| `uuid` | uuid | Unique identifier |
| `billing_address` | string | Billing address |
| `is_individual` | string | Individual vs company |

#### 2. Company Contacts (`/api_1.0/companycontact.json`)
**OAuth Scope:** `read_customers`

| Field | Use in Certificate |
|-------|-------------------|
| `first` | Contact first name |
| `last` | Contact last name |
| `email` | Contact email |
| `mobile` | Contact phone |
| `company_uuid` | Links to Client |

#### 3. Jobs (`/api_1.0/job.json`)
**OAuth Scope:** `read_jobs`

| Field | Type | Use in Certificate |
|-------|------|-------------------|
| `company_uuid` | uuid | Links to Client |
| `job_address` | string | Installation address |
| `job_description` | string | Work description |
| `work_done_description` | string | Work completed notes |
| `status` | enum | Quote/Work Order/Completed |
| `date` | string | Job date |
| `generated_job_id` | string | Job reference number |
| `geo_street` | string | Parsed street address |
| `geo_city` | string | Parsed city |
| `geo_postcode` | string | Parsed postcode |
| `geo_state` | string | Parsed state/county |
| `category_uuid` | uuid | Job type category |
| `completion_date` | string | When job completed |
| `purchase_order_number` | string | PO reference |

#### 4. Job Contacts (`/api_1.0/jobcontact.json`)
Links contacts to specific jobs (site contacts).

#### 5. Locations (`/api_1.0/location.json`)
Saved locations/sites for recurring work.

#### 6. Assets (`/api_1.0/asset.json`)
Equipment and assets at locations.

### OAuth Authentication Flow:
1. User clicks "Connect ServiceM8" in Settings
2. Redirects to ServiceM8 OAuth consent screen
3. User grants permissions (read_customers, read_jobs, etc.)
4. App receives access token + refresh token
5. Store tokens securely per user/company

### Workflow for SpeedCert Integration:
1. User selects "Import from ServiceM8" when creating certificate
2. App fetches recent jobs from ServiceM8
3. User picks a job
4. App auto-populates:
   - Client name and contact details
   - Installation address (from job_address)
   - Job reference number
   - Work description
5. User completes certificate with test results
6. (Optional) Sync completed certificate back to ServiceM8 as attachment

### Standards Compliance
- BS 7671 (18th Edition)
- BS 5839-6:2019 (Fire safety)
- BS 5306-3:2017 (Fire extinguishers)
- GDPR compliant

---

## Landing Page Structure

### Hero Section
- Trust indicator ("300+ UK Electricians")
- Headline emphasizing AI and speed (3x faster)
- Value proposition text
- App download buttons (Google Play, PWA)
- Free trial CTA
- No credit card required messaging

### Stats Section
- 30 min saved per certificate
- 300+ active electricians
- 450+ certificates created
- Customer satisfaction %

### Feature Badges (Scrolling)
- BS7671 Compliant
- GDPR Secure
- 30 Min Faster
- Works Offline
- AI Powered
- Team Collaboration
- Professional PDFs
- 5-Star Rated

### Demo Section
- Platform screenshots showing workflow
- Mobile First → AI Detection → Smart Dashboard

### Features Grid
- AI Vision
- Lightning Fast
- Team Sync
- Offline Mode
- BS7671 Ready
- Client CRM
- Audit Trail
- Secure Cloud
- Pocket Guides

### Three Steps Section
1. Snap Photos
2. AI Magic
3. Get PDF

### Certificate Types Showcase
- Cards for each certificate type

### Digital Fire Log Books Section
- Comprehensive fire safety records
- Secure client portal access

### Pocket Guides Section
- Electrician's Guide
- Fire Alarm Engineer's Guide
- Plumber's Guide

### Testimonials Section
- Customer quotes with names and companies

### Pricing Section
- Three-tier pricing display
- Feature comparison
- CTA buttons

### Legal/Policies Section (Accordion)
- Terms of Service
- Privacy Policy
- Cookie Policy
- Refund Policy
- Acceptable Use Policy
- Company Policy
- GDPR

### Footer
- Product links
- Company links
- Legal links
- Copyright notice

---

## Recommendations for ai_certify

### High Priority Features to Implement:
1. **Client CRM** - Core for certificate management
2. **Installations tracking** - Link certificates to locations
3. **Certificate types** - Start with EICR, EIC, Minor Works
4. **PDF generation** with company branding
5. **Offline mode** - Critical for field work
6. **Cards/Table view toggle** - Standard UX pattern

### Medium Priority:
7. **Team collaboration** with role-based access
8. **Asset register** for equipment tracking
9. **Fire Log Books** for compliance
10. **CSV import** for data migration
11. **Search and filter** across all sections

### Premium/Differentiation Opportunities:
12. **AI circuit detection** (major differentiator)
13. **PDF to EICR conversion**
14. **ServiceM8 or similar integrations**
15. **Client portal access** for fire log books
16. **QR code scanning** for assets
17. **Email builder** for customization

### Pricing Strategy to Consider:
- Free tier for basic use
- Per-certificate pricing for occasional users
- Monthly subscription for professionals
- Team seat add-ons

---

*Screenshot saved to: `/Users/admin/Development/ai_certify/speedcert-fullpage.png`*
