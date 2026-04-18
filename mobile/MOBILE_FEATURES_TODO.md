# Mobile App Features Still Needing Implementation

This list is based on the current Expo mobile app code and workflow docs in `mobile/`.

## Navigation
- [ ] Add reusable header back navigation across mobile workflow screens
  - Rationale: Most workflow screens rely on in-screen buttons or no header control at all.
  - Relevant files: `mobile/app/(tabs)/_layout.tsx`, `mobile/app/(tabs)/capture.tsx`
- [ ] Define a practical forward-navigation pattern per screen rather than true history-forward
  - Rationale: Expo Router / React Navigation exposes back navigation but not a native browser-style `canGoForward()` history API.
  - Relevant files: `mobile/app/(tabs)/_layout.tsx`, `mobile/components/navigation/StackHeaderNav.tsx`

## Certificate workflow
- [ ] Split guided and manual certificate routes into genuinely different flows
  - Rationale: Home screen offers both “AI / guided” and “manual data entry”, but both currently route to `/(tabs)/wizard`.
  - Relevant files: `mobile/app/(tabs)/index.tsx`, `mobile/app/(tabs)/wizard.tsx`
- [ ] Add client-side inspection date override UI if manual date changes are required
  - Rationale: Workflow doc says future manual override may be needed; current wizard only displays the auto-set date.
  - Relevant files: `mobile/MOBILE_WIZARD_WORKFLOW.md`, `mobile/app/(tabs)/wizard.tsx`
- [ ] Implement additional certificate branching fields called out in the wizard
  - Rationale: The wizard explicitly lists next fields to add such as number of boards, RCD/RCBO, EV charger, solar PV, battery storage, SPD, AFDD, and communal supplies.
  - Relevant files: `mobile/app/(tabs)/wizard.tsx`
- [ ] Add commercial / industrial / marine-specific question branches
  - Rationale: Wizard currently shows a placeholder note where these branches should be added.
  - Relevant files: `mobile/app/(tabs)/wizard.tsx`
- [ ] Persist wizard answers into certificate form data end-to-end
  - Rationale: Workflow doc marks this as Phase 2 work.
  - Relevant files: `mobile/MOBILE_WIZARD_WORKFLOW.md`, `mobile/components/JobStateContext.tsx`, `mobile/app/(tabs)/certificate.tsx`

## Capture / AI evidence
- [ ] Enable real in-app camera capture outside the current Expo Go limitation
  - Rationale: Capture screen currently shows “Camera capture unavailable in Expo Go” and falls back to library upload.
  - Relevant files: `mobile/app/(tabs)/capture.tsx`
- [ ] Expand guided photo capture to match the workflow doc image list
  - Rationale: The workflow doc lists main fuse, meter, consumer unit with cover on, and circuit schedule, but current wizard photo requirements are different.
  - Relevant files: `mobile/MOBILE_WIZARD_WORKFLOW.md`, `mobile/app/(tabs)/wizard.tsx`
- [ ] Enforce fully step-by-step guided capture sequencing
  - Rationale: Workflow doc marks this as Phase 3; current flow is guided but still relatively flexible.
  - Relevant files: `mobile/MOBILE_WIZARD_WORKFLOW.md`, `mobile/app/(tabs)/wizard.tsx`, `mobile/app/(tabs)/capture.tsx`

## Fire alarm room plan
- [ ] Add real ML inference / device recognition to room-plan workflow
  - Rationale: The room-plan screen explicitly says ML detection and manufacturer inference are deferred to a later milestone.
  - Relevant files: `mobile/app/(tabs)/room-plan.tsx`
- [ ] Add manual add/edit support for device rows in the room-plan review workflow if not already complete
  - Rationale: The room-plan screen says review should support manual add and edit even when no inferred devices exist.
  - Relevant files: `mobile/app/(tabs)/room-plan.tsx`, `mobile/app/room-plan/review.tsx`
- [ ] Improve unsupported-device handling and fallback UX for RoomPlan
  - Rationale: RoomPlan is typically unavailable on Android, simulators, or unsupported iOS hardware and needs a stronger fallback path.
  - Relevant files: `mobile/app/(tabs)/room-plan.tsx`, `mobile/roomplan.md`

## General product follow-up
- [ ] Audit all top-level task cards to ensure each one lands in a distinct complete workflow
  - Rationale: The app now has a task-chooser home screen, but some destinations are still overlapping or partially implemented.
  - Relevant files: `mobile/app/(tabs)/index.tsx`
