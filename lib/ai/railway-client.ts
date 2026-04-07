export interface AnalyzeImageRequest {
  imageUrl?: string;
  imageBase64?: string;
  reportType?: string;
  inspectionType?: string;
  requestedSections?: string[];
  metadata?: Record<string, unknown>;
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

export interface AnalyzeImagePrefill {
  observations?: string[];
  recommendedCodes?: string[];
  reportSections?: Record<string, unknown>;
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
  const baseUrl = process.env.RAILWAY_AI_WORKER_URL;

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
