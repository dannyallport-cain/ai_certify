import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/ui/AppText';
import { accentTokens, type FlowAccent } from '@/theme/accents';
import { useTheme } from '@/theme/useTheme';

export type WizardRailStep = {
  key: string;
  done: boolean;
  locked: boolean;
};

interface WizardProgressRailProps {
  steps: WizardRailStep[];
}

const PHASE_ACCENTS: FlowAccent[] = ['sky', 'indigo', 'violet', 'amber', 'teal', 'emerald'];

/**
 * Ordered, colour coded overview of the certificate workflow. Each dot is one
 * step in the order it must be completed; the colour groups the steps into
 * phases so position in the flow is readable at a glance.
 */
export default function WizardProgressRail({ steps }: WizardProgressRailProps) {
  const { palette, scheme } = useTheme();
  const completed = steps.filter((step) => step.done).length;
  const total = steps.length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <View
      style={{
        backgroundColor: palette.surface,
        borderWidth: 1,
        borderColor: palette.line,
        borderRadius: 16,
        padding: 14,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <AppText variant="bodyStrong" style={{ flex: 1 }}>
          {`${completed} of ${total} complete`}
        </AppText>
        <AppText variant="caption" tone="muted">
          {`${percent}%`}
        </AppText>
      </View>

      <View
        style={{
          height: 6,
          borderRadius: 3,
          backgroundColor: palette.surfaceAlt,
          overflow: 'hidden',
        }}
      >
        <View style={{ width: `${percent}%`, height: '100%', backgroundColor: palette.brand }} />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {steps.map((step, index) => {
          const accentKey =
            PHASE_ACCENTS[Math.floor((index / Math.max(total, 1)) * PHASE_ACCENTS.length)];
          const accent = accentTokens(accentKey, scheme);
          const state = step.done ? 'done' : step.locked ? 'locked' : 'next';

          const background =
            state === 'done'
              ? palette.success
              : state === 'locked'
                ? palette.surfaceAlt
                : accent.solid;
          const contentColor =
            state === 'locked' ? palette.inkSoft : state === 'done' ? palette.onSolid : '#FFFFFF';

          return (
            <View
              key={step.key}
              accessibilityLabel={`Step ${index + 1}, ${state}`}
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: background,
              }}
            >
              {state === 'done' ? (
                <Ionicons name="checkmark" size={12} color={contentColor} />
              ) : (
                <AppText variant="caption" style={{ color: contentColor, fontWeight: '700' }}>
                  {index + 1}
                </AppText>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
