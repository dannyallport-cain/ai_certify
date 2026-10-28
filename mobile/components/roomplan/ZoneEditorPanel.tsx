import { Alert, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { Plan3DZone } from '@/modules/fire-alarm-roomplan/plan3d/plan3d-types';
import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/theme/useTheme';

interface ZoneEditorPanelProps {
  zones: Plan3DZone[];
  selectedZoneId: string | null;
  onSelect: (zoneId: string) => void;
  onRename: (zoneId: string, name: string) => void;
  onCycleColour: (zoneId: string) => void;
  onRemove: (zoneId: string) => void;
}

/**
 * The zone list under the plan. Renaming uses the iOS prompt because the plan
 * screen already scrolls and a keyboard here would hide the drawing.
 */
export default function ZoneEditorPanel({
  zones,
  selectedZoneId,
  onSelect,
  onRename,
  onCycleColour,
  onRemove,
}: ZoneEditorPanelProps) {
  const { palette } = useTheme();

  if (zones.length === 0) {
    return (
      <View
        style={{
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: palette.lineStrong,
          backgroundColor: palette.surfaceAlt,
          borderRadius: 12,
          paddingVertical: 16,
          paddingHorizontal: 12,
        }}
      >
        <AppText variant="caption" tone="muted" style={{ textAlign: 'center' }}>
          Tap Zones above, then drag on the plan to draw one.
        </AppText>
      </View>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      {zones.map((zone, index) => {
        const selected = zone.id === selectedZoneId;

        return (
          <Pressable
            key={zone.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`Zone ${zone.reference} ${zone.name}`}
            onPress={() => onSelect(zone.id)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: selected ? palette.brand : palette.line,
              backgroundColor: selected ? palette.brandSoft : palette.surface,
              paddingVertical: 10,
              paddingHorizontal: 10,
            }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: zone.colour,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppText variant="caption" style={{ color: '#FFFFFF', fontWeight: '700' }}>
                {index + 1}
              </AppText>
            </View>

            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText variant="bodyStrong" numberOfLines={1}>
                {`${zone.reference} · ${zone.name}`}
              </AppText>
            </View>

            <IconAction
              icon="create-outline"
              label={`Rename zone ${zone.reference}`}
              onPress={() =>
                Alert.prompt?.(
                  'Rename zone',
                  undefined,
                  (value) => onRename(zone.id, value),
                  'plain-text',
                  zone.name,
                )
              }
            />
            <IconAction
              icon="color-palette-outline"
              label={`Change colour of zone ${zone.reference}`}
              onPress={() => onCycleColour(zone.id)}
            />
            <IconAction
              icon="trash-outline"
              label={`Remove zone ${zone.reference}`}
              tint={palette.danger}
              onPress={() => onRemove(zone.id)}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

function IconAction({
  icon,
  label,
  onPress,
  tint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tint?: string;
}) {
  const { palette } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: palette.surfaceAlt,
      }}
    >
      <Ionicons name={icon} size={15} color={tint ?? palette.ink} />
    </Pressable>
  );
}
