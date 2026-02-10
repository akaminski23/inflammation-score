import { useState, useCallback, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles';
import * as Haptics from 'expo-haptics';
import { getSetting, setSetting, deleteSetting, clearAllData, seedTestData } from '../../src/db/client';
import { generateAndShareReport } from '../../src/services/ExportService';

const DEV_TAP_COUNT = 5;

function SettingsRow({
  icon,
  label,
  subtitle,
  onPress,
  destructive,
  trailing,
  delay = 0,
}: {
  icon: string;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  destructive?: boolean;
  trailing?: React.ReactNode;
  delay?: number;
}) {
  const theme = UnistylesRuntime.getTheme();
  const iconColor = destructive ? theme.colors.ruby : theme.colors.accent;

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(delay)}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [st.row, pressed && onPress && { opacity: 0.7 }]}
      >
        <View style={[st.rowIcon, { backgroundColor: `${iconColor}15` }]}>
          <Ionicons name={icon as any} size={20} color={iconColor} />
        </View>
        <View style={st.rowContent}>
          <Text style={[st.rowLabel, destructive && { color: theme.colors.ruby }]}>{label}</Text>
          {subtitle && <Text style={st.rowSubtitle}>{subtitle}</Text>}
        </View>
        {trailing ?? (onPress && <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />)}
      </Pressable>
    </Animated.View>
  );
}

