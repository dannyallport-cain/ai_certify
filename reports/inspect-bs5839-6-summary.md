# BS5839-6 inspection summary

Inspection only. No application source files were modified.

## Files inspected
- app/(dashboard)/certificates/new/bs5839-6/page.tsx
- app/(dashboard)/certificates/new/fire-extinguisher/page.tsx

## Summary of mismatches for `app/(dashboard)/certificates/new/bs5839-6/page.tsx`

### 1. Layout / page-shell alignment
- BS5839-6 is already partly modernized and follows the newer shell pattern:
  - `use client`
  - outer wrapper `flex-1 space-y-6 p-4 pt-6 md:p-8`
  - title/description/actions header
  - card-based sections
- It is still slightly behind the richer newer page pattern:
  - form width is `max-w-5xl`, while newer pages like fire-extinguisher use `max-w-6xl`
  - no higher-level shared certificate page wrapper abstraction is used

### 2. Fetching / data loading convention
- BS5839-6 uses:
  - `const fetcher = (url: string) => fetch(url).then((res) => res.json());`
- fire-extinguisher uses a safer fetcher:
  - checks `res.ok`
  - throws on failure
- So BS5839-6 is less aligned with current defensive fetch/error-handling conventions.

### 3. Form system mismatch
- BS5839-6 uses a mostly manual pattern:
  - `formRef`
  - native `FormData`
  - `<form action={handleSubmit}>`
  - local state only for some fields
- It does not show any draft-aware form orchestration, schema-driven form handling, or shared certificate form engine.

### 4. Shared component usage
BS5839-6 does use current shared components:
- `AddressAutocompleteField`
- `CertificateNumberField`
- `DateDropdownField`
- `NextVisitField`
- `PreviewModal`
- `GuidedModeModal`
- shadcn UI primitives

But there are still gaps:
- customer selection is custom `Input + datalist + hidden customerId`, not a shared selector component
- sections are hand-built rather than composed from more reusable certificate field groups
- `siteName` is used as the property address field, which is semantically inconsistent with newer pages that separate `siteName` and `siteAddress`

### 5. Preview / PDF alignment
- Preview is manually built from `FormData`.
- Important mismatches:
  - submit uses `certificateType = 'BS5839-6'`
  - preview uses `certificateType = 'BS5839_6'`
  - preview sets `siteAddress: ''`
- That means preview/PDF-style downstream handling may be inconsistent and the address is not preserved in preview output.

### 6. Save / submit flow mismatch
- BS5839-6 directly submits through `createCertificate({}, formData)`.
- Missing current-system behaviors:
  - no save-as-draft
  - no draft loading/resume
  - no autosave
  - no explicit draft lifecycle integration
- Guided mode completion is weaker than newer page behavior:
  - `handleGuidedComplete` is not `async`
  - it calls `handleSubmit(formData)` without `await`
  - modal closes immediately, even if submission fails or is still in progress

### 7. App convention mismatches
- Loose typing remains:
  - `previewData` is `any`
  - customer records are `any`
- No customer fetch failure UI.
- Auto-population is semantically muddy:
  - `siteName` may be filled from customer address or customer name
- No explicit success navigation/handling after certificate creation is visible.

## Exact issues to carry forward
- `fetcher` does not validate `res.ok`
- `handleGuidedComplete` does not `await handleSubmit`
- preview uses `BS5839_6` while submit uses `BS5839-6`
- preview hardcodes empty `siteAddress`
- no draft/save-draft/resume-draft integration
- no visible PDF/export hook beyond preview modal
- custom customer datalist instead of a shared customer selector
- continued use of `any`

## Notes
- Comparison was based on the available newer aligned page `app/(dashboard)/certificates/new/fire-extinguisher/page.tsx`.
- No code changes were made.