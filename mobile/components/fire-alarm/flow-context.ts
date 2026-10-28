import { createContext } from 'react';

import type { FireAlarmStepId } from '@/modules/fire-alarm-flow/steps';
import type { PersistedSurveyJob } from '@/services/fire-alarm-flow-payload';

export interface FireAlarmFlowValue {
  /** Session currently being worked on, if a scan has produced one. */
  sessionId: string | null;
  /** Steps the engineer has finished, used to tick the rail. */
  completedSteps: FireAlarmStepId[];
  /** The name the engineer gave this survey; falls back to the capture name. */
  surveyName: string | null;
  /** The ServiceM8 job the survey is filed against, chosen on the export step. */
  serviceM8Job: PersistedSurveyJob | null;
  /** The id the server assigned when the survey was last saved, or null. */
  savedSurveyId: number | null;
  setSessionId: (sessionId: string | null) => void;
  markStepComplete: (step: FireAlarmStepId) => void;
  isStepComplete: (step: FireAlarmStepId) => boolean;
  setSurveyName: (name: string | null) => void;
  setServiceM8Job: (job: PersistedSurveyJob | null) => void;
  setSavedSurveyId: (surveyId: number | null) => void;
  resetFlow: () => void;
}

export const FireAlarmFlowContext = createContext<FireAlarmFlowValue | null>(null);
