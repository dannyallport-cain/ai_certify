import { pointInPolygon } from './geometry-math';
import type { CoverageOptions } from './plan-coverage';
import type { PlanGeometry } from './plan-geometry';
import { pointsToPath, projectPoint3D, type PlanCamera } from './projection';
import { buildDeviceScene, resolveLabelCollisions } from './plan-scene-devices';
import { buildFloorPolygons, buildGridLines, buildRoomLabels } from './plan-scene-floor';
import { buildWallPolygons } from './plan-scene-walls';
import type { PlanScene, PlanSceneClipPath, PlanSceneDevice, PlanScenePolygon } from './plan-scene-types';

export interface PlanSceneOptions {
  camera: PlanCamera;
  devices: PlanSceneDevice[];
  selectedDeviceId?: string | null;
  showGrid?: boolean;
  showLabels?: boolean;
  showCoverage?: boolean;
  showRoomLabels?: boolean;
  coverageOptions?: CoverageOptions;
}

function buildRoomClipPaths(geometry: PlanGeometry, camera: PlanCamera): PlanSceneClipPath[] {
  return geometry.rooms.map((room) => ({
    id: `room-clip-${room.id}`,
    path: pointsToPath(room.outline.map((point) => projectPoint3D({ ...point, z: 0 }, camera))),
  }));
}

/**
 * Coverage discs are clipped to the room that contains the device so the shading reads as
 * floor coverage instead of spilling across the whole canvas.
 */
function clipCoverageDiscs(
  geometry: PlanGeometry,
  devices: PlanSceneDevice[],
  discs: PlanScenePolygon[],
): PlanScenePolygon[] {
  return discs.map((disc) => {
    const deviceId = disc.id.replace(/^coverage-/, '');
    const device = devices.find((candidate) => candidate.id === deviceId);

    if (!device) {
      return disc;
    }

    const room = geometry.rooms.find((candidate) => pointInPolygon(device.position, candidate.outline));

    return room ? { ...disc, clipPathId: `room-clip-${room.id}` } : disc;
  });
}

export function buildPlanScene(geometry: PlanGeometry, options: PlanSceneOptions): PlanScene {
  const { camera } = options;
  const floors = buildFloorPolygons(geometry, camera);
  const grid = options.showGrid === false ? [] : buildGridLines(geometry, camera);
  const walls = buildWallPolygons(geometry, camera);
  const roomLabels = options.showRoomLabels === false ? [] : buildRoomLabels(geometry, camera);
  const devices = buildDeviceScene({
    devices: options.devices,
    camera,
    selectedDeviceId: options.selectedDeviceId ?? null,
    showLabels: options.showLabels,
    showCoverage: options.showCoverage,
  });
  // Room names are anchored to their room, so device labels route around them instead.
  const deviceLabels = resolveLabelCollisions(devices.texts, roomLabels);

  return {
    polygons: [...floors, ...walls],
    lines: [...grid, ...devices.lines],
    markers: devices.markers,
    shadows: devices.shadows,
    coverageCircles: clipCoverageDiscs(geometry, options.devices, devices.coverage),
    clipPaths: buildRoomClipPaths(geometry, camera),
    texts: [...roomLabels, ...deviceLabels],
    hasGeometry: geometry.hasGeometry,
  };
}

export function sortByDepthDescending<T extends { depth: number }>(items: T[]): T[] {
  return [...items].sort((left, right) => right.depth - left.depth);
}
