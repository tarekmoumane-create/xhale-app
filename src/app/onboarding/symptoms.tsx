import { router } from 'expo-router';
import { View } from 'react-native';

import { Body, Button, Chip, Enter, Screen, StepHeader, Title, ui } from '@/components/ui';
import { setState, useStore } from '@/lib/store';

const SYMPTOMS = [
  'Bad sleep',
  'Brain fog',
  'Anxiety',
  'Low energy',
  'Out of breath',
  'Coughing',
  'Low motivation',
  'Irritability',
  'Worse memory',
  'Headaches',
  'Smell on my clothes',
  'Stained teeth',
];

export default function Symptoms() {
  const picked = useStore((s) => s.symptoms);
  const toggle = (x: string) =>
    setState((st) => ({ symptoms: st.symptoms.includes(x) ? st.symptoms.filter((y) => y !== x) : [...st.symptoms, x] }));

  return (
    <Screen
      header={<StepHeader progress={0.6} />}
      footer={
        <Button
          title={picked.length ? `Track ${picked.length === 1 ? 'this' : `these ${picked.length}`}` : 'Skip for now'}
          tone={picked.length ? 'primary' : 'secondary'}
          onPress={() => router.push('/onboarding/science')}
        />
      }>
      <Enter i={0} style={{ gap: 10 }}>
        <Title>What has it been taking from you?</Title>
        <Body>You’ll watch each one improve.</Body>
      </Enter>
      <Enter i={1}>
        <View style={ui.wrapRow}>
          {SYMPTOMS.map((x) => (
            <Chip key={x} label={x} selected={picked.includes(x)} onPress={() => toggle(x)} />
          ))}
        </View>
      </Enter>
    </Screen>
  );
}
