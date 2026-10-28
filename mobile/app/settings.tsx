import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Card, SectionCard } from '@/components/ui/Card';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { NavRow } from '@/components/ui/NavRow';
import { useTheme } from '@/theme/useTheme';
import type { ThemeMode } from '@/theme/settings-storage';
import {
  FONT_SCALE_LABELS,
  FONT_SCALE_ORDER,
  type FontScaleKey,
} from '@/theme/typography';

const APPEARANCE_OPTIONS: { value: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'system', label: 'Auto', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
];

const FONT_OPTIONS = FONT_SCALE_ORDER.map((value) => ({
  value,
  label: FONT_SCALE_LABELS[value],
}));

export default function SettingsScreen() {
  const { mode, setMode, fontScale, setFontScale, scheme } = useTheme();

  return (
    <Screen>
      <SectionCard
        title="Appearance"
        hint="Auto follows your device setting."
      >
        <SegmentedControl
          options={APPEARANCE_OPTIONS}
          value={mode}
          onChange={(nextMode) => setMode(nextMode as ThemeMode)}
        />
      </SectionCard>

      <View style={{ height: 13 }} />

      <SectionCard
        title="Text size"
        hint="Applies to every screen immediately."
      >
        <SegmentedControl
          options={FONT_OPTIONS}
          value={fontScale}
          onChange={(nextScale) => setFontScale(nextScale as FontScaleKey)}
        />

        <Card inset style={{ marginTop: 14 }}>
          <AppText variant="heading">Fire alarm plan</AppText>
          <AppText variant="body" tone="muted" style={{ marginTop: 2 }}>
            Step 3 of 5 · Review the layout
          </AppText>
          <AppText variant="body" style={{ marginTop: 10 }}>
            This paragraph previews the size you selected, so you can check it reads well
            on site before going back to work.
          </AppText>
        </Card>
      </SectionCard>

      <View style={{ height: 13 }} />

      <SectionCard title="General" padded={false}>
        <View style={{ gap: 8 }}>
          <NavRow
            icon="person-circle-outline"
            title="Account"
            subtitle="Team, plan and billing"
            accent="emerald"
            onPress={() => router.push('/account' as never)}
          />
          <NavRow
            icon="albums-outline"
            title="Certificates"
            subtitle="Saved records"
            accent="teal"
            onPress={() => router.push('/certificates' as never)}
          />
        </View>
      </SectionCard>

      <AppText
        variant="caption"
        tone="soft"
        style={{ textAlign: 'center', marginTop: 18 }}
      >
        {`Appearance: ${mode === 'system' ? `auto (${scheme})` : scheme}`}
      </AppText>
    </Screen>
  );
}
