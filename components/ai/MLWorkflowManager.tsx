'use client';

import { useMemo, useState } from 'react';
import {
  Bot,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Database,
  Eye,
  FileCode2,
  FileSearch,
  FolderTree,
  LayoutDashboard,
  Loader2,
  Play,
  ScanSearch,
  Sparkles,
  TerminalSquare,
  WandSparkles,
  XCircle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

type CommandResult = {
  command: string;
  status: 'idle' | 'success' | 'error';
  output: string | null;
};

type InferenceResult = {
  summary: string;
  predictedDeviceType: string;
  predictedManufacturer: string;
  confidence: number;
  ocrText: string;
};

type MLWorkflowManagerProps = {
  commandResults: Record<string, CommandResult>;
  onRunCommand?: (commandId: string) => Promise<CommandResult>;
  inferenceResult?: InferenceResult | null;
};

const COMMANDS = [
  {
    id: 'normalize',
    title: 'Normalize records',
    description: 'Standardize review records into a consistent training format.',
    icon: Database,
    hint: 'ml/tools/normalize_records.py',
  },
  {
    id: 'enqueue',
    title: 'Enqueue review batch',
    description: 'Push newly prepared samples into the review queue.',
    icon: Clock3,
    hint: 'ml/tools/enqueue_review.py',
  },
  {
    id: 'exportReviewed',
    title: 'Export reviewed labels',
    description: 'Collect reviewed annotations for downstream dataset builds.',
    icon: FileSearch,
    hint: 'ml/tools/export_reviewed.py',
  },
  {
    id: 'buildIndex',
    title: 'Build dataset index',
    description: 'Create a searchable manifest of training assets and metadata.',
    icon: FolderTree,
    hint: 'ml/tools/build_dataset_index.py',
  },
  {
    id: 'generateSplits',
    title: 'Generate train/val/test splits',
    description: 'Produce deterministic dataset splits for experimentation.',
    icon: BrainCircuit,
    hint: 'ml/tools/generate_splits.py',
  },
  {
    id: 'inspectDuplicates',
    title: 'Inspect duplicates',
    description: 'Surface likely duplicate captures before training or QA.',
    icon: ScanSearch,
    hint: 'ml/tools/inspect_duplicates.py',
  },
] as const;

const PIPELINE_STEPS = [
  'Capture RoomPlan scans and related fire-alarm photos',
  'Normalize records into a stable schema',
  'Queue uncertain items for human review',
  'Export reviewed samples into dataset snapshots',
  'Build dataset indexes and manifests',
  'Generate dataset splits for training experiments',
  'Inspect duplicates before retraining or release',
];

const DIRECTORY_MAP = [
  { label: 'ML root', path: 'ml/' },
  { label: 'Tooling', path: 'ml/tools/' },
  { label: 'Datasets', path: 'ml/datasets/' },
  { label: 'Normalized records', path: 'ml/datasets/normalized/' },
  { label: 'Review queue', path: 'ml/datasets/review_queue/' },
  { label: 'Reviewed exports', path: 'ml/datasets/reviewed/' },
  { label: 'Indexes and splits', path: 'ml/datasets/indexes/' },
];

const SAMPLE_CAPTURE_JSON = `{
  "scanId": "roomplan-2026-01-14-001",
  "propertyId": "site-warehouse-04",
  "deviceCandidate": {
    "deviceType": "manual_call_point",
    "manufacturer": "apollo",
    "locationHint": "ground-floor exit corridor"
  },
  "sourceAssets": {
    "roomplanFile": "captures/roomplan/site-warehouse-04/scan-001.usdz",
    "photoFile": "captures/images/site-warehouse-04/device-001.jpg"
  },
  "notes": [
    "ceiling height approx 3.2m",
    "glare present on housing"
  ]
}`;

const SAMPLE_LABEL_JSON = `{
  "sampleId": "sample-fire-alarm-001",
  "status": "reviewed",
  "predictedDeviceType": "smoke_detector",
  "predictedManufacturer": "honeywell",
  "confirmedLabel": {
    "deviceType": "smoke_detector",
    "manufacturer": "honeywell",
    "mounting": "ceiling",
    "visibility": "partial"
  },
  "reviewMetadata": {
    "reviewedBy": "local-admin",
    "reviewedAt": "2026-01-14T09:30:00Z"
  }
}`;

function getStatusBadgeVariant(status: CommandResult['status']) {
  if (status === 'success') {
    return 'default';
  }

  if (status === 'error') {
    return 'destructive';
  }

  return 'outline';
}

function getStatusLabel(status: CommandResult['status']) {
  if (status === 'success') {
    return 'Completed';
  }

  if (status === 'error') {
    return 'Failed';
  }

  return 'Idle';
}

function getStatusIcon(status: CommandResult['status']) {
  if (status === 'success') {
    return CheckCircle2;
  }

  if (status === 'error') {
    return XCircle;
  }

  return TerminalSquare;
}

export default function MLWorkflowManager({
  commandResults,
  onRunCommand,
  inferenceResult = null,
}: MLWorkflowManagerProps) {
  const [selectedCommandId, setSelectedCommandId] = useState<string>('normalize');
  const [inferenceInput, setInferenceInput] = useState(
    'Fire alarm ceiling device near lobby entrance, white circular housing, faint APOLLO text visible.',
  );
  const [localCommandResults, setLocalCommandResults] = useState<Record<string, CommandResult>>(commandResults);
  const [loadingCommandIds, setLoadingCommandIds] = useState<Record<string, boolean>>({});

  const selectedCommandResult = localCommandResults[selectedCommandId] ?? {
    command: selectedCommandId,
    status: 'idle' as const,
    output: null,
  };

  const summary = useMemo(() => {
    const results = COMMANDS.map((command) => localCommandResults[command.id]).filter(Boolean);
    const successful = results.filter((result) => result.status === 'success').length;
    const failed = results.filter((result) => result.status === 'error').length;

    return {
      total: COMMANDS.length,
      successful,
      failed,
      ready: COMMANDS.length - successful - failed,
    };
  }, [localCommandResults]);

  const handleRunCommand = async (commandId: string) => {
    if (!onRunCommand || loadingCommandIds[commandId]) {
      return;
    }

    setSelectedCommandId(commandId);
    setLoadingCommandIds((current) => ({
      ...current,
      [commandId]: true,
    }));

    try {
      const result = await onRunCommand(commandId);

      setLocalCommandResults((current) => ({
        ...current,
        [commandId]: result,
      }));
      setSelectedCommandId(commandId);
    } catch (error) {
      setLocalCommandResults((current) => ({
        ...current,
        [commandId]: {
          command: commandId,
          status: 'error',
          output: error instanceof Error ? error.message : 'Failed to run command.',
        },
      }));
      setSelectedCommandId(commandId);
    } finally {
      setLoadingCommandIds((current) => ({
        ...current,
        [commandId]: false,
      }));
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-sm">
        <div className="grid gap-6 p-6 md:grid-cols-[1.5fr_1fr] md:p-8">
          <div className="space-y-4">
            <Badge variant="secondary" className="w-fit border-white/10 bg-white/10 text-white hover:bg-white/10">
              <LayoutDashboard className="mr-1 h-3.5 w-3.5" />
              Local ML workflow dashboard
            </Badge>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Fire-alarm RoomPlan ML workflow manager</h1>
              <p className="max-w-2xl text-sm text-slate-300 md:text-base">
                Run local dataset preparation utilities, inspect working directories, review schema templates, and
                validate a mock inference response before wiring in real training or prediction services.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-slate-300">
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Workspace: ml/</div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Scope: local-only admin</div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Inference: mock response</div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Successful</p>
              <p className="mt-2 text-3xl font-semibold">{summary.successful}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Failed</p>
              <p className="mt-2 text-3xl font-semibold">{summary.failed}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Not run yet</p>
              <p className="mt-2 text-3xl font-semibold">{summary.ready}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <WandSparkles className="h-5 w-5 text-slate-500" />
              <CardTitle>Pipeline overview</CardTitle>
            </div>
            <CardDescription>
              The local workflow mirrors how RoomPlan captures become labeled ML-ready records for fire-alarm model
              development.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {PIPELINE_STEPS.map((step, index) => (
                <div key={step} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                      {index + 1}
                    </div>
                    <p className="pt-1 text-sm text-slate-700">{step}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-slate-500" />
              <CardTitle>Directory map</CardTitle>
            </div>
            <CardDescription>Quick reference for the local folders touched by the workflow utilities.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {DIRECTORY_MAP.map((entry) => (
              <div key={entry.path} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{entry.label}</p>
                <code className="mt-1 block text-sm text-slate-900">{entry.path}</code>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <TerminalSquare className="h-5 w-5 text-slate-500" />
              <CardTitle>Command runner</CardTitle>
            </div>
            <CardDescription>
              Trigger the local Python utilities from a page-level handler and stream the result back into these cards.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            {COMMANDS.map((command) => {
              const result = localCommandResults[command.id] ?? {
                command: command.id,
                status: 'idle' as const,
                output: null,
              };
              const isLoading = Boolean(loadingCommandIds[command.id]);
              const Icon = command.icon;
              const StatusIcon = getStatusIcon(isLoading ? 'idle' : result.status);
              const isSelected = selectedCommandId === command.id;

              return (
                <div
                  key={command.id}
                  className={[
                    'rounded-2xl border p-4 transition-colors',
                    isSelected ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">{command.title}</h3>
                          <p className="text-xs text-slate-500">{command.hint}</p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600">{command.description}</p>
                    </div>

                    <Badge variant={isLoading ? 'outline' : getStatusBadgeVariant(result.status)}>
                      <StatusIcon className="mr-1 h-3.5 w-3.5" />
                      {isLoading ? 'Running...' : getStatusLabel(result.status)}
                    </Badge>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      disabled={!onRunCommand || isLoading}
                      onClick={() => {
                        void handleRunCommand(command.id);
                      }}
                    >
                      <Play className="h-4 w-4" />
                      Run
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setSelectedCommandId(command.id)}>
                      Inspect output
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <FileCode2 className="h-5 w-5 text-slate-500" />
              <CardTitle>Selected command output</CardTitle>
            </div>
            <CardDescription>Focused view for the currently selected workflow utility.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Command</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{selectedCommandResult.command}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</p>
                <Badge
                  variant={
                    loadingCommandIds[selectedCommandId]
                      ? 'outline'
                      : getStatusBadgeVariant(selectedCommandResult.status)
                  }
                >
                  {loadingCommandIds[selectedCommandId] ? 'Running...' : getStatusLabel(selectedCommandResult.status)}
                </Badge>
              </div>
              <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
                {loadingCommandIds[selectedCommandId]
                  ? 'Running command...'
                  : selectedCommandResult.output ?? 'No output captured yet. Run a command to inspect logs or summaries here.'}
              </pre>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Tabs defaultValue="templates" className="w-full">
          <TabsList className="h-auto flex-wrap justify-start gap-2 rounded-2xl bg-slate-100 p-2">
            <TabsTrigger value="templates">Sample JSON templates</TabsTrigger>
            <TabsTrigger value="inference">Mock inference panel</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="mt-4">
            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="rounded-3xl border-slate-200 shadow-sm">
                <CardHeader className="space-y-2">
                  <CardTitle>Capture payload template</CardTitle>
                  <CardDescription>
                    Example metadata a local RoomPlan or photo ingestion step could persist before normalization.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea value={SAMPLE_CAPTURE_JSON} readOnly className="min-h-[320px] font-mono text-xs" />
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-slate-200 shadow-sm">
                <CardHeader className="space-y-2">
                  <CardTitle>Reviewed label template</CardTitle>
                  <CardDescription>
                    Example reviewed annotation shape that can later feed indexing and train/validation split generation.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea value={SAMPLE_LABEL_JSON} readOnly className="min-h-[320px] font-mono text-xs" />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="inference" className="mt-4">
            <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
              <Card className="rounded-3xl border-slate-200 shadow-sm">
                <CardHeader className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-slate-500" />
                    <CardTitle>Inference request draft</CardTitle>
                  </div>
                  <CardDescription>
                    This input area is local UI state only. A page can later forward the text to a mock or real inference
                    action.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-900">Device description</label>
                    <Textarea
                      value={inferenceInput}
                      onChange={(event) => setInferenceInput(event.target.value)}
                      placeholder="Describe a fire-alarm device, RoomPlan clue, or OCR hint..."
                      className="min-h-[180px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-900">Optional sample identifier</label>
                    <Input value="roomplan-local-preview-001" readOnly />
                  </div>

                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                    Use the page container to wire this text into a server action when ready. The component intentionally
                    stays backend-agnostic except for the provided props.
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-slate-200 shadow-sm">
                <CardHeader className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-slate-500" />
                    <CardTitle>Mock inference response</CardTitle>
                  </div>
                  <CardDescription>
                    Rendered from the <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">inferenceResult</code>{' '}
                    prop so the parent page can supply deterministic fake predictions.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {inferenceResult ? (
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Predicted device</p>
                          <p className="mt-1 text-sm font-medium text-slate-900">{inferenceResult.predictedDeviceType}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Manufacturer</p>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {inferenceResult.predictedManufacturer}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Confidence</p>
                          <div className="mt-2 flex items-center gap-3">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                              <div
                                className="h-full rounded-full bg-slate-900"
                                style={{ width: `${Math.max(0, Math.min(100, inferenceResult.confidence * 100))}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-slate-900">
                              {(inferenceResult.confidence * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Summary</p>
                        <p className="mt-1 text-sm text-slate-900">{inferenceResult.summary}</p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">OCR text</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{inferenceResult.ocrText}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                      <Loader2 className="h-6 w-6 text-slate-400" />
                      <p className="mt-3 text-sm font-medium text-slate-900">No inference result yet</p>
                      <p className="mt-1 max-w-md text-sm text-slate-600">
                        Pass an <code className="rounded bg-slate-200 px-1 py-0.5 text-xs">inferenceResult</code> prop
                        from the page to preview the local mock prediction UI.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}