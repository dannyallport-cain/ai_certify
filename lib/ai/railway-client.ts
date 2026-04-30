export interface AnalyzeImageCertificateEarthElectrodeContext {
  present?: boolean | null;
  accessible?: boolean | null;
  resistance?: number | null;
  location?: string | null;
  type?: string | null;
}

export interface AnalyzeImageCertificateEarthingContext {
  earthingArrangement?: string | null;
  meansOfEarthing?: string | null;
  earthElectrode?: AnalyzeImageCertificateEarthElectrodeContext | null;
}

export interface AnalyzeImageCertificateContext {
  earthing?: AnalyzeImageCertificateEarthingContext | null;
  [key: string]: unknown;
}

export interface AnalyzeImageRequest {
  imageUrl?: string;
  imageBase64?: string;
  reportType?: string;
  inspectionType?: string;
  requestedSections?: string[];
  metadata?: Record<string, unknown>;
  certificateContext?: AnalyzeImageCertificateContext;
}

export interface AnalyzeImageAccessoryFinding {
  type: string;
  condition: string;
  confidence: number;
  bbox?: number[];
}

export interface AnalyzeImageConsumerUnitFinding {
  brand?: string;
  model?: string;
  serialNumber?: string;
  condition?: string;
  confidence?: number;
  bbox?: number[];
  [key: string]: unknown;
}

export interface AnalyzeImageFindings {
  consumerUnit?: AnalyzeImageConsumerUnitFinding;
  accessories: AnalyzeImageAccessoryFinding[];
  textDetections: string[];
  observations: string[];
}

export interface AnalyzeImageIdentifiedDefect {
  item?: string;
  description?: string;
  code?: string;
  classification?: string;
  confidence?: number;
  sourceText?: string;
  [key: string]: unknown;
}

export interface AnalyzeImageHighlightedSection {
  section?: string;
  title?: string;
  content?: string;
  reason?: string;
  confidence?: number;
  [key: string]: unknown;
}

export interface AnalyzeImageScheduleItem {
  item?: string;
  description?: string;
  result?: string;
  outcome?: string;
  code?: string;
  classification?: string;
  comments?: string;
  confidence?: number;
  [key: string]: unknown;
}

export interface AnalyzeImageObservationRecommendation {
  observation?: string;
  recommendation?: string;
  code?: string;
  classification?: string;
  confidence?: number;
  [key: string]: unknown;
}

export interface AnalyzeImageSummaryComment {
  title?: string;
  comment?: string;
  text?: string;
  confidence?: number;
  [key: string]: unknown;
}

export interface AnalyzeImageMainProtectiveBondingGas {
  present?: boolean | null;
  [key: string]: unknown;
}

export interface AnalyzeImageMainProtectiveBonding {
  gas?: AnalyzeImageMainProtectiveBondingGas;
  [key: string]: unknown;
}

export interface AnalyzeImageSupplyCharacteristicsAndEarthingArrangements {
  mainProtectiveBonding?: AnalyzeImageMainProtectiveBonding;
  [key: string]: unknown;
}

export interface AnalyzeImageReportSections {
  identifiedDefects?: AnalyzeImageIdentifiedDefect[];
  highlightedSections?: AnalyzeImageHighlightedSection[];
  observationSchedule?: { items: AnalyzeImageScheduleItem[] };
  inspectionSchedule?: { items: AnalyzeImageScheduleItem[] };
  observationsAndRecommendations?: { items: AnalyzeImageObservationRecommendation[] };
  summaryOfCondition?: { comments: Array<string | AnalyzeImageSummaryComment> };
  reportSummary?: string | Record<string, unknown>;
  supplyCharacteristicsAndEarthingArrangements?: AnalyzeImageSupplyCharacteristicsAndEarthingArrangements;
  [key: string]: unknown;
}

export interface AnalyzeImagePrefill {
  observations?: string[];
  recommendedCodes?: string[];
  reportSections?: AnalyzeImageReportSections;
}

export interface AnalyzeImageModelInfo {
  detector: string;
  ocr: string;
  extractor: string;
}

export interface AnalyzeImageResponse {
  success: boolean;
  summary: string;
  findings: AnalyzeImageFindings;
  prefill: AnalyzeImagePrefill;
  needsHumanReview: boolean;
  modelInfo: AnalyzeImageModelInfo;
}

function getWorkerBaseUrl(): string {
  const baseUrl =
    process.env.RAILWAY_AI_WORKER_URL ??
    (process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:8000');

  if (!baseUrl) {
    throw new Error('RAILWAY_AI_WORKER_URL is not configured');
  }

  return baseUrl.replace(/\/+$/, '');
}

export async function analyzeImageWithRailwayWorker(
  payload: AnalyzeImageRequest,
): Promise<AnalyzeImageResponse> {
  const response = await fetch(`${getWorkerBaseUrl()}/analyze-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const data = (await response.json()) as AnalyzeImageResponse;

  if (!response.ok) {
    throw new Error(
      `Railway AI worker request failed with status ${response.status}`,
    );
  }

  return data;
}
