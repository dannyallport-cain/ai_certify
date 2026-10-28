import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import type { FireAlarmStepId } from '@/modules/fire-alarm-flow/steps';
import type { PersistedSurveyJob } from '@/services/fire-alarm-flow-payload';
import {
  loadFireAlarmFlow,
  onFireAlarmFlowCleared,
  saveFireAlarmFlow,
} from '@/services/fire-alarm-flow-storage';
import { FireAlarmFlowContext, type FireAlarmFlowValue } from './flow-context';

/** Collapses rapid step ticks into one write. */
const FLOW_SAVE_DEBOUNCE_MS = 500;

interface FlowSnapshot {
  sessionId: string | null;
  completedSteps: FireAlarmStepId[];
  surveyName: string | null;
  serviceM8Job: PersistedSurveyJob | null;
}

/**
 * Survives navigation between the five capture steps so a session, the steps
 * already finished, the survey name and the chosen ServiceM8 job are not lost
 * when the engineer moves forward or back — and, since they are written to disk,
 * not lost when iOS terminates the app in the background either.
 */
export function FireAlarmFlowProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionIdState] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<FireAlarmStepId[]>([]);
  const [surveyName, setSurveyNameState] = useState<string | null>(null);
  const [serviceM8Job, setServiceM8JobState] = useState<PersistedSurveyJob | null>(null);
  const [savedSurveyId, setSavedSurveyIdState] = useState<number | null>(null);

  const restoredRef = useRef(false);
  const userActedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flowRef = useRef<FlowSnapshot>({
    sessionId,
    completedSteps,
    surveyName,
    serviceM8Job,
  });

  useEffect(() => {
    flowRef.current = { sessionId, completedSteps, surveyName, serviceM8Job };
  }, [completedSteps, serviceM8Job, sessionId, surveyName]);

  useEffect(() => {
    let cancelled = false;

    loadFireAlarmFlow()
      .then((flow) => {
        if (cancelled || !flow || userActedRef.current) {
          return;
        }

        setSessionIdState(flow.sessionId);
        setCompletedSteps(flow.completedSteps);
        setSurveyNameState(flow.surveyName);
        setServiceM8JobState(flow.serviceM8Job);
      })
      .catch((error) => {
        console.warn('Fire alarm flow restore skipped:', error);
      })
      .finally(() => {
        if (!cancelled) {
          restoredRef.current = true;
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Signing out wipes the flow on disk; mirror that in memory.
  useEffect(
    () =>
      onFireAlarmFlowCleared(() => {
        restoredRef.current = false;
        setSessionIdState(null);
        setCompletedSteps([]);
        setSurveyNameState(null);
        setServiceM8JobState(null);
        setSavedSurveyIdState(null);
        setTimeout(() => {
          restoredRef.current = true;
        }, 0);
      }),
    [],
  );

  useEffect(() => {
    if (!restoredRef.current) {
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      void saveFireAlarmFlow(flowRef.current);
    }, FLOW_SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [completedSteps, serviceM8Job, sessionId, surveyName]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active' || !restoredRef.current) {
        return;
      }

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      void saveFireAlarmFlow(flowRef.current);
    });

    return () => subscription.remove();
  }, []);

  const markStepComplete = useCallback((step: FireAlarmStepId) => {
    userActedRef.current = true;
    setCompletedSteps((current) => (current.includes(step) ? current : [...current, step]));
  }, []);

  const selectSession = useCallback((nextSessionId: string | null) => {
    userActedRef.current = true;
    setSessionIdState(nextSessionId);
  }, []);

  const setSurveyName = useCallback((name: string | null) => {
    userActedRef.current = true;
    const trimmed = name?.trim() ?? '';
    setSurveyNameState(trimmed.length > 0 ? trimmed : null);
  }, []);

  const setServiceM8Job = useCallback((job: PersistedSurveyJob | null) => {
    userActedRef.current = true;
    setServiceM8JobState(job);
  }, []);

  const setSavedSurveyId = useCallback((surveyId: number | null) => {
    setSavedSurveyIdState(surveyId);
  }, []);

  const isStepComplete = useCallback(
    (step: FireAlarmStepId) => completedSteps.includes(step),
    [completedSteps],
  );

  const resetFlow = useCallback(() => {
    userActedRef.current = true;
    setSessionIdState(null);
    setCompletedSteps([]);
    setSurveyNameState(null);
    setServiceM8JobState(null);
    setSavedSurveyIdState(null);
  }, []);

  const value = useMemo<FireAlarmFlowValue>(
    () => ({
      sessionId,
      completedSteps,
      surveyName,
      serviceM8Job,
      savedSurveyId,
      setSessionId: selectSession,
      markStepComplete,
      isStepComplete,
      setSurveyName,
      setServiceM8Job,
      setSavedSurveyId,
      resetFlow,
    }),
    [
      completedSteps,
      isStepComplete,
      markStepComplete,
      resetFlow,
      savedSurveyId,
      selectSession,
      serviceM8Job,
      setSavedSurveyId,
      setServiceM8Job,
      setSurveyName,
      sessionId,
      surveyName,
    ],
  );

  return (
    <FireAlarmFlowContext.Provider value={value}>{children}</FireAlarmFlowContext.Provider>
  );
}

export default FireAlarmFlowProvider;
