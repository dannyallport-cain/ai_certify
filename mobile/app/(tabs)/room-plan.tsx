import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import {
  FireAlarmRoomPlan,
  type FireAlarmManufacturer,
  type FireAlarmRoomPlanProgressEvent,
  type FireAlarmRoomPlanStatusEvent,
  type FireAlarmRoomPlanSupportInfo,
  type FireAlarmScanSession,
} from '@/modules/fire-alarm-roomplan';
import { saveRoomPlanSession } from '@/services/roomplan/session-store';

type SupportState = FireAlarmRoomPlanSupportInfo;

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

function formatSupportReason(supportState: SupportState | null) {
  if (!supportState) {
    return 'Checking current device capabilities and native module availability.';
  }

  if (supportState.isSupported) {
    return 'This device can start the FireAlarmRoomPlan capture bridge. Milestone M1 focuses on real room geometry, a persisted session contract, manual review, and share-ready export. It does not claim live fire alarm ML inference yet.';
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

export default function RoomPlanScreen() {
  const [supportState, setSupportState] = useState<SupportState | null>(null);
  const [isCheckingSupport, setIsCheckingSupport] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [session, setSession] = useState<FireAlarmScanSession | null>(null);
  const [statusEvent, setStatusEvent] = useState<FireAlarmRoomPlanStatusEvent | null>(null);
  const [progressEvent, setProgressEvent] = useState<FireAlarmRoomPlanProgressEvent | null>(null);
  const [exportedSession, setExportedSession] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      setErrorMessage(error instanceof Error ? error.message : 'Unknown support check error.');
    } finally {
      setIsCheckingSupport(false);
    }
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

    const sessionSubscription = FireAlarmRoomPlan.addSessionListener((event) => {
      void saveRoomPlanSession(event.session);
      setSession(event.session);
      setIsScanning(false);
    });

    return () => {
      statusSubscription.remove();
      progressSubscription.remove();
      sessionSubscription.remove();
    };
  }, []);

  const handleStartScan = useCallback(async () => {
    setIsScanning(true);
    setErrorMessage(null);
    setExportedSession(null);
    setProgressEvent(null);

    try {
      const nextSession = await FireAlarmRoomPlan.startScan({
        detectDevices: false,
        detectManufacturers: false,
        preferredUnits: 'meters',
        roomName: 'Commercial area survey',
      });

      await saveRoomPlanSession(nextSession);
      setSession(nextSession);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to start RoomPlan scan.');
      setIsScanning(false);
    }
  }, []);

  const handleStopScan = useCallback(async () => {
    setErrorMessage(null);

    try {
      await FireAlarmRoomPlan.stopScan();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to stop RoomPlan scan.');
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
      const exported = await FireAlarmRoomPlan.exportSession(session, { pretty: true });
      setExportedSession(exported);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to export session.');
    }
  }, [session]);

  const devices = useMemo(() => session?.devices ?? [], [session]);
  const roomCount = session?.floorplan?.rooms?.length ?? 0;
  const currentStatus = formatStatusLabel(statusEvent, session);
  const supportLabel = supportState?.isSupported ? 'Supported' : 'Not supported';
  const progressPercent =
    typeof progressEvent?.progress === 'number' ? Math.round(progressEvent.progress * 100) : null;

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 24 }}>
      <View className="mb-6 flex-row items-center">
        <View className="mr-3 h-12 w-12 items-center justify-center rounded-2xl bg-red-100">
          <Ionicons name="scan-outline" size={24} color="#dc2626" />
        </View>
        <View className="flex-1">
          <Text className="text-2xl font-bold text-slate-900">RoomPlan milestone M1</Text>
          <Text className="mt-1 text-sm text-slate-600">
            Capture real room geometry, keep a reusable scan session, then continue into manual
            review and export. ML detection and manufacturer inference are intentionally not part of
            this milestone.
          </Text>
        </View>
      </View>

      <View className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <View className="flex-row items-start">
          <Ionicons name="information-circle-outline" size={18} color="#2563eb" />
          <View className="ml-2 flex-1">
            <Text className="text-sm font-semibold text-blue-900">What this tab does today</Text>
            <Text className="mt-1 text-sm leading-5 text-blue-800">
              This launchpad is scoped to room capture, session persistence, review entry points,
              and share-ready export. If any device rows appear, treat them as session data to
              review manually rather than validated ML output.
            </Text>
          </View>
        </View>
      </View>

      <View className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-semibold text-slate-900">Platform support</Text>
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

        <Text className="mt-3 text-sm leading-5 text-slate-600">{formatSupportReason(supportState)}</Text>

        {errorMessage ? <Text className="mt-3 text-sm text-red-600">{errorMessage}</Text> : null}

        <Pressable
          className="mt-4 self-start rounded-xl bg-slate-900 px-4 py-3"
          onPress={checkSupport}
          disabled={isCheckingSupport}
        >
          <Text className="text-sm font-semibold text-white">Re-check support</Text>
        </Pressable>
      </View>

      <View className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
        <Text className="text-base font-semibold text-slate-900">Capture workflow</Text>
        <Text className="mt-2 text-sm leading-5 text-slate-600">
          Start capture to produce a FireAlarmScanSession. That session becomes the handoff point
          for local storage, manual correction, and final JSON export.
        </Text>

        <View className="mt-4 rounded-xl bg-slate-50 p-4">
          <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Current status
          </Text>
          <Text className="mt-2 text-base font-semibold text-slate-900">{currentStatus}</Text>
          {statusEvent?.timestamp ? (
            <Text className="mt-1 text-sm text-slate-600">Last update: {statusEvent.timestamp}</Text>
          ) : null}
          {statusEvent?.sessionId ? (
            <Text className="mt-1 text-sm text-slate-600">Session ID: {statusEvent.sessionId}</Text>
          ) : null}
          {progressPercent != null ? (
            <Text className="mt-1 text-sm text-slate-600">Progress: {progressPercent}%</Text>
          ) : null}
          {progressEvent?.message ? (
            <Text className="mt-1 text-sm text-slate-600">{progressEvent.message}</Text>
          ) : null}
        </View>

        <View className="mt-4 flex-row gap-3">
          <Pressable
            className={`flex-1 flex-row items-center justify-center rounded-xl px-4 py-3 ${isScanning ? 'bg-slate-300' : 'bg-red-600'}`}
            onPress={handleStartScan}
            disabled={isScanning}
          >
            {isScanning ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="play-circle-outline" size={18} color="#ffffff" />
            )}
            <Text className="ml-2 text-sm font-semibold text-white">
              {isScanning ? 'Starting capture...' : 'Start capture'}
            </Text>
          </Pressable>

          <Pressable
            className="flex-1 flex-row items-center justify-center rounded-xl bg-slate-900 px-4 py-3"
            onPress={handleStopScan}
          >
            <Ionicons name="stop-circle-outline" size={18} color="#ffffff" />
            <Text className="ml-2 text-sm font-semibold text-white">Stop capture</Text>
          </Pressable>
        </View>
      </View>

      <View className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
        <Text className="text-base font-semibold text-slate-900">Session summary</Text>
        <Text className="mt-2 text-sm leading-5 text-slate-600">
          The captured session is the source of truth for milestone M1. Review and export flows
          should consume this model directly rather than relying on any unfinished recognition step.
        </Text>

        {session ? (
          <View className="mt-4 gap-3">
            <View className="rounded-xl bg-slate-50 p-4">
              <Text className="text-sm font-semibold text-slate-900">Latest session</Text>
              <Text className="mt-2 text-sm text-slate-600">Session ID: {session.id || 'Unavailable'}</Text>
              <Text className="mt-1 text-sm text-slate-600">Status: {session.status ?? 'unknown'}</Text>
              <Text className="mt-1 text-sm text-slate-600">Rooms captured: {roomCount}</Text>
              <Text className="mt-1 text-sm text-slate-600">Devices listed: {devices.length}</Text>
              <Text className="mt-1 text-sm text-slate-600">
                Units: {session.floorplan?.units ?? 'Unavailable'}
              </Text>
              <Text className="mt-1 text-sm text-slate-600">
                Started: {session.metadata?.startedAt ?? 'Unavailable'}
              </Text>
              {session.metadata?.endedAt ? (
                <Text className="mt-1 text-sm text-slate-600">Ended: {session.metadata.endedAt}</Text>
              ) : null}
            </View>

            <View className="gap-3">
              <Pressable
                className="rounded-xl bg-blue-600 px-4 py-3"
                onPress={() => router.push(`/room-plan/session/${encodeURIComponent(session.id)}` as never)}
              >
                <Text className="text-sm font-semibold text-white">Open session summary</Text>
              </Pressable>

              <Pressable
                className="rounded-xl bg-emerald-600 px-4 py-3"
                onPress={() => router.push(`/room-plan/review?sessionId=${encodeURIComponent(session.id)}` as never)}
              >
                <Text className="text-sm font-semibold text-white">Review and edit session</Text>
              </Pressable>

              <Pressable
                className="rounded-xl bg-slate-900 px-4 py-3"
                onPress={() => router.push(`/room-plan/export?sessionId=${encodeURIComponent(session.id)}` as never)}
              >
                <Text className="text-sm font-semibold text-white">Open export flow</Text>
              </Pressable>

              <Pressable
                className="self-start rounded-xl bg-slate-200 px-4 py-3"
                onPress={handleExportSession}
              >
                <Text className="text-sm font-semibold text-slate-900">Preview raw session JSON</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View className="mt-4 rounded-xl border border-dashed border-slate-300 p-4">
            <Text className="text-sm text-slate-500">
              No session returned yet. Start a capture to create the scan session that review and
              export screens will use.
            </Text>
          </View>
        )}
      </View>

      <View className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
        <Text className="text-base font-semibold text-slate-900">Current device entries</Text>
        <Text className="mt-2 text-sm leading-5 text-slate-600">
          Manual review is expected in this milestone. Device rows below are only the current
          session contents and may be empty until later inference work is added.
        </Text>

        {devices.length === 0 ? (
          <View className="mt-4 rounded-xl border border-dashed border-slate-300 p-4">
            <Text className="text-sm text-slate-500">
              No device records are present in the current session yet. The review flow should still
              support manual add and edit.
            </Text>
          </View>
        ) : (
          <View className="mt-4 gap-3">
            {devices.slice(0, 5).map((device, index) => (
              <View key={device.id ?? `${device.type ?? 'device'}-${index}`} className="rounded-xl bg-slate-50 p-4">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-sm font-semibold text-slate-900">
                      {formatDeviceType(device.type ?? 'unknown')}
                    </Text>
                    <Text className="mt-1 text-sm text-slate-600">
                      {formatManufacturer(device.manufacturer)}
                    </Text>
                  </View>
                  <Ionicons name="hardware-chip-outline" size={18} color="#475569" />
                </View>

                {device.confidence != null ? (
                  <Text className="mt-2 text-xs text-slate-500">
                    Confidence field: {Math.round(Number(device.confidence) * 100)}%
                  </Text>
                ) : null}

                {device.notes ? (
                  <Text className="mt-2 text-xs text-slate-500">{device.notes}</Text>
                ) : null}
              </View>
            ))}

            {devices.length > 5 ? (
              <Text className="text-xs text-slate-500">
                Showing 5 of {devices.length} entries. Open review for full editing.
              </Text>
            ) : null}
          </View>
        )}
      </View>

      {exportedSession ? (
        <View className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <Text className="text-base font-semibold text-emerald-900">Raw export preview</Text>
          <Text className="mt-2 text-sm leading-5 text-emerald-800">
            This is a local JSON preview from the module contract. The dedicated export screen can
            present the same payload in a review-and-share flow.
          </Text>
          <Text className="mt-3 font-mono text-xs leading-5 text-emerald-900">{exportedSession}</Text>
        </View>
      ) : null}

      <View className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <Text className="text-base font-semibold text-slate-900">Milestone checklist</Text>
        <View className="mt-3 gap-2">
          <View className="flex-row items-start">
            <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
            <Text className="ml-2 flex-1 text-sm text-slate-700">Native-oriented RoomPlan capture contract</Text>
          </View>
          <View className="flex-row items-start">
            <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
            <Text className="ml-2 flex-1 text-sm text-slate-700">Persisted FireAlarmScanSession workflow</Text>
          </View>
          <View className="flex-row items-start">
            <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
            <Text className="ml-2 flex-1 text-sm text-slate-700">Manual review and correction entry points</Text>
          </View>
          <View className="flex-row items-start">
            <Ionicons name="ellipse-outline" size={16} color="#64748b" />
            <Text className="ml-2 flex-1 text-sm text-slate-700">Real ML inference deferred to a later milestone</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
