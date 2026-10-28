import '../global.css';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Stack, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JobStateProvider } from '@/components/JobStateContext';
import { AppNavigationProvider } from '@/components/navigation/AppNavigationContext';
import AppHeader from '@/components/navigation/AppHeader';
import { DrawerProvider } from '@/components/navigation/DrawerProvider';
import { FireAlarmFlowProvider } from '@/components/fire-alarm/FireAlarmFlowProvider';
import { AuthLockProvider } from '@/components/auth/AuthLockProvider';
import { UnlockScreen } from '@/components/auth/UnlockScreen';
import { useAuthLock } from '@/components/auth/useAuthLock';
import { AppErrorBoundary } from '@/components/errors/AppErrorBoundary';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { useTheme } from '@/theme/useTheme';

const queryClient = new QueryClient();

const LOGIN_PATH = '/login';

/**
 * Keeps the visible route in step with the session state. The lock screen and
 * the app itself are rendered by AppShell rather than as routes so that a
 * backgrounded session can be re-locked without losing screen state.
 */
function AuthRouteSync() {
  const { status } = useAuthLock();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'checking') {
      return;
    }

    const isOnLogin = pathname === LOGIN_PATH || pathname.endsWith(LOGIN_PATH);

    if (status === 'signed-out' || status === 'password') {
      if (!isOnLogin) {
        router.replace('/(auth)/login');
      }
      return;
    }

    if (status === 'unlocked' && isOnLogin) {
      router.replace('/(tabs)');
    }
  }, [status, pathname]);

  return null;
}

function BootSplash() {
  const { palette } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: palette.canvas,
      }}
    >
      <Text style={{ fontSize: 26, fontWeight: '800', color: palette.ink }}>AI Certify</Text>
      <Text style={{ marginTop: 6, fontSize: 14, color: palette.inkMuted }}>
        Field inspection app
      </Text>
      <ActivityIndicator style={{ marginTop: 28 }} color={palette.brand} />
    </View>
  );
}

function AppShell() {
  const { status } = useAuthLock();
  const { palette, scheme } = useTheme();

  if (status === 'checking') {
    return <BootSplash />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <AuthRouteSync />
      <Stack
        screenOptions={{
          headerShown: true,
          // One header for the whole app: menu, optional back, title. Rendered
          // by the navigator so it stays pinned while a screen scrolls.
          header: (props) => <AppHeader {...props} />,
          contentStyle: { backgroundColor: palette.canvas },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />

        <Stack.Screen name="fire-alarm/scan" options={{ title: 'Fire alarm' }} />
        <Stack.Screen name="fire-alarm/identify" options={{ title: 'Fire alarm' }} />
        <Stack.Screen name="fire-alarm/review" options={{ title: 'Fire alarm' }} />
        <Stack.Screen name="fire-alarm/plan" options={{ title: 'Fire alarm' }} />
        <Stack.Screen name="fire-alarm/export" options={{ title: 'Fire alarm' }} />
        <Stack.Screen name="fire-alarm-surveys" options={{ title: 'Saved surveys' }} />

        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="account" options={{ title: 'Account' }} />
        <Stack.Screen name="certificates" options={{ title: 'Certificates' }} />

        <Stack.Screen name="room-plan/review" options={{ title: 'Review session' }} />
        <Stack.Screen name="room-plan/plan" options={{ title: '3D plan' }} />
        <Stack.Screen name="room-plan/export" options={{ title: 'Export' }} />
        <Stack.Screen name="room-plan/session/[id]" options={{ title: 'Session details' }} />
      </Stack>
      {status === 'locked' ? <UnlockScreen /> : null}
    </View>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <JobStateProvider>
          <AppNavigationProvider>
            <AppErrorBoundary>
              <AuthLockProvider>
                <DrawerProvider>
                  <FireAlarmFlowProvider>
                    <AppShell />
                  </FireAlarmFlowProvider>
                </DrawerProvider>
              </AuthLockProvider>
            </AppErrorBoundary>
          </AppNavigationProvider>
        </JobStateProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
