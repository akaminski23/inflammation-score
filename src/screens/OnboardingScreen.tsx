import { useCallback, useEffect, useRef } from 'react';
import { View, Text, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  Canvas,
  Circle,
  BlurMask,
  Fill,
  Group,
} from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useDerivedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  withSpring,
  withRepeat,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles';
import * as Haptics from 'expo-haptics';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

const SPRING_SNAPPY = { damping: 15, stiffness: 250 };

const PAGES = [
  {
    icon: 'pulse' as const,
    title: 'TRACK YOUR\nINFLAMMATION',
    subtitle: 'Daily scoring across sleep, stress, diet and exercise gives you a clear picture of your body\'s state.',
  },
  {
    icon: 'analytics' as const,
    title: 'DISCOVER\nYOUR PATTERNS',
    subtitle: 'Watch trends over time. See which factors affect your inflammation the most.',
  },
  {
    icon: 'leaf' as const,
    title: 'LIVE\nBETTER',
    subtitle: 'Small daily improvements compound into lasting health changes. Start with one score.',
  },
];

// --- Liquid Mesh Gradient (single Skia Canvas) ---

interface BlobConfig {
  color: string;
  radius: number;
  blur: number;
  opacity: number;
  startX: number;
  startY: number;
  driftX: number;
  driftY: number;
}

function MeshGradient({ screenW, screenH }: { screenW: number; screenH: number }) {
  const blobs: BlobConfig[] = [
    { color: '#50C878', radius: 200, blur: 90, opacity: 0.4,  startX: screenW * 0.15, startY: screenH * 0.2,  driftX: 70, driftY: 50 },
    { color: '#D4AF37', radius: 160, blur: 80, opacity: 0.35, startX: screenW * 0.8,  startY: screenH * 0.35, driftX: 55, driftY: 65 },
    { color: '#50C878', radius: 220, blur: 100, opacity: 0.3, startX: screenW * 0.45, startY: screenH * 0.72, driftX: 60, driftY: 45 },
    { color: '#0A0A1A', radius: 250, blur: 70, opacity: 0.6,  startX: screenW * 0.35, startY: screenH * 0.5,  driftX: 50, driftY: 40 },
  ];

  // Individual shared values (no hooks in loops)
  const b0cx = useSharedValue(blobs[0].startX);
  const b0cy = useSharedValue(blobs[0].startY);
  const b1cx = useSharedValue(blobs[1].startX);
  const b1cy = useSharedValue(blobs[1].startY);
  const b2cx = useSharedValue(blobs[2].startX);
  const b2cy = useSharedValue(blobs[2].startY);
  const b3cx = useSharedValue(blobs[3].startX);
  const b3cy = useSharedValue(blobs[3].startY);

  // Derived values for Skia (just reading shared values — no Skia API calls)
  const b0x = useDerivedValue(() => b0cx.value);
  const b0y = useDerivedValue(() => b0cy.value);
  const b1x = useDerivedValue(() => b1cx.value);
  const b1y = useDerivedValue(() => b1cy.value);
  const b2x = useDerivedValue(() => b2cx.value);
  const b2y = useDerivedValue(() => b2cy.value);
  const b3x = useDerivedValue(() => b3cx.value);
  const b3y = useDerivedValue(() => b3cy.value);

  useEffect(() => {
    const drift = (
      sv: Animated.SharedValue<number>,
      from: number,
      range: number,
      delay: number,
    ) => {
      sv.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withSpring(from + range, { damping: 50, stiffness: 6 }),
            withSpring(from - range, { damping: 50, stiffness: 6 }),
          ),
          -1,
          true,
        ),
      );
    };

    drift(b0cx, blobs[0].startX, blobs[0].driftX, 0);
    drift(b0cy, blobs[0].startY, blobs[0].driftY, 300);
    drift(b1cx, blobs[1].startX, blobs[1].driftX, 600);
    drift(b1cy, blobs[1].startY, blobs[1].driftY, 150);
    drift(b2cx, blobs[2].startX, blobs[2].driftX, 400);
    drift(b2cy, blobs[2].startY, blobs[2].driftY, 800);
    drift(b3cx, blobs[3].startX, blobs[3].driftX, 500);
    drift(b3cy, blobs[3].startY, blobs[3].driftY, 200);
  }, []);

  return (
    <View style={s.meshContainer}>
      <Canvas style={s.meshCanvas}>
        <Fill color="#0A0A1A" />

        {/* Emerald primary — top left drift */}
        <Group>
          <Circle cx={b0x} cy={b0y} r={blobs[0].radius} color={blobs[0].color} opacity={blobs[0].opacity}>
            <BlurMask blur={blobs[0].blur} style="normal" />
          </Circle>
        </Group>

        {/* Gold accent — right side */}
        <Group>
          <Circle cx={b1x} cy={b1y} r={blobs[1].radius} color={blobs[1].color} opacity={blobs[1].opacity}>
            <BlurMask blur={blobs[1].blur} style="normal" />
          </Circle>
        </Group>

        {/* Emerald secondary — bottom area */}
        <Group>
          <Circle cx={b2x} cy={b2y} r={blobs[2].radius} color={blobs[2].color} opacity={blobs[2].opacity}>
            <BlurMask blur={blobs[2].blur} style="normal" />
          </Circle>
        </Group>

        {/* Midnight void — center absorber */}
        <Group>
          <Circle cx={b3x} cy={b3y} r={blobs[3].radius} color={blobs[3].color} opacity={blobs[3].opacity}>
            <BlurMask blur={blobs[3].blur} style="normal" />
          </Circle>
        </Group>
      </Canvas>

      {/* Subtle dimming for text legibility */}
      <View style={s.meshDim} />
    </View>
  );
}

