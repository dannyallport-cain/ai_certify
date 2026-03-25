# Report Disseminator Workflow Fix TODO

- [x] Update DB schema for publish/version/archive lifecycle fields
- [x] Add migration for new `report_disseminator_templates` columns
- [x] Update list/detail APIs to include lifecycle metadata
- [x] Enforce publish immutability and status transition rules in update API
- [x] Add clone endpoint to create editable draft copy from published template
- [x] Update disseminator UI workflow:
  - [x] Remove Step 4 final artifact upload dependency for preview
  - [x] Add explicit Save Draft / Publish / Clone / Archive actions
  - [x] Disable editing when template is published
  - [x] Show archive/published metadata and version lineage
- [x] Update TODO with progress while implementing
- [ ] Run project checks/tests relevant to touched files
