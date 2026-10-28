import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { FlowScreen } from '@/components/fire-alarm/FlowScreen';
import { ReviewRow } from '@/components/fire-alarm/ReviewRow';
import { SectionCard } from '@/components/ui/Card';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { StatTile } from '@/components/ui/StatTile';
import DevicePlacementModal, {
  type DevicePlacementResult,
} from '@/components/roomplan/DevicePlacementModal';
import {
  applyPlacementToDevice,
  buildEmptySession,
  createManualDevice,
  readDevicePlacement,
  type EditableDevice,
} from '@/components/roomplan/review-types';
import type { FireAlarmScanSession } from '@/modules/fire-alarm-roomplan';
import { useFireAlarmFlow } from '@/components/fire-alarm/useFireAlarmFlow';
import { getRoomPlanSession, saveRoomPlanSession } from '@/services/roomplan/session-store';
import { useTheme } from '@/theme/useTheme';

type PlacementRequest = { mode: 'create' } | { mode: 'adjust'; deviceId: string };

export default function FireAlarmReviewScreen() {
  const { palette } = useTheme();
  const { sessionId, setSessionId } = useFireAlarmFlow();
  const params = useLocalSearchParams<{ sessionId?: string }>();

  const requestedSessionId =
    sessionId ?? (Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId);

  const [session, setSession] = useState<FireAlarmScanSession | null>(null);
  const [devices, setDevices] = useState<EditableDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [placementRequest, setPlacementRequest] = useState<PlacementRequest | null>(null);

  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) {
      return;
    }
    loadedRef.current = true;

    let cancelled = false;

    const load = async () => {
      if (!requestedSessionId) {
        if (!cancelled) {
          setSession(buildEmptySession());
          setIsLoading(false);
        }
        return;
      }

      const stored = await getRoomPlanSession(requestedSessionId);

      if (cancelled) {
        return;
      }

      const next = stored ?? buildEmptySession(requestedSessionId);
      setSession(next);
      setDevices((next.devices ?? []).map((device) => ({ ...device, reviewed: false })));
      setSessionId(next.id);
      setIsLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [requestedSessionId, setSessionId]);

  const reviewedSession = useMemo<FireAlarmScanSession | null>(() => {
    if (!session) {
      return null;
    }

    return {
      ...session,
      devices,
      floorplan: session.floorplan
        ? { ...session.floorplan, deviceCount: devices.length }
        : session.floorplan,
    };
  }, [devices, session]);

  useEffect(() => {
    if (!reviewedSession || isLoading) {
      return;
    }

    void saveRoomPlanSession(reviewedSession);
  }, [isLoading, reviewedSession]);

  const updateDevice = useCallback(
    (deviceId: string, updater: (device: EditableDevice) => EditableDevice) => {
      setDevices((current) =>
        current.map((device) => (device.id === deviceId ? updater(device) : device)),
      );
    },
    [],
  );

  const deleteDevice = useCallback((deviceId: string) => {
    Alert.alert('Remove device', 'Take this device out of the plan?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () =>
          setDevices((current) => current.filter((device) => device.id !== deviceId)),
      },
    ]);
  }, []);

  const submitPlacement = useCallback(
    (result: DevicePlacementResult) => {
      const request = placementRequest;
      setPlacementRequest(null);

      if (!request || !session) {
        return;
      }

      if (request.mode === 'create') {
        const device: EditableDevice = {
          ...createManualDevice(session.id, { type: result.type, placement: result.placement }),
          notes: result.notes,
          reviewed: true,
        };

        setDevices((current) => [...current, device]);
        setExpandedId(device.id);
        return;
      }

      setDevices((current) =>
        current.map((device) =>
          device.id === request.deviceId ? applyPlacementToDevice(device, result) : device,
        ),
      );
    },
    [placementRequest, session],
  );

  const placementTarget = useMemo(() => {
    if (placementRequest?.mode !== 'adjust') {
      return null;
    }

    return devices.find((device) => device.id === placementRequest.deviceId) ?? null;
  }, [devices, placementRequest]);

  if (isLoading) {
    return (
      <FlowScreen stepId="review" nextDisabled>
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator color={palette.brand} />
        </View>
      </FlowScreen>
    );
  }

  const reviewedCount = devices.filter((device) => device.reviewed).length;
return (
    <>
      <FlowScreen
        stepId="review"
        nextLabel="Next: Plan"
        headerExtra={
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            <StatTile label="Devices" value={devices.length} accent="violet" />
            <StatTile label="Reviewed" value={reviewedCount} accent="emerald" />
          </View>
        }
      >
        <SectionCard
          title="Devices on plan"
          badge={
            devices.length > 0 && reviewedCount === devices.length ? (
              <Pill label="All reviewed" tone="success" icon="checkmark" />
            ) : (
              <Pill label={`${devices.length - reviewedCount} open`} tone="warning" />
            )
          }
          hint="Tap a row to edit it or set its position."
        >
          {devices.length === 0 ? (
            <AppText variant="body" tone="muted">
              No devices yet. Add one below, or go back to step 1 to scan the room.
            </AppText>
          ) : (
            <View style={{ gap: 8 }}>
              {devices.map((device, index) => (
                <ReviewRow
                  key={device.id}
                  device={device}
                  index={index}
                  expanded={expandedId === device.id}
                  onToggleExpand={() =>
                    setExpandedId((current) => (current === device.id ? null : device.id))
                  }
                  onChange={(updater) => updateDevice(device.id, updater)}
                  onDelete={() => deleteDevice(device.id)}
                  onRequestPlacement={() =>
                    setPlacementRequest({ mode: 'adjust', deviceId: device.id })
                  }
                />
              ))}
            </View>
          )}

          <View style={{ marginTop: 12 }}>
            <Button
              label="Add device"
              icon="add-circle-outline"
              accent="violet"
              variant="soft"
              onPress={() => setPlacementRequest({ mode: 'create' })}
              block
            />
          </View>
        </SectionCard>
      </FlowScreen>

      {placementRequest && reviewedSession ? (
        <DevicePlacementModal
          session={reviewedSession}
          mode={placementRequest.mode}
          initialPlacement={placementTarget ? readDevicePlacement(placementTarget) : null}
          initialType={placementTarget?.type ?? 'unknown'}
          initialNotes={placementTarget?.notes ?? ''}
          onCancel={() => setPlacementRequest(null)}
          onSubmit={submitPlacement}
        />
      ) : null}
    </>
  );
}
