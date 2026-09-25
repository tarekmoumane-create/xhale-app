import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';

/* ---------- Layout ---------- */

export function Screen({
  children,
  footer,
  header,
  scroll = true,
  contentStyle,
  edges = ['top', 'bottom'],
}: {
  children: ReactNode;
  footer?: ReactNode;
  header?: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom')[];
}) {
  return (
    <SafeAreaView style={s.safe} edges={edges}>
      {header ? <View style={s.headerWrap}>{header}</View> : null}
      {scroll ? (
        <ScrollView
          contentContainerStyle={[s.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[s.content, { flex: 1 }, contentStyle]}>{children}</View>
      )}
      {footer ? <View style={s.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

/** Staggered entrance. Wrap blocks of a screen with increasing `i`. */
export function Enter({ i = 0, children, style }: { i?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View entering={FadeInDown.duration(420).delay(60 + i * 70)} style={style}>
      {children}
    </Animated.View>
  );
}

/* ---------- Type ---------- */

type TProps = { children: ReactNode; style?: StyleProp<TextStyle>; center?: boolean };

export const Hero = ({ children, style, center }: TProps) => <Text style={[Type.hero, center && s.center, style]}>{children}</Text>;
export const Title = ({ children, style, center }: TProps) => <Text style={[Type.title, center && s.center, style]}>{children}</Text>;
export const Heading = ({ children, style, center }: TProps) => <Text style={[Type.heading, center && s.center, style]}>{children}</Text>;
export const Body = ({ children, style, center }: TProps) => <Text style={[Type.body, center && s.center, style]}>{children}</Text>;
export const Small = ({ children, style, center }: TProps) => <Text style={[Type.small, center && s.center, style]}>{children}</Text>;
export const Caption = ({ children, style, center }: TProps) => <Text style={[Type.caption, center && s.center, style]}>{children}</Text>;
export const Eyebrow = ({ children, style, center }: TProps) => <Text style={[Type.eyebrow, center && s.center, style]}>{children}</Text>;

/* ---------- Icons ---------- */

export function Icon({
  name,
  android,
  size = 20,
  color = Colors.text,
  weight = 'semibold',
}: {
  name: string;
  android?: string;
  size?: number;
  color?: string;
  weight?: SymbolViewProps['weight'];
}) {
  return (
    <SymbolView
      name={{ ios: name, android: android ?? 'circle', web: android ?? 'circle' } as SymbolViewProps['name']}
      size={size}
      tintColor={color}
      weight={weight}
      type="hierarchical"
      fallback={<View style={{ width: size, height: size }} />}
    />
  );
}

/* ---------- Pressables ---------- */

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Pressable with a spring scale on touch. */
export function Tap({
  children,
  style,
  onPressIn,
  onPressOut,
  scaleTo = 0.97,
  ...rest
}: PressableProps & { style?: StyleProp<ViewStyle>; scaleTo?: number }) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      {...rest}
      style={[style, animated]}
      onPressIn={(e) => {
        scale.set(withSpring(scaleTo, { damping: 20, stiffness: 400 }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, { damping: 16, stiffness: 300 }));
        onPressOut?.(e);
      }}>
      {children as ReactNode}
    </AnimatedPressable>
  );
}

type ButtonTone = 'primary' | 'accent' | 'secondary' | 'danger';

const TONES: Record<ButtonTone, { bg: string; fg: string; border?: string }> = {
  primary: { bg: Colors.text, fg: Colors.onLight },
  accent: { bg: Colors.accent, fg: Colors.onAccent },
  secondary: { bg: Colors.surfaceHigh, fg: Colors.text, border: Colors.border },
  danger: { bg: Colors.danger, fg: '#1A0503' },
};

export function Button({
  title,
  onPress,
  tone = 'primary',
  disabled,
  loading,
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  tone?: ButtonTone;
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const t = TONES[tone];
  const off = disabled || loading;
  return (
    <Tap
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={off}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={[s.button, { backgroundColor: disabled ? Colors.surfaceHigh : t.bg, borderColor: t.border ?? 'transparent' }, style]}>
      {loading ? (
        <ActivityIndicator color={t.fg} />
      ) : (
        <View style={s.row}>
          {icon ? <Icon name={icon} size={17} color={disabled ? Colors.text3 : t.fg} /> : null}
          <Text style={[s.buttonText, { color: disabled ? Colors.text3 : t.fg }]}>{title}</Text>
        </View>
      )}
    </Tap>
  );
}

export function LinkButton({ title, onPress, color = Colors.text2 }: { title: string; onPress: () => void; color?: string }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={10} style={({ pressed }) => [s.link, { opacity: pressed ? 0.6 : 1 }]}>
      <Text style={[s.linkText, { color }]}>{title}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, label, onPress, android }: { icon: string; android?: string; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [s.iconBtn, { opacity: pressed ? 0.6 : 1 }]}>
      <Icon name={icon} android={android} size={17} color={Colors.text} />
    </Pressable>
  );
}

/* ---------- Surfaces ---------- */

export function Card({ children, style, tint }: { children: ReactNode; style?: StyleProp<ViewStyle>; tint?: string }) {
  return <View style={[s.card, tint ? { backgroundColor: tint, borderColor: 'transparent' } : null, style]}>{children}</View>;
}

export function Divider() {
  return <View style={s.divider} />;
}

/* ---------- Selection ---------- */

export function Option({
  title,
  sub,
  selected,
  onPress,
  icon,
  color = Colors.accent,
  multi,
}: {
  title: string;
  sub?: string;
  selected: boolean;
  onPress: () => void;
  icon?: { name: string; android?: string };
  color?: string;
  multi?: boolean;
}) {
  return (
    <Tap
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={multi ? { checked: selected } : { selected }}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      scaleTo={0.985}
      style={[s.option, selected && { borderColor: color, backgroundColor: Colors.surfaceHigh }]}>
      {icon ? (
        <View style={[s.optionIcon, { backgroundColor: selected ? color : Colors.surfaceHigh }]}>
          <Icon name={icon.name} android={icon.android} size={20} color={selected ? Colors.onLight : color} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.optionTitle}>{title}</Text>
        {sub ? <Text style={Type.small}>{sub}</Text> : null}
      </View>
      <View
        style={[
          multi ? s.checkSquare : s.checkCircle,
          { borderColor: selected ? color : Colors.borderStrong, backgroundColor: selected ? color : 'transparent' },
        ]}>
        {selected ? <Icon name="checkmark" android="check" size={11} color={Colors.onLight} weight="bold" /> : null}
      </View>
    </Tap>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  color = Colors.accent,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Tap
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={[s.chip, selected && { backgroundColor: color, borderColor: color }]}>
      <Text style={[s.chipText, { color: selected ? Colors.onLight : Colors.text }]}>{label}</Text>
    </Tap>
  );
}

/* ---------- Progress ---------- */

export function ProgressBar({ value, color = Colors.accent, style }: { value: number; color?: string; style?: StyleProp<ViewStyle> }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.set(withTiming(Math.max(0, Math.min(1, value)), { duration: 500 }));
  }, [value, v]);
  const fill = useAnimatedStyle(() => ({ transform: [{ scaleX: v.value }] }));
  return (
    <View style={[s.track, style]}>
      <Animated.View style={[s.fill, { backgroundColor: color }, fill]} />
    </View>
  );
}

/** Back chevron + progress, used across onboarding. */
export function StepHeader({ progress, onBack, back = true }: { progress: number; onBack?: () => void; back?: boolean }) {
  return (
    <View style={s.stepHeader}>
      {back ? (
        <IconButton icon="chevron.left" android="arrow_back" label="Back" onPress={onBack ?? (() => router.back())} />
      ) : (
        <View style={{ width: 40 }} />
      )}
      <ProgressBar value={progress} style={{ flex: 1 }} />
      <View style={{ width: 40 }} />
    </View>
  );
}

/* ---------- Slider ---------- */

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  color = Colors.accent,
  accessibilityLabel,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  color?: string;
  accessibilityLabel: string;
}) {
  const [width, setWidth] = useState(0);
  const frac = (value - min) / (max - min);
  const set = (x: number) => {
    if (!width) return;
    const f = Math.max(0, Math.min(1, x / width));
    const v = Math.round((min + f * (max - min)) / step) * step;
    if (v !== value) {
      Haptics.selectionAsync();
      onChange(v);
    }
  };
  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin((e) => set(e.x))
    .onUpdate((e) => set(e.x));

  return (
    <GestureDetector gesture={pan}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ min, max, now: value }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) =>
          onChange(Math.max(min, Math.min(max, value + (e.nativeEvent.actionName === 'increment' ? step : -step))))
        }
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={s.sliderHit}>
        <View style={s.sliderTrack}>
          <View style={[s.sliderFill, { width: `${frac * 100}%`, backgroundColor: color }]} />
        </View>
        <View style={[s.thumb, { left: Math.max(0, frac * width - 14) }]} />
      </View>
    </GestureDetector>
  );
}

