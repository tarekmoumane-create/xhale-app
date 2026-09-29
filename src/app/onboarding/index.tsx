import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Caption } from '@/components/ui';
import { Smoke } from '@/components/smoke';
import { Colors, Fonts } from '@/constants/theme';

export default function Welcome() {
  // The screen opens full of smoke, which drifts away as you take a slow breath out.
  const density = useSharedValue(1);
  const clear = useSharedValue(0);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    clear.set(withDelay(900, withTiming(1, { duration: 5000, easing: Easing.inOut(Easing.sin) })));
    const id = setTimeout(() => setCleared(true), 5900);
    return () => clearTimeout(id);
  }, [clear]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.stage}>
        <Text style={styles.brand}>xhale</Text>

        <View style={styles.copy}>
          <Text style={styles.hero} accessibilityRole="header">
            Breathe out.{'\n'}For good.
          </Text>
          <Text style={styles.lede}>Quit smoking, vaping or weed. No lectures. No shame.</Text>
        </View>

        <Smoke density={density} clear={clear} />

        <View pointerEvents="none" style={styles.hintWrap}>
          {!cleared ? (
            <Animated.Text exiting={FadeOut.duration(400)} style={styles.hint}>
              Take a slow breath out
            </Animated.Text>
          ) : (
            <Animated.Text entering={FadeIn.duration(800)} style={styles.hint}>
              That’s what clear feels like.
            </Animated.Text>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <Button title="Get started" onPress={() => router.push('/onboarding/pick')} />
        <Caption center style={{ marginTop: 10 }}>
          Takes about 4 minutes. Private by default.
        </Caption>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  stage: { flex: 1, paddingHorizontal: 22, paddingTop: 8 },
  brand: { fontFamily: Fonts.display, fontSize: 22, lineHeight: 26, letterSpacing: -0.4, color: Colors.text },
  copy: { flex: 1, justifyContent: 'flex-end', gap: 14, paddingBottom: 20 },
  hero: { fontFamily: Fonts.display, fontSize: 50, lineHeight: 54, letterSpacing: -1.2, color: Colors.text, paddingTop: 10 },
  lede: { fontFamily: Fonts.body, fontSize: 18, lineHeight: 26, color: Colors.text2, maxWidth: 330 },
  hintWrap: { position: 'absolute', top: '32%', left: 0, right: 0, alignItems: 'center' },
  hint: { fontFamily: Fonts.semi, fontSize: 15, color: Colors.text, opacity: 0.85 },
  footer: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 8 },
});
