from __future__ import annotations

from app.extractors import (
    build_image_quality_summary,
    build_report_sections,
    build_text_detections,
    extract_consumer_unit_hints,
)
from app.ocr import ocr_from_inputs
from app.rules import evaluate_rules
from app.schemas import (
    AnalyzeImageRequest,
    AnalyzeImageResponse,
    ConsumerUnitFinding,
    Findings,
    InferenceIssue,
    InferenceResult,
    ModelInfo,
    ObservationSuggestion,
    Prefill,
    ReportTarget,
    RuleEvidence,
    ScheduleItemSuggestion,
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


def _build_rule_inputs(
    hints: dict[str, object],
    consumer_unit: ConsumerUnitFinding | None,
) -> dict[str, object]:
    return {
        "consumerUnit": {
            "brand": consumer_unit.brand if consumer_unit else hints.get("brand"),
            "model": consumer_unit.model if consumer_unit else hints.get("model"),
            "serialNumber": consumer_unit.serialNumber if consumer_unit else hints.get("serialNumber"),
            "boardType": hints.get("boardTypeHint"),
            "hasMainSwitch": bool(hints.get("hasMainSwitchHint")),
            "hasRCD": bool(hints.get("hasRCDHint")),
            "hasRCBO": bool(hints.get("hasRCBOHint")),
            "hasSPD": bool(hints.get("hasSPDHint")),
            "hasMCB": bool(hints.get("hasMCBHint")),
            "modelCandidates": hints.get("modelCandidates") or [],
            "serialNumberCandidates": hints.get("serialNumberCandidates") or [],
            "reviewNotes": hints.get("reviewNotes") or [],
            "observations": hints.get("observations") or [],
        }
    }


def _build_inference_results(raw_results: list[dict[str, object]]) -> tuple[list[InferenceResult], list[InferenceIssue]]:
    inference_results: list[InferenceResult] = []
    issues: list[InferenceIssue] = []

    for item in raw_results:
        evidence = [
            RuleEvidence(
                text=evidence_item.get("label") if isinstance(evidence_item, dict) else None,
                field=evidence_item.get("path") if isinstance(evidence_item, dict) else None,
                value=evidence_item.get("value") if isinstance(evidence_item, dict) else None,
                note=None,
            )
            for evidence_item in item.get("evidence", [])
            if isinstance(evidence_item, dict)
        ]
        report_targets = [
            ReportTarget(**target_item)
            for target_item in item.get("reportTargets", [])
            if isinstance(target_item, dict)
        ]

        observation = None
        raw_observation = item.get("observation")
        if isinstance(raw_observation, dict):
            schedule_items = [
                ScheduleItemSuggestion(**schedule_item)
                for schedule_item in raw_observation.get("scheduleItems", [])
                if isinstance(schedule_item, dict)
            ]
            observation = ObservationSuggestion(
                code=raw_observation.get("code"),
                title=raw_observation.get("title"),
                comment=raw_observation.get("comment"),
                classification=raw_observation.get("classification"),
                scheduleItems=schedule_items,
            )

        payload = {
            "ruleId": str(item.get("ruleId") or "unknown-rule"),
            "issueType": str(item.get("issueType") or "review-required"),
            "message": str(item.get("message") or "Rule matched during analysis."),
            "severity": item.get("severity") or "warning",
            "title": item.get("title"),
            "suggestedCodes": list(item.get("suggestedCodes", [])),
            "evidence": evidence,
            "reportTargets": report_targets,
            "observation": observation,
            "summaryComment": item.get("summaryComment"),
            "source": str(item.get("source") or "rule-pack"),
            "confidence": float(item["confidence"]) if item.get("confidence") is not None else None,
            "needsHumanReview": bool(item.get("needsHumanReview", True)),
        }
        inference_results.append(InferenceResult(**payload))
        issues.append(InferenceIssue(**payload))

    return inference_results, issues


def _merge_report_prefill(
    report_sections: dict[str, object],
    inference_results: list[InferenceResult],
) -> None:
    identified_defects: list[dict[str, object]] = []
    highlighted_sections: list[dict[str, object]] = []
    observation_schedule_items: list[dict[str, object]] = []
    observations_and_recommendations_items: list[dict[str, object]] = []
    summary_comments: list[str] = []

    report_sections.setdefault("identifiedDefects", identified_defects)
    report_sections.setdefault("highlightedSections", highlighted_sections)
    report_sections.setdefault("observationSchedule", {"items": observation_schedule_items})
    report_sections.setdefault("observationsAndRecommendations", {"items": observations_and_recommendations_items})
    report_sections.setdefault("summaryOfCondition", {"comments": summary_comments})
    report_sections.setdefault("inspectionSchedule", {"items": []})
    report_sections.setdefault("supplyCharacteristicsAndEarthingArrangements", {})
    report_sections.setdefault("reportSummary", {})

    supply_section = report_sections["supplyCharacteristicsAndEarthingArrangements"]
    if not isinstance(supply_section, dict):
        supply_section = {}
        report_sections["supplyCharacteristicsAndEarthingArrangements"] = supply_section

    inspection_schedule = report_sections["inspectionSchedule"]
    if not isinstance(inspection_schedule, dict):
        inspection_schedule = {"items": []}
        report_sections["inspectionSchedule"] = inspection_schedule
    inspection_items = inspection_schedule.setdefault("items", [])
    if not isinstance(inspection_items, list):
        inspection_items = []
        inspection_schedule["items"] = inspection_items

    for result in inference_results:
        if result.observation is None and not result.reportTargets and not result.summaryComment:
            continue

        identified_defects.append(
            {
                "ruleId": result.ruleId,
                "issueType": result.issueType,
                "title": result.title or result.message,
                "severity": result.severity,
                "confidence": result.confidence,
                "needsHumanReview": result.needsHumanReview,
                "suggestedCodes": result.suggestedCodes,
                "source": result.source,
            }
        )

        for target in result.reportTargets:
            highlighted_sections.append(
                {
                    "sectionKey": target.sectionKey,
                    "fieldPath": target.fieldPath,
                    "label": result.title or result.message,
                    "reason": target.reason or result.message,
                    "sourceRuleId": result.ruleId,
                }
            )

            if target.sectionKey == "supplyCharacteristicsAndEarthingArrangements" and target.fieldPath == "mainProtectiveBonding.gas.present":
                main_bonding = supply_section.setdefault("mainProtectiveBonding", {})
                if not isinstance(main_bonding, dict):
                    main_bonding = {}
                    supply_section["mainProtectiveBonding"] = main_bonding
                gas_section = main_bonding.setdefault("gas", {})
                if not isinstance(gas_section, dict):
                    gas_section = {}
                    main_bonding["gas"] = gas_section
                gas_section["present"] = target.expectedValue
                gas_section["source"] = "inference"
                gas_section["confidence"] = result.confidence
                gas_section["evidenceRuleId"] = result.ruleId

        if result.observation is not None:
            observations_and_recommendations_items.append(
                {
                    "ruleId": result.ruleId,
                    "title": result.observation.title or result.title or result.message,
                    "suggestedCode": result.observation.code,
                    "comment": result.observation.comment,
                    "classification": result.observation.classification,
                    "confidence": result.confidence,
                    "needsHumanReview": result.needsHumanReview,
                }
            )

            for schedule_item in result.observation.scheduleItems:
                schedule_payload = {
                    "itemKey": schedule_item.itemKey,
                    "description": result.observation.title or result.title or schedule_item.itemKey,
                    "suggestedCode": schedule_item.code,
                    "comment": schedule_item.comment or result.observation.comment,
                    "sourceRuleId": result.ruleId,
                }
                observation_schedule_items.append(schedule_payload)
                inspection_items.append(schedule_payload)

        if result.summaryComment:
            summary_comments.append(result.summaryComment)

    report_sections["summaryComments"] = summary_comments
    primary_code = next(
        (
            code
            for result in inference_results
            for code in result.suggestedCodes
            if code in {"C1", "C2", "C3", "LIM", "NA", "FI"}
        ),
        None,
    )
    if primary_code or summary_comments:
        report_sections["reportSummary"] = {
            "primaryCode": primary_code,
            "comment": summary_comments[0] if summary_comments else None,
        }


def _merge_certificate_context_prefill(
    report_sections: dict[str, object],
    certificate_context: dict[str, object],
) -> None:
    supply_section = report_sections.setdefault("supplyCharacteristicsAndEarthingArrangements", {})
    if not isinstance(supply_section, dict):
        supply_section = {}
        report_sections["supplyCharacteristicsAndEarthingArrangements"] = supply_section

    consumer_unit = certificate_context.get("consumerUnit")
    if isinstance(consumer_unit, dict):
        identification_section = report_sections.setdefault("consumerUnitIdentification", {})
        if not isinstance(identification_section, dict):
            identification_section = {}
            report_sections["consumerUnitIdentification"] = identification_section

        for source_key, target_key in (
            ("brand", "brand"),
            ("model", "model"),
            ("serialNumber", "serialNumber"),
            ("boardType", "boardType"),
        ):
            if consumer_unit.get(source_key) is not None and identification_section.get(target_key) in {None, ""}:
                identification_section[target_key] = consumer_unit.get(source_key)

        protective_devices = report_sections.setdefault("protectiveDevices", {})
        if not isinstance(protective_devices, dict):
            protective_devices = {}
            report_sections["protectiveDevices"] = protective_devices

        for source_key, target_key in (
            ("hasSPD", "hasSPD"),
            ("hasSpd", "hasSPD"),
            ("hasRCD", "hasRCD"),
            ("hasRcdProtection", "hasRCD"),
            ("hasRCBO", "hasRCBO"),
            ("hasRcboProtection", "hasRCBO"),
            ("hasMainSwitch", "hasMainSwitch"),
        ):
            if source_key in consumer_unit and consumer_unit.get(source_key) is not None and target_key not in protective_devices:
                protective_devices[target_key] = consumer_unit.get(source_key)

        consumer_unit_details = report_sections.setdefault("consumerUnitDetails", {})
        if not isinstance(consumer_unit_details, dict):
            consumer_unit_details = {}
            report_sections["consumerUnitDetails"] = consumer_unit_details

        for field_key in ("mainSwitchRating", "incomerRating", "spdType", "rcdType"):
            if consumer_unit.get(field_key) is not None:
                consumer_unit_details[field_key] = consumer_unit.get(field_key)

    measurements = certificate_context.get("measurements")
    if isinstance(measurements, dict) and measurements:
        report_sections["measurements"] = dict(measurements)

    circuits = certificate_context.get("circuits")
    if isinstance(circuits, dict) and circuits:
        report_sections["circuits"] = dict(circuits)

    bonding = certificate_context.get("bonding")
    if isinstance(bonding, dict) and bonding:
        main_bonding = supply_section.setdefault("mainProtectiveBonding", {})
        if not isinstance(main_bonding, dict):
            main_bonding = {}
            supply_section["mainProtectiveBonding"] = main_bonding

        for bond_key in ("gas", "water", "oil", "structuralSteel"):
            bond_value = bonding.get(bond_key)
            if isinstance(bond_value, dict) and bond_value:
                main_bonding[bond_key] = dict(bond_value)

        report_sections["bonding"] = dict(bonding)

    earthing = certificate_context.get("earthing")
    if isinstance(earthing, dict) and earthing:
        earthing_section = supply_section.setdefault("earthing", {})
        if not isinstance(earthing_section, dict):
            earthing_section = {}
            supply_section["earthing"] = earthing_section

        for field_key in ("earthingArrangement", "meansOfEarthing"):
            if earthing.get(field_key) is not None:
                earthing_section[field_key] = earthing.get(field_key)

        earth_electrode = earthing.get("earthElectrode")
        if isinstance(earth_electrode, dict) and earth_electrode:
            earthing_section["earthElectrode"] = dict(earth_electrode)

        report_sections["earthing"] = {
            "earthingArrangement": earthing.get("earthingArrangement"),
            "meansOfEarthing": earthing.get("meansOfEarthing"),
            "earthElectrode": dict(earth_electrode) if isinstance(earth_electrode, dict) else None,
        }


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

    rule_inputs = _build_rule_inputs(hints, consumer_unit)
    certificate_context = payload.certificateContext.model_dump(exclude_none=True) if payload.certificateContext else None
    raw_rule_results = evaluate_rules(
        text_lines=text_lines,
        image_quality=image_quality,
        derived=rule_inputs,
        certificate_context=certificate_context,
    )
    inference_results, issues = _build_inference_results(raw_rule_results)

    if certificate_context:
        report_sections["certificateContext"] = certificate_context
        _merge_certificate_context_prefill(report_sections, certificate_context)
    report_sections["inferenceResults"] = [item.model_dump() for item in inference_results]
    _merge_report_prefill(report_sections, inference_results)
    report_sections["rulePackVersion"] = "v1.0+v1.1-standards+v1.2-curated-domains"

    recommended_codes = ["manual-review"]
    for issue in issues:
        for code in issue.suggestedCodes:
            if code not in recommended_codes:
                recommended_codes.append(code)

    findings = Findings(
        consumerUnit=consumer_unit,
        accessories=[],
        textDetections=text_lines,
        observations=observations,
    )

    prefill = Prefill(
        observations=observations,
        recommendedCodes=recommended_codes,
        reportSections=report_sections,
    )

    summary_bits = [
        "OCR analysis completed",
        f"{len(text_lines)} text lines extracted",
        build_image_quality_summary(image_quality),
    ]
    if consumer_unit is not None:
        summary_bits.append("consumer unit hints extracted")
    if inference_results:
        summary_bits.append(f"{len(inference_results)} inference rules matched")

    return AnalyzeImageResponse(
        success=True,
        summary="; ".join(summary_bits) + ".",
        findings=findings,
        prefill=prefill,
        needsHumanReview=True,
        modelInfo=ModelInfo(
            detector="not-enabled",
            ocr="pytesseract-ocr-v1",
            extractor="ocr-rules-v1.0+standards-v1.1+curated-v1.2",
        ),
        inferenceResults=inference_results,
        issues=issues,
    )
