'use client';

import MLWorkflowManager from '@/components/ai/MLWorkflowManager';
import type { MLWorkflowCommandId, MLWorkflowCommandResult, MockInferenceResult } from './actions';

type MLWorkflowPageClientProps = {
  commandResults: Record<MLWorkflowCommandId, MLWorkflowCommandResult>;
  inferenceResult: MockInferenceResult;
  runCommandAction: (commandId: MLWorkflowCommandId) => Promise<MLWorkflowCommandResult>;
};

export default function MLWorkflowPageClient({
  commandResults,
  inferenceResult,
  runCommandAction,
}: MLWorkflowPageClientProps) {
  const handleRunCommand = async (commandId: string) => {
    return runCommandAction(commandId as MLWorkflowCommandId);
  };

  return (
    <MLWorkflowManager
      commandResults={commandResults}
      inferenceResult={inferenceResult}
      onRunCommand={handleRunCommand}
    />
  );
}
