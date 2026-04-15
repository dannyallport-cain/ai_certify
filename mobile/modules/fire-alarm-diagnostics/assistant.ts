import { getFireAlarmDiagnosticsFeedback } from '@/services/api';

import { StaticFireAlarmDiagnosticsRepository } from './repository';
import type {
  FireAlarmDiagnosticAssistantFeedback,
  FireAlarmDiagnosticAssistantRequest,
  FireAlarmDiagnosticObservation,
  FireAlarmDiagnosticPriority,
  FireAlarmDiagnosticSuggestion,
  FireAlarmDiagnosticTriageOption,
  FireAlarmDiagnosticsAssistant,
  FireAlarmDiagnosticsRepository,
} from './types';

const triageOptions: FireAlarmDiagnosticTriageOption[] = [
  {
    id: 'zero-volts-both-cores',
    label: '0V on both cores',
    faultIds: ['panel-supply-fault', 'open-circuit-loop'],
    feedback:
      'Loss of feed is more likely than a local device fault. Check panel or PSU output first, then work outwards to the first healthy point.',
    nextAction:
      'Measure outgoing panel voltage, confirm protective device and fused spur, then split the loop or circuit to find where supply is lost.',
    priority: 'high',
  },
  {
    id: 'low-resistance-ground',
    label: 'Low resistance to ground',
    faultIds: ['earth-fault', 'communication-network-fault'],
    feedback:
      'A conductor leaking to earth is likely. Damp joints, screens, glands, and damaged insulation are common causes.',
    nextAction:
      'Isolate the affected circuit, measure positive-to-earth and negative-to-earth separately, divide the wiring, and inspect damp or damaged sections.',
    priority: 'high',
  },
  {
    id: 'open-loop-resistance',
    label: 'Open loop resistance',
    faultIds: ['open-circuit-loop', 'device-missing-removed-head'],
    feedback:
      'An open conductor, loose termination, or missing head/base connection is likely interrupting the circuit.',
    nextAction:
      'Check the last healthy device, inspect isolators and terminations, then continuity-test each leg until the break is narrowed down.',
    priority: 'high',
  },
  {
    id: 'current-imbalance',
    label: 'Current imbalance on + / -',
    faultIds: ['high-resistance-fault', 'open-circuit-loop', 'battery-charger-fault'],
    feedback:
      'Current not balancing between outgoing and return paths often points to a poor connection, partial open, or loading issue.',
    nextAction:
      'Measure voltage drop under load, remake suspect joints, and confirm whether the imbalance follows one section or one output.',
    priority: 'medium',
  },
  {
    id: 'head-removed',
    label: 'Head removed / missing address',
    faultIds: ['device-missing-removed-head'],
    feedback:
      'This is usually a local detector or base issue rather than a full loop failure, provided voltage is present at the base.',
    nextAction:
      'Confirm correct head type, inspect base contacts, refit or substitute with a known good compatible detector, then retest the address.',
    priority: 'medium',
  },
  {
    id: 'weak-sounders',
    label: 'Weak or failed sounders',
    faultIds: ['sounder-circuit-fault', 'high-resistance-fault'],
    feedback:
      'Look for voltage drop, overload, incorrect EOL, or a high-resistance joint on the sounder circuit.',
    nextAction:
      'Measure standby and alarm voltage at panel and far end, verify the EOL, and compare circuit current with panel output capacity.',
    priority: 'medium',
  },
  {
    id: 'loop-short-circuit',
    label: 'Low Ω / short on loop pair',
    faultIds: ['short-circuit-loop', 'earth-fault'],
    feedback:
      'A shorted or heavily loaded loop section is likely. Isolators may already be segmenting the faulted section.',
    nextAction:
      'Measure resistance between positive and negative, split the loop in stages, and confirm the healthy section recovers normal voltage when the suspect section is removed.',
    priority: 'high',
  },
  {
    id: 'intermittent-fault',
    label: 'Intermittent or self-clearing fault',
    faultIds: ['intermittent-fault', 'high-resistance-fault'],
    feedback:
      'An unstable joint, moisture path, or marginal module is likely if the fault clears before arrival and returns under changing conditions.',
    nextAction:
      'Check the history log, capture baseline readings while healthy, and divide the circuit or substitute one suspect device at a time.',
    priority: 'medium',
  },
  {
    id: 'false-alarm-repeats',
    label: 'Repeated false alarms',
    faultIds: ['detector-contamination-false-alarm'],
    feedback:
      'Repeated unwanted alarms usually point to detector contamination, unsuitable detector technology, or environmental influences rather than a loop wiring fault.',
    nextAction:
      'Review the alarm history, inspect the local environment, check analogue values if supported, then clean or replace the detector and reassess siting.',
    priority: 'medium',
  },
  {
    id: 'battery-low',
    label: 'Battery low / charger warning',
    faultIds: ['battery-charger-fault', 'panel-supply-fault'],
    feedback:
      'The standby supply may be degraded due to aged batteries, poor charging voltage, loose links, or PSU regulation issues.',
    nextAction:
      'Measure charger output, individual battery voltages, and loaded battery voltage during a controlled mains-fail condition if permitted.',
    priority: 'high',
  },
  {
    id: 'network-offline',
    label: 'Network node offline',
    faultIds: ['communication-network-fault'],
    feedback:
      'The fault may be on the network physical layer, addressing, or interface hardware rather than on the local detection loop.',
    nextAction:
      'Check addressing, pair continuity, polarity, resistance to earth, and any converter or network card supply before changing database configuration.',
    priority: 'medium',
  },
];

