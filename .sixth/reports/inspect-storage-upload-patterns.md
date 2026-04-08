# Storage and upload pattern inspection

## Files inspected

- `app/api/mobile/uploads/route.ts`
- `components/settings/MobileCaptureClient.tsx`
- `lib/storage/r2.ts`
- `lib/auth/mobile-capture.ts`
- `lib/auth/mobile.ts`

## Existing upload/storage patterns

### 1) General mobile binary upload route
**File:** `app/api/mobile/uploads/route.ts`

Current behavior:
- Authenticates with `getMobileUser(request)` from `lib/auth/mobile.ts`.
- Requires a Bearer token and a resolved `auth.team`.
- Accepts `multipart/form-data`.
- Validates payload with Zod.
- Supported categories are:
  - `certificate-photo`
  - `user-asset`
- Reads these form fields:
  - `file` (required `File`)
  - `category`
  - `certificateNumber`
  - `label`
  - `type`
  - `slotIndex`
- Converts uploaded file to `Buffer`.
- Builds an R2 object key inline in the route.
- Uploads with `uploadBufferToR2(...)` from `lib/storage/r2.ts`.
- Returns the raw upload result JSON from R2 helper:
  - `key`
  - `url`
  - `contentType`

Key-building pattern:
- Certificate photos:
  - `users/{userId}/certificates/{certificateNumber}/photos/{typeOrLabelOrImage}/{slotIndex?}/{year}/{month}/{timestamp}.{ext}`
- User assets:
  - `users/{userId}/media/{typeOrLabelOrUploads}/{year}/{month}/{timestamp}.{ext}`

Implementation notes:
- Route has its own local `sanitizeSegment(...)`.
- Route has its own local `getExtension(...)`.
- It does **not** use `buildUserAssetKey(...)` or `buildCertificateAssetKey(...)` from `lib/storage/r2.ts`.
- Team is only used as an authorization gate, not inside the key path.

### 2) Mobile avatar/signature capture client
**File:** `components/settings/MobileCaptureClient.tsx`

Current behavior:
- Client-only UI for `kind: 'avatar' | 'signature'`.
- `kind` type comes from `lib/auth/mobile-capture.ts`.
- Signature flow:
  - Draws on a `<canvas>`
  - Crops transparent bounds
  - Exports as `image/png` data URL
- Avatar flow:
  - Accepts `image/*` from phone camera/library
  - Crops to square
  - Renders into `512x512`
  - Exports as JPEG data URL (`image/jpeg`, quality `0.82`)
- Submission flow:
  - POSTs JSON to `/api/user/mobile-capture`
  - Body shape: `{ token, dataUrl }`

Important observation:
- This component does **not** upload directly to `/api/mobile/uploads`.
- It expects a separate JSON endpoint that accepts a signed token and a data URL, then presumably saves the resulting user asset to the database.
- I could not find the corresponding `/api/user/mobile-capture` route in the code searched, so either:
  - it exists outside searched scope in a non-TS file, or
  - it is missing / not yet implemented.

### 3) R2 storage utility
**File:** `lib/storage/r2.ts`

Current exports and patterns:
- `R2UploadResult`
- `buildUserAssetKey(userId, kind, contentType)`
- `buildCertificateAssetKey({ teamId, certificateNumber, filename?, contentType })`
- `uploadToR2({ key, body, contentType })`
- `uploadDataUrlToR2({ key, dataUrl })`
- `uploadBufferToR2({ key, body, contentType })`

Important constraints:
- Allowed content types are hardcoded:
  - `image/png`
  - `image/jpeg`
  - `image/jpg`
  - `image/webp`
- `uploadDataUrlToR2(...)` only accepts image data URLs matching:
  - `data:image/png;base64,...`
  - `data:image/jpeg;base64,...`
  - `data:image/jpg;base64,...`
  - `data:image/webp;base64,...`

URL/key behavior:
- Reads required env:
  - `R2_ACCOUNT_ID`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET`
- Optional:
  - `R2_PUBLIC_BASE_URL`
- Public URL resolution:
  - uses `R2_PUBLIC_BASE_URL/{key}` if present
  - otherwise `https://pub-{accountId}.r2.dev/{key}`

Sanitization behavior:
- Internal `sanitizePathSegment(...)` lowercases and hyphenates non `[a-z0-9-_]`.
- Trims to max length 120.
- Falls back to `'file'`.

Existing helper suitability:
- `buildUserAssetKey(...)` is best for a single canonical per-user asset path like:
  - `users/{userId}/avatar/avatar.jpg`
  - `users/{userId}/signature/signature.png`
- The mobile uploads route instead creates timestamped history-style keys under `users/{userId}/media/...`.

### 4) Mobile capture token helper
**File:** `lib/auth/mobile-capture.ts`

Current behavior:
- Defines:
  - `USER_ASSET_KINDS = ['avatar', 'signature']`
  - `userAssetKindSchema`
  - `UserAssetKind`
- Token payload includes:
  - `sub` = user id
  - `kind` = avatar/signature
- Exports:
  - `createMobileCaptureToken({ userId, kind })`
  - `verifyMobileCaptureToken(token)`

Important implication:
- This is specific to **user** asset capture.
- It is **not** suitable as-is for team/company logo uploads because token payload only models a user id and `kind: avatar | signature`.

### 5) Mobile auth helper
**File:** `lib/auth/mobile.ts`

Current behavior:
- Mobile API auth is based on Bearer JWT in `Authorization` header.
- `getMobileUser(request)`:
  - validates token
  - loads user
  - loads user team via `teamMembers`
  - loads the actual `teams` row
  - returns `{ user, team }`

