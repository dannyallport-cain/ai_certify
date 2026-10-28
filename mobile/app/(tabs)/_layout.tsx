import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import AppHeader from '@/components/navigation/AppHeader';
import { useTheme } from '@/theme/useTheme';

type TabBarIconProps = {
  color: string;
  size: number;
};

/**
 * Three primary destinations. Everything else is reached through the menu, so
 * the bar stays readable with one thumb instead of hiding six shortcuts.
 */
export default function TabsLayout() {
  const { palette } = useTheme();

  return (
    <Tabs
      screenOptions={{
        header: (props) => <AppHeader {...props} />,
        sceneStyle: { backgroundColor: palette.canvas },
        tabBarActiveTintColor: palette.brand,
        tabBarInactiveTintColor: palette.inkSoft,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopWidth: 1,
          borderTopColor: palette.line,
          height: 62,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'AI Certify',
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="fire-alarm-diagnostics"
        options={{
          title: 'Diagnostics',
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <Ionicons name="pulse-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{ href: null, title: 'Capture evidence' }}
      />
      <Tabs.Screen
        name="room-plan"
        options={{ href: null, title: 'Fire alarm plan' }}
      />
      <Tabs.Screen
        name="location"
        options={{ href: null, title: 'Confirm address' }}
      />
      <Tabs.Screen
        name="customer"
        options={{ href: null, title: 'Customer' }}
      />
      <Tabs.Screen
        name="review"
        options={{ href: null, title: 'Review' }}
      />
      <Tabs.Screen
        name="wizard"
        options={{ href: null, title: 'Certificate wizard' }}
      />
      <Tabs.Screen
        name="certificate"
        options={{ href: null, title: 'Certificate' }}
      />
      <Tabs.Screen
        name="success"
        options={{ href: null, title: 'Completed' }}
      />
    </Tabs>
  );
}
