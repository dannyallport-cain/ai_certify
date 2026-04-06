from __future__ import annotations

from typing import Any

from app.schemas import (
    AccessoryFinding,
    AnalyzeImageRequest,
    AnalyzeImageResponse,
    ConsumerUnitFinding,
    Findings,
    ModelInfo,
    Prefill,
)


def _derive_text_detections(payload: AnalyzeImageRequest) -> list[str]:
    detections: list[str] = []

    if payload.reportType:
        detections.append(f"report_type:{payload.reportType}")

    if payload.inspectionType:
        detections.append(f"inspection_type:{payload.inspectionType}")

    for section in payload.requestedSections:
        detections.append(f"requested_section:{section}")

    source_hint = "image_url" if payload.imageUrl else "image_base64"
    detections.append(f"source:{source_hint}")

    return detections


def _derive_accessories(payload: AnalyzeImageRequest) -> list[AccessoryFinding]:
    requested = {section.lower() for section in payload.requestedSections}

    accessories: list[AccessoryFinding] = []

    if "accessories" in requested or "consumer-unit" in requested or not requested:
        accessories.append(
            AccessoryFinding(
                type="main-switch",
                condition="unknown",
                confidence=0.41,
                bbox=[0.12, 0.18, 0.44, 0.52],
            )
        )

    if payload.metadata.get("includeRcdPlaceholder"):
        accessories.append(
            AccessoryFinding(
                type="rcd",
                condition="unknown",
                confidence=0.33,
                bbox=[0.46, 0.18, 0.78, 0.52],
            )
        )

    return accessories


def _derive_consumer_unit(payload: AnalyzeImageRequest) -> ConsumerUnitFinding | None:
    if payload.inspectionType or payload.reportType or payload.requestedSections:
        return ConsumerUnitFinding(
            brand=None,
            model=None,
            serialNumber=None,
            condition="undetermined",
            confidence=0.28,
            bbox=[0.08, 0.08, 0.92, 0.88],
        )

    return None


def _build_observations(payload: AnalyzeImageRequest, has_image_url: bool) -> list[str]:
    observations = [
        "Placeholder analysis only; no production ML models are running yet.",
        "Detected image source and request metadata were accepted successfully.",
    ]

    if has_image_url:
        observations.append("Image was referenced by URL; remote fetch is not performed in this scaffold.")
    else:
        observations.append("Image was provided as base64; binary decoding is not performed in this scaffold.")

    if payload.requestedSections:
        observations.append("Requested sections were noted for downstream report prefill.")

    return observations


def _build_report_sections(payload: AnalyzeImageRequest, observations: list[str]) -> dict[str, Any]:
    report_sections: dict[str, Any] = {
        "analysisStatus": "placeholder",
        "requestedSections": payload.requestedSections,
        "inspectionType": payload.inspectionType,
        "reportType": payload.reportType,
        "observations": observations,
    }

    if payload.metadata:
        report_sections["metadataEcho"] = payload.metadata

    return report_sections


def analyze_image(payload: AnalyzeImageRequest) -> AnalyzeImageResponse:
    # TODO: Replace this orchestration with real inference stages:
    # 1. Load image bytes from URL or base64
    # 2. Run object detection (e.g. YOLO) for equipment/accessories
    # 3. Run OCR (e.g. PaddleOCR/Tesseract) for labels and schedules
    # 4. Run extraction/normalization to map findings into report fields

    text_detections = _derive_text_detections(payload)
    accessories = _derive_accessories(payload)
    consumer_unit = _derive_consumer_unit(payload)
    observations = _build_observations(payload, has_image_url=bool(payload.imageUrl))
    report_sections = _build_report_sections(payload, observations)

    findings = Findings(
        consumerUnit=consumer_unit,
        accessories=accessories,
        textDetections=text_detections,
        observations=observations,
    )

    prefill = Prefill(
        observations=observations,
        recommendedCodes=["manual-review"] if observations else [],
        reportSections=report_sections,
    )

    needs_human_review = True

    summary_bits = [
        "Placeholder analysis completed",
        f"{len(accessories)} accessory candidates",
        f"{len(text_detections)} text hints",
    ]
    if consumer_unit is not None:
        summary_bits.append("consumer unit region estimated")

    return AnalyzeImageResponse(
        success=True,
        summary="; ".join(summary_bits) + ".",
        findings=findings,
        prefill=prefill,
        needsHumanReview=needs_human_review,
        modelInfo=ModelInfo(
            detector="placeholder-detector-v1",
            ocr="placeholder-ocr-v1",
            extractor="placeholder-extractor-v1",
        ),
    )