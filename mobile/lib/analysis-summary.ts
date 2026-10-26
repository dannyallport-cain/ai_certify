import type { AnalysisResult } from '@/services/api';

/**
 * Presentation of an analysis result for the capture screen.
 *
 * The capture screen previously assumed every result described a consumer
 * unit. Detector photos return a `detector` block instead, so both are
 * normalised into the same label/value list here.
 */

export interface AnalysisSummaryLine {
  label: string;
  value: string;
}

export interface AnalysisSummary {
  title: string;
  summary: string;
  lines: AnalysisSummaryLine[];
  detail: string | null;
}

function localLlmProviderLabel(provider: string | null | undefined): string | null {
  switch (provider) {
    case 'ollama':
      return 'Ollama';
    case 'lmstudio':
      return 'LM Studio';
    case 'disabled':
      return 'Disabled';
    default:
      return null;
  }
}

function buildDetectorSummary(result: AnalysisResult): AnalysisSummary {
  const detector = result.detector;
  const lines: AnalysisSummaryLine[] = [];

  const typeLabel = detector?.detectedTypeLabel
    ? detector.detectedTypeLabel
    : detector?.detectorType === 'co'
      ? 'CO detector'
      : 'Smoke detector';
  lines.push({ label: 'Device', value: typeLabel });

  if (detector?.present === false) {
    lines.push({ label: 'Device visible', value: 'No' });
  } else if (detector?.present === true) {
    lines.push({ label: 'Device visible', value: 'Yes' });
  }

  if (detector?.manufacturer) {
    lines.push({ label: 'Manufacturer', value: detector.manufacturer });
  }
  if (detector?.model) {
    lines.push({ label: 'Model', value: detector.model });
  }
  if (detector?.powerSource) {
    lines.push({ label: 'Power source', value: detector.powerSource });
  }
  if (detector?.mountingPosition) {
    lines.push({ label: 'Mounting', value: detector.mountingPosition });
  }
  if (detector && detector.standards.length > 0) {
    lines.push({ label: 'Standard marks', value: detector.standards.join(', ') });
  }
  if (detector?.replaceByDate) {
    lines.push({ label: 'Replace by', value: detector.replaceByDate });
  }
  if (detector) {
    lines.push({
      label: 'Read by',
      value:
        detector.method === 'vision'
          ? `Vision model (${Math.round(detector.confidence * 100)}% confidence)`
          : 'Printed text only',
    });
  }
  for (const note of detector?.condition ?? []) {
    lines.push({ label: 'Observation', value: note });
  }

  return {
    title: 'Latest detector analysis',
    summary: result.summary || 'Detector analysis completed.',
    lines,
    detail: detector?.needsHumanReview
      ? 'Confirm the device details against the alarm before relying on them in the report.'
      : null,
  };
}

function buildBoardSummary(result: AnalysisResult): AnalysisSummary {
  const lines: AnalysisSummaryLine[] = [];
  const brandModel = [result.consumerUnit?.brand, result.consumerUnit?.model]
    .filter(Boolean)
    .join(' ');

  if (brandModel) {
    lines.push({ label: 'Consumer unit', value: brandModel });
  }
  lines.push({
    label: 'Text detected',
    value: String(Array.isArray(result.textDetections) ? result.textDetections.length : 0),
  });
  lines.push({
    label: 'Observations',
    value: String(Array.isArray(result.observations) ? result.observations.length : 0),
  });

  const localLlm = result.modelInfo?.localLlm;
  const providerLabel = localLlmProviderLabel(localLlm?.provider ?? null);
  if (providerLabel) {
    lines.push({ label: 'Local AI provider', value: providerLabel });
  }
  if (localLlm?.model) {
    lines.push({ label: 'Configured model', value: localLlm.model });
  }
  if (localLlm?.status) {
    const health =
      localLlm.healthy === true ? ' (healthy)' : localLlm.healthy === false ? ' (unavailable)' : '';
    lines.push({ label: 'Provider status', value: `${localLlm.status}${health}` });
  }

  return {
    title: 'Latest analysis',
    summary: result.summary || 'No summary returned.',
    lines,
    detail: localLlm?.detail ?? null,
  };
}

export function buildAnalysisSummary(
  result: AnalysisResult | null | undefined,
): AnalysisSummary | null {
  if (!result) {
    return null;
  }

  return result.detector ? buildDetectorSummary(result) : buildBoardSummary(result);
}

/** Plain-text version of the summary, used by the post-capture alert. */
export function buildAnalysisMessage(result: AnalysisResult): string {
  const summary = buildAnalysisSummary(result);

  if (!summary) {
    return 'Analysis completed.';
  }

  const lines = [summary.summary, ...summary.lines.map((line) => `${line.label}: ${line.value}`)];

  if (result.needsHumanReview) {
    lines.push('Needs human review: Yes');
  }

  if (summary.detail) {
    lines.push(summary.detail);
  }

  return lines.join('\n');
}
