import '../global.css';
import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JobStateProvider } from '@/components/JobStateContext';
import { AppNavigationProvider } from '@/components/navigation/AppNavigationContext';
import { getToken } from '@/services/api';

const queryClient = new QueryClient();

export default function RootLayout() {
  useEffect(() => {
    getToken().then((token) => {
      if (!token) {
        router.replace('/(auth)/login');
      }
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <JobStateProvider>
        <AppNavigationProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </AppNavigationProvider>
      </JobStateProvider>
    </QueryClientProvider>
  );
}