// --- Page Dot ---

function PageDot({
  index,
  scrollX,
  screenW,
}: {
  index: number;
  scrollX: Animated.SharedValue<number>;
  screenW: number;
}) {
  const theme = UnistylesRuntime.getTheme();

  const animStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * screenW, index * screenW, (index + 1) * screenW];

    const width = interpolate(scrollX.value, inputRange, [8, 24, 8], 'clamp');
    const opacity = interpolate(scrollX.value, inputRange, [0.3, 1, 0.3], 'clamp');

    return { width, opacity };
  });

  return (
    <Animated.View
      style={[
        s.pageDot,
        { backgroundColor: theme.colors.accent },
        animStyle,
      ]}
    />
  );
}

// --- Slide ---

function Slide({
  page,
  index,
  screenW,
  scrollX,
  topPadding,
}: {
  page: (typeof PAGES)[number];
  index: number;
  screenW: number;
  scrollX: Animated.SharedValue<number>;
  topPadding: number;
}) {
  const theme = UnistylesRuntime.getTheme();

  const contentStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 0.5) * screenW, index * screenW, (index + 0.5) * screenW];
    const translateY = interpolate(scrollX.value, inputRange, [30, 0, 30], 'clamp');
    const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0], 'clamp');
    return { transform: [{ translateY }], opacity };
  });

  return (
    <View style={[s.slide, { width: screenW }]}>
      <Animated.View style={[s.slideContent, { paddingTop: topPadding }, contentStyle]}>
        <View style={s.iconCircle}>
          <Ionicons name={page.icon} size={32} color={theme.colors.accent} />
        </View>

        <Text style={s.pageTitle}>{page.title}</Text>
        <Text style={s.pageSubtitle}>{page.subtitle}</Text>
      </Animated.View>
    </View>
  );
}

