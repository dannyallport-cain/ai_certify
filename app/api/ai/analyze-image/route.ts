import { NextResponse } from 'next/server';

import { performOCR } from '@/lib/ocr';
import { createOpenRouterClient } from '@/lib/openrouter';
import { evaluateRules } from '@/lib/rules-engine';
import { extractConsumerUnitHints, buildImageQualitySummary } from '@/lib/extractors';

interface AnalyzeImageRequest {
  imageUrl?: string;
  imageBase64?: string;
  reportType?: string;
  inspectionType?: string;
  requestedSections?: string[];
  metadata?: Record<string, unknown>;
  certificateContext?: any;
}

function buildTextDetections(textLines: string[]): string[] {
  return textLines.filter(line => line.trim().length > 0);
}

function buildReportSections(
  hints: any,
  textLines: string[],
  requestedSections?: string[]
): Record<string, any> {
  const sections: Record<string, any> = {
    imageQuality: {},
    imageQualitySummary: '',
    requestedSections: requestedSections || [],
    inspectionType: null,
    reportType: null,
  };

  // Add basic sections based on hints
  if (hints.brand || hints.modelCandidates?.length > 0) {
    sections.consumerUnitIdentification = {
      brand: hints.brand,
      model: hints.modelCandidates?.[0],
      serialNumber: hints.serialNumberCandidates?.[0],
    };
  }

  if (hints.hasMainSwitchHint || hints.hasRCDHint || hints.hasRCBOHint) {
    sections.protectiveDevices = {
      hasMainSwitch: hints.hasMainSwitchHint,
      hasRCD: hints.hasRCDHint,
      hasRCBO: hints.hasRCBOHint,
    };
  }

  return sections;
}

