# Admin Approval Schemes + Universal Header Logo

- [x] Add DB table and migration for approval scheme types (`approval_scheme_types`)
- [x] Add query helpers in `lib/db/queries.ts` for list/create/update/delete (hard delete)
- [x] Add APIs:
  - [x] `app/api/admin/approval-schemes/route.ts` (GET/POST)
  - [x] `app/api/admin/approval-schemes/[id]/route.ts` (PATCH/DELETE)
  - [x] `app/api/approval-schemes/route.ts` (GET active list)
- [x] Refactor `lib/approval-schemes.ts` to DB-friendly types/helpers (remove hardcoded lock-in)
- [x] Add admin page `app/(dashboard)/admin/approval-schemes/page.tsx` for add/edit/delete
- [x] Add admin nav entry and overview quick action for Approval Schemes
- [x] Update user form(s) to fetch approval schemes from API (starting MEIWC page)
- [x] Update PDF data assembly in `lib/certificates/pdf.ts`:
  - [x] prefer certificate-level selected approval schemes
  - [x] fallback to user defaults
  - [x] include approval scheme metadata needed for header rendering
- [ ] Update `lib/pdf/generator.ts`:
  - [ ] remove static dependency for approval scheme rendering
  - [ ] render selected approval schemes from provided metadata in all relevant outputs
  - [ ] ensure company logo is rendered universally in report/certificate headers
- [ ] Run targeted validation and summarize changes
## Zone plans — hosted viewer (shipped)

- [x] Colour coded zones drawn on the plan (drag to create, rename, recolour, duplicate, delete)
- [x] Editable legend: plan title, site, job reference, revision, prepared by/on, notes
- [x] Company block (name, address, phone, email, website, accreditation) printed with the drawing
- [x] Separate zone key and device key in the exported SVG
- [x] Hosted viewer at `/plan/[token]`, noindex, token is the credential
- [x] Public read endpoint `GET /api/zone-plans/[token]` and save endpoint `PATCH` (403 when the link is view only)
- [x] Publish from the mobile plan screen ("Send zone plan link"), optional recipient email, editable toggle
- [x] Email delivery via Brevo with the viewer link
- [x] `fire_alarm_zone_plans` table and `20260428120000_add_fire_alarm_zone_plans` migration

## Zone plans — next

- [ ] GLB/glTF export of the completed plan
  - [ ] Extrude room footprints into wall solids (openings cut in), device primitives on their mountings
  - [ ] Build the scene from `Plan3DRoom` / `Plan3DPlacedDevice` so the web and mobile drawings stay the single source of truth
  - [ ] Emit GLB for viewing (`<model-viewer>` on a page, or a downloadable file) and pair with USDZ for AR Quick Look on iOS
  - [ ] Include the zone fills as floor materials so compartments read in 3D
  - [ ] Serve the artefact from the existing token route so a shared link can offer "download 3D model"
- [ ] Mobile-side zone authoring (the hosted viewer already draws zones; the phone currently publishes with an empty zone set)
- [ ] PDF export of the zone plan with the company block and both keys, for the certificate pack
