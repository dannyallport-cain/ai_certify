import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import type { FireAlarmScanSession } from '@/modules/fire-alarm-roomplan';

function buildFallbackSession(): FireAlarmScanSession {
  const now = new Date().toISOString();

  return {
    id: `export-session-${Date.now()}`,
    status: 'completed',
    metadata: {
      startedAt: now,
      endedAt: now,
      platform: 'mobile',
      scannerVersion: 'export-ui-m1',
      sessionName: 'Export preview session',
    },
    floorplan: {
      units: 'meters',
      rooms: [],
      deviceCount: 0,
      wallCount: 0,
    },
    devices: [],
    rawPayload: {
      source: 'export-screen-fallback',
    },
  };
}

function parseSessionParam(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (!rawValue) {
    return buildFallbackSession();
  }

  try {
    return JSON.parse(rawValue) as FireAlarmScanSession;
  } catch {
    return buildFallbackSession();
  }
}

export default function RoomPlanExportScreen() {
  const params = useLocalSearchParams<{ session?: string }>();
  const session = useMemo(() => parseSessionParam(params.session), [params.session]);

  const exportJson = useMemo(() => JSON.stringify(session, null, 2), [session]);

  const handleShare = async () => {
    try {
      await Share.share({
        title: `RoomPlan Session ${session.id}`,
        message: exportJson,
      });
    } catch (error) {
      Alert.alert('Unable to share', error instanceof Error ? error.message : 'Unknown share error');
    }
  };

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 24 }}>
      <View className="mb-6 flex-row items-center">
        <View className="mr-3 h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100">
          <Ionicons name="share-social-outline" size={24} color="#059669" />
        </View>
        <View className="flex-1">
          <Text className="text-2xl font-bold text-slate-900">Export reviewed session</Text>
          <Text className="mt-1 text-sm text-slate-600">
            This preview shows the share-ready JSON payload for the reviewed RoomPlan session. It can
            be stored locally, attached to an inspection record, or handed to later analysis stages.
          </Text>
        </View>
      </View>

      <View className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <Text className="text-base font-semibold text-slate-900">Export summary</Text>
        <Text className="mt-2 text-sm text-slate-600">Session ID: {session.id}</Text>
        <Text className="mt-1 text-sm text-slate-600">Status: {session.status}</Text>
        <Text className="mt-1 text-sm text-slate-600">Devices included: {session.devices.length}</Text>
        <Text className="mt-1 text-sm text-slate-600">
          Rooms included: {session.floorplan?.rooms?.length ?? 0}
        </Text>

        <Pressable className="mt-4 rounded-xl bg-emerald-600 px-4 py-3" onPress={handleShare}>
          <Text className="text-center text-sm font-semibold text-white">Share JSON payload</Text>
        </Pressable>
      </View>

      <View className="rounded-2xl border border-slate-200 bg-slate-900 p-4">
        <Text className="mb-3 text-base font-semibold text-white">JSON preview</Text>
        <Text className="font-mono text-xs leading-5 text-slate-100">{exportJson}</Text>
      </View>
    </ScrollView>
  );
}