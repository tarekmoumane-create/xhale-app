import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

type Point = { x: number; y: number } | null;
type PuffSpec = { x: number; y: number; r: number; a: number; ax: number; ay: number; period: number; resist: number };

/** Deterministic pseudo-random so a given layout looks the same between renders. */
function rng(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function layout(w: number, h: number, count: number, seed: number): PuffSpec[] {
  const rand = rng(seed);
  const cols = Math.max(2, Math.round(Math.sqrt((count * w) / h)));
  const rows = Math.ceil(count / cols);
  const cw = w / cols;
  const ch = h / rows;
  const out: PuffSpec[] = [];
  for (let i = 0; i < count; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    out.push({
      x: (c + 0.5) * cw + (rand() - 0.5) * cw * 0.9,
      y: (r + 0.5) * ch + (rand() - 0.5) * ch * 0.9,
      r: Math.max(cw, ch) * (0.75 + rand() * 0.55),
      a: 0.55 + rand() * 0.4,
      ax: (rand() - 0.5) * 36,
      ay: -10 - rand() * 26,
      period: 5200 + rand() * 5200,
      resist: 0.05 + rand() * 0.07,
    });
  }
  return out;
}

function Puff({
  p,
  color,
  finger,
  wind,
  density,
  sweep,
  still,
  onGone,
}: {
  p: PuffSpec;
  color: string;
  finger: SharedValue<Point>;
  wind?: SharedValue<number>;
  density?: SharedValue<number>;
  sweep: SharedValue<number>;
  still: boolean;
  onGone: () => void;
}) {
  const gone = useSharedValue(0);
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);
  const drift = useSharedValue(0);
  const done = useSharedValue(false);

  useEffect(() => {
    if (!still) drift.set(withRepeat(withTiming(1, { duration: p.period, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [drift, p.period, still]);

  const clear = (vx: number, vy: number) => {
    'worklet';
    if (done.value) return;
    done.set(true);
    const ease = { duration: 1100, easing: Easing.out(Easing.cubic) };
    dx.set(withTiming(vx, ease));
    dy.set(withTiming(vy, ease));
    gone.set(withTiming(1, ease));
    scheduleOnRN(onGone);
  };

  // Wiping with a finger pushes the puff away from the touch.
  useAnimatedReaction(
    () => finger.value,
    (f) => {
      if (!f || done.value) return;
      const ex = f.x - p.x;
      const ey = f.y - p.y;
      const d = Math.sqrt(ex * ex + ey * ey);
      if (d < p.r * 0.7) {
        const k = d > 1 ? p.r / d : 0;
        clear(-ex * k, -ey * k - p.r * 0.3);
      }
    },
  );

  // Blowing thins the puff a little on every reading, then carries it up and away.
  useAnimatedReaction(
    () => wind?.value ?? 0,
    (w) => {
      if (w <= 0.04 || done.value) return;
      gone.set(Math.min(1, gone.value + w * p.resist));
      dy.set(-gone.value * p.r * 0.6);
      if (gone.value > 0.85) clear(p.ax * 2, -p.r * 1.6);
    },
  );

  useAnimatedReaction(
    () => sweep.value,
    (s) => {
      if (s > 0) clear(p.ax * 3, -p.r * 1.8);
    },
  );

  const style = useAnimatedStyle(() => ({
    opacity: (density ? density.value : 1) * p.a * (1 - gone.value),
    transform: [
      { translateX: drift.value * p.ax + dx.value },
      { translateY: drift.value * p.ay + dy.value },
      { scale: 1 + gone.value * 0.6 + drift.value * 0.1 },
    ],
  }));

  const size = p.r * 2;
  return (
    <Animated.View style={[styles.puff, { left: p.x - p.r, top: p.y - p.r, width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="g" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={0.62} />
            <Stop offset="0.45" stopColor={color} stopOpacity={0.34} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={p.r} cy={p.r} r={p.r} fill="url(#g)" />
      </Svg>
    </Animated.View>
  );
}

/**
 * Drifting smoke that fills its parent.
 * - `touch`: wipe it away with a finger.
 * - `wind`: 0..1, e.g. microphone level while the user blows on the phone.
 * - `density`: 0..1 thickness, e.g. to thicken the smoke while they inhale.
 * Change `resetKey` to bring the smoke back.
 */
export function Smoke({
  count = 24,
  color = '#C9CED2',
  touch = false,
  wind,
  density,
  resetKey = 0,
  clearAt = 0.8,
  onCleared,
  onProgress,
  style,
}: {
  count?: number;
  color?: string;
  touch?: boolean;
  wind?: SharedValue<number>;
  density?: SharedValue<number>;
  resetKey?: number;
  clearAt?: number;
  onCleared?: () => void;
  onProgress?: (fraction: number) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const finger = useSharedValue<Point>(null);
  const sweep = useSharedValue(0);
  const still = useReducedMotion();
  const goneCount = useRef(0);
  const firedRef = useRef(false);

  const puffs = useMemo(() => (size.w ? layout(size.w, size.h, count, 7 + resetKey * 131) : []), [size.w, size.h, count, resetKey]);

  useEffect(() => {
    goneCount.current = 0;
    firedRef.current = false;
    sweep.set(0);
    onProgress?.(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, sweep]);

  const onGone = () => {
    goneCount.current += 1;
    const frac = goneCount.current / Math.max(1, puffs.length);
    onProgress?.(Math.min(1, frac));
    if (!firedRef.current && frac >= clearAt) {
      firedRef.current = true;
      sweep.set(1);
      onCleared?.();
    }
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .enabled(touch)
    .onBegin((e) => {
      finger.set({ x: e.x, y: e.y });
    })
    .onUpdate((e) => {
      finger.set({ x: e.x, y: e.y });
    })
    .onFinalize(() => {
      finger.set(null);
    });

  return (
    <GestureDetector gesture={pan}>
      <View
        style={[StyleSheet.absoluteFill, styles.clip, style]}
        pointerEvents={touch ? 'auto' : 'none'}
        onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        {puffs.map((p, i) => (
          <Puff
            key={`${resetKey}-${i}`}
            p={p}
            color={color}
            finger={finger}
            wind={wind}
            density={density}
            sweep={sweep}
            still={still}
            onGone={onGone}
          />
        ))}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  puff: { position: 'absolute' },
});
