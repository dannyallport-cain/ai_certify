import {
  DEFAULT_LEGEND_CONFIG,
  normaliseLegendConfig,
  sanitiseZones,
  type Plan3DLegendConfig,
  type Plan3DZone,
} from '../../modules/fire-alarm-roomplan';

const ZONE_STORAGE_KEY = 'fire-alarm-roomplan:zone-plans';
const MAX_ZONE_RECORDS = 50;

export interface ZonePlanShareLink {
  id: number | null;
  token: string;
  viewerPath: string;
  updatedAt: string;
  emailedTo: string | null;
}

export interface ZonePlanRecord {
  sessionId: string;
  zones: Plan3DZone[];
  legend: Plan3DLegendConfig;
  updatedAt: string;
  share: ZonePlanShareLink | null;
}

type RecordMap = Record<string, ZonePlanRecord>;

type StorageLike = {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
};

const memoryStore = new Map<string, string>();

function getGlobalLocalStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function createStorage(): StorageLike {
  const localStorageRef = getGlobalLocalStorage();

  if (localStorageRef) {
    return {
      getItem: (key) => localStorageRef.getItem(key),
      setItem: (key, value) => localStorageRef.setItem(key, value),
    };
  }

  return {
    getItem: (key) => memoryStore.get(key) ?? null,
    setItem: (key, value) => {
      memoryStore.set(key, value);
    },
  };
}

const storage = createStorage();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normaliseShare(value: unknown): ZonePlanShareLink | null {
  if (!isRecord(value) || typeof value.token !== 'string' || !value.token) {
    return null;
  }

  return {
    id: typeof value.id === 'number' ? value.id : null,
    token: value.token,
    viewerPath: typeof value.viewerPath === 'string' ? value.viewerPath : `/plan/${value.token}`,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString(),
    emailedTo: typeof value.emailedTo === 'string' && value.emailedTo ? value.emailedTo : null,
  };
}

function normaliseRecord(sessionId: string, value: unknown): ZonePlanRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    sessionId,
    zones: sanitiseZones(value.zones as Plan3DZone[]),
    legend: normaliseLegendConfig(value.legend),
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString(),
    share: normaliseShare(value.share),
  };
}

async function readMap(): Promise<RecordMap> {
  try {
    const raw = await storage.getItem(ZONE_STORAGE_KEY);

    if (!raw) {
      return {};
    }

    const parsed: unknown = JSON.parse(raw);

    if (!isRecord(parsed)) {
      return {};
    }

    return Object.entries(parsed).reduce<RecordMap>((map, [sessionId, value]) => {
      const record = normaliseRecord(sessionId, value);

      if (record) {
        map[sessionId] = record;
      }

      return map;
    }, {});
  } catch {
    return {};
  }
}

async function writeMap(map: RecordMap): Promise<void> {
  const entries = Object.values(map)
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .slice(0, MAX_ZONE_RECORDS)
    .reduce<RecordMap>((trimmed, record) => {
      trimmed[record.sessionId] = record;
      return trimmed;
    }, {});

  await storage.setItem(ZONE_STORAGE_KEY, JSON.stringify(entries));
}

function createEmptyRecord(sessionId: string): ZonePlanRecord {
  return {
    sessionId,
    zones: [],
    legend: DEFAULT_LEGEND_CONFIG,
    updatedAt: new Date().toISOString(),
    share: null,
  };
}

export async function getZonePlanRecord(sessionId: string): Promise<ZonePlanRecord> {
  const map = await readMap();

  return map[sessionId] ?? createEmptyRecord(sessionId);
}

export async function saveZonePlanRecord(
  sessionId: string,
  patch: { zones?: Plan3DZone[]; legend?: Plan3DLegendConfig },
): Promise<ZonePlanRecord> {
  const map = await readMap();
  const current = map[sessionId] ?? createEmptyRecord(sessionId);
  const next: ZonePlanRecord = {
    ...current,
    zones: patch.zones ? sanitiseZones(patch.zones) : current.zones,
    legend: patch.legend ? normaliseLegendConfig(patch.legend) : current.legend,
    updatedAt: new Date().toISOString(),
  };

  map[sessionId] = next;
  await writeMap(map);

  return next;
}

export async function saveZonePlanShareLink(
  sessionId: string,
  share: ZonePlanShareLink,
): Promise<ZonePlanRecord> {
  const map = await readMap();
  const current = map[sessionId] ?? createEmptyRecord(sessionId);
  const next: ZonePlanRecord = {
    ...current,
    share,
    updatedAt: current.updatedAt,
  };

  map[sessionId] = next;
  await writeMap(map);

  return next;
}

export async function listZonePlanRecords(): Promise<ZonePlanRecord[]> {
  const map = await readMap();

  return Object.values(map).sort(
    (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
  );
}

export async function deleteZonePlanRecord(sessionId: string): Promise<boolean> {
  const map = await readMap();

  if (!map[sessionId]) {
    return false;
  }

  delete map[sessionId];
  await writeMap(map);

  return true;
}
