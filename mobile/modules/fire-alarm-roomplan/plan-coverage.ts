import { distanceBetween, polygonArea, pointInPolygon, type PlanPoint } from './geometry-math';
import type { PlanRoomShape } from './plan-geometry';
import type { FireAlarmDeviceType } from './types';

export type DetectorClass = 'smoke' | 'heat';

export interface CoverageProfile {
  label: string;
  radiusMeters: number;
  maxAreaPerDeviceSquareMeters: number | null;
  reference: string;
}

export interface CoverageOptions {
  detectorClass?: DetectorClass;
  sounderEnabled?: boolean;
  vadEnabled?: boolean;
  sampleSpacingMeters?: number;
}

export interface CoverageDeviceInput {
  id: string;
  type: FireAlarmDeviceType;
  position: PlanPoint;
}

export interface CoverageGap {
  id: string;
  position: PlanPoint;
  roomId: string;
  sampleCount: number;
  approximateAreaSquareMeters: number;
  radiusMeters: number;
}

export interface RoomCoverage {
  roomId: string;
  roomName: string;
  areaSquareMeters: number;
  sampleCount: number;
  coveredSamples: number;
  ratio: number;
}

export interface CoverageReport {
  totalSamples: number;
  coveredSamples: number;
  ratio: number;
  rooms: RoomCoverage[];
  gaps: CoverageGap[];
  coverageDevices: number;
  uncoveredAreaSquareMeters: number;
  detectorClass: DetectorClass;
  sampleSpacingMeters: number;
}

/**
 * Indicative coverage limits for planning only. The figures follow the widely published
 * BS 5839-1 Table 1 values for flat ceilings; they must be checked against the installed
 * device datasheets and the current edition of the standard before being used as design proof.
 */
export const INDICATIVE_COVERAGE_PROFILES: Record<string, CoverageProfile> = {
  smoke: {
    label: 'Smoke detector (indicative)',
    radiusMeters: 7.5,
    maxAreaPerDeviceSquareMeters: 80,
    reference: 'BS 5839-1 Table 1 - smoke, flat ceiling',
  },
  heat: {
    label: 'Heat detector (indicative)',
    radiusMeters: 5.3,
    maxAreaPerDeviceSquareMeters: 40,
    reference: 'BS 5839-1 Table 1 - heat, flat ceiling',
  },
  sounder: {
    label: 'Sounder (indicative)',
    radiusMeters: 7.5,
    maxAreaPerDeviceSquareMeters: 60,
    reference: 'BS 5839-1 clause 16 - confirm with a sound pressure survey',
  },
  vad: {
    label: 'Visual alarm device (indicative)',
    radiusMeters: 5,
    maxAreaPerDeviceSquareMeters: 40,
    reference: 'BS 5839-1 clause 17 - confirm with a lux survey',
  },
};

export const DEFAULT_SAMPLE_SPACING_METERS = 0.5;

export function coverageRadiusFor(
  type: FireAlarmDeviceType,
  options: CoverageOptions = {},
): number | null {
  const detectorClass = options.detectorClass ?? 'smoke';

  switch (type) {
    case 'detector':
      return INDICATIVE_COVERAGE_PROFILES[detectorClass].radiusMeters;
    case 'sounder':
      return options.sounderEnabled === false
        ? null
        : INDICATIVE_COVERAGE_PROFILES.sounder.radiusMeters;
    case 'vad':
      return options.vadEnabled === false ? null : INDICATIVE_COVERAGE_PROFILES.vad.radiusMeters;
    default:
      return null;
  }
}

function sampleRoom(room: PlanRoomShape, spacing: number): PlanPoint[] {
  const samples: PlanPoint[] = [];
  const xs = room.outline.map((point) => point.x);
  const ys = room.outline.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  for (let x = minX + spacing / 2; x <= maxX; x += spacing) {
    for (let y = minY + spacing / 2; y <= maxY; y += spacing) {
      const point = { x, y };

      if (pointInPolygon(point, room.outline)) {
        samples.push(point);
      }
    }
  }

  return samples;
}

function clusterGaps(
  uncovered: { point: PlanPoint; roomId: string; radius: number }[],
  spacing: number,
): CoverageGap[] {
  const buckets = new Map<string, { roomId: string; radius: number; points: PlanPoint[] }>();

  uncovered.forEach(({ point, roomId, radius }) => {
    const key = `${roomId}:${Math.round(point.x / 1.5)}:${Math.round(point.y / 1.5)}`;
    const bucket = buckets.get(key) ?? { roomId, radius, points: [] };
    bucket.points.push(point);
    buckets.set(key, bucket);
  });

  return Array.from(buckets.entries())
    .map(([key, bucket]) => {
      const centre = bucket.points.reduce(
        (accumulator, point) => ({
          x: accumulator.x + point.x / bucket.points.length,
          y: accumulator.y + point.y / bucket.points.length,
        }),
        { x: 0, y: 0 },
      );

      return {
        id: `gap-${key}`,
        position: centre,
        roomId: bucket.roomId,
        sampleCount: bucket.points.length,
        approximateAreaSquareMeters:
          Math.round(bucket.points.length * spacing * spacing * 10) / 10,
        radiusMeters: bucket.radius,
      } satisfies CoverageGap;
    })
    .sort((left, right) => right.sampleCount - left.sampleCount)
    .slice(0, 12);
}

export function analysePlanCoverage(
  rooms: PlanRoomShape[],
  devices: CoverageDeviceInput[],
  options: CoverageOptions = {},
): CoverageReport {
  const spacing = options.sampleSpacingMeters ?? DEFAULT_SAMPLE_SPACING_METERS;
  const coverageDevices = devices
    .map((device) => ({ ...device, radius: coverageRadiusFor(device.type, options) }))
    .filter((device): device is CoverageDeviceInput & { radius: number } => device.radius !== null);

  const uncoveredPoints: { point: PlanPoint; roomId: string; radius: number }[] = [];
  const roomReports: RoomCoverage[] = [];
  const smallestRadius =
    coverageDevices.length > 0
      ? Math.min(...coverageDevices.map((device) => device.radius))
      : 0;
  let totalSamples = 0;
  let coveredSamples = 0;

  rooms.forEach((room) => {
    const samples = sampleRoom(room, spacing);
    let roomCovered = 0;

    samples.forEach((point) => {
      const isCovered = coverageDevices.some(
        (device) => distanceBetween(point, device.position) <= device.radius,
      );

      if (isCovered) {
        roomCovered += 1;
      } else if (coverageDevices.length > 0) {
        uncoveredPoints.push({ point, roomId: room.id, radius: smallestRadius });
      }
    });

    totalSamples += samples.length;
    coveredSamples += roomCovered;
    roomReports.push({
      roomId: room.id,
      roomName: room.name,
      areaSquareMeters: Math.round(polygonArea(room.outline) * 10) / 10,
      sampleCount: samples.length,
      coveredSamples: roomCovered,
      ratio: samples.length === 0 ? 0 : roomCovered / samples.length,
    });
  });

  return {
    totalSamples,
    coveredSamples,
    ratio: totalSamples === 0 ? 0 : coveredSamples / totalSamples,
    rooms: roomReports,
    gaps: coverageDevices.length === 0 ? [] : clusterGaps(uncoveredPoints, spacing),
    coverageDevices: coverageDevices.length,
    uncoveredAreaSquareMeters:
      Math.round((totalSamples - coveredSamples) * spacing * spacing * 10) / 10,
    detectorClass: options.detectorClass ?? 'smoke',
    sampleSpacingMeters: spacing,
  };
}
