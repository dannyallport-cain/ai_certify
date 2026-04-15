# Fire Alarm RoomPlan Implementation Plan

This document turns the current RoomPlan prototype into an execution-ready plan for this repository.

It covers:

- the mobile iOS RoomPlan implementation path
- the reusable module contract already started in `mobile/modules/fire-alarm-roomplan/`
- the ML workspace to add at repo root
- the scraping and training pipeline for device/manufacturer recognition
- the dataset and annotation schema
- rollout phases from scaffold to production

---

## 1. Current state in this repo

### Already present

The mobile app now contains an initial reusable scaffold:

- `mobile/modules/fire-alarm-roomplan/index.ts`
- `mobile/modules/fire-alarm-roomplan/types.ts`
- `mobile/modules/fire-alarm-roomplan/FireAlarmRoomPlanModule.ts`
- `mobile/modules/fire-alarm-roomplan/ios/FireAlarmRoomPlanModule.swift`
- `mobile/modules/fire-alarm-roomplan/ios/FireAlarmRoomPlan.podspec`
- `mobile/plugins/withFireAlarmRoomPlan.js`
- `mobile/app/(tabs)/room-plan.tsx`

This is currently a **scaffold only**:
- the JS API exists
- the iOS native module exists
- the app has a demo screen
- RoomPlan capture is not yet real
- device detection is not yet real
- manufacturer recognition is not yet real

### Goal

Build a reusable module that:

1. captures room geometry with Apple RoomPlan
2. identifies commercial fire alarm devices in the environment
3. estimates likely manufacturer / make
4. places detections into room coordinates
5. allows user correction
6. exports a reusable scan session for this app and other apps

---

## 2. Product architecture

Use a 4-layer system:

### Layer A — Spatial capture
Handled natively on iOS using:

- `RoomPlan`
- `ARKit`
- camera frames / snapshots
- device pose and room geometry

Output:
- rooms
- walls
- openings
- room coordinate system
- capture metadata

### Layer B — Visual semantics
Handled by ML / Vision using:

- object detector for fire alarm devices
- manufacturer classifier
- OCR/logo fusion
- optional server-side re-ranking

Output:
- device type
- manufacturer
- subtype
- confidence
- evidence frame references
- bounding boxes

### Layer C — Spatial fusion
Maps visual detections to room geometry:

- wall-mounted vs ceiling-mounted placement
- multi-view matching
- deduplication across frames
- confidence merging
- room association

Output:
- one canonical device entry per real device in room coordinates

### Layer D — Human review
Lets the user fix all uncertainty:

- change type
- change manufacturer
- add device
- delete false positive
- mark uncertain
- approve export

Output:
- reviewed session data
- labeled training feedback

---

## 3. Public module contract

The reusable public API should remain stable and app-agnostic.

### Current public module root
- `mobile/modules/fire-alarm-roomplan/index.ts`

### Public device classes
Keep the public device union coarse:

- `panel`
- `sounder`
- `detector`
- `interface`
- `io_unit`
- `vad`
- `unknown`

### Internal subtype mapping
Internally, allow richer subtype labels and map back up:

- detector:
  - smoke
  - heat
  - multi-sensor
  - beam
  - aspirating
- sounder:
  - wall sounder
  - base sounder
  - horn
  - sounder-beacon
- vad:
  - wall vad
  - ceiling vad
- interface:
  - relay interface
  - monitored interface
  - input module
- io_unit:
  - control module
  - zone monitor
  - I/O controller

### Module methods
Keep and extend:

- `isSupported()`
- `startScan(options)`
- `stopScan()`
- `exportSession(session, options)`
- event subscriptions:
  - status
  - session
  - progress
  - detections

### Future methods to add
Later additions:

- `resumeScan(sessionId)`
- `captureEvidenceFrame()`
- `applyUserCorrections(corrections)`
- `runInferenceOnSession(sessionId)`
- `importModelBundle(bundleInfo)`

---

## 4. Repo structure to add

Add an ML workspace at the repository root.

### Proposed new structure

