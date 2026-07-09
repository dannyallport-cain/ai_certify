# Lint Fix Plan TODO

- [x] Update ESLint ignore patterns to exclude generated/minified artifacts causing mass false-positive lint errors
- [x] Fix `scripts/clean-disseminator-preview-values.ts` (`any` casts)
- [x] Fix `scripts/delete_oldest_backup.js` (CommonJS require + no-undef)
- [x] Fix `scripts/generate-blank-eicr.ts` (`__dirname` no-undef)
- [x] Fix `scripts/generate-sample-eicr.ts` (`any` cast)
- [x] Fix `scripts/seed-eicr-template.ts` (`any` usages)
- [x] Fix `scripts/update-user220-gasco.ts` (empty catch block)
- [ ] Run lint on scripts and then full lint validation
