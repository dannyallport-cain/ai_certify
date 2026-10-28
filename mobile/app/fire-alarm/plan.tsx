import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  PanResponder,
  Share,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';

import Plan3DCanvas from '@/components/roomplan/Plan3DCanvas';
import Plan3DDisplayControls from '@/components/roomplan/Plan3DDisplayControls';
import SendZonePlanModal from '@/components/roomplan/SendZonePlanModal';
import ZoneEditorPanel from '@/components/roomplan/ZoneEditorPanel';
import { usePlan3DOrbitCamera } from '@/components/roomplan/usePlan3DOrbitCamera';
import { usePlanZones } from '@/components/roomplan/usePlanZones';
import { FlowScreen } from '@/components/fire-alarm/FlowScreen';
import { SectionCard } from '@/components/ui/Card';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { StatTile } from '@/components/ui/StatTile';
import { useFireAlarmFlow } from '@/components/fire-alarm/useFireAlarmFlow';
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
import { useTheme } from '@/theme/useTheme';

interface PlanViewState {
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
const MIN_CAMERA_PITCH_DEGREES = 5;
const MAX_CAMERA_PITCH_DEGREES = 89;

function createInitialViewState(): PlanViewState {
  return {
    projection: INITIAL_PROJECTION,
    wallHeightMeters: DEFAULT_PLAN3D_WALL_HEIGHT_METERS,
    showCeiling: false,
    showFloorGrid: true,
    showDevices: true,
    showLabels: true,
    colourScheme: 'blueprint',
  };
}

export default function FireAlarmPlanScreen() {
  const { palette } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const { sessionId, setSessionId } = useFireAlarmFlow();
  const params = useLocalSearchParams<{ sessionId?: string }>();

  const requestedSessionId =
    sessionId ?? (Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId);

  const [session, setSession] = useState<FireAlarmScanSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<PlanViewState>(createInitialViewState);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [zoneMode, setZoneMode] = useState(false);

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

  const zonesEditor = usePlanZones();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!requestedSessionId) {
        setIsLoading(false);
        return;
      }

      const stored = await getRoomPlanSession(requestedSessionId);

      if (cancelled) {
        return;
      }

      setSession(stored);
      if (stored) {
        setSessionId(stored.id);
      }
      setIsLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [requestedSessionId, setSessionId]);

  const canvasWidth = Math.min(windowWidth - HORIZONTAL_PADDING * 2, MAX_CANVAS_WIDTH);
  const canvasHeight = Math.round(canvasWidth * CANVAS_ASPECT_RATIO);

  const resetView = useCallback(() => {
    const preset = getPlan3DProjectionPreset(view.projection);
    orbit.setCamera({ yawDegrees: preset.yawDegrees, pitchDegrees: preset.pitchDegrees, zoom: 1 });
  }, [orbit, view.projection]);

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
      zones: zonesEditor.zones,
    });
  }, [canvasHeight, canvasWidth, orbit.camera, selectedDeviceId, session, view, zonesEditor.zones]);

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

  const toggleZoneMode = useCallback(() => {
    setZoneMode((current) => {
      const next = !current;

      if (next) {
        setView((state) => ({ ...state, projection: 'top-down' }));
        orbit.setCamera({ yawDegrees: 0, pitchDegrees: 90, zoom: 1 });
        zonesEditor.selectZone(null);
      } else {
        const preset = getPlan3DProjectionPreset(INITIAL_PROJECTION);

        setView((state) => ({ ...state, projection: INITIAL_PROJECTION }));
        orbit.setCamera({
          yawDegrees: preset.yawDegrees,
          pitchDegrees: preset.pitchDegrees,
          zoom: 1,
        });
      }

      return next;
    });
  }, [orbit, zonesEditor]);

  const zonePan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => zoneMode,
        onMoveShouldSetPanResponder: () => zoneMode,
        onPanResponderGrant: (event) => {
          zonesEditor.beginDraft({
            x: event.nativeEvent.locationX,
            y: event.nativeEvent.locationY,
          });
        },
        onPanResponderMove: (event) => {
          zonesEditor.moveDraft({
            x: event.nativeEvent.locationX,
            y: event.nativeEvent.locationY,
          });
        },
        onPanResponderRelease: (event) => {
          if (!plan) {
            return;
          }

          zonesEditor.commitDraft(
            { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY },
            plan.camera,
            plan.viewport,
          );
        },
        onPanResponderTerminate: () => zonesEditor.cancelDraft(),
      }),
    [plan, zoneMode, zonesEditor],
  );

  if (isLoading) {
    return (
      <FlowScreen stepId="plan" nextDisabled>
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator color={palette.brand} />
        </View>
      </FlowScreen>
    );
  }

  if (!session || !plan) {
    return (
      <FlowScreen stepId="plan" nextDisabled>
        <SectionCard
          title="No session to plan"
          hint="A capture is needed before a plan can be drawn."
        >
          <AppText variant="body" tone="muted">
            Start a capture in step 1, then come back here.
          </AppText>

          {__DEV__ ? (
            <View style={{ marginTop: 12 }}>
              <Button
                label="Preview with sample plan"
                icon="flask-outline"
                accent="teal"
                variant="soft"
                onPress={() => setSession(createSampleScanSession())}
                block
              />
            </View>
          ) : null}
        </SectionCard>
      </FlowScreen>
    );
  }
