export type DraftValue = string | string[] | boolean | null;

export interface PersistedDraft {
  v: number;
  ts: number;
  values: Record<string, DraftValue>;
}

const CURRENT_DRAFT_VERSION = 1;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function buildDraftStorageKey(params: {
  userId?: string | null;
  pathname: string;
  templateId?: string;
}): string {
  const userPart = params.userId && params.userId.trim().length > 0 ? params.userId.trim() : 'anon';
  const templatePart = params.templateId && params.templateId.trim().length > 0 ? params.templateId.trim() : 'generic';
  const pathPart = params.pathname || '/';
  return `ai_certify:draft:${userPart}:${templatePart}:${pathPart}`;
}

export function saveDraft(key: string, values: Record<string, DraftValue>): void {
  if (!isBrowser()) return;
  try {
    const payload: PersistedDraft = {
      v: CURRENT_DRAFT_VERSION,
      ts: Date.now(),
      values,
    };
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Best-effort persistence; swallow storage/quota errors.
  }
}

export function loadDraft(key: string): PersistedDraft | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedDraft;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.v !== CURRENT_DRAFT_VERSION) return null;
    if (!parsed.values || typeof parsed.values !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearDraft(key: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore clear errors
  }
}