const priorityRank: Record<FireAlarmDiagnosticPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

type RankedSuggestion = FireAlarmDiagnosticSuggestion & {
  matchedObservationIds: FireAlarmDiagnosticObservation[];
  matchedSignals: number;
};

function dedupeStrings(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function rankSuggestions(
  suggestions: RankedSuggestion[],
  repository: FireAlarmDiagnosticsRepository,
): FireAlarmDiagnosticSuggestion[] {
  return suggestions
    .map((suggestion) => {
      const match = repository.findFaultById(suggestion.faultId);

      return {
        faultId: suggestion.faultId,
        reason: suggestion.reason,
        nextAction: suggestion.nextAction,
        score: suggestion.score,
        categoryId: match?.category.id,
        matchedSignals: suggestion.matchedSignals,
        tagCount: match?.fault.tags?.length ?? 0,
      };
    })
    .sort((left, right) => {
      if ((right.score ?? 0) !== (left.score ?? 0)) {
        return (right.score ?? 0) - (left.score ?? 0);
      }

      if ((right.matchedSignals ?? 0) !== (left.matchedSignals ?? 0)) {
        return (right.matchedSignals ?? 0) - (left.matchedSignals ?? 0);
      }

      if ((right.tagCount ?? 0) !== (left.tagCount ?? 0)) {
        return (right.tagCount ?? 0) - (left.tagCount ?? 0);
      }

      return left.faultId.localeCompare(right.faultId);
    })
    .map(({ matchedSignals: _matchedSignals, tagCount: _tagCount, ...suggestion }) => suggestion);
}

export class RuleBasedFireAlarmDiagnosticsAssistant implements FireAlarmDiagnosticsAssistant {
  constructor(
    private readonly repository: FireAlarmDiagnosticsRepository = new StaticFireAlarmDiagnosticsRepository(),
  ) {}

  async suggestFromRequest(
    request: FireAlarmDiagnosticAssistantRequest,
  ): Promise<FireAlarmDiagnosticAssistantFeedback | null> {
    if (request.observations.length === 0) {
      return null;
    }

    try {
      return await getFireAlarmDiagnosticsFeedback(request);
    } catch {
      return this.suggestFromObservations(request.observations);
    }
  }

  getTriageOptions() {
    return triageOptions;
  }

  suggestFromObservations(
    observations: FireAlarmDiagnosticObservation[],
  ): FireAlarmDiagnosticAssistantFeedback | null {
    const selectedSignals = triageOptions.filter((option) => observations.includes(option.id));

    if (selectedSignals.length === 0) {
      return null;
    }

    const suggestionMap = new Map<string, RankedSuggestion>();

    for (const signal of selectedSignals) {
      const baseScore = priorityRank[signal.priority];

      for (const faultId of signal.faultIds) {
        const existing = suggestionMap.get(faultId);
        const match = this.repository.findFaultById(faultId);
        const faultTitle = match?.fault.title;
        const reason = faultTitle ? `${faultTitle}: ${signal.feedback}` : signal.feedback;
        const nextAction = existing?.score && existing.score >= baseScore ? existing.nextAction : signal.nextAction;

        if (!existing) {
          suggestionMap.set(faultId, {
            faultId,
            reason,
            nextAction,
            score: baseScore,
            matchedObservationIds: [signal.id],
            matchedSignals: 1,
            categoryId: match?.category.id,
          });
          continue;
        }

        suggestionMap.set(faultId, {
          ...existing,
          reason: dedupeStrings([existing.reason, reason]).join(' '),
          nextAction,
          score: (existing.score ?? 0) + baseScore,
          matchedObservationIds: dedupeStrings([...existing.matchedObservationIds, signal.id]) as FireAlarmDiagnosticObservation[],
          matchedSignals: existing.matchedSignals + 1,
          categoryId: existing.categoryId ?? match?.category.id,
        });
      }
    }

    const rankedSuggestions = rankSuggestions(Array.from(suggestionMap.values()), this.repository);
    const topFaultIds = rankedSuggestions.map((suggestion) => suggestion.faultId);
    const highestPriority = selectedSignals.reduce<FireAlarmDiagnosticPriority>(
      (current, signal) =>
        priorityRank[signal.priority] > priorityRank[current] ? signal.priority : current,
      'low',
    );

    const probableCause = rankedSuggestions
      .slice(0, 3)
      .map((suggestion) => suggestion.reason)
      .join(' ');

    const nextSteps = dedupeStrings(rankedSuggestions.map((item) => item.nextAction));
    const highlightedMeasurements = this.repository.getHighlightedMeasurementIdsForFaults(topFaultIds);
    const followUpQuestions = dedupeStrings([
      ...selectedSignals.flatMap((signal) => signal.followUpQuestions ?? []),
      ...this.repository.getFollowUpQuestionsForFaults(topFaultIds),
    ]);

    return {
      summary:
        'Local troubleshooting feedback only. The AI worker connection is optional and this response is being generated from built-in fallback rules.',
      probableCause,
      nextSteps,
      suggestions: rankedSuggestions,
      source: 'rules',
      priority: highestPriority,
      followUpQuestions,
      highlightedMeasurements,
    };
  }
}