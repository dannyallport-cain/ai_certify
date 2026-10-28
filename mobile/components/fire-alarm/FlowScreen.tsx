import type { ReactNode } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { KeyboardAwareScreen } from '@/components/keyboard/KeyboardAwareScreen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import {
  getFireAlarmStep,
  getNextStep,
  getPreviousStep,
  type FireAlarmStep,
  type FireAlarmStepId,
} from '@/modules/fire-alarm-flow/steps';
import { useTheme } from '@/theme/useTheme';
import { accentTokens } from '@/theme/accents';
import { StepRail } from './StepRail';
import { useFireAlarmFlow } from './useFireAlarmFlow';

export interface FlowScreenProps {
  stepId: FireAlarmStepId;
  children: ReactNode;
  /** Label for the forward action. Omit to hide it. */
  nextLabel?: string;
  onNext?: () => void;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  /** Replaces the default Back/Next row. */
  footer?: ReactNode;
  /** Extra content under the step header, e.g. metrics. */
  headerExtra?: ReactNode;
  /** Off while a gesture on the content (orbit, drag) owns the touch. */
  scrollEnabled?: boolean;
}

/**
 * One step of the fire alarm workflow.
 *
 * The rail is pinned above the content so the position in the sequence never
 * scrolls out of view, and Back/Next are pinned below so the forward action is
 * in the same place on every step.
 */
export function FlowScreen({
  stepId,
  children,
  nextLabel,
  onNext,
  nextDisabled = false,
  nextLoading = false,
  footer,
  headerExtra,
  scrollEnabled = true,
}: FlowScreenProps) {
  const { palette, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { isStepComplete, markStepComplete } = useFireAlarmFlow();

  const step = getFireAlarmStep(stepId);
  const tokens = accentTokens(step.accent, scheme);
  const previousStep = getPreviousStep(stepId);
  const nextStep = getNextStep(stepId);

  const goToStep = (target: FireAlarmStep) => {
    router.push(target.route as never);
  };

  const handleNext = () => {
    markStepComplete(stepId);

    if (onNext) {
      onNext();
      return;
    }

    if (nextStep) {
      goToStep(nextStep);
    }
  };

  const defaultFooter = (
    <>
      {previousStep ? (
        <View style={{ flex: 1 }}>
          <Button
            label="Back"
            icon="chevron-back"
            variant="outline"
            accent={step.accent}
            onPress={() => goToStep(previousStep)}
            block
          />
        </View>
      ) : null}

      {nextStep || onNext ? (
        <View style={{ flex: previousStep ? 1.4 : 1 }}>
          <Button
            label={nextLabel ?? `Next: ${nextStep?.shortLabel ?? 'Finish'}`}
            icon="arrow-forward"
            accent={step.accent}
            onPress={handleNext}
            disabled={nextDisabled}
            loading={nextLoading}
            block
          />
        </View>
      ) : null}
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <StepRail currentStep={stepId} isComplete={isStepComplete} onSelect={goToStep} />

      <KeyboardAwareScreen
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        contentBottomPadding={insets.bottom + 16}
        scrollViewProps={{
          style: { backgroundColor: palette.canvas },
          scrollEnabled,
        }}
        footer={
          <View
            style={{
              backgroundColor: palette.surface,
              borderTopWidth: 1,
              borderTopColor: palette.line,
              paddingHorizontal: 16,
              paddingTop: 10,
              paddingBottom: 6,
              flexDirection: 'row',
              gap: 10,
            }}
          >
            {footer ?? defaultFooter}
          </View>
        }
      >
        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: tokens.soft,
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 5,
            }}
          >
            <Ionicons name={step.icon} size={13} color={tokens.ink} />
            <AppText variant="label" style={{ color: tokens.ink }}>
              {`STEP ${step.number} OF 5`}
            </AppText>
          </View>
        </View>

        <AppText variant="title">{step.title}</AppText>
        <AppText variant="body" tone="muted" style={{ marginTop: 2, marginBottom: 14 }}>
          {step.summary}
        </AppText>

        {headerExtra}

        {children}
      </KeyboardAwareScreen>
    </View>
  );
}

export default FlowScreen;
