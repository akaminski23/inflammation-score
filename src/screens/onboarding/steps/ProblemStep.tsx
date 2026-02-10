import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles';
import * as Haptics from 'expo-haptics';

const PROBLEMS = [
  { id: 'fatigue', label: 'Chronic fatigue', icon: 'bed-outline' as const },
  { id: 'joint', label: 'Joint pain / stiffness', icon: 'body-outline' as const },
  { id: 'gut', label: 'Gut / digestion issues', icon: 'restaurant-outline' as const },
  { id: 'brain', label: 'Brain fog', icon: 'cloud-outline' as const },
  { id: 'skin', label: 'Skin problems', icon: 'hand-left-outline' as const },
  { id: 'general', label: 'General wellness', icon: 'heart-outline' as const },
];

export default function ProblemStep({ onNext }: { onNext: () => void }) {
  const insets = useSafeAreaInsets();
  const theme = UnistylesRuntime.getTheme();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    Haptics.selectionAsync();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <View style={[ps.container, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 }]}>
      <View style={ps.content}>
        <Animated.Text entering={FadeInUp.duration(600)} style={ps.label}>STEP 2 OF 6</Animated.Text>
        <Animated.Text entering={FadeInUp.duration(600).delay(100)} style={ps.title}>
          WHAT BOTHERS{'\n'}YOU MOST?
        </Animated.Text>
        <Animated.Text entering={FadeInUp.duration(500).delay(200)} style={ps.subtitle}>
          Select all that apply. This helps us personalize your experience.
        </Animated.Text>

        <View style={ps.grid}>
          {PROBLEMS.map((p, i) => {
            const active = selected.has(p.id);
            return (
              <Animated.View key={p.id} entering={FadeInUp.duration(400).delay(250 + i * 60)}>
                <Pressable
                  onPress={() => toggle(p.id)}
                  style={[ps.chip, active && { borderColor: theme.colors.accent, backgroundColor: 'rgba(80,200,120,0.1)' }]}
                >
                  <Ionicons name={p.icon} size={18} color={active ? theme.colors.accent : theme.colors.textTertiary} />
                  <Text style={[ps.chipText, active && { color: theme.colors.accent }]}>{p.label}</Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      </View>

      <Pressable
        onPress={() => {
          if (selected.size === 0) return;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onNext();
        }}
        style={({ pressed }) => [
          ps.button,
          selected.size > 0 && { backgroundColor: theme.colors.accent },
          selected.size === 0 && { opacity: 0.4 },
          pressed && selected.size > 0 && { opacity: 0.85 },
        ]}
      >
        <Text style={[ps.buttonText, selected.size > 0 && { color: theme.colors.bg }]}>Continue</Text>
        <Ionicons name="chevron-forward" size={18} color={selected.size > 0 ? theme.colors.bg : '#FFFFFF'} />
      </Pressable>
    </View>
  );
}

const ps = StyleSheet.create((theme) => ({
  container: { flex: 1, paddingHorizontal: 40, justifyContent: 'space-between' },
  content: { flex: 1 },
  label: { fontSize: 12, fontWeight: '300', letterSpacing: 3, color: theme.colors.textTertiary, marginBottom: theme.spacing.sm },
  title: { fontSize: 34, fontWeight: '200', letterSpacing: 5, color: '#FFFFFF', lineHeight: 44, marginBottom: theme.spacing.md },
  subtitle: { fontSize: 15, fontWeight: '400', color: theme.colors.textSecondary, lineHeight: 22, marginBottom: theme.spacing.xl },
  grid: { gap: theme.spacing.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
    paddingVertical: 14, paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.button, borderCurve: 'continuous',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chipText: { fontSize: 15, fontWeight: '400', color: theme.colors.textSecondary },
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm,
    paddingVertical: 18, borderRadius: theme.radius.button, borderCurve: 'continuous',
    backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)',
  },
  buttonText: { fontSize: 17, fontWeight: '400', color: '#FFFFFF', letterSpacing: 0.5 },
}));
