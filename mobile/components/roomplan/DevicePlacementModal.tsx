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

import {
  getDefaultMounting,
  getMountingDescription,
  getMountingOptions,
  getPlan3DDeviceStyle,
  isCeilingVoidMounting,
  type FireAlarmDeviceType,
  type FireAlarmScanSession,
  type Plan3DMounting,
  type Plan3DVertex,
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

type Step = 'type' | 'mount';

const HORIZONTAL_PADDING = 16;
const MAX_CANVAS_WIDTH = 560;
const MIN_CANVAS_HEIGHT = 240;

function canvasSize(windowWidth: number, windowHeight: number) {
  const width = Math.min(windowWidth - HORIZONTAL_PADDING * 2, MAX_CANVAS_WIDTH);
  const height = Math.max(
    MIN_CANVAS_HEIGHT,
    Math.round(Math.min(windowHeight * 0.42, width * 1.0)),
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
 * Manual device entry, in the order an inspector actually works: say what the device is, answer
 * where it is fixed, then tap the plan. The mounting answer is what makes the placement reliable —
 * a detector is asked for as a ceiling device, which puts the view in plan and stops the tap from
 * landing on the floor instead.
 *
 * Mount it only while it is open: the state below is the draft being edited, so a fresh mount per
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
  const [step, setStep] = useState<Step>('type');
  const [type, setType] = useState<FireAlarmDeviceType>(initialType);
  const [mounting, setMounting] = useState<Plan3DMounting>(
    initialPlacement?.mounting ?? getDefaultMounting(initialType),
  );
  const [placement, setPlacement] = useState<ManualDevicePlacement | null>(initialPlacement);
  // The cross is drawn on the surface hit, not on the stored position, so it sits exactly under
  // the spot that was tapped while the device itself keeps its stand-off from the face.
  const [surfacePoint, setSurfacePoint] = useState<Plan3DVertex | null>(
    initialPlacement ? { ...initialPlacement.position } : null,
  );
  const [notes, setNotes] = useState(initialNotes);
  const [missed, setMissed] = useState(false);

  const canvas = useMemo(() => canvasSize(windowWidth, windowHeight), [windowHeight, windowWidth]);
  const mountingOptions = useMemo(() => getMountingOptions(type), [type]);
  const typeLabel = getPlan3DDeviceStyle(type).label;

  const title = mode === 'create' ? 'Add device on plan' : 'Move device on plan';

  const handleChooseMounting = (next: Plan3DMounting) => {
    if (next === mounting) {
      return;
    }

    // The stored position belongs to the previous surface, so it is dropped rather than dragged
    // across to a surface the device is no longer mounted to.
    setMounting(next);
    setPlacement(null);
    setSurfacePoint(null);
    setMissed(false);
  };

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
              <StepPill index={1} label="Type" active={step === 'type'} />
              <StepPill index={2} label="Fix" active={step === 'mount'} />
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
            {step === 'type' ? (
              <DeviceTypePicker
                type={type}
                notes={notes}
                onTypeChange={(next) => {
                  setType(next);

                  // Keep the mounting valid for the new type. A panel has no ceiling option, so a
                  // mounting inherited from a detector must not survive the change.
                  const allowed = getMountingOptions(next).map((option) => option.mounting);

                  if (!allowed.includes(mounting)) {
                    setMounting(getDefaultMounting(next));
                    setPlacement(null);
                    setSurfacePoint(null);
                  }
                }}
                onNotesChange={setNotes}
              />
            ) : (
              <View>
                <View className="rounded-2xl border border-[#E0E6ED] bg-white p-4">
                  <Text className="text-sm font-semibold text-[#1A202C]">
                    How is this {typeLabel.toLowerCase()} fixed?
                  </Text>
                  <Text className="mt-1 text-xs text-[#718096]">
                    This decides which surface the plan lets you tap.
                  </Text>

                  <View className="mt-3 gap-2">
                    {mountingOptions.map((option) => {
                      const selected = option.mounting === mounting;

                      return (
                        <Pressable
                          key={option.mounting}
                          accessibilityRole="radio"
                          accessibilityState={{ selected }}
                          accessibilityLabel={option.label}
                          onPress={() => handleChooseMounting(option.mounting)}
                          className={`flex-row items-center rounded-xl border px-3 py-3 ${
                            selected
                              ? 'border-[#0D47A1] bg-[#E8F0FE]'
                              : 'border-[#E0E6ED] bg-white'
                          }`}
                        >
                          <Ionicons
                            name={selected ? 'radio-button-on' : 'radio-button-off'}
                            size={18}
                            color={selected ? '#0D47A1' : '#94A3B8'}
                          />
                          <View className="ml-3 flex-1">
                            <Text className="text-sm font-semibold text-[#1A202C]">
                              {option.label}
                            </Text>
                            <Text className="text-[11px] text-[#718096]">
                              {option.description}
                            </Text>
                          </View>
                          {isCeilingVoidMounting(option.mounting) ? (
                            <Ionicons name="layers-outline" size={16} color="#64748B" />
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View className="mt-3">
                  <Plan3DPlacementView
                    key={mounting}
                    session={session}
                    width={canvas.width}
                    height={canvas.height}
                    mounting={mounting}
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
                </View>

                <View className="mt-3 rounded-2xl border border-[#E0E6ED] bg-white p-4">
                  {placement ? (
                    <View>
                      <View className="flex-row items-center">
                        <Ionicons name="locate" size={16} color="#F97316" />
                        <Text className="ml-2 text-sm font-semibold text-[#1A202C]">
                          {getMountingDescription(placement.mounting)}
                          {placement.roomName ? ` · ${placement.roomName}` : ''}
                        </Text>
                      </View>
                      <Text className="mt-1 text-xs text-[#718096]">
                        {placement.position.z.toFixed(2)} m above the floor ·{' '}
                        {placement.position.x.toFixed(2)}, {placement.position.y.toFixed(2)}
                      </Text>
                      <Text className="mt-1 text-xs text-[#718096]">
                        Tap somewhere else on the plan to move it.
                      </Text>
                    </View>
                  ) : (
                    <View className="flex-row items-start">
                      <Ionicons name="hand-left-outline" size={16} color="#64748B" />
                      <Text className="ml-2 flex-1 text-sm leading-5 text-[#475569]">
                        {getMountingDescription(mounting)}. Tap the plan where the device sits —
                        drag to spin the room, pinch to zoom.
                      </Text>
                    </View>
                  )}

                  {missed ? (
                    <Text className="mt-2 text-xs font-medium text-[#B91C1C]">
                      That tap missed the room. Aim inside the room outline.
                    </Text>
                  ) : null}
                </View>
              </View>
            )}
          </ScrollView>

          <View className="flex-row gap-3 border-t border-[#E0E6ED] bg-white px-4 py-3">
            {step === 'mount' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to choosing the device type"
                onPress={() => setStep('type')}
                className="flex-row items-center justify-center rounded-xl border border-[#CBD5E1] bg-white px-5 py-4"
              >
                <Ionicons name="chevron-back" size={16} color="#334155" />
                <Text className="ml-1 text-sm font-semibold text-[#334155]">Back</Text>
              </Pressable>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: step === 'mount' && !placement }}
              disabled={step === 'mount' && !placement}
              onPress={() => {
                if (step === 'type') {
                  setStep('mount');
                  return;
                }

                handleSubmit();
              }}
              className={`flex-1 items-center justify-center rounded-xl px-4 py-4 ${
                step === 'type' || placement ? 'bg-[#0D47A1]' : 'bg-[#CBD5E1]'
              }`}
            >
              <Text className="text-sm font-semibold text-white">
                {step === 'type' ? 'Continue' : mode === 'create' ? 'Add device' : 'Save device'}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
