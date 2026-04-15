import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

import type {
  FireAlarmDeviceDetection,
  FireAlarmRoomPlanDetectionEvent,
  FireAlarmRoomPlanEventMap,
  FireAlarmRoomPlanExportOptions,
  FireAlarmRoomPlanProgressEvent,
  FireAlarmRoomPlanSessionEvent,
  FireAlarmRoomPlanStartOptions,
  FireAlarmRoomPlanStatusEvent,
  FireAlarmRoomPlanSubscription,
  FireAlarmRoomPlanSupportInfo,
  FireAlarmScanError,
  FireAlarmScanSession,
  FireAlarmScanStatus,
} from './types';

type NativeFireAlarmRoomPlanModule = {
  isSupported?: () => Promise<boolean | FireAlarmRoomPlanSupportInfo> | boolean | FireAlarmRoomPlanSupportInfo;
  startScan?: (options?: FireAlarmRoomPlanStartOptions) => Promise<FireAlarmScanSession> | FireAlarmScanSession;
  stopScan?: () => Promise<void> | void;
  exportSession?:
    | ((session: FireAlarmScanSession, options?: FireAlarmRoomPlanExportOptions) => Promise<string | Record<string, unknown>> | string | Record<string, unknown>)
    | undefined;
};

const NATIVE_MODULE_NAME = 'FireAlarmRoomPlan';

const nativeModule = NativeModules[NATIVE_MODULE_NAME] as NativeFireAlarmRoomPlanModule | undefined;

const nativeEventEmitter =
  nativeModule && Platform.OS !== 'web' ? new NativeEventEmitter(NativeModules[NATIVE_MODULE_NAME]) : null;

const statusListeners = new Set<(event: FireAlarmRoomPlanStatusEvent) => void>();
const progressListeners = new Set<(event: FireAlarmRoomPlanProgressEvent) => void>();
const detectionListeners = new Set<(event: FireAlarmRoomPlanDetectionEvent) => void>();
const sessionListeners = new Set<(event: FireAlarmRoomPlanSessionEvent) => void>();

let statusNativeSubscription: FireAlarmRoomPlanSubscription | null = null;
let progressNativeSubscription: FireAlarmRoomPlanSubscription | null = null;
let detectionNativeSubscription: FireAlarmRoomPlanSubscription | null = null;
let sessionNativeSubscription: FireAlarmRoomPlanSubscription | null = null;

