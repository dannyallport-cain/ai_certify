'use client';

import { ChangeEvent, useMemo, useRef, useState } from 'react';
import { Camera, FileImage, Loader2, RefreshCw, Sparkles, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { AnalyzeImageResponse } from '@/lib/ai/railway-client';

type AnalysisState = {
  imageDataUrl: string | null;
  fileName: string | null;
  result: AnalyzeImageResponse | null;
  error: string | null;
  isSubmitting: boolean;
};

const INITIAL_STATE: AnalysisState = {
  imageDataUrl: null,
  fileName: null,
  result: null,
  error: null,
  isSubmitting: false,
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

export default function ImageAnalysisCapture() {
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
      (value, index, collection) => Boolean(value) && collection.indexOf(value) === index,
    );
  }, [state.result]);

  const consumerUnit = state.result?.findings?.consumerUnit ?? null;
  const reportSections = state.result?.prefill?.reportSections ?? null;

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
      ['Accessories found', state.result.findings?.accessories?.length ?? 0],
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
        error: null,
      }));
    } catch (nextError) {
      setState((current) => ({
        ...current,
        error: nextError instanceof Error ? nextError.message : 'Failed to prepare the selected image.',
      }));
    }
  };

  const handleAnalyze = async () => {
    if (!state.imageDataUrl) {
      setState((current) => ({
        ...current,
        error: 'Choose or capture an image before starting analysis.',
      }));
      return;
    }

    try {
      setState((current) => ({
        ...current,
        isSubmitting: true,
        error: null,
        result: null,
      }));

      const response = await fetch('/api/ai/analyze-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: state.imageDataUrl,
          reportType: 'electrical-installation-condition-report',
          inspectionType: 'consumer-unit-ocr',
          requestedSections: ['summary', 'consumerUnit', 'observations', 'reportSections'],
          metadata: {
            source: 'ai-analysis-page',
            fileName: state.fileName,
            capturedAt: new Date().toISOString(),
          },
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as AnalyzeImageResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || 'Image analysis failed.');
      }

      setState((current) => ({
        ...current,
        result: payload,
        isSubmitting: false,
      }));
    } catch (nextError) {
      setState((current) => ({
        ...current,
        error: nextError instanceof Error ? nextError.message : 'Image analysis failed.',
        isSubmitting: false,
      }));
    }
  };

  const handleReset = () => {
    setState(INITIAL_STATE);
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
              <Sparkles className="h-3.5 w-3.5" />
              Live OCR analysis
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Choose an image to analyze</h2>
            <p className="text-sm text-slate-600">
              Upload a saved photo or open your camera on mobile. The selected image is converted to a data URL and
              sent to the AI analysis endpoint.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={() => uploadInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Upload image
            </Button>

            <Button type="button" variant="outline" onClick={() => cameraInputRef.current?.click()}>
              <Camera className="mr-2 h-4 w-4" />
              Use camera
            </Button>

            <Button type="button" onClick={handleAnalyze} disabled={!state.imageDataUrl || state.isSubmitting}>
              {state.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {state.isSubmitting ? 'Analyzing...' : 'Analyze image'}
            </Button>

            <Button type="button" variant="ghost" onClick={handleReset} disabled={state.isSubmitting}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>

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

          {state.fileName ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Selected image: <span className="font-medium text-slate-900">{state.fileName}</span>
            </div>
          ) : null}

          {state.error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-4 flex items-center gap-2">
          <FileImage className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-900">Selected image preview</h2>
        </div>

        {state.imageDataUrl ? (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
            <img src={state.imageDataUrl} alt="Selected image preview" className="h-auto w-full object-contain" />
          </div>
        ) : (
          <div className="flex min-h-56 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center text-sm text-slate-500">
            No image selected yet.
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">Analysis results</h2>
          <p className="text-sm text-slate-600">
            Review the OCR summary, extracted text, observations, consumer unit fields, and returned report section
            data.
          </p>
        </div>

        {state.isSubmitting ? (
          <div className="mt-6 flex min-h-48 flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-900">Running OCR analysis</p>
              <p className="text-sm text-slate-600">Your image is being processed by the AI worker.</p>
            </div>
          </div>
        ) : state.result ? (
          <div className="mt-6 space-y-6">
            <div className="grid gap-3 sm:grid-cols-2">
              {summaryBlocks.map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{formatValue(value)}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Extracted text lines</h3>
              {extractedTextLines.length > 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <ul className="space-y-2 text-sm text-slate-900">
                    {extractedTextLines.map((line, index) => (
                      <li key={`${index}-${line}`} className="border-b border-slate-200 pb-2 last:border-b-0 last:pb-0">
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  No text lines were returned.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Observations</h3>
              {observations.length > 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
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
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  No observations were returned.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Consumer unit fields</h3>
              {consumerUnit ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(consumerUnit).map(([key, value]) => (
                    <div key={key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{toDisplayLabel(key)}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{formatValue(value)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  No consumer unit fields were returned.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Report sections</h3>
              {reportSections ? (
                <pre className="overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">
                  {JSON.stringify(reportSections, null, 2)}
                </pre>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  No report sections were returned.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-6 flex min-h-48 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
            <p className="text-sm font-medium text-slate-900">No analysis yet</p>
            <p className="mt-1 max-w-md text-sm text-slate-600">
              Select an image, then run analysis to populate the OCR summary and extracted data below.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}