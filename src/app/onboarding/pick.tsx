import { router } from 'expo-router';
import { View } from 'react-native';

import { Body, Button, Caption, Enter, Option, Screen, StepHeader, Title } from '@/components/ui';
import { SUBSTANCES, SubstanceMeta, type Substance } from '@/constants/theme';
import { setState, useStore } from '@/lib/store';

export default function Pick() {
  const selected = useStore((s) => s.substances);
  const name = useStore((s) => s.name);

  const toggle = (s: Substance) =>
    setState((st) => ({
      substances: st.substances.includes(s)
        ? st.substances.filter((x) => x !== s)
        : SUBSTANCES.filter((x) => x === s || st.substances.includes(x)),
      answers: {},
    }));

  return (
    <Screen
      header={<StepHeader progress={0.08} />}
      footer={
        <Button
          title={selected.length ? 'Continue' : 'Choose at least one'}
          disabled={!selected.length}
          onPress={() => router.push('/onboarding/quiz')}
        />
      }>
      <Enter i={0} style={{ gap: 10 }}>
        <Title>{name ? `${name}, what do you want to be free of?` : 'What do you want to be free of?'}</Title>
        <Body>Pick all that apply.</Body>
      </Enter>
      <View style={{ gap: 10 }}>
        {SUBSTANCES.map((s, i) => {
          const m = SubstanceMeta[s];
          return (
            <Enter key={s} i={i + 1}>
              <Option
                multi
                title={m.label}
                sub={m.sub}
                icon={{ name: m.icon, android: m.androidIcon }}
                color={m.color}
                selected={selected.includes(s)}
                onPress={() => toggle(s)}
              />
            </Enter>
          );
        })}
      </View>
      <Enter i={5}>
        <Caption>Your answers stay on this phone.</Caption>
      </Enter>
    </Screen>
  );
}
