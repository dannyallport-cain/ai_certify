from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.pipeline import analyze_image
from app.schemas import AnalyzeImageRequest, AnalyzeImageResponse, HealthResponse

app = FastAPI(
    title="Railway AI Worker",
    version="0.1.0",
    description="Minimal FastAPI worker for image analysis scaffolding.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", service="railway-ai-worker")


@app.post("/analyze-image", response_model=AnalyzeImageResponse)
async def analyze_image_endpoint(payload: AnalyzeImageRequest) -> AnalyzeImageResponse:
    return analyze_image(payload)