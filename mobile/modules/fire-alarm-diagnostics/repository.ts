import {
  findFireAlarmDiagnosticFaultById,
  fireAlarmDiagnosticsCategories,
  fireAlarmDiagnosticsSafetyNotice,
} from './data';
import type {
  FireAlarmDiagnosticFaultMatch,
  FireAlarmDiagnosticMeasurementField,
  FireAlarmDiagnosticObservation,
  FireAlarmDiagnosticsRepository,
} from './types';

const observationFaultMap: Record<FireAlarmDiagnosticObservation, string[]> = {
  'zero-volts-both-cores': ['panel-supply-fault', 'open-circuit-loop'],
  'low-resistance-ground': ['earth-fault', 'communication-network-fault'],
  'open-loop-resistance': ['open-circuit-loop', 'device-missing-removed-head'],
  'current-imbalance': ['high-resistance-fault', 'open-circuit-loop', 'battery-charger-fault'],
  'head-removed': ['device-missing-removed-head'],
  'weak-sounders': ['sounder-circuit-fault', 'high-resistance-fault'],
  'loop-short-circuit': ['short-circuit-loop', 'earth-fault'],
  'intermittent-fault': ['intermittent-fault', 'high-resistance-fault'],
  'false-alarm-repeats': ['detector-contamination-false-alarm'],
  'battery-low': ['battery-charger-fault', 'panel-supply-fault'],
  'network-offline': ['communication-network-fault'],
};

const defaultFollowUpQuestionsByFaultId: Record<string, string[]> = {
  'earth-fault': [
    'Which conductor shows the lower resistance to earth: positive or negative?',
    'Is there any recent water ingress, damp equipment, or screened cable termination work?',
  ],
  'open-circuit-loop': [
    'Where is the last healthy device or section before communications or voltage are lost?',
    'Have any recent terminations, isolator changes, or device removals been made on this circuit?',
  ],
  'short-circuit-loop': [
    'Do isolators indicate which loop section is being segmented?',
    'Does the pair resistance rise when a suspect section is disconnected?',
  ],
  'sounder-circuit-fault': [
    'What standby and alarm voltage do you see at the panel compared with the furthest sounder point?',
    'Is the installed end-of-line device the correct value for this panel output?',
  ],
  'high-resistance-fault': [
    'Does the fault appear only when the circuit is loaded, such as during alarm or polling demand?',
    'Which joint, base, or field section shows the biggest voltage drop compared with the panel?',
  ],
  'intermittent-fault': [
    'Does the fault coincide with moisture, plant start-up, or temperature change?',
    'Can you identify the last healthy point before the fault reappears?',
  ],
  'device-missing-removed-head': [
    'Is correct loop voltage present at the affected base compared with a nearby healthy device?',
    'Has the detector head type, locking, or addressing recently been changed at this location?',
  ],
  'detector-contamination-false-alarm': [
    'Are repeated alarms coming from the same detector, and do they align with dust, steam, aerosols, or airflow?',
    'If the system supports it, do analogue or contamination values indicate a detector condition issue?',
  ],
  'battery-charger-fault': [
    'What is the charger output voltage at the battery terminals with mains healthy?',
    'Do the individual battery blocks remain balanced under load during mains fail?',
  ],
  'panel-supply-fault': [
    'Is incoming mains present at the fire alarm supply arrangement and panel PSU input?',
    'Does the panel remain stable on battery only, or do resets continue regardless of supply source?',
  ],
  'communication-network-fault': [
    'Is the problem confined to one node, one link, or all devices beyond a particular interface?',
    'Have addressing, terminations, converter hardware, or network configuration changed recently?',
  ],
};

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

export class StaticFireAlarmDiagnosticsRepository implements FireAlarmDiagnosticsRepository {
  getCategories() {
    return fireAlarmDiagnosticsCategories;
  }

  getSafetyNotice() {
    return fireAlarmDiagnosticsSafetyNotice;
  }

  getAllFaults(): FireAlarmDiagnosticFaultMatch[] {
    return fireAlarmDiagnosticsCategories.flatMap((category) =>
      category.faults.map((fault) => ({
        category,
        fault,
      })),
    );
  }

  getMeasurementFields(): FireAlarmDiagnosticMeasurementField[] {
    const fields = this.getAllFaults().flatMap(({ fault }) => fault.measurementFocus ?? []);
    return uniqueById(fields);
  }

  getObservationFaultIds(observation: FireAlarmDiagnosticObservation): string[] {
    return observationFaultMap[observation] ?? [];
  }

  getFaultsForObservations(observations: FireAlarmDiagnosticObservation[]) {
    const faultIds = new Set(observations.flatMap((observation) => this.getObservationFaultIds(observation)));
    return this.getAllFaults().filter(({ fault }) => faultIds.has(fault.id));
  }

  getHighlightedMeasurementIdsForFaults(faultIds: string[]): string[] {
    const measurementIds = new Set<string>();

    for (const faultId of faultIds) {
      const match = this.findFaultById(faultId);

      for (const field of match?.fault.measurementFocus ?? []) {
        measurementIds.add(field.id);
      }
    }

    return Array.from(measurementIds);
  }

  getFollowUpQuestionsForFaults(faultIds: string[]): string[] {
    const questions = new Set<string>();

    for (const faultId of faultIds) {
      for (const question of defaultFollowUpQuestionsByFaultId[faultId] ?? []) {
        questions.add(question);
      }
    }

    return Array.from(questions);
  }

  findFaultById(faultId: string) {
    return findFireAlarmDiagnosticFaultById(faultId);
  }
}