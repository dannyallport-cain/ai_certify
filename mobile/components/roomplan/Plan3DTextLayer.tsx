import { Text } from 'react-native';

import type { Plan3DText } from '@/modules/fire-alarm-roomplan';

interface Plan3DTextLayerProps {
  texts: Plan3DText[];
  /** Outline colour used behind each label so it stays readable over the wireframe. */
  shadowColour: string;
}

const TEXT_BOX_WIDTH = 170;
const TEXT_SHADOW_RADIUS = 3;

function horizontalOrigin(text: Plan3DText): number {
  if (text.align === 'center') {
    return text.position.x - TEXT_BOX_WIDTH / 2;
  }

  if (text.align === 'right') {
    return text.position.x - TEXT_BOX_WIDTH;
  }

  return text.position.x;
}

export default function Plan3DTextLayer({ texts, shadowColour }: Plan3DTextLayerProps) {
  return (
    <>
      {texts.map((text) => (
        <Text
          key={text.id}
          pointerEvents="none"
          numberOfLines={1}
          style={{
            position: 'absolute',
            left: horizontalOrigin(text),
            top: text.position.y - text.size,
            width: TEXT_BOX_WIDTH,
            color: text.colour,
            fontSize: text.size,
            fontWeight: text.emphasis === 'strong' ? '700' : '500',
            textAlign: text.align,
            textShadowColor: shadowColour,
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: TEXT_SHADOW_RADIUS,
          }}
        >
          {text.text}
        </Text>
      ))}
    </>
  );
}
