import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import type {
  FireAlarmDeviceType,
  FireAlarmScanSession,
  Plan3DMounting,
  Plan3DVertex,
} from '@/modules/fire-alarm-roomplan';

import DeviceTypePicker from './DeviceTypePicker';
import Plan3DPlacementView from './Plan3DPlacementView';
import type { ManualDevicePlacement } from './review-types';

export interface DevicePlacementResult {
  type: FireAlarmDeviceType;
  placement: ManualDevicePlacement;
  notes: string;
}

interface DevicePlacementModalProps {
  session: FireAlarmScanSession;
  mode: 'create' | 'adjust';
  initialPlacement?: ManualDevicePlacement | null;
  initialType?: FireAlarmDeviceType;
  initialNotes?: string;
  onCancel: () => void;
  onSubmit: (result: DevicePlacementResult) => void;
}

type Step = 'place' | 'type';

const HORIZONTAL_PADDING = 16;
const MAX_CANVAS_WIDTH = 560;
const MIN_CANVAS_HEIGHT = 240;

const MOUNTING_LABELS: Record<Plan3DMounting, string> = {
  floor: 'Floor',
  wall: 'Wall',
  ceiling: 'Ceiling',
  unknown: 'Unplaced',
};

function canvasSize(windowWidth: number, windowHeight: number) {
  const width = Math.min(windowWidth - HORIZONTAL_PADDING * 2, MAX_CANVAS_WIDTH);
  const height = Math.max(
    MIN_CANVAS_HEIGHT,
    Math.round(Math.min(windowHeight * 0.46, width * 1.05)),
  );

  return { width, height };
}

function StepPill({ active, label, index }: { active: boolean; label: string; index: number }) {
  return (
    <View
      className={`flex-row items-center rounded-full px-3 py-1 ${
        active ? 'bg-[#0D47A1]' : 'bg-[#E2E8F0]'
      }`}
    >
      <Text className={`text-[11px] font-semibold ${active ? 'text-white' : 'text-[#64748B]'}`}>
        {index}. {label}
      </Text>
    </View>
  );
}

/**
 * Two-step manual device entry: place a cross on the 3D view, then say what the device is.
 *
 * Mount it only while it is open - the state below is the draft being edited, so a fresh mount per
 * open is what keeps an abandoned draft from leaking into the next device.
 */
export default function DevicePlacementModal({
  session,
  mode,
  initialPlacement = null,
  initialType = 'unknown',
  initialNotes = '',
  onCancel,
  onSubmit,
}: DevicePlacementModalProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [step, setStep] = useState<Step>('place');
  const [placement, setPlacement] = useState<ManualDevicePlacement | null>(initialPlacement);
  // The cross is drawn on the surface hit, not on the stored position, so it sits exactly under
  // the spot that was tapped while the device itself keeps its stand-off from the face.
  const [surfacePoint, setSurfacePoint] = useState<Plan3DVertex | null>(
    initialPlacement ? { ...initialPlacement.position } : null,
  );
  const [type, setType] = useState<FireAlarmDeviceType>(initialType);
  const [notes, setNotes] = useState(initialNotes);
  const [missed, setMissed] = useState(false);

  const canvas = useMemo(() => canvasSize(windowWidth, windowHeight), [windowHeight, windowWidth]);

  const title = mode === 'create' ? 'Add device on plan' : 'Move device on plan';

  const handleSubmit = () => {
    if (!placement) {
      return;
    }

    onSubmit({ type, placement, notes: notes.trim() });
  };

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onCancel}>
      <SafeAreaView className="flex-1 bg-[#F5F7FA]" edges={['top', 'bottom']}>
        <View className="flex-row items-center border-b border-[#E0E6ED] bg-white px-4 py-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close without saving"
            onPress={onCancel}
            hitSlop={8}
            className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-[#F1F5F9]"
          >
            <Ionicons name="close" size={18} color="#1A202C" />
          </Pressable>

          <View className="flex-1">
            <Text className="text-base font-bold text-[#1A202C]">{title}</Text>
            <View className="mt-1 flex-row gap-2">
              <StepPill index={1} label="Place" active={step === 'place'} />
              <StepPill index={2} label="Type" active={step === 'type'} />
            </View>
          </View>
        </View>

        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={{ padding: HORIZONTAL_PADDING, paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
          >
            {step === 'place' ? (
              <View>
                <Plan3DPlacementView
                  session={session}
                  width={canvas.width}
                  height={canvas.height}
                  position={surfacePoint}
                  onPick={(picked) => {
                    setMissed(false);
                    setSurfacePoint(picked.surfacePoint);
                    setPlacement({
                      position: picked.position,
                      mounting: picked.mounting,
                      roomId: picked.roomId,
                      roomName: picked.roomName,
                      surfaceId: picked.surfaceId,
                    });
                  }}
                  onMiss={() => setMissed(true)}
                />

                <View className="mt-3 rounded-2xl border border-[#E0E6ED] bg-white p-4">
                  {placement ? (
                    <View>
                      <View className="flex-row items-center">
                        <Ionicons name="locate" size={16} color="#F97316" />
                        <Text className="ml-2 text-sm font-semibold text-[#1A202C]">
                          {MOUNTING_LABELS[placement.mounting]}
                          {placement.roomName ? ` · ${placement.roomName}` : ''}
                        </Text>
                      </View>
                      <Text className="mt-1 text-xs text-[#718096]">
                        {placement.position.z.toFixed(2)} m above the floor · position{' '}
                        {placement.position.x.toFixed(2)}, {placement.position.y.toFixed(2)}
                      </Text>
                      <Text className="mt-1 text-xs text-[#718096]">
                        Tap somewhere else to move the cross.
                      </Text>
                    </View>
                  ) : (
                    <View className="flex-row items-start">
                      <Ionicons name="hand-left-outline" size={16} color="#64748B" />
                      <Text className="ml-2 flex-1 text-sm leading-5 text-[#475569]">
                        Rotate the room until you can see the mounting surface, then tap it to drop
                        the cross. Pinch with two fingers to zoom in on an awkward corner.
                      </Text>
                    </View>
                  )}

                  {missed ? (
                    <Text className="mt-2 text-xs font-medium text-[#B91C1C]">
                      That tap missed the room. Tap the floor, an inside wall face or a ceiling.
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : (
              <DeviceTypePicker
                type={type}
                notes={notes}
                onTypeChange={setType}
                onNotesChange={setNotes}
              />
            )}
          </ScrollView>

          <View className="flex-row gap-3 border-t border-[#E0E6ED] bg-white px-4 py-3">
            {step === 'type' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to placing the cross"
                onPress={() => setStep('place')}
                className="flex-row items-center justify-center rounded-xl border border-[#CBD5E1] bg-white px-5 py-4"
              >
                <Ionicons name="chevron-back" size={16} color="#334155" />
                <Text className="ml-1 text-sm font-semibold text-[#334155]">Back</Text>
              </Pressable>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !placement }}
              disabled={!placement}
              onPress={() => {
                if (step === 'place') {
                  setStep('type');
                  return;
                }

                handleSubmit();
              }}
              className={`flex-1 items-center justify-center rounded-xl px-4 py-4 ${
                placement ? 'bg-[#0D47A1]' : 'bg-[#CBD5E1]'
              }`}
            >
              <Text className="text-sm font-semibold text-white">
                {step === 'place' ? 'Continue' : mode === 'create' ? 'Add device' : 'Save device'}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