function createSessionId() {
  return `fire-alarm-roomplan-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createMetadata(options?: FireAlarmRoomPlanStartOptions) {
  return {
    startedAt: new Date().toISOString(),
    platform: Platform.OS,
    scannerVersion: 'js-bridge',
    sessionName: options?.roomName?.trim() || 'Room capture',
    captureState: 'preparing' as const,
    framesCaptured: 0,
    roomsDetected: 0,
    surfacesDetected: 0,
    permissionState: Platform.OS === 'ios' ? 'unknown' : 'restricted',
    metadata: options?.metadata ?? null,
  };
}

function createFallbackDetections(
  sessionId: string,
  options?: FireAlarmRoomPlanStartOptions,
): FireAlarmDeviceDetection[] {
  if (options?.includeMockData === false || options?.detectDevices === false) {
    return [];
  }

  return [
    {
      id: `${sessionId}-panel-1`,
      type: 'panel',
      label: 'Fire alarm control panel',
      manufacturer: { name: null, confidence: null },
      confidence: 0.67,
      location: { x: 1.2, y: 0.3, z: 0 },
      notes: 'Detection carried through the JavaScript bridge fallback path.',
      source: 'unknown',
      lifecyclePhase: 'processing',
      metadata: {
        origin: 'js-fallback',
      },
    },
    {
      id: `${sessionId}-detector-1`,
      type: 'detector',
      label: 'Ceiling detector',
      manufacturer: null,
      confidence: 0.61,
      location: { x: 3.4, y: 2.1, z: 2.6 },
      notes: 'Review against captured evidence before approval.',
      source: 'unknown',
      lifecyclePhase: 'processing',
      metadata: {
        origin: 'js-fallback',
      },
    },
    {
      id: `${sessionId}-sounder-1`,
      type: 'sounder',
      label: 'Wall sounder',
      manufacturer: 'Unknown',
      confidence: 0.58,
      location: { x: 4.1, y: 0.8, z: 2.4 },
      source: 'unknown',
      lifecyclePhase: 'processing',
      metadata: {
        origin: 'js-fallback',
      },
    },
  ];
}

function createFallbackSession(options?: FireAlarmRoomPlanStartOptions): FireAlarmScanSession {
  const sessionId = createSessionId();
  const roomName = options?.roomName?.trim() || 'Captured room';
  const devices = createFallbackDetections(sessionId, options);
  const startedAt = new Date().toISOString();
  const endedAt = new Date().toISOString();

  return {
    id: sessionId,
    status: 'completed',
    metadata: {
      ...createMetadata(options),
      startedAt,
      endedAt,
      durationMs: 0,
      captureState: 'completed',
      framesCaptured: 1,
      roomsDetected: 1,
      surfacesDetected: 4,
    },
    devices,
    floorplan: {
      units: options?.preferredUnits ?? 'meters',
      rooms: [
        {
          id: `${sessionId}-room-1`,
          name: roomName,
          level: 0,
          areaSquareMeters: 24,
          perimeterMeters: 20,
          outline: [
            { x: 0, y: 0, z: 0 },
            { x: 6, y: 0, z: 0 },
            { x: 6, y: 4, z: 0 },
            { x: 0, y: 4, z: 0 },
          ],
          devices,
        },
      ],
      deviceCount: devices.length,
      wallCount: 4,
    },
    rawPayload: {
      source: 'js-fallback',
      detectDevices: options?.detectDevices ?? true,
      detectManufacturers: options?.detectManufacturers ?? false,
      preferredUnits: options?.preferredUnits ?? 'meters',
    },
  };
}

function emitStatus(
  status: FireAlarmScanStatus,
  sessionId?: string | null,
  extras?: Partial<Omit<FireAlarmRoomPlanStatusEvent, 'status' | 'sessionId' | 'timestamp'>>,
) {
  const event: FireAlarmRoomPlanStatusEvent = {
    status,
    sessionId: sessionId ?? null,
    timestamp: new Date().toISOString(),
    error: extras?.error ?? null,
    phase: extras?.phase ?? null,
    progress: extras?.progress ?? null,
    message: extras?.message ?? null,
    metadata: extras?.metadata ?? null,
  };

  statusListeners.forEach((listener) => listener(event));
}

function emitProgress(event: FireAlarmRoomPlanProgressEvent) {
  progressListeners.forEach((listener) => listener(event));
}

function emitDetection(event: FireAlarmRoomPlanDetectionEvent) {
  detectionListeners.forEach((listener) => listener(event));
}

function emitSession(session: FireAlarmScanSession) {
  const event: FireAlarmRoomPlanSessionEvent = {
    session,
    timestamp: new Date().toISOString(),
  };

  sessionListeners.forEach((listener) => listener(event));
}

function ensureNativeEventSubscription<K extends keyof FireAlarmRoomPlanEventMap>(eventName: K) {
  if (!nativeEventEmitter) return;

  if (eventName === 'status' && !statusNativeSubscription) {
    const subscription = nativeEventEmitter.addListener('FireAlarmRoomPlan:status', (event) => {
      statusListeners.forEach((listener) => listener(event as FireAlarmRoomPlanStatusEvent));
    });

    statusNativeSubscription = {
      remove: () => subscription.remove(),
    };
  }

  if (eventName === 'progress' && !progressNativeSubscription) {
    const subscription = nativeEventEmitter.addListener('FireAlarmRoomPlan:progress', (event) => {
      progressListeners.forEach((listener) => listener(event as FireAlarmRoomPlanProgressEvent));
    });

    progressNativeSubscription = {
      remove: () => subscription.remove(),
    };
  }

  if (eventName === 'detection' && !detectionNativeSubscription) {
    const subscription = nativeEventEmitter.addListener('FireAlarmRoomPlan:detection', (event) => {
      detectionListeners.forEach((listener) => listener(event as FireAlarmRoomPlanDetectionEvent));
    });

    detectionNativeSubscription = {
      remove: () => subscription.remove(),
    };
  }

  if (eventName === 'session' && !sessionNativeSubscription) {
    const subscription = nativeEventEmitter.addListener('FireAlarmRoomPlan:session', (event) => {
      sessionListeners.forEach((listener) => listener(event as FireAlarmRoomPlanSessionEvent));
    });

    sessionNativeSubscription = {
      remove: () => subscription.remove(),
    };
  }
}

function maybeTearDownNativeEventSubscription(eventName: keyof FireAlarmRoomPlanEventMap) {
  if (eventName === 'status' && statusListeners.size === 0 && statusNativeSubscription) {
    statusNativeSubscription.remove();
    statusNativeSubscription = null;
  }

  if (eventName === 'progress' && progressListeners.size === 0 && progressNativeSubscription) {
    progressNativeSubscription.remove();
    progressNativeSubscription = null;
  }

  if (eventName === 'detection' && detectionListeners.size === 0 && detectionNativeSubscription) {
    detectionNativeSubscription.remove();
    detectionNativeSubscription = null;
  }

  if (eventName === 'session' && sessionListeners.size === 0 && sessionNativeSubscription) {
    sessionNativeSubscription.remove();
    sessionNativeSubscription = null;
  }
}

function toSupportInfo(result: boolean | FireAlarmRoomPlanSupportInfo): FireAlarmRoomPlanSupportInfo {
  if (typeof result === 'boolean') {
    return {
      isSupported: result,
      platform: Platform.OS,
      reason: result ? null : 'Native module reported unsupported state.',
      supportsRoomCapture: result,
      supportsDevicePoseTracking: result,
      supportsLiveProgressEvents: result,
      supportsDetectionEvents: result,
      supportsSessionExport: result,
      requiredPermissions: result ? ['camera'] : ['camera'],
      metadata: null,
    };
  }

  return {
    isSupported:
      typeof result?.isSupported === 'boolean'
        ? result.isSupported
        : typeof (result as { supported?: boolean } | undefined)?.supported === 'boolean'
          ? Boolean((result as { supported?: boolean }).supported)
          : false,
    platform: result?.platform ?? Platform.OS,
    reason: result?.reason ?? null,
    supportsRoomCapture: result?.supportsRoomCapture ?? null ?? undefined,
    supportsDevicePoseTracking: result?.supportsDevicePoseTracking ?? null ?? undefined,
    supportsLiveProgressEvents: result?.supportsLiveProgressEvents ?? null ?? undefined,
    supportsDetectionEvents: result?.supportsDetectionEvents ?? null ?? undefined,
    supportsSessionExport: result?.supportsSessionExport ?? null ?? undefined,
    requiredPermissions: result?.requiredPermissions ?? ['camera'],
    metadata: result?.metadata ?? null,
  };
}

async function isSupported(): Promise<FireAlarmRoomPlanSupportInfo> {
  if (Platform.OS !== 'ios') {
    return {
      isSupported: false,
      platform: Platform.OS,
      reason: 'Room capture currently requires the iOS native module.',
      supportsRoomCapture: false,
      supportsDevicePoseTracking: false,
      supportsLiveProgressEvents: false,
      supportsDetectionEvents: false,
      supportsSessionExport: true,
      requiredPermissions: [],
      metadata: null,
    };
  }

  if (!nativeModule?.isSupported) {
    return {
      isSupported: false,
      platform: Platform.OS,
      reason: 'Native FireAlarmRoomPlan module is not installed.',
      supportsRoomCapture: false,
      supportsDevicePoseTracking: false,
      supportsLiveProgressEvents: false,
      supportsDetectionEvents: false,
      supportsSessionExport: false,
      requiredPermissions: ['camera'],
      metadata: null,
    };
  }

  return toSupportInfo(await nativeModule.isSupported());
}

async function startScan(options?: FireAlarmRoomPlanStartOptions): Promise<FireAlarmScanSession> {
  emitStatus('starting', null, {
    phase: 'preparing',
    progress: 0,
    message: 'Preparing room capture session.',
  });

  if (nativeModule?.startScan && Platform.OS === 'ios') {
    try {
      const session = await nativeModule.startScan(options);
      emitStatus(session.status, session.id, {
        phase: session.metadata.captureState ?? (session.status === 'completed' ? 'completed' : null),
        progress: session.status === 'completed' ? 1 : null,
      });
      emitSession(session);
      return session;
    } catch (error) {
      const scanError: FireAlarmScanError = {
        code: 'start_scan_failed',
        message: error instanceof Error ? error.message : 'Failed to start room capture session.',
        details: error instanceof Error ? null : { error },
      };

      emitStatus('error', null, {
        phase: 'failed',
        error: scanError,
        message: scanError.message,
      });

      throw error;
    }
  }

  const session = createFallbackSession(options);

  emitProgress({
    sessionId: session.id,
    timestamp: new Date().toISOString(),
    status: 'scanning',
    phase: 'capturing',
    progress: 0.5,
    framesCaptured: 1,
    roomsDetected: 1,
    surfacesDetected: 4,
    detectedDeviceCount: 0,
    message: 'Captured a local fallback room snapshot.',
    metadata: {
      source: 'js-fallback',
    },
  });

  session.devices.forEach((detection, index) => {
    emitDetection({
      sessionId: session.id,
      timestamp: new Date().toISOString(),
      detection,
      totalDetections: index + 1,
      frameId: detection.evidenceFrames?.[0]?.id ?? null,
      metadata: {
        source: 'js-fallback',
      },
    });
  });

  emitStatus('completed', session.id, {
    phase: 'completed',
    progress: 1,
    message: 'Room capture session completed.',
  });
  emitSession(session);
  return session;
}

async function stopScan(): Promise<void> {
  if (nativeModule?.stopScan && Platform.OS === 'ios') {
    await nativeModule.stopScan();
    emitStatus('stopped', null, {
      phase: 'stopped',
      progress: null,
      message: 'Room capture session stopped.',
    });
    return;
  }

  emitStatus('stopped', null, {
    phase: 'stopped',
    progress: null,
    message: 'Room capture session stopped.',
  });
}

async function exportSession(
  session: FireAlarmScanSession,
  options?: FireAlarmRoomPlanExportOptions,
): Promise<string> {
  if (nativeModule?.exportSession && Platform.OS === 'ios') {
    const exported = await nativeModule.exportSession(session, options);

    if (typeof exported === 'string') {
      return exported;
    }

    return JSON.stringify(exported, null, options?.pretty ?? true ? 2 : 0);
  }

  const pretty = options?.pretty ?? true;
  return JSON.stringify(session, null, pretty ? 2 : 0);
}

function addStatusListener(
  listener: (event: FireAlarmRoomPlanStatusEvent) => void,
): FireAlarmRoomPlanSubscription {
  statusListeners.add(listener);
  ensureNativeEventSubscription('status');

  return {
    remove: () => {
      statusListeners.delete(listener);
      maybeTearDownNativeEventSubscription('status');
    },
  };
}

function addProgressListener(
  listener: (event: FireAlarmRoomPlanProgressEvent) => void,
): FireAlarmRoomPlanSubscription {
  progressListeners.add(listener);
  ensureNativeEventSubscription('progress');

  return {
    remove: () => {
      progressListeners.delete(listener);
      maybeTearDownNativeEventSubscription('progress');
    },
  };
}

function addDetectionListener(
  listener: (event: FireAlarmRoomPlanDetectionEvent) => void,
): FireAlarmRoomPlanSubscription {
  detectionListeners.add(listener);
  ensureNativeEventSubscription('detection');

  return {
    remove: () => {
      detectionListeners.delete(listener);
      maybeTearDownNativeEventSubscription('detection');
    },
  };
}

function addSessionListener(
  listener: (event: FireAlarmRoomPlanSessionEvent) => void,
): FireAlarmRoomPlanSubscription {
  sessionListeners.add(listener);
  ensureNativeEventSubscription('session');

  return {
    remove: () => {
      sessionListeners.delete(listener);
      maybeTearDownNativeEventSubscription('session');
    },
  };
}

export const FireAlarmRoomPlan = {
  isSupported,
  startScan,
  stopScan,
  exportSession,
  addStatusListener,
  addProgressListener,
  addDetectionListener,
  addSessionListener,
};

export type { NativeFireAlarmRoomPlanModule };