import type { AnalysisResult, ServiceM8ClientRecord, ServiceM8JobRecord } from '@/services/api';
import type {
  CapturedImage,
  ImportedServiceM8Image,
  JobState,
  WizardState,
} from '@/components/JobStateContext';

/**
 * The serialisable half of draft persistence: what may be written to disk and
 * how a stored draft is validated on the way back in. Kept free of native
 * modules so it can be exercised by `scripts/verify-draft-persistence.ts`.
 */

/** Older drafts are dropped so a forgotten job never resurfaces days later. */
export const DRAFT_TTL_MS = 12 * 60 * 60 * 1000;

/** Bumped whenever the persisted shape changes, so stale files are ignored. */
export const DRAFT_VERSION = 1;

export interface DraftCustomerSummary {
  id: number;
  name: string;
}

export interface PersistedDraft {
  version: number;
  savedAt: string;
  wizard: WizardState;
  gpsAddress: string;
  gpsCoords: { latitude: number; longitude: number } | null;
  selectedCustomer: DraftCustomerSummary | null;
  capturedImages: CapturedImage[];
  analysisResult: AnalysisResult | null;
  selectedServiceM8Job: ServiceM8JobRecord | null;
  selectedServiceM8Client: ServiceM8ClientRecord | null;
  importedServiceM8Images: ImportedServiceM8Image[];
}

/**
 * True when the state holds work worth restoring. An untouched wizard on the
 * dashboard must not create a draft that later looks like a stale job.
 */
export function hasMeaningfulDraft(state: JobState): boolean {
  // A submitted certificate is a finished job, not a draft to resume.
  if (state.createdCertificate) {
    return false;
  }

  const wizard = state.wizard;
  const wizardTouched =
    wizard.reportPurpose !== null ||
    wizard.installationType !== null ||
    wizard.occupancyType !== null ||
    wizard.supplyPhase !== null ||
    wizard.hasOutbuildingsOrAncillarySupplies !== null ||
    wizard.consumerUnitMaterial !== null ||
    wizard.hasRcdProtection !== null ||
    wizard.hasRcboProtection !== null ||
    wizard.hasSurgeProtectionDevice !== null ||
    wizard.hasEvCharger !== null ||
    wizard.hasSolarPv !== null ||
    wizard.hasBatteryStorage !== null ||
    wizard.hasAfddProtection !== null ||
    wizard.hasCommunalOrLandlordSupplies !== null ||
    wizard.hasDamagedAccessory !== null ||
    wizard.hasDamagedLuminaire !== null ||
    wizard.hasSolidFuelAppliance !== null ||
    wizard.coDetectorTested ||
    wizard.smokeDetectorCount > 0 ||
    wizard.storeyCount > 1 ||
    wizard.distributionBoardCount > 1 ||
    wizard.dataEntryMode === 'manual_only' ||
    wizard.certificateType !== 'EICR';

  return (
    wizardTouched ||
    state.selectedCustomer !== null ||
    state.gpsAddress.trim().length > 0 ||
    state.capturedImages.length > 0 ||
    state.analysisResult !== null ||
    state.selectedServiceM8Job !== null ||
    state.importedServiceM8Images.length > 0
  );
}

/**
 * Projects live job state onto the safe subset that may be written to disk.
 * Contact details and the expanded job detail are intentionally dropped.
 */
export function buildPersistedDraft(state: JobState, savedAt = new Date()): PersistedDraft {
  const customer = state.selectedCustomer;

  return {
    version: DRAFT_VERSION,
    savedAt: savedAt.toISOString(),
    wizard: state.wizard,
    gpsAddress: state.gpsAddress,
    gpsCoords: state.gpsCoords,
    selectedCustomer: customer ? { id: customer.id, name: customer.name } : null,
    capturedImages: state.capturedImages,
    analysisResult: state.analysisResult,
    selectedServiceM8Job: state.selectedServiceM8Job,
    selectedServiceM8Client: state.selectedServiceM8Client,
    importedServiceM8Images: state.importedServiceM8Images,
  };
}

export type DraftReadResult =
  | { status: 'ok'; draft: PersistedDraft }
  | { status: 'invalid' }
  | { status: 'expired' };

/** Validates raw file contents before they are trusted as a draft. */
export function parseStoredDraft(raw: string, now = Date.now()): DraftReadResult {
  let parsed: Partial<PersistedDraft>;

  try {
    parsed = JSON.parse(raw) as Partial<PersistedDraft>;
  } catch {
    return { status: 'invalid' };
  }

  if (parsed.version !== DRAFT_VERSION || !parsed.wizard || !parsed.savedAt) {
    return { status: 'invalid' };
  }

  const savedAt = new Date(parsed.savedAt).getTime();

  // A clock moved backwards must not keep yesterday's draft alive forever, so a
  // future timestamp is treated as expired rather than fresh.
  if (!Number.isFinite(savedAt) || savedAt > now) {
    return { status: 'expired' };
  }

  if (now - savedAt > DRAFT_TTL_MS) {
    return { status: 'expired' };
  }

  return {
    status: 'ok',
    draft: {
      version: DRAFT_VERSION,
      savedAt: parsed.savedAt,
      wizard: parsed.wizard,
      gpsAddress: parsed.gpsAddress ?? '',
      gpsCoords: parsed.gpsCoords ?? null,
      selectedCustomer: parsed.selectedCustomer ?? null,
      capturedImages: parsed.capturedImages ?? [],
      analysisResult: parsed.analysisResult ?? null,
      selectedServiceM8Job: parsed.selectedServiceM8Job ?? null,
      selectedServiceM8Client: parsed.selectedServiceM8Client ?? null,
      importedServiceM8Images: parsed.importedServiceM8Images ?? [],
    },
  };
}
