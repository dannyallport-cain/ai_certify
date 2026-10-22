import { View } from 'react-native';

import type { Plan3DPolygon } from '@/modules/fire-alarm-roomplan';

/**
 * Base edge length of the unit square that each filled surface is drawn from. The transform
 * matrix maps this square onto the projected parallelogram, keeping the scale factor small
 * enough that platforms do not blur the fill.
 */
const QUAD_BASE_SIZE = 64;

interface Plan3DPolygonLayerProps {
  polygons: Plan3DPolygon[];
}

function QuadFill({ polygon }: { polygon: Plan3DPolygon }) {
  const quad = polygon.quad;

  if (!quad) {
    return null;
  }

  const matrix: number[] = [
    quad.u.x / QUAD_BASE_SIZE,
    quad.u.y / QUAD_BASE_SIZE,
    0,
    quad.v.x / QUAD_BASE_SIZE,
    quad.v.y / QUAD_BASE_SIZE,
    0,
    quad.origin.x,
    quad.origin.y,
    1,
  ];

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: QUAD_BASE_SIZE,
        height: QUAD_BASE_SIZE,
        backgroundColor: polygon.fill,
        opacity: polygon.fillOpacity,
        transform: [{ matrix }],
      }}
    />
  );
}

/**
 * Draws the translucent surface fills. Only surfaces whose projection is a parallelogram are
 * filled, because a native view can express an affine transform exactly but not an arbitrary
 * polygon. Their outlines are always drawn by the segment layer, so every surface stays legible.
 */
export default function Plan3DPolygonLayer({ polygons }: Plan3DPolygonLayerProps) {
  return (
    <>
      {polygons
        .filter((polygon) => polygon.quad !== null)
        .map((polygon) => (
          <QuadFill key={polygon.id} polygon={polygon} />
        ))}
    </>
  );
}
