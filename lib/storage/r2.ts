import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const ALLOWED_CONTENT_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'] as const;

export type R2UploadResult = {
  key: string;
  url: string;
  contentType: string;
};

type AllowedContentType = (typeof ALLOWED_CONTENT_TYPES)[number];

type UploadBinaryInput = {
  key: string;
  body: Buffer | Uint8Array | ArrayBuffer;
  contentType: string;
};

type UploadDataUrlInput = {
  key: string;
  dataUrl: string;
};

let r2Client: S3Client | null = null;

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required R2 environment variable: ${name}`);
  }

  return value;
}

function getR2Config() {
  const accountId = getRequiredEnv('R2_ACCOUNT_ID');
  const accessKeyId = getRequiredEnv('R2_ACCESS_KEY_ID');
  const secretAccessKey = getRequiredEnv('R2_SECRET_ACCESS_KEY');
  const bucket = getRequiredEnv('R2_BUCKET');
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    endpoint,
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, '') ?? '',
  };
}

function getR2Client() {
  if (r2Client) {
    return r2Client;
  }

  const { accessKeyId, secretAccessKey, endpoint } = getR2Config();

  r2Client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return r2Client;
}

function sanitizePathSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'file';
}

function normalizeContentType(contentType: string): AllowedContentType {
  const normalized = contentType.toLowerCase();

  if (!ALLOWED_CONTENT_TYPES.includes(normalized as AllowedContentType)) {
    throw new Error(`Unsupported content type: ${contentType}`);
  }

  return normalized as AllowedContentType;
}

function getExtensionForContentType(contentType: AllowedContentType): string {
  switch (contentType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/jpg':
    case 'image/jpeg':
    default:
      return 'jpg';
  }
}

function buildPublicUrl(key: string): string {
  const { accountId, publicBaseUrl } = getR2Config();

  if (publicBaseUrl) {
    return `${publicBaseUrl}/${key}`;
  }

  return `https://pub-${accountId}.r2.dev/${key}`;
}

function toBuffer(body: Buffer | Uint8Array | ArrayBuffer): Buffer {
  if (Buffer.isBuffer(body)) {
    return body;
  }

  if (body instanceof ArrayBuffer) {
    return Buffer.from(body);
  }

  return Buffer.from(body);
}

function parseDataUrl(dataUrl: string): { contentType: AllowedContentType; buffer: Buffer } {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=]+)$/i);

  if (!match) {
    throw new Error('Invalid image data URL.');
  }

  const contentType = normalizeContentType(match[1]);
  const buffer = Buffer.from(match[2], 'base64');

  return { contentType, buffer };
}

export function buildUserAssetKey(userId: number | string, kind: 'avatar' | 'signature', contentType: string): string {
  const normalizedContentType = normalizeContentType(contentType);
  const extension = getExtensionForContentType(normalizedContentType);

  return `users/${sanitizePathSegment(String(userId))}/${kind}/${kind}.${extension}`;
}

export function buildCertificateAssetKey(input: {
  teamId: number | string;
  certificateNumber: string;
  filename?: string;
  contentType: string;
}): string {
  const normalizedContentType = normalizeContentType(input.contentType);
  const extension = getExtensionForContentType(normalizedContentType);
  const filenameBase = input.filename ? sanitizePathSegment(input.filename) : `upload.${extension}`;
  const normalizedFilename = filenameBase.includes('.') ? filenameBase : `${filenameBase}.${extension}`;

  return `certificates/${sanitizePathSegment(String(input.teamId))}/${sanitizePathSegment(input.certificateNumber)}/${normalizedFilename}`;
}

export async function uploadToR2({ key, body, contentType }: UploadBinaryInput): Promise<R2UploadResult> {
  const normalizedContentType = normalizeContentType(contentType);
  const client = getR2Client();
  const { bucket } = getR2Config();

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: toBuffer(body),
    ContentType: normalizedContentType,
  }));

  return {
    key,
    url: buildPublicUrl(key),
    contentType: normalizedContentType,
  };
}

export async function uploadDataUrlToR2({ key, dataUrl }: UploadDataUrlInput): Promise<R2UploadResult> {
  const { contentType, buffer } = parseDataUrl(dataUrl);

  return uploadToR2({
    key,
    body: buffer,
    contentType,
  });
}

export async function uploadBufferToR2(input: UploadBinaryInput): Promise<R2UploadResult> {
  return uploadToR2(input);
}
