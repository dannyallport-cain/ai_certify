from __future__ import annotations

from app.extractors import (
    build_image_quality_summary,
    build_report_sections,
    build_text_detections,
    extract_consumer_unit_hints,
)
from app.ocr import ocr_from_inputs
from app.schemas import (
    AnalyzeImageRequest,
    AnalyzeImageResponse,
    ConsumerUnitFinding,
    Findings,
    ModelInfo,
    Prefill,
)


def _derive_consumer_unit(hints: dict[str, object], image_loaded: bool) -> ConsumerUnitFinding | None:
    if not image_loaded and not hints.get("brand") and not hints.get("model") and not hints.get("serialNumber"):
        return None

    confidence_parts = [
        0.15 if image_loaded else 0.0,
        0.25 if hints.get("brand") else 0.0,
        0.2 if hints.get("model") else 0.0,
        0.15 if hints.get("serialNumber") else 0.0,
        0.1 if hints.get("boardTypeHint") else 0.0,
        0.05 if hints.get("hasMainSwitchHint") else 0.0,
        0.05 if hints.get("hasRCDHint") else 0.0,
        0.05 if hints.get("hasRCBOHint") else 0.0,
    ]
    confidence = min(0.95, round(sum(confidence_parts), 2))

    return ConsumerUnitFinding(
        brand=hints.get("brand") if isinstance(hints.get("brand"), str) else None,
        model=hints.get("model") if isinstance(hints.get("model"), str) else None,
        serialNumber=hints.get("serialNumber") if isinstance(hints.get("serialNumber"), str) else None,
        condition="text-derived",
        confidence=confidence if confidence > 0 else 0.2,
        bbox=None,
    )


def analyze_image(payload: AnalyzeImageRequest) -> AnalyzeImageResponse:
    ocr_result = ocr_from_inputs(image_url=payload.imageUrl, image_base64=payload.imageBase64)
    text_lines = build_text_detections(ocr_result.get("textLines", []))
    image_quality = ocr_result.get("imageQuality", {})
    image_loaded = bool(ocr_result.get("imageLoaded"))

    hints = extract_consumer_unit_hints(text_lines, image_quality=image_quality)
    consumer_unit = _derive_consumer_unit(hints, image_loaded=image_loaded)

    observations = list(hints.get("observations", []))
    if not image_loaded:
        observations.insert(0, "Image could not be loaded for OCR analysis.")
    if not text_lines:
        observations.append("No OCR text was extracted from the image.")
    if payload.requestedSections:
        observations.append("Requested sections were considered during report prefill.")
    if payload.reportType:
        observations.append(f"Report type context: {payload.reportType}.")
    if payload.inspectionType:
        observations.append(f"Inspection type context: {payload.inspectionType}.")

    report_sections = build_report_sections(
        hints,
        text_lines,
        requested_sections=payload.requestedSections,
    )
    report_sections["imageQuality"] = image_quality
    report_sections["imageQualitySummary"] = build_image_quality_summary(image_quality)
    report_sections["requestedSections"] = payload.requestedSections
    report_sections["inspectionType"] = payload.inspectionType
    report_sections["reportType"] = payload.reportType

    if payload.metadata:
        report_sections["metadataEcho"] = payload.metadata

    findings = Findings(
        consumerUnit=consumer_unit,
        accessories=[],
        textDetections=text_lines,
        observations=observations,
    )

    prefill = Prefill(
        observations=observations,
        recommendedCodes=["manual-review"],
        reportSections=report_sections,
    )

    summary_bits = [
        "OCR analysis completed",
        f"{len(text_lines)} text lines extracted",
        build_image_quality_summary(image_quality),
    ]
    if consumer_unit is not None:
        summary_bits.append("consumer unit hints extracted")

    return AnalyzeImageResponse(
        success=True,
        summary="; ".join(summary_bits) + ".",
        findings=findings,
        prefill=prefill,
        needsHumanReview=True,
        modelInfo=ModelInfo(
            detector="not-enabled",
            ocr="pytesseract-ocr-v1",
            extractor="ocr-rules-v1",
        ),
    )
