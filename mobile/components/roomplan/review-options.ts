import type {
  FireAlarmDeviceType,
  FireAlarmManufacturer,
} from '@/modules/fire-alarm-roomplan';

/** Device types the review screen can assign to a manual or detected entry. */
export const DEVICE_TYPES: FireAlarmDeviceType[] = [
  'panel',
  'sounder',
  'detector',
  'interface',
  'io_unit',
  'vad',
  'unknown',
];

/** Manufacturers offered as one-tap chips, with "Unknown" first. */
export const MANUFACTURER_OPTIONS = [
  'Unknown',
  'Apollo',
  'Hochiki',
  'Gent',
  'Advanced',
  'Morley',
  'Notifier',
  'Kentec',
  'C-Tec',
  'Siemens',
  'Eaton',
  'Hyfire',
  'System Sensor',
];

/** Device types whose acronyms cannot be recovered by title-casing the enum. */
const TYPE_LABEL_OVERRIDES: Record<string, string> = {
  io_unit: 'I/O unit',
  vad: 'VAD',
  panel: 'Control panel',
};

export function formatTypeLabel(value: string) {
  const override = TYPE_LABEL_OVERRIDES[value];

  if (override) {
    return override;
  }

  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getManufacturerName(manufacturer: FireAlarmManufacturer | undefined) {
  if (!manufacturer) {
    return '';
  }

  if (typeof manufacturer === 'string') {
    return manufacturer;
  }

  return manufacturer.name ?? '';
}
