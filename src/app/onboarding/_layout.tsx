import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useStore } from '@/lib/store';

export default function OnboardingLayout() {
  // Someone who finished onboarding but lost their subscription lands straight on the paywall.
  // Someone who paid but closed the app before setting check-ins picks up there.
  const onboarded = useStore((s) => s.onboarded);
  const paid = useStore((s) => s.pro);
  return (
    <Stack
      initialRouteName={onboarded ? 'paywall' : paid ? 'notify' : 'index'}
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg }, animation: 'slide_from_right' }}>
      <Stack.Screen name="paywall" options={{ gestureEnabled: onboarded ? false : true }} />
      <Stack.Screen name="index" options={{ animation: 'fade' }} />
      <Stack.Screen name="notify" options={{ gestureEnabled: false }} />
      <Stack.Screen name="score" options={{ animation: 'fade' }} />
      <Stack.Screen name="offer" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
    </Stack>
  );
}