/* ---------- Styles ---------- */

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  headerWrap: { paddingHorizontal: Space.gutter - 6 },
  content: { paddingHorizontal: Space.gutter, paddingTop: Space.md, paddingBottom: Space.xxl, gap: Space.lg },
  footer: { paddingHorizontal: Space.gutter, paddingTop: Space.md, paddingBottom: Space.sm, gap: Space.sm, backgroundColor: Colors.bg },
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  button: { height: 58, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  buttonText: { fontFamily: Fonts.bold, fontSize: 16.5, letterSpacing: 0.1 },
  link: { paddingVertical: 12, alignItems: 'center' },
  linkText: { fontFamily: Fonts.semi, fontSize: 14.5 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    gap: Space.md,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.borderStrong },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: Radius.md + 2,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  optionIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { fontFamily: Fonts.semi, fontSize: 16, lineHeight: 21, color: Colors.text },
  checkCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  checkSquare: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  chip: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: Radius.pill,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.surface,
  },
  chipText: { fontFamily: Fonts.semi, fontSize: 14.5 },
  track: { height: 4, borderRadius: 2, backgroundColor: Colors.surfaceHigh, overflow: 'hidden' },
  fill: { height: 4, width: '100%', transformOrigin: 'left' },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: Space.md, paddingTop: Space.xs, paddingBottom: Space.sm },
  sliderHit: { height: 44, justifyContent: 'center' },
  sliderTrack: { height: 6, borderRadius: 3, backgroundColor: Colors.surfaceHigh, overflow: 'hidden' },
  sliderFill: { height: 6 },
  thumb: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.text,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
});

export const ui = s;
