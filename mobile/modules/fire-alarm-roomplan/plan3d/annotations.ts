import type { FireAlarmDeviceType, FireAlarmManufacturer } from '../types';
import type {
  Plan3DCamera,
  Plan3DLegendEntry,
  Plan3DMarker,
  Plan3DPoint,
  Plan3DText,
  Plan3DVertex,
  Plan3DViewport,
} from './plan3d-types';
import type { Plan3DPalette } from './palette';
import type { Plan3DRoom } from './room-types';
import type { WorldLine } from './surfaces';
import { getPlan3DDeviceStyle, PLAN3D_DEVICE_TYPE_ORDER } from './palette';
import { clamp, createVertex, isFiniteNumber, polygonCentroid2D } from './geometry';
import { mapProjectedPoint, projectVertex } from './projection';

const BASE_MARKER_RADIUS = 12;
const SELECTED_MARKER_RADIUS = 16;
const MARKER_LABEL_LIMIT = 24;
/**
 * Room labels sit just above the floor plane. Devices are all mounted at 1.2 m or higher, so this
 * keeps the label clear of every marker and drop line.
 */
const ROOM_LABEL_HEIGHT_METERS = 0.05;
const LEADER_MIN_HEIGHT_METERS = 0.4;
const MAX_DEVICE_LABEL_CHARACTERS = 16;
const DEVICE_LABEL_OFFSET_PX = 9;
const LABEL_BOX_WIDTH_PX = 88;
const LABEL_BOX_HEIGHT_PX = 12;
const ROOM_LABEL_WIDTH_PX = 150;
const ROOM_LABEL_HEIGHT_PX = 16;
const ROOM_LABEL_SHIFT_PX = 22;
const MAX_ROOM_LABEL_SHIFTS = 3;

export function resolveManufacturerName(
  manufacturer: FireAlarmManufacturer | undefined | null,
): string | null {
  if (!manufacturer) {
    return null;
  }

  const rawName = typeof manufacturer === 'string' ? manufacturer : manufacturer.name;
  const trimmed = rawName?.trim();

  if (!trimmed || trimmed.toLowerCase() === 'unknown') {
    return null;
  }

  return trimmed;
}

function truncateLabel(text: string, maxCharacters: number): string {
  if (text.length <= maxCharacters) {
    return text;
  }

  return `${text.slice(0, maxCharacters - 1)}…`;
}

/**
 * Builds the drop lines that connect wall and ceiling devices to their floor position, which
 * makes mounting height readable on a 2D projection.
 */
export function buildDeviceLeaderLines(rooms: Plan3DRoom[]): WorldLine[] {
  return rooms.flatMap((room) =>
    room.devices
      .filter((placed) => placed.worldPosition.z > LEADER_MIN_HEIGHT_METERS)
      .map((placed) => ({
        id: `${placed.device.id}-leader`,
        kind: 'leader' as const,
        layer: 'overlay' as const,
        roomId: room.id,
        start: createVertex(placed.worldPosition.x, placed.worldPosition.y, 0),
        end: createVertex(placed.worldPosition.x, placed.worldPosition.y, placed.worldPosition.z),
        dashed: true,
      })),
  );
}

/** World-space anchors for every device marker so callers can fit the viewport around them. */
export function collectDeviceAnchorVertices(rooms: Plan3DRoom[]): Plan3DVertex[] {
  return rooms.flatMap((room) =>
    room.devices.map((placed) =>
      createVertex(placed.worldPosition.x, placed.worldPosition.y, placed.worldPosition.z),
    ),
  );
}

