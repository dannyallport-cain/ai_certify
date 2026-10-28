import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/theme/useTheme';

export interface WizardStepCardProps {
  /** 1-based position, shown in the badge. */
  index: number;
  title: string;
  detail: string;
  done: boolean;
  locked: boolean;
  actionLabel?: string;
  onPress?: () => void;
}

/**
 * One certificate step. The badge states the step number until the step is
 * done, at which point it becomes a tick, so progress is readable by scanning
 * the badges alone.
 */
export function WizardStepCard({
  index,
  title,
  detail,
  done,
  locked,
  actionLabel,
  onPress,
}: WizardStepCardProps) {
  const { palette } = useTheme();

  const badgeBackground = done ? palette.successSoft : locked ? palette.surfaceAlt : palette.brandSoft;
  const badgeInk = done ? palette.success : locked ? palette.inkSoft : palette.brand;
  const titleInk = locked ? palette.inkSoft : palette.ink;
  const detailInk = locked ? palette.inkSoft : palette.inkMuted;

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 12,
        backgroundColor: locked ? palette.surfaceAlt : palette.surface,
        borderWidth: 1,
        borderColor: palette.line,
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        opacity: locked ? 0.85 : 1,
      }}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 15,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: badgeBackground,
        }}
      >
        {done ? (
          <Ionicons name="checkmark" size={16} color={badgeInk} />
        ) : locked ? (
          <Ionicons name="lock-closed" size={13} color={badgeInk} />
        ) : (
          <AppText variant="label" style={{ color: badgeInk }}>
            {String(index)}
          </AppText>
        )}
      </View>

      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong" style={{ color: titleInk }}>
          {title}
        </AppText>
        <AppText variant="caption" style={{ color: detailInk, marginTop: 3 }}>
          {detail}
        </AppText>

        {actionLabel && onPress ? (
          <View style={{ marginTop: 10, alignSelf: 'flex-start' }}>
            <Button
              label={actionLabel}
              onPress={onPress}
              size="small"
              variant={locked ? 'outline' : 'soft'}
              disabled={locked}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default WizardStepCard;
