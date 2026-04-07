# Railway AI Worker

Minimal FastAPI worker for AI-assisted image analysis, intended to run as a separate Railway service alongside the Next.js app.

## Endpoints

- `GET /health`
- `POST /analyze-image`

### `POST /analyze-image` request body

```json
{
  "imageUrl": "https://example.com/image.jpg",
  "imageBase64": "optional-base64-string",
  "reportType": "eicr",
  "inspectionType": "consumer-unit",
  "requestedSections": ["consumer-unit", "accessories"],
  "metadata": {
    "jobId": "123"
  }
}
```

At least one of `imageUrl` or `imageBase64` must be provided.

### Response shape

```json
{
  "success": true,
  "summary": "Placeholder analysis completed; 1 accessory candidates; 4 text hints; consumer unit region estimated.",
  "findings": {
    "consumerUnit": {
      "brand": null,
      "model": null,
      "serialNumber": null,
      "condition": "undetermined",
      "confidence": 0.28,
      "bbox": [0.08, 0.08, 0.92, 0.88]
    },
    "accessories": [
      {
        "type": "main-switch",
        "condition": "unknown",
        "confidence": 0.41,
        "bbox": [0.12, 0.18, 0.44, 0.52]
      }
    ],
    "textDetections": [
      "report_type:eicr",
      "inspection_type:consumer-unit"
    ],
    "observations": [
      "Placeholder analysis only; no production ML models are running yet."
    ]
  },
  "prefill": {
    "observations": [
      "Placeholder analysis only; no production ML models are running yet."
    ],
    "recommendedCodes": ["manual-review"],
    "reportSections": {
      "analysisStatus": "placeholder"
    }
  },
  "needsHumanReview": true,
  "modelInfo": {
    "detector": "placeholder-detector-v1",
    "ocr": "placeholder-ocr-v1",
    "extractor": "placeholder-extractor-v1"
  }
}
```

## Local development

From `railway-ai-worker/`:

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Health check:

```bash
curl http://localhost:8000/health
```

Analyze endpoint:

```bash
curl -X POST http://localhost:8000/analyze-image \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/example.jpg",
    "reportType": "eicr",
    "inspectionType": "consumer-unit",
    "requestedSections": ["consumer-unit", "accessories"],
    "metadata": {"jobId": "demo-123"}
  }'
```

## Railway deployment

This folder is designed to be deployed as its own Railway service.

### Included deployment files

- `Procfile` — starts Uvicorn on Railway's provided `PORT`
- `runtime.txt` — pins Python 3.11
- `requirements.txt` — minimal Python dependencies

### Suggested Railway setup

1. Create a new service in Railway from this repository.
2. Set the service root directory to `railway-ai-worker`.
3. Railway should detect the Python app automatically.
4. Confirm the start command uses the `Procfile`, or set it to:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

5. Deploy and verify:
   - `GET /health` returns `{"status":"ok","service":"railway-ai-worker"}`

## Environment variables

This worker currently does not require any environment variables.

The Next.js app should be configured separately with:

- `RAILWAY_AI_WORKER_URL` — base URL of this deployed Railway service

Example in the main app:

```env
RAILWAY_AI_WORKER_URL=https://your-railway-service.up.railway.app
```

## OCR-first implementation

This worker now performs a real OCR-first analysis flow:

1. load image from `imageUrl` or `imageBase64`
2. preprocess image variants for OCR
3. run `pytesseract` on those variants
4. extract consumer unit hints with regex/keyword rules
5. return structured findings and report-prefill data

### What it can extract now

- consumer unit brand hints
- model candidates
- serial number candidates
- board type hints
- device hints for:
  - `SPD`
  - `RCD`
  - `RCBO`
  - `MCB`
  - `main switch`
- image quality notes
- OCR-derived observations and review notes

### What it does not do yet

- accessory/object detection
- damage classification
- bounding box detection for components
- YOLO inference
- automatic defect coding beyond manual review recommendation

## Railway runtime requirements

This worker now depends on Tesseract being present at runtime.

Included:
- `requirements.txt` for Python packages
- `nixpacks.toml` to install:
  - `python311`
  - `tesseract`
  - runtime libraries needed by OCR/image packages

If Railway rebuilds the service after these files are pushed, it should install the OCR runtime automatically.

## Future model replacement points

### `app/ocr.py`

Main OCR integration point:
- image fetching
- base64 decoding
- preprocessing
- Tesseract execution
- image quality summary

### `app/extractors.py`

Main rules/extraction point:
- brand/model/serial parsing
- consumer unit keyword extraction
- report section shaping
- review note generation

### `app/pipeline.py`

Main orchestration point:
- OCR execution
- hint extraction
- response shaping
- confidence estimation

### `app/schemas.py`

Keep this file stable so the Next.js proxy and frontend can depend on a fixed contract.

If you add more fields later, prefer additive changes to avoid breaking the app integration.

## Notes

- `needsHumanReview` remains `true` for all responses.
- This is intended for safe report prefilling, not autonomous certification.
- The next major upgrade path is custom detection/classification for accessories and damaged equipment.
