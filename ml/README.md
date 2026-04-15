# ML workspace for Fire Alarm RoomPlan

This directory contains the initial machine-learning workspace for the Fire Alarm RoomPlan system described in `mobile/roomplan.md`.

The purpose of this workspace is to provide practical, auditable scaffolding for:

- source approval and collection
- dataset documentation and annotation governance
- training configuration
- evaluation planning
- later Core ML export work

This is intentionally **not** a claim that working production ML models already exist here. The files in `ml/` are the starting point for an implementation that will be built in later phases.

## Goals in this repository

The mobile RoomPlan flow is expected to support:

1. room geometry capture on iOS
2. coarse fire alarm device detection from evidence frames
3. manufacturer prediction where enough evidence exists
4. OCR / logo assisted reranking for visible branding or model text
5. human review and correction before export
6. feedback ingestion for future retraining

The ML workspace should therefore optimize for traceability and conservative governance, not just model experimentation.

## Public class contract

The public coarse device classes must stay aligned with the module plan in `mobile/roomplan.md`:

- `panel`
- `sounder`
- `detector`
- `interface`
- `io_unit`
- `vad`
- `unknown`

These labels are the shared contract across annotation rules, dataset configs, and downstream mobile integration.

## Manufacturer shortlist v1

The initial manufacturer shortlist is deliberately small and matches the plan:

- `Apollo`
- `Hochiki`
- `Gent`
- `Advanced`
- `Morley`
- `Notifier`
- `Kentec`
- `C-Tec`
- `Siemens`
- `Eaton`
- `Hyfire`
- `System Sensor`
- `Unknown`

Expand this only after review capacity, confusion analysis, and source approval support it.

## Directory layout

```text
ml/
  README.md
  requirements.txt
  pyproject.toml
  configs/
    sources/
    datasets/
    training/
  datasets/
    README.md
    schemas/
    raw/
    normalized/
    reviewed/
    exports/
  annotation/
    label_rules.md
    classes.yaml
    manufacturers.yaml
  collector/
  training/
  evaluation/
  tools/
```

## Compliance and data governance

### Bootstrap-only scraping

Internet scraping or crawling is allowed here only as a **bootstrap discovery step** for candidate assets.

That means:

- scraped assets may help identify possible product imagery or brochures
- scraped labels should be treated as weak labels only
- scraped content is **not automatically approved** for training or redistribution

### Approval requirement

Every asset must have explicit source review before it becomes training-approved.

Track at minimum:

- source URL
- source domain
- source type
- access or collection date
- observed terms or copyright note
- reviewer decision
- approval status
- notes and rationale

If a source or asset has unclear, missing, or conflicting rights, it must **not** be marked training-approved.

### Allowed statuses

Source and asset workflows in this workspace use the conservative policy statuses from the plan:

- `allowed_training`
- `allowed_review_only`
- `allowed_embedding_only`
- `blocked`

If unsure, prefer `allowed_review_only` or `blocked` pending review.

### Derived assets

Derived outputs such as crops, OCR text, annotations, embeddings, or augmentations should inherit the source approval status unless a stricter rule is applied.

## Expected workflow

1. Maintain approved and blocked source lists in `configs/sources/`.
2. Collect candidate assets from approved discovery targets.
3. Normalize metadata and compute hashes.
4. Run duplicate checks and weak-label extraction.
5. Route assets into review before annotation.
6. Annotate only with approved coarse classes and approved manufacturer labels.
7. Build stable dataset manifests and splits.
8. Train baseline detector and manufacturer classifier.
9. Evaluate detector-only, classifier-only, and end-to-end pipelines.
10. Export mobile-ready artifacts only after metrics and review are acceptable.

## Suggested setup

Python target: **3.11+**

### Using requirements

```bash
cd ml
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Using editable install

```bash
cd ml
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
```

## Implementation notes

- Keep dependencies minimal and justified.
- Prefer explicit YAML and JSON manifests over hidden assumptions.
- Treat manufacturer prediction as optional evidence, not guaranteed truth.
- Keep OCR fusion as a reranking and evidence aggregation step.
- Do not let internet-derived weak labels become gold labels without review.
- Keep dataset split strategy resistant to leakage from near-duplicates and same-session captures.

## Starter tooling workflow example

The current workspace now has ten usable starter utilities:

- `ml.collector.source_registry`
- `ml.collector.weak_labels`
- `ml.tools.build_dataset_index`
- `ml.tools.generate_splits`
- `ml.tools.inspect_duplicates`
- `ml.collector.review_queue`
- `ml.collector.normalize`
- `ml.collector.export_reviewed`
- `ml.tools.normalize_records`
- `ml.tools.enqueue_review`
- `ml.tools.export_reviewed`

### Example record

Save a reviewed or collected asset record somewhere under `ml/datasets/reviewed/` or `ml/datasets/normalized/`, for example:

```json
{
  "asset_id": "asset-demo-001",
  "source_url": "https://example.com/apollo-optical-smoke-detector",
  "source_domain": "example.com",
  "sha256": "abc123",
  "phash": "ffff0000",
  "ocr_text": "Apollo Optical Smoke Detector",
  "page_title": "Apollo Optical Smoke Detector",
  "review_status": "pending"
}
```

### Normalize a raw asset record

```python
from ml.collector.normalize import normalize_asset_record, write_normalized_asset

