import { router, useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Breather } from '@/components/breather';
import { Smoke } from '@/components/smoke';
import { Button } from '@/components/ui';
import { Fonts } from '@/constants/theme';

const PAPER = '#FFFFFF';
const INK = '#000000';
const INK2 = '#5A6668';

export default function Welcome() {
  // A white screen covered in grey smoke, with the buddy behind it. The smoke slowly clears
  // as you breathe out, revealing the buddy, then black text: "That's what clear feels like."
  const density = useSharedValue(1);
  const clear = useSharedValue(0);
  const scale = useSharedValue(1);
  const [cleared, setCleared] = useState(false);

  // Dark status bar text on this light screen only; the rest of the app is dark.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark');
      return () => setStatusBarStyle('light');
    }, []),
  );

  useEffect(() => {
    clear.set(withDelay(1200, withTiming(1, { duration: 6500, easing: Easing.inOut(Easing.sin) })));
    const id = setTimeout(() => setCleared(true), 6200);
    return () => clearTimeout(id);
  }, [clear]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.stage}>
        <Text style={styles.brand}>xhale</Text>

        <View style={styles.buddy}>
          <Breather mood={cleared ? 'happy' : 'hello'} scale={scale} size={190} />
        </View>

        <Smoke density={density} clear={clear} />

        <View pointerEvents="none" style={styles.hintWrap}>
          {!cleared ? (
            <Animated.Text exiting={FadeOut.duration(500)} style={styles.hint}>
              Take a slow breath out
            </Animated.Text>
          ) : (
            <Animated.Text entering={FadeIn.duration(900)} style={styles.hint}>
              That’s what clear feels like.
            </Animated.Text>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.copy}>
          <Text style={styles.hero} accessibilityRole="header">
            Breathe out. For good.
          </Text>
          <Text style={styles.lede}>Quit smoking, vaping or weed. No lectures. No shame.</Text>
        </View>
        <Button title="Get started" onPress={() => router.push('/onboarding/name')} />
        <Text style={styles.caption}>Takes about 3 minutes. Private by default.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PAPER },
  stage: { flex: 1, paddingHorizontal: 22, paddingTop: 8 },
  brand: { fontFamily: Fonts.display, fontSize: 22, lineHeight: 26, letterSpacing: -0.4, color: INK, zIndex: 2 },
  buddy: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hintWrap: { position: 'absolute', bottom: 12, left: 0, right: 0, alignItems: 'center' },
  hint: { fontFamily: Fonts.semi, fontSize: 16, color: '#000000' },
  footer: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 8, gap: 12 },
  copy: { gap: 8, paddingBottom: 8 },
  hero: { fontFamily: Fonts.display, fontSize: 38, lineHeight: 42, letterSpacing: -1, color: INK },
  lede: { fontFamily: Fonts.body, fontSize: 17, lineHeight: 24, color: INK2, maxWidth: 330 },
  caption: { fontFamily: Fonts.body, fontSize: 13, lineHeight: 18, color: INK2, textAlign: 'center' },
});