function ToggleRow({
  icon,
  label,
  subtitle,
  value,
  onToggle,
  delay = 0,
}: {
  icon: string;
  label: string;
  subtitle?: string;
  value: boolean;
  onToggle: (val: boolean) => void;
  delay?: number;
}) {
  const theme = UnistylesRuntime.getTheme();

  return (
    <SettingsRow
      icon={icon}
      label={label}
      subtitle={subtitle}
      delay={delay}
      onPress={() => {
        Haptics.selectionAsync();
        onToggle(!value);
      }}
      trailing={
        <View style={[st.toggle, value && { backgroundColor: theme.colors.accent }]}>
          <View style={[st.toggleThumb, value && { marginLeft: 16 }]} />
        </View>
      }
    />
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const theme = UnistylesRuntime.getTheme();
  const router = useRouter();

  const [reminders, setReminders] = useState(() => getSetting('reminders_enabled') === '1');
  const [devMode, setDevMode] = useState(false);
  const [exporting, setExporting] = useState(false);
  const tapCount = useRef(0);
  const lastTap = useRef(0);

  const handleReminderToggle = useCallback((val: boolean) => {
    setReminders(val);
    setSetting('reminders_enabled', val ? '1' : '0');
  }, []);

  const handleVersionTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current > 3000) tapCount.current = 0;
    lastTap.current = now;
    tapCount.current++;

    // Light haptic on each tap so user knows it registers
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (tapCount.current >= DEV_TAP_COUNT) {
      tapCount.current = 0;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setDevMode((prev) => !prev);
    }
  }, []);

  const handleResetOnboarding = useCallback(() => {
    Alert.alert('Reset Onboarding', 'App will restart with onboarding flow.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          deleteSetting('onboarding_complete');
          router.replace('/onboarding');
        },
      },
    ]);
  }, [router]);

  const handleExportPdf = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setExporting(true);
    try {
      // Small delay so overlay renders before heavy work
      await new Promise((r) => setTimeout(r, 100));
      await generateAndShareReport();
    } catch (err: any) {
      Alert.alert('Export Failed', err.message ?? 'Could not generate report.');
    }
    setExporting(false);
  }, []);

  const handleClearData = useCallback(() => {
    Alert.alert('Clear All Data', 'This will delete all entries and settings. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Everything',
        style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          clearAllData();
          router.replace('/onboarding');
        },
      },
    ]);
  }, [router]);

  return (
    <View style={st.screen}>
      <ScrollView
        contentContainerStyle={[
          st.scrollContent,
          { paddingTop: insets.top + 48, paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(600)}>
          <Text style={st.headerTitle}>APP</Text>
          <Text style={st.headerAccent}>SETTINGS</Text>
        </Animated.View>

        {/* General */}
        <Text style={st.sectionTitle}>GENERAL</Text>

        <ToggleRow
          icon="notifications-outline"
          label="Daily Reminders"
          subtitle="Get reminded to log your score"
          value={reminders}
          onToggle={handleReminderToggle}
          delay={100}
        />

        <SettingsRow
          icon="time-outline"
          label="Reminder Time"
          subtitle="8:00 PM"
          delay={160}
        />

        {/* Data & Privacy */}
        <Text style={st.sectionTitle}>DATA & PRIVACY</Text>

        <Animated.View entering={FadeInDown.duration(400).delay(220)}>
          <Pressable
            onPress={handleExportPdf}
            style={({ pressed }) => [st.pdfButton, pressed && { opacity: 0.85 }]}
          >
            <View style={st.pdfButtonInner}>
              <Ionicons name="document-text-outline" size={20} color={theme.colors.gold} />
              <View style={st.pdfButtonText}>
                <Text style={[st.pdfLabel, { color: theme.colors.gold }]}>Generate PDF Health Report</Text>
                <Text style={st.pdfSubtitle}>Empire-grade wellness summary</Text>
              </View>
              <Ionicons name="share-outline" size={16} color={theme.colors.textTertiary} />
            </View>
          </Pressable>
        </Animated.View>

        <SettingsRow
          icon="trash-outline"
          label="Clear All Data"
          subtitle="Delete all entries and settings"
          onPress={handleClearData}
          destructive
          delay={280}
        />

        {/* About */}
        <Text style={st.sectionTitle}>ABOUT</Text>

        <SettingsRow
          icon="information-circle-outline"
          label="About"
          subtitle="Inflammation Score Tracker"
          delay={340}
        />

        <Animated.View entering={FadeInDown.duration(400).delay(400)}>
          <Pressable onPress={handleVersionTap} hitSlop={20} style={st.versionRow}>
            <Text style={st.versionText}>Version 1.0.0</Text>
            <Text style={st.versionBuild}>{devMode ? 'Developer Mode' : 'Build 1'}</Text>
          </Pressable>
        </Animated.View>

        {/* Developer (hidden) */}
        {devMode && (
          <>
            <Text style={[st.sectionTitle, { color: theme.colors.gold }]}>DEVELOPER</Text>

            <SettingsRow
              icon="refresh-outline"
              label="Reset Onboarding"
              subtitle="Show onboarding flow again"
              onPress={handleResetOnboarding}
              delay={0}
            />

            <SettingsRow
              icon="flask-outline"
              label="Seed 14 Days Test Data"
              subtitle="Generate random entries for history"
              onPress={() => {
                Alert.alert('Seed Test Data', 'Add 14 days of random entries?', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Seed',
                    onPress: () => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      seedTestData(14);
                      Alert.alert('Done', '14 days of test data added. Check History tab.');
                    },
                  },
                ]);
              }}
              delay={60}
            />

            <SettingsRow
              icon="bug-outline"
              label="Developer Mode"
              subtitle="Tap version 5x to toggle"
              delay={120}
              trailing={
                <View style={[st.devBadge, { backgroundColor: `${theme.colors.gold}20` }]}>
                  <Text style={[st.devBadgeText, { color: theme.colors.gold }]}>ON</Text>
                </View>
              }
            />
          </>
        )}
      </ScrollView>

      {/* Loading Overlay */}
      <Modal visible={exporting} transparent animationType="fade">
        <View style={st.overlayBg}>
          <View style={st.overlayCard}>
            <ActivityIndicator size="large" color={theme.colors.gold} />
            <Text style={st.overlayText}>Generating Report</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create((theme) => ({
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
    fontSize: 12,
    fontWeight: '300',
    letterSpacing: 3,
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderCurve: 'continuous',
    borderWidth: 0.5,
    borderColor: theme.colors.surfaceBorder,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '400',
    color: theme.colors.text,
  },
  rowSubtitle: {
    fontSize: 12,
    fontWeight: '300',
    color: theme.colors.textTertiary,
    marginTop: 1,
  },
  toggle: {
    width: 40,
    height: 24,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  versionRow: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  versionText: {
    fontSize: 13,
    fontWeight: '300',
    color: theme.colors.textTertiary,
  },
  versionBuild: {
    fontSize: 11,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.2)',
    marginTop: 2,
  },
  devBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderCurve: 'continuous',
  },
  devBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1,
  },
  pdfButton: {
    backgroundColor: 'rgba(212,175,55,0.08)',
    borderRadius: theme.radius.card,
    borderCurve: 'continuous',
    borderWidth: 0.5,
    borderColor: 'rgba(212,175,55,0.25)',
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  pdfButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pdfButtonText: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  pdfLabel: {
    fontSize: 15,
    fontWeight: '400',
  },
  pdfSubtitle: {
    fontSize: 12,
    fontWeight: '300',
    color: theme.colors.textTertiary,
    marginTop: 1,
  },
  overlayBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayCard: {
    backgroundColor: 'rgba(20,20,40,0.9)',
    borderRadius: theme.radius.modal,
    borderCurve: 'continuous',
    borderWidth: 0.5,
    borderColor: 'rgba(212,175,55,0.3)',
    paddingHorizontal: 40,
    paddingVertical: 32,
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  overlayText: {
    fontSize: 14,
    fontWeight: '300',
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.7)',
  },
}));
