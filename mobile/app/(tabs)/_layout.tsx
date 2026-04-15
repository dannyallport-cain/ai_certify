import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type TabBarIconProps = {
  color: string;
  size: number;
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: '#f6f1eb',
        },
        headerShadowVisible: false,
        headerTintColor: '#1f2937',
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '700',
          color: '#1f2937',
        },
        sceneStyle: {
          backgroundColor: '#f8f5f1',
        },
        tabBarActiveTintColor: '#7c5a45',
        tabBarInactiveTintColor: '#9b8d82',
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
          backgroundColor: '#fffdf9',
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
      }}
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
        }}
      />
      <Tabs.Screen
        name="room-plan"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="location"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="customer"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="review"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="wizard"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="success"
        options={{
          href: null, // hidden from tab bar — navigated to programmatically
        }}
      />
    </Tabs>
  );
}
