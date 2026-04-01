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

export interface CircuitInfo {
  circuitNumber: number;
  description: string;
  rating: string;
  type: string;
}

export interface AnalysisResult {
  mainSwitchRating: string;
  numberOfCircuits: number;
  earthingArrangement: string;
  voltage: string;
  circuits: CircuitInfo[];
  rawText: string;
}

export async function analyseImage(
  imageUri: string,
  mode: 'consumer_unit' | 'circuit_label' = 'consumer_unit',
): Promise<AnalysisResult> {
  const token = await getToken();
  const formData = new FormData();

  // React Native FormData accepts file objects via { uri, name, type }
  formData.append('image', {
    uri: imageUri,
    name: 'photo.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);
  formData.append('mode', mode);

  const res = await fetch(`${BASE_URL}/api/mobile/analyse-image`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Image analysis failed');
  }
  return res.json();
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