import { useMemo } from 'react';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Line,
  Path,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

import {
  buildPlanScene,
  createPlanCamera,
  groundMetreScreenLength,
  projectPoint3D,
  unprojectGroundPoint,
  type PlanGeometry,
  type PlanPoint,
  type PlanSceneDevice,
} from '@/modules/fire-alarm-roomplan';

import { PlanLabel } from './PlanLabel';
import { PlanMarkers } from './PlanMarkers';

interface PlanPressNativeEvent {
  locationX?: number;
  locationY?: number;
  offsetX?: number;
  offsetY?: number;
}

interface PlanPressEvent {
  nativeEvent?: PlanPressNativeEvent;
}

export interface Plan3DCanvasProps {
  geometry: PlanGeometry;
  devices: PlanSceneDevice[];
  width: number;
  height: number;
  yaw: number;
  pitch: number;
  zoom: number;
  selectedDeviceId?: string | null;
  showGrid?: boolean;
  showLabels?: boolean;
  showCoverage?: boolean;
  onSelectDevice?: (deviceId: string) => void;
  onPlaceAt?: (point: PlanPoint) => void;
}

const MARKER_HIT_SLOP = 12;

function readPressPoint(event: PlanPressEvent): PlanPoint | null {
  const nativeEvent = event?.nativeEvent;

  if (!nativeEvent) {
    return null;
  }

  const x = typeof nativeEvent.locationX === 'number' ? nativeEvent.locationX : nativeEvent.offsetX;
  const y = typeof nativeEvent.locationY === 'number' ? nativeEvent.locationY : nativeEvent.offsetY;

  if (typeof x !== 'number' || typeof y !== 'number') {
    return null;
  }

  return { x, y };
}

type PlanCameraLike = ReturnType<typeof createPlanCamera>;

function computeNorthAngle(camera: PlanCameraLike): number {
  const centre = projectPoint3D(
    { x: camera.centre.x, y: camera.centre.y, z: camera.centre.z },
    camera,
  );
  const north = projectPoint3D(
    { x: camera.centre.x, y: camera.centre.y + 1, z: camera.centre.z },
    camera,
  );

  return Math.atan2(north.y - centre.y, north.x - centre.x);
}

const MIN_SCALE_BAR_PX = 14;
const MAX_SCALE_BAR_PX = 140;

/** Keeps the drawn scale bar readable without distorting the metre it represents. */
function computeMetreWidth(camera: PlanCameraLike): number {
  return Math.max(MIN_SCALE_BAR_PX, Math.min(groundMetreScreenLength(camera), MAX_SCALE_BAR_PX));
}

