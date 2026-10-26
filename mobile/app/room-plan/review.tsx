import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { KeyboardAwareScreen } from '@/components/keyboard/KeyboardAwareScreen';
import DevicePlacementModal, {
  type DevicePlacementResult,
} from '@/components/roomplan/DevicePlacementModal';
import { ReviewDeviceCard } from '@/components/roomplan/ReviewDeviceCard';
import {
  applyPlacementToDevice,
  buildEmptySession,
  createManualDevice,
  parseSessionParam,
  readDevicePlacement,
  type EditableDevice,
} from '@/components/roomplan/review-types';
import type { FireAlarmScanSession } from '@/modules/fire-alarm-roomplan';
import { getRoomPlanSession, saveRoomPlanSession } from '@/services/roomplan/session-store';

/** Which device the placement modal is working on, if any. */
type PlacementRequest = { mode: 'create' } | { mode: 'adjust'; deviceId: string };

function toEditableDevices(session: FireAlarmScanSession): EditableDevice[] {
  return (session.devices ?? []).map((device) => ({ ...device, reviewed: false }));
}

export default function RoomPlanReviewScreen() {
  const params = useLocalSearchParams<{ session?: string; id?: string; sessionId?: string }>();
  const scrollViewRef = useRef<ScrollView | null>(null);

  const [session, setSession] = useState<FireAlarmScanSession>(() => buildEmptySession());
  const [devices, setDevices] = useState<EditableDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [placementRequest, setPlacementRequest] = useState<PlacementRequest | null>(null);

  // The route params are read exactly once. Re-running this load on every
  // param change would rebuild `devices` from the incoming payload and wipe
  // whatever the inspector had just added.
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) {
      return;
    }
    hasLoadedRef.current = true;

    let isCancelled = false;

    const loadSession = async () => {
      const requestedSessionId = params.sessionId ?? params.id;
      const parsedSession = parseSessionParam(params.session);

      if (parsedSession) {
        if (!isCancelled) {
          setSession(parsedSession);
          setDevices(toEditableDevices(parsedSession));
          setIsLoading(false);
        }
        void saveRoomPlanSession(parsedSession);
        return;
      }

      if (requestedSessionId) {
        const storedSession = await getRoomPlanSession(requestedSessionId);

        if (storedSession) {
          if (!isCancelled) {
            setSession(storedSession);
            setDevices(toEditableDevices(storedSession));
            setIsLoading(false);
          }
          return;
        }
      }

      if (!isCancelled) {
        setSession(buildEmptySession(requestedSessionId));
        setDevices([]);
        setIsLoading(false);
      }
    };

    void loadSession();

    return () => {
      isCancelled = true;
    };
  }, [params.id, params.session, params.sessionId]);

  const updateDevice = useCallback(
    (deviceId: string, updater: (device: EditableDevice) => EditableDevice) => {
      setDevices((current) =>
        current.map((device) => (device.id === deviceId ? updater(device) : device)),
      );
    },
    [],
  );

  /**
   * Adding a device opens the placement view first. A manual device is only useful once it has a
   * position, and the position can only come from tapping the plan.
   */
  const handleAddDevice = useCallback(() => {
    setPlacementRequest({ mode: 'create' });
  }, []);

  const handleRequestPlacement = useCallback((device: EditableDevice) => {
    setPlacementRequest({ mode: 'adjust', deviceId: device.id });
  }, []);

  const handleCancelPlacement = useCallback(() => {
    setPlacementRequest(null);
  }, []);

  const handleSubmitPlacement = useCallback(
    (result: DevicePlacementResult) => {
      const request = placementRequest;

      setPlacementRequest(null);

      if (!request) {
        return;
      }

      if (request.mode === 'create') {
        const device: EditableDevice = {
          ...createManualDevice(session.id, { type: result.type, placement: result.placement }),
          notes: result.notes,
        };

        setDevices((current) => [...current, device]);

        // The new card is appended at the end of the list, so scroll it into view.
        // Without this the button appears to do nothing on a phone.
        requestAnimationFrame(() => scrollViewRef.current?.scrollToEnd({ animated: true }));

        return;
      }

      const targetId = request.deviceId;

      setDevices((current) =>
        current.map((device) =>
          device.id === targetId ? applyPlacementToDevice(device, result) : device,
        ),
      );
    },
    [placementRequest, session.id],
  );

  const handleDeleteDevice = useCallback((deviceId: string) => {
    Alert.alert('Delete device', 'Remove this device from the review list?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setDevices((current) => current.filter((device) => device.id !== deviceId));
        },
      },
    ]);
  }, []);

  const reviewedSession = useMemo<FireAlarmScanSession>(
    () => ({
      ...session,
      devices,
      floorplan: session.floorplan
        ? {
            ...session.floorplan,
            deviceCount: devices.length,
          }
        : undefined,
      rawPayload: {
        ...(session.rawPayload ?? {}),
        review: {
          editedAt: new Date().toISOString(),
          reviewedDeviceCount: devices.filter((device) => device.reviewed).length,
        },
      },
    }),
    [devices, session],
  );

  useEffect(() => {
    if (isLoading) {
      return;
    }

    void saveRoomPlanSession(reviewedSession);
  }, [isLoading, reviewedSession]);

  const exportHref = useMemo(
    () =>
      ({
        pathname: '/room-plan/export',
        params: {
          sessionId: reviewedSession.id,
          session: JSON.stringify(reviewedSession),
        },
      }) as const,
    [reviewedSession],
  );

  const placementTarget = useMemo(() => {
    if (placementRequest?.mode !== 'adjust') {
      return null;
    }

    return devices.find((device) => device.id === placementRequest.deviceId) ?? null;
  }, [devices, placementRequest]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <ActivityIndicator size="small" color="#0f172a" />
        <Text className="mt-3 text-sm text-slate-600">Loading RoomPlan session…</Text>
      </View>
    );
  }

  const reviewedCount = devices.filter((device) => device.reviewed).length;

  return (
    <>
      <KeyboardAwareScreen
        className="bg-white"
        contentContainerStyle={{ padding: 24 }}
        contentBottomPadding={140}
        scrollViewRef={scrollViewRef}
        footer={
          <View className="flex-row gap-3 bg-white px-6 pb-2 pt-3">
            <Pressable
              className="flex-1 flex-row items-center justify-center rounded-xl bg-slate-900 px-4 py-4"
              onPress={handleAddDevice}
              accessibilityLabel="Add manual device"
            >
              <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
              <Text className="ml-2 text-sm font-semibold text-white">Add manual device</Text>
            </Pressable>
            <Link href={exportHref} asChild>
              <Pressable className="flex-1 flex-row items-center justify-center rounded-xl bg-emerald-600 px-4 py-4">
                <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
                <Text className="ml-2 text-sm font-semibold text-white">Export</Text>
              </Pressable>
            </Link>
          </View>
        }
      >
        <View className="mb-5 flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-2xl font-bold text-slate-900">Review RoomPlan session</Text>
            <Text className="mt-1 text-sm text-slate-600">
              {devices.length} device{devices.length === 1 ? '' : 's'} · {reviewedCount} reviewed
            </Text>
          </View>
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-blue-100">
            <Ionicons name="create-outline" size={24} color="#2563eb" />
          </View>
        </View>

        <View className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <Text className="text-base font-semibold text-slate-900">Session summary</Text>
          <Text className="mt-2 text-sm text-slate-600">Session ID: {reviewedSession.id}</Text>
          <Text className="mt-1 text-sm text-slate-600">Status: {reviewedSession.status}</Text>
          <Text className="mt-1 text-sm text-slate-600">
            Units: {reviewedSession.floorplan?.units ?? 'Unavailable'}
          </Text>
          <Text className="mt-1 text-sm text-slate-600">
            Rooms captured: {reviewedSession.floorplan?.rooms?.length ?? 0}
          </Text>

          <Pressable
            className="mt-4 flex-row items-center justify-center rounded-xl bg-teal-700 px-4 py-3"
            onPress={() =>
              router.push({
                pathname: '/room-plan/plan',
                params: { sessionId: reviewedSession.id },
              })
            }
          >
            <Ionicons name="cube-outline" size={18} color="#FFFFFF" />
            <Text className="ml-2 text-center text-sm font-semibold text-white">View 3D plan</Text>
          </Pressable>
        </View>

        {devices.length === 0 ? (
          <View className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
            <Ionicons name="add-circle-outline" size={22} color="#64748b" />
            <Text className="mt-2 text-sm font-medium text-slate-700">No devices listed yet</Text>
            <Text className="mt-1 text-sm text-slate-500">
              Tap “Add manual device” below to drop a device onto the 3D view, or scan a room to
              bring detections in automatically.
            </Text>
          </View>
        ) : (
          <View className="gap-4">
            {devices.map((device, index) => (
              <ReviewDeviceCard
                key={device.id}
                device={device}
                index={index}
                onChange={updateDevice}
                onDelete={handleDeleteDevice}
                onRequestPlacement={handleRequestPlacement}
              />
            ))}
          </View>
        )}

        <View className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <Text className="text-sm font-semibold text-blue-900">Next step</Text>
          <Text className="mt-1 text-sm text-blue-800">
            Continue to export to inspect the share-ready JSON payload generated from this reviewed
            session state.
          </Text>
          <Pressable
            className="mt-4 rounded-xl bg-blue-600 px-4 py-3"
            onPress={async () => {
              await saveRoomPlanSession(reviewedSession);
              router.push(exportHref);
            }}
          >
            <Text className="text-center text-sm font-semibold text-white">Go to export</Text>
          </Pressable>
        </View>
      </KeyboardAwareScreen>

      {placementRequest ? (
        <DevicePlacementModal
          session={reviewedSession}
          mode={placementRequest.mode}
          initialPlacement={placementTarget ? readDevicePlacement(placementTarget) : null}
          initialType={placementTarget?.type ?? 'unknown'}
          initialNotes={placementTarget?.notes ?? ''}
          onCancel={handleCancelPlacement}
          onSubmit={handleSubmitPlacement}
        />
      ) : null}
    </>
  );
}
