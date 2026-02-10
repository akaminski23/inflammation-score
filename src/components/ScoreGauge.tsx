import { useEffect } from 'react';
import { View } from 'react-native';
import {
  Canvas,
  Path,
  Skia,
  SweepGradient,
  BlurMask,
  vec,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  useDerivedValue,
  withSpring,
} from 'react-native-reanimated';

const SPRING_SYNCED = { damping: 40, stiffness: 160 };

const ARC_START = 135;
const ARC_SWEEP = 270;

const COLORS = {
  ruby: '#E0115F',
  gold: '#D4AF37',
  emerald: '#50C878',
};

function createArcPath(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  sweepAngle: number,
): string {
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = ((startAngle + sweepAngle) * Math.PI) / 180;

  const x1 = cx + radius * Math.cos(startRad);
  const y1 = cy + radius * Math.sin(startRad);
  const x2 = cx + radius * Math.cos(endRad);
  const y2 = cy + radius * Math.sin(endRad);

  const largeArc = sweepAngle > 180 ? 1 : 0;

  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
}

interface ScoreGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  color: string;
}

export default function ScoreGauge({
  score,
  size = 180,
  strokeWidth = 6,
  color,
}: ScoreGaugeProps) {
  const progress = useSharedValue(0);
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - strokeWidth * 2) / 2;

  useEffect(() => {
    progress.value = withSpring(score / 100, SPRING_SYNCED);
  }, [score, progress]);

  const fullArcPath = Skia.Path.MakeFromSVGString(
    createArcPath(cx, cy, radius, ARC_START, ARC_SWEEP)
  );

  // Animate only the `end` trim value (0-1) — no Skia calls in worklet
  const end = useDerivedValue(() => {
    return Math.max(progress.value, 0.01);
  });

  if (!fullArcPath) return <View style={{ width: size, height: size }} />;

  return (
    <Canvas style={{ width: size, height: size }}>
      {/* Background track */}
      <Path
        path={fullArcPath}
        style="stroke"
        strokeWidth={0.5}
        strokeCap="round"
        color="rgba(255,255,255,0.05)"
      />

      {/* Glow layer */}
      <Path
        path={fullArcPath}
        style="stroke"
        strokeWidth={strokeWidth + 8}
        strokeCap="round"
        color={color}
        opacity={0.3}
        start={0}
        end={end}
      >
        <BlurMask blur={15} style="normal" />
      </Path>

      {/* Main arc with gradient */}
      <Path
        path={fullArcPath}
        style="stroke"
        strokeWidth={strokeWidth}
        strokeCap="round"
        start={0}
        end={end}
      >
        <SweepGradient
          c={vec(cx, cy)}
          colors={[
            COLORS.emerald,  // 0° (right)
            COLORS.emerald,  // 45° — arc END = high score = green
            COLORS.ruby,     // 135° — arc START = low score = red
            COLORS.gold,     // ~200° — middle of arc
            COLORS.emerald,  // ~306° — upper arc
            COLORS.emerald,  // 360° wraps back to green
          ]}
          positions={[0, 0.125, 0.375, 0.56, 0.85, 1]}
        />
      </Path>
    </Canvas>
  );
}
