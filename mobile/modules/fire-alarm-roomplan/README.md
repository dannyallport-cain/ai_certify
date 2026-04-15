# Fire Alarm RoomPlan module

A reusable Expo/React Native module for **capturing a RoomPlan-style room session** and then **passing that session into a standalone fire-alarm analysis pipeline**.

The architecture is intentionally split into two concerns:

1. **Native capture bridge**: the `FireAlarmRoomPlan` API that manages platform support checks, capture lifecycle, session events, and session export.
2. **Framework-agnostic analysis architecture**: TypeScript-first contracts and service helpers that take a completed `FireAlarmScanSession`, combine it with media/evidence, and prepare it for review, mapping, or later provider-backed recognition.

This keeps the app's capture flow stable while allowing downstream analysis to evolve independently.

## Goals

- Preserve the current `FireAlarmRoomPlan` API used by `mobile/app/(tabs)/room-plan.tsx`
- Keep the scan session shape stable (`FireAlarmScanSession`)
- Support a production-oriented lifecycle for capture, review, and export
- Allow a host app to plug in real OCR / logo / device recognition later without breaking the capture contract
- Make the analysis layer portable so another app can reuse it without depending on Expo module internals
- Avoid new npm dependencies

## Current native vs. reusable architecture boundary

### Native / platform-specific boundary

The current runtime entrypoint is:

- `FireAlarmRoomPlan.isSupported()`
- `FireAlarmRoomPlan.startScan()`
- `FireAlarmRoomPlan.stopScan()`
- `FireAlarmRoomPlan.exportSession()`
- `FireAlarmRoomPlan.addStatusListener()`
- `FireAlarmRoomPlan.addSessionListener()`

These APIs are defined in `FireAlarmRoomPlanModule.ts`.

On iOS, they call the native Expo module in `ios/FireAlarmRoomPlanModule.swift`.

On platforms where native RoomPlan capture is not available, the JS bridge still returns a valid `FireAlarmScanSession` shape so app code can continue exercising the capture, session, and export contracts consistently. That fallback is a compatibility surface for development and unsupported environments; it should not be confused with production RoomPlan geometry capture.

### Analysis / orchestration boundary

The reusable service layer is designed to sit **after** capture.

That layer should consume:

- the existing `FireAlarmScanSession`
- host-provided media assets captured during or after scanning
- host-selected provider/model metadata
- analysis configuration and review state

That separation is intentional:

- native code is responsible for producing room geometry, capture metadata, and lifecycle state
- reusable TypeScript services are responsible for packaging data for recognition, normalizing results, mapping findings into floorplan placements, and exporting portable payloads

## Current scan session contract

The current session contract remains the compatibility anchor for the module:

- `FireAlarmScanSession`
- `FireAlarmFloorplan`
- `FireAlarmFloorplanRoom`
- `FireAlarmDeviceDetection`

Any new architecture should extend around this shape rather than replace it.

In practice, that means:

- `startScan()` still returns `Promise<FireAlarmScanSession>`
- existing screens can keep reading `session.devices`, `session.floorplan`, and `session.metadata`
- status/session listeners can be used to observe capture lifecycle without coupling the UI to native implementation details
- the new service layer should accept a `FireAlarmScanSession` as its first-class input

## Standalone reusable architecture

The module is structured around the following layered design.

### 1. Capture layer

**Purpose:** create and manage a room scan session.

Main API:

- `FireAlarmRoomPlan.startScan(options) -> Promise<FireAlarmScanSession>`

Related runtime APIs:

- `FireAlarmRoomPlan.isSupported()`
- `FireAlarmRoomPlan.stopScan()`
- `FireAlarmRoomPlan.exportSession()`
- `FireAlarmRoomPlan.addStatusListener()`
- `FireAlarmRoomPlan.addSessionListener()`

Responsibilities:

- start RoomPlan/native capture when supported
- expose capture status updates
- emit completed or updated session payloads
- return a stable `FireAlarmScanSession`
- support export of the capture payload for storage, transfer, or later review

### 2. Analysis input layer

**Purpose:** prepare everything needed for fire-alarm recognition or evidence review.

Representative contracts in this layer include:

- `FireAlarmMediaAsset`
- `FireAlarmAnalysisRequest`
- `FireAlarmRecognitionPipelineConfig`
- model/provider metadata types
- portable job/session export types

