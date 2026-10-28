import type { Ionicons } from '@expo/vector-icons';

import type { FlowAccent } from '@/theme/accents';

/**
 * The fire alarm capture workflow, in the order it must be performed.
 *
 * Each step owns one colour. The rail, the step badge, the primary action and
 * the tick on the completed step all reuse it, so the engineer can see at a
 * glance which stage they are in and what comes next.
 */
export type FireAlarmStepId = 'scan' | 'identify' | 'review' | 'plan' | 'export';

export interface FireAlarmStep {
  id: FireAlarmStepId;
  /** 1-based position, shown on the rail and in the step badge. */
  number: number;
  /** Rail label — two or three characters of meaning, no filler. */
  shortLabel: string;
  /** Screen title. */
  title: string;
  /** One line saying what this step does. */
  summary: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: FlowAccent;
  route: string;
}

export const FIRE_ALARM_STEPS: FireAlarmStep[] = [
  {
    id: 'scan',
    number: 1,
    shortLabel: 'Scan',
    title: 'Scan the room',
    summary: 'Capture the room geometry and any devices the scanner sees.',
    icon: 'scan-outline',
    accent: 'sky',
    route: '/fire-alarm/scan',
  },
  {
    id: 'identify',
    number: 2,
    shortLabel: 'Identify',
    title: 'Identify devices',
    summary: 'Give every detection a type, a manufacturer and a label.',
    icon: 'hardware-chip-outline',
    accent: 'amber',
    route: '/fire-alarm/identify',
  },
  {
    id: 'review',
    number: 3,
    shortLabel: 'Review',
    title: 'Review the layout',
    summary: 'Check positions, add missing devices, remove anything wrong.',
    icon: 'checkmark-done-outline',
    accent: 'violet',
    route: '/fire-alarm/review',
  },
  {
    id: 'plan',
    number: 4,
    shortLabel: 'Plan',
    title: 'Build the plan',
    summary: 'Draw zones and set the mounting detail on the 3D plan.',
    icon: 'cube-outline',
    accent: 'teal',
    route: '/fire-alarm/plan',
  },
  {
    id: 'export',
    number: 5,
    shortLabel: 'Export',
    title: 'Export and send',
    summary: 'Share the finished plan or email it to the office.',
    icon: 'share-outline',
    accent: 'emerald',
    route: '/fire-alarm/export',
  },
];

export const FIRE_ALARM_STEP_IDS: FireAlarmStepId[] = FIRE_ALARM_STEPS.map((step) => step.id);

export function getFireAlarmStep(id: FireAlarmStepId): FireAlarmStep {
  const step = FIRE_ALARM_STEPS.find((candidate) => candidate.id === id);

  if (!step) {
    throw new Error(`Unknown fire alarm step: ${id}`);
  }

  return step;
}

/** Where "Next" goes, or null on the final step. */
export function getNextStep(id: FireAlarmStepId): FireAlarmStep | null {
  const index = FIRE_ALARM_STEP_IDS.indexOf(id);

  return FIRE_ALARM_STEPS[index + 1] ?? null;
}

/** Where "Back" goes, or null on the first step. */
export function getPreviousStep(id: FireAlarmStepId): FireAlarmStep | null {
  const index = FIRE_ALARM_STEP_IDS.indexOf(id);

  return index > 0 ? FIRE_ALARM_STEPS[index - 1] : null;
}
