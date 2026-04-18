import React, { createContext, useContext, useReducer } from 'react';
import type {
  AnalysisResult,
  Customer,
  ServiceM8AttachmentRecord,
  ServiceM8ClientRecord,
  ServiceM8JobDetail,
  ServiceM8JobRecord,
} from '@/services/api';

export type CaptureMode = 'consumer_unit' | 'circuit_label';

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

type JobAction =
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
  | { type: 'RESET' };

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
    default:
      return state;
  }
}

interface JobContextValue {
  state: JobState;
  dispatch: React.Dispatch<JobAction>;
}

const JobContext = createContext<JobContextValue | null>(null);

export function JobStateProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return <JobContext.Provider value={{ state, dispatch }}>{children}</JobContext.Provider>;
}

export function useJob() {
  const ctx = useContext(JobContext);
  if (!ctx) throw new Error('useJob must be used within JobStateProvider');
  return ctx;
}