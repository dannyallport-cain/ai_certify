import type { PlanPoint } from './geometry-math';
import type { CoverageOptions } from './plan-coverage';
import { coverageRadiusFor } from './plan-coverage';
import { pointsToPath, projectPoint3D, type PlanCamera } from './projection';
import { PLAN_COVERAGE_FILL, deviceColour } from './plan-theme';
import type {
  PlanSceneDevice,
  PlanSceneEllipse,
  PlanSceneLine,
  PlanSceneMarker,
  PlanScenePolygon,
  PlanSceneText,
} from './plan-scene-types';
import type { FireAlarmDeviceDetection, FireAlarmDeviceType } from './types';

const DEFAULT_MARKER_RADIUS = 8;
const SELECTED_MARKER_RADIUS = 11;
const CEILING_HEIGHT_THRESHOLD = 1.2;
const COVERAGE_SEGMENTS = 40;
const LABEL_CHAR_WIDTH = 5.6;
const LABEL_HEIGHT = 12;
const LABEL_LINE_HEIGHT = 11;
const MAX_LABEL_SHIFTS = 3;
const FLIP_BELOW_OFFSET = 40;

type ColouredDevice = PlanSceneDevice & { colour: string };

export function resolveDeviceHeight(
  device: FireAlarmDeviceDetection,
  defaultWallHeight: number,
): number {
  const rawHeight = device.location?.z;

  if (typeof rawHeight !== 'number' || Number.isNaN(rawHeight)) {
    return 0;
  }

  return Math.max(0, Math.min(rawHeight, defaultWallHeight + 0.5));
}

export function toSceneDevice(
  device: FireAlarmDeviceDetection,
  defaultWallHeight: number,
  coverageOptions: CoverageOptions = {},
): PlanSceneDevice | null {
  const x = device.location?.x;
  const y = device.location?.y;

  if (typeof x !== 'number' || typeof y !== 'number') {
    return null;
  }

  const type: FireAlarmDeviceType = device.type ?? 'unknown';

  return {
    id: device.id,
    type,
    label: device.label?.trim() || `${type.toUpperCase()} device`,
    position: { x, y },
    heightMeters: resolveDeviceHeight(device, defaultWallHeight),
    identified: device.identifiedByUser === true,
    coverageRadiusMeters: coverageRadiusFor(type, coverageOptions),
  };
}
function buildLeaderLine(device: ColouredDevice, camera: PlanCamera): PlanSceneLine | null {
  if (device.heightMeters <= 0.4) {
    return null;
  }

  const base = projectPoint3D({ ...device.position, z: 0 }, camera);
  const top = projectPoint3D({ ...device.position, z: device.heightMeters }, camera);

  return {
    id: `leader-${device.id}`,
    kind: 'leader',
    x1: base.x,
    y1: base.y,
    x2: top.x,
    y2: top.y,
    stroke: device.colour,
    strokeWidth: 1,
    dashArray: '3 3',
    opacity: 0.65,
    depth: top.depth,
  };
}

function buildMarker(
  device: ColouredDevice,
  camera: PlanCamera,
  selectedDeviceId: string | null,
): PlanSceneMarker {
  const projected = projectPoint3D({ ...device.position, z: device.heightMeters }, camera);
  const selected = device.id === selectedDeviceId;

  return {
    id: `marker-${device.id}`,
    deviceId: device.id,
    type: device.type,
    label: device.label,
    x: projected.x,
    y: projected.y,
    depth: projected.depth,
    colour: device.colour,
    fill: device.identified ? device.colour : '#FFFFFF',
    identified: device.identified,
    selected,
    mountedOnCeiling: device.heightMeters >= CEILING_HEIGHT_THRESHOLD,
    heightMeters: device.heightMeters,
    radius: selected ? SELECTED_MARKER_RADIUS : DEFAULT_MARKER_RADIUS,
  };
}

function buildShadow(device: PlanSceneDevice, camera: PlanCamera): PlanSceneEllipse {
  const base = projectPoint3D({ ...device.position, z: 0 }, camera);
  const elevation = device.heightMeters / 3;

  return {
    id: `shadow-${device.id}`,
    cx: base.x,
    cy: base.y,
    rx: 9 + elevation * 3,
    ry: 4 + elevation * 1.4,
    fill: '#0F172A',
    opacity: 0.14,
    depth: base.depth,
  };
}

function buildLabel(marker: PlanSceneMarker): PlanSceneText {
  return {
    id: `label-${marker.deviceId}`,
    x: marker.x,
    y: marker.y - marker.radius - 11,
    text: marker.label,
    colour: marker.identified ? '#1A202C' : '#64748B',
    fontSize: 10,
    anchor: 'middle',
    weight: marker.selected ? '700' : '600',
    depth: marker.depth,
  };
}