```text
ml/
  README.md
  requirements.txt
  pyproject.toml
  configs/
    sources/
      approved_sources.yaml
      blocked_sources.yaml
    datasets/
      detection_v1.yaml
      manufacturer_v1.yaml
    training/
      detector_yolo.yaml
      classifier_convnext.yaml
      ocr_fusion.yaml
  collector/
    __init__.py
    source_registry.py
    crawl.py
    extract_html.py
    extract_pdf.py
    normalize.py
    dedupe.py
    weak_labels.py
    review_queue.py
  datasets/
    README.md
    schemas/
      asset.schema.json
      detection.schema.json
      classification.schema.json
      scan-feedback.schema.json
    raw/
    normalized/
    reviewed/
    exports/
  annotation/
    label_rules.md
    classes.yaml
    manufacturers.yaml
  training/
    detector/
      train.py
      evaluate.py
      export_coreml.py
    classifier/
      train.py
      evaluate.py
      export_coreml.py
    fusion/
      rerank.py
      ocr_fusion.py
  evaluation/
    benchmark_detector.py
    benchmark_classifier.py
    benchmark_end_to_end.py
  notebooks/
  tools/
    build_dataset_index.py
    generate_splits.py
    inspect_duplicates.py
```

### Mobile-side additions to plan for

```text
mobile/
  modules/
    fire-alarm-roomplan/
      ios/
      models/
      mapping/
      README.md
  app/
    (tabs)/
      room-plan.tsx
    room-plan/
      review.tsx
      session/[id].tsx
      export.tsx
  services/
    roomplan/
      export.ts
      correction-store.ts
      session-store.ts
```

---

## 5. Native iOS implementation plan

## Phase A — Real RoomPlan capture

Replace the mock `startScan` implementation in:

- `mobile/modules/fire-alarm-roomplan/ios/FireAlarmRoomPlanModule.swift`

### Native implementation tasks
1. create a real `RoomCaptureSession`
2. request/check permissions
3. expose start/stop lifecycle to JS
4. collect:
   - room geometry
   - walls
   - openings
   - object placeholders from RoomPlan if available
   - timestamps
   - device pose
5. export normalized session JSON

### Native session object shape
At minimum:

```json
{
  "id": "session-uuid",
  "status": "completed",
  "metadata": {
    "startedAt": "ISO_DATE",
    "endedAt": "ISO_DATE",
    "platform": "ios",
    "deviceModel": "iPhone15,3",
    "osVersion": "17.0",
    "scannerVersion": "native-roomplan-v1"
  },
  "floorplan": {
    "units": "meters",
    "rooms": [],
    "deviceCount": 0,
    "wallCount": 0
  },
  "devices": [],
  "rawPayload": {}
}
```

## Phase B — Frame capture support

While RoomPlan is running or immediately after capture, save:

- downscaled inference frames
- camera pose if available
- capture timestamp
- intrinsic parameters where available

Store as evidence for later inference and review.

## Phase C — Event stream to JS

Emit:
- `FireAlarmRoomPlan:status`
- `FireAlarmRoomPlan:progress`
- `FireAlarmRoomPlan:detection`
- `FireAlarmRoomPlan:session`

This enables:
- progress UI
- live detection UI
- post-processing progress
- review state updates

---

## 6. App UX plan

The mobile app should move from demo to workflow.

### Existing
- `mobile/app/(tabs)/room-plan.tsx`

### Add next
1. `mobile/app/room-plan/review.tsx`
   - list all detected devices
   - edit type/manufacturer/confidence
2. `mobile/app/room-plan/session/[id].tsx`
   - show floorplan/session summary
3. `mobile/app/room-plan/export.tsx`
   - export/share JSON session
4. `mobile/services/roomplan/session-store.ts`
   - persist sessions locally
5. `mobile/services/roomplan/correction-store.ts`
   - persist user corrections

### Review UX requirements
Each device row should support:
- type picker
- manufacturer picker
- confidence view
- evidence thumbnail
- notes
- delete
- mark reviewed

### Manual add UX
Allow user to add:
- wall sounder
- detector
- panel
- interface
- io unit
- vad

with:
- approximate room placement
- wall/ceiling hint
- manufacturer
- notes

---

## 7. Training data strategy

## Core principle
Use scraped internet data to **bootstrap**, not to become the permanent truth source.

### Long-term data priority
1. approved manufacturer/distributor/product material
2. your own field-captured images
3. corrected production scan feedback
4. approved public web sources
5. synthetic/augmented data

### Why
Scraped data is noisy and often weakly labeled.
Field data is what will make the deployed model robust.

---

## 8. Scraping and compliance policy

## Do not assume internet imagery is automatically safe for training.

Every source must be classified before use.

### Source policy statuses
- `allowed_training`
- `allowed_review_only`
- `allowed_embedding_only`
- `blocked`

### Required metadata per source
- domain
- source type
- robots status
- copyright note
- terms reviewed by
- training approval
- rate limit policy
- notes

