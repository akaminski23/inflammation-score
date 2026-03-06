import { useMemo, useState, useCallback, useRef } from 'react';
import { View, Text } from 'react-native';
import {
  Canvas,
  Path,
  Line as SkiaLine,
  LinearGradient,
  Circle,
  BlurMask,
  vec,
  Skia,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';
import * as Haptics from 'expo-haptics';
import type { Entry } from '../db/schema';
import { getScoreColor, getScoreColorAlpha } from '../lib/colors';

const CHART_H = 180;
const PAD = 20;
const PAD_LEFT = 32;
const PAD_TOP = 24;
const Y_TICKS = [0, 25, 50, 75, 100];
const SPRING_SNAPPY = { damping: 15, stiffness: 250 };

interface Props {
  data: Entry[];
  width: number;
}

// Catmull-Rom → cubic bezier control points
function catmullRom(
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
) {
  const a = 1 / 6;
  return {
    cp1: [p1[0] + a * (p2[0] - p0[0]), p1[1] + a * (p2[1] - p0[1])] as [number, number],
    cp2: [p2[0] - a * (p3[0] - p1[0]), p2[1] - a * (p3[1] - p1[1])] as [number, number],
  };
}

function formatLabel(dateStr: string): string {
  const today = new Date();
  const key = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
  if (dateStr === key) return 'Today';
  const [, m, d] = dateStr.split('-');
  const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[+m]} ${+d}`;
}

export default function AreaChart({ data, width }: Props) {
  const plotW = width - PAD_LEFT - PAD;
  const plotH = CHART_H - PAD_TOP - PAD;

  // Last 7, oldest first
  const chartEntries = useMemo(() => data.slice(0, 7).reverse(), [data]);

  const pts = useMemo(() => {
    if (chartEntries.length < 2) return [];
    const step = plotW / (chartEntries.length - 1);
    return chartEntries.map((e, i) => ({
      x: PAD_LEFT + i * step,
      y: PAD_TOP + plotH - (e.score / 100) * plotH,
      score: e.score,
      date: e.date,
    }));
  }, [chartEntries, plotW, plotH]);

  // Score-based gradient colors & positions (horizontal, along X axis)
  const { lineColors, fillColors, gradPositions, gradStart, gradEnd } = useMemo(() => {
    if (pts.length < 2) return { lineColors: [], fillColors: [], gradPositions: [], gradStart: vec(0, 0), gradEnd: vec(0, 0) };
    const firstX = pts[0].x;
    const lastX = pts[pts.length - 1].x;
    const range = lastX - firstX;
    return {
      lineColors: pts.map((p) => getScoreColor(p.score)),
      fillColors: pts.map((p) => getScoreColorAlpha(p.score, 0.15)),
      gradPositions: pts.map((p) => (p.x - firstX) / range),
      gradStart: vec(firstX, 0),
      gradEnd: vec(lastX, 0),
    };
  }, [pts]);

  // Build paths on JS thread (safe — never in worklets)
  const { line, fill } = useMemo(() => {
    if (pts.length < 2) return { line: null, fill: null };

    const lp = Skia.Path.Make();
    const fp = Skia.Path.Make();
    const bottomY = CHART_H - PAD;

    lp.moveTo(pts[0].x, pts[0].y);
    fp.moveTo(pts[0].x, bottomY);
    fp.lineTo(pts[0].x, pts[0].y);

    for (let i = 0; i < pts.length - 1; i++) {
      const clamp = (j: number) => Math.max(0, Math.min(pts.length - 1, j));
      const p0: [number, number] = [pts[clamp(i - 1)].x, pts[clamp(i - 1)].y];
      const p1: [number, number] = [pts[i].x, pts[i].y];
      const p2: [number, number] = [pts[i + 1].x, pts[i + 1].y];
      const p3: [number, number] = [pts[clamp(i + 2)].x, pts[clamp(i + 2)].y];

      const { cp1, cp2 } = catmullRom(p0, p1, p2, p3);
      lp.cubicTo(cp1[0], cp1[1], cp2[0], cp2[1], p2[0], p2[1]);
      fp.cubicTo(cp1[0], cp1[1], cp2[0], cp2[1], p2[0], p2[1]);
    }

    fp.lineTo(pts[pts.length - 1].x, bottomY);
    fp.close();

    return { line: lp, fill: fp };
  }, [pts]);

  // --- Interaction ---
  const showAmt = useSharedValue(0);
  const [active, setActive] = useState<{
    x: number;
    y: number;
    score: number;
    date: string;
  } | null>(null);
  const prevIdx = useRef(-1);

  const snap = useCallback(
    (x: number) => {
      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i < pts.length; i++) {
        const d = Math.abs(x - pts[i].x);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      if (best !== prevIdx.current) {
        prevIdx.current = best;
        Haptics.selectionAsync();
      }
      setActive(pts[best]);
    },
    [pts],
  );

  const deactivate = useCallback(() => {
    prevIdx.current = -1;
    setActive(null);
  }, []);

  const pan = Gesture.Pan()
    .activateAfterLongPress(120)
    .onBegin((e) => {
      showAmt.value = withSpring(1, SPRING_SNAPPY);
      runOnJS(snap)(e.x);
    })
    .onUpdate((e) => {
      runOnJS(snap)(e.x);
    })
    .onFinalize(() => {
      showAmt.value = withSpring(0, SPRING_SNAPPY);
      runOnJS(deactivate)();
    });

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: showAmt.value,
  }));

  if (pts.length < 2 || !line || !fill) return null;

  const activeColor = active ? getScoreColor(active.score) : '#50C878';

  return (
    <View style={st.container}>
      {/* Skia canvas */}
      {/* Y-axis labels (RN Text, positioned absolutely) */}
      <View style={st.yLabelsWrap} pointerEvents="none">
        {Y_TICKS.map((tick) => {
          const yPos = PAD_TOP + plotH - (tick / 100) * plotH;
          return (
            <Text
              key={tick}
              style={[st.yLabel, { top: yPos - 6 }]}
              numberOfLines={1}
            >
              {tick}
            </Text>
          );
        })}
      </View>

      <Canvas style={{ width, height: CHART_H }}>
        {/* Horizontal guide lines */}
        {Y_TICKS.map((tick) => {
          const yPos = PAD_TOP + plotH - (tick / 100) * plotH;
          return (
            <SkiaLine
              key={tick}
              p1={vec(PAD_LEFT, yPos)}
              p2={vec(width - PAD, yPos)}
              color="rgba(255,255,255,0.06)"
              strokeWidth={0.5}
            />
          );
        })}

        {/* Gradient fill under line — score-colored */}
        <Path path={fill}>
          <LinearGradient
            start={gradStart}
            end={gradEnd}
            colors={fillColors}
            positions={gradPositions}
          />
        </Path>

        {/* Glow bloom behind line — score-colored */}
        <Path path={line} style="stroke" strokeWidth={4} opacity={0.25}>
          <LinearGradient
            start={gradStart}
            end={gradEnd}
            colors={lineColors}
            positions={gradPositions}
          />
          <BlurMask blur={8} style="normal" />
        </Path>

        {/* Sharp spline line — score-colored gradient */}
        <Path
          path={line}
          style="stroke"
          strokeWidth={1.5}
          strokeCap="round"
          strokeJoin="round"
        >
          <LinearGradient
            start={gradStart}
            end={gradEnd}
            colors={lineColors}
            positions={gradPositions}
          />
        </Path>

        {/* Data dots — individually colored by score */}
        {pts.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3} color={getScoreColor(p.score)} />
        ))}
      </Canvas>

      {/* Gesture overlay (transparent, catches pan) */}
      <GestureDetector gesture={pan}>
        <Animated.View style={st.gestureOverlay}>
          {active && (
            <Animated.View style={[st.overlayContent, overlayStyle]}>
              {/* Laser line — colored by active score */}
              <View style={[st.laserWrap, { left: active.x }]}>
                <View style={[st.laserSharp, { backgroundColor: `${activeColor}80` }]} />
                <View style={[st.laserGlow, { backgroundColor: `${activeColor}26` }]} />
              </View>

              {/* Active dot — colored & glowing */}
              <View
                style={[
                  st.activeDot,
                  {
                    left: active.x - 5,
                    top: active.y - 5,
                    backgroundColor: activeColor,
                    shadowColor: activeColor,
                  },
                ]}
              />

              {/* Sapphire-glass tooltip */}
              <View
                style={[
                  st.tooltip,
                  {
                    left: Math.min(Math.max(active.x - 44, 8), width - 96),
                    top: Math.max(active.y - 66, 4),
                    borderColor: `${activeColor}40`,
                  },
                ]}
              >
                <Text style={[st.tooltipScore, { color: activeColor }]}>{active.score}</Text>
                <Text style={st.tooltipDate}>{formatLabel(active.date)}</Text>
              </View>
            </Animated.View>
          )}
        </Animated.View>
      </GestureDetector>

      {/* X-axis date labels */}
      <View style={[st.labels, { paddingLeft: PAD_LEFT, paddingRight: PAD }]}>
        {pts.map((p, i) => (
          <Text
            key={i}
            style={st.labelText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {formatLabel(p.date)}
          </Text>
        ))}
      </View>
    </View>
  );
}

const st = StyleSheet.create((theme) => ({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderCurve: 'continuous',
    borderWidth: 0.5,
    borderColor: theme.colors.surfaceBorder,
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    overflow: 'hidden',
  },
  gestureOverlay: {
    ...({ position: 'absolute' } as const),
    top: 0,
    left: 0,
    right: 0,
    height: CHART_H,
  },
  overlayContent: {
    ...({ position: 'absolute' } as const),
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  laserWrap: {
    ...({ position: 'absolute' } as const),
    top: 0,
    bottom: 0,
    width: 1,
  },
  laserSharp: {
    flex: 1,
    width: 1,
  },
  laserGlow: {
    ...({ position: 'absolute' } as const),
    top: 0,
    bottom: 0,
    left: -2,
    width: 5,
  },
  activeDot: {
    ...({ position: 'absolute' } as const),
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  tooltip: {
    ...({ position: 'absolute' } as const),
    backgroundColor: 'rgba(12,12,28,0.92)',
    borderRadius: theme.radius.chip,
    borderCurve: 'continuous',
    borderWidth: 0.5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  tooltipScore: {
    fontSize: 20,
    fontWeight: '200',
    letterSpacing: -0.5,
  },
  tooltipDate: {
    fontSize: 10,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  yLabelsWrap: {
    ...({ position: 'absolute' } as const),
    top: 0,
    left: 0,
    bottom: 0,
    width: PAD_LEFT,
    zIndex: 10,
  },
  yLabel: {
    ...({ position: 'absolute' } as const),
    left: 4,
    fontSize: 9,
    fontFamily: 'SFMono-Regular',
    fontWeight: '300',
    color: theme.colors.textTertiary,
    letterSpacing: -0.5,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  labelText: {
    fontSize: 10,
    fontWeight: '300',
    color: theme.colors.textTertiary,
    textAlign: 'center',
    width: 40,
  },
}));
