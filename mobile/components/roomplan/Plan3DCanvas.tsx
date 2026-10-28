import type { StyleProp, ViewStyle } from 'react-native';
import { Text, View } from 'react-native';

import { getPlan3DPalette, type FireAlarmPlan3D } from '@/modules/fire-alarm-roomplan';

import Plan3DMarkerLayer from './Plan3DMarkerLayer';
import Plan3DPolygonLayer from './Plan3DPolygonLayer';
import Plan3DSegmentLayer from './Plan3DSegmentLayer';
import Plan3DTextLayer from './Plan3DTextLayer';
import Plan3DZoneLayer from './Plan3DZoneLayer';

interface Plan3DCanvasProps {
  plan: FireAlarmPlan3D;
  onSelectDevice?: (deviceId: string) => void;
  selectedDeviceId?: string | null;
  /** Highlights one zone with a solid outline, used by the zone editor. */
  selectedZoneId?: string | null;
  style?: StyleProp<ViewStyle>;
}

/**
 * Renders a generated 3D plan without any drawing dependency: fills are affine-transformed
 * views, the wireframe is rotated rectangles and everything else is plain text and circles.
 *
 * Draw order mirrors the generator's layers: floor and grid, then depth-sorted structure,
 * then overlays, then markers and labels.
 */
export default function Plan3DCanvas({
  plan,
  onSelectDevice,
  selectedDeviceId,
  selectedZoneId,
  style,
}: Plan3DCanvasProps) {
  const palette = getPlan3DPalette(plan.colourScheme);
  const glyphColour = plan.colourScheme === 'schematic' ? '#FFFFFF' : '#0B1727';

  const basePolygons = plan.polygons.filter((polygon) => polygon.layer === 'base');
  const structurePolygons = plan.polygons.filter((polygon) => polygon.layer === 'structure');
  const baseSegments = plan.segments.filter((segment) => segment.layer === 'base');
  const structureSegments = plan.segments.filter((segment) => segment.layer === 'structure');
  const overlaySegments = plan.segments.filter((segment) => segment.layer === 'overlay');

  return (
    <View
      style={[
        {
          width: plan.viewport.width,
          height: plan.viewport.height,
          backgroundColor: palette.surfaceBackground,
          borderRadius: 20,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Plan3DPolygonLayer polygons={basePolygons} />
      <Plan3DSegmentLayer segments={baseSegments} />
      <Plan3DZoneLayer zones={plan.zones} selectedZoneId={selectedZoneId} />
      <Plan3DPolygonLayer polygons={structurePolygons} />
      <Plan3DSegmentLayer segments={structureSegments} />
      <Plan3DSegmentLayer segments={overlaySegments} />
      <Plan3DMarkerLayer
        markers={plan.markers}
        glyphColour={glyphColour}
        onSelectDevice={onSelectDevice}
        selectedDeviceId={selectedDeviceId}
      />
      <Plan3DTextLayer texts={plan.texts} shadowColour={palette.surfaceBackground} />

      {plan.polygons.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text style={{ color: palette.caption }} className="text-center text-sm">
            This session has no room geometry to draw yet.
          </Text>
        </View>
      ) : null}
    </View>
  );
}
