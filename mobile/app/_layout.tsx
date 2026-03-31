import '../global.css';
import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JobStateProvider } from '@/components/JobStateContext';
import { getToken } from '@/services/api';

const queryClient = new QueryClient();

export default function RootLayout() {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    getToken().then((token) => {
      if (!token) {
        router.replace('/(auth)/login');
      }
      setChecked(true);
    });
  }, []);

  if (!checked) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <JobStateProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </JobStateProvider>
    </QueryClientProvider>
  );
}
