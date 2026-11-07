import { router } from 'expo-router';
import { StyleSheet, TextInput } from 'react-native';

import { Body, Button, Caption, Enter, LinkButton, Screen, StepHeader, Title } from '@/components/ui';
import { Colors, Fonts } from '@/constants/theme';
import { setState, useStore } from '@/lib/store';

/** First question: what to call them. Used across onboarding and on Today. */
export default function Name() {
  const name = useStore((s) => s.name);
  const go = () => {
    setState((st) => ({ name: st.name.trim() }));
    router.push('/onboarding/pick');
  };

  return (
    <Screen
      header={<StepHeader progress={0.04} />}
      footer={<Button title={name.trim() ? `Nice to meet you, ${name.trim()}` : 'Continue'} disabled={!name.trim()} onPress={go} />}>
      <Enter i={0} style={{ gap: 10 }}>
        <Title>First, what should we call you?</Title>
        <Body>This is your plan, so it should feel like it.</Body>
      </Enter>
      <Enter i={1} style={{ gap: 10 }}>
        <TextInput
          value={name}
          onChangeText={(t) => setState({ name: t })}
          placeholder="Your first name"
          placeholderTextColor={Colors.text3}
          autoFocus
          autoCapitalize="words"
          autoComplete="given-name"
          textContentType="givenName"
          maxLength={24}
          returnKeyType="next"
          onSubmitEditing={() => name.trim() && go()}
          style={styles.input}
          accessibilityLabel="Your first name"
        />
        <Caption>Only on this phone.</Caption>
      </Enter>
      <Enter i={2}>
        <LinkButton
          title="Skip"
          onPress={() => {
            setState({ name: '' });
            router.push('/onboarding/pick');
          }}
        />
      </Enter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 64,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    fontFamily: Fonts.semi,
    fontSize: 22,
    color: Colors.text,
  },
});
