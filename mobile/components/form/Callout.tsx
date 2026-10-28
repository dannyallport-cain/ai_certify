import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/theme/useTheme';

export type CalloutTone = 'info' | 'success' | 'warning' | 'danger';

export interface CalloutProps {
  tone?: CalloutTone;
  title?: string;
  children: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Inset panel look for a callout nested inside a card. */
  inset?: boolean;
}

const DEFAULT_ICONS: Record<CalloutTone, keyof typeof Ionicons.glyphMap> = {
  info: 'information-circle',
  success: 'checkmark-circle',
  warning: 'alert-circle',
  danger: 'close-circle',
};

/**
 * Explanatory panel for skipped branches, guidance text and validation state.
 * Tone maps onto the shared soft/solid colour pair, so it never falls back to a
 * hard-coded light background in dark mode.
 */
export function Callout({ tone = 'info', title, children, icon, inset = false }: CalloutProps) {
  const { palette } = useTheme();
  const { background, foreground } = resolveTone(tone, palette);

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 10,
        backgroundColor: background,
        borderRadius: inset ? 12 : 16,
        borderWidth: 1,
        borderColor: foreground,
        borderStyle: 'solid',
        padding: 12,
        marginBottom: inset ? 0 : 14,
      }}
    >
      <Ionicons name={icon ?? DEFAULT_ICONS[tone]} size={17} color={foreground} style={{ marginTop: 1 }} />

      <View style={{ flex: 1 }}>
        {title ? (
          <AppText variant="bodyStrong" style={{ color: foreground, marginBottom: 3 }}>
            {title}
          </AppText>
        ) : null}

        <AppText variant="body" style={{ color: foreground }}>
          {children}
        </AppText>
      </View>
    </View>
  );
}

function resolveTone(
  tone: CalloutTone,
  palette: ReturnType<typeof useTheme>['palette'],
): { background: string; foreground: string } {
  switch (tone) {
    case 'success':
      return { background: palette.successSoft, foreground: palette.success };
    case 'warning':
      return { background: palette.warningSoft, foreground: palette.warning };
    case 'danger':
      return { background: palette.dangerSoft, foreground: palette.danger };
    case 'info':
    default:
      return { background: palette.infoSoft, foreground: palette.info };
  }
}

export default Callout;
