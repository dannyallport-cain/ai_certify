import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import {
  FireAlarmRoomPlan,
  type FireAlarmDeviceDetection,
  type FireAlarmDeviceType,
  type FireAlarmManufacturer,
  type FireAlarmRoomPlanDetectionEvent,
  type FireAlarmRoomPlanProgressEvent,
  type FireAlarmRoomPlanStatusEvent,
  type FireAlarmRoomPlanSupportInfo,
  type FireAlarmScanSession,
} from '@/modules/fire-alarm-roomplan';
import { saveFireAlarmRoomCapture } from '@/services/api';
import { saveRoomPlanSession } from '@/services/roomplan/session-store';

type SupportState = FireAlarmRoomPlanSupportInfo;

// Convert technical errors to user-friendly messages
function getUserFriendlyErrorMessage(error: unknown, context: string): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorLower = errorMessage.toLowerCase();

  switch (context) {
    case 'support-check':
      return 'Unable to check device compatibility. Please try again.';
    case 'start-scan':
      return 'Unable to start capture. Please ensure RoomPlan is supported on this device and try again.';
    case 'stop-scan':
      return 'Unable to stop capture. Please try again.';
    case 'save-capture':
      return 'Unable to save capture data. Please check your connection and try again.';
    case 'export-session':
      return 'Unable to prepare session for export. Please try again.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

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

function formatDeviceType(type: string) {
  return type
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatManufacturer(manufacturer: FireAlarmManufacturer | undefined) {
  if (!manufacturer) {
    return 'Unknown manufacturer';
  }

  if (typeof manufacturer === 'string') {
    return manufacturer;
  }

  if (manufacturer.name && typeof manufacturer.confidence === 'number') {
    return `${manufacturer.name} (${Math.round(manufacturer.confidence * 100)}% confidence)`;
  }

  return manufacturer.name ?? 'Unknown manufacturer';
}

function getManufacturerName(manufacturer: FireAlarmManufacturer | undefined) {
  if (!manufacturer) {
    return 'Unknown';
  }

  if (typeof manufacturer === 'string') {
    return manufacturer.trim() || 'Unknown';
  }

  return manufacturer.name?.trim() || 'Unknown';
}

function formatSupportReason(supportState: SupportState | null) {
  if (!supportState) {
    return 'Checking current device capabilities and native module availability.';
  }

  if (supportState.isSupported) {
    return 'This device can start the FireAlarmRoomPlan capture bridge. This flow now prioritises identifying fire alarm devices during capture and saving only those identified devices to the backend.';
  }

  return (
    supportState.reason ??
    'RoomPlan capture is typically unavailable on Android, simulators, or iOS hardware that does not meet Apple RoomPlan requirements.'
  );
}

function formatStatusLabel(
  event: FireAlarmRoomPlanStatusEvent | null,
  session: FireAlarmScanSession | null,
) {
  if (event?.status) {
    return event.status;
  }

  if (session?.status) {
    return session.status;
  }

  return 'idle';
}

function mergeDeviceLists(
  existingDevices: FireAlarmDeviceDetection[],
  incomingDevices: FireAlarmDeviceDetection[],
) {
  const existingById = new Map(existingDevices.map((device) => [device.id, device]));
  const merged = incomingDevices.map((incomingDevice) => {
    const existingDevice = existingById.get(incomingDevice.id);

    if (!existingDevice) {
      return incomingDevice;
    }

    return {
      ...incomingDevice,
      type:
        existingDevice.identifiedByUser && existingDevice.type
          ? existingDevice.type
          : incomingDevice.type,
      label: existingDevice.label ?? incomingDevice.label,
      manufacturer: existingDevice.manufacturer ?? incomingDevice.manufacturer,
      notes: existingDevice.notes ?? incomingDevice.notes,
      identifiedByUser: existingDevice.identifiedByUser ?? incomingDevice.identifiedByUser,
      metadata: {
        ...(incomingDevice.metadata ?? {}),
        ...(existingDevice.metadata ?? {}),
      },
    } satisfies FireAlarmDeviceDetection;
  });

  const incomingIds = new Set(incomingDevices.map((device) => device.id));
  const remainingExistingDevices = existingDevices.filter((device) => !incomingIds.has(device.id));

  return [...merged, ...remainingExistingDevices];
}

function buildSessionWithDevices(
  session: FireAlarmScanSession,
  devices: FireAlarmDeviceDetection[],
): FireAlarmScanSession {
  return {
    ...session,
    devices,
    floorplan: session.floorplan
      ? {
          ...session.floorplan,
          deviceCount: devices.length,
          rooms: session.floorplan.rooms.map((room) => ({
            ...room,
            devices: devices.filter((device) => device.roomId === room.id),
          })),
        }
      : session.floorplan,
    rawPayload: {
      ...(session.rawPayload ?? {}),
      identification: {
        identifiedDeviceCount: devices.filter((device) => device.identifiedByUser).length,
        totalVisibleDeviceCount: devices.length,
      },
    },
  };
}

export default function RoomPlanScreen() {
  const [supportState, setSupportState] = useState<SupportState | null>(null);
  const [isCheckingSupport, setIsCheckingSupport] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isSavingCapture, setIsSavingCapture] = useState(false);
  const [session, setSession] = useState<FireAlarmScanSession | null>(null);
  const [capturedDevices, setCapturedDevices] = useState<FireAlarmDeviceDetection[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [statusEvent, setStatusEvent] = useState<FireAlarmRoomPlanStatusEvent | null>(null);
  const [progressEvent, setProgressEvent] = useState<FireAlarmRoomPlanProgressEvent | null>(null);
  const [exportedSession, setExportedSession] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const capturedDevicesRef = useRef<FireAlarmDeviceDetection[]>([]);

  useEffect(() => {
    capturedDevicesRef.current = capturedDevices;
  }, [capturedDevices]);

  const checkSupport = useCallback(async () => {
    setIsCheckingSupport(true);
    setErrorMessage(null);

    try {
      const result = await FireAlarmRoomPlan.isSupported();
      setSupportState(result);
    } catch (error) {
      setSupportState({
        isSupported: false,
        platform: 'unknown',
        reason: 'Unable to determine RoomPlan support on this device.',
      });
      setErrorMessage(getUserFriendlyErrorMessage(error, 'support-check'));
    } finally {
      setIsCheckingSupport(false);
    }
  }, []);

  const persistCapture = useCallback(
    async (sessionToSave: FireAlarmScanSession, devicesToSave: FireAlarmDeviceDetection[]) => {
      setIsSavingCapture(true);
      setErrorMessage(null);

      try {
        const response = await saveFireAlarmRoomCapture(
          sessionToSave,
          devicesToSave.filter((device) => device.identifiedByUser),
          {
            ignoredRoomContents: true,
            totalDetectedDeviceCount: devicesToSave.length,
            identifiedDeviceCount: devicesToSave.filter((device) => device.identifiedByUser).length,
          },
        );

        setSaveMessage(
          response.savedDeviceCount > 0
            ? `Saved ${response.savedDeviceCount} identified fire alarm device${response.savedDeviceCount === 1 ? '' : 's'} to the database.`
            : 'Capture saved. No identified fire alarm devices were saved yet.',
        );
      } catch (error) {
        setErrorMessage(getUserFriendlyErrorMessage(error, 'save-capture'));
      } finally {
        setIsSavingCapture(false);
      }
    },
    [],
  );

  const applyDetectionEvent = useCallback((event: FireAlarmRoomPlanDetectionEvent) => {
    setCapturedDevices((currentDevices) => {
      const nextDevices = mergeDeviceLists(currentDevices, [event.detection]);
      return mergeDeviceLists(nextDevices, []);
    });

    setSelectedDeviceId((currentSelectedDeviceId) => currentSelectedDeviceId ?? event.detection.id);
  }, []);

  useEffect(() => {
    checkSupport();
  }, [checkSupport]);

  useEffect(() => {
    const statusSubscription = FireAlarmRoomPlan.addStatusListener((event) => {
      setStatusEvent(event);
      if (event.status !== 'starting' && event.status !== 'scanning' && event.status !== 'processing') {
        setIsScanning(false);
      }
    });

    const progressSubscription = FireAlarmRoomPlan.addProgressListener((event) => {
      setProgressEvent(event);
    });

    const detectionSubscription = FireAlarmRoomPlan.addDetectionListener((event) => {
      applyDetectionEvent(event);
    });

    const sessionSubscription = FireAlarmRoomPlan.addSessionListener((event) => {
      const mergedDevices = mergeDeviceLists(capturedDevicesRef.current, event.session.devices ?? []);
      const mergedSession = buildSessionWithDevices(event.session, mergedDevices);

      void saveRoomPlanSession(mergedSession);
      void persistCapture(mergedSession, mergedDevices);

      setSession(mergedSession);
      setCapturedDevices(mergedDevices);
      setSelectedDeviceId((currentSelectedDeviceId) => currentSelectedDeviceId ?? mergedDevices[0]?.id ?? null);
      setIsScanning(false);
    });

    return () => {
      statusSubscription.remove();
      progressSubscription.remove();
      detectionSubscription.remove();
      sessionSubscription.remove();
    };
  }, [applyDetectionEvent, persistCapture]);

  const handleStartScan = useCallback(async () => {
    setIsScanning(true);
    setErrorMessage(null);
    setSaveMessage(null);
    setExportedSession(null);
    setProgressEvent(null);
    setSession(null);
    setCapturedDevices([]);
    setSelectedDeviceId(null);

    try {
      const nextSession = await FireAlarmRoomPlan.startScan({
        detectDevices: true,
        detectManufacturers: false,
        preferredUnits: 'meters',
        roomName: 'Commercial area survey',
      });

      const mergedDevices = mergeDeviceLists(capturedDevicesRef.current, nextSession.devices ?? []);
      const mergedSession = buildSessionWithDevices(nextSession, mergedDevices);

      await saveRoomPlanSession(mergedSession);
      setSession(mergedSession);
      setCapturedDevices(mergedDevices);
      setSelectedDeviceId((currentSelectedDeviceId) => currentSelectedDeviceId ?? mergedDevices[0]?.id ?? null);
    } catch (error) {
      setErrorMessage(getUserFriendlyErrorMessage(error, 'start-scan'));
      setIsScanning(false);
    }
  }, []);

  const handleStopScan = useCallback(async () => {
    setErrorMessage(null);

    try {
      await FireAlarmRoomPlan.stopScan();
    } catch (error) {
      setErrorMessage(getUserFriendlyErrorMessage(error, 'stop-scan'));
    } finally {
      setIsScanning(false);
    }
  }, []);

  const handleExportSession = useCallback(async () => {
    if (!session) {
      return;
    }

    setErrorMessage(null);

    try {
      const sessionToExport = buildSessionWithDevices(session, capturedDevices);
      const exported = await FireAlarmRoomPlan.exportSession(sessionToExport, { pretty: true });
      setExportedSession(exported);
    } catch (error) {
      setErrorMessage(getUserFriendlyErrorMessage(error, 'export-session'));
    }
  }, [capturedDevices, session]);

  const updateSelectedDevice = useCallback(
    (updater: (device: FireAlarmDeviceDetection) => FireAlarmDeviceDetection) => {
      setCapturedDevices((currentDevices) =>
        currentDevices.map((device) => (device.id === selectedDeviceId ? updater(device) : device)),
      );
    },
    [selectedDeviceId],
  );

  const selectedDevice = useMemo(
    () => capturedDevices.find((device) => device.id === selectedDeviceId) ?? null,
    [capturedDevices, selectedDeviceId],
  );

  const identifiedDevices = useMemo(
    () => capturedDevices.filter((device) => device.identifiedByUser),
    [capturedDevices],
  );

  const currentSession = useMemo(() => {
    if (!session) {
      return null;
    }

    return buildSessionWithDevices(session, capturedDevices);
  }, [capturedDevices, session]);

  const roomCount = currentSession?.floorplan?.rooms?.length ?? 0;
  const currentStatus = formatStatusLabel(statusEvent, currentSession);
  const supportLabel = supportState?.isSupported ? 'Supported' : 'Not supported';
  const progressPercent =
    typeof progressEvent?.progress === 'number' ? Math.round(progressEvent.progress * 100) : null;

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 24 }}>
      <View className="mb-6 flex-row items-center">
        <View className="mr-3 h-12 w-12 items-center justify-center rounded-2xl bg-blue-100">
          <Ionicons name="scan-outline" size={24} color="#0D47A1" />
        </View>
        <View className="flex-1">
          <Text className="text-2xl font-bold text-gray-900">RoomPlan fire alarm capture</Text>
          <Text className="mt-1 text-sm text-gray-700">
            Capture room geometry, identify fire alarm devices as they appear, and save only the
            identified fire alarm devices to the backend once the capture completes.
          </Text>
        </View>
      </View>

      <View className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <View className="flex-row items-start">
          <Ionicons name="information-circle-outline" size={18} color="#2563eb" />
          <View className="ml-2 flex-1">
            <Text className="text-sm font-semibold text-blue-900">Capture behaviour</Text>
            <Text className="mt-1 text-sm leading-5 text-blue-800">
              Room geometry can still be captured locally, but backend persistence now ignores
              general room contents. Only devices you identify as fire alarm equipment are saved to
              the database.
            </Text>
          </View>
        </View>
      </View>

      <View className="mb-4 rounded-2xl border border-gray-300 bg-gray-50 p-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-semibold text-gray-900">Platform support</Text>
          {isCheckingSupport ? (
            <ActivityIndicator size="small" color="#0f172a" />
          ) : (
            <View
              className={`rounded-full px-3 py-1 ${supportState?.isSupported ? 'bg-emerald-100' : 'bg-amber-100'}`}
            >
              <Text
                className={`text-xs font-semibold ${supportState?.isSupported ? 'text-emerald-700' : 'text-amber-700'}`}
              >
                {supportLabel}
              </Text>
            </View>
          )}
        </View>

        <Text className="mt-3 text-sm leading-5 text-gray-700">{formatSupportReason(supportState)}</Text>

        {errorMessage ? <Text className="mt-3 text-sm text-blue-600">{errorMessage}</Text> : null}
        {saveMessage ? <Text className="mt-3 text-sm text-emerald-700">{saveMessage}</Text> : null}

        <Pressable
          className="mt-4 self-start rounded-xl bg-gray-900 px-4 py-3"
          onPress={checkSupport}
          disabled={isCheckingSupport}
        >
          <Text className="text-sm font-semibold text-white">Re-check support</Text>
        </Pressable>
      </View>

      <View className="mb-4 rounded-2xl border border-gray-300 bg-white p-4">
        <Text className="text-base font-semibold text-gray-900">Capture workflow</Text>
        <Text className="mt-2 text-sm leading-5 text-gray-700">
          Start a scan, tap a detected device, mark what it is, then save the identified devices.
          Unidentified room contents are ignored when the capture is persisted.
        </Text>

        <View className="mt-4 rounded-xl bg-gray-50 p-4">
          <Text className="text-xs font-semibold uppercase tracking-wide text-gray-600">
            Current status
          </Text>
          <Text className="mt-2 text-base font-semibold text-gray-900">{currentStatus}</Text>
          
          
          {progressPercent != null ? (
            <Text className="mt-1 text-sm text-gray-700">Progress: {progressPercent}%</Text>
          ) : null}
          {progressEvent?.message ? (
            <Text className="mt-1 text-sm text-gray-700">{progressEvent.message}</Text>
          ) : null}
          <Text className="mt-2 text-sm text-gray-700">
            Visible devices: {capturedDevices.length} · Identified fire alarm devices: {identifiedDevices.length}
          </Text>
        </View>

        <View className="mt-4 flex-row gap-3">
          <Pressable
            className={`flex-1 flex-row items-center justify-center rounded-xl px-4 py-3 ${isScanning ? 'bg-slate-300' : 'bg-blue-600'}`}
            onPress={handleStartScan}
            disabled={isScanning}
          >
            {isScanning ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="play-circle-outline" size={18} color="#ffffff" />
            )}
            <Text className="ml-2 text-sm font-semibold text-white">
              {isScanning ? 'Capturing...' : 'Start capture'}
            </Text>
          </Pressable>

          <Pressable
            className="flex-1 flex-row items-center justify-center rounded-xl bg-gray-900 px-4 py-3"
            onPress={handleStopScan}
          >
            <Ionicons name="stop-circle-outline" size={18} color="#ffffff" />
            <Text className="ml-2 text-sm font-semibold text-white">Stop capture</Text>
          </Pressable>
        </View>

        {currentSession ? (
          <Pressable
            className={`mt-3 flex-row items-center justify-center rounded-xl px-4 py-3 ${isSavingCapture ? 'bg-slate-300' : 'bg-emerald-600'}`}
            onPress={() => void persistCapture(currentSession, capturedDevices)}
            disabled={isSavingCapture}
          >
            {isSavingCapture ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="cloud-upload-outline" size={18} color="#ffffff" />
            )}
            <Text className="ml-2 text-sm font-semibold text-white">
              {isSavingCapture ? 'Saving capture...' : 'Save identified devices to database'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View className="mb-4 rounded-2xl border border-gray-300 bg-white p-4">
        <Text className="text-base font-semibold text-gray-900">Live detected devices</Text>
        <Text className="mt-2 text-sm leading-5 text-gray-700">
          Tap any detected item to classify it as a fire alarm device during the capture process.
          Only rows marked identified are sent to the backend.
        </Text>

        {capturedDevices.length === 0 ? (
          <View className="mt-4 rounded-xl border border-dashed border-gray-300 p-4">
            <Text className="text-sm text-gray-600">
              No device candidates are visible yet. Start capture and wait for device rows to
              appear, then tap one to identify it.
            </Text>
          </View>
        ) : (
          <View className="mt-4 gap-3">
            {capturedDevices.map((device, index) => {
              const isSelected = device.id === selectedDeviceId;

              return (
                <Pressable
                  key={device.id ?? `${device.type ?? 'device'}-${index}`}
                  className={`rounded-xl p-4 ${
                    device.identifiedByUser
                      ? isSelected
                        ? 'border border-blue-600 bg-blue-50'
                        : 'border border-blue-200 bg-blue-50'
                      : isSelected
                        ? 'border border-blue-500 bg-blue-50'
                        : 'bg-gray-50'
                  }`}
                  onPress={() => setSelectedDeviceId(device.id)}
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-3">
                      <Text className="text-sm font-semibold text-gray-900">
                        {device.label?.trim() || formatDeviceType(device.type ?? 'unknown')}
                      </Text>
                      <Text className="mt-1 text-sm text-gray-700">
                        {formatDeviceType(device.type ?? 'unknown')} · {formatManufacturer(device.manufacturer)}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Ionicons
                        name={device.identifiedByUser ? 'checkmark-circle' : 'hardware-chip-outline'}
                        size={18}
                        color={device.identifiedByUser ? '#16a34a' : '#475569'}
                      />
                      <Text
                        className={`mt-1 text-[11px] font-semibold ${device.identifiedByUser ? 'text-emerald-700' : 'text-gray-600'}`}
                      >
                        {device.identifiedByUser ? 'Identified' : 'Needs ID'}
                      </Text>
                    </View>
                  </View>

                  {device.confidence != null ? (
                    <Text className="mt-2 text-xs text-gray-600">
                      Confidence field: {Math.round(Number(device.confidence) * 100)}%
                    </Text>
                  ) : null}

                  {device.notes ? (
                    <Text className="mt-2 text-xs text-gray-600">{device.notes}</Text>
                  ) : null}

                  {isSelected ? (
                    <Text className="mt-3 text-xs font-semibold uppercase tracking-wide text-blue-700">
                      Selected for identification
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {selectedDevice ? (
        <View className="mb-4 rounded-2xl border border-gray-300 bg-white p-4">
          <Text className="text-base font-semibold text-gray-900">Identify selected device</Text>
          <Text className="mt-2 text-sm leading-5 text-gray-700">
            Click the device type and manufacturer below for the currently selected detection. This
            marks it as a fire alarm device that should be saved.
          </Text>

          <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-600">
            Device label
          </Text>
          <TextInput
            className="mt-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900"
            placeholder="Enter a label for this device"
            placeholderTextColor="#94a3b8"
            value={selectedDevice.label ?? ''}
            onChangeText={(label) =>
              updateSelectedDevice((currentDevice) => ({
                ...currentDevice,
                label,
                metadata: {
                  ...(currentDevice.metadata ?? {}),
                  identifiedByUser: currentDevice.identifiedByUser ?? false,
                },
              }))
            }
          />

          <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-600">
            Device type
          </Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {DEVICE_TYPES.map((typeOption) => {
              const selected = selectedDevice.type === typeOption;

              return (
                <Pressable
                  key={typeOption}
                  className={`rounded-full border px-3 py-2 ${selected ? 'border-blue-600 bg-blue-50' : 'border-gray-300 bg-white'}`}
                  onPress={() =>
                    updateSelectedDevice((currentDevice) => ({
                      ...currentDevice,
                      type: typeOption,
                      identifiedByUser: typeOption !== 'unknown',
                      source: currentDevice.source ?? 'manual',
                      metadata: {
                        ...(currentDevice.metadata ?? {}),
                        identifiedByUser: typeOption !== 'unknown',
                      },
                    }))
                  }
                >
                  <Text className={`text-xs font-medium ${selected ? 'text-blue-700' : 'text-slate-700'}`}>
                    {formatDeviceType(typeOption)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-600">
            Manufacturer
          </Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {MANUFACTURER_OPTIONS.map((option) => {
              const selected = getManufacturerName(selectedDevice.manufacturer) === option;

              return (
                <Pressable
                  key={option}
                  className={`rounded-full border px-3 py-2 ${selected ? 'border-emerald-600 bg-emerald-50' : 'border-gray-300 bg-white'}`}
                  onPress={() =>
                    updateSelectedDevice((currentDevice) => ({
                      ...currentDevice,
                      manufacturer: option,
                      identifiedByUser: currentDevice.type !== 'unknown',
                      metadata: {
                        ...(currentDevice.metadata ?? {}),
                        identifiedByUser: currentDevice.type !== 'unknown',
                      },
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

          <View className="mt-4 flex-row gap-3">
            <Pressable
              className={`flex-1 rounded-xl px-4 py-3 ${selectedDevice.identifiedByUser ? 'bg-emerald-600' : 'bg-gray-900'}`}
              onPress={() =>
                updateSelectedDevice((currentDevice) => ({
                  ...currentDevice,
                  identifiedByUser: currentDevice.type !== 'unknown',
                  metadata: {
                    ...(currentDevice.metadata ?? {}),
                    identifiedByUser: currentDevice.type !== 'unknown',
                  },
                }))
              }
            >
              <Text className="text-center text-sm font-semibold text-white">
                {selectedDevice.identifiedByUser ? 'Marked identified' : 'Mark as identified'}
              </Text>
            </Pressable>

            <Pressable
              className="flex-1 rounded-xl bg-gray-200 px-4 py-3"
              onPress={() =>
                updateSelectedDevice((currentDevice) => ({
                  ...currentDevice,
                  type: 'unknown',
                  identifiedByUser: false,
                  metadata: {
                    ...(currentDevice.metadata ?? {}),
                    identifiedByUser: false,
                  },
                }))
              }
            >
              <Text className="text-center text-sm font-semibold text-gray-900">
                Ignore this item
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View className="mb-4 rounded-2xl border border-gray-300 bg-white p-4">
        <Text className="text-base font-semibold text-gray-900">Session summary</Text>
        <Text className="mt-2 text-sm leading-5 text-gray-700">
          The working session below reflects the current identified-device state, not just the raw
          RoomPlan output.
        </Text>

        {currentSession ? (
          <View className="mt-4 gap-3">
            <View className="rounded-xl bg-gray-50 p-4">
              <Text className="text-sm font-semibold text-gray-900">Latest session</Text>
              
              <Text className="mt-1 text-sm text-gray-700">Status: {currentSession.status ?? 'unknown'}</Text>
              <Text className="mt-1 text-sm text-gray-700">Rooms captured: {roomCount}</Text>
              <Text className="mt-1 text-sm text-gray-700">Visible devices: {capturedDevices.length}</Text>
              <Text className="mt-1 text-sm text-gray-700">
                Identified fire alarm devices: {identifiedDevices.length}
              </Text>
              <Text className="mt-1 text-sm text-gray-700">
                Units: {currentSession.floorplan?.units ?? 'Unavailable'}
              </Text>
              <Text className="mt-1 text-sm text-gray-700">
                Started: {currentSession.metadata?.startedAt ?? 'Unavailable'}
              </Text>
              
            </View>

            <View className="gap-3">
              <Pressable
                className="rounded-xl bg-blue-600 px-4 py-3"
                onPress={() => router.push(`/room-plan/session/${encodeURIComponent(currentSession.id)}` as never)}
              >
                <Text className="text-sm font-semibold text-white">Open session summary</Text>
              </Pressable>

              <Pressable
                className="rounded-xl bg-emerald-600 px-4 py-3"
                onPress={() => router.push(`/room-plan/review?sessionId=${encodeURIComponent(currentSession.id)}` as never)}
              >
                <Text className="text-sm font-semibold text-white">Review and edit session</Text>
              </Pressable>

              <Pressable
                className="rounded-xl bg-gray-900 px-4 py-3"
                onPress={() => router.push(`/room-plan/export?sessionId=${encodeURIComponent(currentSession.id)}` as never)}
              >
                <Text className="text-sm font-semibold text-white">Open export flow</Text>
              </Pressable>

              <Pressable
                className="self-start rounded-xl bg-gray-200 px-4 py-3"
                onPress={handleExportSession}
              >
                <Text className="text-sm font-semibold text-gray-900">Preview raw session JSON</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View className="mt-4 rounded-xl border border-dashed border-gray-300 p-4">
            <Text className="text-sm text-gray-600">
              No session returned yet. Start a capture to create the scan session that review and
              export screens will use.
            </Text>
          </View>
        )}
      </View>

      {exportedSession ? (
        <View className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <Text className="text-base font-semibold text-emerald-900">Raw export preview</Text>
          <Text className="mt-2 text-sm leading-5 text-emerald-800">
            This preview includes the current identified-device state and is ready for downstream
            review or sharing.
          </Text>
          <Text className="mt-3 font-mono text-xs leading-5 text-emerald-900">{exportedSession}</Text>
        </View>
      ) : null}

      <View className="rounded-2xl border border-gray-300 bg-gray-50 p-4">
        <Text className="text-base font-semibold text-gray-900">Workflow checklist</Text>
        <View className="mt-3 gap-2">
          <View className="flex-row items-start">
            <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
            <Text className="ml-2 flex-1 text-sm text-slate-700">
              Live RoomPlan capture contract
            </Text>
          </View>
          <View className="flex-row items-start">
            <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
            <Text className="ml-2 flex-1 text-sm text-slate-700">
              Click-to-identify device workflow during capture
            </Text>
          </View>
          <View className="flex-row items-start">
            <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
            <Text className="ml-2 flex-1 text-sm text-slate-700">
              Backend persistence limited to identified fire alarm devices
            </Text>
          </View>
          <View className="flex-row items-start">
            <Ionicons name="ellipse-outline" size={16} color="#64748b" />
            <Text className="ml-2 flex-1 text-sm text-slate-700">
              General room contents are not saved to the database
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
