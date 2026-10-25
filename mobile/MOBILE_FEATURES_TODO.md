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

### 3D plan editor (delivered)
- [x] Render the captured floorplan as a 3D dollhouse plan with device markers
  - Modules: `mobile/modules/fire-alarm-roomplan/` (`plan-geometry`, `projection`, `plan-scene-*`, `plan-coverage`, `plan-autoplace`, `plan-service`)
  - Screens: `mobile/app/room-plan/plan.tsx`, plus `(tabs)/room-plan.tsx`, `review.tsx`, `session/[id].tsx`, `export.tsx`
  - Canvas: `mobile/components/room-plan/Plan3DCanvas.tsx`, `PlanMarkers.tsx`, `PlanLabel.tsx`
- [x] Rotate / tilt / zoom / top-view controls, label, grid and coverage toggles (`PlanToolbar.tsx`)
- [x] Manual device add, select, move-on-plan, edit height/type/label and delete (`DeviceInspector.tsx`, `usePlanEditor.ts`)
- [x] Manual rectangular rooms when no LiDAR capture exists (`ManualRoomCard.tsx`)
- [x] Indicative detection coverage per detector class with per-room breakdown (`CoveragePanel.tsx`)
- [x] Greedy auto-layout of detectors over uncovered floor area

### Native RoomPlan capture (delivered)
- [x] Local `fire-alarm-roomplan` Expo module linked into the iOS build and registered in `ExpoModulesProvider`
  - Constraint: the podspec requires **iOS 16.0**, so `plugins/withFireAlarmRoomPlan.js` raises `ios.deploymentTarget` and `IPHONEOS_DEPLOYMENT_TARGET` to 16.0. Without that CocoaPods silently drops the whole pod and the JS bridge reports the module as "not installed".
- [x] Capture crash fixed — RoomPlan delivers `RoomCaptureSessionDelegate` callbacks on its own queue, so every callback hops to the main actor before touching UIKit (`_AssertAutoLayoutOnAllowedThreadsOnly` abort otherwise)
- [x] Capture scope trimmed to walls, doors, windows and room dimensions: furniture (`CapturedRoom.objects`) is excluded from the session payload and the USDZ mesh export is skipped (it also blocked the main thread)

### Remaining
- [ ] Add real ML inference / device recognition to room-plan workflow
  - Rationale: Devices are still placed manually or auto-laid out; no on-device model yet.
  - Relevant files: `mobile/modules/fire-alarm-roomplan/pipeline.ts`, `mobile/app/room-plan/plan.tsx`
- [ ] Improve unsupported-device handling and fallback UX for RoomPlan
  - Rationale: RoomPlan is typically unavailable on Android, simulators, or unsupported iOS hardware and needs a stronger fallback path.
  - Relevant files: `mobile/app/(tabs)/room-plan.tsx`, `mobile/roomplan.md`
- [ ] Persist plan edits through the API as well as local storage
  - Rationale: `usePlanEditor` autosaves to the local session store; server sync uses the room-captures endpoint only on explicit capture save.
  - Relevant files: `mobile/components/room-plan/usePlanEditor.ts`, `mobile/services/roomplan/session-store.ts`

## Face / fingerprint login

### Delivered
- [x] Device capability probe covering Face ID, Touch ID, fingerprint and iris, with device-appropriate labels
  - Modules: `mobile/services/biometrics/` (`capability`, `preferences`, `authenticate`, `types`)
- [x] Enrolment prompt straight after a successful password login
  - Screen: `mobile/app/(auth)/login.tsx`
- [x] Lock screen that unlocks with the enrolled biometric, with a password fallback path
  - Components: `mobile/components/auth/UnlockScreen.tsx`, `BiometricGlyph.tsx`
- [x] Re-lock after 60s in the background without unmounting the signed-in screens
  - Hooks: `mobile/components/auth/useBackgroundRelock.ts`, `AuthLockProvider.tsx`
- [x] Enable / disable toggle on the account screen with a hand-off to device settings
  - Component: `mobile/components/auth/BiometricSecurityCard.tsx`
- [x] Preference kept in SecureStore, cleared on sign out and whenever the enrolled sensor disappears
  - Modules: `mobile/services/biometrics/preferences.ts`, `mobile/components/auth/resolveStartupState.ts`

### Remaining
- [ ] Require a fresh biometric check before high-risk actions (submit a certificate, export a PDF)
  - Rationale: The gate currently runs at app open and on return from the background only.
  - Relevant files: `mobile/components/auth/useAuthLock.ts`, `mobile/app/(tabs)/review.tsx`
- [ ] Offer a per-session "do not lock on next launch" choice for shared site devices
  - Rationale: The lock is a per-device preference today; there is no per-session opt-out.
  - Relevant files: `mobile/components/auth/AuthLockProvider.tsx`

## General product follow-up
- [ ] Audit all top-level task cards to ensure each one lands in a distinct complete workflow
  - Rationale: The app now has a task-chooser home screen, but some destinations are still overlapping or partially implemented.
  - Relevant files: `mobile/app/(tabs)/index.tsx`
