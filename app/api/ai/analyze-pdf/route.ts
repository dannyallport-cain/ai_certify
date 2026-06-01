import { NextRequest, NextResponse } from 'next/server';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

export const runtime = 'nodejs';

interface AnalyzePdfRequest {
  pdfBase64?: string;
  reportType?: string;
  inspectionType?: string;
  requestedSections?: string[];
  metadata?: Record<string, unknown>;
}

type AnalyzePdfResponse = {
  success: boolean;
  summary?: string;
  findings?: {
    textDetections: string[];
    observations: string[];
  };
  prefill?: {
    observations: string[];
    recommendedCodes: string[];
    reportSections: Record<string, any>;
  };
  needsHumanReview?: boolean;
  error?: string;
};

function parsePdfTextToLines(text: string): string[] {
  return text
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2000);
}

function inferObservationCode(line: string): 'C1' | 'C2' | 'C3' | 'FI' {
  const upper = line.toUpperCase();

  if (upper.includes('C1')) return 'C1';
  if (upper.includes('C2')) return 'C2';
  if (upper.includes('FI') || upper.includes('FURTHER INVESTIGATION')) return 'FI';
  return 'C3';
}

function buildReportSectionsFromText(
  textLines: string[],
  requestedSections?: string[],
  reportType?: string,
  inspectionType?: string,
  metadata?: Record<string, unknown>,
) {
  const joined = textLines.join(' ').toLowerCase();

  const observationsAndRecommendationsItems = textLines
    .filter((line) => /(c1|c2|c3|fi|danger|unsatisfactory|further investigation)/i.test(line))
    .slice(0, 50)
    .map((line, index) => {
      const code = inferObservationCode(line);
      return {
        ruleId: `pdf-line-${index + 1}`,
        observation: line,
        recommendation: '',
        code,
        classification: 'text-inference',
        confidence: 0.55,
        needsHumanReview: true,
      };
    });

  const inspectionScheduleItems = textLines
    .filter((line) => /\b\d+(?:\.\d+)+\b/.test(line))
    .slice(0, 50)
    .map((line, index) => {
      const match = line.match(/\b\d+(?:\.\d+)+\b/);
      return {
        item: match?.[0] || `item-${index + 1}`,
        description: line,
        comment: line,
        outcome: inferObservationCode(line),
      };
    });

  const reportSections: Record<string, any> = {
    requestedSections: requestedSections || [],
    inspectionType: inspectionType || null,
    reportType: reportType || null,
    source: 'pdf-text',
    reportSummary: {
      primaryCode: observationsAndRecommendationsItems[0]?.code || null,
      comment:
        observationsAndRecommendationsItems[0]?.observation ||
        'PDF text extracted. Review and confirm mapped observations.',
    },
    observationsAndRecommendations: {
      items: observationsAndRecommendationsItems,
    },
    observationSchedule: {
      items: observationsAndRecommendationsItems.map((item) => ({
        itemKey: item.ruleId,
        item: item.ruleId,
        description: item.observation,
        code: item.code,
        comment: item.recommendation || item.observation,
      })),
    },
    inspectionSchedule: {
      items: inspectionScheduleItems,
    },
    identifiedDefects: [],
    highlightedSections: [],
    summaryOfCondition: {
      comments: [
        joined.includes('unsatisfactory')
          ? 'The extracted document includes unsatisfactory wording and requires manual review.'
          : 'PDF text extracted successfully. Confirm mapped fields before issuing.',
      ],
    },
  };

  if (metadata) {
    reportSections.metadataEcho = metadata;
  }

  return reportSections;
}

function decodeBase64Pdf(pdfBase64: string): Buffer {
  const base64Payload = pdfBase64.includes(',')
    ? pdfBase64.split(',').pop() || ''
    : pdfBase64;

  return Buffer.from(base64Payload, 'base64');
}

export async function POST(request: NextRequest) {
  let body: AnalyzePdfRequest;

  try {
    body = (await request.json()) as AnalyzePdfRequest;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid JSON request body',
      } satisfies AnalyzePdfResponse,
      { status: 400 },
    );
  }

  if (!body?.pdfBase64) {
    return NextResponse.json(
      {
        success: false,
        error: 'pdfBase64 is required',
      } satisfies AnalyzePdfResponse,
      { status: 400 },
    );
  }

  try {
    const buffer = decodeBase64Pdf(body.pdfBase64);
    const pdfParse = require('pdf-parse');
    const parsed = await pdfParse(buffer);

    const text = typeof parsed?.text === 'string' ? parsed.text : '';
    const textLines = parsePdfTextToLines(text);

    if (textLines.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No text could be extracted from the uploaded PDF.',
        } satisfies AnalyzePdfResponse,
        { status: 422 },
      );
    }

    const observations = textLines
      .filter((line) => /(c1|c2|c3|fi|danger|unsatisfactory|further investigation)/i.test(line))
      .slice(0, 50);

    const recommendedCodes = ['manual-review', ...new Set(observations.map((line) => inferObservationCode(line)))];

    const reportSections = buildReportSectionsFromText(
      textLines,
      body.requestedSections,
      body.reportType,
      body.inspectionType,
      body.metadata,
    );

    return NextResponse.json(
      {
        success: true,
        summary: `PDF analysis completed; ${textLines.length} text lines extracted from ${parsed?.numpages ?? 1} page(s).`,
        findings: {
          textDetections: textLines,
          observations,
        },
        prefill: {
          observations,
          recommendedCodes,
          reportSections,
        },
        needsHumanReview: true,
      } satisfies AnalyzePdfResponse,
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze PDF',
      } satisfies AnalyzePdfResponse,
      { status: 500 },
    );
  }
}
