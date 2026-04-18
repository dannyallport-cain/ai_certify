'use client';

import { ChangeEvent, useMemo, useRef, useState } from 'react';
import {
  Camera,
  FileImage,
  Loader2,
  RefreshCw,
  Sparkles,
  Upload
} from 'lucide-react';

import {
  AdminMutedNote,
  AdminSection
} from '@/components/admin/AdminPageSection';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type {
  AnalyzeImageObservationRecommendation,
  AnalyzeImageRequest,
  AnalyzeImageResponse,
  AnalyzeImageScheduleItem
} from '@/lib/ai/railway-client';

type AnalysisState = {
  imageDataUrl: string | null;
  fileName: string | null;
  contextNotes: string;
  result: AnalyzeImageResponse | null;
  error: string | null;
  isSubmitting: boolean;
};

const INITIAL_STATE: AnalysisState = {
  imageDataUrl: null,
  fileName: null,
  contextNotes: '',
  result: null,
  error: null,
  isSubmitting: false
};

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Unable to read the selected image.'));
    };

    reader.onerror = () => {
      reject(reader.error ?? new Error('Unable to read the selected image.'));
    };

    reader.readAsDataURL(file);
  });
}

function toDisplayLabel(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : '—';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

function formatBoolean(value: boolean | null | undefined) {
  if (value === null || value === undefined) {
    return '—';
  }

  return value ? 'Yes' : 'No';
}

function getScheduleItemTitle(item: AnalyzeImageScheduleItem) {
  return item.item || item.description || 'Schedule item';
}

function getScheduleItemMeta(item: AnalyzeImageScheduleItem) {
  return [item.result, item.outcome, item.code, item.classification]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)
    .join(' • ');
}

function getObservationRecommendationTitle(item: AnalyzeImageObservationRecommendation) {
  return item.observation || item.recommendation || 'Observation';
}