Important implication:
- For mobile-authenticated multipart uploads, this is the existing standard pattern.
- If company/branding uploads are added to a mobile API route, team context is already available from this helper.

## Best integration path for company logo uploads

### Recommended primary path: use the existing R2 helper from a dashboard/server endpoint, not the mobile uploads route
For dashboard company branding settings, the cleanest approach is:

1. Add a normal authenticated dashboard save path (likely server action or route, depending what parent agent confirms).
2. Accept a company logo image from the dashboard UI.
3. Upload through `lib/storage/r2.ts`.
4. Persist the returned public `url` and optionally the `key` if schema will support it.

Why:
- Company logo is a team/company branding asset, not a mobile certificate photo.
- `app/api/mobile/uploads/route.ts` is specialized around mobile Bearer auth + multipart uploads and currently mixes certificate-photo and generic user asset uploads.
- Dashboard settings likely already have a different authenticated save pattern than mobile APIs.
- `uploadDataUrlToR2(...)` and `uploadBufferToR2(...)` are both already available, so the endpoint can choose either:
  - data URL flow for parity with mobile-capture style, or
  - multipart/binary flow for parity with standard file input uploads.

### Recommended key pattern for company logo
Best to add a **new dedicated key builder** in `lib/storage/r2.ts` rather than reusing the generic timestamped route logic.

Recommended shape:
- `teams/{teamId}/branding/company-logo.{ext}`

Alternative if versioning/history is desired:
- `teams/{teamId}/branding/company-logo/{yyyy}/{mm}/{timestamp}.{ext}`

Recommendation:
- Prefer the canonical stable path `teams/{teamId}/branding/company-logo.{ext}` for the primary logo, because:
  - only one active company logo is expected
  - easier overwrites
  - simpler DB storage and cache strategy

## Best integration path for custom scheme logo uploads

### Recommended approach
Treat custom scheme logos separately from predefined scheme selections.

Predefined schemes:
- Should be modeled as structured selections in DB, not uploads.
- Likely store identifiers like:
  - `niceic`
  - `bafe`
  - `nsi`
  - `fia`
  - `eca`
  - `elecsa`
  - `bsi`
  - `napit`

Custom scheme logos:
- Upload to R2 through the same authenticated dashboard/company-branding save flow.
- Save uploaded logo URLs/keys in team branding storage.

### Recommended key pattern for custom scheme logos
Suggested dedicated path pattern:
- `teams/{teamId}/branding/scheme-logos/{slug}.{ext}`

If multiple arbitrary uploads per team are needed:
- `teams/{teamId}/branding/scheme-logos/{year}/{month}/{timestamp}-{slug}.{ext}`

Recommendation:
- If UI allows named custom scheme entries, use a slug-based stable path:
  - `teams/{teamId}/branding/scheme-logos/{schemeSlug}.{ext}`
- If UI allows adding/removing many unknown logos over time, use timestamped paths and persist both label + URL in DB.

## Recommended changes to existing utilities

### `lib/storage/r2.ts`
This is the right place to extend storage key generation for branding.

Recommended additions:
- `buildTeamBrandingAssetKey(teamId, asset, contentType)`
- or more explicit helpers:
  - `buildTeamCompanyLogoKey(teamId, contentType)`
  - `buildTeamSchemeLogoKey({ teamId, slug, contentType })`

Why:
- Keeps sanitization/content-type logic centralized.
- Matches existing helper design.
- Avoids duplicating key-building logic in API routes/components.

### Do **not** route dashboard branding uploads through `app/api/mobile/uploads/route.ts`
Reasons:
- Route is mobile-auth specific.
- Requires Bearer mobile token.
- Category schema is currently limited to `certificate-photo | user-asset`.
- Key structure is user-scoped and media-history oriented.
- It is the wrong ownership model for team branding assets.

If a generic upload route is desired later, it would need:
- session auth, not only mobile Bearer auth
- team-scoped categories
- a clearer storage contract

## If mobile support is needed for company logo capture
Only if the product needs phone-based team logo upload:

- Reuse the **multipart upload** pattern from `app/api/mobile/uploads/route.ts`
- Extend category enum with something like:
  - `team-branding`
  - or `company-logo`
  - or `scheme-logo`
- Build keys under `teams/{teamId}/branding/...`
- Authenticate with `getMobileUser(request)` and require `auth.team`

But this should be secondary to the normal dashboard flow.

## Gaps / caveats found

1. `MobileCaptureClient.tsx` posts to `/api/user/mobile-capture`, but no matching TS/TSX route was found in the searches I ran.
2. `buildUserAssetKey(...)` and `buildCertificateAssetKey(...)` exist, but `app/api/mobile/uploads/route.ts` does not use them.
3. There is no existing team-branding storage helper in `lib/storage/r2.ts`.
4. Current mobile-capture token helper only supports user asset kinds (`avatar`, `signature`), not team/company assets.

## Concrete recommendation for parent integration

### For company logo
- Add a new team-branding upload/save endpoint in the dashboard settings flow.
- Use `lib/storage/r2.ts` directly.
- Add a dedicated key helper for team branding.
- Persist team-level `companyLogoUrl` (and optionally `companyLogoKey`).

### For predefined scheme logos
- Do not upload.
- Store selected predefined scheme identifiers in DB.
- Render from app-controlled assets/static mapping.

### For custom scheme logos
- Use the same team-branding endpoint as company logo upload.
- Upload to R2 with a team-scoped scheme-logo key helper.
- Persist label + uploaded URL/key in a team branding data structure.

## Files created for this report

- `.sixth/reports/inspect-storage-upload-patterns.md`