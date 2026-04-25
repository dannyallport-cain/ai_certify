'use client';

import { ChangeEvent, useMemo, useRef, useState } from 'react';
import { Camera, FileImage, Loader2, RefreshCw, Sparkles, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type {
  AnalyzeImageResponse,
  AnalyzeImageObservationRecommendation,
  AnalyzeImageScheduleItem,
} from '@/lib/ai/railway-client';

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

type TrainingLabels = {
  deviceType: string;
  manufacturer: string;
  mounting: string;
  visibility: string;
  notes: string;
  clarification: string;
};

type SubmissionStatus = 'idle' | 'submitting' | 'saved' | 'error';

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

function needsHumanReview(result: AnalyzeImageResponse | null) {
  return Boolean(result?.needsHumanReview) || (result?.findings?.textDetections?.length ?? 0) === 0;
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

export default function ImageAnalysisCapture() {
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<AnalysisState>(INITIAL_STATE);
  const [trainingLabels, setTrainingLabels] = useState<TrainingLabels>({
    deviceType: '',
    manufacturer: '',
    mounting: '',
    visibility: '',
    notes: '',
    clarification: '',
  });
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>('idle');
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null);

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
  const identifiedDefects = reportSections?.identifiedDefects ?? [];
  const highlightedSections = reportSections?.highlightedSections ?? [];
  const observationSchedule = reportSections?.observationSchedule?.items ?? [];
  const inspectionSchedule = reportSections?.inspectionSchedule?.items ?? [];
  const observationsAndRecommendations = reportSections?.observationsAndRecommendations?.items ?? [];
  const summaryComments = reportSections?.summaryOfCondition?.comments ?? [];
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
      setTrainingLabels({
        deviceType: '',
        manufacturer: '',
        mounting: '',
        visibility: '',
        notes: '',
        clarification: '',
      });
      setSubmissionStatus('idle');
      setSubmissionMessage(null);
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
      setSubmissionStatus('idle');
      setSubmissionMessage(null);

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
      setTrainingLabels((current) => ({
        ...current,
        manufacturer: payload.findings?.consumerUnit?.brand ?? current.manufacturer,
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
    setTrainingLabels({
      deviceType: '',
      manufacturer: '',
      mounting: '',
      visibility: '',
      notes: '',
      clarification: '',
    });
    setSubmissionStatus('idle');
    setSubmissionMessage(null);
  };

  const handleTrainingChange = (field: keyof TrainingLabels, value: string) => {
    setTrainingLabels((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmitTrainingSample = async () => {
    if (!state.imageDataUrl || !state.result) {
      setSubmissionStatus('error');
      setSubmissionMessage('Run analysis before submitting a training sample.');
      return;
    }

    setSubmissionStatus('submitting');
    setSubmissionMessage(null);

    try {
      const response = await fetch('/api/ai/submit-training-sample', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: state.imageDataUrl,
          labels: {
            deviceType: trainingLabels.deviceType,
            manufacturer: trainingLabels.manufacturer,
            mounting: trainingLabels.mounting,
            visibility: trainingLabels.visibility,
          },
          notes: trainingLabels.notes,
          clarification: trainingLabels.clarification,
          metadata: {
            fileName: state.fileName,
            source: 'ai-analysis-page',
            uploadedAt: new Date().toISOString(),
          },
          analysis: state.result,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to submit training sample.');
      }

      setSubmissionStatus('saved');
      setSubmissionMessage(`Training sample saved as ${payload.sampleId}.`);
    } catch (error) {
      setSubmissionStatus('error');
      setSubmissionMessage(error instanceof Error ? error.message : 'Failed to submit training sample.');
    }
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
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Identified defects</h3>
              {identifiedDefects.length > 0 ? (
                <div className="space-y-3">
                  {identifiedDefects.map((defect, index) => (
                    <div key={`${index}-${defect.item ?? defect.description ?? 'defect'}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-900">{formatValue(defect.item || defect.description)}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {[defect.code, defect.classification]
                          .map((value) => (typeof value === 'string' ? value.trim() : ''))
                          .filter(Boolean)
                          .join(' • ') || 'No classification provided'}
                      </p>
                      {defect.sourceText ? <p className="mt-2 text-xs text-slate-500">Source: {defect.sourceText}</p> : null}
                      {typeof defect.confidence === 'number' ? (
                        <p className="mt-1 text-xs text-slate-500">Confidence: {(defect.confidence * 100).toFixed(0)}%</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  No identified defects were returned.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Highlighted sections</h3>
              {highlightedSections.length > 0 ? (
                <div className="space-y-3">
                  {highlightedSections.map((section, index) => (
                    <div key={`${index}-${section.section ?? section.title ?? 'section'}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-900">{formatValue(section.section || section.title)}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{formatValue(section.content)}</p>
                      {section.reason ? <p className="mt-2 text-xs text-slate-500">Reason: {section.reason}</p> : null}
                      {typeof section.confidence === 'number' ? (
                        <p className="mt-1 text-xs text-slate-500">Confidence: {(section.confidence * 100).toFixed(0)}%</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  No highlighted sections were returned.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Observation schedule</h3>
              {observationSchedule.length > 0 ? (
                <div className="space-y-3">
                  {observationSchedule.map((item, index) => (
                    <div key={`${index}-${item.item ?? item.description ?? 'observation-schedule'}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-900">{getScheduleItemTitle(item)}</p>
                      <p className="mt-1 text-sm text-slate-600">{getScheduleItemMeta(item) || 'No outcome provided'}</p>
                      {item.comments ? <p className="mt-2 whitespace-pre-wrap text-xs text-slate-500">{item.comments}</p> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  No observation schedule items were returned.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Inspection schedule</h3>
              {inspectionSchedule.length > 0 ? (
                <div className="space-y-3">
                  {inspectionSchedule.map((item, index) => (
                    <div key={`${index}-${item.item ?? item.description ?? 'inspection-schedule'}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-900">{getScheduleItemTitle(item)}</p>
                      <p className="mt-1 text-sm text-slate-600">{getScheduleItemMeta(item) || 'No outcome provided'}</p>
                      {item.comments ? <p className="mt-2 whitespace-pre-wrap text-xs text-slate-500">{item.comments}</p> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  No inspection schedule items were returned.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Observations and recommendations</h3>
              {observationsAndRecommendations.length > 0 ? (
                <div className="space-y-3">
                  {observationsAndRecommendations.map((item, index) => (
                    <div key={`${index}-${item.observation ?? item.recommendation ?? 'recommendation'}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
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
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  No observations and recommendations were returned.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Summary comments</h3>
              {summaryComments.length > 0 ? (
                <div className="space-y-3">
                  {summaryComments.map((comment, index) => (
                    <div key={`${index}-${typeof comment === 'string' ? comment : comment.title ?? comment.comment ?? comment.text ?? 'comment'}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      {typeof comment === 'string' ? (
                        <p className="text-sm text-slate-900">{comment}</p>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-slate-900">{formatValue(comment.title || comment.comment || comment.text)}</p>
                          {comment.comment && comment.title && comment.comment !== comment.title ? (
                            <p className="mt-1 text-sm text-slate-700">{comment.comment}</p>
                          ) : null}
                          {comment.text && comment.text !== comment.comment && comment.text !== comment.title ? (
                            <p className="mt-1 text-sm text-slate-700">{comment.text}</p>
                          ) : null}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  No summary comments were returned.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Training sample review</h3>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-700">
                  The classifier returned a candidate result for this image. If the sample is unclear, correct the labels below and submit it as a training sample.
                </p>
                {needsHumanReview(state.result) ? (
                  <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    This image has been flagged for human review. Confirm or refine the device labels before submission.
                  </div>
                ) : null}

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Device type
                    </label>
                    <Input
                      value={trainingLabels.deviceType}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => handleTrainingChange('deviceType', event.target.value)}
                      placeholder="e.g. smoke_detector"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Manufacturer
                    </label>
                    <Input
                      value={trainingLabels.manufacturer}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => handleTrainingChange('manufacturer', event.target.value)}
                      placeholder="e.g. Apollo"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Mounting
                    </label>
                    <Input
                      value={trainingLabels.mounting}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => handleTrainingChange('mounting', event.target.value)}
                      placeholder="e.g. ceiling"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Visibility
                    </label>
                    <Input
                      value={trainingLabels.visibility}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => handleTrainingChange('visibility', event.target.value)}
                      placeholder="e.g. partial, clear"
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Clarification notes
                    </label>
                    <Textarea
                      value={trainingLabels.clarification}
                      onChange={(event: ChangeEvent<HTMLTextAreaElement>) => handleTrainingChange('clarification', event.target.value)}
                      placeholder="Why is this sample hard to classify? e.g. glare, partial occlusion, low contrast"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Additional training notes
                    </label>
                    <Textarea
                      value={trainingLabels.notes}
                      onChange={(event: ChangeEvent<HTMLTextAreaElement>) => handleTrainingChange('notes', event.target.value)}
                      placeholder="Any extra context to store with this training sample"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    onClick={handleSubmitTrainingSample}
                    disabled={submissionStatus === 'submitting'}
                  >
                    {submissionStatus === 'submitting' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Submit training sample
                  </Button>
                  <Button type="button" variant="outline" onClick={handleReset} disabled={submissionStatus === 'submitting'}>
                    Reset form
                  </Button>
                </div>

                {submissionMessage ? (
                  <div
                    className={`rounded-2xl border px-4 py-3 text-sm ${
                      submissionStatus === 'saved'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                        : 'border-red-200 bg-red-50 text-red-900'
                    }`}
                  >
                    {submissionMessage}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Report summary</h3>
              {reportSummary ? (
                typeof reportSummary === 'string' ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900">{reportSummary}</div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {Object.entries(reportSummary).map(([key, value]) => (
                      <div key={key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{toDisplayLabel(key)}</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{formatValue(value)}</p>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  No report summary was returned.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Supply characteristics and earthing arrangements
              </h3>
              {reportSections ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Gas main protective bonding present
                  </p>
                  <p className="mt-1 text-sm text-slate-900">{formatBoolean(gasBondingPresent)}</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  No supply characteristic section was returned.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Raw report sections</h3>
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
