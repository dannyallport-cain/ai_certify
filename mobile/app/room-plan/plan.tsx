import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import Plan3DCanvas from '@/components/roomplan/Plan3DCanvas';
import Plan3DDisplayControls from '@/components/roomplan/Plan3DDisplayControls';
import Plan3DSummary from '@/components/roomplan/Plan3DSummary';
import Plan3DViewControls from '@/components/roomplan/Plan3DViewControls';
import SendZonePlanModal from '@/components/roomplan/SendZonePlanModal';
import { usePlan3DOrbitCamera } from '@/components/roomplan/usePlan3DOrbitCamera';
import {
  DEFAULT_PLAN3D_WALL_HEIGHT_METERS,
  createSampleScanSession,
  generateFireAlarmPlan3D,
  getPlan3DProjectionPreset,
  renderFireAlarmPlan3DSvg,
  type FireAlarmPlan3D,
  type FireAlarmScanSession,
  type Plan3DColourScheme,
  type Plan3DProjection,
} from '@/modules/fire-alarm-roomplan';
import { getRoomPlanSession } from '@/services/roomplan/session-store';

interface Plan3DViewState {
  projection: Plan3DProjection;
  wallHeightMeters: number;
  showCeiling: boolean;
  showFloorGrid: boolean;
  showDevices: boolean;
  showLabels: boolean;
  colourScheme: Plan3DColourScheme;
}

const HORIZONTAL_PADDING = 16;
const MAX_CANVAS_WIDTH = 560;
const CANVAS_ASPECT_RATIO = 0.82;
const CANVAS_PADDING = 26;
const SVG_EXPORT_SCALE = 3;
const INITIAL_PROJECTION: Plan3DProjection = 'isometric';
/** Matches Plan3DViewControls so its stepper range is not silently clamped. */
const MIN_CAMERA_PITCH_DEGREES = 5;
const MAX_CAMERA_PITCH_DEGREES = 89;

