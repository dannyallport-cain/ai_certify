import type {
  Plan3DCamera,
  Plan3DMounting,
  Plan3DPickSurfaceKind,
  Plan3DPoint,
  Plan3DVertex,
  Plan3DViewport,
} from './plan3d-types';
import type { Plan3DRoom } from './room-types';
import { clamp, createVertex, degreesToRadians, normaliseDegrees, polygonCentroid2D } from './geometry';
import { mapProjectedPoint, projectVertex } from './projection';
import { CEILING_VOID_OFFSET_METERS } from './mounting-rules';

export type { Plan3DPickSurfaceKind } from './plan3d-types';

/** A planar, world-space surface the placement ray can hit. */
export interface Plan3DPickSurface {
  id: string;
  roomId: string;
  roomName: string;
  kind: Plan3DPickSurfaceKind;
  /** Outline in world space, wound clockwise when seen from the room interior. */
  vertices: Plan3DVertex[];
  /** Unit normal pointing away from the wall/ceiling into the room. */
  normal: Plan3DVertex;
  /** How far a placed device is lifted off the surface so it does not z-fight with it. */
  offsetMeters: number;
}

export interface Plan3DRay {
  origin: Plan3DVertex;
  /** Unit length direction from the camera into the scene. */
  direction: Plan3DVertex;
}

export interface Plan3DPlacement {
  /** World position the device should be stored at, lifted clear of the surface face. */
  position: Plan3DVertex;
  /** Where the ray actually met the surface, which is what the cross marks. */
  surfacePoint: Plan3DVertex;
  /** Screen position of `surfacePoint`, in canvas pixels. */
  point: Plan3DPoint;
  surfaceId: string;
  surfaceKind: Plan3DPickSurfaceKind;
  mounting: Plan3DMounting;
  roomId: string;
  roomName: string;
  /** Distance from the camera along the ray, used to resolve overlapping surfaces. */
  distance: number;
}

export interface Plan3DPickOptions {
  /** Screen point inside the canvas, in pixels. */
  point: Plan3DPoint;
  rooms: Plan3DRoom[];
  camera: Plan3DCamera;
  viewport: Plan3DViewport;
  /** Ceiling pick targets are dropped unless the plan is drawing a ceiling. */
  includeCeiling?: boolean;
  /** Adds the plane above the finished ceiling, where void-mounted devices sit. */
  includeCeilingVoid?: boolean;
  /**
   * Surfaces the tap may resolve to. Restricting this is what makes plan view unambiguous: with
   * only ceilings offered, a downward ray can never land on the floor instead.
   */
  surfaceKinds?: Plan3DPickSurfaceKind[];
}

const WALL_OFFSET_METERS = 0.12;
const CEILING_OFFSET_METERS = 0.06;
const FLOOR_OFFSET_METERS = 0.02;
const MIN_WALL_MOUNT_METERS = 0.3;
const PARALLEL_EPSILON = 1e-6;
const NORMAL_EPSILON = 1e-9;

