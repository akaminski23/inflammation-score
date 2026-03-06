import { View, Text, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { desc } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from '../../src/db/client';
import { entries, type Entry } from '../../src/db/schema';
import AreaChart from '../../src/components/AreaChart';
import { getScoreColorThemed, getValueColor } from '../../src/lib/colors';
import { useRevenueCat } from '../../src/providers/RevenueCatProvider';

const FREE_LIMIT = 3;

function formatDate(dateStr: string): string {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  if (dateStr === todayKey) return 'Today';
  if (dateStr === yesterdayKey) return 'Yesterday';

  const [, month, day] = dateStr.split('-');
  const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(month, 10)]} ${parseInt(day, 10)}`;
}

const FACTORS = [
  { key: 'sleep' as const, icon: 'moon-outline' as const, inverted: false },
  { key: 'stress' as const, icon: 'thunderstorm-outline' as const, inverted: true },
  { key: 'diet' as const, icon: 'nutrition-outline' as const, inverted: false },
  { key: 'exercise' as const, icon: 'fitness-outline' as const, inverted: false },
];

function HistoryRow({ entry, index }: { entry: Entry; index: number }) {
  const color = getScoreColorThemed(entry.score);

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(200 + index * 60)}
      style={styles.historyCard}
    >
      <View style={styles.historyHeader}>
        <Text style={styles.historyDate}>{formatDate(entry.date)}</Text>
        <Text style={[styles.historyScore, { color }]}>{entry.score}</Text>
      </View>
      <View style={styles.factorRow}>
        {FACTORS.map((f) => {
          const val = entry[f.key];
          const fColor = getValueColor(val, f.inverted);
          return (
            <View
              key={f.key}
              style={[
                styles.factorChip,
                {
                  borderColor: `${fColor}20`,
                },
              ]}
            >
              <View style={styles.factorIconWrap}>
                <Ionicons name={f.icon as any} size={14} color={fColor} />
              </View>
              <Text style={[styles.factorValue, { color: fColor }]}>{val}</Text>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}

function ChartPaywall({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.chartPaywall}>
      <View style={styles.chartPaywallIcon}>
        <Ionicons name="analytics-outline" size={40} color="rgba(212,175,55,0.6)" />
      </View>
      <Text style={styles.chartPaywallTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        Unlock Your Trend Chart
      </Text>
      <Text style={styles.chartPaywallDesc} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>
        See how your inflammation score changes over time with detailed visual insights.
      </Text>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onUpgrade();
        }}
        style={styles.chartPaywallBtn}
      >
        <Ionicons name="sparkles" size={16} color="#0A0A1A" />
        <Text style={styles.chartPaywallBtnText} numberOfLines={1}>Start Free Trial</Text>
      </Pressable>
    </Animated.View>
  );
}

function HistoryPaywallRow({ count, onUpgrade }: { count: number; onUpgrade: () => void }) {
  return (
    <Animated.View entering={FadeInDown.duration(400).delay(400)} style={styles.historyPaywallRow}>
      <Ionicons name="lock-closed" size={16} color="#D4AF37" />
      <Text style={styles.historyPaywallText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {count} more {count === 1 ? 'entry' : 'entries'} with Pro
      </Text>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onUpgrade();
        }}
        hitSlop={8}
      >
        <Text style={styles.historyPaywallLink} numberOfLines={1}>Unlock</Text>
      </Pressable>
    </Animated.View>
  );
}

function EmptyState() {
  const theme = UnistylesRuntime.getTheme();
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="calendar-outline" size={48} color={theme.colors.textTertiary} />
      <Text style={styles.emptyTitle}>No entries yet</Text>
      <Text style={styles.emptySubtitle}>Log your first score to see trends here</Text>
    </View>
  );
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const theme = UnistylesRuntime.getTheme();
  const router = useRouter();
  const { isPro } = useRevenueCat();
  const chartWidth = screenW - theme.spacing.lg * 2;

  const { data: allEntries } = useLiveQuery(
    db.select().from(entries).orderBy(desc(entries.date)).limit(30)
  );

  const historyData = allEntries ?? [];
  const visibleEntries = isPro ? historyData : historyData.slice(0, FREE_LIMIT);
  const hiddenCount = isPro ? 0 : Math.max(0, historyData.length - FREE_LIMIT);

  const handleUpgrade = () => {
    router.push('/paywall');
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 48, paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(600)}>
          <Text style={styles.headerTitle}>WEEKLY</Text>
          <Text style={styles.headerAccent}>TREND</Text>
        </Animated.View>

        {historyData.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {isPro ? (
              <Animated.View entering={FadeInDown.duration(500).delay(100)}>
                <AreaChart data={historyData} width={chartWidth} />
              </Animated.View>
            ) : (
              <ChartPaywall onUpgrade={handleUpgrade} />
            )}

            <Text style={styles.sectionTitle}>Recent Entries</Text>

            {visibleEntries.map((entry, index) => (
              <HistoryRow key={entry.date} entry={entry} index={index} />
            ))}

            {hiddenCount > 0 && (
              <HistoryPaywallRow count={hiddenCount} onUpgrade={handleUpgrade} />
            )}
          </>
        )}
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
  headerAccent: {
    fontSize: 36,
    color: theme.colors.accent,
    marginTop: 2,
    ...theme.typography.headerLight,
  },
  sectionTitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '300',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.md,
  },
  historyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderCurve: 'continuous',
    borderWidth: 0.5,
    borderColor: theme.colors.surfaceBorder,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  historyDate: {
    fontSize: 15,
    color: theme.colors.text,
    fontWeight: '400',
  },
  historyScore: {
    fontSize: 28,
    fontWeight: '200',
    letterSpacing: -1,
  },
  factorRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  factorChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: theme.radius.chip,
    borderCurve: 'continuous',
    borderWidth: 0.5,
  },
  factorIconWrap: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  factorValue: {
    fontSize: 14,
    fontWeight: '300',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
    gap: theme.spacing.sm,
  },
  emptyTitle: {
    fontSize: 17,
    color: theme.colors.textSecondary,
    fontWeight: '300',
    marginTop: theme.spacing.sm,
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    fontWeight: '300',
  },
  chartPaywall: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderCurve: 'continuous',
    borderWidth: 0.5,
    borderColor: 'rgba(212,175,55,0.20)',
    padding: 24,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  chartPaywallIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(212,175,55,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  chartPaywallTitle: {
    fontSize: 20,
    fontWeight: '300',
    color: theme.colors.text,
    letterSpacing: 1,
    marginBottom: 8,
  },
  chartPaywallDesc: {
    fontSize: 14,
    fontWeight: '400',
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  chartPaywallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#D4AF37',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: theme.radius.button,
    borderCurve: 'continuous',
    minWidth: 200,
  },
  chartPaywallBtnText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0A0A1A',
    letterSpacing: 0.5,
  },
  historyPaywallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(212,175,55,0.06)',
    borderRadius: theme.radius.card,
    borderCurve: 'continuous',
    borderWidth: 0.5,
    borderColor: 'rgba(212,175,55,0.15)',
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  historyPaywallText: {
    fontSize: 14,
    fontWeight: '400',
    color: theme.colors.textSecondary,
    flex: 1,
  },
  historyPaywallLink: {
    fontSize: 14,
    fontWeight: '500',
    color: '#D4AF37',
    letterSpacing: 0.5,
  },
}));
