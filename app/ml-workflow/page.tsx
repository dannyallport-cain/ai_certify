import {
  runBuildIndexCommand,
  runEnqueueCommand,
  runExportReviewedCommand,
  runGenerateSplitsCommand,
  runInspectDuplicatesCommand,
  runMLWorkflowCommand,
  runMockInference,
  runNormalizeCommand,
} from './actions';
import MLWorkflowPageClient from './MLWorkflowPageClient';

export const metadata = {
  title: 'ML Workflow Manager',
  description:
    'Local dashboard for preparing datasets, running review/export commands, and previewing mock fire-alarm inference.',
};

export default async function MLWorkflowPage() {
  const [
    normalizeResult,
    enqueueResult,
    exportReviewedResult,
    buildIndexResult,
    generateSplitsResult,
    inspectDuplicatesResult,
    inferenceResult,
  ] = await Promise.all([
    runNormalizeCommand(),
    runEnqueueCommand(),
    runExportReviewedCommand(),
    runBuildIndexCommand(),
    runGenerateSplitsCommand(),
    runInspectDuplicatesCommand(),
    runMockInference({
      textInput: 'Apollo smoke detector near corridor exit with partial logo text visible.',
      fileName: 'apollo-detector-demo.jpg',
      mimeType: 'image/jpeg',
      imageWidth: 1920,
      imageHeight: 1080,
    }),
  ]);

  const commandResults = {
    normalize: normalizeResult,
    enqueue: enqueueResult,
    exportReviewed: exportReviewedResult,
    buildIndex: buildIndexResult,
    generateSplits: generateSplitsResult,
    inspectDuplicates: inspectDuplicatesResult,
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="space-y-2">
            <div className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
              Local ML operations
            </div>
            <h1 className="text-2xl font-semibold">Manage dataset prep, review export, and mock inference</h1>
            <p className="max-w-3xl text-sm text-slate-600">
              This page gives you a local control surface for the Fire Alarm RoomPlan ML workspace. It runs the current
              Python utilities, shows command output, documents the directory flow, and previews a mock inference
              response until real training and prediction services are added.
            </p>
          </div>
        </section>

        <MLWorkflowPageClient
          commandResults={commandResults}
          inferenceResult={inferenceResult}
          runCommandAction={runMLWorkflowCommand}
        />
      </div>
    </main>
  );
}
