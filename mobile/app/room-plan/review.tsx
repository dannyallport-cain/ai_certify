import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import type {
  FireAlarmDeviceDetection,
  FireAlarmDeviceType,
  FireAlarmManufacturer,
  FireAlarmScanSession,
} from '@/modules/fire-alarm-roomplan';
import { getRoomPlanSession, saveRoomPlanSession } from '@/services/roomplan/session-store';

const DEVICE_TYPES: FireAlarmDeviceType[] = [
  'panel',
  'sounder',
  'detector',
  'interface',
  'io_unit',
  'vad',
  'unknown',
];

const MANUFACTURER_OPTIONS = [
  'Unknown',
  'Apollo',
  'Hochiki',
  'Gent',
  'Advanced',
  'Morley',
  'Notifier',
  'Kentec',
  'C-Tec',
  'Siemens',
  'Eaton',
  'Hyfire',
  'System Sensor',
];

type EditableDevice = FireAlarmDeviceDetection & {
  reviewed?: boolean;
};

function formatTypeLabel(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getManufacturerName(manufacturer: FireAlarmManufacturer | undefined) {
  if (!manufacturer) {
    return '';
  }

  if (typeof manufacturer === 'string') {
    return manufacturer;
  }

  return manufacturer.name ?? '';
}

function buildInitialSession(): FireAlarmScanSession {
  const now = new Date().toISOString();

  return {
    id: `manual-session-${Date.now()}`,
    status: 'completed',
    metadata: {
      startedAt: now,
      endedAt: now,
      platform: 'mobile',
      scannerVersion: 'review-ui-m1',
      sessionName: 'Manual review session',
    },
    floorplan: {
      units: 'meters',
      rooms: [],
      deviceCount: 0,
      wallCount: 0,
    },
    devices: [],
    rawPayload: {
      source: 'review-screen-fallback',
    },
  };
}

function parseSessionParam(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as FireAlarmScanSession;
  } catch {
    return null;
  }
}

