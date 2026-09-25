import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInRight, FadeOutLeft } from 'react-native-reanimated';

import { Body, Button, Caption, Eyebrow, Icon, Option, Screen, Slider, StepHeader, Title } from '@/components/ui';
import { Colors, Fonts } from '@/constants/theme';
import { buildQuiz, whyFromAnswers, type Answers, type Slide } from '@/lib/quiz';
import { getState, setState, useStore } from '@/lib/store';

const START = 0.08;
const SPAN = 0.42;

export default function Quiz() {
  const substances = useStore((s) => s.substances);
  const answers = useStore((s) => s.answers);
  const slides = useMemo(() => buildQuiz(substances), [substances]);
  const [i, setI] = useState(0);
  const slide = slides[i];

  const answer = (id: string, v: number | number[]) => setState((st) => ({ answers: { ...st.answers, [id]: v } }));

  const advancing = useRef(false);

  const next = () => {
    if (slide.kind === 'slider' && answers[slide.id] === undefined) answer(slide.id, slide.initial);
    if (slide.id === 'n_amount' && substances.includes('cig')) {
      const n = typeof answers.n_amount === 'number' ? answers.n_amount : slide.kind === 'slider' ? slide.initial : 10;
      setState((st) => ({ habits: { ...st.habits, cigPerDay: Math.min(40, n) } }));
    }
    if (i + 1 >= slides.length) {
      const why = whyFromAnswers(getState().answers);
      if (why) setState({ why });
      router.replace('/onboarding/score');
    } else setI(i + 1);
  };
  const back = () => (i === 0 ? router.back() : setI(i - 1));

  const ready = isAnswered(slide, answers);
  // Single choice advances on tap; everything else has a Continue button.
  const needsButton = slide.kind !== 'choice';

  return (
    <Screen
      header={<StepHeader progress={START + (SPAN * i) / slides.length} onBack={back} />}
      footer={
        needsButton ? (
          <Button title={slide.kind === 'reflection' ? 'Keep going' : 'Continue'} disabled={!ready} onPress={next} />
        ) : undefined
      }>
      <Animated.View key={slide.id} entering={FadeInRight.duration(320)} exiting={FadeOutLeft.duration(200)} style={{ gap: 22 }}>
        <SlideBody
          slide={slide}
          answers={answers}
          answer={answer}
          onChosen={() => {
            if (advancing.current) return;
            advancing.current = true;
            setTimeout(() => {
              advancing.current = false;
              next();
            }, 220);
          }}
        />
      </Animated.View>
    </Screen>
  );
}

function isAnswered(slide: Slide, a: Answers) {
  if (slide.kind === 'reflection' || slide.kind === 'multi' || slide.kind === 'slider') return true;
  return a[slide.id] !== undefined;
}

function SlideBody({
  slide,
  answers,
  answer,
  onChosen,
}: {
  slide: Slide;
  answers: Answers;
  answer: (id: string, v: number | number[]) => void;
  onChosen: () => void;
}) {
  if (slide.kind === 'reflection') {
    const c = slide.content(answers);
    return (
      <View style={styles.reflection}>
        <View style={styles.quoteMark}>
          <Icon name="quote.opening" android="format_quote" size={22} color={Colors.accent} />
        </View>
        <Eyebrow style={{ color: Colors.accent }}>{c.eyebrow}</Eyebrow>
        <Title style={{ fontSize: 34, lineHeight: 38 }}>{c.title}</Title>
        <Body style={{ fontSize: 17, lineHeight: 26 }}>{c.body}</Body>
      </View>
    );
  }

  const header = (
    <View style={{ gap: 10 }}>
      <Eyebrow>{slide.eyebrow}</Eyebrow>
      <Title>{slide.title}</Title>
      {slide.sub ? <Body>{slide.sub}</Body> : null}
    </View>
  );

  if (slide.kind === 'choice') {
    const current = answers[slide.id];
    return (
      <>
        {header}
        <View style={{ gap: 10 }}>
          {slide.options.map((o, k) => (
            <Option
              key={o.label}
              title={o.label}
              sub={o.sub}
              selected={current === k}
              onPress={() => {
                answer(slide.id, k);
                onChosen();
              }}
            />
          ))}
        </View>
      </>
    );
  }

  if (slide.kind === 'multi') {
    const picked = Array.isArray(answers[slide.id]) ? (answers[slide.id] as number[]) : [];
    return (
      <>
        {header}
        <View style={{ gap: 10 }}>
          {slide.options.map((label, k) => (
            <Option
              key={label}
              multi
              title={label}
              selected={picked.includes(k)}
              onPress={() => answer(slide.id, picked.includes(k) ? picked.filter((x) => x !== k) : [...picked, k])}
            />
          ))}
        </View>
      </>
    );
  }

  const value = typeof answers[slide.id] === 'number' ? (answers[slide.id] as number) : slide.initial;
  return (
    <>
      {header}
      <View style={styles.sliderCard}>
        <Animated.Text key={value} entering={FadeIn.duration(160)} style={styles.sliderValue}>
          {slide.display(value)}
        </Animated.Text>
        <Slider
          value={value}
          min={slide.min}
          max={slide.max}
          step={slide.step}
          onChange={(v) => answer(slide.id, v)}
          accessibilityLabel={slide.title}
        />
        <View style={styles.sliderEnds}>
          <Caption>{slide.display(slide.min)}</Caption>
          <Caption>{slide.display(slide.max)}</Caption>
        </View>
      </View>
      <Body style={{ color: Colors.text }}>{slide.caption(value)}</Body>
    </>
  );
}

const styles = StyleSheet.create({
  reflection: { gap: 16, paddingTop: 24 },
  quoteMark: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  sliderCard: {
    backgroundColor: Colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 14,
    gap: 10,
  },
  sliderValue: { fontFamily: Fonts.display, fontSize: 64, lineHeight: 72, color: Colors.text, textAlign: 'center' },
  sliderEnds: { flexDirection: 'row', justifyContent: 'space-between' },
});
