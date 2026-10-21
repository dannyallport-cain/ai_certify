import { Text as SvgText } from 'react-native-svg';

import type { PlanSceneText } from '@/modules/fire-alarm-roomplan';

interface PlanLabelProps {
  label: PlanSceneText;
}

/**
 * SVG text with a white halo underneath so labels stay readable when they cross walls,
 * coverage shading or another label.
 */
export function PlanLabel({ label }: PlanLabelProps) {
  return (
    <>
      <SvgText
        x={label.x}
        y={label.y}
        fill="#FFFFFF"
        stroke="#FFFFFF"
        strokeWidth={3}
        fontSize={label.fontSize}
        fontWeight={label.weight}
        textAnchor={label.anchor}
      >
        {label.text}
      </SvgText>
      <SvgText
        x={label.x}
        y={label.y}
        fill={label.colour}
        fontSize={label.fontSize}
        fontWeight={label.weight}
        textAnchor={label.anchor}
      >
        {label.text}
      </SvgText>
    </>
  );
}
