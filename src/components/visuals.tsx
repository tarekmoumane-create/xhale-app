import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, LinearGradient, Path, Polyline, Stop } from 'react-native-svg';

import { Colors, Fonts } from '@/constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type Ring = { key: string; frac: number; color: string; track: string };

function RingArc({
  radius,
  frac,
  color,
  track,
  stroke,
  delay,
}: {
  radius: number;
  frac: number;
  color: string;
  track: string;
  stroke: number;
  delay: number;
}) {
  const c = 2 * Math.PI * radius;
  const v = useSharedValue(0);
  useEffect(() => {
    v.set(withDelay(delay, withTiming(Math.max(0, Math.min(1, frac)), { duration: 900 })));
  }, [frac, delay, v]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - v.value) }));
  return (
    <G>
      <Circle cx={120} cy={120} r={radius} fill="none" stroke={track} strokeWidth={stroke} />
      <AnimatedCircle
        cx={120}
        cy={120}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${c} ${c}`}
        animatedProps={props}
      />
    </G>
  );
}

/** Concentric progress rings, outermost first, animated on change. */
export function Rings({ rings, size = 236, children }: { rings: Ring[]; size?: number; children?: React.ReactNode }) {
  const stroke = rings.length > 2 ? 15 : 18;
  const gap = 6;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 240 240" style={[StyleSheet.absoluteFill, { transform: [{ rotate: '-90deg' }] }]}>
        <G>
          {rings.map((r, i) => (
            <RingArc
              key={r.key}
              radius={110 - stroke / 2 - i * (stroke + gap)}
              frac={r.frac}
              color={r.color}
              track={r.track}
              stroke={stroke}
              delay={150 + i * 120}
            />
          ))}
        </G>
      </Svg>
      {children}
    </View>
  );
}

/** Ticks once a second; only this component re-renders. */
export function LiveTimer({ since, label }: { since: number; label: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const sec = Math.max(0, Math.floor((now - since) / 1000));
  const d = Math.floor(sec / 86400);
  const pad = (n: number) => String(n).padStart(2, '0');
  const hms = `${pad(Math.floor((sec % 86400) / 3600))}:${pad(Math.floor((sec % 3600) / 60))}:${pad(sec % 60)}`;
  return (
    <View style={{ alignItems: 'center' }} accessibilityLabel={`${label}: ${d} days`}>
      <Text style={timer.label}>{label}</Text>
      <Text style={timer.days}>
        {d}
        <Text style={timer.unit}>{d === 1 ? ' day' : ' days'}</Text>
      </Text>
      <Text style={timer.hms}>{hms}</Text>
    </View>
  );
}

const timer = StyleSheet.create({
  label: { fontFamily: Fonts.bold, fontSize: 12.5, color: Colors.text3 },
  days: { fontFamily: Fonts.display, fontSize: 40, lineHeight: 46, color: Colors.text },
  unit: { fontFamily: Fonts.displaySemi, fontSize: 20, lineHeight: 24, color: Colors.text2 },
  hms: { fontFamily: Fonts.semi, fontSize: 13, color: Colors.text2, fontVariant: ['tabular-nums'] },
});

/** A craving as a wave: builds, peaks around 2 minutes, fades by 5. */
export function CravingWave({ elapsed, width, height = 84 }: { elapsed: number; width: number; height?: number }) {
  const top = 10;
  const base = height - 10;
  const peakX = width * 0.37;
  const spread = width * 0.19;
  const yAt = (x: number) => base - (base - top) * Math.exp(-(((x - peakX) / spread) ** 2));
  const pts: string[] = [];
  for (let x = 0; x <= width; x += 4) pts.push(`${x},${yAt(x).toFixed(1)}`);
  const cur = (width * Math.min(300, elapsed)) / 300;
  const done: string[] = [];
  for (let x = 0; x <= cur; x += 4) done.push(`${x},${yAt(x).toFixed(1)}`);
  done.push(`${cur.toFixed(1)},${yAt(cur).toFixed(1)}`);
  const area = `M0,${base} L${done.join(' L')} L${cur.toFixed(1)},${base} Z`;
  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="waveFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={Colors.accent} stopOpacity={0.35} />
          <Stop offset="1" stopColor={Colors.accent} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Polyline
        points={pts.join(' ')}
        fill="none"
        stroke={Colors.surfaceHigh}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d={area} fill="url(#waveFill)" />
      <Polyline points={done.join(' ')} fill="none" stroke={Colors.accent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={cur} cy={yAt(cur)} r={7} fill={Colors.text} stroke={Colors.bg} strokeWidth={3} />
    </Svg>
  );
}
