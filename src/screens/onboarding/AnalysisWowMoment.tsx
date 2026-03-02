import { useEffect, useState, useRef } from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Canvas,
  Circle,
  BlurMask,
  vec,
  Line,
  LinearGradient,
} from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useDerivedValue,
  withSpring,
  withRepeat,
  withSequence,
  withDelay,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';
import * as Haptics from 'expo-haptics';

// --- Config ---

const GOLD = '#D4AF37';
const CORE_R = 36;
const RINGS = [
  { base: 64, drift: 6, sw: 1.2, oHi: 0.45, oLo: 0.15, delay: 0 },
  { base: 96, drift: 9, sw: 0.8, oHi: 0.30, oLo: 0.08, delay: 250 },
  { base: 128, drift: 12, sw: 0.5, oHi: 0.18, oLo: 0.04, delay: 500 },
];
const CANVAS_SIZE = (RINGS[2].base + RINGS[2].drift + 20) * 2; // ~340
const CX = CANVAS_SIZE / 2;

const MESSAGES = [
  'Syncing lifestyle logs...',
  'Calculating your wellness baseline...',
  'Identifying daily habits to track...',
  'Your score tracker is ready.',
];
const MSG_INTERVAL = 1200;
const AUTO_ADVANCE = MESSAGES.length * MSG_INTERVAL;

const BREATH = { damping: 30, stiffness: 10 };
const BREATH_FAST = { damping: 22, stiffness: 14 };

// --- Pulsing Core + Rings ---

function ScannerVisual() {
  // Core breathing
  const coreScale = useSharedValue(1);

  // Ring radii
  const r0 = useSharedValue(RINGS[0].base);
  const r1 = useSharedValue(RINGS[1].base);
  const r2 = useSharedValue(RINGS[2].base);

  // Ring opacities
  const o0 = useSharedValue(RINGS[0].oLo);
  const o1 = useSharedValue(RINGS[1].oLo);
  const o2 = useSharedValue(RINGS[2].oLo);

  useEffect(() => {
    // Core pulsing
    coreScale.value = withRepeat(
      withSequence(
        withSpring(1.18, BREATH_FAST),
        withSpring(0.88, BREATH_FAST),
      ), -1, true,
    );

    // Ring 0 — inner, fastest
    r0.value = withRepeat(withSequence(
      withSpring(RINGS[0].base + RINGS[0].drift, BREATH_FAST),
      withSpring(RINGS[0].base - RINGS[0].drift, BREATH_FAST),
    ), -1, true);
    o0.value = withRepeat(withSequence(
      withSpring(RINGS[0].oHi, BREATH_FAST),
      withSpring(RINGS[0].oLo, BREATH_FAST),
    ), -1, true);

    // Ring 1 — medium
    r1.value = withDelay(RINGS[1].delay, withRepeat(withSequence(
      withSpring(RINGS[1].base + RINGS[1].drift, BREATH),
      withSpring(RINGS[1].base - RINGS[1].drift, BREATH),
    ), -1, true));
    o1.value = withDelay(RINGS[1].delay, withRepeat(withSequence(
      withSpring(RINGS[1].oHi, BREATH),
      withSpring(RINGS[1].oLo, BREATH),
    ), -1, true));

    // Ring 2 — outer, slowest
    r2.value = withDelay(RINGS[2].delay, withRepeat(withSequence(
      withSpring(RINGS[2].base + RINGS[2].drift, { damping: 35, stiffness: 7 }),
      withSpring(RINGS[2].base - RINGS[2].drift, { damping: 35, stiffness: 7 }),
    ), -1, true));
    o2.value = withDelay(RINGS[2].delay, withRepeat(withSequence(
      withSpring(RINGS[2].oHi, { damping: 35, stiffness: 7 }),
      withSpring(RINGS[2].oLo, { damping: 35, stiffness: 7 }),
    ), -1, true));
  }, []);

  // Derived for Skia (numbers only — safe in worklets)
  const coreR = useDerivedValue(() => CORE_R * coreScale.value);
  const coreRInner = useDerivedValue(() => CORE_R * coreScale.value * 0.45);
  const dr0 = useDerivedValue(() => r0.value);
  const dr1 = useDerivedValue(() => r1.value);
  const dr2 = useDerivedValue(() => r2.value);
  const do0 = useDerivedValue(() => o0.value);
  const do1 = useDerivedValue(() => o1.value);
  const do2 = useDerivedValue(() => o2.value);

  return (
    <Canvas style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}>
      {/* Ring 2 — outermost */}
      <Circle cx={CX} cy={CX} r={dr2} color={GOLD} opacity={do2} style="stroke" strokeWidth={RINGS[2].sw} />

      {/* Ring 1 — middle */}
      <Circle cx={CX} cy={CX} r={dr1} color={GOLD} opacity={do1} style="stroke" strokeWidth={RINGS[1].sw} />

      {/* Ring 0 — inner */}
      <Circle cx={CX} cy={CX} r={dr0} color={GOLD} opacity={do0} style="stroke" strokeWidth={RINGS[0].sw} />

      {/* Core — deep bloom */}
      <Circle cx={CX} cy={CX} r={coreR} color={GOLD} opacity={0.15}>
        <BlurMask blur={30} style="normal" />
      </Circle>

      {/* Core — mid bloom */}
      <Circle cx={CX} cy={CX} r={coreR} color={GOLD} opacity={0.3}>
        <BlurMask blur={14} style="normal" />
      </Circle>

      {/* Core — hot center */}
      <Circle cx={CX} cy={CX} r={coreRInner} color={GOLD} opacity={0.85}>
        <BlurMask blur={3} style="normal" />
      </Circle>

      {/* Specular dot */}
      <Circle cx={CX} cy={CX} r={4} color="#FFFFFF" opacity={0.6}>
        <BlurMask blur={2} style="normal" />
      </Circle>
    </Canvas>
  );
}

