import { SchibstedGrotesk_700Bold, SchibstedGrotesk_800ExtraBold } from '@expo-google-fonts/schibsted-grotesk';
import {
  FamiljenGrotesk_400Regular,
  FamiljenGrotesk_400Regular_Italic,
  FamiljenGrotesk_500Medium,
  FamiljenGrotesk_600SemiBold,
} from '@expo-google-fonts/familjen-grotesk';
import { useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Colors } from '@/constants/theme';

import { trackScreen } from '@/lib/analytics';
import { completeOnboarding } from '@/lib/finish';
import { clearNotifications } from '@/lib/notifications';
import { checkEntitlement, initPurchases } from '@/lib/purchases';
import { getState, setState, useStore } from '@/lib/store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    SchibstedGrotesk_700Bold,
    SchibstedGrotesk_800ExtraBold,
    FamiljenGrotesk_400Regular,
    FamiljenGrotesk_400Regular_Italic,
    FamiljenGrotesk_500Medium,
    FamiljenGrotesk_600SemiBold,
  });
  const inApp = useStore((s) => s.onboarded && s.pro);
  const pathname = usePathname();

  useEffect(() => {
    trackScreen(pathname);
  }, [pathname]);

  useEffect(() => {
    initPurchases();
    // If a subscription lapsed, send them back to the paywall.
    checkEntitlement().then((active) => {
      if (active === false && getState().pro) setState({ pro: false });
    });
  }, []);

  // Someone who paid on an older version but closed the app before the old check-ins step.
  // Xhale sends no notifications, so anything an older version left queued is removed too.
  useEffect(() => {
    const s = getState();
    if (s.pro && !s.onboarded) completeOnboarding();
    clearNotifications().catch(() => {});
  }, []);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
        <Stack.Protected guard={inApp}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="sos"
            options={{ presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }}
          />
          <Stack.Screen name="slip" options={{ presentation: 'modal' }} />
          <Stack.Screen name="pledge-today" options={{ presentation: 'modal' }} />
        </Stack.Protected>
        <Stack.Protected guard={!inApp}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
      </Stack>
    </GestureHandlerRootView>
  );
}
