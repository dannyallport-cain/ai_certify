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
- the 3D plan generator draws the geometry and devices that are in the session; it does not
  detect devices itself, so its accuracy is bounded by capture and review quality

## Recommended next implementation steps

1. Finalize the iOS capture implementation and geometry serialization
2. Capture image/frame assets alongside the scan session
3. Implement provider interfaces for OCR, logo/manufacturer, and device detection
4. Use the orchestrator to merge findings into a single `FireAlarmAnalysisResult`
5. Map findings back onto the floorplan and export a portable review payload
6. Feed reviewed device positions back into the 3D plan so corrected placements persist

The key design rule is: **keep `FireAlarmScanSession` stable, and build richer analysis around it through additional reusable contracts and services.**

---

## 3D plan generator

The `plan3d/` directory turns a completed `FireAlarmScanSession` into a renderable,
renderer-agnostic **3D plan**: an isometric, dimetric or plan-view drawing of the captured
rooms with walls, openings, a floor survey grid and every fire alarm device placed at its
mounting height.

It runs entirely on the JavaScript thread, adds no dependencies, and consumes only the
session contract described above. It does not mutate the session.

### Architecture

The generator is split into pure stages so each one can be tested and reused on its own.

| Stage | File | Responsibility |
| --- | --- | --- |
| Scene contract | `plan3d/plan3d-types.ts` | Types for projected polygons, segments, markers, labels, camera, viewport and stats |
| Symbology | `plan3d/palette.ts` | Blueprint and schematic palettes, device glyphs and colours |
| Geometry | `plan3d/geometry.ts`, `plan3d/hatch.ts` | Polygon winding, area, centroid, wall panel corners, affine quad detection, grid hatching clipped to a footprint |
| Room resolution | `plan3d/rooms.ts`, `plan3d/room-types.ts` | Footprints from outlines or unordered wall segments, wall extrusion, openings, unit conversion, synthesized rooms |
| Device placement | `plan3d/devices.ts` | Mounting height inference per device type, ceiling/wall/floor classification, placement of devices that have no coordinates |
| Surfaces | `plan3d/surfaces.ts` | World-space floor, ceiling, wall and opening panels plus outline, corner, grid and drop lines |
| Projection | `plan3d/projection.ts` | Orthographic camera, viewport fitting, projection presets |
| Scene assembly | `plan3d/scene.ts` | Depth and layer sorting, palette application, parallelogram detection |
| Annotations | `plan3d/annotations.ts` | Device markers, drop lines, room labels, collision avoidance, legend |
| SVG export | `plan3d/svg.ts` | Standalone SVG document and data URI |
| Entry point | `plan3d/generator.ts` | `generateFireAlarmPlan3D(session, options)` |

### Public API

```ts
import {
  generateFireAlarmPlan3D,
  renderFireAlarmPlan3DSvg,
  type FireAlarmPlan3DOptions,
} from '@/modules/fire-alarm-roomplan';

const options: FireAlarmPlan3DOptions = {
  camera: {
    projection: 'isometric',   // 'isometric' | 'dimetric' | 'top-down'
    yawDegrees: 45,            // rotation around the vertical axis
    pitchDegrees: 30,          // downward tilt, 90 is a straight plan view
    wallHeightMeters: 2.7,     // used when the capture reports no wall height
    showCeiling: false,        // close the room with a ceiling surface
    showFloorGrid: true,       // 1 m survey grid across each room
    showDevices: true,
    showLabels: true,
  },
  colourScheme: 'blueprint',  // 'blueprint' | 'schematic'
  selectedDeviceId: null,
  viewport: { width: 360, height: 300, padding: 26 },
};

const plan = generateFireAlarmPlan3D(session, options);

// Renderer-agnostic scene
plan.polygons;  // filled surfaces, depth and layer sorted
plan.segments;  // wall outlines, corners, openings, grid, drop lines
plan.markers;   // one per device, with world position and mounting
plan.texts;     // room labels and device labels
plan.legend;    // per-type device counts
plan.stats;     // rooms, walls, openings, devices, area, ceiling height

// Portable artefact
const svg = renderFireAlarmPlan3DSvg(plan, { scale: 3 });
```

### How the plan is built

