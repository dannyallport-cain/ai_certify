import { View } from 'react-native';

import type { Plan3DPoint } from '@/modules/fire-alarm-roomplan';

export interface PlacementCrossProps {
  /** Where the cross sits, in canvas pixels. */
  point: Plan3DPoint;
  /** Floor point directly below the cross, used to draw the mounting-height drop line. */
  floorPoint: Plan3DPoint | null;
  width: number;
  height: number;
  colour?: string;
}

const ARM_LENGTH_PX = 15;
const RING_DIAMETER_PX = 26;
const RING_BORDER_PX = 2;
const LINE_THICKNESS_PX = 2;
const LEADER_THICKNESS_PX = 1.5;
const HALO_DIAMETER_PX = 38;
const DEFAULT_COLOUR = '#F97316';

function DropLine({
  from,
  to,
  colour,
}: {
  from: Plan3DPoint;
  to: Plan3DPoint;
  colour: string;
}) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);

  if (length < 4) {
    return null;
  }

  const angle = Math.atan2(dy, dx);

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: from.x,
        top: from.y - LEADER_THICKNESS_PX / 2,
        width: length,
        height: LEADER_THICKNESS_PX,
        borderRadius: LEADER_THICKNESS_PX,
        backgroundColor: colour,
        opacity: 0.5,
        transform: [{ rotate: `${angle}rad` }],
      }}
    />
  );
}

/**
 * The aim marker for a device being placed. It is drawn above the plan and never takes touches,
 * so the whole canvas stays one gesture surface.
 */
export default function PlacementCross({
  point,
  floorPoint,
  width,
  height,
  colour = DEFAULT_COLOUR,
}: PlacementCrossProps) {
  const insideCanvas =
    point.x >= -ARM_LENGTH_PX &&
    point.x <= width + ARM_LENGTH_PX &&
    point.y >= -ARM_LENGTH_PX &&
    point.y <= height + ARM_LENGTH_PX;

  if (!insideCanvas) {
    return null;
  }

  return (
    <>
      {floorPoint ? <DropLine from={point} to={floorPoint} colour={colour} /> : null}

      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: point.x - HALO_DIAMETER_PX / 2,
          top: point.y - HALO_DIAMETER_PX / 2,
          width: HALO_DIAMETER_PX,
          height: HALO_DIAMETER_PX,
          borderRadius: HALO_DIAMETER_PX / 2,
          backgroundColor: colour,
          opacity: 0.18,
        }}
      />

      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: point.x - RING_DIAMETER_PX / 2,
          top: point.y - RING_DIAMETER_PX / 2,
          width: RING_DIAMETER_PX,
          height: RING_DIAMETER_PX,
          borderRadius: RING_DIAMETER_PX / 2,
          borderWidth: RING_BORDER_PX,
          borderColor: colour,
        }}
      />

      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: point.x - ARM_LENGTH_PX,
          top: point.y - LINE_THICKNESS_PX / 2,
          width: ARM_LENGTH_PX * 2,
          height: LINE_THICKNESS_PX,
          borderRadius: LINE_THICKNESS_PX,
          backgroundColor: colour,
        }}
      />

      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: point.x - LINE_THICKNESS_PX / 2,
          top: point.y - ARM_LENGTH_PX,
          width: LINE_THICKNESS_PX,
          height: ARM_LENGTH_PX * 2,
          borderRadius: LINE_THICKNESS_PX,
          backgroundColor: colour,
        }}
      />

      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: point.x - 2,
          top: point.y - 2,
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: '#FFFFFF',
        }}
      />
    </>
  );
}
