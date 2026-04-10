from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, model_validator


class AnalyzeImageRequest(BaseModel):
    imageUrl: str | None = None
    imageBase64: str | None = None
    reportType: str | None = None
    inspectionType: str | None = None
    requestedSections: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_image_source(self) -> "AnalyzeImageRequest":
        if not self.imageUrl and not self.imageBase64:
            raise ValueError("Either imageUrl or imageBase64 must be provided.")
        return self


class ConsumerUnitFinding(BaseModel):
    brand: str | None = None
    model: str | None = None
    serialNumber: str | None = None
    condition: str | None = None
    confidence: float | None = None
    bbox: list[float] | None = None


class AccessoryFinding(BaseModel):
    type: str
    condition: str
    confidence: float
    bbox: list[float] | None = None


class Findings(BaseModel):
    consumerUnit: ConsumerUnitFinding | None = None
    accessories: list[AccessoryFinding] = Field(default_factory=list)
    textDetections: list[str] = Field(default_factory=list)
    observations: list[str] = Field(default_factory=list)


class Prefill(BaseModel):
    observations: list[str] = Field(default_factory=list)
    recommendedCodes: list[str] = Field(default_factory=list)
    reportSections: dict[str, Any] = Field(default_factory=dict)


class ModelInfo(BaseModel):
    detector: str
    ocr: str
    extractor: str


class AnalyzeImageResponse(BaseModel):
    success: bool
    summary: str
    findings: Findings
    prefill: Prefill
    needsHumanReview: bool
    modelInfo: ModelInfo


class HealthResponse(BaseModel):
    status: str
    service: str


class BackupDatabaseResponse(BaseModel):
    success: bool
    objectKey: str
    bucket: str
    dumpBytes: int
    gzipBytes: int
    timestamp: str


class BackupListItem(BaseModel):
    objectKey: str
    bucket: str
    size: int | None = None
    timestamp: str | None = None
    lastModified: str | None = None


class ListBackupsResponse(BaseModel):
    success: bool
    backups: list[BackupListItem] = Field(default_factory=list)


class RestoreDatabaseRequest(BaseModel):
    objectKey: str


class RestoreDatabaseResponse(BaseModel):
    success: bool
    objectKey: str
    bucket: str
    restoredAt: str