function createInitialViewState(): Plan3DViewState {
  return {
    projection: 'isometric',
    wallHeightMeters: DEFAULT_PLAN3D_WALL_HEIGHT_METERS,
    showCeiling: false,
    showFloorGrid: true,
    showDevices: true,
    showLabels: true,
    colourScheme: 'blueprint',
  };
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseSessionParam(value: string | undefined): FireAlarmScanSession | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as FireAlarmScanSession;

    return parsed && typeof parsed.id === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

export default function RoomPlanPlanScreen() {
  const params = useLocalSearchParams<{ sessionId?: string; id?: string; session?: string }>();
  const { width: windowWidth } = useWindowDimensions();

  const requestedSessionId = firstParam(params.sessionId) ?? firstParam(params.id) ?? null;
  const [session, setSession] = useState<FireAlarmScanSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<Plan3DViewState>(createInitialViewState);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isSendOpen, setIsSendOpen] = useState(false);

  // The camera is the one piece of view state a gesture can change, so the hook owns it and the
  // projection chips and steppers write back through setCamera.
  const initialPreset = getPlan3DProjectionPreset(INITIAL_PROJECTION);
  const orbit = usePlan3DOrbitCamera({
    initial: {
      yawDegrees: initialPreset.yawDegrees,
      pitchDegrees: initialPreset.pitchDegrees,
      zoom: 1,
    },
    minPitchDegrees: MIN_CAMERA_PITCH_DEGREES,
    maxPitchDegrees: MAX_CAMERA_PITCH_DEGREES,
  });

  const resetView = useCallback(() => {
    const preset = getPlan3DProjectionPreset(view.projection);

    orbit.setCamera({ yawDegrees: preset.yawDegrees, pitchDegrees: preset.pitchDegrees, zoom: 1 });
  }, [orbit, view.projection]);

  const inlineSession = useMemo(() => parseSessionParam(firstParam(params.session)), [params.session]);

  useEffect(() => {
    let isCancelled = false;

    const loadSession = async () => {
      setIsLoading(true);

      if (inlineSession) {
        if (!isCancelled) {
          setSession(inlineSession);
          setIsLoading(false);
        }
        return;
      }

      if (requestedSessionId) {
        const storedSession = await getRoomPlanSession(requestedSessionId);

        if (!isCancelled) {
          setSession(storedSession);
          setIsLoading(false);
        }
        return;
      }

      if (!isCancelled) {
        setSession(null);
        setIsLoading(false);
      }
    };

    void loadSession();

    return () => {
      isCancelled = true;
    };
  }, [inlineSession, requestedSessionId]);

  const canvasWidth = Math.min(windowWidth - HORIZONTAL_PADDING * 2, MAX_CANVAS_WIDTH);
  const canvasHeight = Math.round(canvasWidth * CANVAS_ASPECT_RATIO);

  const plan = useMemo<FireAlarmPlan3D | null>(() => {
    if (!session) {
      return null;
    }

    return generateFireAlarmPlan3D(session, {
      camera: {
        projection: view.projection,
        yawDegrees: orbit.camera.yawDegrees,
        pitchDegrees: orbit.camera.pitchDegrees,
        zoom: orbit.camera.zoom,
        wallHeightMeters: view.wallHeightMeters,
        showCeiling: view.showCeiling,
        showFloorGrid: view.showFloorGrid,
        showDevices: view.showDevices,
        showLabels: view.showLabels,
      },
      colourScheme: view.colourScheme,
      selectedDeviceId,
      wallHeightMeters: view.wallHeightMeters,
      viewport: { width: canvasWidth, height: canvasHeight, padding: CANVAS_PADDING },
    });
  }, [canvasHeight, canvasWidth, orbit.camera, selectedDeviceId, session, view]);

  const handleShareSvg = useCallback(async () => {
    if (!plan) {
      return;
    }

    setIsSharing(true);

    try {
      const svg = renderFireAlarmPlan3DSvg(plan, { scale: SVG_EXPORT_SCALE });

      await Share.share({
        title: `Fire alarm 3D plan — ${plan.sessionId}`,
        message: svg,
      });
    } catch (error) {
      Alert.alert(
        'Unable to share plan',
        error instanceof Error ? error.message : 'The plan could not be prepared for sharing.',
      );
    } finally {
      setIsSharing(false);
    }
  }, [plan]);

  const handleSelectDevice = useCallback((deviceId: string) => {
    setSelectedDeviceId((current) => (current === deviceId ? null : deviceId));
  }, []);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F7FA] px-6">
        <ActivityIndicator size="small" color="#0D47A1" />
        <Text className="mt-3 text-sm text-[#718096]">Generating 3D plan…</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <ScrollView className="flex-1 bg-[#F5F7FA]" contentContainerStyle={{ padding: 20 }}>
        <View className="rounded-[28px] border border-[#E0E6ED] bg-white p-5">
          <Text className="text-lg font-semibold text-[#1A202C]">No session to plan</Text>
          <Text className="mt-2 text-sm leading-6 text-[#718096]">
            The 3D plan generator needs a captured RoomPlan session. Start a capture, then open the
            plan from the session summary.
          </Text>
          <Pressable
            className="mt-4 rounded-2xl bg-[#0D47A1] px-4 py-4"
            onPress={() => router.push('/(tabs)/room-plan')}
          >
            <Text className="text-center text-sm font-semibold text-white">Go to room capture</Text>
          </Pressable>

          {__DEV__ ? (
            <Pressable
              accessibilityRole="button"
              className="mt-3 rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC] px-4 py-4"
              onPress={() => setSession(createSampleScanSession())}
            >
              <Text className="text-center text-sm font-semibold text-[#0D47A1]">
                Preview with a sample plan
              </Text>
              <Text className="mt-1 text-center text-[11px] text-[#718096]">
                Development only — shown when no LiDAR capture is available
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-[#F5F7FA]"
      contentContainerStyle={{ paddingHorizontal: HORIZONTAL_PADDING, paddingTop: 16, paddingBottom: 40 }}
      scrollEnabled={!orbit.isDragging}
    >
      <View className="mb-4 flex-row items-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          hitSlop={8}
          className="mr-3 h-10 w-10 items-center justify-center rounded-full border border-[#E0E6ED] bg-white"
        >
          <Ionicons name="chevron-back" size={18} color="#1A202C" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xl font-bold text-[#1A202C]">3D plan generator</Text>
          <Text className="mt-0.5 text-xs text-[#718096]">Session {session.id}</Text>
        </View>
      </View>

      {plan ? (
        <>
          <View className="items-center rounded-[28px] border border-[#E0E6ED] bg-white p-2">
            <View {...orbit.panHandlers} style={{ width: canvasWidth, height: canvasHeight }}>
              <Plan3DCanvas
                plan={plan}
                selectedDeviceId={selectedDeviceId}
                onSelectDevice={handleSelectDevice}
              />
            </View>
            <View className="mt-2 w-full flex-row items-center justify-between px-2 pb-1">
              <Text className="text-[11px] text-[#718096]">
                {plan.stats.roomCount} room(s) · {plan.stats.deviceCount} device(s)
              </Text>
              <View className="flex-row items-center gap-2">
                <Text className="text-[11px] text-[#718096]">
                  yaw {Math.round(orbit.camera.yawDegrees)}° · tilt{' '}
                  {Math.round(orbit.camera.pitchDegrees)}° · zoom {orbit.camera.zoom.toFixed(1)}×
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Reset the 3D view"
                  onPress={resetView}
                  hitSlop={8}
                  className="h-7 w-7 items-center justify-center rounded-full border border-[#E0E6ED] bg-white"
                >
                  <Ionicons name="refresh" size={13} color="#334155" />
                </Pressable>
              </View>
            </View>
            <Text className="w-full px-2 pb-1 text-[11px] text-[#94A3B8]">
              Drag to rotate · pinch to zoom · tap a marker to select a device
            </Text>
          </View>

          <View className="mt-4 rounded-[28px] border border-[#E0E6ED] bg-white p-5">
            <Text className="mb-4 text-lg font-semibold text-[#1A202C]">Plan summary</Text>
            <Plan3DSummary plan={plan} />
          </View>

          <View className="mt-4 rounded-[28px] border border-[#E0E6ED] bg-white p-5">
            <Text className="mb-4 text-lg font-semibold text-[#1A202C]">View</Text>
            <Plan3DViewControls
              projection={view.projection}
              yawDegrees={orbit.camera.yawDegrees}
              pitchDegrees={orbit.camera.pitchDegrees}
              wallHeightMeters={view.wallHeightMeters}
              onProjectionChange={(projection) =>
                setView((current) => ({ ...current, projection }))
              }
              onYawChange={(yawDegrees) => orbit.setCamera({ yawDegrees })}
              onPitchChange={(pitchDegrees) => orbit.setCamera({ pitchDegrees })}
              onWallHeightChange={(wallHeightMeters) =>
                setView((current) => ({ ...current, wallHeightMeters }))
              }
            />
          </View>

          <View className="mt-4 rounded-[28px] border border-[#E0E6ED] bg-white p-5">
            <Text className="mb-4 text-lg font-semibold text-[#1A202C]">Display and export</Text>
            <Plan3DDisplayControls
              colourScheme={view.colourScheme}
              showCeiling={view.showCeiling}
              showFloorGrid={view.showFloorGrid}
              showDevices={view.showDevices}
              showLabels={view.showLabels}
              isSharing={isSharing}
              onChange={(patch) => setView((current) => ({ ...current, ...patch }))}
              onShareSvg={() => void handleShareSvg()}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send zone plan link"
              onPress={() => setIsSendOpen(true)}
              className="mt-4 flex-row items-center justify-center rounded-2xl bg-[#0D47A1] px-4 py-4"
            >
              <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" />
              <Text className="ml-2 text-center text-sm font-semibold text-white">
                Send zone plan link
              </Text>
            </Pressable>
            <Text className="mt-2 text-center text-[11px] text-[#718096]">
              Hosts the plan in a browser so a client can open it, draw colour coded zones and add
              their company details to the legend.
            </Text>
          </View>

          <View className="mt-4 rounded-[28px] border border-[#E0E6ED] bg-white p-5">
            <Text className="mb-4 text-lg font-semibold text-[#1A202C]">Continue the workflow</Text>
            <Pressable
              className="rounded-2xl bg-[#15803D] px-4 py-4"
              onPress={() =>
                router.push({
                  pathname: '/room-plan/review',
                  params: { sessionId: plan.sessionId },
                })
              }
            >
              <Text className="text-center text-sm font-semibold text-white">Review devices</Text>
            </Pressable>

            <Pressable
              className="mt-3 rounded-2xl bg-[#1A202C] px-4 py-4"
              onPress={() =>
                router.push({
                  pathname: '/room-plan/export',
                  params: { sessionId: plan.sessionId },
                })
              }
            >
              <Text className="text-center text-sm font-semibold text-white">Export session JSON</Text>
            </Pressable>

            <Pressable
              className="mt-3 rounded-2xl bg-[#EEF2F7] px-4 py-4"
              onPress={() =>
                router.push({
                  pathname: '/room-plan/session/[id]',
                  params: { id: plan.sessionId },
                })
              }
            >
              <Text className="text-center text-sm font-semibold text-[#1A202C]">
                Back to session summary
              </Text>
            </Pressable>
          </View>
        </>
      ) : null}

      <SendZonePlanModal
        session={session}
        visible={isSendOpen}
        onClose={() => setIsSendOpen(false)}
      />
    </ScrollView>
  );
}
