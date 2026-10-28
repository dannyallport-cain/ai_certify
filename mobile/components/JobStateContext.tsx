import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef } from 'react';
import { AppState } from 'react-native';

import { loadDraft, onDraftCleared, saveDraft } from '@/services/draft-storage';
import type {
  AnalysisResult,
  CaptureMode,
  Customer,
  ServiceM8AttachmentRecord,
  ServiceM8ClientRecord,
  ServiceM8JobDetail,
  ServiceM8JobRecord,
} from '@/services/api';

// Capture modes live with the API service so the request payload and the
// stored capture can never drift apart. Re-exported here for the many
// components that already import capture types from this context.
export type { CaptureMode };

export type WizardPhotoType =
  | 'consumer_unit_external'
  | 'consumer_unit_internal'
  | 'bonding'
  | 'damaged_accessory'
  | 'damaged_luminaire'
  | 'smoke_detector'
  | 'co_detector';

export interface PhotoQualityAssessment {
  isSufficient: boolean;
  score: number;
  reasons: string[];
  checks: {
    width: number | null;
    height: number | null;
    isLandscape: boolean;
    hasUsefulTextDetection: boolean;
    needsHumanReview: boolean;
    /** Detector captures only: whether an alarm was actually visible. */
    detectorPresent?: boolean | null;
    /** Detector captures only: model confidence, 0..1. */
    detectorConfidence?: number | null;
  };
}

export interface CapturedImage {
  uri: string;
  mode: CaptureMode;
  type?: WizardPhotoType;
  label?: string;
  slotIndex?: number;
  qualityAssessment?: PhotoQualityAssessment;
}

export type ConsumerUnitMaterial = 'metal' | 'plastic' | 'not_sure' | null;

export type ReportPurpose =
  | 'private_rented_sector_eicr'
  | 'change_of_tenancy'
  | 'homebuyer_vendor'
  | 'periodic_inspection_maintenance'
  | 'insurance'
  | 'pre_purchase'
  | 'other'
  | null;

export type InstallationType =
  | 'domestic'
  | 'commercial'
  | 'industrial'
  | 'caravan'
  | 'boat'
  | 'mixed_use'
  | 'other'
  | null;

export interface WizardState {
  inspectionDate: string;
  /** `certificates.certificate_type`, chosen by the user or inferred from the job. */
  certificateType: string;
  dataEntryMode: 'guided_photo' | 'manual_only' | 'hybrid';
  reportPurpose: ReportPurpose;
  installationType: InstallationType;
  occupancyType: 'owner_occupied' | 'tenanted' | 'void' | 'managed_block' | 'other' | null;
  supplyPhase: 'single_phase' | 'three_phase' | 'unknown' | null;
  hasOutbuildingsOrAncillarySupplies: boolean | null;
  consumerUnitMaterial: ConsumerUnitMaterial;
  distributionBoardCount: number;
  hasRcdProtection: boolean | null;
  hasRcboProtection: boolean | null;
  hasSurgeProtectionDevice: boolean | null;
  hasEvCharger: boolean | null;
  hasSolarPv: boolean | null;
  hasBatteryStorage: boolean | null;
  hasAfddProtection: boolean | null;
  hasCommunalOrLandlordSupplies: boolean | null;
  hasDamagedAccessory: boolean | null;
  hasDamagedLuminaire: boolean | null;
  storeyCount: number;
  smokeDetectorCount: number;
  hasSolidFuelAppliance: boolean | null;
  coDetectorTested: boolean;
  activeCaptureType: WizardPhotoType | null;
  activeCaptureLabel: string | null;
  activeCaptureSlotIndex: number | null;
}

export interface ImportedServiceM8Image {
  url: string;
  source: 'servicem8';
  attachment: ServiceM8AttachmentRecord;
  importedAt: string;
}