function subtract(a: Plan3DVertex, b: Plan3DVertex): Plan3DVertex {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function dot(a: Plan3DVertex, b: Plan3DVertex): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function length(vector: Plan3DVertex): number {
  return Math.hypot(vector.x, vector.y, vector.z);
}

function scale(vector: Plan3DVertex, factor: number): Plan3DVertex {
  return { x: vector.x * factor, y: vector.y * factor, z: vector.z * factor };
}

function add(a: Plan3DVertex, b: Plan3DVertex): Plan3DVertex {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function normalise(vector: Plan3DVertex): Plan3DVertex | null {
  const vectorLength = length(vector);

  if (vectorLength < NORMAL_EPSILON) {
    return null;
  }

  return scale(vector, 1 / vectorLength);
}

/** Newell's method, so concave or slightly non-planar outlines still give a stable normal. */
function polygonNormal(vertices: Plan3DVertex[]): Plan3DVertex | null {
  let normal = createVertex(0, 0, 0);

  for (let index = 0; index < vertices.length; index += 1) {
    const current = vertices[index];
    const next = vertices[(index + 1) % vertices.length];

    normal = {
      x: normal.x + (current.y - next.y) * (current.z + next.z),
      y: normal.y + (current.z - next.z) * (current.x + next.x),
      z: normal.z + (current.x - next.x) * (current.y + next.y),
    };
  }

  return normalise(normal);
}

function wallInteriorNormal(
  start: Plan3DVertex,
  end: Plan3DVertex,
  interior: Plan3DPoint,
): Plan3DVertex {
  const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const toInterior = { x: interior.x - midpoint.x, y: interior.y - midpoint.y };
  const toInteriorLength = Math.hypot(toInterior.x, toInterior.y);

  if (toInteriorLength < NORMAL_EPSILON) {
    // Degenerate wall: fall back to the edge's left-hand normal.
    const edge = { x: end.x - start.x, y: end.y - start.y };
    const edgeLength = Math.hypot(edge.x, edge.y) || 1;

    return { x: -edge.y / edgeLength, y: edge.x / edgeLength, z: 0 };
  }

  return { x: toInterior.x / toInteriorLength, y: toInterior.y / toInteriorLength, z: 0 };
}

/**
 * Builds every surface a tap can land on: each room floor, each wall panel and, when the plan
 * draws one, each ceiling. Walls are built from the resolved walls rather than the footprints so
 * a captured room with a wall opening still offers a pick target along that edge.
 */
export function buildPlan3DPickSurfaces(
  rooms: Plan3DRoom[],
  options: { includeCeiling?: boolean; includeCeilingVoid?: boolean } = {},
): Plan3DPickSurface[] {
  const surfaces: Plan3DPickSurface[] = [];

  rooms.forEach((room) => {
    if (room.footprint.length >= 3) {
      surfaces.push({
        id: `${room.id}-floor`,
        roomId: room.id,
        roomName: room.name,
        kind: 'floor',
        vertices: room.footprint.map((vertex) => createVertex(vertex.x, vertex.y, 0)),
        normal: createVertex(0, 0, 1),
        offsetMeters: FLOOR_OFFSET_METERS,
      });

      if (options.includeCeiling) {
        surfaces.push({
          id: `${room.id}-ceiling`,
          roomId: room.id,
          roomName: room.name,
          kind: 'ceiling',
          vertices: room.footprint.map((vertex) =>
            createVertex(vertex.x, vertex.y, room.heightMeters),
          ),
          normal: createVertex(0, 0, -1),
          offsetMeters: CEILING_OFFSET_METERS,
        });
      }

      if (options.includeCeilingVoid) {
        surfaces.push({
          id: `${room.id}-ceiling-void`,
          roomId: room.id,
          roomName: room.name,
          kind: 'ceiling_void',
          vertices: room.footprint.map((vertex) =>
            createVertex(vertex.x, vertex.y, room.heightMeters + CEILING_VOID_OFFSET_METERS),
          ),
          normal: createVertex(0, 0, -1),
          offsetMeters: CEILING_VOID_OFFSET_METERS,
        });
      }
    }

    const interior = polygonCentroid2D(room.footprint);

    room.walls.forEach((wall, index) => {
      surfaces.push({
        id: `${room.id}-wall-${index + 1}`,
        roomId: room.id,
        roomName: room.name,
        kind: 'wall',
        vertices: [
          createVertex(wall.start.x, wall.start.y, 0),
          createVertex(wall.end.x, wall.end.y, 0),
          createVertex(wall.end.x, wall.end.y, wall.heightMeters),
          createVertex(wall.start.x, wall.start.y, wall.heightMeters),
        ],
        normal: wallInteriorNormal(wall.start, wall.end, interior),
        offsetMeters: WALL_OFFSET_METERS,
      });
    });
  });

  return surfaces;
}

/**
 * Turns a canvas pixel into the ray of world points that project onto it.
 *
 * The plan camera is an orthographic, skewed projection, so the projection matrix is 2x3 of
 * rank two. The ray is its null direction: every world point on it lands on the same pixel,
 * which is exactly the set a tap can mean.
 */
export function createPlan3DPickRay(
  point: Plan3DPoint,
  camera: Plan3DCamera,
  viewport: Plan3DViewport,
): Plan3DRay {
  const projectedX = (point.x - viewport.offsetX) / viewport.scale;
  const projectedY = (point.y - viewport.offsetY) / viewport.scale;

  const yaw = degreesToRadians(normaliseDegrees(camera.yawDegrees));
  const pitch = degreesToRadians(clamp(camera.pitchDegrees, 0, 90));

  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);

  const direction = normalise({
    x: sinYaw * cosPitch,
    y: cosYaw * cosPitch,
    z: sinPitch,
  }) ?? createVertex(0, 0, 1);

  // Any point on the ray will do, so pick the better conditioned of the two candidates. Looking
  // down (plan view) the tap's height term vanishes and the floor plane is the safe origin;
  // looking sideways (front view) the depth term vanishes, so start on the plane that keeps the
  // tap's height. Both sit on the same ray, so which surface is nearest is unaffected.
  if (sinPitch >= cosPitch) {
    const rotatedY = sinPitch > 1e-4 ? projectedY / sinPitch : 0;

    return {
      origin: createVertex(
        cosYaw * projectedX + sinYaw * rotatedY,
        -sinYaw * projectedX + cosYaw * rotatedY,
        0,
      ),
      direction,
    };
  }

  const originZ = cosPitch > 1e-4 ? -projectedY / cosPitch : 0;

  return {
    origin: createVertex(cosYaw * projectedX, -sinYaw * projectedX, originZ),
    direction,
  };
}

export interface Plan3DRayHit {
  position: Plan3DVertex;
  distance: number;
}

/** Point-in-polygon on the plane that drops the dominant normal axis, so concavity is fine. */
function isPointInsidePolygon(point: Plan3DVertex, vertices: Plan3DVertex[], normal: Plan3DVertex) {
  const absX = Math.abs(normal.x);
  const absY = Math.abs(normal.y);
  const absZ = Math.abs(normal.z);

  const axes: [keyof Plan3DVertex, keyof Plan3DVertex] =
    absZ >= absX && absZ >= absY ? ['x', 'y'] : absX >= absY ? ['y', 'z'] : ['x', 'z'];

  const [horizontalAxis, verticalAxis] = axes;
  let inside = false;

  for (let index = 0, previous = vertices.length - 1; index < vertices.length; previous = index, index += 1) {
    const current = vertices[index];
    const candidate = vertices[previous];
    const currentH = current[horizontalAxis];
    const currentV = current[verticalAxis];
    const candidateH = candidate[horizontalAxis];
    const candidateV = candidate[verticalAxis];

    const straddles = currentV > point[verticalAxis] !== candidateV > point[verticalAxis];

    if (!straddles) {
      continue;
    }

    const crossH =
      ((candidateH - currentH) * (point[verticalAxis] - currentV)) / (candidateV - currentV) +
      currentH;

    if (point[horizontalAxis] < crossH) {
      inside = !inside;
    }
  }

  return inside;
}

/** Intersects the ray with one planar surface, returning the world hit when it lands inside. */
export function intersectPlan3DRayWithSurface(
  ray: Plan3DRay,
  surface: Plan3DPickSurface,
): Plan3DRayHit | null {
  if (surface.vertices.length < 3) {
    return null;
  }

  const normal = polygonNormal(surface.vertices);

  if (!normal) {
    return null;
  }

  const denominator = dot(normal, ray.direction);

  if (Math.abs(denominator) < PARALLEL_EPSILON) {
    return null;
  }

  const distance = dot(normal, subtract(surface.vertices[0], ray.origin)) / denominator;

  if (!Number.isFinite(distance)) {
    return null;
  }

  const position = add(ray.origin, scale(ray.direction, distance));

  if (!isPointInsidePolygon(position, surface.vertices, normal)) {
    return null;
  }

  return { position, distance };
}

/** Where a device should actually sit once the hit point is known for its surface. */
export function resolvePlacementPosition(
  surface: Plan3DPickSurface,
  hit: Plan3DVertex,
  roomHeightMeters: number,
): Plan3DVertex {
  if (surface.kind === 'ceiling') {
    return createVertex(hit.x, hit.y, Math.max(roomHeightMeters - surface.offsetMeters, 0));
  }

  if (surface.kind === 'ceiling_void') {
    // The void plane is above the room, not inside it, so it is read back off the surface rather
    // than derived from the room height.
    const planeHeight = surface.vertices.reduce(
      (lowest, vertex) => Math.min(lowest, vertex.z),
      Number.POSITIVE_INFINITY,
    );

    return createVertex(
      hit.x,
      hit.y,
      Number.isFinite(planeHeight) ? planeHeight : roomHeightMeters + CEILING_VOID_OFFSET_METERS,
    );
  }

  if (surface.kind === 'floor') {
    return createVertex(hit.x, hit.y, surface.offsetMeters);
  }

  const lifted = add(hit, scale(surface.normal, surface.offsetMeters));
  const ceilingLimit = Math.max(roomHeightMeters - surface.offsetMeters, MIN_WALL_MOUNT_METERS);

  return createVertex(
    lifted.x,
    lifted.y,
    clamp(lifted.z, MIN_WALL_MOUNT_METERS, ceilingLimit),
  );
}

function mountingForSurface(kind: Plan3DPickSurfaceKind): Plan3DMounting {
  if (kind === 'floor') {
    return 'floor';
  }

  if (kind === 'ceiling') {
    return 'ceiling';
  }

  if (kind === 'ceiling_void') {
    return 'ceiling_void';
  }

  return 'wall';
}

/**
 * Picks the nearest surface under a tap and resolves the device position for it.
 * Returns `null` when the tap falls outside every surface, which the caller should treat as
 * "nothing placed yet" rather than snapping the device somewhere arbitrary.
 */
export function pickPlan3DPlacement(options: Plan3DPickOptions): Plan3DPlacement | null {
  const { point, rooms, camera, viewport } = options;
  const allowedKinds = options.surfaceKinds;
  const surfaces = buildPlan3DPickSurfaces(rooms, {
    includeCeiling: options.includeCeiling,
    includeCeilingVoid: options.includeCeilingVoid ?? Boolean(allowedKinds?.includes('ceiling_void')),
  }).filter((surface) => !allowedKinds || allowedKinds.includes(surface.kind));

  if (surfaces.length === 0) {
    return null;
  }

  const ray = createPlan3DPickRay(point, camera, viewport);

  let best: { surface: Plan3DPickSurface; hit: Plan3DRayHit } | null = null;

  surfaces.forEach((surface) => {
    const hit = intersectPlan3DRayWithSurface(ray, surface);

    if (!hit) {
      return;
    }

    if (!best || hit.distance < best.hit.distance) {
      best = { surface, hit };
    }
  });

  if (!best) {
    return null;
  }

  const resolved: { surface: Plan3DPickSurface; hit: Plan3DRayHit } = best;
  const room = rooms.find((candidate) => candidate.id === resolved.surface.roomId);
  const roomHeightMeters = room?.heightMeters ?? resolved.surface.vertices.reduce(
    (highest, vertex) => Math.max(highest, vertex.z),
    0,
  );

  const position = resolvePlacementPosition(
    resolved.surface,
    resolved.hit.position,
    roomHeightMeters,
  );

  return {
    position,
    surfacePoint: resolved.hit.position,
    point: mapProjectedPoint(projectVertex(resolved.hit.position, camera), viewport),
    surfaceId: resolved.surface.id,
    surfaceKind: resolved.surface.kind,
    mounting: mountingForSurface(resolved.surface.kind),
    roomId: resolved.surface.roomId,
    roomName: resolved.surface.roomName,
    distance: resolved.hit.distance,
  };
}
