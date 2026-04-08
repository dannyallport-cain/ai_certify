# BS5839-1 inspection summary

Compared `app/(dashboard)/certificates/new/bs5839-1/page.tsx` against newer aligned pages:
- `app/(dashboard)/certificates/new/bs5266/page.tsx`
- `app/(dashboard)/certificates/new/fire-extinguisher/page.tsx`

## Summary

### app/(dashboard)/certificates/new/bs5839-1/page.tsx
- **Layout/design alignment**
  - Top-level wrapper is broadly aligned: uses `flex-1 space-y-6 p-4 pt-6 md:p-8`, card-based sections, same heading/action layout.
  - Still presents like an older intermediate page:
    - form uses `max-w-5xl` while newer aligned pages use `max-w-6xl`
    - section structure is simpler and less deliberately grouped than newer pages

- **Import/app convention mismatches**
  - Imports `createCertificate` from relative path `../../../actions`; newer aligned `bs5266` uses `@/app/(dashboard)/actions`
  - Does not export `dynamic = 'force-dynamic'`; `bs5266` does
  - Uses handwritten `selectClassName` and raw `<select>` / `<textarea>` instead of shared UI components

- **Form system mismatches**
  - Uses shared fields like `CertificateNumberField`, `DateDropdownField`, `NextVisitField`, `OrganisationAutocompleteField`, `AddressAutocompleteField`, which is good
  - But still mixes in older raw controls:
    - native `<select>` for `inspectionType`
    - native `<select>` for `serviceInterval`
    - native `<textarea>` for `defectsFound`
    - native `<textarea>` for `recommendations`
  - Customer field still uses `<Input list>` + `<datalist>`; comparison pages do too, so this is not uniquely outdated
  - Secondary date fields (`installationDate`, `lastServiceDate`) are raw `<Input type="date">`; only partial mismatch

- **Styling mismatches**
  - Manual `selectClassName` duplicates design-system styling
  - Textareas duplicate utility classes inline instead of using `Textarea`
  - Generic radio IDs (`L1`, `satisfactory`, etc.) are less conventionally namespaced than newer pages
  - Uses emoji labels in system condition radio options, unlike newer pages’ more neutral text presentation

- **Save/submit flow mismatches**
  - Core submit flow is mostly aligned:
    - `isSubmitting`
    - `formError`
    - append `certificateType`
    - call `createCertificate`
    - redirect on session expiry
  - Missing richer current-system behavior:
    - no save-draft button
    - no draft persistence/recovery
    - no autosave
    - no explicit integration with a certificate draft system

- **Guided mode mismatches**
  - Guided mode exists and uses shared `GuidedModeModal`
  - `handleGuidedComplete` does not `await handleSubmit(formData)` before closing modal, unlike newer pages
  - Guided steps cover only a subset of the form

- **Preview / PDF hook mismatches**
  - Uses `PreviewModal`, so broad pattern is aligned
  - But preview data shape is inconsistent/incomplete:
    - preview `certificateType` is `'BS5839_1'`
    - submit/hidden input `certificateType` is `'BS5839-1'`
    - `nextInspectionDate` preview key is sourced from `nextVisitDate`
    - guided mode uses `nextInspectionDate`, but actual form field is `nextVisitDate`
  - Preview omits several entered fields:
    - `serviceInterval`
    - `installationDate`
    - `lastServiceDate`
    - `overallCondition`
    - `defectsFound`
    - `recommendations`

- **Data/model/app convention mismatches**
  - Mixed terminology: `inspectionDate`, `nextVisitDate`, preview `nextInspectionDate`
  - Guided step field names do not fully match actual form field names
  - Hidden certificate type input plus `formData.append('certificateType', ...)` is redundant, though consistent with comparison pages

- **Completeness relative to newer pages**
  - Newer pages use more typed option constants and shared selects
  - Newer pages include more standard modern fields like responsible person, competency/company registration, work carried out, certifier name
  - BS5839-1 feels less normalized to current app-wide certificate conventions

## Exact mismatches to fix later
- relative `createCertificate` import instead of `@/app/(dashboard)/actions`
- no `export const dynamic = 'force-dynamic'`
- `max-w-5xl` instead of `max-w-6xl`
- native `<select>` instead of shared `Select`
- native `<textarea>` instead of shared `Textarea`
- manual `selectClassName` helper instead of shared select components
- guided submit does not `await`
- preview type `'BS5839_1'` differs from submit type `'BS5839-1'`
- field naming mismatch: `nextVisitDate` vs `nextInspectionDate`
- preview omits several form fields
- no visible save-draft / draft-system integration
- radio IDs and emoji labels are less consistent with newer app conventions