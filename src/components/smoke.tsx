import { Canvas, Fill, Shader, Skia, useClock } from '@shopify/react-native-skia';
import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useDerivedValue, useReducedMotion, type SharedValue } from 'react-native-reanimated';

/**
 * Soft, billowing smoke drawn on the GPU over whatever is behind it.
 * - `density` 0..1: smoke rises from the bottom and fills the screen.
 * - `clear` 0..1: the smoke thins and breaks apart until it's gone.
 * Purely visual; the screen using it decides how density and clear change.
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
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.0 + float2(3.1, 1.7);
    a *= 0.5;
  }
  return v;
}

half4 main(float2 xy) {
  float2 uv = xy / res.y;
  float up = 1.0 - xy.y / res.y; // 0 at the bottom, 1 at the top

  // Two layers of slow, rising billows. A gentle warp makes them curl without looking liquid.
  float2 p = uv * 2.2 + float2(t * 0.02, t * 0.07);
  float b = fbm(p + 0.6 * fbm(p * 0.5 - float2(0.0, t * 0.05)));
  float c = fbm(uv * 4.5 + float2(-t * 0.03, t * 0.12));
  float n = 0.7 * b + 0.3 * c;

  // Fill from the bottom up as density grows, with a soft, billowy edge.
  float edge = density * 1.35 - 0.2;
  float fill = smoothstep(edge - 0.25, edge + 0.05, up + (n - 0.5) * 0.35);
  fill = 1.0 - fill;

  // Mostly opaque, with lighter and thinner patches so it reads as smoke, not a sheet.
  float a = fill * (0.62 + 0.33 * smoothstep(0.25, 0.75, n));

  // Clearing: thin areas open up first, then the rest drifts apart.
  float hole = smoothstep(clear * 1.25 - 0.2, clear * 1.25 + 0.05, n + up * 0.1);
  a *= hole * (1.0 - clear * clear * 0.6);

  float3 col = mix(float3(0.58, 0.59, 0.61), float3(0.86, 0.86, 0.87), smoothstep(0.3, 0.8, n));
  return half4(half3(col * a), half(a));
}
`)!;

export function Smoke({
  density,
  clear,
  style,
}: {
  density: SharedValue<number>;
  clear: SharedValue<number>;
  style?: StyleProp<ViewStyle>;
}) {
  const [size, setSize] = useState({ w: 1, h: 1 });
  const still = useReducedMotion();
  const clock = useClock();

  const uniforms = useDerivedValue(() => ({
    res: [size.w, size.h],
    t: still ? 0 : clock.value / 1000,
    density: density.value,
    clear: clear.value,
  }));

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, style]}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Fill>
          <Shader source={SMOKE} uniforms={uniforms} />
        </Fill>
      </Canvas>
    </View>
  );
}
