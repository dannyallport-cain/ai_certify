export type FireAlarmDiagnosticMeasurementField = {
  id: string;
  label: string;
  unit: string;
  helpText: string;
};

export type FireAlarmDiagnosticPriority = 'low' | 'medium' | 'high';

export type FireAlarmDiagnosticFault = {
  id: string;
  title: string;
  symptoms: string[];
  likelyCauses: string[];
  safetyNotes: string[];
  testSteps: string[];
  expectedFindings: string[];
  actions: string[];
  escalationNotes: string[];
  measurementFocus?: FireAlarmDiagnosticMeasurementField[];
  tags?: string[];
};

export type FireAlarmDiagnosticCategory = {
  id: string;
  title: string;
  description: string;
  faults: FireAlarmDiagnosticFault[];
};

export type FireAlarmDiagnosticObservation =
  | 'zero-volts-both-cores'
  | 'low-resistance-ground'
  | 'open-loop-resistance'
  | 'current-imbalance'
  | 'head-removed'
  | 'weak-sounders'
  | 'loop-short-circuit'
  | 'intermittent-fault'
  | 'false-alarm-repeats'
  | 'battery-low'
  | 'network-offline';

export type FireAlarmDiagnosticSuggestion = {
  faultId: string;
  reason: string;
  nextAction: string;
  score?: number;
  categoryId?: string;
};

export type FireAlarmDiagnosticAssistantFeedback = {
  summary: string;
  probableCause: string;
  nextSteps: string[];
  suggestions: FireAlarmDiagnosticSuggestion[];
  source?: 'rules' | 'ai-worker';
  priority?: FireAlarmDiagnosticPriority;
  followUpQuestions?: string[];
  highlightedMeasurements?: string[];
};

export type FireAlarmDiagnosticAssistantRequest = {
  observations: FireAlarmDiagnosticObservation[];
  notes?: string;
  faultIds?: string[];
  measurements?: Record<string, string>;
};

export type FireAlarmDiagnosticTriageOption = {
  id: FireAlarmDiagnosticObservation;
  label: string;
  faultIds: string[];
  feedback: string;
  nextAction: string;
  priority: FireAlarmDiagnosticPriority;
  followUpQuestions?: string[];
};

export type FireAlarmDiagnosticFaultMatch = {
  category: FireAlarmDiagnosticCategory;
  fault: FireAlarmDiagnosticFault;
};

export interface FireAlarmDiagnosticsRepository {
  getCategories(): FireAlarmDiagnosticCategory[];
  getSafetyNotice(): string;
  getAllFaults(): FireAlarmDiagnosticFaultMatch[];
  getMeasurementFields(): FireAlarmDiagnosticMeasurementField[];
  getFaultsForObservations(
    observations: FireAlarmDiagnosticObservation[],
  ): FireAlarmDiagnosticFaultMatch[];
  getObservationFaultIds(observation: FireAlarmDiagnosticObservation): string[];
  getHighlightedMeasurementIdsForFaults(faultIds: string[]): string[];
  getFollowUpQuestionsForFaults(faultIds: string[]): string[];
  findFaultById(faultId: string): FireAlarmDiagnosticFaultMatch | null;
}

export interface FireAlarmDiagnosticsAssistant {
  getTriageOptions(): FireAlarmDiagnosticTriageOption[];
  suggestFromObservations(
    observations: FireAlarmDiagnosticObservation[],
  ): FireAlarmDiagnosticAssistantFeedback | null;
  suggestFromRequest?(
    request: FireAlarmDiagnosticAssistantRequest,
  ): Promise<FireAlarmDiagnosticAssistantFeedback | null>;
}