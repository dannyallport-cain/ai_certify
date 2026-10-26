import { View } from 'react-native';

import type { Plan3DQuad } from '@/modules/fire-alarm-roomplan';

import { quadFillSlices } from './quad-fill-slices';

interface Plan3DQuadFillProps {
  quad: Plan3DQuad;
  colour: string;
  opacity: number;
}

/**
 * Fills a projected quad with stacked rectangles, so a surface reads as a solid face without
 * relying on a native matrix transform.
 */
export default function Plan3DQuadFill({ quad, colour, opacity }: Plan3DQuadFillProps) {
  const slices = quadFillSlices(quad);

  if (slices.length === 0) {
    return null;
  }

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
      {slices.map((slice) => (
        <View
          key={slice.key}
          style={{
            position: 'absolute',
            left: slice.left,
            top: slice.top,
            width: slice.width,
            height: slice.height,
            backgroundColor: colour,
            opacity,
          }}
        />
      ))}
    </View>
  );
}
