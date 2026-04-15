import type { FireAlarmDeviceDetection } from '../../modules/fire-alarm-roomplan/types';

const CORRECTION_STORAGE_KEY = 'fire-alarm-roomplan:corrections';

type StorageLike = {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem?(key: string): Promise<void> | void;
};

type DeviceCorrectionPatch = Partial<FireAlarmDeviceDetection> & {
  id?: string;
};

export interface FireAlarmDeviceCorrection {
  sessionId: string;
  deviceId: string;
  updatedAt: string;
  patch: DeviceCorrectionPatch;
}

type CorrectionMap = Record<string, FireAlarmDeviceCorrection>;

const memoryStore = new Map<string, string>();

function getGlobalLocalStorage(): Storage | null {
  try {
    const candidate = globalThis.localStorage;
    if (!candidate) {
      return null;
    }

    return candidate;
  } catch {
    return null;
  }
}

function createStorage(): StorageLike {
  const localStorageRef = getGlobalLocalStorage();

  if (localStorageRef) {
    return {
      getItem(key) {
        return localStorageRef.getItem(key);
      },
      setItem(key, value) {
        localStorageRef.setItem(key, value);
      },
      removeItem(key) {
        localStorageRef.removeItem(key);
      },
    };
  }

  return {
    getItem(key) {
      return memoryStore.get(key) ?? null;
    },
    setItem(key, value) {
      memoryStore.set(key, value);
    },
    removeItem(key) {
      memoryStore.delete(key);
    },
  };
}

const storage = createStorage();

function getCorrectionKey(sessionId: string, deviceId: string): string {
  return `${sessionId}::${deviceId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCorrection(value: unknown): value is FireAlarmDeviceCorrection {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.sessionId === 'string' &&
    typeof value.deviceId === 'string' &&
    typeof value.updatedAt === 'string' &&
    isRecord(value.patch)
  );
}

async function readCorrectionMap(): Promise<CorrectionMap> {
  try {
    const raw = await storage.getItem(CORRECTION_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return {};
    }

    return Object.entries(parsed).reduce<CorrectionMap>((accumulator, [correctionKey, correctionValue]) => {
      if (isCorrection(correctionValue)) {
        accumulator[correctionKey] = correctionValue;
      }
      return accumulator;
    }, {});
  } catch {
    return {};
  }
}

async function writeCorrectionMap(corrections: CorrectionMap): Promise<void> {
  await storage.setItem(CORRECTION_STORAGE_KEY, JSON.stringify(corrections));
}

export async function saveDeviceCorrection(
  correction: FireAlarmDeviceCorrection
): Promise<FireAlarmDeviceCorrection> {
  const corrections = await readCorrectionMap();
  corrections[getCorrectionKey(correction.sessionId, correction.deviceId)] = correction;
  await writeCorrectionMap(corrections);
  return correction;
}

export async function applyDeviceCorrection(
  sessionId: string,
  device: FireAlarmDeviceDetection,
  patch: DeviceCorrectionPatch
): Promise<FireAlarmDeviceCorrection> {
  const correction: FireAlarmDeviceCorrection = {
    sessionId,
    deviceId: device.id,
    updatedAt: new Date().toISOString(),
    patch: {
      ...patch,
      id: device.id,
    },
  };

  return saveDeviceCorrection(correction);
}

export async function getDeviceCorrection(
  sessionId: string,
  deviceId: string
): Promise<FireAlarmDeviceCorrection | null> {
  const corrections = await readCorrectionMap();
  return corrections[getCorrectionKey(sessionId, deviceId)] ?? null;
}

export async function listSessionDeviceCorrections(
  sessionId: string
): Promise<FireAlarmDeviceCorrection[]> {
  const corrections = await readCorrectionMap();
  return Object.values(corrections)
    .filter((correction) => correction.sessionId === sessionId)
    .sort((left, right) => {
      const leftTime = Date.parse(left.updatedAt) || 0;
      const rightTime = Date.parse(right.updatedAt) || 0;
      return rightTime - leftTime;
    });
}

export async function deleteDeviceCorrection(sessionId: string, deviceId: string): Promise<boolean> {
  const corrections = await readCorrectionMap();
  const key = getCorrectionKey(sessionId, deviceId);

  if (!corrections[key]) {
    return false;
  }

  delete corrections[key];
  await writeCorrectionMap(corrections);
  return true;
}

export async function clearSessionDeviceCorrections(sessionId: string): Promise<void> {
  const corrections = await readCorrectionMap();
  const filtered = Object.entries(corrections).reduce<CorrectionMap>((accumulator, [key, correction]) => {
    if (correction.sessionId !== sessionId) {
      accumulator[key] = correction;
    }
    return accumulator;
  }, {});

  await writeCorrectionMap(filtered);
}

export async function clearAllDeviceCorrections(): Promise<void> {
  if (storage.removeItem) {
    await storage.removeItem(CORRECTION_STORAGE_KEY);
    return;
  }

  await storage.setItem(CORRECTION_STORAGE_KEY, JSON.stringify({}));
}

export function mergeDeviceCorrection(
  device: FireAlarmDeviceDetection,
  correction: FireAlarmDeviceCorrection | null | undefined
): FireAlarmDeviceDetection {
  if (!correction) {
    return device;
  }

  return {
    ...device,
    ...correction.patch,
    id: device.id,
  };
}

export async function applyCorrectionsToDevices(
  sessionId: string,
  devices: FireAlarmDeviceDetection[]
): Promise<FireAlarmDeviceDetection[]> {
  const corrections = await listSessionDeviceCorrections(sessionId);
  const correctionMap = corrections.reduce<Record<string, FireAlarmDeviceCorrection>>((accumulator, correction) => {
    accumulator[correction.deviceId] = correction;
    return accumulator;
  }, {});

  return devices.map((device) => mergeDeviceCorrection(device, correctionMap[device.id]));
}