### Recommended source categories
- manufacturer product pages
- manufacturer brochures and catalogs
- distributor listings
- installer case studies
- trade publications
- approved public datasets
- approved video frames

### Avoid as default
- random image search results as truth
- forum reposts with unclear rights
- unreviewed social media scraping
- copyrighted PDFs without permission flags

---

## 9. Dataset schema

Create JSON schemas under:

- `ml/datasets/schemas/`

## A. Asset schema
One record per collected source asset.

```json
{
  "asset_id": "uuid",
  "source_url": "https://example.com/product/apollo-detector",
  "source_domain": "example.com",
  "license_status": "allowed_training",
  "collected_at": "ISO_DATE",
  "content_type": "image/jpeg",
  "sha256": "hash",
  "phash": "hash",
  "ocr_text": "Apollo Discovery",
  "weak_labels": {
    "manufacturer": "Apollo",
    "device_type": "detector"
  },
  "review_status": "pending"
}
```

## B. Detection annotation schema
One record per annotated scene image.

```json
{
  "image_id": "uuid",
  "asset_id": "uuid",
  "split": "train",
  "width": 1920,
  "height": 1080,
  "annotations": [
    {
      "id": "ann-1",
      "bbox": [100, 200, 180, 160],
      "device_type": "detector",
      "subtype": "smoke",
      "manufacturer": "Apollo",
      "visibility": "clear",
      "reviewed": true
    }
  ]
}
```

## C. Manufacturer classification schema
One record per cropped device image.

```json
{
  "crop_id": "uuid",
  "parent_image_id": "uuid",
  "manufacturer": "Apollo",
  "device_type": "detector",
  "subtype": "smoke",
  "model": "Discovery Optical",
  "reviewed": true
}
```

## D. Scan feedback schema
Use app feedback as training data.

```json
{
  "feedback_id": "uuid",
  "session_id": "uuid",
  "device_id": "uuid",
  "predicted_type": "sounder",
  "corrected_type": "vad",
  "predicted_manufacturer": "unknown",
  "corrected_manufacturer": "Notifier",
  "reviewed_by_user": true,
  "captured_at": "ISO_DATE"
}
```

---

## 10. Label ontology

## Public type mapping
Keep app output aligned to the current module.

| Internal subtype | Public type |
|---|---|
| smoke detector | detector |
| heat detector | detector |
| multi-sensor detector | detector |
| wall sounder | sounder |
| base sounder | sounder |
| beacon only | vad |
| sounder beacon | vad |
| relay interface | interface |
| input module | interface |
| control io module | io_unit |

## Manufacturer shortlist v1
Start with a manageable first set:

- Apollo
- Hochiki
- Gent
- Advanced
- Morley
- Notifier
- Kentec
- C-Tec
- Siemens
- Eaton
- Hyfire
- System Sensor
- Unknown

Expand later after confusion analysis.

---

## 11. Annotation workflow

Use:

- CVAT or Label Studio

### Roles
- annotator
- verifier
- fire alarm domain reviewer

### Annotation rules to document
Create:
- `ml/annotation/label_rules.md`

Include:
- how to label partial devices
- how to label combined sounder-beacon devices
- how to label devices with unreadable manufacturer
- when to assign `unknown`
- how to handle repeated duplicates from same source

### Dataset split strategy
Split by:
- site
- source domain
- model family
- capture session

Do not randomly split near-duplicates across train/validation/test.

---

## 12. ML model strategy

## Stage 1 — detector
Train detector for coarse types first.

### Candidate models
- YOLO small/medium
- RT-DETR
- Mobile-friendly detector for Core ML export

### Target classes
- panel
- sounder
- detector
- interface
- io_unit
- vad

### Success target
Reach useful recall before chasing subtype precision.

## Stage 2 — manufacturer classifier
Run on detector crops.

### Candidate models
- MobileNet / EfficientNet / ConvNeXt tiny
- embedding model for nearest-neighbor search

### Output
- manufacturer top-k
- subtype shortlist
- confidence

## Stage 3 — OCR/logo fusion
Fuse:
- classifier score
- OCR text
- logo hits
- nearest-neighbor embedding similarity

This is especially valuable for:
- panels
- interfaces
- large wall devices
- devices with visible branding

## Stage 4 — on-device deployment
Export to Core ML:
- detector
- manufacturer classifier

Use:
- quantization
- latency measurement
- battery testing on target LiDAR devices

---

