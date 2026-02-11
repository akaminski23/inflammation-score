import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles';
import * as Haptics from 'expo-haptics';
import { getValueColor } from '../../../lib/colors';

const QUICK_FACTORS = [
  { key: 'sleep', label: 'Sleep', icon: 'moon' as const, inverted: false },
  { key: 'stress', label: 'Stress', icon: 'thunderstorm' as const, inverted: false },
  { key: 'diet', label: 'Diet', icon: 'nutrition' as const, inverted: false },
  { key: 'exercise', label: 'Exercise', icon: 'fitness' as const, inverted: false },
];

export default function FirstInputStep({ onNext }: { onNext: () => void }) {
  const insets = useSafeAreaInsets();
  const theme = UnistylesRuntime.getTheme();
  const [ratings, setRatings] = useState<Record<string, number>>({ sleep: 5, stress: 5, diet: 5, exercise: 5 });

  const setRating = (key: string, val: number) => {
    Haptics.selectionAsync();
    setRatings((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <View style={[fi.container, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 }]}>
      <View style={fi.content}>
        <Animated.Text entering={FadeInUp.duration(600)} style={fi.label}>STEP 3 OF 6</Animated.Text>
        <Animated.Text entering={FadeInUp.duration(600).delay(100)} style={fi.title}>
          YOUR FIRST{'\n'}CHECK-IN
        </Animated.Text>
        <Animated.Text entering={FadeInUp.duration(500).delay(200)} style={fi.subtitle}>
          Rate today's factors. This takes 10 seconds.
        </Animated.Text>

        {QUICK_FACTORS.map((f, idx) => {
          const val = ratings[f.key];
          const color = getValueColor(val, f.inverted);
          return (
            <Animated.View key={f.key} entering={FadeInUp.duration(400).delay(300 + idx * 80)} style={fi.factorRow}>
              <View style={fi.factorHeader}>
                <View style={[fi.iconBox, { backgroundColor: `${color}15` }]}>
                  <Ionicons name={f.icon} size={18} color={color} />
                </View>
                <Text style={fi.factorLabel}>{f.label}</Text>
                <Text style={[fi.factorValue, { color }]}>{val}</Text>
              </View>
              <View style={fi.dotsRow}>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((dot) => (
                  <Pressable key={dot} onPress={() => setRating(f.key, dot)} style={fi.dotTouch}>
                    <View
                      style={[
                        fi.dot,
                        dot <= val && {
                          backgroundColor: color,
                          shadowColor: color,
                          shadowOpacity: 0.8,
                          shadowRadius: 3,
                          shadowOffset: { width: 0, height: 0 },
                        },
                      ]}
                    />
                  </Pressable>
                ))}
              </View>
            </Animated.View>
          );
        })}
      </View>

      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onNext(); }}
        style={({ pressed }) => [fi.button, { backgroundColor: theme.colors.accent }, pressed && { opacity: 0.85 }]}
      >
        <Text style={[fi.buttonText, { color: theme.colors.bg }]}>Calculate My Score</Text>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.bg} />
      </Pressable>
    </View>
  );
}

const fi = StyleSheet.create((theme) => ({
  container: { flex: 1, paddingHorizontal: 40, justifyContent: 'space-between' },
  content: { flex: 1 },
  label: { fontSize: 12, fontWeight: '300', letterSpacing: 3, color: theme.colors.textTertiary, marginBottom: theme.spacing.sm },
  title: { fontSize: 34, fontWeight: '200', letterSpacing: 5, color: '#FFFFFF', lineHeight: 44, marginBottom: theme.spacing.md },
  subtitle: { fontSize: 15, fontWeight: '400', color: theme.colors.textSecondary, lineHeight: 22, marginBottom: theme.spacing.xl },
  factorRow: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: theme.radius.card, borderCurve: 'continuous',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', padding: theme.spacing.md, marginBottom: theme.spacing.sm,
  },
  factorHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm },
  iconBox: { width: 32, height: 32, borderRadius: 8, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  factorLabel: { flex: 1, fontSize: 15, fontWeight: '400', color: theme.colors.text, marginLeft: theme.spacing.sm },
  factorValue: { fontSize: 20, fontWeight: '200', letterSpacing: -1 },
  dotsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dotTouch: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.12)' },
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm,
    paddingVertical: 18, borderRadius: theme.radius.button, borderCurve: 'continuous',
  },
  buttonText: { fontSize: 17, fontWeight: '500', letterSpacing: 0.5 },
}));
