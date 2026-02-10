import { useEffect, useState, useRef } from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Canvas,
  Circle,
  BlurMask,
} from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useDerivedValue,
  useAnimatedStyle,
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
const CORE_RADIUS = 40;
const RING_RADII = [70, 100, 130];

const MESSAGES = [
  'Syncing lifestyle logs...',
  'Analyzing atmospheric correlations...',
  'Identifying wellness patterns...',
  'Analytics profile ready.',
];

const MSG_INTERVAL = 1200;
const AUTO_ADVANCE_DELAY = MESSAGES.length * MSG_INTERVAL + 800;

const BREATHING = { damping: 25, stiffness: 12 };

// --- Scanning Rings (Skia) ---

function PulsingCore({ cx, cy }: { cx: number; cy: number }) {
  const coreScale = useSharedValue(1);
  const ring0 = useSharedValue(RING_RADII[0]);
  const ring1 = useSharedValue(RING_RADII[1]);
  const ring2 = useSharedValue(RING_RADII[2]);
  const ring0o = useSharedValue(0.4);
  const ring1o = useSharedValue(0.25);
  const ring2o = useSharedValue(0.15);

  useEffect(() => {
    // Core breathing
    coreScale.value = withRepeat(
      withSequence(
        withSpring(1.15, BREATHING),
        withSpring(0.9, BREATHING),
      ), -1, true,
    );

    // Ring 0 — fastest breathing
    ring0.value = withRepeat(
      withSequence(
        withSpring(RING_RADII[0] + 8, { damping: 20, stiffness: 14 }),
        withSpring(RING_RADII[0] - 4, { damping: 20, stiffness: 14 }),
      ), -1, true,
    );
    ring0o.value = withRepeat(
      withSequence(
        withSpring(0.5, BREATHING),
        withSpring(0.2, BREATHING),
      ), -1, true,
    );

    // Ring 1 — medium
    ring1.value = withDelay(200, withRepeat(
      withSequence(
        withSpring(RING_RADII[1] + 10, { damping: 22, stiffness: 10 }),
        withSpring(RING_RADII[1] - 6, { damping: 22, stiffness: 10 }),
      ), -1, true,
    ));
    ring1o.value = withDelay(200, withRepeat(
      withSequence(
        withSpring(0.35, BREATHING),
        withSpring(0.12, BREATHING),
      ), -1, true,
    ));

    // Ring 2 — slowest, widest sweep
    ring2.value = withDelay(400, withRepeat(
      withSequence(
        withSpring(RING_RADII[2] + 14, { damping: 28, stiffness: 8 }),
        withSpring(RING_RADII[2] - 8, { damping: 28, stiffness: 8 }),
      ), -1, true,
    ));
    ring2o.value = withDelay(400, withRepeat(
      withSequence(
        withSpring(0.22, BREATHING),
        withSpring(0.06, BREATHING),
      ), -1, true,
    ));
  }, []);

  // Derived values for Skia
  const coreR = useDerivedValue(() => CORE_RADIUS * coreScale.value);
  const r0 = useDerivedValue(() => ring0.value);
  const r1 = useDerivedValue(() => ring1.value);
  const r2 = useDerivedValue(() => ring2.value);
  const o0 = useDerivedValue(() => ring0o.value);
  const o1 = useDerivedValue(() => ring1o.value);
  const o2 = useDerivedValue(() => ring2o.value);

  const canvasSize = (RING_RADII[2] + 30) * 2;

  return (
    <Canvas style={{ width: canvasSize, height: canvasSize }}>
      {/* Outermost ring */}
      <Circle cx={canvasSize / 2} cy={canvasSize / 2} r={r2} color={GOLD} opacity={o2} style="stroke" strokeWidth={0.5} />

      {/* Middle ring */}
      <Circle cx={canvasSize / 2} cy={canvasSize / 2} r={r1} color={GOLD} opacity={o1} style="stroke" strokeWidth={0.8} />

      {/* Inner ring */}
      <Circle cx={canvasSize / 2} cy={canvasSize / 2} r={r0} color={GOLD} opacity={o0} style="stroke" strokeWidth={1} />

      {/* Core glow — outer bloom */}
      <Circle cx={canvasSize / 2} cy={canvasSize / 2} r={coreR} color={GOLD} opacity={0.2}>
        <BlurMask blur={25} style="normal" />
      </Circle>

      {/* Core glow — inner bloom */}
      <Circle cx={canvasSize / 2} cy={canvasSize / 2} r={coreR} color={GOLD} opacity={0.35}>
        <BlurMask blur={12} style="normal" />
      </Circle>

      {/* Core solid */}
      <Circle cx={canvasSize / 2} cy={canvasSize / 2} r={useDerivedValue(() => coreR.value * 0.5)} color={GOLD} opacity={0.8}>
        <BlurMask blur={4} style="normal" />
      </Circle>
    </Canvas>
  );
}

// --- Cross-fading Text ---

function CrossFadeText({ text }: { text: string }) {
  return (
    <Animated.Text
      key={text}
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      style={st.messageText}
    >
      {text}
    </Animated.Text>
  );
}

// --- Main ---

export default function AnalysisStep({ onNext }: { onNext: () => void }) {
  const { width: screenW } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [msgIndex, setMsgIndex] = useState(0);
  const hasAdvanced = useRef(false);

  // Message sequence + haptics
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    MESSAGES.forEach((_, i) => {
      if (i === 0) return; // first message shown immediately
      timers.push(setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setMsgIndex(i);
      }, i * MSG_INTERVAL));
    });

    // Auto-advance to next step
    timers.push(setTimeout(() => {
      if (!hasAdvanced.current) {
        hasAdvanced.current = true;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onNext();
      }
    }, AUTO_ADVANCE_DELAY));

    return () => timers.forEach(clearTimeout);
  }, [onNext]);

  return (
    <View style={[st.container, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 }]}>
      {/* Label */}
      <Animated.Text entering={FadeIn.duration(600)} style={st.label}>
        STEP 5 OF 6
      </Animated.Text>

      {/* Pulsing Core — centered */}
      <View style={st.coreContainer}>
        <Animated.View entering={FadeIn.duration(800).delay(200)}>
          <PulsingCore cx={screenW / 2} cy={screenW / 2} />
        </Animated.View>
      </View>

      {/* Dynamic text at bottom */}
      <View style={st.textArea}>
        <CrossFadeText text={MESSAGES[msgIndex]} />

        {/* Progress dots */}
        <View style={st.dotsRow}>
          {MESSAGES.map((_, i) => (
            <View
              key={i}
              style={[
                st.progressDot,
                i <= msgIndex && { backgroundColor: GOLD },
                i === msgIndex && {
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
  container: {
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
  coreContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textArea: {
    alignItems: 'center',
    gap: theme.spacing.lg,
    paddingHorizontal: 40,
  },
  messageText: {
    fontSize: 15,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.5,
    textAlign: 'center',
    minHeight: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
}));
