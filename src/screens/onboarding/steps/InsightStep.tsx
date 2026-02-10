import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles';
import * as Haptics from 'expo-haptics';

const INSIGHTS = [
  { icon: 'trending-down' as const, text: 'Poor sleep increases inflammation by up to 40%' },
  { icon: 'flash' as const, text: 'Even 20 min of walking reduces inflammatory markers' },
  { icon: 'leaf' as const, text: 'Consistent tracking reveals patterns invisible to you' },
];

export default function InsightStep({ onNext }: { onNext: () => void }) {
  const insets = useSafeAreaInsets();
  const theme = UnistylesRuntime.getTheme();

  return (
    <View style={[is.container, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 }]}>
      <View style={is.content}>
        <Animated.Text entering={FadeInUp.duration(600)} style={is.label}>STEP 4 OF 6</Animated.Text>
        <Animated.Text entering={FadeInUp.duration(600).delay(100)} style={is.title}>
          THE SCIENCE{'\n'}BEHIND IT
        </Animated.Text>
        <Animated.Text entering={FadeInUp.duration(500).delay(200)} style={is.subtitle}>
          Your daily choices directly impact chronic inflammation. Here's how tracking helps.
        </Animated.Text>

        {INSIGHTS.map((insight, i) => (
          <Animated.View key={i} entering={FadeInUp.duration(400).delay(300 + i * 100)} style={is.card}>
            <View style={[is.cardIcon, { backgroundColor: `${theme.colors.accent}15` }]}>
              <Ionicons name={insight.icon} size={20} color={theme.colors.accent} />
            </View>
            <Text style={is.cardText}>{insight.text}</Text>
          </Animated.View>
        ))}
      </View>

      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onNext(); }}
        style={({ pressed }) => [is.button, pressed && { opacity: 0.85 }]}
      >
        <Text style={is.buttonText}>See My Analysis</Text>
        <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const is = StyleSheet.create((theme) => ({
  container: { flex: 1, paddingHorizontal: 40, justifyContent: 'space-between' },
  content: { flex: 1 },
  label: { fontSize: 12, fontWeight: '300', letterSpacing: 3, color: theme.colors.textTertiary, marginBottom: theme.spacing.sm },
  title: { fontSize: 34, fontWeight: '200', letterSpacing: 5, color: '#FFFFFF', lineHeight: 44, marginBottom: theme.spacing.md },
  subtitle: { fontSize: 15, fontWeight: '400', color: theme.colors.textSecondary, lineHeight: 22, marginBottom: theme.spacing.xl },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: theme.radius.card, borderCurve: 'continuous',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', padding: theme.spacing.md, marginBottom: theme.spacing.sm,
  },
  cardIcon: { width: 40, height: 40, borderRadius: 12, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1, fontSize: 14, fontWeight: '400', color: theme.colors.text, lineHeight: 20 },
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm,
    paddingVertical: 18, borderRadius: theme.radius.button, borderCurve: 'continuous',
    backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)',
  },
  buttonText: { fontSize: 17, fontWeight: '400', color: '#FFFFFF', letterSpacing: 0.5 },
}));
