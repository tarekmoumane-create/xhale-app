import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BreathOrb } from '@/components/breath';
import { Caption, Icon, Tap } from '@/components/ui';
import { Colors, Fonts } from '@/constants/theme';
import { askCoach, looksLikeCrisis } from '@/lib/coach';
import { getState, setState, useStore } from '@/lib/store';
import { track } from '@/lib/analytics';

const STARTERS = ['I’m craving hard right now', 'I slipped', 'I can’t sleep', 'Why am I so irritable?'];

export default function CoachTab() {
  const messages = useStore((s) => s.coach);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crisis, setCrisis] = useState(false);
  const scroll = useRef<ScrollView>(null);

  const send = async (raw: string) => {
    track('coach_message_sent');
    const t = raw.trim();
    if (!t || busy) return;
    if (looksLikeCrisis(t)) setCrisis(true);
    const history = [...getState().coach, { role: 'user' as const, text: t }];
    setState({ coach: history });
    setText('');
    setError(null);
    setBusy(true);
    try {
      const reply = await askCoach(history, getState());
      setState((st) => ({ coach: [...st.coach, { role: 'assistant', text: reply }] }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const canSend = !!text.trim() && !busy;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}>
        <View style={styles.header}>
          <BreathOrb size={34} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>Coach</Text>
            <Caption>Here any time. Knows your plan.</Caption>
          </View>
        </View>

        <ScrollView
          ref={scroll}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {messages.length === 0 ? (
            <Animated.View entering={FadeInUp.duration(400)} style={{ gap: 14 }}>
              <View style={[styles.bubble, styles.them]}>
                <Text style={styles.themText}>
                  Hey. I’m here whenever it gets hard, day or night. No judgement, just help. What’s going on?
                </Text>
              </View>
              <View style={styles.starters}>
                {STARTERS.map((s) => (
                  <Tap key={s} accessibilityRole="button" onPress={() => send(s)} style={styles.starter}>
                    <Text style={styles.starterText}>{s}</Text>
                  </Tap>
                ))}
              </View>
            </Animated.View>
          ) : null}

          {messages.map((m, i) => (
            <Animated.View key={i} entering={FadeInUp.duration(260)} style={[styles.bubble, m.role === 'user' ? styles.me : styles.them]}>
              <Text style={m.role === 'user' ? styles.meText : styles.themText}>{m.text}</Text>
            </Animated.View>
          ))}

          {busy ? (
            <View style={[styles.bubble, styles.them, styles.typing]}>
              <View style={styles.typingDot} />
              <View style={[styles.typingDot, { opacity: 0.6 }]} />
              <View style={[styles.typingDot, { opacity: 0.3 }]} />
            </View>
          ) : null}
          {error ? <Caption style={{ color: Colors.danger }}>{error}</Caption> : null}

          {crisis ? (
            <Animated.View entering={FadeInUp.duration(300)} style={styles.crisis}>
              <Text style={styles.crisisTitle}>You don’t have to handle this alone.</Text>
              <Text style={styles.crisisBody}>
                If you might hurt yourself, please reach out right now. In the US, call or text 988, the Suicide &amp; Crisis Lifeline.
                Elsewhere, call your local emergency number.
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Tap accessibilityRole="button" onPress={() => Linking.openURL('tel:988')} style={styles.crisisBtn}>
                  <Text style={styles.crisisBtnText}>Call 988</Text>
                </Tap>
                <Tap
                  accessibilityRole="button"
                  onPress={() => Linking.openURL('sms:988')}
                  style={[styles.crisisBtn, styles.crisisBtnGhost]}>
                  <Text style={[styles.crisisBtnText, { color: Colors.text }]}>Text 988</Text>
                </Tap>
              </View>
            </Animated.View>
          ) : null}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Tell Coach what's happening"
            placeholderTextColor={Colors.text3}
            style={styles.input}
            multiline
            accessibilityLabel="Message Coach"
          />
          <Tap
            accessibilityRole="button"
            accessibilityLabel="Send"
            disabled={!canSend}
            onPress={() => send(text)}
            style={[styles.send, !canSend && { backgroundColor: Colors.surfaceHigh }]}>
            <Icon name="arrow.up" android="arrow_upward" size={16} color={canSend ? Colors.onLight : Colors.text3} weight="bold" />
          </Tap>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  name: { fontFamily: Fonts.display, fontSize: 24, lineHeight: 28, color: Colors.text },
  list: { padding: 18, gap: 10, flexGrow: 1, justifyContent: 'flex-end' },
  bubble: { maxWidth: '84%', paddingHorizontal: 15, paddingVertical: 11, borderRadius: 20 },
  me: { alignSelf: 'flex-end', backgroundColor: Colors.text, borderBottomRightRadius: 6 },
  them: { alignSelf: 'flex-start', backgroundColor: Colors.surface, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: Colors.border },
  meText: { fontFamily: Fonts.body, fontSize: 15.5, lineHeight: 22, color: Colors.onLight },
  themText: { fontFamily: Fonts.body, fontSize: 15.5, lineHeight: 22, color: Colors.text },
  typing: { flexDirection: 'row', gap: 5, paddingVertical: 15 },
  typingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.text2 },
  starters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  starter: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    justifyContent: 'center',
  },
  starterText: { fontFamily: Fonts.semi, fontSize: 14, color: Colors.text },
  crisis: {
    gap: 10,
    padding: 16,
    borderRadius: 20,
    backgroundColor: Colors.dangerSoft,
    borderWidth: 1,
    borderColor: 'rgba(255,107,94,0.3)',
  },
  crisisTitle: { fontFamily: Fonts.displaySemi, fontSize: 19, lineHeight: 24, color: Colors.text },
  crisisBody: { fontFamily: Fonts.body, fontSize: 14, lineHeight: 20, color: Colors.text2 },
  crisisBtn: { height: 42, paddingHorizontal: 18, borderRadius: 999, backgroundColor: Colors.danger, justifyContent: 'center' },
  crisisBtnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.borderStrong },
  crisisBtnText: { fontFamily: Fonts.bold, fontSize: 14, color: '#1A0503' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingTop: 13,
    paddingBottom: 13,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.surface,
    fontFamily: Fonts.body,
    fontSize: 15.5,
    color: Colors.text,
  },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.text, alignItems: 'center', justifyContent: 'center' },
});