export interface JobState {
  selectedCustomer: Customer | null;
  gpsAddress: string;
  gpsCoords: { latitude: number; longitude: number } | null;
  capturedImages: CapturedImage[];
  analysisResult: AnalysisResult | null;
  createdCertificate: { id: number; certificateNumber: string } | null;
  selectedServiceM8Job: ServiceM8JobRecord | null;
  selectedServiceM8JobDetail: ServiceM8JobDetail | null;
  selectedServiceM8Client: ServiceM8ClientRecord | null;
  importedServiceM8Images: ImportedServiceM8Image[];
  wizard: WizardState;
}

export type JobAction =
  | { type: 'SET_CUSTOMER'; payload: Customer | null }
  | { type: 'SET_GPS'; payload: { address: string; coords: { latitude: number; longitude: number } } }
  | { type: 'ADD_IMAGE'; payload: CapturedImage }
  | { type: 'REMOVE_IMAGE'; payload: number }
  | { type: 'REMOVE_IMAGE_BY_TARGET'; payload: { type: WizardPhotoType; slotIndex?: number | null } }
  | { type: 'SET_ANALYSIS'; payload: AnalysisResult | null }
  | { type: 'SET_CERTIFICATE'; payload: { id: number; certificateNumber: string } | null }
  | { type: 'SET_SERVICEM8_JOB'; payload: ServiceM8JobRecord | null }
  | { type: 'SET_SERVICEM8_JOB_DETAIL'; payload: ServiceM8JobDetail | null }
  | { type: 'SET_SERVICEM8_CLIENT'; payload: ServiceM8ClientRecord | null }
  | { type: 'ADD_SERVICEM8_IMAGE'; payload: ImportedServiceM8Image }
  | { type: 'REMOVE_SERVICEM8_IMAGE'; payload: string }
  | { type: 'CLEAR_SERVICEM8_IMAGES' }
  | { type: 'SET_WIZARD_FIELD'; payload: { key: keyof WizardState; value: WizardState[keyof WizardState] } }
  | {
      type: 'SET_ACTIVE_CAPTURE';
      payload: {
        type: WizardPhotoType | null;
        label: string | null;
        mode?: CaptureMode;
        slotIndex?: number | null;
      };
    }
  | { type: 'RESET' }
  /** Restores a draft written by a previous session of the app. */
  | { type: 'HYDRATE'; payload: Partial<JobState> };

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

const initialState: JobState = {
  selectedCustomer: null,
  gpsAddress: '',
  gpsCoords: null,
  capturedImages: [],
  analysisResult: null,
  createdCertificate: null,
  selectedServiceM8Job: null,
  selectedServiceM8JobDetail: null,
  selectedServiceM8Client: null,
  importedServiceM8Images: [],
  wizard: {
    inspectionDate: getTodayIsoDate(),
    certificateType: 'EICR',
    dataEntryMode: 'guided_photo',
    reportPurpose: null,
    installationType: null,
    occupancyType: null,
    supplyPhase: null,
    hasOutbuildingsOrAncillarySupplies: null,
    consumerUnitMaterial: null,
    distributionBoardCount: 1,
    hasRcdProtection: null,
    hasRcboProtection: null,
    hasSurgeProtectionDevice: null,
    hasEvCharger: null,
    hasSolarPv: null,
    hasBatteryStorage: null,
    hasAfddProtection: null,
    hasCommunalOrLandlordSupplies: null,
    hasDamagedAccessory: null,
    hasDamagedLuminaire: null,
    storeyCount: 1,
    smokeDetectorCount: 0,
    hasSolidFuelAppliance: null,
    coDetectorTested: false,
    activeCaptureType: null,
    activeCaptureLabel: null,
    activeCaptureSlotIndex: null,
  },
};