interface LabelBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function labelBox(label: PlanSceneText): LabelBox {
  const width = Math.max(label.text.length * LABEL_CHAR_WIDTH, 16);
  const halfWidth = label.anchor === 'middle' ? width / 2 : 0;

  return {
    minX: label.x - halfWidth,
    maxX: label.x + halfWidth,
    minY: label.y - LABEL_HEIGHT,
    maxY: label.y + 2,
  };
}

function boxesOverlap(left: LabelBox, right: LabelBox): boolean {
  return (
    left.minX < right.maxX &&
    left.maxX > right.minX &&
    left.minY < right.maxY &&
    left.maxY > right.minY
  );
}

/**
 * Stacks labels upwards until they clear everything already placed, then flips them below
 * their marker when stacking runs out of room. `blockers` are fixed labels the caller has
 * already committed to (such as room names) that device labels must route around.
 */
export function resolveLabelCollisions(
  labels: PlanSceneText[],
  blockers: PlanSceneText[] = [],
): PlanSceneText[] {
  const placedBoxes: LabelBox[] = blockers.map((blocker) => labelBox(blocker));
  const placed: PlanSceneText[] = [];
  const isClear = (candidate: PlanSceneText) =>
    !placedBoxes.some((box) => boxesOverlap(labelBox(candidate), box));

  labels.forEach((label) => {
    let candidate = label;
    let resolved = isClear(candidate);

    for (let shift = 0; shift < MAX_LABEL_SHIFTS && !resolved; shift += 1) {
      candidate = { ...candidate, y: candidate.y - LABEL_LINE_HEIGHT };
      resolved = isClear(candidate);
    }

    if (!resolved) {
      candidate = { ...label, y: label.y + FLIP_BELOW_OFFSET };
      resolved = isClear(candidate);

      for (let shift = 0; shift < MAX_LABEL_SHIFTS && !resolved; shift += 1) {
        candidate = { ...candidate, y: candidate.y + LABEL_LINE_HEIGHT };
        resolved = isClear(candidate);
      }
    }

    placedBoxes.push(labelBox(candidate));
    placed.push(candidate);
  });

  return placed;
}
function buildCoverageDisc(device: ColouredDevice, camera: PlanCamera): PlanScenePolygon | null {
  if (!device.coverageRadiusMeters || device.coverageRadiusMeters <= 0) {
    return null;
  }

  const points: PlanPoint[] = [];

  for (let index = 0; index < COVERAGE_SEGMENTS; index += 1) {
    const angle = (index / COVERAGE_SEGMENTS) * Math.PI * 2;
    points.push({
      x: device.position.x + Math.cos(angle) * device.coverageRadiusMeters,
      y: device.position.y + Math.sin(angle) * device.coverageRadiusMeters,
    });
  }

  const projected = points.map((point) => projectPoint3D({ ...point, z: 0.02 }, camera));
  const centre = projectPoint3D({ ...device.position, z: 0.02 }, camera);

  return {
    id: `coverage-${device.id}`,
    kind: 'coverage',
    path: pointsToPath(projected),
    depth: centre.depth,
    fill: PLAN_COVERAGE_FILL,
    stroke: device.colour,
    strokeWidth: 1.2,
    opacity: 0.2,
  };
}

export interface DeviceSceneInput {
  devices: PlanSceneDevice[];
  camera: PlanCamera;
  selectedDeviceId: string | null;
  showLabels?: boolean;
  showCoverage?: boolean;
}

export interface DeviceSceneOutput {
  markers: PlanSceneMarker[];
  lines: PlanSceneLine[];
  texts: PlanSceneText[];
  shadows: PlanSceneEllipse[];
  coverage: PlanScenePolygon[];
}

export function buildDeviceScene(input: DeviceSceneInput): DeviceSceneOutput {
  const { camera, selectedDeviceId } = input;
  const devices: ColouredDevice[] = input.devices.map((device) => ({
    ...device,
    colour: deviceColour(device.type),
  }));

  const markers = devices
    .map((device) => buildMarker(device, camera, selectedDeviceId))
    .sort((left, right) => right.depth - left.depth);

  const lines = devices
    .map((device) => buildLeaderLine(device, camera))
    .filter((line): line is PlanSceneLine => line !== null);

  const coverage =
    input.showCoverage === false
      ? []
      : devices
          .map((device) => buildCoverageDisc(device, camera))
          .filter((disc): disc is PlanScenePolygon => disc !== null);

  return {
    markers,
    lines,
    shadows: devices.map((device) => buildShadow(device, camera)),
    coverage,
    texts: input.showLabels === false ? [] : markers.map((marker) => buildLabel(marker)),
  };
}
