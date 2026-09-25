import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Line, Polyline } from 'react-native-svg';

import { Colors } from '@/constants/theme';

type Pt = [number, number];

export function SignaturePad({ onChange, height = 170 }: { onChange: (points: number) => void; height?: number }) {
  const [strokes, setStrokes] = useState<Pt[][]>([]);
  const [width, setWidth] = useState(0);

  const update = (next: Pt[][]) => {
    setStrokes(next);
    onChange(next.reduce((n, s) => n + s.length, 0));
  };

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin((e) => update([...strokes, [[e.x, e.y]]]))
    .onUpdate((e) => {
      const last = strokes[strokes.length - 1] ?? [];
      update([...strokes.slice(0, -1), [...last, [e.x, e.y]]]);
    });

  return (
    <GestureDetector gesture={pan}>
      <View
        accessibilityLabel="Signature area. Draw your signature with your finger."
        style={[styles.pad, { height }]}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <Svg width={width} height={height}>
          <Line x1={24} y1={height - 42} x2={Math.max(24, width - 24)} y2={height - 42} stroke={Colors.borderStrong} strokeWidth={2} />
          {strokes.map((s, i) => (
            <Polyline
              key={i}
              points={s.map(([x, y]) => `${x},${y}`).join(' ')}
              fill="none"
              stroke={Colors.text}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </Svg>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  pad: { borderRadius: 22, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
});
