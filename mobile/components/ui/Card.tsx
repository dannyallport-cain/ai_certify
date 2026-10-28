import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { AppText } from './AppText';

export interface CardProps extends ViewProps {
  children: ReactNode;
  /** Inset panel look for content nested inside another card. */
  inset?: boolean;
  padded?: boolean;
}

/** Standard raised surface: one radius, one border, one shadow in both schemes. */
export function Card({ children, inset = false, padded = true, style, ...rest }: CardProps) {
  const { palette, scheme } = useTheme();

  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: inset ? palette.surfaceAlt : palette.surface,
          borderColor: inset ? 'transparent' : palette.line,
          borderWidth: inset ? 0 : 1,
          borderRadius: inset ? 16 : 20,
          padding: padded ? 16 : 0,
          shadowColor: scheme === 'dark' ? '#000000' : '#0F172A',
          shadowOpacity: scheme === 'dark' ? 0.3 : 0.05,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: inset ? 0 : 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export interface SectionCardProps extends Omit<CardProps, 'children'> {
  title: string;
  /** One short line of context. Omit it if the title says enough. */
  hint?: string;
  /** Count or status shown on the right of the title row. */
  badge?: ReactNode;
  children?: ReactNode;
}

/** Card with a heading row — the standard container for a numbered step. */
export function SectionCard({ title, hint, badge, children, ...rest }: SectionCardProps) {
  const { palette } = useTheme();

  return (
    <Card {...rest}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <AppText variant="heading">{title}</AppText>
          {hint ? (
            <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
              {hint}
            </AppText>
          ) : null}
        </View>
        {badge}
      </View>

      {children ? (
        <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 14 }}>
          {children}
        </View>
      ) : null}
    </Card>
  );
}

export default Card;
