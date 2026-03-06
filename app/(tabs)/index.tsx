import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from '../../src/db/client';
import { entries } from '../../src/db/schema';
import ScoreGauge from '../../src/components/ScoreGauge';
import RollingNumber from '../../src/components/ui/RollingNumber';
import { getScoreColorThemed, getValueColor } from '../../src/lib/colors';

const FACTORS = [
  { key: 'sleep', label: 'Sleep Quality', icon: 'moon' as const, description: 'How well did you sleep?', inverted: false },
  { key: 'stress', label: 'Stress Level', icon: 'thunderstorm' as const, description: '1 = calm, 10 = very stressed', inverted: true },
  { key: 'diet', label: 'Diet Quality', icon: 'nutrition' as const, description: 'How anti-inflammatory was your diet?', inverted: false },
  { key: 'exercise', label: 'Exercise', icon: 'fitness' as const, description: 'How active were you?', inverted: false },
] as const;

const SPRING_SNAPPY = { damping: 15, stiffness: 250 };

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Moderate';
  if (score >= 20) return 'Elevated';
  return 'High Risk';
}

function calculateScore(values: Record<string, number>): number {
  let total = 0;
  let count = 0;
  for (const factor of FACTORS) {
    const val = values[factor.key] ?? 5;
    const normalized = factor.inverted ? (11 - val) : val;
    total += normalized;
    count++;
  }
  return Math.round((total / (count * 10)) * 100);
}

function AnimatedDot({
  active,
  color,
  onPress,
}: {
  active: boolean;
  color: string;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(active ? 1.15 : 1, SPRING_SNAPPY);
  }, [active, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable onPress={onPress} hitSlop={4} style={styles.dotTouchArea}>
      <Animated.View
        style={[
          styles.dot,
          animStyle,
          active && {
            backgroundColor: color,
          },
        ]}
      />
    </Pressable>
  );
}

function SliderRow({
  factor,
  value,
  onValueChange,
}: {
  factor: (typeof FACTORS)[number];
  value: number;
  onValueChange: (val: number) => void;
}) {
  const cardColor = getValueColor(value, factor.inverted);
  const iconScale = useSharedValue(1);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      prevValue.current = value;
      iconScale.value = withSpring(1.1, SPRING_SNAPPY, () => {
        iconScale.value = withSpring(1, SPRING_SNAPPY);
      });
    }
  }, [value, iconScale]);

  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const outlineIcon = `${factor.icon}-outline` as const;

  return (
    <View style={styles.sliderCard}>
      <View style={styles.sliderHeader}>
        <Animated.View style={[styles.iconWrap, iconAnimStyle]}>
          <Ionicons name={outlineIcon as any} size={22} color={cardColor} />
        </Animated.View>
        <View style={styles.sliderLabels}>
          <Text style={styles.sliderTitle}>{factor.label}</Text>
          <Text style={styles.sliderDescription}>{factor.description}</Text>
        </View>
        <Text style={[styles.sliderValue, { color: cardColor }]}>{value}</Text>
      </View>
      <View style={styles.dotsRow}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((dot) => (
          <AnimatedDot
            key={dot}
            active={dot <= value}
            color={cardColor}
            onPress={() => {
              Haptics.selectionAsync();
              onValueChange(dot);
            }}
          />
        ))}
      </View>
    </View>
  );
}

