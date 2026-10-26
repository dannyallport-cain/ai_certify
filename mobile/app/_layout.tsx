import '../global.css';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Stack, router, usePathname } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JobStateProvider } from '@/components/JobStateContext';
import { AppNavigationProvider } from '@/components/navigation/AppNavigationContext';
import AppHeader from '@/components/navigation/AppHeader';
import { AuthLockProvider } from '@/components/auth/AuthLockProvider';
import { UnlockScreen } from '@/components/auth/UnlockScreen';
import { useAuthLock } from '@/components/auth/useAuthLock';
import { AppErrorBoundary } from '@/components/errors/AppErrorBoundary';

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
  return (
    <View className="flex-1 items-center justify-center bg-[#173c98]">
      <Text className="text-3xl font-bold text-white">AI Certify</Text>
      <Text className="mt-2 text-sm text-[#B9CDF2]">Field Inspection App</Text>
      <ActivityIndicator className="mt-8" color="#FFFFFF" />
    </View>
  );
}

function AppShell() {
  const { status } = useAuthLock();

  if (status === 'checking') {
    return <BootSplash />;
  }

  return (
    <View className="flex-1">
      <AuthRouteSync />
      <Stack
        screenOptions={{
          headerShown: true,
          // One header for the whole app: brand mark, title and a back control that is always
          // there. It is rendered by the navigator, so it stays pinned while a screen scrolls.
          header: (props) => <AppHeader {...props} />,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
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
      <JobStateProvider>
        <AppNavigationProvider>
          <AppErrorBoundary>
            <AuthLockProvider>
              <AppShell />
            </AuthLockProvider>
          </AppErrorBoundary>
        </AppNavigationProvider>
      </JobStateProvider>
    </QueryClientProvider>
  );
}
