import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, TextInput, View } from 'react-native';

import type { PlanGeometry } from '@/modules/fire-alarm-roomplan';

import type { ManualRoomDraft } from './usePlanEditor';

interface ManualRoomCardProps {
  geometry: PlanGeometry;
  onAddRoom: (draft: ManualRoomDraft) => void;
  onRemoveRoom: (roomId: string) => void;
}

const NUMBER_PAD = 'decimal-pad';

export function ManualRoomCard({ geometry, onAddRoom, onRemoveRoom }: ManualRoomCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('Ground floor');
  const [width, setWidth] = useState('6');
  const [depth, setDepth] = useState('4');
  const [height, setHeight] = useState(String(geometry.defaultWallHeight));

  const submit = () => {
    onAddRoom({
      name: name.trim() || 'Room',
      widthMeters: Number(width) || 6,
      depthMeters: Number(depth) || 4,
      wallHeightMeters: Number(height) || geometry.defaultWallHeight,
    });
    setIsOpen(false);
  };

  return (
    <View className="rounded-[24px] border border-[#E0E6ED] bg-white p-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-base font-semibold text-[#1A202C]">Rooms on this plan</Text>
          <Text className="mt-1 text-sm leading-5 text-[#718096]">
            {geometry.rooms.length > 0
              ? `${geometry.rooms.length} room${geometry.rooms.length === 1 ? '' : 's'} · ${geometry.bounds.width.toFixed(1)} × ${geometry.bounds.height.toFixed(1)} m footprint`
              : 'Capture a room with RoomPlan, or add a rectangular room manually to start the plan.'}
          </Text>
        </View>
        <Pressable
          className="rounded-full bg-[#EAF1FF] px-3 py-2"
          onPress={() => setIsOpen((current) => !current)}
        >
          <Ionicons name={isOpen ? 'close' : 'add'} size={16} color="#0D47A1" />
        </Pressable>
      </View>

      {geometry.rooms.map((room) => (
        <View key={room.id} className="mt-3 flex-row items-center justify-between rounded-2xl bg-[#F8FAFC] px-3 py-2">
          <View className="flex-1 pr-3">
            <Text className="text-sm font-semibold text-[#1A202C]">{room.name}</Text>
            <Text className="text-xs text-[#718096]">
              {room.areaSquareMeters.toFixed(1)} m² · {room.walls.length} walls
            </Text>
          </View>
          <Pressable onPress={() => onRemoveRoom(room.id)} accessibilityLabel={`Remove ${room.name}`}>
            <Ionicons name="trash-outline" size={16} color="#DC2626" />
          </Pressable>
        </View>
      ))}

      {isOpen ? (
        <View className="mt-4 rounded-2xl border border-[#E0E6ED] p-3">
          <Text className="text-xs font-semibold uppercase tracking-[0.8px] text-[#64748B]">Name</Text>
          <TextInput
            className="mt-2 rounded-xl border border-[#E0E6ED] px-3 py-2 text-sm text-[#1A202C]"
            value={name}
            onChangeText={setName}
            placeholder="Room name"
            placeholderTextColor="#94A3B8"
          />

          <View className="mt-3 flex-row gap-2">
            {[
              { label: 'Width (m)', value: width, setter: setWidth },
              { label: 'Depth (m)', value: depth, setter: setDepth },
              { label: 'Height (m)', value: height, setter: setHeight },
            ].map((field) => (
              <View key={field.label} className="flex-1">
                <Text className="text-xs text-[#718096]">{field.label}</Text>
                <TextInput
                  className="mt-1 rounded-xl border border-[#E0E6ED] px-3 py-2 text-sm text-[#1A202C]"
                  value={field.value}
                  onChangeText={field.setter}
                  keyboardType={NUMBER_PAD}
                />
              </View>
            ))}
          </View>

          <Pressable className="mt-3 rounded-xl bg-[#0D47A1] px-4 py-3" onPress={submit}>
            <Text className="text-center text-sm font-semibold text-white">Add room to plan</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
