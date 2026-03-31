import { NextRequest, NextResponse } from 'next/server';
import { getMobileUser } from '@/lib/auth/mobile';

interface CircuitAnalysis {
  designation: string;
  rating?: string;
  type?: string;
}

interface AnalysisResult {
  mainSwitchRating?: string;
  numberOfCircuits?: number;
  earthingArrangement?: string;
  voltage?: string;
  circuits: CircuitAnalysis[];
  rawText?: string;
}

export async function POST(request: NextRequest) {
  const auth = await getMobileUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;
    const mode = formData.get('mode') as string | null; // 'consumer_unit' | 'circuit_label'

    if (!imageFile) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      // Return a mock response if no API key configured
      return NextResponse.json<AnalysisResult>({
        mainSwitchRating: '100A',
        numberOfCircuits: 8,
        earthingArrangement: 'TN-C-S (PME)',
        voltage: '230',
        circuits: [
          { designation: 'Lighting', rating: '6A', type: 'B' },
          { designation: 'Sockets', rating: '32A', type: 'B' },
          { designation: 'Cooker', rating: '32A', type: 'B' },
          { designation: 'Shower', rating: '40A', type: 'B' },
        ],
        rawText: '(AI analysis not configured — mock data returned)',
      });
    }

    // Convert file to base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = imageFile.type || 'image/jpeg';

    const prompt = mode === 'circuit_label'
      ? `You are analysing an image of a circuit label from an electrical consumer unit. Extract all circuit information visible. Return JSON with: { circuits: [{ designation: string, rating: string, type: string }] }`
      : `You are analysing an image of a domestic or commercial electrical consumer unit / distribution board. Extract all visible electrical details. Return ONLY valid JSON with these fields (use null if not visible):
{
  "mainSwitchRating": string or null (e.g. "100A"),
  "numberOfCircuits": number or null,
  "earthingArrangement": string or null (e.g. "TN-C-S (PME)"),
  "voltage": string or null (e.g. "230"),
  "circuits": [
    { "designation": string, "rating": string or null, "type": string or null }
  ],
  "rawText": string (all text visible in the image)
}`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' },
              },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text();
      console.error('OpenAI error:', errText);
      return NextResponse.json({ error: 'Image analysis failed' }, { status: 502 });
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: 'No analysis result returned' }, { status: 502 });
    }

    const parsed: AnalysisResult = JSON.parse(content);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Image analysis error:', error);
    return NextResponse.json({ error: 'Failed to analyse image' }, { status: 500 });
  }
}
