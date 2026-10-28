import { Directory, File, Paths } from 'expo-file-system';

import type { JobState } from '@/components/JobStateContext';
import {
  buildPersistedDraft,
  hasMeaningfulDraft,
  parseStoredDraft,
  type PersistedDraft,
} from '@/services/draft-payload';

/**
 * Draft persistence for the certificate workflow.
 *
 * iOS can terminate a backgrounded app, which previously threw away a partly
 * captured certificate. This keeps the draft on disk in the app's private
 * documents directory so the engineer returns to where they left off.
 *
 * What is deliberately NOT stored: the session token and any password (those
 * live in expo-secure-store only), the customer's email/phone/address (only id
 * and name are kept — all the submit payload needs), and the expanded ServiceM8
 * job detail (large and re-fetchable by uuid).
 *
 * The file sits in the app sandbox, which iOS protects with
 * NSFileProtectionCompleteUntilFirstUserAuthentication: unreadable while the
 * device is locked and never visible to other apps.
 */

const DRAFT_DIRECTORY_NAME = 'drafts';
const DRAFT_FILE_NAME = 'certificate-draft.json';

function draftDirectory(): Directory {
  return new Directory(Paths.document, DRAFT_DIRECTORY_NAME);
}

function draftFile(): File {
  return new File(draftDirectory(), DRAFT_FILE_NAME);
}

export type { PersistedDraft };
export { hasMeaningfulDraft } from '@/services/draft-payload';
export { DRAFT_TTL_MS } from '@/services/draft-payload';

export async function saveDraft(state: JobState): Promise<void> {
  try {
    if (!hasMeaningfulDraft(state)) {
      await clearDraft({ notify: false });
      return;
    }

    const directory = draftDirectory();
    if (!directory.exists) {
      directory.create({ idempotent: true });
    }

    draftFile().write(JSON.stringify(buildPersistedDraft(state)));
  } catch (error) {
    // Losing a draft is annoying; crashing the certificate flow is worse.
    console.warn('Unable to save the certificate draft:', error);
  }
}

export async function loadDraft(now = Date.now()): Promise<PersistedDraft | null> {
  try {
    const file = draftFile();
    if (!file.exists) {
      return null;
    }

    const result = parseStoredDraft(await file.text(), now);

    if (result.status === 'ok') {
      return result.draft;
    }

    // An unreadable or stale draft is removed so it cannot keep failing.
    await clearDraft({ notify: false });
    return null;
  } catch (error) {
    console.warn('Unable to read the certificate draft:', error);
    return null;
  }
}

type DraftClearedListener = () => void;

const clearedListeners = new Set<DraftClearedListener>();

/**
 * Lets the job state react when the draft is wiped elsewhere — sign-out is the
 * important one, so the next person on the device never sees this draft.
 */
export function onDraftCleared(listener: DraftClearedListener): () => void {
  clearedListeners.add(listener);
  return () => {
    clearedListeners.delete(listener);
  };
}

export async function clearDraft(options: { notify?: boolean } = {}): Promise<void> {
  const { notify = true } = options;

  try {
    const file = draftFile();
    if (file.exists) {
      file.delete();
    }
  } catch (error) {
    console.warn('Unable to clear the certificate draft:', error);
  }

  if (notify) {
    for (const listener of clearedListeners) {
      listener();
    }
  }
}