## 13. Spatial fusion plan

This is the logic that turns image detections into a floor plan.

## Pipeline
1. capture room geometry
2. capture frames
3. run detection on frames
4. associate detections with camera pose
5. estimate 3D wall/ceiling position
6. cluster repeated observations across frames
7. output one canonical device record

## Needed heuristics
- ceiling vs wall classification
- wall segment assignment
- duplicate suppression
- confidence aggregation
- manufacturer conflict resolution
- nearest reviewed evidence selection

## Fused device record
Each device in exported session should include:

```json
{
  "id": "device-uuid",
  "type": "detector",
  "subtype": "smoke",
  "manufacturer": {
    "name": "Apollo",
    "confidence": 0.82
  },
  "confidence": 0.88,
  "room_id": "room-1",
  "wall_segment_id": null,
  "location": { "x": 3.1, "y": 4.5, "z": 2.7 },
  "evidence_frames": ["frame-12", "frame-18"],
  "reviewed": false
}
```

---

## 14. Validation metrics

## Detection
- mAP by coarse class
- recall for small objects
- false positives per room
- class confusion

## Manufacturer
- top-1 accuracy
- top-3 accuracy
- confidence calibration
- confusion matrix by manufacturer

## End-to-end product
- correctly placed devices per room
- missed devices per room
- duplicate device rate
- user correction rate
- export acceptance rate

---

## 15. Delivery phases

## Phase 0 — current scaffold
Status: **done**
- reusable JS module scaffold
- iOS native scaffold
- demo tab in Expo app

## Phase 1 — real RoomPlan geometry
Deliver:
- actual `RoomCaptureSession`
- real floorplan export
- no ML required yet

## Phase 2 — manual review-first workflow
Deliver:
- device review screen
- manual add/edit/delete
- local session persistence
- training feedback export

## Phase 3 — coarse device detection
Deliver:
- on-device detector
- post-scan inference
- device list prefill

## Phase 4 — manufacturer inference
Deliver:
- crop classifier
- OCR/logo fusion
- manufacturer shortlist

## Phase 5 — spatial fusion + retraining loop
Deliver:
- 3D placement
- duplicate merging
- reviewed feedback ingestion
- periodic retraining

---

## 16. Immediate implementation backlog

## Mobile / native
1. replace mock RoomPlan Swift implementation with real capture session
2. add progress events
3. persist scan sessions locally
4. create review UI
5. create export/share flow

## ML workspace
1. create `ml/` directory structure
2. add source registry config
3. add dataset schemas
4. add collector scripts
5. add annotation rules
6. add first training configs

## Data collection
1. approve initial source list
2. crawl approved domains
3. extract images and PDFs
4. dedupe and weak-label
5. queue for human review

## Training
1. build first coarse detection dataset
2. train first detector
3. build first manufacturer crop dataset
4. train first classifier
5. export Core ML models

## Integration
1. add inference hooks in iOS module
2. fuse detections into RoomPlan session
3. expose reviewed output through the public module API

---

## 17. Recommended next coding steps in this repo

If continuing implementation in this repository, the next sequence should be:

1. create the root `ml/` workspace structure
2. add dataset schemas and source policy files
3. add `mobile/services/roomplan/` session persistence
4. add `mobile/app/room-plan/review.tsx`
5. replace the Swift mock `startScan()` with a real RoomPlan session
6. add frame/evidence export
7. begin collector pipeline for approved training sources

---

## 18. Notes on training with scraped internet data

Training from internet-scraped data can be useful, but only with controls:

- do not use unreviewed scraped labels as gold truth
- do not rely on image search results as your final dataset
- track source approval and licensing per asset
- prefer approved sources and your own field images over time
- use deployed user corrections as the highest-value feedback loop

The best approach is:

- scrape to bootstrap
- review to curate
- deploy to collect real corrections
- retrain using reviewed production feedback

---

## 19. Definition of done

This feature is fully working when the system can:

1. scan a room on a supported iOS LiDAR device
2. export the room geometry
3. detect likely fire alarm devices
4. estimate likely manufacturer for supported brands
5. place detections into room coordinates
6. let the user correct the result
7. export a reviewed session JSON
8. feed reviewed corrections back into the training pipeline

---

## 20. Suggested first milestone

### Milestone M1
“Room geometry + reviewable session export”

Deliverables:
- real RoomPlan capture
- real session export
- review UI
- manual device editing
- no ML dependency required

This milestone creates immediate product value and also starts generating the highest-value proprietary training data.