export function Plan3DCanvas(props: Plan3DCanvasProps) {
  const {
    geometry,
    devices,
    width,
    height,
    yaw,
    pitch,
    zoom,
    selectedDeviceId,
    showGrid = true,
    showLabels = true,
    showCoverage = false,
    onSelectDevice,
    onPlaceAt,
  } = props;

  const camera = useMemo(
    () =>
      createPlanCamera(
        geometry.bounds,
        { width, height },
        { yaw, pitch, zoom, wallHeight: geometry.defaultWallHeight, padding: 24 },
      ),
    [geometry.bounds, geometry.defaultWallHeight, width, height, yaw, pitch, zoom],
  );

  const scene = useMemo(
    () =>
      buildPlanScene(geometry, {
        camera,
        devices,
        selectedDeviceId: selectedDeviceId ?? null,
        showGrid,
        showLabels,
        showCoverage,
      }),
    [camera, devices, geometry, selectedDeviceId, showGrid, showLabels, showCoverage],
  );

  const northAngle = useMemo(() => computeNorthAngle(camera), [camera]);
  const metreWidth = useMemo(() => computeMetreWidth(camera), [camera]);

  const handlePress = (event: PlanPressEvent) => {
    const press = readPressPoint(event);

    if (!press) {
      return;
    }

    const hit = scene.markers.find(
      (marker) => Math.hypot(marker.x - press.x, marker.y - press.y) <= marker.radius + MARKER_HIT_SLOP,
    );

    if (hit) {
      onSelectDevice?.(hit.deviceId);
      return;
    }

    if (!onPlaceAt) {
      return;
    }

    const ground = unprojectGroundPoint(press, camera);

    if (ground) {
      onPlaceAt(ground);
    }
  };

  const floors = scene.polygons.filter((polygon) => polygon.kind === 'floor');
  const solids = scene.polygons.filter((polygon) => polygon.kind !== 'floor');
  const roomLabels = scene.texts.filter((text) => text.id.startsWith('room-label'));
  const deviceLabels = scene.texts.filter((text) => !text.id.startsWith('room-label'));
  const compassX = width - 34;
  const compassY = 34;
  const northX = Math.cos(northAngle);
  const northY = Math.sin(northAngle);

  return (
    <Svg width={width} height={height} onPress={handlePress}>
      <Rect x={0} y={0} width={width} height={height} fill="#FFFFFF" />

      <Defs>
        {scene.clipPaths.map((clip) => (
          <ClipPath id={clip.id} key={clip.id}>
            <Path d={clip.path} />
          </ClipPath>
        ))}
      </Defs>

      {scene.lines
        .filter((line) => line.kind === 'grid')
        .map((line) => (
          <Line
            key={line.id}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={line.stroke}
            strokeWidth={line.strokeWidth}
            opacity={line.opacity}
          />
        ))}

      {floors.map((polygon) => (
        <Path
          key={polygon.id}
          d={polygon.path}
          fill={polygon.fill}
          stroke={polygon.stroke ?? 'none'}
          strokeWidth={polygon.strokeWidth}
          opacity={polygon.opacity}
        />
      ))}

      {scene.coverageCircles.map((polygon) => (
        <Path
          key={polygon.id}
          d={polygon.path}
          fill={polygon.fill}
          stroke={polygon.stroke ?? 'none'}
          strokeWidth={polygon.strokeWidth}
          opacity={polygon.opacity}
          clipPath={polygon.clipPathId ? `url(#${polygon.clipPathId})` : undefined}
        />
      ))}

      {solids.map((polygon) => (
        <Path
          key={polygon.id}
          d={polygon.path}
          fill={polygon.fill}
          stroke={polygon.stroke ?? 'none'}
          strokeWidth={polygon.strokeWidth}
          opacity={polygon.opacity}
        />
      ))}

      {/* Room labels sit above the wall faces so a label near the far corner stays readable. */}
      {roomLabels.map((text) => (
        <PlanLabel key={text.id} label={text} />
      ))}

      {scene.shadows.map((shadow) => (
        <Ellipse
          key={shadow.id}
          cx={shadow.cx}
          cy={shadow.cy}
          rx={shadow.rx}
          ry={shadow.ry}
          fill={shadow.fill}
          opacity={shadow.opacity}
        />
      ))}

      {scene.lines
        .filter((line) => line.kind === 'leader')
        .map((line) => (
          <Line
            key={line.id}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={line.stroke}
            strokeWidth={line.strokeWidth}
            strokeDasharray={line.dashArray ?? undefined}
            opacity={line.opacity}
          />
        ))}

      <PlanMarkers markers={scene.markers} labels={deviceLabels} showLabels={showLabels} />

      <G>
        <Circle
          cx={compassX}
          cy={compassY}
          r={16}
          fill="#FFFFFF"
          stroke="#D6E1F3"
          strokeWidth={1}
          opacity={0.95}
        />
        <Line
          x1={compassX - northX * 9}
          y1={compassY - northY * 9}
          x2={compassX + northX * 9}
          y2={compassY + northY * 9}
          stroke="#0D47A1"
          strokeWidth={2}
        />
        <SvgText
          x={compassX + northX * 13}
          y={compassY + northY * 13 + 3}
          fill="#0D47A1"
          fontSize={9}
          fontWeight="700"
          textAnchor="middle"
        >
          N
        </SvgText>
      </G>

      <G>
        <Line
          x1={16}
          y1={height - 16}
          x2={16 + metreWidth}
          y2={height - 16}
          stroke="#334155"
          strokeWidth={2}
        />
        <Line x1={16} y1={height - 20} x2={16} y2={height - 12} stroke="#334155" strokeWidth={2} />
        <Line
          x1={16 + metreWidth}
          y1={height - 20}
          x2={16 + metreWidth}
          y2={height - 12}
          stroke="#334155"
          strokeWidth={2}
        />
        <SvgText x={16 + metreWidth + 6} y={height - 12} fill="#475569" fontSize={9} fontWeight="600">
          1 m
        </SvgText>
      </G>
    </Svg>
  );
}
