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

## Future model replacement points

The implementation is intentionally split so real inference can be added later without changing the API contract.

### `app/pipeline.py`

This is the main swap point for production ML logic.

Current placeholder stages:
- request interpretation
- fake accessory generation
- fake text hint generation
- report prefill shaping

Planned replacement flow:
1. Load image bytes from `imageUrl` or decode `imageBase64`
2. Run object detection model
   - Example future option: YOLO
3. Run OCR model
   - Example future option: PaddleOCR or Tesseract
4. Normalize outputs into the shared response schema
5. Add confidence thresholds and `needsHumanReview` rules

### `app/schemas.py`

Keep this file stable so the Next.js proxy and frontend can depend on a fixed contract.

If you add more fields later, prefer additive changes to avoid breaking the app integration.

## Notes

- This service currently performs no real image download, decoding, OCR, or detection.
- Responses are deterministic scaffolding intended for integration and deployment setup.
- `needsHumanReview` is always `true` for now to reflect placeholder inference.