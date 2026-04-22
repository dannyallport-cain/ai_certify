import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HeaderBackButton, HeaderForwardButton, useTrackCurrentRoute } from '@/components/navigation/StackHeaderNav';

type TabBarIconProps = {
  color: string;
  size: number;
};

export default function TabsLayout() {
  useTrackCurrentRoute();

  return (
    <Tabs
      screenOptions={({ navigation, route }) => ({
        headerStyle: {
          backgroundColor: '#FAFBFC',
        },
        headerShadowVisible: false,
        headerTintColor: '#1A202C',
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '700',
          color: '#1A202C',
        },
        headerLeft: () => <HeaderBackButton navigation={navigation} />,
        headerRight: () => {
          if (route.name === 'index') {
            return <HeaderForwardButton fallbackHref="/(tabs)/wizard" />;
          }

          if (route.name === 'location') {
            return <HeaderForwardButton fallbackHref="/(tabs)/customer" />;
          }

          if (route.name === 'customer') {
            return <HeaderForwardButton fallbackHref="/(tabs)/review" />;
          }

          if (route.name === 'review') {
            return <HeaderForwardButton fallbackHref="/(tabs)/success" />;
          }

          return null;
        },
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
