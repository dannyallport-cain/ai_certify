# TODO - Global Certificate Draft Persistence (Phase 1: local-first)

- [ ] Inspect shared certificate create entrypoints/layouts to wire one reusable persistence hook
- [ ] Add generic draft persistence utility in `lib/` (keying, save/load/clear, versioning-safe shape)
- [ ] Add reusable React hook for form autosave/restore with debounce and hydration guard
- [ ] Integrate hook into current certificate creation pages
  - [ ] `certificates/new/eicr/page.tsx`
  - [ ] `certificates/new/bs5266/page.tsx`
  - [ ] `certificates/new/bs5839-1/page.tsx`
  - [ ] `certificates/new/fire-extinguisher/page.tsx`
- [ ] Clear draft after successful submit for each integrated page
- [ ] Update TODO progress and run a quick sanity check
