import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';

import type { FireAlarmDeviceDetection, FireAlarmScanSession } from '@/modules/fire-alarm-roomplan';
import {
  buildSessionWithDevices,
  countIdentifiedDevices,
  countUnidentifiedDevices,
  inferDeviceIdentification,
} from '@/modules/fire-alarm-flow/devices';
import { getRoomPlanSession, saveRoomPlanSession } from '@/services/roomplan/session-store';
import { useFireAlarmFlow } from './useFireAlarmFlow';

export interface EditableDevicesState {
  session: FireAlarmScanSession | null;
  devices: FireAlarmDeviceDetection[];
  isLoading: boolean;
  selectedDevice: FireAlarmDeviceDetection | null;
  selectedDeviceId: string | null;
  identifiedCount: number;
  unidentifiedCount: number;
  setSelectedDeviceId: (deviceId: string | null) => void;
  updateDevice: (
    deviceId: string,
    updater: (device: FireAlarmDeviceDetection) => FireAlarmDeviceDetection,
  ) => void;
  autoIdentify: () => void;
  save: () => Promise<void>;
}

/**
 * Loads the session produced by step 1 and keeps an editable copy of its
 * devices. Edits are written back to the session store so steps 3 to 5 read
 * exactly what was identified here.
 */
export function useEditableDevices(): EditableDevicesState {
  const { sessionId, setSessionId } = useFireAlarmFlow();
  const params = useLocalSearchParams<{ sessionId?: string }>();

  const requestedSessionId = sessionId ?? (Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId);

  const [session, setSession] = useState<FireAlarmScanSession | null>(null);
  const [devices, setDevices] = useState<FireAlarmDeviceDetection[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!requestedSessionId) {
      setIsLoading(false);
      return;
    }

    if (loadedForRef.current === requestedSessionId) {
      return;
    }

    loadedForRef.current = requestedSessionId;
    let cancelled = false;

    void getRoomPlanSession(requestedSessionId).then((stored) => {
      if (cancelled) {
        return;
      }

      if (stored) {
        setSession(stored);
        setDevices(stored.devices ?? []);
        setSelectedDeviceId(stored.devices?.[0]?.id ?? null);
        setSessionId(stored.id);
      }

      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [requestedSessionId, setSessionId]);

  const updateDevice = useCallback(
    (deviceId: string, updater: (device: FireAlarmDeviceDetection) => FireAlarmDeviceDetection) => {
      setDevices((current) =>
        current.map((device) => (device.id === deviceId ? updater(device) : device)),
      );
    },
    [],
  );

  const autoIdentify = useCallback(() => {
    setDevices((current) =>
      current.map((device) => {
        if (device.identifiedByUser === true) {
          return device;
        }

        const shouldIdentify = inferDeviceIdentification(device);

        return {
          ...device,
          identifiedByUser: shouldIdentify,
          notes:
            shouldIdentify && !device.notes
              ? 'Auto-identified from detection metadata.'
              : device.notes,
        };
      }),
    );
  }, []);

  const save = useCallback(async () => {
    if (!session) {
      return;
    }

    const nextSession = buildSessionWithDevices(session, devices);
    setSession(nextSession);
    await saveRoomPlanSession(nextSession);
  }, [devices, session]);

  // Mirror edits into the store so the next step never reads a stale session.
  useEffect(() => {
    if (!session) {
      return;
    }

    void saveRoomPlanSession(buildSessionWithDevices(session, devices));
  }, [devices, session]);

  const selectedDevice = useMemo(
    () => devices.find((device) => device.id === selectedDeviceId) ?? null,
    [devices, selectedDeviceId],
  );

  return {
    session,
    devices,
    isLoading,
    selectedDevice,
    selectedDeviceId,
    identifiedCount: countIdentifiedDevices(devices),
    unidentifiedCount: countUnidentifiedDevices(devices),
    setSelectedDeviceId,
    updateDevice,
    autoIdentify,
    save,
  };
}

export default useEditableDevices;
