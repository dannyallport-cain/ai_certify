import { NextRequest, NextResponse } from 'next/server';
import { DocumentAnalysisClient, AzureKeyCredential } from '@azure/ai-form-recognizer';
import { getUser } from '@/lib/db/queries';

export const runtime = 'nodejs';

/**
 * POST /api/admin/report-disseminator/azure-analyze
 * Sends a PDF to Azure Document Intelligence (Form Recognizer)
 * using the `prebuilt-layout` model which returns key-value pairs,
 * tables and bounding boxes without any custom training.
 *
 * Requires env vars:
 *   AZURE_FORM_RECOGNIZER_ENDPOINT  e.g. https://<name>.cognitiveservices.azure.com
 *   AZURE_FORM_RECOGNIZER_KEY       e.g. abc123...
 *
 * Body: multipart/form-data { file: PDF }
 * Response: { fields: Array<{ key, value, boundingBox, pageNumber }> }
 */
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['supersystemAdmin', 'systemAdmin', 'owner'].includes(user.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const endpoint = process.env.AZURE_FORM_RECOGNIZER_ENDPOINT;
  const apiKey = process.env.AZURE_FORM_RECOGNIZER_KEY;

  if (!endpoint || !apiKey) {
    return NextResponse.json(
      {
        error: 'Azure Document Intelligence is not configured.',
        hint: 'Set AZURE_FORM_RECOGNIZER_ENDPOINT and AZURE_FORM_RECOGNIZER_KEY environment variables.',
      },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
    console.log('🔵 [azure-analyze] FormData received, entries:');
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`   - ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
      } else {
        console.log(`   - ${key}: ${String(value).slice(0, 50)}`);
      }
    }
  } catch {
    console.error('🔴 [azure-analyze] Could not parse multipart body');
    return NextResponse.json({ error: 'Could not parse multipart body' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  console.log('🔵 [azure-analyze] file extracted:', file ? `File(${file.name}, ${file.size} bytes, ${file.type})` : 'null/undefined');
  
  if (!file || file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'A PDF file is required' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  console.log('🔵 [azure-analyze] arrayBuffer read:', bytes.byteLength, 'bytes');

  const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(apiKey));

  let poller;
  try {
    // analyzeDocument can accept a Uint8Array / Buffer
    poller = await client.beginAnalyzeDocument('prebuilt-layout', Buffer.from(bytes), {
      contentType: 'application/pdf',
    });
  } catch (e: any) {
    return NextResponse.json({ error: `Azure analysis failed: ${e.message}` }, { status: 500 });
  }

  const result = await poller.pollUntilDone();

  console.log('🔵 [azure-analyze] keyValuePairs:', result.keyValuePairs?.length ?? 0);
  console.log('🔵 [azure-analyze] paragraphs:', result.paragraphs?.length ?? 0);
  console.log('🔵 [azure-analyze] pages:', result.pages?.length ?? 0);
  console.log('🔵 [azure-analyze] tables:', result.tables?.length ?? 0);

  const fields: Array<{
    id: string;
    key: string;
    value: string | null;
    pageNumber: number;
    boundingBox: number[] | null;
    fieldType: string;
  }> = [];

  // Strategy 1: key-value pairs (works for fillable PDFs) - run across all pages
  for (const kvp of result.keyValuePairs ?? []) {
    const key = kvp.key?.content ?? '';
    const value = kvp.value?.content ?? null;
    if (!key.trim()) continue;
    const pageNumber = kvp.key?.boundingRegions?.[0]?.pageNumber ?? 1;
    const rawBox = kvp.key?.boundingRegions?.[0]?.polygon;
    const boundingBox = rawBox ? rawBox.map((p: any) => [p.x, p.y]).flat() : null;
    fields.push({ id: crypto.randomUUID(), key, value, pageNumber, boundingBox, fieldType: guessFieldType(key) });
  }
  console.log('🔵 [azure-analyze] After strategy 1 (key-value pairs):', fields.length, 'fields');

  // Strategy 2: paragraphs ending with ":" - run across ALL pages regardless of strategy 1 results
  for (const para of result.paragraphs ?? []) {
    const text = (para.content ?? '').trim();
    if (!text || text.length < 2 || text.length > 100) continue;
    if (/:\s*$/.test(text)) {
      const key = text.replace(/:\s*$/, '').trim();
      if (key.length < 2) continue;
      const pageNumber = para.boundingRegions?.[0]?.pageNumber ?? 1;
      const rawBox = para.boundingRegions?.[0]?.polygon;
      const boundingBox = rawBox ? rawBox.map((p: any) => [p.x, p.y]).flat() : null;
      fields.push({ id: crypto.randomUUID(), key, value: null, pageNumber, boundingBox, fieldType: guessFieldType(key) });
    }
  }
  console.log('🔵 [azure-analyze] After strategy 2 (paragraphs):', fields.length, 'fields');

  // Strategy 3: individual page lines ending with ":" - run across ALL pages
  for (const page of result.pages ?? []) {
    const pageNumber = page.pageNumber ?? 1;
    for (const line of page.lines ?? []) {
      const text = (line.content ?? '').trim();
      if (!text || text.length < 2 || text.length > 100) continue;
      if (/:\s*$/.test(text)) {
        const key = text.replace(/:\s*$/, '').trim();
        if (key.length < 2) continue;
        const rawBox = line.polygon;
        const boundingBox = rawBox ? rawBox.map((p: any) => [p.x, p.y]).flat() : null;
        fields.push({ id: crypto.randomUUID(), key, value: null, pageNumber, boundingBox, fieldType: guessFieldType(key) });
      }
    }
  }
  console.log('🔵 [azure-analyze] After strategy 3 (page lines):', fields.length, 'fields');

  // Deduplicate by label (case-insensitive), keeping the first occurrence
  const seen = new Set<string>();
  const uniqueFields = fields.filter((f) => {
    const lower = f.key.toLowerCase().trim();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });
  console.log('🔵 [azure-analyze] After deduplication:', uniqueFields.length, 'unique fields');

  return NextResponse.json({ fields: uniqueFields, pageCount: result.pages?.length ?? 1, source: 'azure' });
}

function guessFieldType(key: string): string {
  const lower = key.toLowerCase();
  if (lower.includes('address') || lower.includes('postcode')) return 'address';
  if (lower.includes('date')) return 'text';
  if (
    lower.includes('ohms') ||
    lower.includes('amps') ||
    lower.includes('volts') ||
    lower.includes('number') ||
    lower.includes('value')
  )
    return 'numeric';
  if (lower.includes('pass') || lower.includes('fail') || lower.includes('n/a') || lower.includes('lim')) return 'state_enum';
  if (lower.includes('type') || lower.includes('class') || lower.includes('cat')) return 'dropdown';
  return 'text';
}