function mergeReportPrefill(
  reportSections: Record<string, any>,
  ruleResults: any[]
): void {
  const identifiedDefects: any[] = [];
  const highlightedSections: any[] = [];
  const observationScheduleItems: any[] = [];
  const observationsAndRecommendationsItems: any[] = [];
  const summaryComments: string[] = [];

  reportSections.identifiedDefects = identifiedDefects;
  reportSections.highlightedSections = highlightedSections;
  reportSections.observationSchedule = { items: observationScheduleItems };
  reportSections.observationsAndRecommendations = { items: observationsAndRecommendationsItems };
  reportSections.summaryOfCondition = { comments: summaryComments };
  reportSections.inspectionSchedule = { items: [] };
  reportSections.supplyCharacteristicsAndEarthingArrangements = {};
  reportSections.reportSummary = {};

  const inspectionItems = reportSections.inspectionSchedule.items;

  for (const result of ruleResults) {
    if (!result.observation && !result.reportTargets && !result.summaryComment) {
      continue;
    }

    identifiedDefects.push({
      ruleId: result.ruleId,
      issueType: result.issueType,
      title: result.title || result.message,
      severity: result.severity,
      confidence: result.confidence,
      needsHumanReview: result.needsHumanReview,
      suggestedCodes: result.suggestedCodes,
      source: result.source,
    });

    for (const target of result.reportTargets) {
      highlightedSections.push({
        sectionKey: target.sectionKey,
        fieldPath: target.fieldPath,
        label: result.title || result.message,
        reason: target.reason || result.message,
        sourceRuleId: result.ruleId,
      });
    }

    if (result.observation) {
      observationsAndRecommendationsItems.push({
        ruleId: result.ruleId,
        title: result.observation.title || result.title || result.message,
        suggestedCode: result.observation.code,
        comment: result.observation.comment,
        classification: result.observation.classification,
        confidence: result.confidence,
        needsHumanReview: result.needsHumanReview,
      });

      for (const scheduleItem of result.observation.scheduleItems || []) {
        const schedulePayload = {
          itemKey: scheduleItem.itemKey,
          description: result.observation.title || result.title || scheduleItem.itemKey,
          suggestedCode: scheduleItem.code,
          comment: scheduleItem.comment || result.observation.comment,
          sourceRuleId: result.ruleId,
        };
        observationScheduleItems.push(schedulePayload);
        inspectionItems.push(schedulePayload);
      }
    }

    if (result.summaryComment) {
      summaryComments.push(result.summaryComment);
    }
  }

  reportSections.summaryComments = summaryComments;

  const primaryCode = ruleResults
    .flatMap(result => result.suggestedCodes)
    .find(code => ['C1', 'C2', 'C3', 'LIM', 'NA', 'FI'].includes(code));

  if (primaryCode || summaryComments.length > 0) {
    reportSections.reportSummary = {
      primaryCode,
      comment: summaryComments[0],
    };
  }
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid JSON request body',
      },
      { status: 400 },
    );
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid analyze image request payload',
      },
      { status: 400 },
    );
  }

  const payload = body as AnalyzeImageRequest;

  if (!payload.imageBase64 && !payload.imageUrl) {
    return NextResponse.json(
      {
        success: false,
        error: 'Either imageBase64 or imageUrl is required',
      },
      { status: 400 },
    );
  }

  try {
    // Perform OCR
    const ocrResult = await performOCR(payload.imageBase64!);
    const textLines = buildTextDetections(ocrResult.textLines);
    const imageQuality = ocrResult.imageQuality;

    // Extract hints
    const hints = extractConsumerUnitHints(textLines);

    // Build consumer unit
    const consumerUnit = ocrResult.imageLoaded ? {
      brand: hints.brand,
      model: hints.modelCandidates?.[0],
      serialNumber: hints.serialNumberCandidates?.[0],
      condition: 'text-derived',
      confidence: Math.min(0.95, (hints.brand ? 0.3 : 0) + (hints.modelCandidates?.length ? 0.3 : 0) + (hints.serialNumberCandidates?.length ? 0.2 : 0) + (ocrResult.imageLoaded ? 0.2 : 0)),
    } : null;

    // Build rule inputs
    const ruleInputs = {
      consumerUnit: {
        brand: consumerUnit?.brand || hints.brand,
        model: consumerUnit?.model || hints.modelCandidates?.[0],
        serialNumber: consumerUnit?.serialNumber || hints.serialNumberCandidates?.[0],
        boardType: hints.boardTypeHint,
        hasMainSwitch: hints.hasMainSwitchHint,
        hasRCD: hints.hasRCDHint,
        hasRCBO: hints.hasRCBOHint,
        hasSPD: hints.hasSPDHint,
        hasMCB: hints.hasMCBHint,
        modelCandidates: hints.modelCandidates || [],
        serialNumberCandidates: hints.serialNumberCandidates || [],
        reviewNotes: hints.reviewNotes || [],
        observations: hints.observations || [],
      }
    };

    // Evaluate rules
    const ruleResults = evaluateRules(
      textLines,
      imageQuality,
      ruleInputs,
      payload.certificateContext
    );

    // Build report sections
    const reportSections = buildReportSections(hints, textLines, payload.requestedSections);
    reportSections.imageQuality = imageQuality;
    reportSections.imageQualitySummary = buildImageQualitySummary(imageQuality);
    reportSections.requestedSections = payload.requestedSections;
    reportSections.inspectionType = payload.inspectionType;
    reportSections.reportType = payload.reportType;

    if (payload.metadata) {
      reportSections.metadataEcho = payload.metadata;
    }

    // Build observations
    const observations = [...(hints.observations || [])];

    if (!ocrResult.imageLoaded) {
      observations.unshift("Image could not be loaded for OCR analysis.");
    }
    if (!textLines.length) {
      observations.push("No OCR text was extracted from the image.");
    }
    if (payload.requestedSections?.length) {
      observations.push("Requested sections were considered during report prefill.");
    }
    if (payload.reportType) {
      observations.push(`Report type context: ${payload.reportType}.`);
    }
    if (payload.inspectionType) {
      observations.push(`Inspection type context: ${payload.inspectionType}.`);
    }

    // Try OpenRouter analysis
    let llmResult: { summary?: string; observations: string[]; recommendedCodes: string[] } | null = null;
    try {
      const openRouter = createOpenRouterClient();
      llmResult = await openRouter.analyzeImageContent(
        'Analyze this electrical inspection image data',
        textLines,
        imageQuality,
        hints,
        payload.certificateContext
      );

      // Merge LLM results
      for (const obs of llmResult.observations) {
        if (!observations.includes(obs)) {
          observations.push(obs);
        }
      }
    } catch (error) {
      console.error('OpenRouter analysis failed:', error);
    }

    // Merge rule results into report sections
    mergeReportPrefill(reportSections, ruleResults);

    if (payload.certificateContext) {
      reportSections.certificateContext = payload.certificateContext;
    }

    reportSections.inferenceResults = ruleResults.map(result => ({ ...result }));
    reportSections.rulePackVersion = "v1.0+v1.1-standards+v1.2-curated-domains";

    // Collect recommended codes
    const recommendedCodes = ['manual-review'];
    for (const result of ruleResults) {
      for (const code of result.suggestedCodes) {
        if (!recommendedCodes.includes(code)) {
          recommendedCodes.push(code);
        }
      }
    }

    if (llmResult) {
      for (const code of llmResult.recommendedCodes) {
        if (!recommendedCodes.includes(code)) {
          recommendedCodes.push(code);
        }
      }
    }

    // Build response
    const summaryBits = [
      "OCR analysis completed",
      ` ${textLines.length} text lines extracted`,
      buildImageQualitySummary(imageQuality),
    ];

    if (consumerUnit) {
      summaryBits.push("consumer unit hints extracted");
    }

    if (ruleResults.length > 0) {
      summaryBits.push(` ${ruleResults.length} inference rules matched`);
    }

    if (llmResult?.summary) {
      summaryBits.push(`llm: ${llmResult.summary}`);
    }

    const response = {
      success: true,
      summary: summaryBits.join("; ") + ".",
      findings: {
        consumerUnit,
        accessories: [],
        textDetections: textLines,
        observations,
      },
      prefill: {
        observations,
        recommendedCodes,
        reportSections,
      },
      needsHumanReview: true,
      modelInfo: {
        detector: "not-enabled",
        ocr: "tesseract.js-v1",
        extractor: "ocr-rules-v1.0+standards-v1.1+curated-v1.2",
        localLlm: {
          provider: "openrouter",
          enabled: true,
          baseUrl: "https://openrouter.ai/api/v1",
          model: process.env.OPENROUTER_MODEL || "anthropic/claude-3-haiku",
          apiStyle: "openai-compatible",
          source: "openrouter-direct",
          status: "configured",
          detail: "OpenRouter integration for AI analysis.",
        },
      },
      inferenceResults: ruleResults,
      issues: ruleResults,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error analyzing image:', error);

    const message = error instanceof Error ? error.message : 'Failed to analyze image';
    const status = message.includes('OpenRouter') || message.includes('OCR') ? 502 : 500;

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status },
    );
  }
}
