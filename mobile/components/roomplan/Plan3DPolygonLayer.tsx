import type { Plan3DPolygon } from '@/modules/fire-alarm-roomplan';

import Plan3DQuadFill from './Plan3DQuadFill';

interface Plan3DPolygonLayerProps {
  polygons: Plan3DPolygon[];
}

/**
 * Draws the translucent surface fills.
 *
 * Only surfaces whose projection is a parallelogram are filled: every rectangular surface under
 * this orthographic camera is exactly a parallelogram, and its outline is always drawn by the
 * segment layer, so a surface that cannot be filled stays legible anyway.
 */
export default function Plan3DPolygonLayer({ polygons }: Plan3DPolygonLayerProps) {
  return (
    <>
      {polygons
        .filter((polygon) => polygon.quad !== null)
        .map((polygon) =>
          polygon.quad ? (
            <Plan3DQuadFill
              key={polygon.id}
              quad={polygon.quad}
              colour={polygon.fill}
              opacity={polygon.fillOpacity}
            />
          ) : null,
        )}
    </>
  );
}
