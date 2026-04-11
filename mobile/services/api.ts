import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import type {
  MobileCertificateEditorRecord,
  UpdateMobileCertificateInput,
} from '@/components/certificate-editor';

const TOKEN_KEY = 'mobile_auth_token';

// Base URL for the deployed web API (Vercel) or a local tunnel in development.
// Prefer Expo config extra.apiUrl because Expo env vars are not always injected into
// native/device builds the same way they are in local dev. Fall back to EXPO_PUBLIC_API_URL.
const configuredBaseUrl =
  Constants.expoConfig?.extra?.apiUrl ??
  process.env.EXPO_PUBLIC_API_URL ??
  'https://ai-certificates.app';

const BASE_URL = configuredBaseUrl.replace(/\/+$/, '');

const configuredAiWorkerUrl =
  Constants.expoConfig?.extra?.aiWorkerUrl ??
  process.env.EXPO_PUBLIC_AI_WORKER_URL ??
  'https://ai-worker-production-b025.up.railway.app';

const AI_WORKER_URL = configuredAiWorkerUrl.replace(/\/+$/, '');

export async function saveToken(token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function deleteToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return fetch(`${BASE_URL}${path}`, { ...init, headers });
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    email: string;
    name: string;
    teamId: number;
  };
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${BASE_URL}/api/auth/mobile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Login failed');
  }
  return res.json();
}

// ── Customers ─────────────────────────────────────────────────────────────────

export interface Customer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  postcode: string | null;
  contactPerson: string | null;
}

export async function listCustomers(): Promise<Customer[]> {
  const res = await authFetch('/api/mobile/customers');
  if (!res.ok) throw new Error('Failed to fetch customers');
  const data = await res.json();
  return Array.isArray(data) ? data : data.customers ?? [];
}

export interface CreateCustomerInput {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  postcode?: string;
  contactPerson?: string;
}

export async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  const res = await authFetch('/api/mobile/customers', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Failed to create customer');
  }
  const data = await res.json();
  return data.customer ?? data;
}

// ── Image Analysis ────────────────────────────────────────────────────────────

export type CaptureMode = 'consumer_unit' | 'circuit_label';

export interface AnalysisConsumerUnit {
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  condition?: string | null;
  confidence?: number | null;
  bbox?: number[] | null;
  [key: string]: unknown;
}

export interface AnalysisPrefill {
  observations?: string[];
  recommendedCodes?: string[];
  reportSections?: Record<string, unknown>;
}

export interface AnalysisModelInfo {
  detector?: string | null;
  ocr?: string | null;
  extractor?: string | null;
}

export interface AnalysisResult {
  success?: boolean;
  summary?: string | null;
  consumerUnit?: AnalysisConsumerUnit | null;
  textDetections?: string[];
  observations?: string[];
  prefill?: AnalysisPrefill | null;
  modelInfo?: AnalysisModelInfo | null;
  needsHumanReview?: boolean;
  rawText?: string;
  circuits?: never[];
  mainSwitchRating?: string | null;
  numberOfCircuits?: number | null;
  earthingArrangement?: string | null;
  voltage?: string | null;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof FileReader !== 'undefined') {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
          return;
        }

        reject(new Error('Unable to convert image to base64 data URL'));
      };
      reader.onerror = () => reject(reader.error ?? new Error('Unable to read image file'));
      reader.readAsDataURL(blob);
      return;
    }

    reject(new Error('FileReader is not available on this device'));
  });
}

async function imageUriToDataUrl(imageUri: string): Promise<string> {
  const response = await fetch(imageUri);

  if (!response.ok) {
    throw new Error('Unable to read captured image');
  }

  const blob = await response.blob();
  return blobToDataUrl(blob);
}