raw_record = {
    "url": "https://example.com/products/apollo-optical-smoke-detector",
    "page_title": "Apollo Optical Smoke Detector",
    "ocr_text": "Apollo Optical Smoke Detector",
    "content_type": "image/jpeg",
    "sha256": "abc123",
}

normalized = normalize_asset_record(raw_record)
write_normalized_asset(normalized, "ml/datasets/normalized")
```

### Export approved reviewed items

```python
from ml.collector.export_reviewed import build_reviewed_manifest, export_reviewed_items

result = export_reviewed_items("ml/datasets/review-queue", "ml/datasets/reviewed")
print(result)

build_reviewed_manifest(
    "ml/datasets/reviewed",
    "ml/datasets/exports/reviewed-manifest.json",
)
```

### Build a dataset index

```bash
cd /Users/admin/Development/ai_certify
python3 ml/tools/build_dataset_index.py ml/datasets ml/datasets/exports/index.json
```

### Generate split assignments

```bash
cd /Users/admin/Development/ai_certify
python3 ml/tools/generate_splits.py ml/datasets ml/datasets/exports --seed 42
```

### Generate a duplicate inspection report

```bash
cd /Users/admin/Development/ai_certify
python3 ml/tools/inspect_duplicates.py ml/datasets ml/datasets/exports/duplicates.json
```

### Weak-labeling example

```python
from ml.collector.weak_labels import build_weak_labels, to_serializable

record = {
    "source_url": "https://example.com/products/apollo-optical-smoke-detector",
    "page_title": "Apollo Optical Smoke Detector",
    "ocr_text": "Apollo Discovery Optical Smoke Detector",
}

result = build_weak_labels(record)
print(to_serializable(result))
```

Expected output shape:

```json
{
  "manufacturer": "Apollo",
  "device_type": "detector",
  "subtype": "smoke",
  "confidence": 0.8,
  "evidence": [
    "manufacturer:Apollo",
    "device_type:detector",
    "subtype:smoke"
  ]
}
```

### Source registry example

```python
from ml.collector.source_registry import load_source_registry, index_registry_by_domain

entries = load_source_registry("ml/configs/sources/approved_sources.yaml")
registry = index_registry_by_domain(entries)
print(registry["apollo-fire.co.uk"].approval.value)
```

### Review queue example

```python
from ml.collector.review_queue import enqueue_record_for_review
from ml.collector.source_registry import index_registry_by_domain, load_source_registry

record = {
    "asset_id": "asset-demo-001",
    "source_domain": "apollo-fire.co.uk",
    "source_url": "https://apollo-fire.co.uk/products/discovery-optical-smoke-detector",
    "page_title": "Discovery Optical Smoke Detector",
    "ocr_text": "Apollo Discovery Optical Smoke Detector",
    "review_status": "pending",
}

entries = load_source_registry("ml/configs/sources/approved_sources.yaml")
registry = index_registry_by_domain(entries)
enqueue_record_for_review(record, "ml/datasets/review-queue", registry)
```

This creates a JSON queue item containing:
- source approval context
- weak labels
- reviewer notes
- a simple priority score

### CLI workflow example

```bash
cd /Users/admin/Development/ai_certify

python3 ml/tools/normalize_records.py ml/datasets/raw ml/datasets/normalized

python3 ml/tools/enqueue_review.py \
  ml/datasets/normalized \
  ml/datasets/review-queue \
  --source-registry ml/configs/sources/approved_sources.yaml

python3 ml/tools/export_reviewed.py \
  ml/datasets/review-queue \
  ml/datasets/reviewed \
  --manifest ml/datasets/exports/reviewed-manifest.json

python3 ml/tools/build_dataset_index.py ml/datasets ml/datasets/exports/index.json
python3 ml/tools/generate_splits.py ml/datasets ml/datasets/exports --seed 42
python3 ml/tools/inspect_duplicates.py ml/datasets ml/datasets/exports/duplicates.json
```

These examples are intentionally modest. They help validate the governance and dataset-preparation layer before any real crawling, annotation, or model training is added.

## Related files

- `mobile/roomplan.md`
- `ml/datasets/README.md`
- `ml/annotation/label_rules.md`
- `ml/annotation/classes.yaml`
- `ml/annotation/manufacturers.yaml`
