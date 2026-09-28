import { BlurMask, Canvas, Fill, Group, Path, Shader, Skia, useClock, usePathValue } from '@shopify/react-native-skia';
import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  Easing,
  useAnimatedReaction,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

/**
 * Real-looking smoke: domain-warped fractal noise on the GPU. `clear` breaks it into
 * wisps and lifts it away; `density` thickens it; a wiping finger erases soft trails.
 */
const SMOKE = Skia.RuntimeEffect.Make(`
uniform float2 res;
uniform float t;
uniform float density;
uniform float clear;

float hash(float2 p) { return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453); }
float noise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + float2(1.0, 0.0)), u.x),
             mix(hash(i + float2(0.0, 1.0)), hash(i + float2(1.0, 1.0)), u.x), u.y);
}
float fbm(float2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + float2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

half4 main(float2 xy) {
  float2 uv = xy / res.y * 2.4;
  // Smoke rises slowly, and gets carried up and away as it clears.
  uv.y += t * 0.06 + clear * 1.2;
  float2 q = float2(fbm(uv + float2(0.0, t * 0.10)), fbm(uv + float2(5.2, 1.3) - t * 0.07));
  float2 r = float2(fbm(uv + 3.2 * q + float2(1.7, 9.2) + t * 0.13),
                    fbm(uv + 3.2 * q + float2(8.3, 2.8) - t * 0.11));
  float f = fbm(uv + 3.0 * r);

  float wisps = smoothstep(0.30 + clear * 0.55, 0.85, f);
  float haze = (0.35 + 0.35 * f) * (1.0 - clear);
  float a = clamp((wisps * 1.1 + haze) * density, 0.0, 1.0) * (1.0 - clear * clear);

  float3 dark = float3(0.36, 0.37, 0.39);
  float3 light = float3(0.93, 0.93, 0.94);
  float3 col = mix(dark, light, smoothstep(0.35, 0.95, f + length(r) * 0.25));
  return half4(half3(col * a), half(a));
}
`)!;

const GRID_X = 10;
const GRID_Y = 18;

export function Smoke({
  touch = false,
  wind,
  density,
  clearAt = 0.7,
  onCleared,
  onProgress,
  style,
}: {
  touch?: boolean;
  /** 0..1, e.g. microphone level while the user blows on the phone. */
  wind?: SharedValue<number>;
  /** 0..1 thickness, e.g. to thicken the smoke while they breathe in. */
  density?: SharedValue<number>;
  /** Fraction of the screen wiped before the rest clears on its own. */
  clearAt?: number;
  onCleared?: () => void;
  onProgress?: (fraction: number) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const [size, setSize] = useState({ w: 1, h: 1 });
  const still = useReducedMotion();
  const clock = useClock();
  const clear = useSharedValue(0);
  const done = useSharedValue(false);
  const points = useSharedValue<number[]>([]);
  const cells = useSharedValue<number[]>([]);
  const reported = useSharedValue(0);

  const cleared = () => onCleared?.();
  const progress = (f: number) => onProgress?.(f);
  const report = (f: number) => {
    'worklet';
    if (f <= reported.value) return;
    reported.set(f);
    scheduleOnRN(progress, f);
  };

  const finish = () => {
    'worklet';
    if (done.value) return;
    done.set(true);
    clear.set(withTiming(1, { duration: 1200, easing: Easing.out(Easing.cubic) }));
    scheduleOnRN(cleared);
  };

  // Blowing thins the whole cloud a little on every reading.
  useAnimatedReaction(
    () => wind?.value ?? 0,
    (w) => {
      if (done.value || w <= 0.05) return;
      const next = Math.min(1, clear.value + w * 0.04);
      clear.set(next);
      report(next);
      if (next >= 0.55) finish();
    },
  );

  const wipe = usePathValue((b) => {
    'worklet';
    const p = points.value;
    let pen = false;
    for (let i = 0; i < p.length; i += 2) {
      if (Number.isNaN(p[i])) {
        pen = false;
        continue;
      }
      if (pen) b.lineTo(p[i], p[i + 1]);
      else {
        b.moveTo(p[i], p[i + 1]);
        b.lineTo(p[i] + 0.1, p[i + 1]);
        pen = true;
      }
    }
  });

  const uniforms = useDerivedValue(() => ({
    res: [size.w, size.h],
    t: still ? 0 : clock.value / 1000,
    density: density ? density.value : 1,
    clear: clear.value,
  }));

  const touchAt = (x: number, y: number, start: boolean) => {
    'worklet';
    if (done.value) return;
    points.modify((arr) => {
      'worklet';
      if (start && arr.length) arr.push(NaN, NaN);
      arr.push(x, y);
      return arr;
    });
    // Mark the grid cells under the finger to know how much has been wiped.
    const cx = Math.floor((x / size.w) * GRID_X);
    const cy = Math.floor((y / size.h) * GRID_Y);
    let changed = false;
    cells.modify((arr) => {
      'worklet';
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const gx = cx + dx;
          const gy = cy + dy;
          if (gx < 0 || gy < 0 || gx >= GRID_X || gy >= GRID_Y) continue;
          const k = gy * GRID_X + gx;
          if (!arr[k]) {
            arr[k] = 1;
            changed = true;
          }
        }
      }
      return arr;
    });
    if (changed) {
      const frac = cells.value.reduce((n, v) => n + (v ? 1 : 0), 0) / (GRID_X * GRID_Y);
      report(frac);
      if (frac >= clearAt) finish();
    }
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .enabled(touch)
    .onBegin((e) => touchAt(e.x, e.y, true))
    .onUpdate((e) => touchAt(e.x, e.y, false));

  return (
    <GestureDetector gesture={pan}>
      <View
        style={[StyleSheet.absoluteFill, style]}
        pointerEvents={touch ? 'auto' : 'none'}
        onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        <Canvas style={StyleSheet.absoluteFill}>
          <Group layer>
            <Fill>
              <Shader source={SMOKE} uniforms={uniforms} />
            </Fill>
            <Path
              path={wipe}
              style="stroke"
              strokeWidth={Math.max(90, size.w * 0.28)}
              strokeCap="round"
              strokeJoin="round"
              color="black"
              blendMode="dstOut">
              <BlurMask blur={26} style="normal" />
            </Path>
          </Group>
        </Canvas>
      </View>
    </GestureDetector>
  );
}