export function buildPlan3DMarkers(input: {
  rooms: Plan3DRoom[];
  camera: Plan3DCamera;
  viewport: Plan3DViewport;
  selectedDeviceId?: string | null;
}): Plan3DMarker[] {
  const { rooms, camera, viewport, selectedDeviceId } = input;

  return rooms
    .flatMap((room) =>
      room.devices.map((placed) => {
        const style = getPlan3DDeviceStyle(placed.device.type);
        const projected = projectVertex(placed.worldPosition, camera);
        const selected = Boolean(selectedDeviceId && selectedDeviceId === placed.device.id);

        return {
          deviceId: placed.device.id,
          deviceType: placed.device.type,
          label: placed.device.label?.trim() || style.label,
          glyph: style.glyph,
          colour: style.colour,
          position: mapProjectedPoint(projected, viewport),
          worldPosition: placed.worldPosition,
          radius: selected ? SELECTED_MARKER_RADIUS : BASE_MARKER_RADIUS,
          depth: projected.depth,
          selected,
          confidence: isFiniteNumber(placed.device.confidence) ? placed.device.confidence : null,
          manufacturer: resolveManufacturerName(placed.device.manufacturer),
          roomId: room.id,
          mounting: placed.mounting,
        } satisfies Plan3DMarker;
      }),
    )
    .sort((left, right) => right.depth - left.depth);
}

/** Candidate label anchors around a marker, tried in order of preference. */
function labelCandidates(marker: Plan3DMarker): Plan3DPoint[] {
  const below = marker.radius + DEVICE_LABEL_OFFSET_PX + LABEL_BOX_HEIGHT_PX / 2;
  const beside = marker.radius + LABEL_BOX_WIDTH_PX / 2 + 6;
  const above = -(marker.radius + LABEL_BOX_HEIGHT_PX / 2 + 4);

  return [
    { x: marker.position.x, y: marker.position.y + below },
    { x: marker.position.x, y: marker.position.y + below + LABEL_BOX_HEIGHT_PX + 2 },
    { x: marker.position.x + beside, y: marker.position.y + 3 },
    { x: marker.position.x - beside, y: marker.position.y + 3 },
    { x: marker.position.x, y: marker.position.y + above },
    { x: marker.position.x + beside, y: marker.position.y - 10 },
    { x: marker.position.x - beside, y: marker.position.y - 10 },
  ];
}

