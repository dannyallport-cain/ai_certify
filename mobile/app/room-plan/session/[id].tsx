import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import type { FireAlarmScanSession } from '@/modules/fire-alarm-roomplan';
import { getRoomPlanSession, saveRoomPlanSession } from '@/services/roomplan/session-store';

function buildFallbackSession(id?: string): FireAlarmScanSession {
  const now = new Date().toISOString();

  return {
    id: id ?? `session-${Date.now()}`,
    status: 'completed',
    metadata: {
      startedAt: now,
      endedAt: now,
      platform: 'mobile',
      scannerVersion: 'session-screen-m1',
      sessionName: 'Session summary',
    },
    floorplan: {
      units: 'meters',
      rooms: [],
      deviceCount: 0,
      wallCount: 0,
    },
    devices: [],
    rawPayload: null,
  };
}

function parseSessionParam(
  value: string | string[] | undefined,
  id?: string | string[],
): FireAlarmScanSession {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const rawId = Array.isArray(id) ? id[0] : id;

  if (!rawValue) {
    return buildFallbackSession(rawId);
  }

  try {
    return JSON.parse(rawValue) as FireAlarmScanSession;
  } catch {
    return buildFallbackSession(rawId);
  }
}

function formatTypeLabel(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function RoomPlanSessionScreen() {
  const params = useLocalSearchParams<{ id?: string; session?: string }>();
  const [session, setSession] = useState<FireAlarmScanSession | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const loadSession = async () => {
      const parsedSession = parseSessionParam(params.session, params.id);

      if (params.session) {
        if (!isCancelled) {
          setSession(parsedSession);
        }
        await saveRoomPlanSession(parsedSession);
        return;
      }

      const sessionId = Array.isArray(params.id) ? params.id[0] : params.id;
      if (sessionId) {
        const storedSession = await getRoomPlanSession(sessionId);
        if (storedSession) {
          if (!isCancelled) {
            setSession(storedSession);
          }
          return;
        }
      }

      if (!isCancelled) {
        setSession(parsedSession);
      }
    };

    void loadSession();

    return () => {
      isCancelled = true;
    };
  }, [params.id, params.session]);

  const reviewHref = useMemo(() => {
    if (!session) {
      return null;
    }

    return {
      pathname: '/room-plan/review',
      params: {
        sessionId: session.id,
        session: JSON.stringify(session),
      },
    } as const;
  }, [session]);

  if (!session) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <ActivityIndicator size="small" color="#0f172a" />
        <Text className="mt-3 text-sm text-slate-600">Loading RoomPlan session…</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 24 }}>
      <View className="mb-6 flex-row items-center">
        <View className="mr-3 h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
          <Ionicons name="albums-outline" size={24} color="#0f172a" />
        </View>
        <View className="flex-1">
          <Text className="text-2xl font-bold text-slate-900">Session details</Text>
          <Text className="mt-1 text-sm text-slate-600">
            Review the captured session summary, then continue to manual device review and export.
          </Text>
        </View>
      </View>

      <View className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <Text className="text-base font-semibold text-slate-900">Session overview</Text>
        <Text className="mt-2 text-sm text-slate-600">Session ID: {session.id}</Text>
        <Text className="mt-1 text-sm text-slate-600">Status: {session.status}</Text>
        <Text className="mt-1 text-sm text-slate-600">
          Started: {session.metadata.startedAt ?? 'Unavailable'}
        </Text>
        <Text className="mt-1 text-sm text-slate-600">
          Ended: {session.metadata.endedAt ?? 'Unavailable'}
        </Text>
        <Text className="mt-1 text-sm text-slate-600">
          Rooms captured: {session.floorplan?.rooms?.length ?? 0}
        </Text>
        <Text className="mt-1 text-sm text-slate-600">Devices captured: {session.devices.length}</Text>

        <Link href={reviewHref!} asChild>
          <Pressable className="mt-4 rounded-xl bg-blue-600 px-4 py-3">
            <Text className="text-center text-sm font-semibold text-white">Open review workflow</Text>
          </Pressable>
        </Link>
      </View>

      <View className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
        <Text className="text-base font-semibold text-slate-900">Room summary</Text>
        {(session.floorplan?.rooms?.length ?? 0) === 0 ? (
          <Text className="mt-3 text-sm text-slate-500">
            No room geometry summary is available in this session payload yet.
          </Text>
        ) : (
          <View className="mt-3 gap-3">
            {session.floorplan?.rooms.map((room) => (
              <View key={room.id} className="rounded-xl bg-slate-50 p-4">
                <Text className="text-sm font-semibold text-slate-900">{room.name ?? room.id}</Text>
                <Text className="mt-1 text-sm text-slate-600">
                  Area: {room.areaSquareMeters ?? 'Unknown'} m²
                </Text>
                <Text className="mt-1 text-sm text-slate-600">
                  Wall segments: {room.wallSegments?.length ?? 0}
                </Text>
                <Text className="mt-1 text-sm text-slate-600">
                  Openings: {room.openings?.length ?? 0}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View className="rounded-2xl border border-slate-200 bg-white p-4">
        <Text className="text-base font-semibold text-slate-900">Devices in session</Text>
        {session.devices.length === 0 ? (
          <Text className="mt-3 text-sm text-slate-500">
            No device detections are currently present. The review screen can still be used to add
            manual devices before export.
          </Text>
        ) : (
          <View className="mt-3 gap-3">
            {session.devices.map((device) => (
              <View key={device.id} className="rounded-xl bg-slate-50 p-4">
                <Text className="text-sm font-semibold text-slate-900">
                  {formatTypeLabel(device.type)}
                </Text>
                <Text className="mt-1 text-sm text-slate-600">Device ID: {device.id}</Text>
                <Text className="mt-1 text-sm text-slate-600">
                  Room: {device.roomId ?? 'Unassigned'}
                </Text>
                <Text className="mt-1 text-sm text-slate-600">
                  Source: {device.source ?? 'unknown'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
