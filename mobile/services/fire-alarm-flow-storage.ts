import { Directory, File, Paths } from 'expo-file-system';

import type { FireAlarmStepId } from '@/modules/fire-alarm-flow/steps';
import {
  buildPersistedFireAlarmFlow,
  hasMeaningfulFireAlarmFlow,
  parseStoredFireAlarmFlow,
  type PersistedFireAlarmFlow,
  type PersistedSurveyJob,
} from '@/services/fire-alarm-flow-payload';

/**
 * Fire alarm flow persistence.
 *
 * Leaving the app mid-survey used to lose which scan session was open and which
 * steps had been ticked. It now also carries the survey name and the ServiceM8
 * job the survey is being filed against, because those are chosen on the export
 * screen and must survive a trip back to the plan.
 *
 * Only ids and short labels are written — the room geometry, devices and plan
 * all live server-side against the session id.
 *
 * Stored in the same app-private `drafts` directory as the certificate draft,
 * which iOS protects with NSFileProtectionCompleteUntilFirstUserAuthentication.
 */

const FLOW_DIRECTORY_NAME = 'drafts';
const FLOW_FILE_NAME = 'fire-alarm-flow.json';

export interface SaveFireAlarmFlowInput {
  sessionId: string | null;
  completedSteps: FireAlarmStepId[];
  surveyName?: string | null;
  serviceM8Job?: PersistedSurveyJob | null;
}

function flowDirectory(): Directory {
  return new Directory(Paths.document, FLOW_DIRECTORY_NAME);
}

function flowFile(): File {
  return new File(flowDirectory(), FLOW_FILE_NAME);
}

export async function saveFireAlarmFlow(input: SaveFireAlarmFlowInput): Promise<void> {
  try {
    if (
      !hasMeaningfulFireAlarmFlow(
        input.sessionId,
        input.completedSteps,
        input.surveyName ?? null,
        input.serviceM8Job ?? null,
      )
    ) {
      await clearFireAlarmFlow({ notify: false });
      return;
    }

    const directory = flowDirectory();
    if (!directory.exists) {
      directory.create({ idempotent: true });
    }

    flowFile().write(
      JSON.stringify(
        buildPersistedFireAlarmFlow(input.sessionId, input.completedSteps, {
          surveyName: input.surveyName ?? null,
          serviceM8Job: input.serviceM8Job ?? null,
        }),
      ),
    );
  } catch (error) {
    console.warn('Unable to save the fire alarm flow:', error);
  }
}

export async function loadFireAlarmFlow(
  now = Date.now(),
): Promise<PersistedFireAlarmFlow | null> {
  try {
    const file = flowFile();
    if (!file.exists) {
      return null;
    }

    const result = parseStoredFireAlarmFlow(await file.text(), now);

    if (result.status === 'ok') {
      return result.flow;
    }

    await clearFireAlarmFlow({ notify: false });
    return null;
  } catch (error) {
    console.warn('Unable to read the fire alarm flow:', error);
    return null;
  }
}

type FlowClearedListener = () => void;

const clearedListeners = new Set<FlowClearedListener>();

export function onFireAlarmFlowCleared(listener: FlowClearedListener): () => void {
  clearedListeners.add(listener);
  return () => {
    clearedListeners.delete(listener);
  };
}

export async function clearFireAlarmFlow(options: { notify?: boolean } = {}): Promise<void> {
  const { notify = true } = options;

  try {
    const file = flowFile();
    if (file.exists) {
      file.delete();
    }
  } catch (error) {
    console.warn('Unable to clear the fire alarm flow:', error);
  }

  if (notify) {
    for (const listener of clearedListeners) {
      listener();
    }
  }
}
