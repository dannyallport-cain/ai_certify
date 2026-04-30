import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { isAdminRole } from '@/lib/auth/roles';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdminRole(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const apiKey = process.env.AI_GATEWAY_API_KEY;
  const model = process.env.AI_GATEWAY_MODEL || 'anthropic/claude-sonnet-4.6';

  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI Gateway is not configured. Set AI_GATEWAY_API_KEY in your environment.' },
      { status: 503 },
    );
  }

  let body: { step: number; templateName: string; fields: Array<{ label: string; fieldType: string; required: boolean; hasBoundingBox: boolean }> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { step, templateName, fields } = body;
  if (!step || !templateName || !Array.isArray(fields)) {
    return NextResponse.json({ error: 'step, templateName and fields are required' }, { status: 400 });
  }

  const prompt = buildAdvisorPrompt(step, templateName, fields);

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
          content: prompt,
        },
      ],
    }),
  });

  const rawText = await response.text();
  if (!response.ok) {
    return NextResponse.json(
      { error: `AI Gateway returned ${response.status}`, details: rawText.slice(0, 1200) },
      { status: 500 },
    );
  }

  let completion: any;
  try {
    completion = JSON.parse(rawText);
  } catch {
    return NextResponse.json({ error: 'Non-JSON response from AI Gateway' }, { status: 500 });
  }

  const text = extractResponseText(completion);
  return NextResponse.json({ advice: text, model });
}

function buildAdvisorPrompt(
  step: number,
  templateName: string,
  fields: Array<{ label: string; fieldType: string; required: boolean; hasBoundingBox: boolean }>,
) {
  const fieldSummary = fields
    .map(
      (f, i) =>
        `${i + 1}. "${f.label}" — type: ${f.fieldType}, required: ${f.required}, placed: ${f.hasBoundingBox}`,
    )
    .join('\n');

  const stepDescriptions: Record<number, string> = {
    1: 'Field inventory — extracting, adding, removing and renaming fields',
    2: 'Intent type mapping — assigning the correct field type (text, dropdown, state_enum, numeric, etc.)',
    3: 'Validation rules — configuring numeric ranges, dropdown options, postcode checks, units',
    4: 'Review & publish — checking layout, confirming field placements, setting lifecycle state',
  };
  const stepLabel = stepDescriptions[step] || `Step ${step}`;

  return [
    'You are an expert advisor for a Report Disseminator tool that converts PDF forms into digital templates.',
    `The user is on step ${step} (${stepLabel}) for template "${templateName}".`,
    '',
    `Current fields (${fields.length}):`,
    fieldSummary || '(none)',
    '',
    'Give 3-5 concise, actionable recommendations for this step.',
    'Tailor advice to the specific fields present. Mention field labels by name when relevant.',
    'Flag any obvious issues: missing required fields, unusual type assignments, unplaced fields, duplicate labels.',
    'Use plain text, no markdown headers, keep each tip to 1-2 sentences.',
    'Number your tips.',
  ].join('\n');
}

function extractResponseText(completion: any): string {
  const output = completion?.output;
  if (!Array.isArray(output)) return '';
  return output
    .flatMap((item: any) => (Array.isArray(item?.content) ? item.content : []))
    .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
    .join('\n');
}