// --- Main ---

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useSharedValue(0);
  const currentPage = useSharedValue(0);
  const lastPage = useRef(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
      currentPage.value = Math.round(event.contentOffset.x / screenW);
    },
  });

  const handleMomentumEnd = useCallback((e: any) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / screenW);
    if (page !== lastPage.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      lastPage.current = page;
    }
  }, [screenW]);

  const buttonScale = useSharedValue(1);
  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleNext = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    buttonScale.value = withSpring(0.92, SPRING_SNAPPY, () => {
      buttonScale.value = withSpring(1, SPRING_SNAPPY);
    });

    const page = lastPage.current;
    if (page >= PAGES.length - 1) {
      onComplete();
    } else {
      const nextPage = page + 1;
      scrollRef.current?.scrollTo({ x: nextPage * screenW, animated: true });
      lastPage.current = nextPage;
    }
  }, [screenW, onComplete, buttonScale]);

  return (
    <View style={s.screen}>
      <MeshGradient screenW={screenW} screenH={screenH} />

      <AnimatedScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleMomentumEnd}
        style={s.scrollView}
      >
        {PAGES.map((page, index) => (
          <Slide
            key={index}
            page={page}
            index={index}
            screenW={screenW}
            scrollX={scrollX}
            topPadding={insets.top + 120}
          />
        ))}
      </AnimatedScrollView>

      {/* Bottom controls */}
      <View style={[s.bottomArea, { paddingBottom: insets.bottom + 24 }]}>
        <View style={s.dotsRow}>
          {PAGES.map((_, i) => (
            <PageDot key={i} index={i} scrollX={scrollX} screenW={screenW} />
          ))}
        </View>

        <Animated.View style={buttonAnimStyle}>
          <Pressable
            onPress={handleNext}
            style={({ pressed }) => [s.button, pressed && { opacity: 0.85 }]}
          >
            <ButtonLabel scrollX={scrollX} screenW={screenW} />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

function ButtonLabel({
  scrollX,
  screenW,
}: {
  scrollX: Animated.SharedValue<number>;
  screenW: number;
}) {
  const lastPageStart = (PAGES.length - 1) * screenW;

  const labelStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollX.value,
      [lastPageStart - screenW * 0.5, lastPageStart],
      [1, 0],
      'clamp',
    );
    return { opacity };
  });

  const getStartedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollX.value,
      [lastPageStart - screenW * 0.5, lastPageStart],
      [0, 1],
      'clamp',
    );
    return { opacity };
  });

  return (
    <View style={s.buttonInner}>
      <Animated.View style={[s.buttonLabelWrap, labelStyle]}>
        <Text style={s.buttonText}>Continue</Text>
        <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
      </Animated.View>
      <Animated.View style={[s.buttonLabelWrap, s.buttonLabelAbsolute, getStartedStyle]}>
        <Text style={s.buttonText}>Get Started</Text>
        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
  meshContainer: {
    ...({ position: 'absolute' } as const),
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  meshCanvas: {
    ...({ position: 'absolute' } as const),
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  meshDim: {
    ...({ position: 'absolute' } as const),
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10,10,26,0.4)',
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    flex: 1,
  },
  slideContent: {
    flex: 1,
    paddingHorizontal: 40,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(80,200,120,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
    borderWidth: 0.5,
    borderColor: 'rgba(80,200,120,0.2)',
  },
  pageTitle: {
    fontSize: 38,
    fontWeight: '200',
    letterSpacing: 5,
    color: '#FFFFFF',
    marginBottom: theme.spacing.lg,
    lineHeight: 48,
  },
  pageSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: theme.colors.textSecondary,
    lineHeight: 24,
    letterSpacing: 0.3,
  },
  bottomArea: {
    paddingHorizontal: 40,
    gap: theme.spacing.xl,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  pageDot: {
    height: 8,
    borderRadius: 4,
    borderCurve: 'continuous',
  },
  button: {
    borderRadius: theme.radius.button,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 18,
  },
  buttonInner: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 22,
  },
  buttonLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  buttonLabelAbsolute: {
    ...({ position: 'absolute' } as const),
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '400',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
}));