// --- Cross-fade message ---

function FadingMessage({ text }: { text: string }) {
  return (
    <Animated.Text
      key={text}
      entering={FadeIn.duration(350)}
      exiting={FadeOut.duration(200)}
      style={st.msgText}
    >
      {text}
    </Animated.Text>
  );
}

// --- Main ---

export default function AnalysisWowMoment({ onNext }: { onNext: () => void }) {
  const insets = useSafeAreaInsets();
  const [msgIdx, setMsgIdx] = useState(0);
  const advanced = useRef(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Schedule messages 1-3 (0 shows immediately)
    for (let i = 1; i < MESSAGES.length; i++) {
      timers.push(setTimeout(() => {
        Haptics.selectionAsync();
        setMsgIdx(i);
      }, i * MSG_INTERVAL));
    }

    // Auto-advance after full sequence
    timers.push(setTimeout(() => {
      if (!advanced.current) {
        advanced.current = true;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onNext();
      }
    }, AUTO_ADVANCE));

    return () => timers.forEach(clearTimeout);
  }, [onNext]);

  return (
    <View style={[st.screen, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 40 }]}>
      <Animated.Text entering={FadeIn.duration(500)} style={st.label}>
        STEP 5 OF 6
      </Animated.Text>

      {/* Scanner visual — centered */}
      <View style={st.center}>
        <Animated.View entering={FadeIn.duration(700).delay(150)}>
          <ScannerVisual />
        </Animated.View>
      </View>

      {/* Bottom: message + dots */}
      <View style={st.bottom}>
        <View style={st.msgContainer}>
          <FadingMessage text={MESSAGES[msgIdx]} />
        </View>

        <View style={st.dots}>
          {MESSAGES.map((_, i) => (
            <View
              key={i}
              style={[
                st.dot,
                i <= msgIdx && { backgroundColor: GOLD },
                i === msgIdx && {
                  shadowColor: GOLD,
                  shadowOpacity: 0.8,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 0 },
                },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '300',
    letterSpacing: 3,
    color: theme.colors.textTertiary,
    alignSelf: 'flex-start',
    marginLeft: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: {
    alignItems: 'center',
    gap: theme.spacing.xl,
    paddingHorizontal: 40,
  },
  msgContainer: {
    minHeight: 22,
    alignItems: 'center',
  },
  msgText: {
    fontSize: 15,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
}));