function reducer(state: JobState, action: JobAction): JobState {
  switch (action.type) {
    case 'SET_CUSTOMER':
      return { ...state, selectedCustomer: action.payload };
    case 'SET_GPS':
      return { ...state, gpsAddress: action.payload.address, gpsCoords: action.payload.coords };
    case 'ADD_IMAGE': {
      const image = action.payload;
      const nextImages =
        image.type
          ? state.capturedImages.filter(
              (existing) =>
                !(
                  existing.type === image.type &&
                  (existing.slotIndex ?? null) === (image.slotIndex ?? null)
                ),
            )
          : state.capturedImages;

      return { ...state, capturedImages: [...nextImages, image] };
    }
    case 'REMOVE_IMAGE':
      return {
        ...state,
        capturedImages: state.capturedImages.filter((_, i) => i !== action.payload),
      };
    case 'REMOVE_IMAGE_BY_TARGET':
      return {
        ...state,
        capturedImages: state.capturedImages.filter(
          (image) =>
            !(
              image.type === action.payload.type &&
              (image.slotIndex ?? null) === (action.payload.slotIndex ?? null)
            ),
        ),
      };
    case 'SET_ANALYSIS':
      return { ...state, analysisResult: action.payload };
    case 'SET_CERTIFICATE':
      return { ...state, createdCertificate: action.payload };
    case 'SET_SERVICEM8_JOB':
      return {
        ...state,
        selectedServiceM8Job: action.payload,
        selectedServiceM8JobDetail:
          action.payload && state.selectedServiceM8JobDetail?.uuid === action.payload.uuid
            ? state.selectedServiceM8JobDetail
            : null,
        importedServiceM8Images:
          action.payload && state.selectedServiceM8Job?.uuid === action.payload.uuid
            ? state.importedServiceM8Images
            : [],
      };
    case 'SET_SERVICEM8_JOB_DETAIL':
      return {
        ...state,
        selectedServiceM8JobDetail: action.payload,
        selectedServiceM8Client: action.payload?.customer ?? state.selectedServiceM8Client,
      };
    case 'SET_SERVICEM8_CLIENT':
      return {
        ...state,
        selectedServiceM8Client: action.payload,
      };
    case 'ADD_SERVICEM8_IMAGE': {
      const nextImages = state.importedServiceM8Images.filter(
        (image) => image.attachment.uuid !== action.payload.attachment.uuid,
      );

      return {
        ...state,
        importedServiceM8Images: [...nextImages, action.payload],
      };
    }
    case 'REMOVE_SERVICEM8_IMAGE':
      return {
        ...state,
        importedServiceM8Images: state.importedServiceM8Images.filter(
          (image) => image.attachment.uuid !== action.payload,
        ),
      };
    case 'CLEAR_SERVICEM8_IMAGES':
      return {
        ...state,
        importedServiceM8Images: [],
      };
    case 'SET_WIZARD_FIELD': {
      const nextWizard = {
        ...state.wizard,
        [action.payload.key]: action.payload.value,
      } as WizardState;

      if (action.payload.key === 'hasSolidFuelAppliance' && action.payload.value === false) {
        nextWizard.coDetectorTested = false;
      }

      if (action.payload.key === 'hasSolarPv' && action.payload.value === false) {
        nextWizard.hasBatteryStorage = null;
      }

      if (action.payload.key === 'hasDamagedAccessory' && action.payload.value === false) {
        return {
          ...state,
          wizard: nextWizard,
          capturedImages: state.capturedImages.filter((image) => image.type !== 'damaged_accessory'),
        };
      }

      if (action.payload.key === 'hasDamagedLuminaire' && action.payload.value === false) {
        return {
          ...state,
          wizard: nextWizard,
          capturedImages: state.capturedImages.filter((image) => image.type !== 'damaged_luminaire'),
        };
      }

      if (action.payload.key === 'smokeDetectorCount') {
        const nextCount = Number(action.payload.value) || 0;
        return {
          ...state,
          wizard: nextWizard,
          capturedImages: state.capturedImages.filter(
            (image) => image.type !== 'smoke_detector' || (image.slotIndex ?? 0) < nextCount,
          ),
        };
      }

      if (action.payload.key === 'hasSolidFuelAppliance' && action.payload.value === false) {
        return {
          ...state,
          wizard: nextWizard,
          capturedImages: state.capturedImages.filter((image) => image.type !== 'co_detector'),
        };
      }

      return {
        ...state,
        wizard: nextWizard,
      };
    }
    case 'SET_ACTIVE_CAPTURE':
      return {
        ...state,
        wizard: {
          ...state.wizard,
          activeCaptureType: action.payload.type,
          activeCaptureLabel: action.payload.label,
          activeCaptureSlotIndex: action.payload.slotIndex ?? null,
        },
      };
    case 'RESET':
      return {
        ...initialState,
        wizard: {
          ...initialState.wizard,
          inspectionDate: getTodayIsoDate(),
        },
      };
    case 'HYDRATE':
      return {
        ...initialState,
        ...action.payload,
        // A restored draft is never already submitted, and the expanded job
        // detail is deliberately not persisted.
        createdCertificate: null,
        selectedServiceM8JobDetail: null,
        wizard: {
          ...initialState.wizard,
          ...action.payload.wizard,
        },
      };
    default:
      return state;
  }
}

