import { useEffect } from 'react';
import { View, useWindowDimensions } from 'react-native';
import {
  Canvas,
  Circle,
  BlurMask,
  Fill,
  Group,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  useDerivedValue,
  withSpring,
  withRepeat,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';
import type Animated from 'react-native-reanimated';

export default function MeshGradient() {
  const { width: W, height: H } = useWindowDimensions();

  const blobs = [
    { color: '#50C878', r: 200, blur: 90, opacity: 0.4,  sx: W * 0.15, sy: H * 0.2,  dx: 70, dy: 50 },
    { color: '#D4AF37', r: 160, blur: 80, opacity: 0.35, sx: W * 0.8,  sy: H * 0.35, dx: 55, dy: 65 },
    { color: '#50C878', r: 220, blur: 100, opacity: 0.3, sx: W * 0.45, sy: H * 0.72, dx: 60, dy: 45 },
    { color: '#0A0A1A', r: 250, blur: 70, opacity: 0.6,  sx: W * 0.35, sy: H * 0.5,  dx: 50, dy: 40 },
  ];

  const b0cx = useSharedValue(blobs[0].sx);
  const b0cy = useSharedValue(blobs[0].sy);
  const b1cx = useSharedValue(blobs[1].sx);
  const b1cy = useSharedValue(blobs[1].sy);
  const b2cx = useSharedValue(blobs[2].sx);
  const b2cy = useSharedValue(blobs[2].sy);
  const b3cx = useSharedValue(blobs[3].sx);
  const b3cy = useSharedValue(blobs[3].sy);

  const b0x = useDerivedValue(() => b0cx.value);
  const b0y = useDerivedValue(() => b0cy.value);
  const b1x = useDerivedValue(() => b1cx.value);
  const b1y = useDerivedValue(() => b1cy.value);
  const b2x = useDerivedValue(() => b2cx.value);
  const b2y = useDerivedValue(() => b2cy.value);
  const b3x = useDerivedValue(() => b3cx.value);
  const b3y = useDerivedValue(() => b3cy.value);

  useEffect(() => {
    const drift = (sv: Animated.SharedValue<number>, from: number, range: number, d: number) => {
      sv.value = withDelay(d, withRepeat(
        withSequence(
          withSpring(from + range, { damping: 50, stiffness: 6 }),
          withSpring(from - range, { damping: 50, stiffness: 6 }),
        ), -1, true,
      ));
    };

    drift(b0cx, blobs[0].sx, blobs[0].dx, 0);
    drift(b0cy, blobs[0].sy, blobs[0].dy, 300);
    drift(b1cx, blobs[1].sx, blobs[1].dx, 600);
    drift(b1cy, blobs[1].sy, blobs[1].dy, 150);
    drift(b2cx, blobs[2].sx, blobs[2].dx, 400);
    drift(b2cy, blobs[2].sy, blobs[2].dy, 800);
    drift(b3cx, blobs[3].sx, blobs[3].dx, 500);
    drift(b3cy, blobs[3].sy, blobs[3].dy, 200);
  }, []);

  return (
    <View style={mgStyles.container}>
      <Canvas style={mgStyles.canvas}>
        <Fill color="#0A0A1A" />
        <Group>
          <Circle cx={b0x} cy={b0y} r={blobs[0].r} color={blobs[0].color} opacity={blobs[0].opacity}>
            <BlurMask blur={blobs[0].blur} style="normal" />
          </Circle>
        </Group>
        <Group>
          <Circle cx={b1x} cy={b1y} r={blobs[1].r} color={blobs[1].color} opacity={blobs[1].opacity}>
            <BlurMask blur={blobs[1].blur} style="normal" />
          </Circle>
        </Group>
        <Group>
          <Circle cx={b2x} cy={b2y} r={blobs[2].r} color={blobs[2].color} opacity={blobs[2].opacity}>
            <BlurMask blur={blobs[2].blur} style="normal" />
          </Circle>
        </Group>
        <Group>
          <Circle cx={b3x} cy={b3y} r={blobs[3].r} color={blobs[3].color} opacity={blobs[3].opacity}>
            <BlurMask blur={blobs[3].blur} style="normal" />
          </Circle>
        </Group>
      </Canvas>
      <View style={mgStyles.dim} />
    </View>
  );
}

const mgStyles = StyleSheet.create(() => ({
  container: {
    ...({ position: 'absolute' } as const),
    top: 0, left: 0, right: 0, bottom: 0,
  },
  canvas: {
    ...({ position: 'absolute' } as const),
    top: 0, left: 0, right: 0, bottom: 0,
  },
  dim: {
    ...({ position: 'absolute' } as const),
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(10,10,26,0.4)',
  },
}));