export default function ScoreScreen() {
  const insets = useSafeAreaInsets();
  const theme = UnistylesRuntime.getTheme();
  const todayKey = getTodayKey();

  const { data: todayEntries } = useLiveQuery(
    db.select().from(entries).where(eq(entries.date, todayKey))
  );
  const todayEntry = todayEntries?.[0];

  const [values, setValues] = useState<Record<string, number>>({
    sleep: 5,
    stress: 5,
    diet: 5,
    exercise: 5,
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (todayEntry) {
      setValues({
        sleep: todayEntry.sleep,
        stress: todayEntry.stress,
        diet: todayEntry.diet,
        exercise: todayEntry.exercise,
      });
      setSubmitted(true);
    }
  }, [todayEntry]);

  const scoreScale = useSharedValue(1);
  const score = calculateScore(values);
  const scoreColor = getScoreColorThemed(score);

  const scoreAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scoreScale.value }],
  }));

  const handleValueChange = useCallback((key: string, val: number) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    setSubmitted(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scoreScale.value = withSpring(1.15, SPRING_SNAPPY, () => {
      scoreScale.value = withSpring(1, SPRING_SNAPPY);
    });

    const data = {
      date: todayKey,
      sleep: values.sleep,
      stress: values.stress,
      diet: values.diet,
      exercise: values.exercise,
      score,
    };

    try {
      await db
        .insert(entries)
        .values(data)
        .onConflictDoUpdate({
          target: entries.date,
          set: data,
        });

      setSubmitted(true);
    } catch {
      Alert.alert('Save Failed', 'Could not save your score. Please try again.');
    }
  }, [scoreScale, todayKey, values, score]);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 48, paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(600).delay(0)}>
          <Text style={styles.headerTitle}>INFLAMMATION</Text>
          <Text style={[styles.headerScore, { color: scoreColor }]}>SCORE</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(600).delay(100)}
          style={styles.scoreContainer}
        >
          <Animated.View style={[styles.scoreCircle, scoreAnimStyle]}>
            <ScoreGauge score={score} size={180} strokeWidth={6} color={scoreColor} />
            <View style={styles.scoreTextOverlay}>
              <RollingNumber value={score} fontSize={56} color={scoreColor} />
              <Text style={styles.scoreUnit}>/ 100</Text>
            </View>
          </Animated.View>
          <Text style={[styles.scoreLabel, { color: scoreColor }]}>
            {getScoreLabel(score)}
          </Text>
          <Text style={styles.scoreHint}>
            {todayEntry ? 'Updated today. Tap to adjust.' : 'Higher is better. Track daily for trends.'}
          </Text>
        </Animated.View>

        {FACTORS.map((factor, index) => (
          <Animated.View
            key={factor.key}
            entering={FadeInDown.duration(500).delay(200 + index * 80)}
          >
            <SliderRow
              factor={factor}
              value={values[factor.key]}
              onValueChange={(val) => handleValueChange(factor.key, val)}
            />
          </Animated.View>
        ))}

        <Animated.View entering={FadeInDown.duration(500).delay(550)}>
          <Pressable
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.submitButton,
              {
                backgroundColor: scoreColor,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Ionicons
              name={submitted ? 'checkmark-circle' : 'add-circle'}
              size={22}
              color={theme.colors.bg}
            />
            <Text style={styles.submitText}>
              {submitted ? (todayEntry ? 'Update Score' : 'Logged!') : 'Log Today\'s Score'}
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
  },
  headerTitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    ...theme.typography.headerLight,
  },
  headerScore: {
    fontSize: 36,
    marginTop: 2,
    ...theme.typography.headerLight,
  },
  scoreContainer: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  scoreCircle: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreTextOverlay: {
    ...({ position: 'absolute' } as const),
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontSize: 56,
    fontWeight: '200',
    letterSpacing: -2,
  },
  scoreUnit: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    fontWeight: '300',
    marginTop: 4,
  },
  scoreLabel: {
    fontSize: 16,
    fontWeight: '300',
    letterSpacing: 4,
    marginTop: theme.spacing.md,
    textTransform: 'uppercase',
  },
  scoreHint: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    fontWeight: '300',
    marginTop: theme.spacing.sm,
  },
  sliderCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderCurve: 'continuous',
    borderWidth: 0.5,
    borderColor: theme.colors.surfaceBorder,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderLabels: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  sliderTitle: {
    fontSize: 15,
    color: theme.colors.text,
    fontWeight: '400',
  },
  sliderDescription: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    fontWeight: '300',
    marginTop: 1,
  },
  sliderValue: {
    fontSize: 24,
    fontWeight: '200',
    letterSpacing: -1,
    minWidth: 30,
    textAlign: 'right',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dotTouchArea: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: 16,
    borderRadius: theme.radius.button,
    borderCurve: 'continuous',
    marginTop: theme.spacing.md,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.bg,
    letterSpacing: 0.5,
  },
}));
