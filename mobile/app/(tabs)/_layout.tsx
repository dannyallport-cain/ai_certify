import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTrackCurrentRoute } from '@/components/navigation/StackHeaderNav';
import AppHeader from '@/components/navigation/AppHeader';

type TabBarIconProps = {
  color: string;
  size: number;
};

/** Where each wizard step's forward chevron leads when there is no forward history. */
const FORWARD_FALLBACKS: Record<string, string | undefined> = {
  index: '/(tabs)/wizard',
  location: '/(tabs)/customer',
  customer: '/(tabs)/review',
  review: '/(tabs)/success',
};

export default function TabsLayout() {
  useTrackCurrentRoute();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        // The same header every pushed screen uses, so the mark and the back control never move.
        header: (props) => (
          <AppHeader {...props} forwardHref={FORWARD_FALLBACKS[route.name]} />
        ),
        sceneStyle: {
          backgroundColor: '#F5F7FA',
        },
        tabBarActiveTintColor: '#0D47A1',
        tabBarInactiveTintColor: '#A0AEC0',
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 16,
          height: 74,
          paddingTop: 10,
          paddingBottom: 10,
          borderTopWidth: 0,
          borderRadius: 24,
          backgroundColor: '#FFFFFF',
          shadowColor: '#4b3425',
          shadowOpacity: 0.1,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      })}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
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
            <Ionicons name="flame-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          href: null,
          title: 'Capture Evidence',
        }}
      />
      <Tabs.Screen
        name="room-plan"
        options={{
          href: null,
          title: 'Fire Alarm Plan',
        }}
      />
      <Tabs.Screen
        name="location"
        options={{
          href: null,
          title: 'Confirm Address',
        }}
      />
      <Tabs.Screen
        name="customer"
        options={{
          href: null,
          title: 'Customer',
        }}
      />
      <Tabs.Screen
        name="review"
        options={{
          href: null,
          title: 'Review',
        }}
      />
      <Tabs.Screen
        name="wizard"
        options={{
          href: null,
          title: 'Certificate Wizard',
        }}
      />
      <Tabs.Screen
        name="success"
        options={{
          href: null, // hidden from tab bar — navigated to programmatically
          title: 'Completed',
        }}
      />
    </Tabs>
  );
}
