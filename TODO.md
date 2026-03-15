# Report Disseminator Workflow Fix TODO

- [ ] Update DB schema for publish/version/archive lifecycle fields
- [ ] Add migration for new `report_disseminator_templates` columns
- [ ] Update list/detail APIs to include lifecycle metadata
- [ ] Enforce publish immutability and status transition rules in update API
- [ ] Add clone endpoint to create editable draft copy from published template
- [ ] Update disseminator UI workflow:
  - [ ] Remove Step 4 final artifact upload dependency for preview
  - [ ] Add explicit Save Draft / Publish / Clone / Archive actions
  - [ ] Disable editing when template is published
  - [ ] Show archive/published metadata and version lineage
- [ ] Update TODO with progress while implementing
- [ ] Run project checks/tests relevant to touched files
