'use server';

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import 'server-only';

const execFileAsync = promisify(execFile);

const PROJECT_ROOT = '/Users/admin/Development/ai_certify';
const DATASETS_ROOT = 'ml/datasets';
const RAW_RECORDS_DIR = `${DATASETS_ROOT}/raw-records`;
const NORMALIZED_DIR = `${DATASETS_ROOT}/normalized`;
const REVIEW_QUEUE_DIR = `${DATASETS_ROOT}/review-queue`;
const REVIEWED_DIR = `${DATASETS_ROOT}/reviewed`;
const EXPORTS_DIR = `${DATASETS_ROOT}/exports`;
const INDEX_OUTPUT_PATH = `${EXPORTS_DIR}/dataset-index.json`;
const SPLITS_OUTPUT_DIR = `${EXPORTS_DIR}/splits`;
const DUPLICATES_OUTPUT_PATH = `${EXPORTS_DIR}/duplicate-report.json`;
const SOURCE_REGISTRY_PATH = 'ml/configs/sources/approved_sources.yaml';

export type MLWorkflowCommandId =
  | 'normalize'
  | 'enqueue'
  | 'exportReviewed'
  | 'buildIndex'
  | 'generateSplits'
  | 'inspectDuplicates';

export type MLWorkflowCommandResult = {
  command: string;
  status: 'idle' | 'success' | 'error';
  output: string | null;
};

export type MockInferenceResult = {
  summary: string;
  predictedDeviceType: string;
  predictedManufacturer: string;
  confidence: number;
  ocrText: string;
};

type MockInferenceInput = {
  textInput?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
};

type CommandConfig = {
  scriptPath: string;
  args: string[];
};

const COMMAND_CONFIGS: Record<MLWorkflowCommandId, CommandConfig> = {
  normalize: {
    scriptPath: 'ml/tools/normalize_records.py',
    args: [RAW_RECORDS_DIR, NORMALIZED_DIR],
  },
  enqueue: {
    scriptPath: 'ml/tools/enqueue_review.py',
    args: [NORMALIZED_DIR, REVIEW_QUEUE_DIR, '--source-registry', SOURCE_REGISTRY_PATH],
  },
  exportReviewed: {
    scriptPath: 'ml/tools/export_reviewed.py',
    args: [REVIEW_QUEUE_DIR, REVIEWED_DIR, '--manifest', `${EXPORTS_DIR}/reviewed-manifest.json`],
  },
  buildIndex: {
    scriptPath: 'ml/tools/build_dataset_index.py',
    args: [DATASETS_ROOT, INDEX_OUTPUT_PATH],
  },
  generateSplits: {
    scriptPath: 'ml/tools/generate_splits.py',
    args: [DATASETS_ROOT, SPLITS_OUTPUT_DIR, '--seed', '42'],
  },
  inspectDuplicates: {
    scriptPath: 'ml/tools/inspect_duplicates.py',
    args: [DATASETS_ROOT, DUPLICATES_OUTPUT_PATH],
  },
};

function buildResult(
  command: string,
  status: MLWorkflowCommandResult['status'],
  output: string | null
): MLWorkflowCommandResult {
  return { command, status, output };
}

function truncateOutput(output: string): string {
  const trimmed = output.trim();
  if (trimmed.length <= 12000) {
    return trimmed;
  }

  return `${trimmed.slice(0, 12000)}\n\n[output truncated]`;
}

async function runPythonTool(commandId: MLWorkflowCommandId): Promise<MLWorkflowCommandResult> {
  const config = COMMAND_CONFIGS[commandId];

  try {
    const { stdout, stderr } = await execFileAsync('python3', [config.scriptPath, ...config.args], {
      cwd: PROJECT_ROOT,
      timeout: 120_000,
      maxBuffer: 1024 * 1024 * 4,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
        PYTHONPATH: PROJECT_ROOT,
      },
    });

    const combinedOutput = [stdout, stderr].filter(Boolean).join('\n').trim();

    return buildResult(
      commandId,
      'success',
      combinedOutput ? truncateOutput(combinedOutput) : `Command "${commandId}" completed successfully.`
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Unknown command execution error';

    const stderr =
      typeof error === 'object' && error !== null && 'stderr' in error ? String(error.stderr ?? '') : '';
    const stdout =
      typeof error === 'object' && error !== null && 'stdout' in error ? String(error.stdout ?? '') : '';

    const combinedOutput = [message, stdout, stderr].filter(Boolean).join('\n\n');

    return buildResult(commandId, 'error', truncateOutput(combinedOutput || `Command "${commandId}" failed.`));
  }
}

export async function runMLWorkflowCommand(commandId: MLWorkflowCommandId): Promise<MLWorkflowCommandResult> {
  return runPythonTool(commandId);
}

export async function runNormalizeCommand(): Promise<MLWorkflowCommandResult> {
  return runPythonTool('normalize');
}

export async function runEnqueueCommand(): Promise<MLWorkflowCommandResult> {
  return runPythonTool('enqueue');
}

export async function runExportReviewedCommand(): Promise<MLWorkflowCommandResult> {
  return runPythonTool('exportReviewed');
}

export async function runBuildIndexCommand(): Promise<MLWorkflowCommandResult> {
  return runPythonTool('buildIndex');
}

export async function runGenerateSplitsCommand(): Promise<MLWorkflowCommandResult> {
  return runPythonTool('generateSplits');
}

export async function runInspectDuplicatesCommand(): Promise<MLWorkflowCommandResult> {
  return runPythonTool('inspectDuplicates');
}

function hashString(input: string): number {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }

  return hash;
}

export async function runMockInference(input: MockInferenceInput): Promise<MockInferenceResult> {
  const normalizedText = (input.textInput ?? '').trim();
  const fingerprint = [
    normalizedText.toLowerCase(),
    (input.fileName ?? '').toLowerCase(),
    (input.mimeType ?? '').toLowerCase(),
    String(input.imageWidth ?? ''),
    String(input.imageHeight ?? ''),
  ].join('|');

  const hash = hashString(fingerprint || 'mock-default');
  const manufacturers = ['Apollo', 'Gent', 'Advanced', 'C-Tec', 'Hochiki', 'Notifier'];
  const deviceTypes = ['Smoke Detector', 'Heat Detector', 'Manual Call Point', 'Sounder', 'Interface Module'];

  const predictedManufacturer = manufacturers[hash % manufacturers.length];
  const predictedDeviceType = deviceTypes[(hash >> 3) % deviceTypes.length];
  const confidence = Number((0.61 + ((hash % 34) / 100)).toFixed(2));
  const ocrText =
    normalizedText ||
    `MOCK OCR: ${input.fileName || 'unlabelled-device'} ${input.imageWidth ?? 0}x${input.imageHeight ?? 0}`.trim();

  return {
    summary: `Mock inference only: predicted ${predictedManufacturer} ${predictedDeviceType} from local placeholder input.`,
    predictedDeviceType,
    predictedManufacturer,
    confidence,
    ocrText,
  };
}
