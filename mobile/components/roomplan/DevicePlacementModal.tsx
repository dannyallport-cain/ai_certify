import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
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
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { accentTokens } from '@/theme/accents';
import { useTheme } from '@/theme/useTheme';

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

/**
 * Manual device entry, in the order an inspector actually works: say what the
 * device is, answer where it is fixed, then tap the plan.
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
  const { palette, scheme } = useTheme();
  const violet = accentTokens('violet', scheme);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [step, setStep] = useState<Step>('type');
  const [type, setType] = useState<FireAlarmDeviceType>(initialType);
  const [mounting, setMounting] = useState<Plan3DMounting>(
    initialPlacement?.mounting ?? getDefaultMounting(initialType),
  );
  const [placement, setPlacement] = useState<ManualDevicePlacement | null>(initialPlacement);
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
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.canvas }} edges={['top', 'bottom']}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            borderBottomWidth: 1,
            borderBottomColor: palette.line,
            backgroundColor: palette.surface,
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close without saving"
            onPress={onCancel}
            hitSlop={8}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: palette.surfaceAlt,
            }}
          >
            <Ionicons name="close" size={18} color={palette.ink} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <AppText variant="heading">{title}</AppText>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <StepPill index={1} label="Type" active={step === 'type'} />
              <StepPill index={2} label="Fix" active={step === 'mount'} />
            </View>
          </View>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
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
                <View style={{ gap: 10 }}>
                  <AppText variant="subheading">
                    {`How is this ${typeLabel.toLowerCase()} fixed?`}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    This decides which surface the plan lets you tap.
                  </AppText>

                  {mountingOptions.map((option) => {
                    const selected = option.mounting === mounting;

                    return (
                      <Pressable
                        key={option.mounting}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        accessibilityLabel={option.label}
                        onPress={() => handleChooseMounting(option.mounting)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                          borderRadius: 12,
                          borderWidth: 1.5,
                          borderColor: selected ? violet.solid : palette.line,
                          backgroundColor: selected ? violet.soft : palette.surface,
                          paddingVertical: 10,
                          paddingHorizontal: 12,
                        }}
                      >
                        <Ionicons
                          name={selected ? 'radio-button-on' : 'radio-button-off'}
                          size={18}
                          color={selected ? violet.ink : palette.inkSoft}
                        />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <AppText variant="bodyStrong">{option.label}</AppText>
                          <AppText variant="caption" tone="muted">
                            {option.description}
                          </AppText>
                        </View>
                        {isCeilingVoidMounting(option.mounting) ? (
                          <Ionicons name="layers-outline" size={16} color={palette.inkMuted} />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>

                <View style={{ marginTop: 12 }}>
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

                <View
                  style={{
                    marginTop: 12,
                    borderWidth: 1,
                    borderColor: palette.line,
                    backgroundColor: palette.surface,
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  {placement ? (
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="locate" size={15} color={palette.warning} />
                        <AppText variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                          {`${getMountingDescription(placement.mounting)}${placement.roomName ? ` · ${placement.roomName}` : ''}`}
                        </AppText>
                      </View>
                      <AppText variant="caption" tone="muted" style={{ marginTop: 4 }}>
                        {`${placement.position.z.toFixed(2)} m above the floor · ${placement.position.x.toFixed(2)}, ${placement.position.y.toFixed(2)}`}
                      </AppText>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                      <Ionicons name="hand-left-outline" size={15} color={palette.inkMuted} />
                      <AppText variant="body" tone="muted" style={{ flex: 1 }}>
                        {`${getMountingDescription(mounting)}. Tap the plan where the device sits.`}
                      </AppText>
                    </View>
                  )}

                  {missed ? (
                    <AppText variant="caption" tone="danger" style={{ marginTop: 6 }}>
                      That tap missed the room — aim inside the outline.
                    </AppText>
                  ) : null}
                </View>
              </View>
            )}
          </ScrollView>

          <View
            style={{
              flexDirection: 'row',
              gap: 10,
              borderTopWidth: 1,
              borderTopColor: palette.line,
              backgroundColor: palette.surface,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            {step === 'mount' ? (
              <View style={{ flex: 1 }}>
                <Button
                  label="Back"
                  icon="chevron-back"
                  accent="violet"
                  variant="outline"
                  onPress={() => setStep('type')}
                  block
                />
              </View>
            ) : null}

            <View style={{ flex: 1.4 }}>
              <Button
                label={step === 'type' ? 'Continue' : mode === 'create' ? 'Add device' : 'Save device'}
                icon={step === 'type' ? 'arrow-forward' : 'checkmark'}
                accent="violet"
                disabled={step === 'mount' && !placement}
                onPress={() => {
                  if (step === 'type') {
                    setStep('mount');
                    return;
                  }

                  handleSubmit();
                }}
                block
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function StepPill({
  active,
  label,
  index,
}: {
  active: boolean;
  label: string;
  index: number;
}) {
  const { palette, scheme } = useTheme();
  const violet = accentTokens('violet', scheme);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 999,
        paddingHorizontal: 9,
        paddingVertical: 3,
        backgroundColor: active ? violet.solid : palette.surfaceAlt,
      }}
    >
      <AppText
        variant="caption"
        style={{ color: active ? '#FFFFFF' : palette.inkMuted, fontWeight: '700' }}
      >
        {`${index}. ${label}`}
      </AppText>
    </View>
  );
}
