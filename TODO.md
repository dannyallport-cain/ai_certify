# PDF Logo Rendering Fix (EICR)

- [x] Inspect current logo source flow (team logos + approval scheme logos), including Cloudflare R2 retrieval path.
- [x] Update certificate PDF data mapping to reliably pass team logo source into PDF generator.
- [ ] Add robust image normalization in `lib/pdf/generator.ts`:
  - [ ] Resolve logo source from data URI / local asset / remote URL (R2 included)
  - [ ] Convert unsupported formats (especially WEBP/SVG) to PNG data URI for jsPDF compatibility
  - [ ] Cache normalized results to avoid repeated fetch/transform overhead
- [ ] Ensure EICR approval-scheme logo drawing uses normalized image data before `addImage`.
- [ ] Add fallback behavior for failed logo fetch/render (no colored placeholder boxes for logos).
- [ ] Validate via targeted checks (typecheck/build or lint subset) and summarize changes.