interface JobContextValue {
  state: JobState;
  dispatch: React.Dispatch<JobAction>;
}

const JobContext = createContext<JobContextValue | null>(null);

/** Collapses bursts of edits (typing a count, tapping chips) into one write. */
const DRAFT_SAVE_DEBOUNCE_MS = 700;

export function JobStateProvider({ children }: { children: React.ReactNode }) {
  const [state, rawDispatch] = useReducer(reducer, initialState);

  const stateRef = useRef(state);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Set once the restore attempt has finished, so the empty state is never saved over a draft. */
  const restoredRef = useRef(false);
  /** Set by any real user action, which must win over a slower restore. */
  const userActedRef = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const dispatch = useCallback<React.Dispatch<JobAction>>((action) => {
    if (action.type !== 'HYDRATE' && action.type !== 'RESET') {
      userActedRef.current = true;
    }
    rawDispatch(action);
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadDraft()
      .then((draft) => {
        if (cancelled) {
          return;
        }

        if (draft && !userActedRef.current) {
          rawDispatch({
            type: 'HYDRATE',
            payload: {
              wizard: draft.wizard,
              gpsAddress: draft.gpsAddress,
              gpsCoords: draft.gpsCoords,
              capturedImages: draft.capturedImages,
              analysisResult: draft.analysisResult,
              selectedServiceM8Job: draft.selectedServiceM8Job,
              selectedServiceM8Client: draft.selectedServiceM8Client,
              importedServiceM8Images: draft.importedServiceM8Images,
              // Only the summary was persisted; the contact details are
              // re-fetched when the draft is submitted.
              selectedCustomer: draft.selectedCustomer
                ? {
                    id: draft.selectedCustomer.id,
                    name: draft.selectedCustomer.name,
                    email: null,
                    phone: null,
                    address: null,
                    postcode: null,
                    contactPerson: null,
                  }
                : null,
            },
          });
        }
      })
      .catch((error) => {
        console.warn('Draft restore skipped:', error);
      })
      .finally(() => {
        if (!cancelled) {
          restoredRef.current = true;
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Signing out wipes the draft on disk; mirror that in memory so the next
  // person to unlock the device starts clean.
  useEffect(
    () =>
      onDraftCleared(() => {
        restoredRef.current = false;
        rawDispatch({ type: 'RESET' });
        setTimeout(() => {
          restoredRef.current = true;
        }, 0);
      }),
    [],
  );

  useEffect(() => {
    if (!restoredRef.current) {
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      void saveDraft(stateRef.current);
    }, DRAFT_SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [state]);

  // Leaving the app is exactly when iOS may kill it, so the pending edit is
  // flushed immediately rather than waiting for the debounce.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active' || !restoredRef.current) {
        return;
      }

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      void saveDraft(stateRef.current);
    });

    return () => subscription.remove();
  }, []);

  return <JobContext.Provider value={{ state, dispatch }}>{children}</JobContext.Provider>;
}

export function useJob() {
  const ctx = useContext(JobContext);
  if (!ctx) throw new Error('useJob must be used within JobStateProvider');
  return ctx;
}
