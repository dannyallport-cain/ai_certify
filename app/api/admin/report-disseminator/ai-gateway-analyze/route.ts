import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { z } from 'zod';
import { createRequire } from 'module';
import { isAdminRole } from '@/lib/auth/roles';
import { getUser } from '@/lib/db/queries';
import {
  analyzeFieldDefinition,
  DISSEMINATOR_FIELD_TYPES,
} from '@/lib/report-disseminator/field-analysis';

export const runtime = 'nodejs';
const require = createRequire(import.meta.url);

const gatewayFieldSchema = z.object({
  key: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
  value: z.string().nullable().optional(),
  pageNumber: z.number().int().min(1).optional(),
  fieldType: z.enum(DISSEMINATOR_FIELD_TYPES).optional(),
});

const gatewayResponseSchema = z.object({
  fields: z.array(gatewayFieldSchema).default([]),
});

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdminRole(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const apiKey = process.env.AI_GATEWAY_API_KEY;
  const model = process.env.AI_GATEWAY_MODEL || 'anthropic/claude-sonnet-4.6';

  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'Vercel AI Gateway is not configured.',
        hint: 'Set AI_GATEWAY_API_KEY and optionally AI_GATEWAY_MODEL in your environment.',
      },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Could not parse multipart body' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file || file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'A PDF file is required' }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const { pageCount, text, acroFieldNames } = await extractPdfContext(bytes);

  if (!text && acroFieldNames.length === 0) {
    return NextResponse.json({
      fields: [],
      pageCount,
      model,
      source: 'ai-gateway',
      hint: 'No machine-readable text was found in this PDF. The OCR fallback may work better for scanned documents.',
    });
  }

  const response = await fetch('https://ai-gateway.vercel.sh/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [
        {
          type: 'message',
          role: 'user',
          content: buildPrompt({ fileName: file.name || 'document.pdf', text, acroFieldNames }),
        },
      ],
    }),
  });

  const rawResponseText = await response.text();
  if (!response.ok) {
    return NextResponse.json(
      {
        error: `AI Gateway analysis failed with status ${response.status}.`,
        details: rawResponseText.slice(0, 1200),
      },
      { status: 500 },
    );
  }

  let completion: any;
  try {
    completion = JSON.parse(rawResponseText);
  } catch {
    return NextResponse.json(
      {
        error: 'AI Gateway returned non-JSON output.',
        details: rawResponseText.slice(0, 1200),
      },
      { status: 500 },
    );
  }

  const content = extractResponseText(completion);
  const parsedPayload = parseGatewayPayload(content);

  const seen = new Set<string>();
  const fields = parsedPayload.fields
    .map((field) => {
      const key = (field.key || field.label || '').trim();
      if (!key) return null;
      const analysis = analyzeFieldDefinition(key, { fieldTypeHint: field.fieldType });

      return {
        id: crypto.randomUUID(),
        key: analysis.label,
        value: field.value ?? null,
        pageNumber: field.pageNumber ?? 1,
        boundingBox: null,
        fieldType: analysis.fieldType,
        plainTextHint: analysis.plainTextHint,
        dropdownOptions: analysis.dropdownOptions,
        stateOptions: analysis.stateOptions,
        addressConfig: analysis.addressConfig,
        postcodeConfig: analysis.postcodeConfig,
        phoneConfig: analysis.phoneConfig,
        numericConfig: analysis.numericConfig,
      };
    })
    .filter((field): field is NonNullable<typeof field> => {
      if (!field) return false;
      const normalized = field.key.toLowerCase();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });

  return NextResponse.json({
    fields,
    pageCount,
    model,
    source: 'ai-gateway',
  });
}

async function extractPdfContext(bytes: Uint8Array) {
  const buffer = Buffer.from(bytes);
  const pdfParse = require('pdf-parse');

  let pageCount = 1;
  let text = '';
  try {
    const parsed = await pdfParse(buffer);
    pageCount = parsed.numpages ?? 1;
    text = (parsed.text ?? '').slice(0, 30000);
  } catch {
    text = '';
  }

  let acroFieldNames: string[] = [];
  try {
    const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    pageCount = Math.max(pageCount, pdfDoc.getPageCount());
    acroFieldNames = pdfDoc
      .getForm()
      .getFields()
      .map((field) => field.getName())
      .filter(Boolean)
      .slice(0, 200);
  } catch {
    acroFieldNames = [];
  }

  return { pageCount, text, acroFieldNames };
}

function buildPrompt({
  fileName,
  text,
  acroFieldNames,
}: {
  fileName: string;
  text: string;
  acroFieldNames: string[];
}) {
  const acroSection =
    acroFieldNames.length > 0
      ? `Known AcroForm field names:\n${acroFieldNames.map((name) => `- ${name}`).join('\n')}\n\n`
      : '';

  return [
    'Extract likely fillable field labels for a report template editor.',
    'Return only valid JSON with the shape {"fields":[{"key":"Field label","value":null,"pageNumber":1,"fieldType":"text"}]}.',
    `Allowed fieldType values: ${DISSEMINATOR_FIELD_TYPES.join(', ')}.`,
    'Use human-friendly labels such as Address, Phone Number, Postcode, Resistance Reading, and Voltage Reading.',
    'Use postcode for UK postcodes, uk_phone for UK telephone numbers, resistance for ohms/impedance/insulation readings, and voltage for voltage readings.',
    'Prefer fields a technician or office user would fill in, verify, or copy into a template.',
    'Deduplicate obvious repeats. Do not include bounding boxes. If page number is unclear, use 1.',
    `Source file: ${fileName}`,
    '',
    acroSection,
    'Extracted PDF text:',
    text || '[No text extracted]',
  ].join('\n');
}

function extractResponseText(completion: any) {
  const output = completion?.output;
  if (!Array.isArray(output)) return '';

  return output
    .flatMap((item) => (Array.isArray(item?.content) ? item.content : []))
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('\n');
}

function parseGatewayPayload(content: string) {
  const trimmed = content.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  const payload = jsonMatch ? jsonMatch[0] : trimmed;
  return gatewayResponseSchema.parse(JSON.parse(payload));
}
