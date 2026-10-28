import type { Ionicons } from '@expo/vector-icons';

import type { FlowAccent } from '@/theme/accents';

export interface NavigationDestination {
  key: string;
  title: string;
  subtitle: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: FlowAccent;
}

/**
 * Every place the app can take you, in one list. The drawer, the home hub and
 * the tab bar all read from here so a destination can never be reachable from
 * one surface and missing from another.
 */
export const NAVIGATION_DESTINATIONS: NavigationDestination[] = [
  {
    key: 'home',
    title: 'Home',
    subtitle: 'Start here',
    route: '/(tabs)',
    icon: 'home-outline',
    accent: 'sky',
  },
  {
    key: 'fire-alarm',
    title: 'Fire alarm capture',
    subtitle: 'Five steps: scan, identify, review, plan, export',
    route: '/fire-alarm/scan',
    icon: 'flame-outline',
    accent: 'rose',
  },
  {
    key: 'fire-alarm-surveys',
    title: 'Saved surveys',
    subtitle: 'Fire alarm surveys on your dashboard',
    route: '/fire-alarm-surveys',
    icon: 'albums-outline',
    accent: 'rose',
  },
  {
    key: 'diagnostics',
    title: 'Fault diagnostics',
    subtitle: 'Triage a fault and find the checks',
    route: '/(tabs)/fire-alarm-diagnostics',
    icon: 'pulse-outline',
    accent: 'amber',
  },
  {
    key: 'wizard',
    title: 'Certificate wizard',
    subtitle: 'Guided EICR evidence capture',
    route: '/(tabs)/wizard',
    icon: 'document-text-outline',
    accent: 'indigo',
  },
  {
    key: 'certificates',
    title: 'Certificates',
    subtitle: 'Saved records',
    route: '/certificates',
    icon: 'albums-outline',
    accent: 'teal',
  },
  {
    key: 'account',
    title: 'Account',
    subtitle: 'Team, plan and billing',
    route: '/account',
    icon: 'person-circle-outline',
    accent: 'emerald',
  },
  {
    key: 'settings',
    title: 'Settings',
    subtitle: 'Appearance and text size',
    route: '/settings',
    icon: 'settings-outline',
    accent: 'violet',
  },
];

export function findDestination(key: string): NavigationDestination | undefined {
  return NAVIGATION_DESTINATIONS.find((destination) => destination.key === key);
}
