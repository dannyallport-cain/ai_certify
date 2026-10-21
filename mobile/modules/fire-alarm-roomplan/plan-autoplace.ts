import { distanceBetween, pointInPolygon, type PlanPoint } from './geometry-math';
import type { PlanRoomShape } from './plan-geometry';

export interface AutoPlaceOptions {
  radiusMeters: number;
  sampleSpacingMeters?: number;
  candidateSpacingMeters?: number;
  maxDetectors?: number;
}

export interface AutoPlaceResult {
  positions: { position: PlanPoint; roomId: string }[];
  coveredSamples: number;
  totalSamples: number;
}

const DEFAULT_SAMPLE_SPACING = 0.5;
const DEFAULT_CANDIDATE_SPACING = 1;
const DEFAULT_MAX_DETECTORS = 40;

function sampleRoom(room: PlanRoomShape, spacing: number): PlanPoint[] {
  const xs = room.outline.map((point) => point.x);
  const ys = room.outline.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const samples: PlanPoint[] = [];

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

function candidatePositions(room: PlanRoomShape, spacing: number): PlanPoint[] {
  const xs = room.outline.map((point) => point.x);
  const ys = room.outline.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const candidates: PlanPoint[] = [];

  for (let x = minX + spacing / 2; x <= maxX; x += spacing) {
    for (let y = minY + spacing / 2; y <= maxY; y += spacing) {
      const point = { x, y };

      if (pointInPolygon(point, room.outline)) {
        candidates.push(point);
      }
    }
  }

  return candidates;
}

/**
 * Greedy set-cover layout: repeatedly places a detector on the candidate grid position that
 * covers the most still-uncovered floor samples, until every sample is covered or the cap is hit.
 * Existing devices are treated as already covering their radius.
 */
export function suggestDetectorPositions(
  rooms: PlanRoomShape[],
  existingDevices: PlanPoint[],
  options: AutoPlaceOptions,
): AutoPlaceResult {
  const radius = Math.max(options.radiusMeters, 0.5);
  const sampleSpacing = options.sampleSpacingMeters ?? DEFAULT_SAMPLE_SPACING;
  const candidateSpacing = options.candidateSpacingMeters ?? DEFAULT_CANDIDATE_SPACING;
  const maxDetectors = options.maxDetectors ?? DEFAULT_MAX_DETECTORS;
  const positions: { position: PlanPoint; roomId: string }[] = [];
  let totalSamples = 0;
  let coveredSamples = 0;

  rooms.forEach((room) => {
    const samples = sampleRoom(room, sampleSpacing);
    totalSamples += samples.length;
    let uncovered = samples.filter((sample) =>
      existingDevices.every((device) => distanceBetween(sample, device) > radius),
    );
    coveredSamples += samples.length - uncovered.length;
    const candidates = candidatePositions(room, candidateSpacing);

    while (uncovered.length > 0 && positions.length < maxDetectors) {
      let bestCandidate: PlanPoint | null = null;
      let bestGain = 0;

      candidates.forEach((candidate) => {
        const gain = uncovered.reduce(
          (total, sample) => (distanceBetween(sample, candidate) <= radius ? total + 1 : total),
          0,
        );

        if (gain > bestGain) {
          bestGain = gain;
          bestCandidate = candidate;
        }
      });

      if (!bestCandidate || bestGain === 0) {
        break;
      }

      const chosen: PlanPoint = bestCandidate;
      positions.push({ position: chosen, roomId: room.id });
      const remaining = uncovered.filter((sample) => distanceBetween(sample, chosen) > radius);
      coveredSamples += uncovered.length - remaining.length;
      uncovered = remaining;
    }
  });

  return {
    positions,
    coveredSamples: Math.min(totalSamples, coveredSamples),
    totalSamples,
  };
}
