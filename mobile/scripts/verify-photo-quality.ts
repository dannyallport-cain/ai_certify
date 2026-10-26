/**
 * Verification for capture photo quality gating.
 *
 * Run with: npm run verify:photo-quality
 *
 * Guards the rule that a detector photo is accepted on the evidence it shows,
 * not on board-photo expectations: a portrait smoke alarm with unreadable
 * markings must still be captured, while a photo with no detector in frame, or
 * one that is unusably small, must be sent back for a retake.
 */

import { buildQualityAssessment } from '../lib/photo-quality';
import type { AnalysisResult } from '../services/api';

let failures = 0;

function detectorResult(overrides: Record<string, unknown>): AnalysisResult {
  return {
    success: true,
    detector: {
      detectorType: 'smoke',
      detectedTypeLabel: 'optical smoke alarm',
      present: true,
      manufacturer: 'Aico',
      model: 'Ei146e',
      powerSource: 'Mains powered',
      mountingPosition: 'ceiling',
      standards: ['BS EN 14604'],
      replaceByDate: '06/2031',
      condition: [],
      confidence: 0.82,
      needsHumanReview: false,
      method: 'vision',
      ...overrides,
    },
  };
}

interface QualityCase {
  name: string;
  expect: boolean;
  run: () => boolean;
}

const cases: QualityCase[] = [
  {
    name: 'portrait detector photo with a good read is accepted',
    expect: true,
    run: () =>
      buildQualityAssessment({
        width: 3024,
        height: 4032,
        mode: 'smoke_detector',
        result: detectorResult({}),
      }).isSufficient,
  },
  {
    name: 'detector with no readable standard is still accepted',
    expect: true,
    run: () =>
      buildQualityAssessment({
        width: 3024,
        height: 4032,
        mode: 'smoke_detector',
        result: detectorResult({ standards: [], confidence: 0.5 }),
      }).isSufficient,
  },
  {
    name: 'an analysis outage does not block the evidence photo',
    expect: true,
    run: () =>
      buildQualityAssessment({
        width: 3024,
        height: 4032,
        mode: 'smoke_detector',
        result: null,
        analysisError: 'openai: 401',
      }).isSufficient,
  },
  {
    name: 'a photo with no detector visible is rejected',
    expect: false,
    run: () =>
      buildQualityAssessment({
        width: 3024,
        height: 4032,
        mode: 'smoke_detector',
        result: detectorResult({ present: false, confidence: 0.1 }),
      }).isSufficient,
  },
  {
    name: 'an unusably small detector photo is rejected',
    expect: false,
    run: () =>
      buildQualityAssessment({
        width: 400,
        height: 300,
        mode: 'smoke_detector',
        result: detectorResult({ confidence: 0.2 }),
      }).isSufficient,
  },
  {
    name: 'a CO detector is judged by the same detector rules',
    expect: true,
    run: () =>
      buildQualityAssessment({
        width: 3024,
        height: 4032,
        mode: 'co_detector',
        result: detectorResult({ detectorType: 'co', standards: [] }),
      }).isSufficient,
  },
  {
    name: 'a consumer-unit photo keeps its original strictness',
    expect: false,
    run: () =>
      buildQualityAssessment({
        width: 800,
        height: 600,
        mode: 'consumer_unit',
        result: { needsHumanReview: true },
      }).isSufficient,
  },
];

for (const testCase of cases) {
  const actual = testCase.run();
  const passed = actual === testCase.expect;

  if (!passed) {
    failures += 1;
  }

  console.log(
    `${passed ? 'PASS' : 'FAIL'}  ${testCase.name} (expected ${testCase.expect}, got ${actual})`,
  );
}

console.log(failures === 0 ? '\nall photo quality cases passed' : `\n${failures} case(s) failed`);

if (failures > 0) {
  process.exit(1);
}