export function AdminLlmTestClient() {
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<AnalysisState>(INITIAL_STATE);

  const extractedTextLines = useMemo(() => {
    const textDetections = state.result?.findings?.textDetections;

    if (!Array.isArray(textDetections)) {
      return [];
    }

    return textDetections
      .map((line) => (typeof line === 'string' ? line.trim() : ''))
      .filter(Boolean);
  }, [state.result]);

  const observations = useMemo(() => {
    const findingObservations = state.result?.findings?.observations ?? [];
    const prefillObservations = state.result?.prefill?.observations ?? [];

    return [...findingObservations, ...prefillObservations].filter(
      (value, index, collection) => Boolean(value) && collection.indexOf(value) === index
    );
  }, [state.result]);

  const consumerUnit = state.result?.findings?.consumerUnit ?? null;
  const accessories = state.result?.findings?.accessories ?? [];
  const reportSections = state.result?.prefill?.reportSections ?? null;
  const identifiedDefects = reportSections?.identifiedDefects ?? [];
  const highlightedSections = reportSections?.highlightedSections ?? [];
  const observationSchedule = reportSections?.observationSchedule ?? [];
  const inspectionSchedule = reportSections?.inspectionSchedule ?? [];
  const observationsAndRecommendations = reportSections?.observationsAndRecommendations ?? [];
  const summaryComments = reportSections?.summaryComments ?? [];
  const reportSummary = reportSections?.reportSummary;
  const gasBondingPresent =
    reportSections?.supplyCharacteristicsAndEarthingArrangements?.mainProtectiveBonding?.gas?.present;

  const summaryBlocks = useMemo(() => {
    if (!state.result) {
      return [];
    }

    return [
      ['Success', state.result.success ? 'Yes' : 'No'],
      ['Summary', state.result.summary],
      ['Needs human review', state.result.needsHumanReview ? 'Yes' : 'No'],
      ['Detector model', state.result.modelInfo?.detector ?? '—'],
      ['OCR model', state.result.modelInfo?.ocr ?? '—'],
      ['Extractor model', state.result.modelInfo?.extractor ?? '—'],
      ['Accessories found', state.result.findings?.accessories?.length ?? 0]
    ] as Array<[string, unknown]>;
  }, [state.result]);

  const handleImageSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      const imageDataUrl = await readFileAsDataUrl(file);

      setState((current) => ({
        ...current,
        imageDataUrl,
        fileName: file.name,
        result: null,
        error: null
      }));
    } catch (nextError) {
      setState((current) => ({
        ...current,
        error:
          nextError instanceof Error ? nextError.message : 'Failed to prepare the selected image.'
      }));
    }
  };

  const handleAnalyze = async () => {
    if (!state.imageDataUrl) {
      setState((current) => ({
        ...current,
        error: 'Choose or capture an image before starting analysis.'
      }));
      return;
    }

    try {
      setState((current) => ({
        ...current,
        isSubmitting: true,
        error: null,
        result: null
      }));

      const payload: AnalyzeImageRequest = {
        imageBase64: state.imageDataUrl,
        reportType: 'electrical-installation-condition-report',
        inspectionType: 'consumer-unit-ocr',
        requestedSections: ['summary', 'consumerUnit', 'observations', 'reportSections'],
        metadata: {
          source: 'admin-llm-test',
          fileName: state.fileName,
          capturedAt: new Date().toISOString(),
          contextNotes: state.contextNotes.trim() || undefined
        }
      };

      const response = await fetch('/api/admin/llm-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify(payload)
      });

      const payloadResult = (await response.json().catch(() => ({}))) as AnalyzeImageResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payloadResult.error || 'Image analysis failed.');
      }

      setState((current) => ({
        ...current,
        result: payloadResult,
        isSubmitting: false
      }));
    } catch (nextError) {
      setState((current) => ({
        ...current,
        error: nextError instanceof Error ? nextError.message : 'Image analysis failed.',
        isSubmitting: false
      }));
    }
  };

  const handleReset = () => {
    setState(INITIAL_STATE);
  };

  return (
    <div className="space-y-6">
      <AdminSection
        eyebrow="Input"
        title="Upload an image for admin LLM testing"
        description="Use a saved image or open the camera on mobile, then send the request to the protected admin AI endpoint."
        icon={<Sparkles className="h-5 w-5" />}
        tone="purple"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => uploadInputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              Upload image
            </Button>
            <Button type="button" variant="outline" onClick={() => cameraInputRef.current?.click()}>
              <Camera className="h-4 w-4" />
              Use camera
            </Button>
            <Button type="button" onClick={handleAnalyze} disabled={!state.imageDataUrl || state.isSubmitting}>
              {state.isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Analyze image
                </>
              )}
            </Button>
            <Button type="button" variant="ghost" onClick={handleReset} disabled={state.isSubmitting}>
              <RefreshCw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <AdminMutedNote tone="purple">
            This tool sends the selected image to <code>/api/admin/llm-test</code> using the same request contract as the Railway worker integration, with optional admin context notes attached in metadata.
          </AdminMutedNote>

          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleImageSelect}
          />

          <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Optional prompt or context notes</p>
                <p className="mt-1 text-sm text-slate-600">
                  Add extra instructions, expected report context, or notes for debugging extraction behaviour.
                </p>
              </div>
              <Textarea
                value={state.contextNotes}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    contextNotes: event.target.value
                  }))
                }
                placeholder="Example: Focus on the consumer unit label, handwritten observations, and any defects noted around the bonding section."
                className="min-h-32 bg-white"
                disabled={state.isSubmitting}
              />
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Selected file</p>
                <p className="mt-1 text-sm text-slate-600">
                  The image is converted to a data URL locally before the request is sent.
                </p>
              </div>

              {state.fileName ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2">
                    <FileImage className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-900">{state.fileName}</span>
                  </div>
                  {state.contextNotes.trim() ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="secondary">Context notes included</Badge>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex min-h-32 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
                  No image selected yet.
                </div>
              )}

              {state.error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {state.error}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </AdminSection>

      <AdminSection
        eyebrow="Preview"
        title="Selected image preview"
        description="Confirm the uploaded or captured image before sending it to the admin-only AI test route."
        icon={<FileImage className="h-5 w-5" />}
        tone="slate"
      >
        {state.imageDataUrl ? (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
            <img
              src={state.imageDataUrl}
              alt="Selected image preview"
              className="h-auto w-full object-contain"
            />
          </div>
        ) : (
          <div className="flex min-h-56 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center text-sm text-slate-500">
            No image selected yet.
          </div>
        )}
      </AdminSection>

      <AdminSection
        eyebrow="Output"
        title="Analysis results"
        description="Review the summary, OCR text, observations, consumer unit fields, extracted report sections, and the raw JSON response."
        icon={<Sparkles className="h-5 w-5" />}
        tone="blue"
      >
        {state.isSubmitting ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-900">Running admin LLM analysis</p>
              <p className="text-sm text-slate-600">
                Your image is being processed by the protected Railway worker proxy.
              </p>
            </div>
          </div>
        ) : state.result ? (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {summaryBlocks.map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{formatValue(value)}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Extracted text lines</h3>
              {extractedTextLines.length > 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <ul className="space-y-2 text-sm text-slate-900">
                    {extractedTextLines.map((line, index) => (
                      <li key={`${index}-${line}`} className="border-b border-slate-200 pb-2 last:border-b-0 last:pb-0">
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <AdminMutedNote>No text lines were returned.</AdminMutedNote>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Observations</h3>
              {observations.length > 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <ul className="space-y-2 text-sm text-slate-900">
                    {observations.map((observation, index) => (
                      <li key={`${index}-${observation}`} className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-400" />
                        <span>{observation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <AdminMutedNote>No observations were returned.</AdminMutedNote>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Accessories</h3>
              {accessories.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {accessories.map((item, index) => (
                    <div key={`${index}-${item.type}-${item.condition}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-sm font-medium text-slate-900">{formatValue(item.type)}</p>
                      <p className="mt-1 text-sm text-slate-600">{formatValue(item.condition)}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        Confidence: {typeof item.confidence === 'number' ? `${(item.confidence * 100).toFixed(0)}%` : '—'}
                      </p>
                      {Array.isArray(item.bbox) && item.bbox.length > 0 ? (
                        <p className="mt-1 text-xs text-slate-500">BBox: {item.bbox.join(', ')}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <AdminMutedNote>No accessories were returned.</AdminMutedNote>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Consumer unit fields</h3>
              {consumerUnit ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(consumerUnit).map(([key, value]) => (
                    <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{toDisplayLabel(key)}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{formatValue(value)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <AdminMutedNote>No consumer unit fields were returned.</AdminMutedNote>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Identified defects</h3>
              {identifiedDefects.length > 0 ? (
                <div className="space-y-3">
                  {identifiedDefects.map((defect, index) => (
                    <div
                      key={`${index}-${defect.item ?? defect.description ?? 'defect'}`}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <p className="text-sm font-medium text-slate-900">{formatValue(defect.item || defect.description)}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {[defect.code, defect.classification]
                          .map((value) => (typeof value === 'string' ? value.trim() : ''))
                          .filter(Boolean)
                          .join(' • ') || 'No classification provided'}
                      </p>
                      {defect.sourceText ? (
                        <p className="mt-2 text-xs text-slate-500">Source: {defect.sourceText}</p>
                      ) : null}
                      {typeof defect.confidence === 'number' ? (
                        <p className="mt-1 text-xs text-slate-500">
                          Confidence: {(defect.confidence * 100).toFixed(0)}%
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <AdminMutedNote>No identified defects were returned.</AdminMutedNote>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Highlighted sections</h3>
              {highlightedSections.length > 0 ? (
                <div className="space-y-3">
                  {highlightedSections.map((section, index) => (
                    <div
                      key={`${index}-${section.section ?? section.title ?? 'section'}`}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <p className="text-sm font-medium text-slate-900">{formatValue(section.section || section.title)}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{formatValue(section.content)}</p>
                      {section.reason ? <p className="mt-2 text-xs text-slate-500">Reason: {section.reason}</p> : null}
                      {typeof section.confidence === 'number' ? (
                        <p className="mt-1 text-xs text-slate-500">
                          Confidence: {(section.confidence * 100).toFixed(0)}%
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <AdminMutedNote>No highlighted sections were returned.</AdminMutedNote>
              )}
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Observation schedule</h3>
                {observationSchedule.length > 0 ? (
                  <div className="space-y-3">
                    {observationSchedule.map((item, index) => (
                      <div
                        key={`${index}-${item.item ?? item.description ?? 'observation-schedule'}`}
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <p className="text-sm font-medium text-slate-900">{getScheduleItemTitle(item)}</p>
                        <p className="mt-1 text-sm text-slate-600">{getScheduleItemMeta(item) || 'No outcome provided'}</p>
                        {item.comments ? (
                          <p className="mt-2 whitespace-pre-wrap text-xs text-slate-500">{item.comments}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <AdminMutedNote>No observation schedule items were returned.</AdminMutedNote>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Inspection schedule</h3>
                {inspectionSchedule.length > 0 ? (
                  <div className="space-y-3">
                    {inspectionSchedule.map((item, index) => (
                      <div
                        key={`${index}-${item.item ?? item.description ?? 'inspection-schedule'}`}
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <p className="text-sm font-medium text-slate-900">{getScheduleItemTitle(item)}</p>
                        <p className="mt-1 text-sm text-slate-600">{getScheduleItemMeta(item) || 'No outcome provided'}</p>
                        {item.comments ? (
                          <p className="mt-2 whitespace-pre-wrap text-xs text-slate-500">{item.comments}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <AdminMutedNote>No inspection schedule items were returned.</AdminMutedNote>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Observations and recommendations</h3>
              {observationsAndRecommendations.length > 0 ? (
                <div className="space-y-3">
                  {observationsAndRecommendations.map((item, index) => (
                    <div
                      key={`${index}-${item.observation ?? item.recommendation ?? 'recommendation'}`}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <p className="text-sm font-medium text-slate-900">{getObservationRecommendationTitle(item)}</p>
                      {item.observation && item.recommendation && item.observation !== item.recommendation ? (
                        <p className="mt-1 text-sm text-slate-700">{item.recommendation}</p>
                      ) : null}
                      <p className="mt-1 text-sm text-slate-600">
                        {[item.code, item.classification]
                          .map((value) => (typeof value === 'string' ? value.trim() : ''))
                          .filter(Boolean)
                          .join(' • ') || 'No code provided'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <AdminMutedNote>No observations and recommendations were returned.</AdminMutedNote>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Summary comments</h3>
              {summaryComments.length > 0 ? (
                <div className="space-y-3">
                  {summaryComments.map((comment, index) => (
                    <div
                      key={`${index}-${typeof comment === 'string' ? comment : comment.title ?? comment.comment ?? comment.text ?? 'comment'}`}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      {typeof comment === 'string' ? (
                        <p className="text-sm text-slate-900">{comment}</p>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-slate-900">
                            {formatValue(comment.title || comment.comment || comment.text)}
                          </p>
                          {comment.comment && comment.title && comment.comment !== comment.title ? (
                            <p className="mt-1 text-sm text-slate-700">{comment.comment}</p>
                          ) : null}
                          {comment.text && comment.text !== comment.comment && comment.text !== comment.title ? (
                            <p className="mt-1 text-sm text-slate-700">{comment.text}</p>
                          ) : null}
                          {typeof comment.confidence === 'number' ? (
                            <p className="mt-2 text-xs text-slate-500">
                              Confidence: {(comment.confidence * 100).toFixed(0)}%
                            </p>
                          ) : null}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <AdminMutedNote>No summary comments were returned.</AdminMutedNote>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Report summary</h3>
              {reportSummary ? (
                typeof reportSummary === 'string' ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-900">
                    {reportSummary}
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {Object.entries(reportSummary).map(([key, value]) => (
                      <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{toDisplayLabel(key)}</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{formatValue(value)}</p>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <AdminMutedNote>No report summary was returned.</AdminMutedNote>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Supply characteristics and earthing arrangements
              </h3>
              {reportSections ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Gas main protective bonding present
                  </p>
                  <p className="mt-1 text-sm text-slate-900">{formatBoolean(gasBondingPresent)}</p>
                </div>
              ) : (
                <AdminMutedNote>No supply characteristic section was returned.</AdminMutedNote>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Raw report sections</h3>
              {reportSections ? (
                <pre className="overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">
                  {JSON.stringify(reportSections, null, 2)}
                </pre>
              ) : (
                <AdminMutedNote>No report sections were returned.</AdminMutedNote>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Raw response JSON</h3>
              <pre className="overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">
                {JSON.stringify(state.result, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <div className="flex min-h-48 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
            <p className="text-sm font-medium text-slate-900">No analysis yet</p>
            <p className="mt-1 max-w-md text-sm text-slate-600">
              Select an image, optionally add context notes, then run analysis to inspect the full worker response.
            </p>
          </div>
        )}
      </AdminSection>
    </div>
  );
}

export default AdminLlmTestClient;