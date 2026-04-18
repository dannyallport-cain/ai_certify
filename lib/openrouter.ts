interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenRouterConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export class OpenRouterClient {
  private config: OpenRouterConfig;

  constructor(config: OpenRouterConfig) {
    this.config = {
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'anthropic/claude-3-haiku',
      ...config,
    };

    if (!this.config.apiKey) {
      throw new Error('OpenRouter API key is required');
    }
  }

  async chatCompletion(
    messages: OpenRouterMessage[],
    options: {
      temperature?: number;
      maxTokens?: number;
      responseFormat?: { type: 'json_object' | 'text' };
    } = {}
  ): Promise<string> {
    // Convert messages to a single prompt for completions API
    const prompt = messages.map(msg => {
      if (msg.role === 'system') return `System: ${msg.content}`;
      if (msg.role === 'user') return `User: ${msg.content}`;
      if (msg.role === 'assistant') return `Assistant: ${msg.content}`;
      return msg.content;
    }).join('\n\n');

    const response = await fetch(`${this.config.baseUrl}/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ai-certificates.app',
        'X-Title': 'AI Certificates',
      },
      body: JSON.stringify({
        model: this.config.model,
        prompt,
        temperature: options.temperature ?? 0.1,
        max_tokens: options.maxTokens ?? 1000,
        response_format: options.responseFormat,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} ${error}`);
    }

    const data: any = await response.json();
    return data.choices[0]?.text || '';
  }

  async analyzeImageContent(
    prompt: string,
    textLines: string[],
    imageQuality: any,
    hints: any,
    certificateContext?: any
  ): Promise<{
    summary?: string;
    observations: string[];
    recommendedCodes: string[];
  }> {
    const systemPrompt = `You are assisting with electrical inspection image review. Return strict JSON with keys: summary, observations, recommendedCodes.
observations must be an array of concise strings.
recommendedCodes must be an array containing only C1, C2, C3, FI, LIM, or NA.`;

    const userPrompt = JSON.stringify({
      task: "Review OCR/image-derived consumer-unit inspection evidence and return concise structured assistance.",
      textDetections: textLines.slice(0, 100),
      imageQuality,
      derivedHints: hints,
      certificateContext,
    }, null, 2);

    const messages: OpenRouterMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const response = await this.chatCompletion(messages, {
      temperature: 0.1,
      responseFormat: { type: 'json_object' },
    });

    try {
      const parsed = JSON.parse(response);
      return {
        summary: parsed.summary,
        observations: Array.isArray(parsed.observations) ? parsed.observations : [],
        recommendedCodes: Array.isArray(parsed.recommendedCodes) ? parsed.recommendedCodes : [],
      };
    } catch (error) {
      console.error('Failed to parse OpenRouter response:', error);
      return {
        observations: [],
        recommendedCodes: [],
      };
    }
  }
}

export function createOpenRouterClient(): OpenRouterClient {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-haiku';

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is required');
  }

  return new OpenRouterClient({
    apiKey,
    model,
  });
}