1. **Rooms** — for each captured room the footprint is taken from `outline`, then from an
   unordered `wallSegments` chain, and finally generated if neither is usable. `floorplan.units`
   of `feet` is converted to metres. Wall height comes from the tallest reported wall segment,
   otherwise from `wallHeightMeters`.
2. **Walls and openings** — walls are extruded from the footprint unless the capture supplies
   real wall segments, in which case the captured segment ids are preserved. An opening is
   matched by its position to the nearest wall, or by `wallSegmentId` when the capture names the
   wall without giving a position; it is then centred on that wall, clamped inside it and given
   door, window or general sill/head heights.
3. **Devices** — each device keeps its captured coordinates when they fall inside the room.
   Ceiling devices snap to the ceiling plane; panels, interfaces and I/O units default to
   1.3–1.5 m; sounders and VADs default to 2.2–2.3 m. Devices with no coordinates are spread
   across the room on a deterministic lattice so nothing silently disappears.
4. **Projection** — an orthographic camera rotates the room by yaw, tilts by pitch and returns a
   `depth` per vertex. The viewport is fitted to every drawn vertex plus every device anchor, so
   changing the camera never clips the plan.
5. **Sorting** — everything is grouped into `base` (floor and grid), `structure` (walls,
   openings, ceiling) and `overlay` (drop lines, markers, labels) and depth sorted inside each
   layer. This keeps the floor behind the walls and the markers in front of both.
6. **Labels** — room labels are nudged upwards until they clear every device marker, then
   clamped inside the canvas. Device labels try a series of anchors around their marker (below,
   below-right, left, right, above) and take the first one that clears earlier labels, room
   labels and neighbouring markers; a label with nowhere to go is omitted rather than printed on
   top of another label.

### Rendering without a drawing dependency

The module deliberately avoids adding an SVG or WebGL dependency to the app:

- **Surface fills** are native views transformed by an affine matrix. Orthographic projection
  maps every rectangle to an exact parallelogram, so the generator reports a `quad`
  (`origin`, `u`, `v`) alongside each polygon and the renderer maps a unit square onto it. Wall
  panels, openings, ceilings and rectangular floors are therefore filled precisely.
- **The wireframe** is drawn as rotated rectangles, one per line piece; dashed lines are split
  into individually positioned dashes so no dash arrays are needed.
- **Markers and labels** are plain views and text.

Surfaces whose projection is not a parallelogram (only possible for a non-rectangular captured
footprint) are still outlined and hatched, so every room stays legible.

For reports and sharing, `renderFireAlarmPlan3DSvg` produces a complete SVG document with the
drawing, the legend and a footer summary.

### Screen

`mobile/app/room-plan/plan.tsx` is the operator-facing screen, reached from the capture tab,
the session summary and the review screen:

- projection presets (isometric, dimetric, plan view)
- rotation and camera tilt steppers, ceiling height presets
- toggles for ceiling, floor grid, device markers and device labels
- blueprint and schematic palettes
- tap-to-select any device marker to inspect its mounting height and confidence
- share the plan as SVG

The screen re-generates the plan whenever a control changes; generation is pure and cheap
enough to run on every interaction.

### Verification

- `tsc --noEmit` over the whole mobile app passes with no errors, and `eslint` reports no
  problems for `modules/fire-alarm-roomplan`, `components/roomplan` and `app/room-plan`.
- The `plan3d` sources are compiled on their own and **executed** against realistic sessions, not
  merely reviewed. That suite asserts, among others: room/wall/opening/device/area/height stats,
  polygon and segment counts, layer ordering, every point inside the viewport, opening panels,
  parallelogram quads for every rectangular surface, ceiling-device mounting heights, drop-line
  counts, manufacturer resolution, depth ordering, plan-view height independence, palette
  switching, label/summary/legend counts, and the synthesized-room and missing-floorplan
  fallbacks.
- The SVG exporter is exercised end to end as well: document structure, absence of `NaN` /
  `Infinity` / `undefined`, geometry-to-element counts, uniform scaling, legend placement below
  the drawing, footer fit, data-URI round trip, and sanitisation of hostile labels and room names.
- Layout regressions are covered by assertions rather than by eye: no two labels may overlap, no
  label may leave the canvas, no text may run past the edge, and legend chips must sit below the
  drawing area.
- The rendered documents were inspected visually in isometric, dimetric and plan view, in both
  the blueprint and schematic palettes.
