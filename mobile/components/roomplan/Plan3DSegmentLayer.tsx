import { View } from 'react-native';

import type { Plan3DSegment } from '@/modules/fire-alarm-roomplan';

interface Plan3DSegmentLayerProps {
  segments: Plan3DSegment[];
}

const MAX_DASHES_PER_SEGMENT = 60;
const DASH_LENGTH_RATIO = 5 / 9;

interface SegmentPiece {
  key: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

function splitDashedSegment(segment: Plan3DSegment): SegmentPiece[] {
  const dx = segment.to.x - segment.from.x;
  const dy = segment.to.y - segment.from.y;
  const length = Math.hypot(dx, dy);

  if (!segment.dashed || length < 6) {
    return [
      {
        key: segment.id,
        fromX: segment.from.x,
        fromY: segment.from.y,
        toX: segment.to.x,
        toY: segment.to.y,
      },
    ];
  }

  const dashCount = Math.max(1, Math.min(Math.round(length / 9), MAX_DASHES_PER_SEGMENT));
  const cycle = length / dashCount;
  const dashLength = cycle * DASH_LENGTH_RATIO;
  const unitX = dx / length;
  const unitY = dy / length;

  return Array.from({ length: dashCount }, (_, index) => {
    const startOffset = index * cycle;
    const endOffset = startOffset + dashLength;

    return {
      key: `${segment.id}-dash-${index}`,
      fromX: segment.from.x + unitX * startOffset,
      fromY: segment.from.y + unitY * startOffset,
      toX: segment.from.x + unitX * endOffset,
      toY: segment.from.y + unitY * endOffset,
    };
  });
}

function SegmentPieceView({
  piece,
  colour,
  width,
  opacity,
}: {
  piece: SegmentPiece;
  colour: string;
  width: number;
  opacity: number;
}) {
  const dx = piece.toX - piece.fromX;
  const dy = piece.toY - piece.fromY;
  const length = Math.hypot(dx, dy);

  if (length < 0.5) {
    return null;
  }

  const centreX = (piece.fromX + piece.toX) / 2;
  const centreY = (piece.fromY + piece.toY) / 2;
  const angle = Math.atan2(dy, dx);

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: centreX - length / 2,
        top: centreY - width / 2,
        width: length,
        height: width,
        borderRadius: width / 2,
        backgroundColor: colour,
        opacity,
        transform: [{ rotate: `${angle}rad` }],
      }}
    />
  );
}

/**
 * Draws the plan's wireframe as rotated rectangles, which avoids any dependency on an SVG
 * renderer while keeping hairline widths crisp at any projection angle.
 */
export default function Plan3DSegmentLayer({ segments }: Plan3DSegmentLayerProps) {
  return (
    <>
      {segments.map((segment) =>
        splitDashedSegment(segment).map((piece) => (
          <SegmentPieceView
            key={piece.key}
            piece={piece}
            colour={segment.colour}
            width={segment.width}
            opacity={segment.opacity}
          />
        )),
      )}
    </>
  );
}
