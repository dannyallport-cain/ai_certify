# Datasets workspace

This directory is reserved for dataset artifacts and documentation for the Fire Alarm RoomPlan ML workflow.

## Purpose

The dataset area is structured to support a conservative, review-first pipeline:

- collect candidate assets
- normalize metadata
- track provenance and approval status
- annotate reviewed imagery
- export reproducible dataset splits

The data workflow should stay aligned with `mobile/roomplan.md`.

## Planned directories

- `schemas/`  
  JSON schemas for assets, detections, manufacturer crops, and scan feedback.
- `raw/`  
  Candidate collected source files before normalization.
- `normalized/`  
  Normalized asset manifests and extracted derivatives awaiting review.
- `reviewed/`  
  Human-reviewed assets and annotations that passed provenance and labeling checks.
- `exports/`  
  Reproducible split manifests and training-ready exports.

## Data handling rules

### 1. Source approval comes first

Do not treat a collected asset as training-ready just because it exists in `raw/` or `normalized/`.

Every asset should have:

- a stable asset identifier
- source URL and source domain
- collection timestamp
- content type
- hash metadata where possible
- source policy status
- review status

### 2. Unclear license means not approved

If the license or usage rights are unclear:

- do not move the asset into training exports
- do not mark derived crops as training-approved
- keep the item blocked or pending review

### 3. Weak labels are not gold labels

Text scraped from page titles, alt text, filenames, PDFs, or OCR may help prefill a review queue, but it is not ground truth unless manually reviewed.

### 4. Split to avoid leakage

Do not randomly split obvious near-duplicates across train, validation, and test.

Prefer grouping by:

- capture session
- source domain
- brochure or document family
- site
- product family / model family

## Intended artifact types

### Asset record

One record per collected source item, including provenance, approval, hashes, and weak labels.

### Detection annotation

One record per full image or scene, with one or more bounding-box annotations mapped to the coarse public classes:

- `panel`
- `sounder`
- `detector`
- `interface`
- `io_unit`
- `vad`
- `unknown`

### Manufacturer crop classification

One record per reviewed device crop for shortlist manufacturer classification.

### Scan feedback

One record per corrected in-app device prediction to support later retraining.

## Practical advice

- Keep manifests machine-readable and stable.
- Prefer append-only audit trails over silent mutation.
- Record why something was blocked, not just that it was blocked.
- Preserve the link between a crop and its parent asset or parent image.
- Treat field-captured reviewed data as higher long-term value than web-bootstrap data.

## Related files

- `ml/configs/datasets/detection_v1.yaml`
- `ml/configs/datasets/manufacturer_v1.yaml`
- `ml/annotation/label_rules.md`
- `mobile/roomplan.md`