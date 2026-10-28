import { useCallback, useEffect, useRef, useState } from 'react';

import {
  FireAlarmRoomPlan,
  type FireAlarmDeviceDetection,
  type FireAlarmRoomPlanSupportInfo,
  type FireAlarmScanSession,
} from '@/modules/fire-alarm-roomplan';
import { saveFireAlarmRoomCapture } from '@/services/api';
import { saveRoomPlanSession } from '@/services/roomplan/session-store';
import {
  buildSessionWithDevices,
  countIdentifiedDevices,
  mergeDeviceLists,
} from '@/modules/fire-alarm-flow/devices';
import { useFireAlarmFlow } from './useFireAlarmFlow';

export type CaptureTone = 'idle' | 'running' | 'done' | 'error';

export interface RoomPlanCaptureState {
  support: FireAlarmRoomPlanSupportInfo | null;
  isCheckingSupport: boolean;
  isScanning: boolean;
  isSaving: boolean;
  session: FireAlarmScanSession | null;
  devices: FireAlarmDeviceDetection[];
  progressPercent: number | null;
  identifiedCount: number;
  errorMessage: string | null;
  statusMessage: string | null;
  refreshSupport: () => void;
  startScan: () => Promise<void>;
  stopScan: () => Promise<void>;
  saveToDatabase: () => Promise<void>;
}

function friendlyError(context: 'support' | 'start' | 'stop' | 'save'): string {
  switch (context) {
    case 'support':
      return 'Could not check this device. Try again.';
    case 'start':
      return 'Capture did not start. RoomPlan needs a supported device.';
    case 'stop':
      return 'Capture did not stop cleanly.';
    case 'save':
      return 'Could not save to the database. Check your connection.';
    default:
      return 'Something went wrong. Try again.';
  }
}

/**
 * The RoomPlan bridge, wrapped so a screen only has to render state.
 *
 * It also persists every finished session and pushes the new session id into
 * the workflow, which is what lets step 2 pick up the same capture.
 */
export function useRoomPlanCapture(): RoomPlanCaptureState {
  const { setSessionId } = useFireAlarmFlow();

  const [support, setSupport] = useState<FireAlarmRoomPlanSupportInfo | null>(null);
  const [isCheckingSupport, setIsCheckingSupport] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [session, setSession] = useState<FireAlarmScanSession | null>(null);
  const [devices, setDevices] = useState<FireAlarmDeviceDetection[]>([]);
  const [progressPercent, setProgressPercent] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const devicesRef = useRef<FireAlarmDeviceDetection[]>([]);

  useEffect(() => {
    devicesRef.current = devices;
  }, [devices]);

  const refreshSupport = useCallback(() => {
    setIsCheckingSupport(true);
    setErrorMessage(null);

    FireAlarmRoomPlan.isSupported()
      .then((result) => setSupport(result))
      .catch(() => {
        setSupport({
          isSupported: false,
          platform: 'unknown',
          reason: 'Could not determine RoomPlan support on this device.',
        });
        setErrorMessage(friendlyError('support'));
      })
      .finally(() => setIsCheckingSupport(false));
  }, []);

  useEffect(() => {
    refreshSupport();
  }, [refreshSupport]);

  const persist = useCallback(
    async (sessionToSave: FireAlarmScanSession, devicesToSave: FireAlarmDeviceDetection[]) => {
      setIsSaving(true);
      setErrorMessage(null);

      try {
        const identified = devicesToSave.filter((device) => device.identifiedByUser);
        const response = await saveFireAlarmRoomCapture(sessionToSave, identified, {
          ignoredRoomContents: true,
          totalDetectedDeviceCount: devicesToSave.length,
          identifiedDeviceCount: identified.length,
        });

        setStatusMessage(
          response.savedDeviceCount > 0
            ? `Saved ${response.savedDeviceCount} device${response.savedDeviceCount === 1 ? '' : 's'}.`
            : 'Session saved. No devices identified yet.',
        );
      } catch {
        setErrorMessage(friendlyError('save'));
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  useEffect(() => {
    const statusSubscription = FireAlarmRoomPlan.addStatusListener((event) => {
      if (event.status && event.status !== 'starting' && event.status !== 'scanning' && event.status !== 'processing') {
        setIsScanning(false);
      }
    });

    const progressSubscription = FireAlarmRoomPlan.addProgressListener((event) => {
      if (typeof event.progress === 'number') {
        setProgressPercent(Math.round(Math.max(0, Math.min(1, event.progress)) * 100));
      }

      if (event.message) {
        setStatusMessage(event.message);
      }
    });

    const detectionSubscription = FireAlarmRoomPlan.addDetectionListener((event) => {
      setDevices((current) => mergeDeviceLists(current, [event.detection]));
    });

    const sessionSubscription = FireAlarmRoomPlan.addSessionListener((event) => {
      const mergedDevices = mergeDeviceLists(devicesRef.current, event.session.devices ?? []);
      const mergedSession = buildSessionWithDevices(event.session, mergedDevices);

      void saveRoomPlanSession(mergedSession);
      void persist(mergedSession, mergedDevices);

      setSession(mergedSession);
      setDevices(mergedDevices);
      setSessionId(mergedSession.id);
      setIsScanning(false);
    });

    return () => {
      statusSubscription.remove();
      progressSubscription.remove();
      detectionSubscription.remove();
      sessionSubscription.remove();
    };
  }, [persist, setSessionId]);

  const startScan = useCallback(async () => {
    setIsScanning(true);
    setErrorMessage(null);
    setStatusMessage(null);
    setProgressPercent(null);
    setSession(null);
    setDevices([]);

    try {
      const nextSession = await FireAlarmRoomPlan.startScan({
        detectDevices: true,
        detectManufacturers: false,
        preferredUnits: 'meters',
        roomName: 'Fire alarm survey',
      });

      const mergedDevices = mergeDeviceLists(devicesRef.current, nextSession.devices ?? []);
      const mergedSession = buildSessionWithDevices(nextSession, mergedDevices);

      await saveRoomPlanSession(mergedSession);
      setSession(mergedSession);
      setDevices(mergedDevices);
      setSessionId(mergedSession.id);
    } catch {
      setErrorMessage(friendlyError('start'));
      setIsScanning(false);
    }
  }, [setSessionId]);

  const stopScan = useCallback(async () => {
    setErrorMessage(null);

    try {
      await FireAlarmRoomPlan.stopScan();
    } catch {
      setErrorMessage(friendlyError('stop'));
    } finally {
      setIsScanning(false);
    }
  }, []);

  const saveToDatabase = useCallback(async () => {
    if (!session) {
      return;
    }

    await persist(buildSessionWithDevices(session, devices), devices);
  }, [devices, persist, session]);

  return {
    support,
    isCheckingSupport,
    isScanning,
    isSaving,
    session,
    devices,
    progressPercent,
    identifiedCount: countIdentifiedDevices(devices),
    errorMessage,
    statusMessage,
    refreshSupport,
    startScan,
    stopScan,
    saveToDatabase,
  };
}

export default useRoomPlanCapture;