function buildAnalysisResult(data: any): AnalysisResult {
  const findings = data?.findings ?? {};
  const consumerUnit = findings?.consumerUnit ?? null;
  const textDetections = Array.isArray(findings?.textDetections) ? findings.textDetections : [];
  const observations = Array.isArray(findings?.observations) ? findings.observations : [];
  const rawText =
    typeof data?.rawText === 'string'
      ? data.rawText
      : textDetections
          .filter((text: unknown): text is string => typeof text === 'string' && text.length > 0)
          .join('\n');

  return {
    success: Boolean(data?.success),
    summary: typeof data?.summary === 'string' ? data.summary : null,
    consumerUnit,
    textDetections,
    observations,
    prefill: data?.prefill ?? null,
    modelInfo: data?.modelInfo ?? null,
    needsHumanReview: Boolean(data?.needsHumanReview),
    rawText,
    circuits: [],
    mainSwitchRating: null,
    numberOfCircuits: null,
    earthingArrangement: null,
    voltage: null,
  };
}

export async function analyseImage(
  imageUri: string,
  mode: CaptureMode = 'consumer_unit',
): Promise<AnalysisResult> {
  const imageBase64 = await imageUriToDataUrl(imageUri);
  const reportType = 'electrical_installation_condition_report';
  const inspectionType = mode === 'consumer_unit' ? 'consumer_unit' : 'circuit_label';
  const requestedSections =
    mode === 'consumer_unit'
      ? ['consumer_unit_details', 'observations', 'supply_characteristics']
      : ['circuit_details', 'observations'];

  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${AI_WORKER_URL}/analyze-image`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      imageBase64,
      reportType,
      inspectionType,
      requestedSections,
      metadata: {
        source: 'expo-mobile-app',
        captureMode: mode,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? body.message ?? 'Image analysis failed');
  }

  const data = await res.json();
  return buildAnalysisResult(data);
}

// ── Uploads ───────────────────────────────────────────────────────────────────

export interface MobileUploadResult {
  key: string;
  url: string;
  contentType: string;
}

export interface MobileUploadInput {
  imageUri: string;
  category: 'certificate-photo' | 'user-asset';
  certificateNumber?: string;
  label?: string | null;
  type?: string | null;
  slotIndex?: number | null;
  fileName?: string;
  contentType?: string;
}

export async function uploadMobileImage(
  input: MobileUploadInput,
): Promise<MobileUploadResult> {
  const token = await getToken();
  const formData = new FormData();

  formData.append('file', {
    uri: input.imageUri,
    name: input.fileName ?? 'photo.jpg',
    type: input.contentType ?? 'image/jpeg',
  } as unknown as Blob);
  formData.append('category', input.category);

  if (input.certificateNumber) {
    formData.append('certificateNumber', input.certificateNumber);
  }
  if (input.label) {
    formData.append('label', input.label);
  }
  if (input.type) {
    formData.append('type', input.type);
  }
  if (typeof input.slotIndex === 'number') {
    formData.append('slotIndex', String(input.slotIndex));
  }

  const res = await fetch(`${BASE_URL}/api/mobile/uploads`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Image upload failed');
  }

  return res.json();
}

// ── Certificates ──────────────────────────────────────────────────────────────

export interface DraftCertificateInput {
  customerId: number;
  siteAddress: string;
  inspectionDate: string; // ISO date string
  formData?: Record<string, unknown>;
}

export interface DraftCertificate {
  id: number;
  certificateNumber: string;
  status: string;
}

export async function createDraftCertificate(
  input: DraftCertificateInput,
): Promise<DraftCertificate> {
  const res = await authFetch('/api/mobile/certificates/draft', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Failed to create certificate');
  }
  return res.json();
}

export async function getMobileCertificate(
  certificateId: number,
): Promise<MobileCertificateEditorRecord> {
  const res = await authFetch(`/api/mobile/certificates/${certificateId}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Failed to load certificate');
  }
  return res.json();
}

export async function updateMobileCertificate(
  certificateId: number,
  input: UpdateMobileCertificateInput,
): Promise<MobileCertificateEditorRecord> {
  const res = await authFetch(`/api/mobile/certificates/${certificateId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Failed to update certificate');
  }
  return res.json();
}
