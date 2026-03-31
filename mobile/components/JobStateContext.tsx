import React, { createContext, useContext, useReducer } from 'react';
import type { AnalysisResult, Customer } from '@/services/api';

export interface CapturedImage {
  uri: string;
  mode: 'consumer_unit' | 'circuit_label';
}

export interface JobState {
  selectedCustomer: Customer | null;
  gpsAddress: string;
  gpsCoords: { latitude: number; longitude: number } | null;
  capturedImages: CapturedImage[];
  analysisResult: AnalysisResult | null;
  createdCertificate: { id: number; certificateNumber: string } | null;
}

type JobAction =
  | { type: 'SET_CUSTOMER'; payload: Customer | null }
  | { type: 'SET_GPS'; payload: { address: string; coords: { latitude: number; longitude: number } } }
  | { type: 'ADD_IMAGE'; payload: CapturedImage }
  | { type: 'REMOVE_IMAGE'; payload: number }
  | { type: 'SET_ANALYSIS'; payload: AnalysisResult | null }
  | { type: 'SET_CERTIFICATE'; payload: { id: number; certificateNumber: string } | null }
  | { type: 'RESET' };

const initialState: JobState = {
  selectedCustomer: null,
  gpsAddress: '',
  gpsCoords: null,
  capturedImages: [],
  analysisResult: null,
  createdCertificate: null,
};

function reducer(state: JobState, action: JobAction): JobState {
  switch (action.type) {
    case 'SET_CUSTOMER':
      return { ...state, selectedCustomer: action.payload };
    case 'SET_GPS':
      return { ...state, gpsAddress: action.payload.address, gpsCoords: action.payload.coords };
    case 'ADD_IMAGE':
      return { ...state, capturedImages: [...state.capturedImages, action.payload] };
    case 'REMOVE_IMAGE':
      return {
        ...state,
        capturedImages: state.capturedImages.filter((_, i) => i !== action.payload),
      };
    case 'SET_ANALYSIS':
      return { ...state, analysisResult: action.payload };
    case 'SET_CERTIFICATE':
      return { ...state, createdCertificate: action.payload };
    case 'RESET':
      return initialState;
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
