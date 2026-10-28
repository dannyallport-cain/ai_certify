import type { Plan3DSegment, Plan3DZonePolygon } from '@/modules/fire-alarm-roomplan';
import { quadFromProjectedPoints } from '@/modules/fire-alarm-roomplan/plan3d/geometry';

import Plan3DQuadFill from './Plan3DQuadFill';
import Plan3DSegmentLayer from './Plan3DSegmentLayer';

interface Plan3DZoneLayerProps {
  zones: Plan3DZonePolygon[];
  /** Zone drawn with a heavier solid outline, so the editor shows which zone is being edited. */
  selectedZoneId?: string | null;
}

const SELECTED_STROKE_WIDTH = 3;
const OUTLINE_STROKE_WIDTH = 1.8;

/**
 * Zone outlines as segments, closed back to the first vertex. Drawing the outline as segments
 * rather than relying on a fill means an L-shaped zone — which projects to a non-parallelogram —
 * still reads correctly, because only the fill is skipped.
 */
function toOutlineSegments(zone: Plan3DZonePolygon, selected: boolean): Plan3DSegment[] {
  return zone.points.map((point, index) => ({
    id: `${zone.zoneId}-edge-${index}`,
    kind: 'floor-outline',
    layer: 'zone',
    from: point,
    to: zone.points[(index + 1) % zone.points.length],
    colour: zone.stroke,
    width: selected ? SELECTED_STROKE_WIDTH : OUTLINE_STROKE_WIDTH,
    opacity: selected ? 1 : 0.85,
    depth: zone.depth,
    dashed: !selected,
  }));
}

function ZoneShape({
  zone,
  selected,
}: {
  zone: Plan3DZonePolygon;
  selected: boolean;
}) {
  const quad = quadFromProjectedPoints(zone.points);

  return (
    <>
      {quad ? <Plan3DQuadFill quad={quad} colour={zone.fill} opacity={zone.fillOpacity} /> : null}
      <Plan3DSegmentLayer segments={toOutlineSegments(zone, selected)} />
    </>
  );
}

/**
 * Draws the colour coded zones over the floor. Fills are only possible when the projection of the
 * zone is a parallelogram, which is the normal case for rectangular compartments; every zone gets
 * a visible outline either way.
 */
export default function Plan3DZoneLayer({ zones, selectedZoneId }: Plan3DZoneLayerProps) {
  if (zones.length === 0) {
    return null;
  }

  return (
    <>
      {zones.map((zone) => (
        <ZoneShape
          key={zone.zoneId}
          zone={zone}
          selected={Boolean(selectedZoneId && selectedZoneId === zone.zoneId)}
        />
      ))}
    </>
  );
}