return (
    <FlowScreen
      stepId="plan"
      nextLabel="Next: Export"
      scrollEnabled={!orbit.isDragging && !zoneMode}
      headerExtra={
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
          <StatTile label="Rooms" value={plan.stats.roomCount} accent="teal" />
          <StatTile label="Devices" value={plan.stats.deviceCount} accent="violet" />
          <StatTile label="Zones" value={zonesEditor.zones.length} accent="emerald" />
        </View>
      }
    >
      <SectionCard
        title="3D view"
        hint={
          zoneMode
            ? 'Drag to draw a zone'
            : 'Drag to rotate · pinch to zoom · tap a marker'
        }
        badge={
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Button
              label="Reset"
              icon="refresh"
              accent="teal"
              variant="ghost"
              size="small"
              onPress={resetView}
            />
            <Button
              label={zoneMode ? 'Done' : 'Zones'}
              icon={zoneMode ? 'checkmark' : 'grid-outline'}
              accent={zoneMode ? 'emerald' : 'teal'}
              variant="soft"
              size="small"
              onPress={toggleZoneMode}
            />
          </View>
        }
      >
        <View
          {...(zoneMode ? zonePan.panHandlers : orbit.panHandlers)}
          style={{
            width: canvasWidth,
            height: canvasHeight,
            alignSelf: 'center',
            backgroundColor: palette.surfaceAlt,
            borderRadius: 14,
            overflow: 'hidden',
          }}
        >
          <Plan3DCanvas
            plan={plan}
            selectedDeviceId={selectedDeviceId}
            selectedZoneId={zonesEditor.selectedZoneId}
            onSelectDevice={handleSelectDevice}
          />

          {zonesEditor.draft ? (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: Math.min(zonesEditor.draft.start.x, zonesEditor.draft.end.x),
                top: Math.min(zonesEditor.draft.start.y, zonesEditor.draft.end.y),
                width: Math.abs(zonesEditor.draft.end.x - zonesEditor.draft.start.x),
                height: Math.abs(zonesEditor.draft.end.y - zonesEditor.draft.start.y),
                borderWidth: 2,
                borderColor: palette.warning,
                backgroundColor: 'rgba(249, 115, 22, 0.18)',
                borderRadius: 4,
              }}
            />
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
          <Ionicons name="information-circle-outline" size={14} color={palette.inkSoft} />
          <AppText variant="caption" tone="soft" style={{ flex: 1 }}>
            {zoneMode ? 'Draw a rectangle on the plan to add a zone.' : 'Tap a device marker to select it.'}
          </AppText>
        </View>
      </SectionCard>

      <View style={{ height: 13 }} />

      <SectionCard
        title="Colour coded zones"
        badge={
          zonesEditor.zones.length > 0 ? (
            <AppText variant="caption" tone="muted">{`${zonesEditor.zones.length} drawn`}</AppText>
          ) : null
        }
      >
        <ZoneEditorPanel
          zones={zonesEditor.zones}
          selectedZoneId={zonesEditor.selectedZoneId}
          onSelect={zonesEditor.selectZone}
          onRename={zonesEditor.renameZone}
          onCycleColour={zonesEditor.cycleColour}
          onRemove={zonesEditor.removeZone}
        />
      </SectionCard>

      <View style={{ height: 13 }} />

      <SectionCard title="Display and export">
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

        <View style={{ marginTop: 12, gap: 10 }}>
          <Button
            label="Send zone plan link"
            icon="paper-plane-outline"
            accent="teal"
            onPress={() => setIsSendOpen(true)}
            block
          />
          <AppText variant="caption" tone="soft">
            Opens the plan in a browser so the client can add their details to the legend.
          </AppText>
        </View>
      </SectionCard>

      <SendZonePlanModal
        session={session}
        zones={zonesEditor.zones}
        visible={isSendOpen}
        onClose={() => setIsSendOpen(false)}
      />
    </FlowScreen>
  );
}