export function buildPlan3DTexts(input: {
  rooms: Plan3DRoom[];
  markers: Plan3DMarker[];
  camera: Plan3DCamera;
  viewport: Plan3DViewport;
  palette: Plan3DPalette;
}): Plan3DText[] {
  const { rooms, markers, camera, viewport, palette } = input;
  const texts: Plan3DText[] = [];
  const roomLabelBoxes: Plan3DPoint[] = [];

  rooms.forEach((room, index) => {
    if (room.footprint.length < 3) {
      return;
    }

    const centroid = polygonCentroid2D(room.footprint);
    const anchor = createVertex(centroid.x, centroid.y, ROOM_LABEL_HEIGHT_METERS);
    const projected = projectVertex(anchor, camera);
    let position = mapProjectedPoint(projected, viewport);

    // In a plan view the room centre often coincides with a ceiling device, so step the label
    // upwards until it clears every marker. Extents are combined half-sizes so the text box
    // itself, not just its anchor point, has to miss the marker circle.
    for (let attempt = 0; attempt < MAX_ROOM_LABEL_SHIFTS; attempt += 1) {
      const collides = markers.some(
        (marker) =>
          Math.abs(marker.position.x - position.x) <
            ROOM_LABEL_WIDTH_PX / 2 + marker.radius &&
          Math.abs(marker.position.y - position.y) <
            ROOM_LABEL_HEIGHT_PX / 2 + marker.radius,
      );

      if (!collides) {
        break;
      }

      position = { x: position.x, y: position.y - ROOM_LABEL_SHIFT_PX };
    }

    // Labels must stay inside the canvas; a clipped room name is worse than a shifted one.
    if (viewport.width > ROOM_LABEL_WIDTH_PX + 8) {
      position = {
        x: clamp(position.x, ROOM_LABEL_WIDTH_PX / 2 + 2, viewport.width - ROOM_LABEL_WIDTH_PX / 2 - 2),
        y: clamp(position.y, ROOM_LABEL_HEIGHT_PX, viewport.height - 4),
      };
    }

    roomLabelBoxes.push(position);

    texts.push({
      id: `${room.id}-label-${index + 1}`,
      text: `${room.name} · ${room.floorAreaSquareMeters.toFixed(1)} m²`,
      position,
      colour: palette.roomLabel,
      size: 11,
      align: 'center',
      depth: projected.depth,
      emphasis: 'strong',
    });
  });

  if (camera.showLabels && markers.length > 0 && markers.length <= MARKER_LABEL_LIMIT) {
    const placedLabels: Plan3DPoint[] = [];
    const labelHalfWidth = LABEL_BOX_WIDTH_PX / 2;
    const labelHalfHeight = LABEL_BOX_HEIGHT_PX / 2;

    const isFree = (marker: Plan3DMarker, candidate: Plan3DPoint): boolean => {
      const insideCanvas =
        candidate.x - labelHalfWidth >= 2 &&
        candidate.x + labelHalfWidth <= viewport.width - 2 &&
        candidate.y - labelHalfHeight >= 2 &&
        candidate.y + labelHalfHeight <= viewport.height - 2;

      if (!insideCanvas) {
        return false;
      }

      const overlapsPlacedLabel = placedLabels.some(
        (placed) =>
          Math.abs(placed.x - candidate.x) < LABEL_BOX_WIDTH_PX + 4 &&
          Math.abs(placed.y - candidate.y) < LABEL_BOX_HEIGHT_PX,
      );

      if (overlapsPlacedLabel) {
        return false;
      }

      const overlapsRoomLabel = roomLabelBoxes.some(
        (roomLabel) =>
          Math.abs(roomLabel.x - candidate.x) <
            ROOM_LABEL_WIDTH_PX / 2 + labelHalfWidth &&
          Math.abs(roomLabel.y - candidate.y) <
            ROOM_LABEL_HEIGHT_PX / 2 + labelHalfHeight,
      );

      if (overlapsRoomLabel) {
        return false;
      }

      return !markers.some(
        (other) =>
          other.deviceId !== marker.deviceId &&
          Math.abs(other.position.x - candidate.x) < labelHalfWidth + other.radius &&
          Math.abs(other.position.y - candidate.y) < labelHalfHeight + other.radius,
      );
    };

    markers.forEach((marker) => {
      // Try each side of the marker and keep the first position that leaves the text readable.
      // A device whose label has nowhere to go is left unlabelled rather than printed on top of
      // another label; the marker glyph, the summary and the legend still identify it.
      const chosen = labelCandidates(marker).find((candidate) => isFree(marker, candidate));

      if (!chosen) {
        return;
      }

      placedLabels.push(chosen);

      texts.push({
        id: `${marker.deviceId}-label`,
        text: truncateLabel(marker.label, MAX_DEVICE_LABEL_CHARACTERS),
        position: chosen,
        colour: palette.deviceLabel,
        size: 9,
        align: 'center',
        depth: marker.depth,
        emphasis: 'normal',
      });
    });
  }

  return texts.sort((left, right) => right.depth - left.depth);
}

export function buildPlan3DLegend(rooms: Plan3DRoom[]): Plan3DLegendEntry[] {
  const counts = new Map<FireAlarmDeviceType, number>();

  rooms.forEach((room) => {
    room.devices.forEach((placed) => {
      counts.set(placed.device.type, (counts.get(placed.device.type) ?? 0) + 1);
    });
  });

  return PLAN3D_DEVICE_TYPE_ORDER.filter((type) => (counts.get(type) ?? 0) > 0).map((type) => {
    const style = getPlan3DDeviceStyle(type);

    return {
      deviceType: type,
      label: style.label,
      glyph: style.glyph,
      colour: style.colour,
      count: counts.get(type) ?? 0,
    } satisfies Plan3DLegendEntry;
  });
}
