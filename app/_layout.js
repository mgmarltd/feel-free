import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { OnboardingProvider } from '../src/context/OnboardingContext';
import { registerForPush } from '../src/services/notifications';

export default function RootLayout() {
  // Register this device for push on launch so admin automations can reach it.
  useEffect(() => {
    registerForPush();
  }, []);

  return (
    <OnboardingProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
          contentStyle: { backgroundColor: '#1a0a2e' },
        }}
      />
    </OnboardingProvider>
  );
}
