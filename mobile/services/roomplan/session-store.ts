import type { FireAlarmScanSession } from '../../modules/fire-alarm-roomplan/types';

const SESSION_STORAGE_KEY = 'fire-alarm-roomplan:sessions';
const MAX_SESSION_CACHE_SIZE = 50;

type StorageLike = {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem?(key: string): Promise<void> | void;
};

type SessionRecordMap = Record<string, FireAlarmScanSession>;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSession(value: unknown): value is FireAlarmScanSession {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.status === 'string' &&
    isRecord(value.metadata) &&
    typeof value.metadata.startedAt === 'string' &&
    Array.isArray(value.devices)
  );
}

function sanitizeSession(input: unknown): FireAlarmScanSession | null {
  if (!isSession(input)) {
    return null;
  }

  return input;
}

function sortSessionsByStartedAtDesc(sessions: FireAlarmScanSession[]): FireAlarmScanSession[] {
  return [...sessions].sort((left, right) => {
    const leftTime = Date.parse(left.metadata.startedAt ?? '') || 0;
    const rightTime = Date.parse(right.metadata.startedAt ?? '') || 0;
    return rightTime - leftTime;
  });
}

async function readSessionMap(): Promise<SessionRecordMap> {
  try {
    const raw = await storage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return {};
    }

    const entries = Object.entries(parsed).reduce<SessionRecordMap>((accumulator, [sessionId, sessionValue]) => {
      const session = sanitizeSession(sessionValue);
      if (session) {
        accumulator[sessionId] = session;
      }
      return accumulator;
    }, {});

    return entries;
  } catch {
    return {};
  }
}

async function writeSessionMap(sessionMap: SessionRecordMap): Promise<void> {
  const sortedEntries = sortSessionsByStartedAtDesc(Object.values(sessionMap)).slice(0, MAX_SESSION_CACHE_SIZE);
  const normalized: SessionRecordMap = sortedEntries.reduce<SessionRecordMap>((accumulator, session) => {
    accumulator[session.id] = session;
    return accumulator;
  }, {});

  await storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(normalized));
}

export async function saveRoomPlanSession(session: FireAlarmScanSession): Promise<FireAlarmScanSession> {
  const existing = await readSessionMap();
  existing[session.id] = session;
  await writeSessionMap(existing);
  return session;
}

export async function getRoomPlanSession(sessionId: string): Promise<FireAlarmScanSession | null> {
  const sessions = await readSessionMap();
  return sessions[sessionId] ?? null;
}

export async function listRoomPlanSessions(): Promise<FireAlarmScanSession[]> {
  const sessions = await readSessionMap();
  return sortSessionsByStartedAtDesc(Object.values(sessions));
}

export async function deleteRoomPlanSession(sessionId: string): Promise<boolean> {
  const sessions = await readSessionMap();
  if (!sessions[sessionId]) {
    return false;
  }

  delete sessions[sessionId];
  await writeSessionMap(sessions);
  return true;
}

export async function clearRoomPlanSessions(): Promise<void> {
  if (storage.removeItem) {
    await storage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  await storage.setItem(SESSION_STORAGE_KEY, JSON.stringify({}));
}

export async function upsertRoomPlanSession(
  sessionId: string,
  updater: (current: FireAlarmScanSession | null) => FireAlarmScanSession | null
): Promise<FireAlarmScanSession | null> {
  const sessions = await readSessionMap();
  const next = updater(sessions[sessionId] ?? null);

  if (!next) {
    if (sessions[sessionId]) {
      delete sessions[sessionId];
      await writeSessionMap(sessions);
    }
    return null;
  }

  sessions[sessionId] = next;
  await writeSessionMap(sessions);
  return next;
}

export async function hasRoomPlanSession(sessionId: string): Promise<boolean> {
  const sessions = await readSessionMap();
  return Boolean(sessions[sessionId]);
}

export async function countRoomPlanSessions(): Promise<number> {
  const sessions = await readSessionMap();
  return Object.keys(sessions).length;
}