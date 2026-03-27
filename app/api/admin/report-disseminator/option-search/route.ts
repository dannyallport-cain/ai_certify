import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/db/queries';
import { analyzeFieldDefinition } from '@/lib/report-disseminator/field-analysis';

export const runtime = 'nodejs';

const requestSchema = z.object({
  label: z.string().min(1),
  fieldType: z.string().optional(),
  context: z.string().optional(),
  maxOptions: z.number().int().min(1).max(40).default(12),
});

const responseSchema = z.object({
  normalizedLabel: z.string().min(1),
  suggestedFieldType: z.enum(['dropdown', 'state_enum', 'text']).default('text'),
  options: z.array(z.string().min(1)).default([]),
  suggestedDefault: z.string().optional(),
  notes: z.string().optional(),
  sources: z
    .array(
      z.object({
        title: z.string().min(1),
        url: z.string().url(),
      }),
    )
    .default([]),
});

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.AI_GATEWAY_API_KEY;
  const model = process.env.AI_GATEWAY_SEARCH_MODEL || 'openai/gpt-5.4';

  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI Gateway is not configured for online option research.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', details: parsed.error.issues }, { status: 400 });
  }

  const analysis = analyzeFieldDefinition(parsed.data.label, { fieldTypeHint: parsed.data.fieldType });

  const response = await fetch('https://ai-gateway.vercel.sh/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      tools: [{ type: 'web_search' }],
      input: buildPrompt({
        label: parsed.data.label,
        normalizedLabel: analysis.label,
        fieldType: parsed.data.fieldType || analysis.fieldType,
        context: parsed.data.context,
        maxOptions: parsed.data.maxOptions,
      }),
    }),
  });

  const rawResponseText = await response.text();
  if (!response.ok) {
    // Pass through 402 (payment required / credits exhausted) so the client can surface a helpful message
    const statusToReturn = response.status === 402 ? 402 : 500;
    return NextResponse.json(
      {
        error: `Online option research failed with status ${response.status}.`,
        details: rawResponseText.slice(0, 1200),
      },
      { status: statusToReturn },
    );
  }

  let completion: any;
  try {
    completion = JSON.parse(rawResponseText);
  } catch {
    return NextResponse.json(
      { error: 'AI Gateway returned non-JSON output.', details: rawResponseText.slice(0, 1200) },
      { status: 500 },
    );
  }

  const content = extractResponseText(completion);
  const parsedPayload = parsePayload(content);

  const dedupedOptions = Array.from(
    new Map(
      parsedPayload.options
        .map((option) => option.trim())
        .filter(Boolean)
        .slice(0, parsed.data.maxOptions)
        .map((option) => [option.toLowerCase(), option]),
    ).values(),
  );

  const dedupedSources = Array.from(
    new Map(parsedPayload.sources.slice(0, 6).map((source) => [source.url, source])).values(),
  );

  return NextResponse.json({
    normalizedLabel: parsedPayload.normalizedLabel,
    suggestedFieldType: dedupedOptions.length > 0 ? parsedPayload.suggestedFieldType : 'text',
    options: dedupedOptions,
    notes: parsedPayload.notes || '',
    sources: dedupedSources,
    suggestedDefault: parsedPayload.suggestedDefault && dedupedOptions.includes(parsedPayload.suggestedDefault)
      ? parsedPayload.suggestedDefault
      : undefined,
    model,
  });
}

function buildPrompt({
  label,
  normalizedLabel,
  fieldType,
  context,
  maxOptions,
}: {
  label: string;
  normalizedLabel: string;
  fieldType: string;
  context?: string;
  maxOptions: number;
}) {
  const isSentenceBuilder = fieldType === 'sentence_builder';
  const isDropdown = fieldType === 'dropdown';

  return [
    isSentenceBuilder
      ? 'Research common sentence-level text snippets for a "sentence builder" form field using web search.'
      : 'Research likely answer options or dropdown options for a form field using web search.',
    'Return only valid JSON with this shape:',
    isSentenceBuilder
      ? '{"normalizedLabel":"Agreed Limitations","suggestedFieldType":"dropdown","options":["No limitations agreed.","Limited to consumer unit and distribution board only.","Periodic inspection — no additions or alterations carried out."],"suggestedDefault":"No limitations agreed.","notes":"short note","sources":[{"title":"Source title","url":"https://example.com"}]}'
      : '{"normalizedLabel":"Supply Type","suggestedFieldType":"dropdown","options":["TN-S","TN-C-S (PME)"],"suggestedDefault":"TN-C-S (PME)","notes":"short note","sources":[{"title":"Source title","url":"https://example.com"}]}',
    isSentenceBuilder
      ? 'This is a sentence builder field — users select pre-written sentence snippets to compose a longer text answer.'
      : null,
    isSentenceBuilder
      ? `Find up to ${maxOptions} common full-sentence examples that would appear in UK electrical installation certificates for this field.`
      : null,
    isSentenceBuilder
      ? 'You MUST return suggestedFieldType "dropdown" with the sentence snippets as the options array. Never return an empty options array.'
      : isDropdown
        ? `This field is already a dropdown — the user explicitly wants a list of options. You MUST return suggestedFieldType "dropdown" with up to ${maxOptions} practical options. Do not return "text" or an empty options array.`
        : 'Use suggestedFieldType "dropdown" when there is a meaningful option list.',
    !isSentenceBuilder
      ? 'Use suggestedFieldType "state_enum" only for condition-style answers that truly map to the built-in values tick, cross, NA, LIM, NV.'
      : null,
    !isSentenceBuilder && !isDropdown
      ? 'If the field is better as free text, return suggestedFieldType "text" and an empty options array.'
      : null,
    'Prefer UK terminology and official/common industry forms when the field appears UK-specific.',
    isSentenceBuilder
      ? 'Each snippet should be a complete, practical sentence suitable for use in a UK electrical certificate.'
      : 'Keep options concise, deduplicated, and practically usable in a form builder.',
    `Return no more than ${maxOptions} options total.`,
    'Include 1 to 5 helpful sources when you found a meaningful option list.',
    'Include a "suggestedDefault" field: the single most commonly applicable option from the list, or omit it if there is no clear common default.',,
    `Original field label: ${label}`,
    `Normalized field label: ${normalizedLabel}`,
    `Current field type: ${fieldType}`,
    context ? `Template context: ${context}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function extractResponseText(completion: any) {
  const output = completion?.output;
  if (!Array.isArray(output)) return '';

  return output
    .flatMap((item) => (Array.isArray(item?.content) ? item.content : []))
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('\n');
}

function parsePayload(content: string) {
  const trimmed = content.trim();
  const fenceMatch = trimmed.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fenceMatch?.[1] || trimmed.match(/\{[\s\S]*\}/)?.[0] || trimmed;
  return responseSchema.parse(JSON.parse(candidate));
}
