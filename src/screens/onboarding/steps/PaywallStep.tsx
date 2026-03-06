import { useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInUp,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { useRevenueCat } from '../../../providers/RevenueCatProvider';

const SPRING_SNAPPY = { damping: 15, stiffness: 250 };
const GOLD = '#D4AF37';
const SILVER = '#C0C0C8';

const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const PRIVACY_URL = 'https://akaminski23.github.io/inflammation-score/privacy.html';

type PlanId = 'monthly' | 'yearly';

const TIMELINE = [
  { label: 'Today', desc: 'Unlock everything', gold: true },
  { label: 'Day 5', desc: 'Reminder sent', gold: false },
  { label: 'Day 7', desc: 'Billing starts', gold: true },
];

const PLAN_MAP: Record<PlanId, { label: string; period: string; fallbackPrice: string; badge?: string }> = {
  monthly: { label: 'Monthly', period: '/mo', fallbackPrice: '$14.99' },
  yearly: { label: 'Yearly', period: '/yr', fallbackPrice: '$44.99', badge: 'SAVE 53%' },
};

export default function PaywallStep({ onNext }: { onNext: () => void }) {
  const insets = useSafeAreaInsets();
  const { offerings, purchase, restorePurchases, loading } = useRevenueCat();
  const [selected, setSelected] = useState<PlanId>('yearly');

  const btnScale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  // Map RevenueCat packages to plan IDs
  const packages = useMemo(() => {
    const map: Partial<Record<PlanId, { price: string; pkg: any }>> = {};
    if (offerings?.monthly) {
      map.monthly = { price: offerings.monthly.product.priceString, pkg: offerings.monthly };
    }
    if (offerings?.annual) {
      map.yearly = { price: offerings.annual.product.priceString, pkg: offerings.annual };
    }
    return map;
  }, [offerings]);

  const plans = useMemo(() => {
    return (['monthly', 'yearly'] as PlanId[]).map((id) => ({
      id,
      ...PLAN_MAP[id],
      price: packages[id]?.price ?? PLAN_MAP[id].fallbackPrice,
    }));
  }, [packages]);

  const handleSubscribe = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    btnScale.value = withSpring(0.93, SPRING_SNAPPY, () => {
      btnScale.value = withSpring(1, SPRING_SNAPPY);
    });

    const selectedPkg = packages[selected]?.pkg;
    if (!selectedPkg) {
      // Offerings not loaded — inform user, do not bypass paywall
      Alert.alert(
        'Unable to Load Plans',
        'Could not connect to the App Store. Please check your internet connection and try again.',
      );
      return;
    }

    const success = await purchase(selectedPkg);
    if (success) {
      onNext();
    }
  };

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const success = await restorePurchases();
    if (success) {
      onNext();
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNext();
  };

  const openLink = useCallback((url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(url);
  }, []);

  return (
    <View style={[pw.screen, { paddingBottom: insets.bottom + 16 }]}>
      <ScrollView
        contentContainerStyle={[pw.scroll, { paddingTop: insets.top + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.Text entering={FadeInUp.duration(600)} style={pw.header}>
          Reclaim Your Life{'\n'}from Discomfort
        </Animated.Text>

        {/* Trial Timeline */}
        <Animated.View entering={FadeInUp.duration(500).delay(120)} style={pw.timeline}>
          {TIMELINE.map((step, i) => (
            <View key={i} style={pw.timelineStep}>
              <View style={pw.timelineDotRow}>
                {i > 0 && <View style={pw.timelineLine} />}
                <View style={[pw.timelineDot, step.gold && { backgroundColor: GOLD, shadowColor: GOLD, shadowOpacity: 0.8, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } }]} />
                {i < TIMELINE.length - 1 && <View style={pw.timelineLine} />}
              </View>
              <Text style={[pw.timelineLabel, step.gold && { color: GOLD }]}>{step.label}</Text>
              <Text style={pw.timelineDesc}>{step.desc}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Pricing Cards */}
        <Animated.View entering={FadeInUp.duration(500).delay(240)} style={pw.plans}>
          {plans.map((plan) => {
            const active = selected === plan.id;
            return (
              <Pressable
                key={plan.id}
                onPress={() => { Haptics.selectionAsync(); setSelected(plan.id); }}
                style={[
                  pw.planCard,
                  active && { borderColor: GOLD, borderWidth: 0.5 },
                  plan.id === 'yearly' && pw.planCardFeatured,
                ]}
              >
                {plan.badge && (
                  <View style={pw.badge}>
                    <Text style={pw.badgeText}>{plan.badge}</Text>
                  </View>
                )}
                <Text style={[pw.planLabel, active && { color: '#FFFFFF' }]}>{plan.label}</Text>
                <Text style={[pw.planPrice, active && { color: GOLD }]}>{plan.price}</Text>
                <Text style={pw.planPeriod}>{plan.period}</Text>
              </Pressable>
            );
          })}
        </Animated.View>

        {/* Value Prop */}
        <Animated.View entering={FadeInUp.duration(400).delay(360)} style={pw.valueProp}>
          <View style={pw.shieldIcon}>
            <Ionicons name="shield-checkmark" size={16} color={GOLD} />
          </View>
          <Text style={pw.valueText}>Private. Local-first. No accounts required.</Text>
        </Animated.View>
      </ScrollView>

      {/* Fixed bottom CTA */}
      <Animated.View entering={FadeInDown.duration(500).delay(400)} style={pw.bottomCta}>
        <Animated.View style={btnStyle}>
          <Pressable
            onPress={handleSubscribe}
            disabled={loading}
            style={({ pressed }) => [pw.ctaButton, pressed && { opacity: 0.9 }, loading && { opacity: 0.6 }]}
          >
            {loading ? (
              <ActivityIndicator color="#0A0A1A" />
            ) : (
              <Text style={pw.ctaText}>Start My 7-Day Free Trial</Text>
            )}
          </Pressable>
        </Animated.View>

        {/* Subscription disclosure — REQUIRED by Apple 3.1.2 */}
        <Text style={pw.disclosure}>
          {selected === 'yearly'
            ? `7-day free trial, then ${packages.yearly?.price ?? '$44.99'}/year. `
            : `7-day free trial, then ${packages.monthly?.price ?? '$14.99'}/month. `}
          {'Payment will be charged to your Apple ID account at confirmation of purchase. ' +
            'Subscription automatically renews unless cancelled at least 24 hours before the end of the current period. ' +
            'Your account will be charged for renewal within 24 hours prior to the end of the current period. ' +
            'Manage or cancel your subscription in App Store \u203a Account \u203a Subscriptions.'}
        </Text>

        <Pressable onPress={handleSkip} hitSlop={12} disabled={loading}>
          <Text style={pw.skipText}>Maybe later</Text>
        </Pressable>

        {/* Footer links */}
        <View style={pw.footer}>
          <Pressable hitSlop={8} onPress={handleRestore} disabled={loading}><Text style={pw.footerLink}>Restore Purchases</Text></Pressable>
          <Text style={pw.footerDivider}>|</Text>
          <Pressable hitSlop={8} onPress={() => openLink(PRIVACY_URL)}>
            <Text style={pw.footerLink}>Privacy Policy</Text>
          </Pressable>
          <Text style={pw.footerDivider}>|</Text>
          <Pressable hitSlop={8} onPress={() => openLink(TERMS_URL)}>
            <Text style={pw.footerLink}>Terms of Use</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const pw = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    backgroundColor: 'rgba(10,10,26,0.35)',
  },
  scroll: {
    paddingHorizontal: 28,
    paddingBottom: 16,
  },

  // --- Header ---
  header: {
    fontSize: 30,
    fontWeight: '200',
    letterSpacing: 2,
    color: '#C0C0C8',
    lineHeight: 40,
    marginBottom: theme.spacing.xl,
  },

  // --- Timeline ---
  timeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xs,
  },
  timelineStep: {
    flex: 1,
    alignItems: 'center',
  },
  timelineDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm + 10,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  timelineLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  timelineLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 2,
  },
  timelineDesc: {
    fontSize: 11,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
  },

  // --- Plans ---
  plans: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  planCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: theme.radius.card,
    borderCurve: 'continuous',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  planCardFeatured: {
    paddingTop: 28,
  },
  badge: {
    position: 'absolute',
    top: -14,
    backgroundColor: '#D4AF37',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderCurve: 'continuous',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: '#0A0A1A',
  },
  planLabel: {
    fontSize: 12,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1,
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
  },
  planPrice: {
    fontSize: 22,
    fontWeight: '200',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: -0.5,
  },
  planPeriod: {
    fontSize: 11,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.3)',
    marginTop: 2,
  },

  // --- Value prop ---
  valueProp: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  shieldIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(212,175,55,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    fontSize: 12,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.3,
  },

  // --- Bottom CTA ---
  bottomCta: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  ctaButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 22,
    paddingHorizontal: 48,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: '#E0B840',
    shadowColor: '#E0B840',
    shadowOpacity: 0.6,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0A0A1A',
    letterSpacing: 0.3,
  },
  disclosure: {
    fontSize: 10,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 14,
    paddingHorizontal: 8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.35)',
    paddingVertical: theme.spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
  },
  footerLink: {
    fontSize: 11,
    fontWeight: '300',
    color: SILVER,
    opacity: 0.5,
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(192,192,200,0.3)',
  },
  footerDivider: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.1)',
  },
}));
