import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import {
  FireAlarmRoomPlan,
  type FireAlarmDeviceDetection,
  type FireAlarmDevicePoint,
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
type Tone = 'blue' | 'emerald' | 'amber' | 'slate';

function getUserFriendlyErrorMessage(_: unknown, context: string): string {
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

function formatLocation(point?: FireAlarmDevicePoint | null) {
  if (!point) {
    return 'Not placed yet';
  }

  const parts = [`x ${point.x.toFixed(1)}m`, `y ${point.y.toFixed(1)}m`];
  if (typeof point.z === 'number') {
    parts.push(`z ${point.z.toFixed(1)}m`);
  }

  return parts.join(' · ');
}

function formatConfidence(confidence?: number | null) {
  if (typeof confidence !== 'number' || Number.isNaN(confidence)) {
    return 'Confidence unavailable';
  }

  return `${Math.round(confidence * 100)}% confidence`;
}

function formatSupportReason(supportState: SupportState | null) {
  if (!supportState) {
    return 'Checking current device capabilities and native module availability.';
  }

  if (supportState.isSupported) {
    return 'This device can start the RoomPlan capture bridge. The workflow prioritises identifying fire alarm devices, reviewing them, and saving only the identified devices to the backend.';
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

function getToneClasses(tone: Tone) {
  switch (tone) {
    case 'emerald':
      return 'bg-[#E8F5E9] text-[#15803D]';
    case 'amber':
      return 'bg-[#FFF4E6] text-[#B45309]';
    case 'blue':
      return 'bg-[#E3F2FD] text-[#0D47A1]';
    case 'slate':
    default:
      return 'bg-[#EEF2F7] text-[#475569]';
  }
}

function TonePill({ label, tone }: { label: string; tone: Tone }) {
  return (
    <View className={`rounded-full px-3 py-1.5 ${getToneClasses(tone)}`}>
      <Text className="text-xs font-semibold uppercase tracking-[0.7px]">{label}</Text>
    </View>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-4 rounded-[28px] border border-[#E0E6ED] bg-[#FFFFFF] p-5">
      <View className="mb-4">
        <Text className="text-lg font-semibold text-[#1A202C]">{title}</Text>
        {subtitle ? <Text className="mt-1 text-sm leading-6 text-[#718096]">{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function ProgressBar({ progress }: { progress: number | null }) {
  if (progress == null) {
    return null;
  }

  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <View className="mt-3 h-2 overflow-hidden rounded-full bg-[#E2E8F0]">
      <View className="h-full rounded-full bg-[#0D47A1]" style={{ width: `${clamped * 100}%` }} />
    </View>
  );
}

function inferDeviceIdentification(device: FireAlarmDeviceDetection) {
  const labelText = device.label?.toLowerCase() ?? '';
  const manufacturerName = getManufacturerName(device.manufacturer).toLowerCase();

  if (device.identifiedByUser === true) {
    return true;
  }

  if (device.type !== 'unknown') {
    return true;
  }

  if (manufacturerName && manufacturerName !== 'unknown' && manufacturerName !== 'null') {
    return true;
  }

  if (/panel|detector|sounder|interface|io[_\s]?unit|vad/.test(labelText)) {
    return true;
  }

  return false;
}

function mergeDeviceLists(
  existingDevices: FireAlarmDeviceDetection[],
  incomingDevices: FireAlarmDeviceDetection[],
) {
  const existingById = new Map(existingDevices.map((device) => [device.id, device]));
  const merged = incomingDevices.map((incomingDevice) => {
    const existingDevice = existingById.get(incomingDevice.id);
    const identifiedByUser =
      existingDevice?.identifiedByUser ??
      incomingDevice.identifiedByUser ??
      inferDeviceIdentification(incomingDevice);

    if (!existingDevice) {
      return {
        ...incomingDevice,
        identifiedByUser,
      } satisfies FireAlarmDeviceDetection;
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
      identifiedByUser,
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

  const autoIdentifyDetectedDevices = useCallback(() => {
    setCapturedDevices((currentDevices) =>
      currentDevices.map((device) => {
        if (device.identifiedByUser === true) {
          return device;
        }

        const shouldIdentify = inferDeviceIdentification(device);

        return {
          ...device,
          identifiedByUser: shouldIdentify,
          metadata: {
            ...(device.metadata ?? {}),
            autoIdentified: device.identifiedByUser == null ? shouldIdentify : device.metadata?.autoIdentified ?? false,
          },
          notes:
            shouldIdentify && !device.notes
              ? 'Auto-identified from detection metadata.'
              : device.notes,
        };
      }),
    );
  }, []);

  useEffect(() => {
    void checkSupport();
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
  const wallCount = currentSession?.floorplan?.wallCount ?? 0;
  const currentStatus = formatStatusLabel(statusEvent, currentSession);
  const supportLabel = supportState?.isSupported ? 'Supported' : 'Not supported';
  const statusTone: Tone =
    currentStatus === 'completed'
      ? 'emerald'
      : currentStatus === 'error' || currentStatus === 'unsupported'
        ? 'amber'
        : currentStatus === 'starting' || currentStatus === 'scanning' || currentStatus === 'processing'
          ? 'blue'
          : 'slate';

  const progressRatio =
    typeof progressEvent?.progress === 'number' ? Math.max(0, Math.min(1, progressEvent.progress)) : null;

  const progressPercent = progressRatio != null ? Math.round(progressRatio * 100) : null;
  const supportTone: Tone = supportState?.isSupported ? 'emerald' : 'amber';

  return (
    <ScrollView
      className="flex-1 bg-[#F5F7FA]"
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 132 }}
    >
      <View className="mb-4 rounded-[32px] border border-[#E0E6ED] bg-[#FFFFFF] p-5">
        <View className="flex-row items-start justify-between">
          <View className="mr-4 flex-1">
            <View className="mb-3 self-start rounded-full bg-[#E3F2FD] px-3 py-1.5">
              <Text className="text-xs font-semibold uppercase tracking-[1px] text-[#718096]">
                Fire Alarm RoomPlan
              </Text>
            </View>

            <Text className="text-[28px] font-bold leading-8 text-[#1A202C]">
              Capture, identify, and review fire alarm devices
            </Text>

            <Text className="mt-2 text-sm leading-6 text-[#718096]">
              Scan the room geometry, tag visible devices, review the detected layout, and export a
              reviewed session for downstream reporting or training.
            </Text>

            <View className="mt-4 flex-row flex-wrap gap-2">
              <TonePill label={supportLabel} tone={supportTone} />
              <TonePill label={currentStatus} tone={statusTone} />
              <TonePill label={`${identifiedDevices.length} identified`} tone="blue" />
            </View>
          </View>

          <View className="h-14 w-14 items-center justify-center rounded-[20px] bg-[#E3F2FD]">
            <Ionicons
              name={currentSession ? 'layers-outline' : 'scan-outline'}
              size={26}
              color="#0D47A1"
            />
          </View>
        </View>

        <Text className="mt-4 text-sm leading-6 text-[#718096]">
          The workflow is review-first. Only devices you explicitly identify are sent to the
          backend, while the full session can still be reviewed and exported locally.
        </Text>
      </View>

      <SectionCard
        title="Capture status"
        subtitle="Check support, monitor progress, and control the active RoomPlan scan."
      >
        <View className="rounded-[24px] bg-[#F8FAFC] p-4">
          <View className="flex-row items-start justify-between">
            <View className="mr-4 flex-1">
              <Text className="text-xs font-semibold uppercase tracking-[0.8px] text-[#64748B]">
                Current status
              </Text>
              <Text className="mt-2 text-base font-semibold text-[#1A202C]">{currentStatus}</Text>
              <Text className="mt-2 text-sm leading-6 text-[#718096]">
                {formatSupportReason(supportState)}
              </Text>
            </View>

            {isCheckingSupport ? (
              <ActivityIndicator size="small" color="#0f172a" />
            ) : (
              <View className={`rounded-full px-3 py-1.5 ${getToneClasses(supportTone)}`}>
                <Text className="text-xs font-semibold uppercase tracking-[0.7px]">
                  {supportLabel}
                </Text>
              </View>
            )}
          </View>

          <ProgressBar progress={progressRatio} />

          {progressPercent != null ? (
            <Text className="mt-3 text-sm text-[#718096]">Progress: {progressPercent}%</Text>
          ) : null}

          {progressEvent?.message ? (
            <Text className="mt-1 text-sm leading-6 text-[#718096]">{progressEvent.message}</Text>
          ) : null}

          <View className="mt-4 flex-row flex-wrap gap-3">
            <View className="flex-1 rounded-2xl border border-[#E0E6ED] bg-white p-3">
              <Text className="text-xs font-semibold uppercase tracking-[0.7px] text-[#64748B]">
                Visible detections
              </Text>
              <Text className="mt-1 text-xl font-bold text-[#1A202C]">{capturedDevices.length}</Text>
            </View>

            <View className="flex-1 rounded-2xl border border-[#E0E6ED] bg-white p-3">
              <Text className="text-xs font-semibold uppercase tracking-[0.7px] text-[#64748B]">
                Identified devices
              </Text>
              <Text className="mt-1 text-xl font-bold text-[#1A202C]">{identifiedDevices.length}</Text>
            </View>
          </View>

          {errorMessage ? (
            <Text className="mt-4 text-sm font-medium text-[#B91C1C]">{errorMessage}</Text>
          ) : null}
          {saveMessage ? (
            <Text className="mt-4 text-sm font-medium text-[#15803D]">{saveMessage}</Text>
          ) : null}
        </View>

        <View className="mt-4 flex-row gap-3">
          <Pressable
            className={`flex-1 flex-row items-center justify-center rounded-2xl px-4 py-4 ${
              isScanning ? 'bg-[#C9D7F2]' : 'bg-[#0D47A1]'
            }`}
            onPress={handleStartScan}
            disabled={isScanning}
          >
            {isScanning ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="play-circle-outline" size={18} color="#FFFFFF" />
            )}
            <Text className="ml-2 text-sm font-semibold text-white">
              {isScanning ? 'Capturing...' : 'Start capture'}
            </Text>
          </Pressable>

          <Pressable
            className="flex-1 flex-row items-center justify-center rounded-2xl bg-[#1A202C] px-4 py-4"
            onPress={handleStopScan}
          >
            <Ionicons name="stop-circle-outline" size={18} color="#FFFFFF" />
            <Text className="ml-2 text-sm font-semibold text-white">Stop capture</Text>
          </Pressable>
        </View>

        {currentSession ? (
          <Pressable
            className={`mt-3 flex-row items-center justify-center rounded-2xl px-4 py-4 ${
              isSavingCapture ? 'bg-[#C6E8D5]' : 'bg-[#15803D]'
            }`}
            onPress={() => void persistCapture(currentSession, capturedDevices)}
            disabled={isSavingCapture}
          >
            {isSavingCapture ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
            )}
            <Text className="ml-2 text-sm font-semibold text-white">
              {isSavingCapture ? 'Saving capture...' : 'Save identified devices to database'}
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          className="mt-3 self-start rounded-2xl border border-[#E0E6ED] bg-white px-4 py-3"
          onPress={checkSupport}
          disabled={isCheckingSupport}
        >
          <Text className="text-sm font-semibold text-[#1A202C]">Re-check support</Text>
        </Pressable>
      </SectionCard>

      <SectionCard
        title="Live detected devices"
        subtitle="Select a detection to refine its type, manufacturer, and room placement before export."
      >
        {capturedDevices.length > 0 &&
        capturedDevices.some((device) => device.identifiedByUser !== true) ? (
          <Pressable
            className="mb-4 rounded-2xl bg-[#0D47A1] px-4 py-4"
            onPress={autoIdentifyDetectedDevices}
          >
            <Text className="text-center text-sm font-semibold text-white">
              Auto-identify likely fire alarm devices
            </Text>
          </Pressable>
        ) : null}

        {capturedDevices.length === 0 ? (
          <View className="rounded-[24px] border border-dashed border-[#CBD5E1] p-4">
            <Text className="text-sm leading-6 text-[#718096]">
              No device candidates are visible yet. Start capture and wait for rows to appear, then
              tap one to identify it.
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {capturedDevices.map((device, index) => {
              const isSelected = device.id === selectedDeviceId;
              const identified = device.identifiedByUser === true;

              return (
                <Pressable
                  key={device.id ?? `${device.type ?? 'device'}-${index}`}
                  className={`rounded-[24px] p-4 ${
                    identified
                      ? isSelected
                        ? 'border border-[#0D47A1] bg-[#EAF1FF]'
                        : 'border border-[#BFD7FF] bg-[#F3F8FF]'
                      : isSelected
                        ? 'border border-[#2563EB] bg-[#EAF1FF]'
                        : 'border border-[#E0E6ED] bg-[#FAFBFC]'
                  }`}
                  onPress={() => setSelectedDeviceId(device.id)}
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-3">
                      <Text className="text-sm font-semibold text-[#1A202C]">
                        {device.label?.trim() || formatDeviceType(device.type ?? 'unknown')}
                      </Text>
                      <Text className="mt-1 text-sm text-[#718096]">
                        {formatDeviceType(device.type ?? 'unknown')} ·{' '}
                        {formatManufacturer(device.manufacturer)}
                      </Text>

                      <Text className="mt-2 text-xs text-[#718096]">
                        {formatLocation(device.location)}
                      </Text>

                      {device.roomId ? (
                        <Text className="mt-1 text-xs text-[#718096]">Room: {device.roomId}</Text>
                      ) : null}

                      {device.wallSegmentId ? (
                        <Text className="mt-1 text-xs text-[#718096]">
                          Wall segment: {device.wallSegmentId}
                        </Text>
                      ) : null}
                    </View>

                    <View className="items-end">
                      <Ionicons
                        name={identified ? 'checkmark-circle' : 'hardware-chip-outline'}
                        size={18}
                        color={identified ? '#16a34a' : '#475569'}
                      />
                      <Text
                        className={`mt-1 text-[11px] font-semibold ${
                          identified ? 'text-[#15803D]' : 'text-[#475569]'
                        }`}
                      >
                        {identified ? 'Identified' : 'Needs ID'}
                      </Text>
                    </View>
                  </View>

                  {device.confidence != null ? (
                    <Text className="mt-3 text-xs text-[#64748B]">
                      {formatConfidence(device.confidence)}
                    </Text>
                  ) : null}

                  {device.evidenceFrames?.length ? (
                    <Text className="mt-1 text-xs text-[#64748B]">
                      Evidence frames: {device.evidenceFrames.length}
                    </Text>
                  ) : null}

                  {device.notes ? (
                    <Text className="mt-3 text-xs leading-5 text-[#64748B]">{device.notes}</Text>
                  ) : null}

                  {isSelected ? (
                    <Text className="mt-3 text-xs font-semibold uppercase tracking-wide text-[#0D47A1]">
                      Selected for editing
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}
      </SectionCard>

      {selectedDevice ? (
        <SectionCard
          title="Edit selected device"
          subtitle="Adjust the selected detection so the exported session reflects the reviewed fire alarm layout."
        >
          <Text className="text-xs font-semibold uppercase tracking-[0.8px] text-[#64748B]">
            Device label
          </Text>
          <TextInput
            className="mt-2 rounded-2xl border border-[#E0E6ED] bg-white px-4 py-3 text-sm text-[#1A202C]"
            placeholder="Enter a label for this device"
            placeholderTextColor="#94A3B8"
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

          <Text className="mt-4 text-xs font-semibold uppercase tracking-[0.8px] text-[#64748B]">
            Device type
          </Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {DEVICE_TYPES.map((typeOption) => {
              const selected = selectedDevice.type === typeOption;

              return (
                <Pressable
                  key={typeOption}
                  className={`rounded-full border px-3 py-2 ${
                    selected ? 'border-[#0D47A1] bg-[#EAF1FF]' : 'border-[#E0E6ED] bg-white'
                  }`}
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
                  <Text
                    className={`text-xs font-medium ${
                      selected ? 'text-[#0D47A1]' : 'text-[#334155]'
                    }`}
                  >
                    {formatDeviceType(typeOption)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="mt-4 text-xs font-semibold uppercase tracking-[0.8px] text-[#64748B]">
            Manufacturer
          </Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {MANUFACTURER_OPTIONS.map((option) => {
              const selected = getManufacturerName(selectedDevice.manufacturer) === option;

              return (
                <Pressable
                  key={option}
                  className={`rounded-full border px-3 py-2 ${
                    selected ? 'border-[#15803D] bg-[#E8F5E9]' : 'border-[#E0E6ED] bg-white'
                  }`}
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
                  <Text
                    className={`text-xs font-medium ${
                      selected ? 'text-[#15803D]' : 'text-[#334155]'
                    }`}
                  >
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="mt-4 text-xs font-semibold uppercase tracking-[0.8px] text-[#64748B]">
            Notes
          </Text>
          <TextInput
            className="mt-2 min-h-[96px] rounded-2xl border border-[#E0E6ED] bg-white px-4 py-3 text-sm text-[#1A202C]"
            placeholder="Add review notes, mounting hints, or uncertainty comments"
            placeholderTextColor="#94A3B8"
            multiline
            textAlignVertical="top"
            value={selectedDevice.notes ?? ''}
            onChangeText={(value) =>
              updateSelectedDevice((currentDevice) => ({
                ...currentDevice,
                notes: value,
                metadata: {
                  ...(currentDevice.metadata ?? {}),
                  identifiedByUser: currentDevice.identifiedByUser ?? false,
                },
              }))
            }
          />

          <Text className="mt-4 text-xs font-semibold uppercase tracking-[0.8px] text-[#64748B]">
            Approximate location
          </Text>
          <View className="mt-2 flex-row gap-3">
            <View className="flex-1">
              <Text className="mb-1 text-xs text-[#718096]">X</Text>
              <TextInput
                value={String(selectedDevice.location?.x ?? 0)}
                keyboardType="decimal-pad"
                onChangeText={(value) =>
                  updateSelectedDevice((currentDevice) => ({
                    ...currentDevice,
                    location: {
                      x: Number(value) || 0,
                      y: currentDevice.location?.y ?? 0,
                      z: currentDevice.location?.z ?? 0,
                    },
                    metadata: {
                      ...(currentDevice.metadata ?? {}),
                      identifiedByUser: currentDevice.identifiedByUser ?? false,
                    },
                  }))
                }
                className="rounded-2xl border border-[#E0E6ED] bg-white px-4 py-3 text-sm text-[#1A202C]"
              />
            </View>

            <View className="flex-1">
              <Text className="mb-1 text-xs text-[#718096]">Y</Text>
              <TextInput
                value={String(selectedDevice.location?.y ?? 0)}
                keyboardType="decimal-pad"
                onChangeText={(value) =>
                  updateSelectedDevice((currentDevice) => ({
                    ...currentDevice,
                    location: {
                      x: currentDevice.location?.x ?? 0,
                      y: Number(value) || 0,
                      z: currentDevice.location?.z ?? 0,
                    },
                    metadata: {
                      ...(currentDevice.metadata ?? {}),
                      identifiedByUser: currentDevice.identifiedByUser ?? false,
                    },
                  }))
                }
                className="rounded-2xl border border-[#E0E6ED] bg-white px-4 py-3 text-sm text-[#1A202C]"
              />
            </View>

            <View className="flex-1">
              <Text className="mb-1 text-xs text-[#718096]">Z</Text>
              <TextInput
                value={String(selectedDevice.location?.z ?? 0)}
                keyboardType="decimal-pad"
                onChangeText={(value) =>
                  updateSelectedDevice((currentDevice) => ({
                    ...currentDevice,
                    location: {
                      x: currentDevice.location?.x ?? 0,
                      y: currentDevice.location?.y ?? 0,
                      z: Number(value) || 0,
                    },
                    metadata: {
                      ...(currentDevice.metadata ?? {}),
                      identifiedByUser: currentDevice.identifiedByUser ?? false,
                    },
                  }))
                }
                className="rounded-2xl border border-[#E0E6ED] bg-white px-4 py-3 text-sm text-[#1A202C]"
              />
            </View>
          </View>

          <View className="mt-4 flex-row gap-3">
            <Pressable
              className={`flex-1 rounded-2xl px-4 py-4 ${
                selectedDevice.identifiedByUser ? 'bg-[#15803D]' : 'bg-[#1A202C]'
              }`}
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
              className="flex-1 rounded-2xl bg-[#EEF2F7] px-4 py-4"
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
              <Text className="text-center text-sm font-semibold text-[#1A202C]">Ignore this item</Text>
            </Pressable>
          </View>
        </SectionCard>
      ) : null}

      <SectionCard
        title="Session summary"
        subtitle="Review the captured session state before opening the review or export screens."
      >
        {currentSession ? (
          <View className="gap-3">
            <View className="rounded-[24px] bg-[#F8FAFC] p-4">
              <Text className="text-sm font-semibold text-[#1A202C]">Latest session</Text>
              <Text className="mt-1 text-sm text-[#718096]">Session ID: {currentSession.id}</Text>
              <Text className="mt-1 text-sm text-[#718096]">
                Status: {currentSession.status ?? 'unknown'}
              </Text>
              <Text className="mt-1 text-sm text-[#718096]">Rooms captured: {roomCount}</Text>
              <Text className="mt-1 text-sm text-[#718096]">Wall count: {wallCount}</Text>
              <Text className="mt-1 text-sm text-[#718096]">Visible devices: {capturedDevices.length}</Text>
              <Text className="mt-1 text-sm text-[#718096]">
                Identified fire alarm devices: {identifiedDevices.length}
              </Text>
              <Text className="mt-1 text-sm text-[#718096]">
                Units: {currentSession.floorplan?.units ?? 'Unavailable'}
              </Text>
              <Text className="mt-1 text-sm text-[#718096]">
                Started: {currentSession.metadata?.startedAt ?? 'Unavailable'}
              </Text>
            </View>

            <View className="gap-3">
              <Pressable
                className="rounded-2xl bg-[#0D47A1] px-4 py-4"
                onPress={() =>
                  router.push({
                    pathname: '/room-plan/session/[id]',
                    params: { id: currentSession.id },
                  })
                }
              >
                <Text className="text-sm font-semibold text-white">Open session summary</Text>
              </Pressable>

              <Pressable
                className="rounded-2xl bg-[#15803D] px-4 py-4"
                onPress={() =>
                  router.push({
                    pathname: '/room-plan/review',
                    params: { sessionId: currentSession.id },
                  })
                }
              >
                <Text className="text-sm font-semibold text-white">Review and edit session</Text>
              </Pressable>

              <Pressable
                className="rounded-2xl bg-[#1A202C] px-4 py-4"
                onPress={() =>
                  router.push({
                    pathname: '/room-plan/export',
                    params: { sessionId: currentSession.id },
                  })
                }
              >
                <Text className="text-sm font-semibold text-white">Open export flow</Text>
              </Pressable>

              <Pressable
                className="self-start rounded-2xl bg-[#EEF2F7] px-4 py-3"
                onPress={handleExportSession}
              >
                <Text className="text-sm font-semibold text-[#1A202C]">Preview raw session JSON</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View className="rounded-[24px] border border-dashed border-[#CBD5E1] p-4">
            <Text className="text-sm leading-6 text-[#718096]">
              No session returned yet. Start a capture to create the scan session that review and
              export screens will use.
            </Text>
          </View>
        )}
      </SectionCard>

      {exportedSession ? (
        <SectionCard
          title="Raw export preview"
          subtitle="This payload is ready for downstream review, sharing, or analysis."
        >
          <Text className="rounded-[24px] bg-[#0F172A] p-4 font-mono text-xs leading-5 text-[#E2E8F0]">
            {exportedSession}
          </Text>
        </SectionCard>
      ) : null}

      <SectionCard
        title="Workflow checklist"
        subtitle="The RoomPlan flow is built to support review-first fire alarm surveys."
      >
        <View className="gap-2">
          <View className="flex-row items-start">
            <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
            <Text className="ml-2 flex-1 text-sm text-[#334155]">
              Room capture is available through the Fire Alarm RoomPlan bridge
            </Text>
          </View>
          <View className="flex-row items-start">
            <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
            <Text className="ml-2 flex-1 text-sm text-[#334155]">
              Detected devices can be identified during capture
            </Text>
          </View>
          <View className="flex-row items-start">
            <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
            <Text className="ml-2 flex-1 text-sm text-[#334155]">
              Review and export screens are linked directly from the session summary
            </Text>
          </View>
          <View className="flex-row items-start">
            <Ionicons name="ellipse-outline" size={16} color="#64748b" />
            <Text className="ml-2 flex-1 text-sm text-[#334155]">
              Only identified fire alarm devices are saved to the backend
            </Text>
          </View>
        </View>
      </SectionCard>
    </ScrollView>
  );
}
