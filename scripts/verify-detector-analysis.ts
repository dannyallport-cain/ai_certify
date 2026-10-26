/**
 * Verification for the detector photo analysis rules.
 *
 * Run with: pnpm exec tsx scripts/verify-detector-analysis.ts
 *
 * Covers the two paths that matter for smoke and CO detector evidence:
 * a vision model answering through the Vercel AI Gateway, and the OCR-text
 * fallback when the gateway is unreachable. The gateway call is stubbed
 * through global fetch, so the script needs no credential and makes no
 * network requests.
 */

import { analyseDetectorImage } from '../lib/ai/detector-analysis';
import { deriveDetectorTextHints } from '../lib/ai/detector-text-hints';

interface Check {
  name: string;
  run: () => Promise<void> | void;
}

let failures = 0;
let passes = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message} (expected ${String(expected)}, got ${String(actual)})`);
  }
}

const VISION_JSON = JSON.stringify({
  detectorVisible: true,
  matchesRequestedType: true,
  detectorTypeLabel: 'optical smoke alarm',
  manufacturer: 'Aico',
  model: 'Ei146e',
  powerSource: 'Mains powered with battery backup',
  mountingPosition: 'ceiling',
  standards: ['BS EN 14604'],
  replaceByDate: '06/2031',
  condition: ['indicator LED visible'],
  confidence: 0.82,
  notes: null,
});

/** Valid JSON that omits the free-text `notes` field. */
const PARTIAL_JSON = JSON.stringify({
  detectorVisible: true,
  matchesRequestedType: true,
  detectorTypeLabel: 'optical smoke alarm',
  manufacturer: 'Ei Electronics',
  model: 'Ei3024',
  powerSource: 'Mains powered',
  mountingPosition: 'ceiling',
  standards: ['BS EN 14604'],
  replaceByDate: null,
  condition: [],
  confidence: 0.64,
});

const CO_JSON = JSON.stringify({
  detectorVisible: true,
  matchesRequestedType: true,
  detectorTypeLabel: 'carbon monoxide alarm',
  manufacturer: 'Kidde',
  model: '7DCO',
  powerSource: 'Sealed 10-year lithium battery',
  mountingPosition: 'ceiling',
  standards: ['BS EN 50291-1'],
  replaceByDate: '03/2032',
  condition: ['digital display visible'],
  confidence: 0.79,
  notes: null,
});

const MISMATCH_JSON = JSON.stringify({
  detectorVisible: true,
  matchesRequestedType: false,
  detectorTypeLabel: 'carbon monoxide alarm',
  manufacturer: null,
  model: null,
  powerSource: null,
  mountingPosition: null,
  standards: ['BS EN 50291'],
  replaceByDate: null,
  condition: [],
  confidence: 0.7,
  notes: null,
});

function stubFetch(content: string | null): void {
  // Point the AI Gateway at a stubbed host and intercept its HTTP call, so the
  // suite needs no credential and makes no network request.
  process.env.AI_GATEWAY_API_KEY = 'vck_test_key';
  process.env.AI_GATEWAY_BASE_URL = 'https://stub.invalid/v1';
  delete process.env.AI_GATEWAY_VISION_MODEL;

  globalThis.fetch = (async () => {
    if (content === null) {
      throw new Error('network down');
    }

    // AI Gateway language-model response (provider v4 result shape).
    return new Response(
      JSON.stringify({
        content: [{ type: 'text', text: content }],
        finishReason: { unified: 'stop', raw: 'stop' },
        usage: {
          inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 10, reasoning: 0 },
        },
        warnings: [],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }) as typeof fetch;
}

const checks: Check[] = [
  {
    name: 'printed detector marks are read from OCR text',
    run: () => {
      const hints = deriveDetectorTextHints(
        ['Aico', 'Ei146e', 'BS EN 14604:2005', 'Replace by 06/2031', 'Mains with battery backup'],
        'smoke',
      );

      assertEqual(hints.manufacturer, 'Aico', 'manufacturer');
      assertEqual(hints.model, 'EI146E', 'model');
      assertEqual(hints.replaceByDate, '06/2031', 'replace by date');
      assertEqual(hints.powerSource, 'Mains powered with battery backup', 'power source');
      assert(
        hints.standards.some((standard) => standard.includes('14604')),
        'expected the BS EN 14604 mark to be captured',
      );
      assertEqual(hints.matchesRequestedKind, true, 'smoke standard matches a smoke request');
    },
  },
  {
    name: 'a CO standard is flagged when smoke was requested',
    run: () => {
      const hints = deriveDetectorTextHints(['BS EN 50291-1', 'CO ALARM'], 'smoke');
      assertEqual(hints.matchesRequestedKind, false, 'cross-family detection');
    },
  },
  {
    name: 'vision reading is merged into detector findings',
    run: async () => {
      stubFetch(VISION_JSON);

      const outcome = await analyseDetectorImage({
        imageBase64: 'data:image/jpeg;base64,AAAA',
        detectorType: 'smoke',
        textLines: [],
      });

      assertEqual(outcome.findings.method, 'vision', 'method');
      assertEqual(outcome.findings.present, true, 'present');
      assertEqual(outcome.findings.manufacturer, 'Aico', 'manufacturer');
      assertEqual(outcome.findings.model, 'Ei146e', 'model');
      assertEqual(outcome.findings.standards[0], 'BS EN 14604', 'standard');
      assertEqual(outcome.findings.needsHumanReview, false, 'confident read needs no review');
      assert(
        outcome.summary.includes('optical smoke alarm'),
        'summary should describe the device',
      );
      assert(
        outcome.observations.some((line) => line.includes('06/2031')),
        'observations should carry the replace-by date',
      );
    },
  },
  {
    name: 'a failed vision call falls back to printed text',
    run: async () => {
      stubFetch(null);

      const outcome = await analyseDetectorImage({
        imageBase64: 'data:image/jpeg;base64,AAAA',
        detectorType: 'smoke',
        textLines: ['Kidde', 'BS EN 14604', 'Replace by 03/2030'],
      });

      assertEqual(outcome.findings.method, 'ocr-text', 'method');
      assertEqual(outcome.findings.manufacturer, 'Kidde', 'manufacturer from OCR');
      assertEqual(outcome.findings.present, null, 'presence unknown without vision');
      assertEqual(outcome.findings.needsHumanReview, true, 'fallback always needs review');
      const fallbackLine =
        outcome.observations.find((line) => line.includes('could not be read')) ?? '';

      assert(fallbackLine.length > 0, 'observations should explain the fallback');
      assert(
        fallbackLine.length < 200,
        `fallback message should be compact, got ${fallbackLine.length} characters`,
      );
    },
  },
  {
    name: 'a reply missing an optional field is salvaged, not discarded',
    run: async () => {
      stubFetch(PARTIAL_JSON);

      const outcome = await analyseDetectorImage({
        imageBase64: 'data:image/jpeg;base64,AAAA',
        detectorType: 'smoke',
        textLines: [],
      });

      assertEqual(outcome.findings.method, 'vision', 'method');
      assertEqual(outcome.findings.manufacturer, 'Ei Electronics', 'manufacturer kept');
      assertEqual(outcome.findings.model, 'Ei3024', 'model kept');
    },
  },
  {
    name: 'a model claiming a match while describing the other family is flagged',
    run: async () => {
      // VISION_JSON describes an optical smoke alarm (BS EN 14604) but asserts
      // matchesRequestedType: true. For a CO request that claim must not win.
      stubFetch(VISION_JSON);

      const outcome = await analyseDetectorImage({
        imageBase64: 'data:image/jpeg;base64,AAAA',
        detectorType: 'co',
        textLines: [],
      });

      assertEqual(outcome.findings.needsHumanReview, true, 'contradiction needs review');
      assert(
        outcome.recommendedCodes.includes('FI'),
        'contradiction should recommend further investigation',
      );
      assert(
        outcome.observations.some(
          (line) => line.includes('other detector family') && line.includes('optical smoke alarm'),
        ),
        'observations should name the device that was actually seen',
      );
    },
  },
  {
    name: 'a genuine CO reading still passes without review',
    run: async () => {
      stubFetch(CO_JSON);

      const outcome = await analyseDetectorImage({
        imageBase64: 'data:image/jpeg;base64,AAAA',
        detectorType: 'co',
        textLines: [],
      });

      assertEqual(outcome.findings.method, 'vision', 'method');
      assertEqual(outcome.findings.manufacturer, 'Kidde', 'manufacturer');
      assertEqual(outcome.findings.standards[0], 'BS EN 50291-1', 'standard');
      assertEqual(outcome.findings.needsHumanReview, false, 'matching CO reading needs no review');
    },
  },
  {
    name: 'a CO alarm photographed as a smoke alarm is flagged',
    run: async () => {
      stubFetch(MISMATCH_JSON);

      const outcome = await analyseDetectorImage({
        imageBase64: 'data:image/jpeg;base64,AAAA',
        detectorType: 'smoke',
        textLines: [],
      });

      assertEqual(outcome.findings.needsHumanReview, true, 'mismatch needs review');
      assert(
        outcome.recommendedCodes.includes('FI'),
        'mismatch should recommend further investigation',
      );
      assert(
        outcome.observations.some((line) => line.includes('other detector family')),
        'observations should explain the mismatch',
      );
    },
  },
];

async function main(): Promise<void> {
  for (const check of checks) {
    try {
      await check.run();
      passes += 1;
      console.log(`PASS  ${check.name}`);
    } catch (error) {
      failures += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.log(`FAIL  ${check.name}: ${message}`);
    }
  }

  console.log(`\n${passes} passed, ${failures} failed`);

  if (failures > 0) {
    process.exit(1);
  }
}

void main();
