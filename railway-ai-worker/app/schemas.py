from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator


class CertificateConsumerUnitContext(BaseModel):
    brand: str | None = None
    model: str | None = None
    serialNumber: str | None = None
    boardType: str | None = None
    hasMainSwitch: bool | None = None
    hasRcdProtection: bool | None = None
    hasRcboProtection: bool | None = None
    hasSpd: bool | None = None
    rcdType: str | None = None
    mainSwitchRating: float | None = None
    incomerRating: float | None = None
    spdType: str | None = None


class CertificateCircuitRowContext(BaseModel):
    circuitNumber: str | None = None
    ringFinal: str | None = None
    designation: str | None = None
    wiringType: str | None = None
    refMethod: str | None = None
    numPoints: str | None = None
    liveCsa: str | None = None
    cpcCsa: str | None = None
    maxDiscTime: str | None = None
    bsen: str | None = None
    deviceType: str | None = None
    rating: str | None = None
    capacity: str | None = None
    rcdRating: str | None = None
    maxZs: str | None = None
    r1Line: str | None = None
    rnNeutral: str | None = None
    r2Cpc: str | None = None
    r1r2: str | None = None
    r2: str | None = None
    insResLN: str | None = None
    insResLL: str | None = None
    insResLE: str | None = None
    testVoltage: str | None = None
    polarity: str | None = None
    measuredZs: str | None = None
    discTime: str | None = None
    rcdTestButton: str | None = None
    afddTestButton: str | None = None


class CertificateCircuitsContext(BaseModel):
    total: int | None = None
    rcdProtectedCount: int | None = None
    rcboCount: int | None = None
    mcbCount: int | None = None
    spdProtectedCount: int | None = None
    ratedCurrentValues: list[float] = Field(default_factory=list)
    rows: list[CertificateCircuitRowContext] = Field(default_factory=list)


class CertificateObservationsContext(BaseModel):
    codes: list[str] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)


class CertificateMeasurementsContext(BaseModel):
    ze: float | None = None
    zs: float | None = None
    pscc: float | None = None
    pfc: float | None = None


class BondingDetailContext(BaseModel):
    present: bool | None = None
    conductorSize: float | None = None


class CertificateBondingContext(BaseModel):
    gas: BondingDetailContext | None = None
    water: BondingDetailContext | None = None
    oil: BondingDetailContext | None = None
    structuralSteel: BondingDetailContext | None = None


class CertificateEarthElectrodeContext(BaseModel):
    present: bool | None = None
    accessible: bool | None = None
    resistance: float | None = None
    location: str | None = None
    type: str | None = None


class CertificateEarthingContext(BaseModel):
    earthingArrangement: str | None = None
    meansOfEarthing: str | None = None
    earthElectrode: CertificateEarthElectrodeContext | None = None


class CertificateContext(BaseModel):
    certificateType: str | None = None
    boardReference: str | None = None
    consumerUnit: CertificateConsumerUnitContext | None = None
    circuits: CertificateCircuitsContext | None = None
    observations: CertificateObservationsContext | None = None
    measurements: CertificateMeasurementsContext | None = None
    bonding: CertificateBondingContext | None = None
    earthing: CertificateEarthingContext | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class AnalyzeImageRequest(BaseModel):
    imageUrl: str | None = None
    imageBase64: str | None = None
    reportType: str | None = None
    inspectionType: str | None = None
    requestedSections: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
    certificateContext: CertificateContext | None = None

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


class RuleEvidence(BaseModel):
    text: str | None = None
    field: str | None = None
    value: Any | None = None
    bbox: list[float] | None = None
    note: str | None = None


class ReportTarget(BaseModel):
    sectionKey: str
    fieldPath: str | None = None
    highlight: bool = True
    expectedValue: Any | None = None
    reason: str | None = None


class ScheduleItemSuggestion(BaseModel):
    sectionKey: str
    itemKey: str
    code: Literal["C1", "C2", "C3", "LIM", "NA", "FI"]
    comment: str | None = None


class ObservationSuggestion(BaseModel):
    code: Literal["C1", "C2", "C3", "LIM", "NA", "FI"] | None = None
    title: str | None = None
    comment: str | None = None
    classification: str | None = None
    scheduleItems: list[ScheduleItemSuggestion] = Field(default_factory=list)


class InferenceIssue(BaseModel):
    ruleId: str
    issueType: str
    message: str
    severity: Literal["info", "warning", "medium", "high", "critical"]
    title: str | None = None
    suggestedCodes: list[str] = Field(default_factory=list)
    evidence: list[RuleEvidence] = Field(default_factory=list)
    reportTargets: list[ReportTarget] = Field(default_factory=list)
    observation: ObservationSuggestion | None = None
    summaryComment: str | None = None
    source: str
    confidence: float | None = None
    needsHumanReview: bool = True


class InferenceResult(BaseModel):
    ruleId: str
    issueType: str
    message: str
    severity: Literal["info", "warning", "medium", "high", "critical"]
    title: str | None = None
    suggestedCodes: list[str] = Field(default_factory=list)
    evidence: list[RuleEvidence] = Field(default_factory=list)
    reportTargets: list[ReportTarget] = Field(default_factory=list)
    observation: ObservationSuggestion | None = None
    summaryComment: str | None = None
    source: str
    confidence: float | None = None
    needsHumanReview: bool = True


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
    inferenceResults: list[InferenceResult] = Field(default_factory=list)
    issues: list[InferenceIssue] = Field(default_factory=list)


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


class DeleteBackupRequest(BaseModel):
    objectKey: str


class DeleteBackupResponse(BaseModel):
    success: bool
    objectKey: str
    bucket: str
    deletedAt: str
