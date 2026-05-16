import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { OnboardingProvider } from '../src/context/OnboardingContext';

export default function RootLayout() {
  return (
    <OnboardingProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#1a0a2e' },
        }}
      />
    </OnboardingProvider>
  );
}
