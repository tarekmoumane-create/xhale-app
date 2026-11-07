import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useStore } from '@/lib/store';

export default function OnboardingLayout() {
  // Someone who finished onboarding but lost their subscription lands straight on the paywall.
  const onboarded = useStore((s) => s.onboarded);
  return (
    <Stack
      initialRouteName={onboarded ? 'paywall' : 'index'}
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg }, animation: 'slide_from_right' }}>
      <Stack.Screen name="paywall" options={{ gestureEnabled: onboarded ? false : true }} />
      <Stack.Screen name="index" options={{ animation: 'fade' }} />
      <Stack.Screen name="score" options={{ animation: 'fade' }} />
      <Stack.Screen name="offer" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
    </Stack>
  );
}
