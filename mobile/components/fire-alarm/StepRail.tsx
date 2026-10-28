import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  FIRE_ALARM_STEPS,
  type FireAlarmStep,
  type FireAlarmStepId,
} from '@/modules/fire-alarm-flow/steps';
import { useTheme } from '@/theme/useTheme';
import { accentTokens } from '@/theme/accents';
import { AppText } from '@/components/ui/AppText';

export interface StepRailProps {
  currentStep: FireAlarmStepId;
  isComplete: (step: FireAlarmStepId) => boolean;
  onSelect: (step: FireAlarmStep) => void;
}

type StepStatus = 'complete' | 'current' | 'locked' | 'available';

const CIRCLE_SIZE = 30;

/**
 * The whole workflow in one glance: five colour-coded steps in order, with the
 * finished ones ticked and the current one ringed. Steps can be tapped to move
 * back, or one ahead — never further, so the sequence still leads.
 */
export function StepRail({ currentStep, isComplete, onSelect }: StepRailProps) {
  const { palette } = useTheme();

  const currentIndex = FIRE_ALARM_STEPS.findIndex((step) => step.id === currentStep);

  return (
    <View
      style={{
        backgroundColor: palette.surface,
        borderBottomWidth: 1,
        borderBottomColor: palette.line,
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 8,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        {FIRE_ALARM_STEPS.map((step, index) => {
          const status = resolveStatus(index, currentIndex, isComplete(step.id));
          const isLast = index === FIRE_ALARM_STEPS.length - 1;

          return (
            <View key={step.id} style={{ flex: 1, alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' }}>
                <Connector visible={index > 0} filled={index <= currentIndex} />

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Step ${step.number}: ${step.title}`}
                  accessibilityState={{ selected: status === 'current', disabled: status === 'locked' }}
                  disabled={status === 'locked'}
                  hitSlop={8}
                  onPress={() => onSelect(step)}
                  style={{ opacity: status === 'locked' ? 0.45 : 1 }}
                >
                  <StepCircle step={step} status={status} />
                </Pressable>

                <Connector visible={!isLast} filled={index < currentIndex} />
              </View>

              <AppText
                variant="caption"
                numberOfLines={1}
                style={{
                  marginTop: 5,
                  color: status === 'locked' ? palette.inkSoft : accentTokens(step.accent, 'light').solid,
                  opacity: status === 'locked' ? 0.7 : 1,
                }}
              >
                {step.shortLabel}
              </AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function StepCircle({ step, status }: { step: FireAlarmStep; status: StepStatus }) {
  const { palette, scheme } = useTheme();
  const tokens = accentTokens(step.accent, scheme);

  if (status === 'complete') {
    return (
      <View
        style={{
          width: CIRCLE_SIZE,
          height: CIRCLE_SIZE,
          borderRadius: CIRCLE_SIZE / 2,
          backgroundColor: tokens.solid,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="checkmark" size={17} color="#FFFFFF" />
      </View>
    );
  }

  if (status === 'current') {
    return (
      <View
        style={{
          width: CIRCLE_SIZE,
          height: CIRCLE_SIZE,
          borderRadius: CIRCLE_SIZE / 2,
          backgroundColor: tokens.solid,
          borderWidth: 3,
          borderColor: tokens.soft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppText variant="caption" style={{ color: '#FFFFFF', fontWeight: '700' }}>
          {step.number}
        </AppText>
      </View>
    );
  }

  if (status === 'available') {
    return (
      <View
        style={{
          width: CIRCLE_SIZE,
          height: CIRCLE_SIZE,
          borderRadius: CIRCLE_SIZE / 2,
          backgroundColor: tokens.soft,
          borderWidth: 1.5,
          borderColor: tokens.line,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppText variant="caption" style={{ color: tokens.ink }}>
          {step.number}
        </AppText>
      </View>
    );
  }

  return (
    <View
      style={{
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        borderRadius: CIRCLE_SIZE / 2,
        backgroundColor: palette.surfaceAlt,
        borderWidth: 1.5,
        borderColor: palette.line,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AppText variant="caption" tone="soft">
        {step.number}
      </AppText>
    </View>
  );
}

function Connector({ visible, filled }: { visible: boolean; filled: boolean }) {
  const { palette } = useTheme();

  if (!visible) {
    return <View style={{ flex: 1 }} />;
  }

  return (
    <View
      style={{
        flex: 1,
        height: 3,
        borderRadius: 2,
        backgroundColor: filled ? palette.brand : palette.line,
      }}
    />
  );
}

function resolveStatus(index: number, currentIndex: number, complete: boolean): StepStatus {
  if (index === currentIndex) {
    return 'current';
  }

  if (complete) {
    return 'complete';
  }

  return index <= currentIndex + 1 ? 'available' : 'locked';
}

export default StepRail;