function createEmptyDevice(sessionId: string): EditableDevice {
  return {
    id: `device-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type: 'unknown',
    manufacturer: 'Unknown',
    notes: '',
    source: 'manual',
    location: {
      x: 0,
      y: 0,
      z: 0,
    },
    metadata: {
      sessionId,
    },
    reviewed: true,
  };
}

export default function RoomPlanReviewScreen() {
  const params = useLocalSearchParams<{ session?: string; id?: string; sessionId?: string }>();
  const [session, setSession] = useState<FireAlarmScanSession>(buildInitialSession);
  const [devices, setDevices] = useState<EditableDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    const loadSession = async () => {
      setIsLoading(true);

      const parsedSession = parseSessionParam(params.session);
      const requestedSessionId = params.sessionId ?? params.id;

      if (parsedSession) {
        if (!isCancelled) {
          setSession(parsedSession);
          setDevices(
            (parsedSession.devices ?? []).map((device) => ({
              ...device,
              reviewed: false,
            })),
          );
          setIsLoading(false);
        }
        await saveRoomPlanSession(parsedSession);
        return;
      }

      if (requestedSessionId) {
        const storedSession = await getRoomPlanSession(requestedSessionId);
        if (storedSession && !isCancelled) {
          setSession(storedSession);
          setDevices(
            (storedSession.devices ?? []).map((device) => ({
              ...device,
              reviewed: false,
            })),
          );
          setIsLoading(false);
          return;
        }
      }

      const fallbackSession = buildInitialSession();
      if (requestedSessionId) {
        fallbackSession.id = requestedSessionId;
      }

      if (!isCancelled) {
        setSession(fallbackSession);
        setDevices([]);
        setIsLoading(false);
      }
    };

    void loadSession();

    return () => {
      isCancelled = true;
    };
  }, [params.id, params.session, params.sessionId]);

  const updateDevice = useCallback((deviceId: string, updater: (device: EditableDevice) => EditableDevice) => {
    setDevices((currentDevices) =>
      currentDevices.map((device) => (device.id === deviceId ? updater(device) : device)),
    );
  }, []);

  const handleAddDevice = useCallback(() => {
    setDevices((currentDevices) => [...currentDevices, createEmptyDevice(session.id)]);
  }, [session.id]);

  const handleDeleteDevice = useCallback((deviceId: string) => {
    Alert.alert('Delete device', 'Remove this device from the review list?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setDevices((currentDevices) => currentDevices.filter((device) => device.id !== deviceId));
        },
      },
    ]);
  }, []);

  const reviewedSession = useMemo<FireAlarmScanSession>(() => {
    return {
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
    };
  }, [devices, session]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    void saveRoomPlanSession(reviewedSession);
  }, [isLoading, reviewedSession]);

  const exportHref = useMemo(() => {
    return {
      pathname: '/room-plan/export',
      params: {
        sessionId: reviewedSession.id,
        session: JSON.stringify(reviewedSession),
      },
    } as const;
  }, [reviewedSession]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <ActivityIndicator size="small" color="#0f172a" />
        <Text className="mt-3 text-sm text-slate-600">Loading RoomPlan session…</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 24 }}>
      <View className="mb-6 flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-2xl font-bold text-slate-900">Review RoomPlan session</Text>
          <Text className="mt-1 text-sm text-slate-600">
            Edit the device list before export. This milestone is review-first, so device entries can
            be corrected, manually added, or removed without any ML dependency.
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
          Devices ready for export: {reviewedSession.devices.length}
        </Text>
        <Text className="mt-1 text-sm text-slate-600">
          Units: {reviewedSession.floorplan?.units ?? 'Unavailable'}
        </Text>

        <View className="mt-4 flex-row gap-3">
          <Pressable className="flex-1 rounded-xl bg-slate-900 px-4 py-3" onPress={handleAddDevice}>
            <Text className="text-center text-sm font-semibold text-white">Add manual device</Text>
          </Pressable>
          <Link href={exportHref} asChild>
            <Pressable className="flex-1 rounded-xl bg-emerald-600 px-4 py-3">
              <Text className="text-center text-sm font-semibold text-white">Preview export</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      {devices.length === 0 ? (
        <View className="mb-4 rounded-2xl border border-dashed border-slate-300 p-4">
          <Text className="text-sm text-slate-500">
            No devices are currently listed in this session. Add manual entries to prepare a
            reviewable export payload.
          </Text>
        </View>
      ) : (
        <View className="gap-4">
          {devices.map((device, index) => {
            const manufacturerName = getManufacturerName(device.manufacturer);

            return (
              <View key={device.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-base font-semibold text-slate-900">
                      Device {index + 1}: {formatTypeLabel(device.type)}
                    </Text>
                    <Text className="mt-1 text-xs text-slate-500">ID: {device.id}</Text>
                  </View>

                  <Pressable onPress={() => handleDeleteDevice(device.id)} className="rounded-full bg-red-50 p-2">
                    <Ionicons name="trash-outline" size={18} color="#dc2626" />
                  </Pressable>
                </View>

                <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Device type
                </Text>
                <View className="mt-2 flex-row flex-wrap gap-2">
                  {DEVICE_TYPES.map((typeOption) => {
                    const selected = device.type === typeOption;

                    return (
                      <Pressable
                        key={typeOption}
                        className={`rounded-full border px-3 py-2 ${selected ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white'}`}
                        onPress={() =>
                          updateDevice(device.id, (currentDevice) => ({
                            ...currentDevice,
                            type: typeOption,
                            reviewed: true,
                          }))
                        }
                      >
                        <Text className={`text-xs font-medium ${selected ? 'text-blue-700' : 'text-slate-700'}`}>
                          {formatTypeLabel(typeOption)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Manufacturer
                </Text>
                <View className="mt-2 flex-row flex-wrap gap-2">
                  {MANUFACTURER_OPTIONS.map((option) => {
                    const normalizedValue = option === 'Unknown' ? 'Unknown' : option;
                    const selected = (manufacturerName || 'Unknown') === normalizedValue;

                    return (
                      <Pressable
                        key={option}
                        className={`rounded-full border px-3 py-2 ${selected ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 bg-white'}`}
                        onPress={() =>
                          updateDevice(device.id, (currentDevice) => ({
                            ...currentDevice,
                            manufacturer: normalizedValue,
                            reviewed: true,
                          }))
                        }
                      >
                        <Text className={`text-xs font-medium ${selected ? 'text-emerald-700' : 'text-slate-700'}`}>
                          {option}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Notes
                </Text>
                <TextInput
                  value={device.notes ?? ''}
                  onChangeText={(value) =>
                    updateDevice(device.id, (currentDevice) => ({
                      ...currentDevice,
                      notes: value,
                      reviewed: true,
                    }))
                  }
                  placeholder="Add review notes, mounting hints, or uncertainty comments"
                  multiline
                  className="mt-2 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
                />

                <View className="mt-4">
                  <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Basic location
                  </Text>
                  <View className="mt-2 flex-row gap-3">
                    <View className="flex-1">
                      <Text className="mb-1 text-xs text-slate-500">X</Text>
                      <TextInput
                        value={String(device.location?.x ?? 0)}
                        keyboardType="numeric"
                        onChangeText={(value) =>
                          updateDevice(device.id, (currentDevice) => ({
                            ...currentDevice,
                            location: {
                              x: Number(value) || 0,
                              y: currentDevice.location?.y ?? 0,
                              z: currentDevice.location?.z ?? 0,
                            },
                            reviewed: true,
                          }))
                        }
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
                      />
                    </View>

                    <View className="flex-1">
                      <Text className="mb-1 text-xs text-slate-500">Y</Text>
                      <TextInput
                        value={String(device.location?.y ?? 0)}
                        keyboardType="numeric"
                        onChangeText={(value) =>
                          updateDevice(device.id, (currentDevice) => ({
                            ...currentDevice,
                            location: {
                              x: currentDevice.location?.x ?? 0,
                              y: Number(value) || 0,
                              z: currentDevice.location?.z ?? 0,
                            },
                            reviewed: true,
                          }))
                        }
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
                      />
                    </View>

                    <View className="flex-1">
                      <Text className="mb-1 text-xs text-slate-500">Z</Text>
                      <TextInput
                        value={String(device.location?.z ?? 0)}
                        keyboardType="numeric"
                        onChangeText={(value) =>
                          updateDevice(device.id, (currentDevice) => ({
                            ...currentDevice,
                            location: {
                              x: currentDevice.location?.x ?? 0,
                              y: currentDevice.location?.y ?? 0,
                              z: Number(value) || 0,
                            },
                            reviewed: true,
                          }))
                        }
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
                      />
                    </View>
                  </View>
                </View>

                <View className="mt-4 flex-row items-center justify-between rounded-xl bg-slate-50 p-3">
                  <View>
                    <Text className="text-sm font-medium text-slate-900">Marked reviewed</Text>
                    <Text className="text-xs text-slate-500">
                      Use this to show the entry has been checked manually.
                    </Text>
                  </View>
                  <Pressable
                    className={`rounded-full px-4 py-2 ${device.reviewed ? 'bg-emerald-600' : 'bg-slate-300'}`}
                    onPress={() =>
                      updateDevice(device.id, (currentDevice) => ({
                        ...currentDevice,
                        reviewed: !currentDevice.reviewed,
                      }))
                    }
                  >
                    <Text className="text-xs font-semibold text-white">
                      {device.reviewed ? 'Reviewed' : 'Not reviewed'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
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
    </ScrollView>
  );
}