Responsibilities:

- associate photos/video frames with a scan session
- normalize room geometry references
- describe analysis targets and enabled recognition stages
- attach host app metadata without mutating the scan session contract

### 3. Recognition orchestration layer

**Purpose:** coordinate recognition providers without coupling the host app to a single model backend.

Representative services include:

- `FireAlarmRecognitionOrchestrator`
- `createAnalysisJobFromSession(...)`
- request builders / normalization helpers

Responsibilities:

- convert `FireAlarmScanSession + media assets` into an analysis job
- build a provider-facing analysis request
- run one or more model providers in sequence or composition
- merge OCR, logo/manufacturer, and object/device findings into one result

### 4. Mapping layer

**Purpose:** project recognition results back into the room/floorplan model.

Representative helpers include:

- `mapFindingsToFloorplan(...)`

Responsibilities:

- translate image-space findings into room/device placements
- reconcile inferred device candidates with existing `session.devices`
- create reviewable mapped device placements and confidence summaries

### 5. Export layer

**Purpose:** produce a portable payload that another app or backend can consume.

Representative helpers include:

- `exportPortableSessionPayload(...)`

Responsibilities:

- package scan session + media asset references + findings + mappings
- preserve source/provider metadata
- support offline review or later upload
- avoid tying exports to one specific mobile screen or app

## Core exports from the reusable service layer

The service layer complements the native bridge; it does not replace it.

Important exports include names such as:

- `FireAlarmAnalysisRequest`
- `FireAlarmAnalysisResult`
- `FireAlarmRecognitionPipelineConfig`
- `FireAlarmMediaAsset`
- `FireAlarmRecognitionOrchestrator`
- `createAnalysisJobFromSession`
- `mapFindingsToFloorplan`
- `exportPortableSessionPayload`

These are intentionally portable, production-oriented contracts so another app can use them even if it has a different camera flow or review UI.

## Expected host app integration flow

A host app should integrate the module in three stages.

### Stage 1: support and capture

1. Call `FireAlarmRoomPlan.isSupported()`
2. If supported, start a scan with `FireAlarmRoomPlan.startScan(options)`
3. Observe capture status via `addStatusListener()` if the UI needs lifecycle feedback
4. Receive a `FireAlarmScanSession` directly from `startScan()` or via `addSessionListener()`

### Stage 2: review and export

1. Read `session.floorplan`, `session.devices`, and `session.metadata`
2. Allow the operator to review the returned capture payload
3. Call `FireAlarmRoomPlan.exportSession(session)` when the host app needs a serialized capture artifact

### Stage 3: analysis

1. Optionally capture related still images / video frames and store them as `FireAlarmMediaAsset[]`
2. Create an analysis job from the session and captured media
3. Build a `FireAlarmAnalysisRequest`
4. Pass the request to a recognition orchestrator or host-provided provider implementation
5. Convert returned findings into floorplan placements
6. Export a portable payload for storage, sync, or manual QA

Conceptually:

- **capture** produces the room geometry and baseline session
- **review/export** makes the session inspectable and portable
- **analysis** enriches the session with evidence-driven findings
- **mapping/export** makes the output usable outside the original screen

## Concise example: capture, review, and export

```ts
import { FireAlarmRoomPlan } from '@/modules/fire-alarm-roomplan';

async function captureRoom() {
  const session = await FireAlarmRoomPlan.startScan({
    detectDevices: true,
    detectManufacturers: true,
    preferredUnits: 'meters',
    roomName: 'Ground floor lobby',
  });

  const exported = await FireAlarmRoomPlan.exportSession(session, {
    pretty: true,
  });

  return {
    session,
    exported,
  };
}
```

## Concise example: handing the captured session into the analysis layer

