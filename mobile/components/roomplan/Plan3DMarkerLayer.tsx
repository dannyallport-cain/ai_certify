import { Pressable, Text, View } from 'react-native';

import type { Plan3DMarker } from '@/modules/fire-alarm-roomplan';

interface Plan3DMarkerLayerProps {
  markers: Plan3DMarker[];
  /** Colour used for the glyph inside each marker, chosen for contrast with the fill. */
  glyphColour: string;
  onSelectDevice?: (deviceId: string) => void;
  selectedDeviceId?: string | null;
}

const MARKER_BORDER_WIDTH = 1.5;
const SELECTED_BORDER_WIDTH = 3;
const GLYPH_SIZE_RATIO = 0.62;
const HIT_SLOP = 8;
/** Inset of the dashed ring that marks a device installed in the ceiling void. */
const VOID_RING_INSET = 3.5;

export default function Plan3DMarkerLayer({
  markers,
  glyphColour,
  onSelectDevice,
  selectedDeviceId,
}: Plan3DMarkerLayerProps) {
  return (
    <>
      {markers.map((marker) => {
        const size = marker.radius * 2;
        const selected = Boolean(selectedDeviceId && selectedDeviceId === marker.deviceId) || marker.selected;

        return (
          <Pressable
            key={marker.deviceId}
            accessibilityRole="button"
            accessibilityLabel={`${marker.label}${
              marker.manufacturer ? `, ${marker.manufacturer}` : ''
            }`}
            hitSlop={HIT_SLOP}
            onPress={onSelectDevice ? () => onSelectDevice(marker.deviceId) : undefined}
            style={{
              position: 'absolute',
              left: marker.position.x - marker.radius,
              top: marker.position.y - marker.radius,
              width: size,
              height: size,
              borderRadius: marker.radius,
              backgroundColor: marker.colour,
              borderWidth: selected ? SELECTED_BORDER_WIDTH : MARKER_BORDER_WIDTH,
              borderColor: selected ? '#FFFFFF' : 'rgba(2, 6, 23, 0.55)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {marker.mounting === 'ceiling_void' ? (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: VOID_RING_INSET,
                  top: VOID_RING_INSET,
                  right: VOID_RING_INSET,
                  bottom: VOID_RING_INSET,
                  borderRadius: marker.radius,
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: 'rgba(255, 255, 255, 0.92)',
                }}
              />
            ) : null}

            <View pointerEvents="none">
              <Text
                numberOfLines={1}
                style={{
                  color: glyphColour,
                  fontSize: Math.round(marker.radius * GLYPH_SIZE_RATIO),
                  fontWeight: '700',
                  letterSpacing: -0.2,
                }}
              >
                {marker.glyph}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </>
  );
}
