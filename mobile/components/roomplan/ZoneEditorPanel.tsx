import { Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { Plan3DZone } from '@/modules/fire-alarm-roomplan/plan3d/plan3d-types';

interface ZoneEditorPanelProps {
  zones: Plan3DZone[];
  selectedZoneId: string | null;
  onSelect: (zoneId: string) => void;
  onRename: (zoneId: string, name: string) => void;
  onCycleColour: (zoneId: string) => void;
  onRemove: (zoneId: string) => void;
}

/**
 * The zone list under the plan. Renaming uses the iOS prompt because the plan screen already has a
 * scroll view and a keyboard here would hide the drawing the user is working on.
 */
export default function ZoneEditorPanel({
  zones,
  selectedZoneId,
  onSelect,
  onRename,
  onCycleColour,
  onRemove,
}: ZoneEditorPanelProps) {
  if (zones.length === 0) {
    return (
      <View className="rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-3 py-4">
        <Text className="text-center text-xs leading-5 text-[#64748B]">
          Drag on the plan to draw a zone. Each zone gets its own colour and reference.
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-2">
      {zones.map((zone, index) => {
        const selected = zone.id === selectedZoneId;

        return (
          <Pressable
            key={zone.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`Zone ${zone.reference} ${zone.name}`}
            onPress={() => onSelect(zone.id)}
            className={`flex-row items-center rounded-xl border px-3 py-3 ${
              selected ? 'border-[#0D47A1] bg-[#E8F0FE]' : 'border-[#E0E6ED] bg-white'
            }`}
          >
            <View
              style={{ backgroundColor: zone.colour }}
              className="h-5 w-5 items-center justify-center rounded-full"
            >
              <Text className="text-[9px] font-bold text-white">{index + 1}</Text>
            </View>

            <View className="ml-3 flex-1">
              <Text className="text-sm font-semibold text-[#1A202C]" numberOfLines={1}>
                {zone.reference} · {zone.name}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Rename zone ${zone.reference}`}
              hitSlop={6}
              onPress={() =>
                Alert.prompt?.('Rename zone', undefined, (value) => onRename(zone.id, value), 'plain-text', zone.name)
              }
              className="h-8 w-8 items-center justify-center rounded-full bg-white"
            >
              <Ionicons name="create-outline" size={15} color="#334155" />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Change colour of zone ${zone.reference}`}
              hitSlop={6}
              onPress={() => onCycleColour(zone.id)}
              className="ml-1 h-8 w-8 items-center justify-center rounded-full bg-white"
            >
              <Ionicons name="color-palette-outline" size={15} color="#334155" />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove zone ${zone.reference}`}
              hitSlop={6}
              onPress={() => onRemove(zone.id)}
              className="ml-1 h-8 w-8 items-center justify-center rounded-full bg-white"
            >
              <Ionicons name="trash-outline" size={15} color="#B91C1C" />
            </Pressable>
          </Pressable>
        );
      })}
    </View>
  );
}
