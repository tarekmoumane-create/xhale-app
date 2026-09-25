import { SchibstedGrotesk_700Bold, SchibstedGrotesk_800ExtraBold } from '@expo-google-fonts/schibsted-grotesk';
import {
  FamiljenGrotesk_400Regular,
  FamiljenGrotesk_400Regular_Italic,
  FamiljenGrotesk_500Medium,
  FamiljenGrotesk_600SemiBold,
} from '@expo-google-fonts/familjen-grotesk';
import { useFonts } from 'expo-font';
import { router, Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Colors } from '@/constants/theme';
import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';

import { track, trackScreen } from '@/lib/analytics';
import { scheduleNudges } from '@/lib/notifications';
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

  // Keep the next three weeks of notifications current (money saved, lung day), and open the
  // screen a notification points to when it's tapped.
  useEffect(() => {
    const refresh = () => {
      const s = getState();
      if (s.onboarded && s.pro) scheduleNudges(s).catch(() => {});
    };
    refresh();
    const appState = AppState.addEventListener('change', (next) => next === 'active' && refresh());
    return () => appState.remove();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    SplashScreen.hideAsync();
    const open = (r: Notifications.NotificationResponse | null) => {
      const url = r?.notification.request.content.data?.url;
      if (typeof url !== 'string' || !getState().onboarded || !getState().pro) return;
      Notifications.clearLastNotificationResponse();
      track('notification_opened', { to: url });
      router.navigate(url as never);
    };
    // A tap that launched the app, then any taps while it's running.
    open(Notifications.getLastNotificationResponse());
    const tap = Notifications.addNotificationResponseReceivedListener(open);
    return () => tap.remove();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
        <Stack.Protected guard={inApp}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="sos" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
          <Stack.Screen name="slip" options={{ presentation: 'modal' }} />
        </Stack.Protected>
        <Stack.Protected guard={!inApp}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
      </Stack>
    </GestureHandlerRootView>
  );
}