```ts
import {
  FireAlarmRoomPlan,
  type FireAlarmMediaAsset,
  type FireAlarmRecognitionPipelineConfig,
  createAnalysisJobFromSession,
  mapFindingsToFloorplan,
  exportPortableSessionPayload,
} from '@/modules/fire-alarm-roomplan';

async function captureAndAnalyzeRoom() {
  const session = await FireAlarmRoomPlan.startScan({
    detectDevices: true,
    detectManufacturers: true,
    preferredUnits: 'meters',
    roomName: 'Ground floor lobby',
  });

  const mediaAssets: FireAlarmMediaAsset[] = [
    {
      id: 'asset-1',
      type: 'image',
      uri: 'file:///local/path/lobby-panel.jpg',
      capturedAt: new Date().toISOString(),
    },
  ];

  const config: FireAlarmRecognitionPipelineConfig = {
    enableDeviceDetection: true,
    enableManufacturerRecognition: true,
    enableOcr: true,
  };

  const analysisJob = createAnalysisJobFromSession({
    session,
    mediaAssets,
    config,
  });

  // Recognition/provider output is intentionally separate from capture.
  // Supply a real provider-backed result here when available.
  const analysisResult = {
    jobId: analysisJob.id,
    findings: [],
    reviewStatus: 'unreviewed',
  };

  const mapped = mapFindingsToFloorplan({
    session,
    analysisResult,
  });

  const portablePayload = exportPortableSessionPayload({
    session,
    analysisJob,
    analysisResult,
    mappedFloorplan: mapped,
  });

  return {
    session,
    analysisJob,
    mapped,
    portablePayload,
  };
}
```

Notes:

- `startScan()` still returns the same `FireAlarmScanSession`
- media capture is host-app controlled
- the analysis result can come from an on-device provider, a remote API, or a hybrid flow
- export stays portable and is not tied to this app's UI components
- this module does **not** currently claim completed production OCR, logo recognition, or manufacturer inference

## Reusing this module in another app

Another app can reuse the module in two different ways.

### Option A: reuse both capture + analysis

Use the full package if the app wants:

- Expo/React Native RoomPlan capture entrypoints
- the same `FireAlarmScanSession` contract
- capture lifecycle event subscriptions
- the shared analysis/mapping/export helpers

This is the simplest path for another mobile app in the monorepo.

### Option B: reuse analysis only

A different app may already have its own scan or image capture flow. In that case it can still reuse the standalone analysis layer by:

- constructing or transforming its own room/session data into `FireAlarmScanSession`
- supplying `FireAlarmMediaAsset[]`
- calling the analysis job/orchestrator/mapping/export helpers directly

That is the main reason the architecture is TypeScript-first and framework-agnostic where possible.

## Native iOS implementation status

The `ios/` directory includes:

- `FireAlarmRoomPlanModule.swift` — Expo native module named `FireAlarmRoomPlan`
- `FireAlarmRoomPlan.podspec` — CocoaPods definition used during Expo prebuild / `pod install`

The native bridge is being shaped around a production-oriented session and lifecycle model, but availability still depends on Apple platform support and the current implementation state of the underlying capture/runtime features.

The exported methods remain:

- `isSupported`
- `startScan`
- `stopScan`
- `exportSession`

The native layer is the correct place for RoomPlan, ARKit, Vision, and any future frame/evidence collection that depends on Apple frameworks.

## Expo config plugin

The config plugin lives at `mobile/plugins/withFireAlarmRoomPlan.js`.

When added to the Expo `plugins` array in `app.json`, it will:

- ensure `NSCameraUsageDescription` exists
- add `NSRoomPlanUsageDescription`
- document the minimum iOS requirement (`16.0`) in Info.plist metadata
- note that real RoomPlan capture requires a physical LiDAR-capable iOS device

## Build / prebuild flow

1. Add the config plugin to `app.json`
2. Run `npx expo prebuild` or the project's equivalent prebuild command
3. Expo autolinking picks up the local module podspec under `mobile/modules/fire-alarm-roomplan/ios`
4. Build with `npx expo run:ios` or through Xcode after pods are installed

## Current limitations

Today:

- real RoomPlan capture remains dependent on supported iOS hardware and native implementation readiness
- unsupported platforms still need a compatibility fallback if the host app wants to exercise the shared session contract
- no production OCR / logo / manufacturer recognition is implemented in this module yet
- no production mapping calibration from image space to floorplan coordinates is implemented yet
- simulator support should be treated as unsupported for real scanning

## Recommended next implementation steps

1. Finalize the iOS capture implementation and geometry serialization
2. Capture image/frame assets alongside the scan session
3. Implement provider interfaces for OCR, logo/manufacturer, and device detection
4. Use the orchestrator to merge findings into a single `FireAlarmAnalysisResult`
5. Map findings back onto the floorplan and export a portable review payload

The key design rule is: **keep `FireAlarmScanSession` stable, and build richer analysis around it through additional reusable contracts and services.**