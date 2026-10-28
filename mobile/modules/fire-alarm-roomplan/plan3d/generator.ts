import type { FireAlarmScanSession } from '../types';
import type {
  FireAlarmPlan3D,
  FireAlarmPlan3DOptions,
  Plan3DColourScheme,
  Plan3DStats,
  Plan3DVertex,
} from './plan3d-types';
import { boundsOfVertices, createVertex, finaliseBounds } from './geometry';
import { getPlan3DPalette } from './palette';
import { resolvePlan3DRooms } from './rooms';
import {
  buildRoomSurfaces,
  resolveGridSpacingMeters,
  type WorldLine,
  type WorldSurface,
} from './surfaces';
import {
  buildDeviceLeaderLines,
  buildPlan3DLegend,
  buildPlan3DMarkers,
  buildPlan3DTexts,
  collectDeviceAnchorVertices,
} from './annotations';
import { buildPlan3DPolygons, buildPlan3DSegments } from './scene';
import {
  buildZonePolygons,
  buildZoneSummaries,
  buildZoneTexts,
} from './zone-scene';
import { sanitiseZones } from './zone-model';
import {
  createPlan3DViewport,
  emptyProjectedBounds,
  expandProjectedBounds,
  projectVertex,
  resolvePlan3DCamera,
} from './projection';

const DEFAULT_VIEWPORT_PADDING = 28;

function createPlanId(sessionId: string): string {
  return `plan3d-${sessionId}-${Date.now()}`;
}

function uniqueWarnings(warnings: string[]): string[] {
  return Array.from(new Set(warnings));
}

/**
 * Generates an isometric-style 3D plan for a captured RoomPlan session.
 *
 * The generator is pure and dependency free: it resolves the captured geometry into rooms,
 * extrudes walls and openings, projects everything with an orthographic camera and returns a
 * renderer-agnostic scene of polygons, segments, markers and labels.
 */
export function generateFireAlarmPlan3D(
  session: FireAlarmScanSession,
  options: FireAlarmPlan3DOptions = {},
): FireAlarmPlan3D {
  const colourScheme: Plan3DColourScheme = options.colourScheme ?? 'blueprint';
  const palette = getPlan3DPalette(colourScheme);
  const camera = resolvePlan3DCamera(options.camera, options.wallHeightMeters);
  const resolution = resolvePlan3DRooms(session, camera.wallHeightMeters);
  const rooms = resolution.rooms;
  const zones = sanitiseZones(options.zones);

  const footprintBounds = finaliseBounds(
    boundsOfVertices(rooms.reduce<Plan3DVertex[]>((all, room) => all.concat(room.footprint), [])),
  );
  const maxDimensionMeters = Math.max(
    footprintBounds.maxX - footprintBounds.minX,
    footprintBounds.maxY - footprintBounds.minY,
  );
  const gridSpacingMeters = resolveGridSpacingMeters(maxDimensionMeters);

  const surfaces: WorldSurface[] = [];
  const lines: WorldLine[] = [];

  rooms.forEach((room) => {
    const built = buildRoomSurfaces(room, {
      showCeiling: camera.showCeiling,
      showFloorGrid: camera.showFloorGrid,
      gridSpacingMeters,
    });

    surfaces.push(...built.surfaces);
    lines.push(...built.lines);
  });

  if (camera.showDevices) {
    lines.push(...buildDeviceLeaderLines(rooms));
  }

  let rawBounds = emptyProjectedBounds();
  const consider = (vertex: Plan3DVertex) => {
    rawBounds = expandProjectedBounds(rawBounds, projectVertex(vertex, camera));
  };

  surfaces.forEach((surface) => surface.vertices.forEach(consider));
  lines.forEach((line) => {
    consider(line.start);
    consider(line.end);
  });

  if (camera.showDevices) {
    collectDeviceAnchorVertices(rooms).forEach(consider);
  }

  // Zones are user drawn, so nothing guarantees they stay inside the captured footprint. Fitting
  // the viewport to them as well means a zone that overhangs a wall is still drawn in full.
  zones.forEach((zone) => {
    zone.polygon.forEach((point) => consider(createVertex(point.x, point.y, 0)));
  });

  const viewport = createPlan3DViewport(
    { padding: DEFAULT_VIEWPORT_PADDING, ...options.viewport },
    rawBounds,
    camera.zoom,
  );

  const polygons = buildPlan3DPolygons({ surfaces, camera, viewport, palette });
  const segments = buildPlan3DSegments({ lines, camera, viewport, palette });

  const markers = camera.showDevices
    ? buildPlan3DMarkers({
        rooms,
        camera,
        viewport,
        selectedDeviceId: options.selectedDeviceId ?? null,
      })
    : [];

  const zonePolygons = buildZonePolygons({
    zones,
    camera,
    viewport,
    schematic: colourScheme === 'schematic',
  });
  const { summaries: zoneSummary, unassignedDeviceCount } = buildZoneSummaries(zones, rooms);

  const texts = [
    ...buildPlan3DTexts({ rooms, markers, camera, viewport, palette }),
    ...buildZoneTexts({ zones, camera, viewport }),
  ].sort((left, right) => right.depth - left.depth);
  const legend = buildPlan3DLegend(rooms);

  const drawnVertices = surfaces.reduce<Plan3DVertex[]>(
    (all, surface) => all.concat(surface.vertices),
    [],
  );
  const bounds = finaliseBounds(
    boundsOfVertices(drawnVertices.concat(collectDeviceAnchorVertices(rooms))),
  );

  const deviceCount = rooms.reduce((total, room) => total + room.devices.length, 0);

  const stats: Plan3DStats = {
    roomCount: rooms.length,
    wallCount: rooms.reduce((total, room) => total + room.walls.length, 0),
    openingCount: rooms.reduce((total, room) => total + room.openings.length, 0),
    deviceCount,
    floorAreaSquareMeters: rooms.reduce((total, room) => total + room.floorAreaSquareMeters, 0),
    wallHeightMeters: rooms.reduce(
      (highest, room) => Math.max(highest, room.heightMeters),
      camera.wallHeightMeters,
    ),
  };

  const warnings = [...resolution.warnings];

  if (deviceCount === 0) {
    warnings.push(
      'No fire alarm devices were present in this session, so the plan shows room geometry only.',
    );
  }

  if (rooms.every((room) => room.synthesized)) {
    warnings.push(
      'Every room was generated rather than captured. Re-scan the space to produce a measured plan.',
    );
  }

  if (zones.length > 0 && unassignedDeviceCount > 0) {
    warnings.push(
      `${unassignedDeviceCount} device(s) fall outside every zone. Resize the zones or check the device positions.`,
    );
  }

  return {
    id: createPlanId(session.id),
    sessionId: session.id,
    generatedAt: new Date().toISOString(),
    units: 'meters',
    colourScheme,
    camera,
    viewport,
    bounds,
    polygons,
    segments,
    markers,
    texts,
    legend,
    zones: zonePolygons,
    zoneSummary,
    unassignedDeviceCount,
    stats,
    warnings: uniqueWarnings(warnings),
  };
}

/** Convenience helper used by hosts that hold a session and an options object separately. */
export function generateFireAlarmPlan3DFromInput(input: {
  session: FireAlarmScanSession;
  options?: FireAlarmPlan3DOptions;
}): FireAlarmPlan3D {
  return generateFireAlarmPlan3D(input.session, input.options);
}
