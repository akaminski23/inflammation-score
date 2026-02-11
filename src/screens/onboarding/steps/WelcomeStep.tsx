import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles';
import * as Haptics from 'expo-haptics';

const SPRING_SNAPPY = { damping: 15, stiffness: 250 };

export default function WelcomeStep({ onNext }: { onNext: () => void }) {
  const insets = useSafeAreaInsets();
  const theme = UnistylesRuntime.getTheme();
  const scale = useSharedValue(1);
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSpring(0.92, SPRING_SNAPPY, () => {
      scale.value = withSpring(1, SPRING_SNAPPY);
    });
    setTimeout(onNext, 150);
  };

  return (
    <View style={[ws.container, { paddingTop: insets.top + 80, paddingBottom: insets.bottom + 24 }]}>
      <View style={ws.content}>
        <Animated.View entering={FadeInUp.duration(600).delay(100)} style={ws.iconCircle}>
          <Ionicons name="pulse" size={40} color={theme.colors.accent} />
        </Animated.View>

        <Animated.Text entering={FadeInUp.duration(600).delay(200)} style={ws.title}>
          INFLAMMATION{'\n'}SCORE
        </Animated.Text>

        <Animated.Text entering={FadeInUp.duration(600).delay(350)} style={ws.subtitle}>
          Your daily anti-inflammatory lifestyle tracker. Understand what drives inflammation in your body.
        </Animated.Text>
      </View>

      <Animated.View style={scaleStyle}>
        <Pressable onPress={handlePress} style={({ pressed }) => [ws.button, pressed && { opacity: 0.85 }]}>
          <Text style={ws.buttonText}>Begin</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const ws = StyleSheet.create((theme) => ({
  container: { flex: 1, paddingHorizontal: 40, justifyContent: 'space-between' },
  content: { flex: 1, justifyContent: 'center' },
  iconCircle: {
    width: 80, height: 80, borderRadius: 24, borderCurve: 'continuous',
    backgroundColor: 'rgba(80,200,120,0.12)', alignItems: 'center', justifyContent: 'center',
    marginBottom: theme.spacing.xl, borderWidth: 0.5, borderColor: 'rgba(80,200,120,0.2)',
  },
  title: {
    fontSize: 34, fontWeight: '200', letterSpacing: 5, color: '#FFFFFF',
    marginBottom: theme.spacing.lg, lineHeight: 44,
  },
  subtitle: {
    fontSize: 16, fontWeight: '400', color: theme.colors.textSecondary, lineHeight: 24, letterSpacing: 0.3,
  },
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm,
    paddingVertical: 18, borderRadius: theme.radius.button, borderCurve: 'continuous',
    backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)',
  },
  buttonText: { fontSize: 17, fontWeight: '400', color: '#FFFFFF', letterSpacing: 0.5 },
}));
