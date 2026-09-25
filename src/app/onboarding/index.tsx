import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Caption } from '@/components/ui';
import { Smoke } from '@/components/smoke';
import { Colors, Fonts } from '@/constants/theme';

export default function Welcome() {
  const [started, setStarted] = useState(false);
  const [clear, setClear] = useState(false);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.stage}>
        <Text style={styles.brand}>exhale</Text>

        <View style={styles.copy}>
          <Text style={styles.hero} accessibilityRole="header">
            Breathe out.{'\n'}For good.
          </Text>
          <Text style={styles.lede}>Quit smoking, vaping or weed. No lectures. No shame.</Text>
        </View>

        <Smoke
          touch
          count={26}
          onProgress={(f) => f > 0 && setStarted(true)}
          onCleared={() => {
            setClear(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }}
        />

        <View pointerEvents="none" style={styles.hintWrap}>
          {!started ? (
            <Animated.Text exiting={FadeOut.duration(250)} style={styles.hint}>
              Swipe the smoke away
            </Animated.Text>
          ) : clear ? (
            <Animated.Text entering={FadeIn.duration(600)} style={styles.hint}>
              That’s what clear feels like.
            </Animated.Text>
          ) : null}
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
