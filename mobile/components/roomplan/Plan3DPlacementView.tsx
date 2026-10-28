import { useMemo, useRef } from 'react';
import { Text, View } from 'react-native';

import {
  generateFireAlarmPlan3D,
  getMountingCamera,
  getSurfaceKindsForMountings,
  mapProjectedPoint,
  pickPlan3DPlacement,
  projectVertex,
  resolvePlan3DRooms,
  type FireAlarmScanSession,
  type Plan3DColourScheme,
  type Plan3DMounting,
  type Plan3DPlacement,
  type Plan3DPoint,
  type Plan3DVertex,
} from '@/modules/fire-alarm-roomplan';

import PlacementCross from './PlacementCross';
import Plan3DCanvas from './Plan3DCanvas';
import Plan3DOrbitToolbar from './Plan3DOrbitToolbar';
import { usePlan3DOrbitCamera } from './usePlan3DOrbitCamera';

export interface Plan3DPlacementViewProps {
  session: FireAlarmScanSession;
  width: number;
  height: number;
  wallHeightMeters?: number;
  colourScheme?: Plan3DColourScheme;
  /**
   * The surface family the inspector asked for. It fixes both the camera the view opens in and
   * the only surfaces a tap can resolve to, which is what stops a ceiling tap landing on the
   * floor in a plan view.
   */
  mounting?: Plan3DMounting;
  /** Current cross position in world space, or null before anything has been placed. */
  position: Plan3DVertex | null;
  onPick: (placement: Plan3DPlacement) => void;
  /** Fired when a tap lands outside every allowed surface. */
  onMiss?: () => void;
}

const CANVAS_PADDING = 26;
const ROTATE_STEP_DEGREES = 15;
const TILT_STEP_DEGREES = 8;
const ZOOM_STEP_FACTOR = 1.25;
const LEADER_MIN_HEIGHT_METERS = 0.25;

const MOUNTING_PROMPTS: Record<Plan3DMounting, string> = {
  ceiling: 'Tap inside the room to fix the device to the ceiling',
  ceiling_void: 'Tap inside the room to drop the device into the ceiling void',
  wall: 'Spin the room, then tap a wall at the mounting height',
  floor: 'Tap inside the room to stand the device on the floor',
  unknown: 'Tap a surface to place the cross',
};

/**
 * The placement workspace: the generated 3D plan inside a single gesture surface. Dragging orbits
 * the room on both axes, pinching zooms, and a still tap casts a ray through the room to put the
 * cross on whichever allowed surface is nearest the camera.
 */
export default function Plan3DPlacementView({
  session,
  width,
  height,
  wallHeightMeters,
  colourScheme = 'blueprint',
  mounting = 'unknown',
  position,
  onPick,
  onMiss,
}: Plan3DPlacementViewProps) {
  const rooms = useMemo(
    () => resolvePlan3DRooms(session, wallHeightMeters).rooms,
    [session, wallHeightMeters],
  );

  // The tap target depends on the freshly generated plan, while the gesture responder has to be
  // created once. Routing the call through a ref keeps both constraints.
  const tapTargetRef = useRef<(point: Plan3DPoint) => void>(() => {});

  const surfaceKinds = useMemo(() => getSurfaceKindsForMountings([mounting]), [mounting]);
  const cameraPreset = useMemo(() => getMountingCamera(mounting), [mounting]);

  const orbit = usePlan3DOrbitCamera({
    initial: {
      yawDegrees: cameraPreset.yawDegrees,
      pitchDegrees: cameraPreset.pitchDegrees,
      zoom: 1,
    },
    onTap: (point) => tapTargetRef.current(point),
  });

  const plan = useMemo(
    () =>
      generateFireAlarmPlan3D(session, {
        camera: {
          projection: cameraPreset.projection,
          yawDegrees: orbit.camera.yawDegrees,
          pitchDegrees: orbit.camera.pitchDegrees,
          zoom: orbit.camera.zoom,
          wallHeightMeters,
          showCeiling: false,
          showFloorGrid: true,
          showDevices: true,
          showLabels: true,
        },
        colourScheme,
        wallHeightMeters,
        viewport: { width, height, padding: CANVAS_PADDING },
      }),
    [
      cameraPreset.projection,
      colourScheme,
      height,
      orbit.camera,
      session,
      wallHeightMeters,
      width,
    ],
  );

  tapTargetRef.current = (point) => {
    const placement = pickPlan3DPlacement({
      point,
      rooms,
      camera: plan.camera,
      viewport: plan.viewport,
      includeCeiling: surfaceKinds.includes('ceiling'),
      includeCeilingVoid: surfaceKinds.includes('ceiling_void'),
      surfaceKinds,
    });

    if (placement) {
      onPick(placement);
      return;
    }

    onMiss?.();
  };

  const crossPoint = useMemo<Plan3DPoint | null>(() => {
    if (!position) {
      return null;
    }

    return mapProjectedPoint(projectVertex(position, plan.camera), plan.viewport);
  }, [plan, position]);

  const floorPoint = useMemo<Plan3DPoint | null>(() => {
    if (!position || position.z < LEADER_MIN_HEIGHT_METERS) {
      return null;
    }

    const floorVertex = { x: position.x, y: position.y, z: 0 };

    return mapProjectedPoint(projectVertex(floorVertex, plan.camera), plan.viewport);
  }, [plan, position]);

  const hint = `${MOUNTING_PROMPTS[mounting] ?? MOUNTING_PROMPTS.unknown} · drag to rotate · pinch to zoom`;

  return (
    <View>
      <View {...orbit.panHandlers} style={{ width, height }}>
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0 }}>
          <Plan3DCanvas plan={plan} />
          {crossPoint ? (
            <PlacementCross point={crossPoint} floorPoint={floorPoint} width={width} height={height} />
          ) : null}
        </View>

        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: 10, bottom: 10, right: 10, flexDirection: 'row' }}
        >
          <Text
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.72)',
              borderRadius: 12,
              paddingHorizontal: 10,
              paddingVertical: 5,
              fontSize: 11,
              color: '#E2E8F0',
            }}
          >
            {hint}
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 12 }}>
        <Plan3DOrbitToolbar
          onRotateLeft={() => orbit.rotateBy(-ROTATE_STEP_DEGREES, 0)}
          onRotateRight={() => orbit.rotateBy(ROTATE_STEP_DEGREES, 0)}
          onTiltUp={() => orbit.rotateBy(0, TILT_STEP_DEGREES)}
          onTiltDown={() => orbit.rotateBy(0, -TILT_STEP_DEGREES)}
          onZoomIn={() => orbit.zoomBy(ZOOM_STEP_FACTOR)}
          onZoomOut={() => orbit.zoomBy(1 / ZOOM_STEP_FACTOR)}
          onReset={orbit.reset}
        />
      </View>
    </View>
  );
}
