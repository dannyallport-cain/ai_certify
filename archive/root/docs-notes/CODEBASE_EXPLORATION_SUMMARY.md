# AI Certify Codebase Exploration: Certificate/PDF Generation System

## Executive Summary

The ai_certify system has a **well-architected PDF generation pipeline** that transforms web forms into professional certificates. The system supports 6 certificate types with a hybrid template approach (hardcoded defaults + optional database overrides).

---

## 1. Key File Paths for PDF/Template Generation

| Component | File Path | Purpose |
|-----------|-----------|---------|
| **PDF Generator** | `lib/pdf/generator.ts` | Main PDF generation engine (jsPDF-based, 1400+ lines) |
| **PDF Download API** | `app/api/certificates/[id]/pdf/route.ts` | REST endpoint for on-demand PDF rendering |
| **Download Button** | `components/DownloadPDFButton.tsx` | Client-side trigger for PDF download |
| **Certificate Schema** | `lib/db/schema.ts` | Database schema: certificates, certificateItems, certificateTemplates |
| **Template Seeding** | `scripts/seed-eicr-template.ts` | Dynamic EICR template definitions |
| **PDF Preview Canvas** | `components/disseminator/PdfPageCanvas.tsx` | Canvas-based PDF rendering (Report Disseminator feature, not integrated into certificates) |

### Certificate Type Form Routes
- `app/(dashboard)/certificates/new/bs5839-1/page.tsx` (Fire Detection - Non-Domestic)
- `app/(dashboard)/certificates/new/bs5839-6/page.tsx` (Fire Detection - Domestic)
- `app/(dashboard)/certificates/new/bs5266/page.tsx` (Emergency Lighting)
- `app/(dashboard)/certificates/new/fire-extinguisher/page.tsx` (Portable Fire Extinguisher)
- `app/(dashboard)/certificates/new/dry-riser/page.tsx` (Dry Riser Systems)
- `app/(dashboard)/certificates/new/eicr/page.tsx` (Electrical Installation Condition Report)

---

## 2. Form → PDF Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ USER ENTRY LAYER                                                    │
├─────────────────────────────────────────────────────────────────────┤
│ Form Page: /certificates/new/[certType]/page.tsx                  │
│ ├─ Certificate metadata (number, dates, inspector)                │
│ ├─ Customer selection → auto-populate from DB                     │
│ ├─ Type-specific formData fields                                  │
│ └─ Certificate items (defects, recommendations)                   │
└─────────────────────────────────────────────────────────────────────┘
                               ↓
                     FormData serialization
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│ SERVER ACTION LAYER                                                 │
├─────────────────────────────────────────────────────────────────────┤
│ createCertificate(): app/(dashboard)/actions.ts                    │
│ ├─ Parse FormData → TypeScript object                             │
│ ├─ Extract main certificate fields                                │
│ ├─ Collect remaining fields into formData JSON                    │
│ └─ Serialize certificateItems array                               │
└─────────────────────────────────────────────────────────────────────┘
                               ↓
                        DB INSERT
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│ DATABASE LAYER                                                      │
├─────────────────────────────────────────────────────────────────────┤
│ PostgreSQL Tables:                                                  │
│ ├─ certificates (main record + formData JSON column)              │
│ ├─ certificateItems (one per defect/item)                         │
│ ├─ customers (linked for auto-population)                         │
│ └─ certificateTemplates (optional color/font overrides)           │
└─────────────────────────────────────────────────────────────────────┘
                               ↓
                     User clicks "Download PDF"
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│ PDF GENERATION API LAYER                                            │
├─────────────────────────────────────────────────────────────────────┤
│ GET /api/certificates/[id]/pdf                                     │
│ ├─ Fetch certificate from DB                                      │
│ ├─ Fetch customer record (linked)                                 │
│ ├─ Fetch certificateItems array                                   │
│ ├─ Fetch certificateTemplates (optional override)                 │
│ └─ Construct CertificateData object                               │
└─────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│ PDF GENERATOR LAYER                                                 │
├─────────────────────────────────────────────────────────────────────┤
│ lib/pdf/generator.ts                                               │
│                                                                     │
│ Route logic:                                                        │
│ ├─ if certificateType === 'EICR'                                  │
│ │  └─→ generateEICRPDF() [8-page specialized]                    │
│ │                                                                  │
│ └─ else                                                            │
│    └─→ generateCertificatePDF() [generic fire safety]            │
│       ├─ BS5839-1 (Fire Detection Non-Domestic)                  │
│       ├─ BS5839-6 (Fire Detection Domestic)                      │
│       ├─ BS5266 (Emergency Lighting)                             │
│       ├─ FIRE_EXTINGUISHER                                       │
│       └─ DRY_RISER                                               │
│                                                                     │
│ Processing:                                                         │
│ ├─ Initialize jsPDF (A4, margins)                                │
│ ├─ Render sections based on certificate type                     │
│ ├─ Apply field transformations (date formatting, etc.)           │
│ ├─ Auto page breaks                                              │
│ ├─ Apply template colors (if available)                          │
│ └─ Return Uint8Array                                             │
└─────────────────────────────────────────────────────────────────────┘
                               ↓
                      HTTP Response (PDF)
                               ↓
             Browser Downloads: certificate-[number].pdf
