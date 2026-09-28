import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Tap } from '@/components/ui';
import { Colors, Fonts } from '@/constants/theme';

/** Floating "I'm having a craving" button, pinned above the tab bar on every tab. */
export function CravingButton() {
  const insets = useSafeAreaInsets();
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel="I’m having a craving. Opens SOS."
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push('/sos');
      }}
      style={[styles.fab, { bottom: insets.bottom + 62 }]}>
      <Icon name="wind" android="air" size={18} color={Colors.onAccent} />
      <Text style={styles.text}>I’m having a craving</Text>
    </Tap>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 52,
    paddingHorizontal: 22,
    borderRadius: 999,
    backgroundColor: Colors.accent,
    boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
  },
  text: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.onAccent },
});