```

---

## 3. Certificate Type Field Mappings

### BS5839-1: Fire Detection & Alarm (Non-Domestic)

**Form Fields (14+)**:
- Certificate number, customer, site name, site address
- Inspection date, next inspection date
- Inspector name, qualification, type
- System type (L1/L2/L3), zones, devices
- Control panel make/model
- Guided mode provides 13+ pre-filled steps

**PDF Sections**:
1. Site Details (name, address, customer, contact)
2. System/Equipment Details (type, category, panel, zones, devices, floors, area)
3. Inspection Details (date, inspector, qualification, type, next due, status)
4. Equipment/Items Tested (table from certificateItems)
5. Defects and Recommendations (color-coded boxes)
6. Certification Statement (hardcoded legal text)
7. Signature Section (Inspector & Client)

---

### BS5839-6: Fire Detection & Alarm (Domestic)

**Form Fields (13+)**:
- Certificate number, customer, site name
- Property type (Domestic, Bungalow, Flat, etc.)
- Floors, inspection date, next inspection date
- Grade of system (D, E, F)
- Smoke/Heat/CO detector counts
- Interconnection method, power supply
- Inspector name, qualification

**PDF Sections** (similar to BS5839-1):
1. Site Details
2. System Details (property type, detector counts, grade, interconnection)
3. Inspection Details
4. Equipment Tested
5. Defects/Recommendations
6. Certification Statement
7. Signature Section

---

### EICR: Electrical Installation Condition Report

**Form Fields (35+)**:
- Certificate number (CE format), customer, site name
- Client address, client organization
- Inspection date, next inspection date (1yr/3yr/5yr/10yr dropdown)
- Reason for report
- Installation address, premises type (Domestic/Commercial/Industrial)
- Wiring age, additions evidence, additions age
- Installation records available, last inspection date
- Extent of inspection, agreed limitations, agreed with
- Operational limitations
- Earthing arrangement (TN-C-S, TN-S, IT, TT)
- Means of earthing
- Overall assessment (SATISFACTORY, C1, C2, C3)
- Observations array (description + code)
- General condition
- Trading title, company email, registration number
- Inspector name, qualification

**PDF Sections (8-page document)**:
1. Cover Page: Report title, standards reference (BS 7671)
2. Section 1: Person Ordering the Report (client name, address)
3. Section 2: Reason for Report (reason, inspection dates)
4. Section 3: Installation Details (address, wiring age, additions, records, last inspection)
5. Section 4: Extent & Limitations (coverage scope, agreed limits, operational limits)
6. Section 5: Assessment Results (earthing, means of earthing)
7. Section 6: Test Results & Observations
   - **Observations rendered with color coding**:
     - C1 (Red): Danger Present
     - C2 (Orange): Potentially Dangerous
     - C3 (Blue): Improvement Recommended
     - FI (Purple): Further Investigation Required
8. Section 7: Installation Circuits Assessment
9. Section 8: Declaration (trading title, installer details, signatures)

**Special Features**:
- Greek letter support (Δ delta, Ω omega for electrical values)
- Company branding in header/footer
- BS 7671 compliance formatting
- Dynamic section generation based on observations array

---

### BS5266: Emergency Lighting

**Form Fields (10+)**:
- Certificate number, customer, site name
- System type (Maintained, Non-maintained, Mixed)
- Number of lamps, battery blocks
- Testing date, next test date
- Inspector name

**PDF Sections**:
- Site information
- System type and equipment counts
- Test results
- Signature block

---

### FIRE_EXTINGUISHER

**Form Fields (7+)**:
- Certificate number, customer, site name, address
- Inventory (textarea)
- Service date, next service date

**PDF Sections**:
- Inventory table
- Service details

---

### DRY_RISER

**Form Fields (9+)**:
- Certificate number, customer, site name
- Building height (meters), number of inlets
- Testing date, next test date
- Work required, recommendations
- Certifier signature

**PDF Sections**:
- Building information
- Test results
- Work required
- Inspector signature

---

## 4. Template System Architecture

### Hybrid Approach: Hardcoded + Optional Database Override

#### Tier 1: Hardcoded Defaults
- All PDF layouts are **hardcoded in `lib/pdf/generator.ts`**
- Default color palette baked into constants
- Default fonts: Helvetica + Symbol for special characters
- Used when no database template exists

#### Tier 2: Database Templates (Optional)

**Table**: `certificateTemplates`
```sql
{
  id: serial (primary key)
  teamId: integer (FK to teams)
  name: varchar(255)
  certificateType: varchar(50)  -- BS5839-1, BS5839-6, EICR, etc.
  isDefault: boolean
  isActive: boolean
  template: json                 -- Full template config below
  version: integer
  createdAt: timestamp
  updatedAt: timestamp
  createdBy: integer (FK to users)
}
```

**Template JSON Schema**:
```typescript
interface TemplateConfig {
  colors: {
    primary: string;       // e.g. '#1a3a5c'
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts?: {
    heading: string;
    body: string;
    size: { small: number; medium: number; large: number };
  };
  layout?: {
    margins: { top: number; right: number; bottom: number; left: number };
    spacing: number;
  };
}
```

### Template Lookup Flow

**Current**: On PDF generation in `/api/certificates/[id]/pdf/route.ts`:
```typescript
// Try to load team's active template for certificate type
const templates = await db
  .select()
  .from(certificateTemplates)
  .where(
    and(
      eq(certificateTemplates.certificateType, certificate.certificateType),
      eq(certificateTemplates.isActive, true)
    )
  )
  .orderBy(certificateTemplates.createdAt)
  .limit(1);

if (templates.length > 0 && templates[0].template) {
  templateConfig = templates[0].template;  // Override defaults
}
```

### Dynamic Template Definition

`scripts/seed-eicr-template.ts` demonstrates **intended dynamic structure**:
- Defines template as sections array
- Each section: `{ id, type, label, visible, order, config }`
- Section types: header, title, certificate-number, data-table, text-block
- Shows structure for full customization (not yet fully integrated into rendering)

### Default Color Palette

```
Navy:     [26,  58,  92]     — Headers, primary sections
Gold:     [255, 193, 7]      — Accents, certificate number boxes
Green:    [40,  167, 69]     — Success, "no defects" sections
Red:      [220, 53,  69]     — Defects, C1 observations
Orange:   [255, 140, 0]      — C2 observations
Purple:   [100, 55,  155]    — FI observations
Light:    [235, 242, 250]    — Section backgrounds
```

---

## 5. Field Transformations: Form Input → PDF Output

| Field | Form Input | PDF Output | Transformation Code |
|-------|-----------|-----------|-------------------|
| `inspectionDate` | ISO string (YYYY-MM-DD) | Formatted text (e.g. "22 March 2026") | `formatDate(dateString)` in generator.ts |
| `nextInspectionDate` | ISO string | Formatted text | `formatDate()` |
| Long text | No wrapping | Auto-wrapped at page width | `pdf.splitTextToSize(text, maxWidth)` |
| `observations[].code` | C1 \| C2 \| C3 \| FI | Color-coded box + label | Map code → color + label text |
| Boolean (Yes/No) | Form select | Text display | Direct string output |
| Multi-line textarea | Raw text | Word-wrapped with line breaks | `pdf.splitTextToSize()` + adjusted cell height |
| Special electrical chars | Input "I\\"n" or "ohms" | Rendered as Δ or Ω | Swap to Symbol font, render Unicode chars |
| `certificateItems[]` | Array of items | Table with alternating row colors | Render as header + rows with status checkmarks |
| Defects/Recommendations | Text | Red/colored boxes | `addColoredSection()` with appropriate RGB color |

### EICR-Specific Transformations

**Observations Mapping**:
```
Form Input: observations[].code
├─ C1  → Red box [220, 53, 69] + "C1 – Danger Present" + status=unsatisfactory
├─ C2  → Orange box [255, 140, 0] + "C2 – Potentially Dangerous" + status=unsatisfactory
├─ C3  → Blue box [52, 73, 124] + "C3 – Improvement Recommended" + status=satisfactory
└─ FI  → Purple box [100, 55, 155] + "FI – Further Investigation" + status=not_tested
```

**Greek Letter Substitution**:
- Input word "ohms" → Rendered as Ω (omega) in Symbol font
- Input "I\\"n" or "I dn" → Rendered as IΔn (delta) in Symbol font
- Maintains same visual position while swapping fonts mid-string

---

## 6. Form Fields in Entry vs PDF Rendering

### Fields Present in Forms BUT NOT in PDF
- Guided mode step definitions (internal UI only)
- Calculation logic for next inspection (form has dropdown 1yr/3yr/5yr, PDF just shows final date)
- Some validation metadata

### Fields Present in PDF BUT NOT in Form Entry
- Page headers/footers (auto-generated from company info + reference)
- Standard legal certification statements (hardcoded templates)
- Page numbers (added automatically during rendering)
- Signature placeholders (not filled by user, just layout boxes)

### Conditional Rendering (Based on Form Data)

If `evidenceOfAdditions === "No"`:
- Skip "Estimated Age of Additions" field in PDF

If `overallAssessment === "SATISFACTORY"` (EICR):
- Render green success box: "NO DEFECTS IDENTIFIED"
- Skip defect sections

If observations array is empty (EICR):
- Show green "STATUS: NO DEFECTS IDENTIFIED" section

If items/observations exist:
- Render colored boxes with description and recommendation

---

## 7. Current Preview Capabilities

### ❌ Status: NO LIVE PREVIEW for Certificates

**Current User Experience**:
1. User fills form with all data
2. Submits → Certificate saved to DB
3. Navigates to certificate detail page
4. Views certificate metadata + item list
5. Clicks "Download PDF"
6. PDF generated on-demand → Downloaded to computer
7. User opens PDF in external viewer to see final result

### ✅ Preview Infrastructure Found But Not Integrated

**Canvas-Based PDF Viewer**: `components/disseminator/PdfPageCanvas.tsx`
- Renders base64-encoded PDF to HTML canvas using **pdfjs-dist**
- Overlays interactive field selection using **react-konva**
- Used for: Report Disseminator feature (custom PDF form templates)
- **Not integrated into certificate workflow**

**Usage Example**:
```typescript
<PdfPageCanvas 
  pdfBase64={templatePdf}      // Base64 PDF
  pageNumber={1}               // Which page to render
  fields={fieldOverlays}       // Field bounding boxes
  selectedId={selected}        // For highlighting
  onSelectField={handleSelect} // Click handler
/>
```

### Opportunity: Implement Live Preview

**Potential Implementation**:
```
1. Add "Preview PDF" button on form (alongside Submit)
2. Trigger POST /api/certificates/preview (accepts JSON without saving)
3. Open modal with iframe or PdfPageCanvas component
4. User reviews → "Make Changes" or "Save & Download"

Technical Requirements:
├─ New API route: /api/certificates/preview (no database insert)
├─ Reuse generateCertificatePDF() function
├─ Modal component with PDF display
└─ Form validation before preview
```

### No PDF Caching or Staging
- PDFs generated **only on-demand** when user clicks download
- No temporary file storage
- Each download regenerates PDF from live DB data
- No staging environment or cached PDFs

---

## 8. Database Storage Details

### Certificates Table
```typescript
certificates {
  id: serial (primary key)
  teamId: integer (FK)
  customerId: integer (FK)
  
  // Main fields
  certificateType: varchar(50)
  certificateNumber: varchar(100)
  status: varchar(20)  // draft, completed, issued
  
  // Standard fields
  siteName: varchar(255)
  siteAddress: text
  inspectionDate: date
  nextInspectionDate: date
  inspectorName: varchar(255)
  inspectorSignature: text
  
  // Type-specific data stored as JSON
  formData: json  // All extra fields collected from form
  
  // Audit
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Certificate Items Table
```typescript
certificateItems {
  id: serial (primary key)
  certificateId: integer (FK)
  
  itemType: varchar(100)       // detector, observation, etc.
  location: varchar(255)
  description: text
  status: varchar(50)          // satisfactory, unsatisfactory, not_tested
  
  // For defect tracking
  defects: text
  recommendations: text
  
  sortOrder: integer
  createdAt: timestamp
}
```

### formData Column (JSON)
All type-specific and extra fields are stored as a JSON object in the `certificates.formData` column:

**Example for EICR**:
```json
{
  "reasonForReport": "Landlords safety report.",
  "installationAddress": "123 High Street",
  "premisesType": "Commercial",
  "estimatedAgeOfWiring": "25",
  "evidenceOfAdditions": "Yes",
  "estimatedAgeOfAdditions": "10",
  "installationRecordsAvailable": "No",
  "dateOfLastInspection": "2020-03-15",
  "extentOfInspection": "100% of installation",
  "agreedLimitations": "No testing of HVAC circuits",
  "agreedLimitationsWith": "Client",
  "earthingArrangement": "TN-C-S",
  "meansOfEarthing": "Distributor's facility",
  "overallAssessment": "SATISFACTORY",
  "tradingTitle": "Cain Enabled Engineering Ltd",
  "companyEmail": "office@cain-enabled.co.uk",
  "registrationNumber": "REG123456"
}
```

---

## Summary: Quick Reference Table

| Aspect | Current Implementation | Notes |
|--------|------------------------|-------|
| **PDF Generation** | On-demand, jsPDF-based | Triggered by `/api/certificates/[id]/pdf` endpoint |
| **Certificate Types** | 6 supported | BS5839-1, 6, BS5266, FIRE_EXTINGUISHER, DRY_RISER, EICR |
| **Template System** | Hybrid (hardcoded + DB override) | Defaults hardcoded, colors customizable via DB template |
| **Data Storage** | PostgreSQL (formData JSON column) | Flexible schema for type-specific fields |
| **Transformations** | Date formatting, color mapping, text wrapping | Applied during PDF generation |
| **Preview** | ❌ Not available | Users download to preview; infrastructure exists but not integrated |
| **Caching** | None | PDFs regenerated each download |
| **Multi-page** | Yes (auto page breaks) | 8-page EICR, 2-4 pages other types |
| **Color Customization** | Yes (via template) | Primary, secondary, accent, background, text colors |
| **Font Support** | Helvetica + Symbol | Special characters (Δ, Ω) supported for EICR |

---

## Recommended Next Steps

1. **Add live PDF preview** (highest value for UX)
2. **Fully integrate dynamic templates** into PDF rendering logic
3. **Document field mapping** in user-facing help system
4. **Create template editor UI** for admin users
5. **Implement PDF caching** for performance optimization
6. **Add pre-save preview** option on forms
