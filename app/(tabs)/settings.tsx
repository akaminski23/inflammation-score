import { useState, useCallback, useRef, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getSetting, setSetting, deleteSetting, clearAllData, seedTestData } from '../../src/db/client';
import { generateAndShareReport } from '../../src/services/ExportService';
import { useRevenueCat } from '../../src/providers/RevenueCatProvider';

const PRIVACY_URL = 'https://akaminski23.github.io/inflammation-score/privacy.html';
const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

function timeStringToDate(str: string): Date {
  const [time, period] = str.split(' ');
  const [hStr, mStr] = time.split(':');
  let h = +hStr;
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  const d = new Date();
  d.setHours(h, +mStr, 0, 0);
  return d;
}

function dateToTimeString(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${m.toString().padStart(2, '0')} ${period}`;
}

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

  const { isPro, restorePurchases, loading: rcLoading } = useRevenueCat();

  const [reminders, setReminders] = useState(() => getSetting('reminders_enabled') === '1');
  const [reminderTime, setReminderTime] = useState(() => getSetting('reminder_time') ?? '8:00 PM');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const pickerDate = useMemo(() => timeStringToDate(reminderTime), [reminderTime]);
  const [showAbout, setShowAbout] = useState(false);
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
    } finally {
      setExporting(false);
    }
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

        {/* Subscription */}
        <Text style={st.sectionTitle}>SUBSCRIPTION</Text>

        <Animated.View entering={FadeInDown.duration(400).delay(60)}>
          <View style={st.subscriptionCard}>
            <View style={st.subscriptionHeader}>
              <View style={[st.rowIcon, { backgroundColor: isPro ? `${theme.colors.gold}15` : `${theme.colors.textTertiary}15` }]}>
                <Ionicons name={isPro ? 'diamond' : 'diamond-outline'} size={20} color={isPro ? theme.colors.gold : theme.colors.textTertiary} />
              </View>
              <View style={st.rowContent}>
                <Text style={st.rowLabel}>{isPro ? 'Pro' : 'Free'}</Text>
                <Text style={st.rowSubtitle}>{isPro ? 'All features unlocked' : 'Upgrade to unlock all features'}</Text>
              </View>
              {isPro && (
                <View style={[st.devBadge, { backgroundColor: `${theme.colors.gold}20` }]}>
                  <Text style={[st.devBadgeText, { color: theme.colors.gold }]}>PRO</Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>

        <SettingsRow
          icon="refresh-outline"
          label="Restore Purchases"
          subtitle={rcLoading ? 'Restoring...' : 'Recover previous purchases'}
          onPress={() => {
            if (!rcLoading) restorePurchases();
          }}
          delay={80}
        />

        <SettingsRow
          icon="card-outline"
          label="Manage Subscription"
          subtitle="Change or cancel in App Store"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            Linking.openURL('https://apps.apple.com/account/subscriptions');
          }}
          delay={100}
        />

        {/* General */}
        <Text style={st.sectionTitle}>GENERAL</Text>

        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <View style={st.reminderCard}>
            {/* Toggle row */}
            <View style={st.reminderToggleRow}>
              <View style={[st.rowIcon, { backgroundColor: `${theme.colors.accent}15` }]}>
                <Ionicons name="notifications-outline" size={20} color={theme.colors.accent} />
              </View>
              <View style={st.rowContent}>
                <Text style={st.rowLabel}>Daily Reminders</Text>
                <Text style={st.rowSubtitle}>Get reminded to log your score</Text>
              </View>
              <Pressable
                onPress={() => { Haptics.selectionAsync(); handleReminderToggle(!reminders); }}
                hitSlop={8}
              >
                <View style={[st.toggle, reminders && { backgroundColor: theme.colors.accent }]}>
                  <View style={[st.toggleThumb, reminders && { marginLeft: 16 }]} />
                </View>
              </Pressable>
            </View>

            {/* Divider */}
            {reminders && <View style={st.reminderDivider} />}

            {/* Time picker (only when reminders enabled) */}
            {reminders && (
              <View style={st.pickerWrap}>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowTimePicker((v) => !v);
                  }}
                  style={st.timeLabel}
                >
                  <Ionicons name="time-outline" size={16} color={theme.colors.gold} />
                  <Text style={st.timeLabelText}>{reminderTime}</Text>
                  <Ionicons
                    name={showTimePicker ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={theme.colors.textTertiary}
                  />
                </Pressable>

                {showTimePicker && (
                  <View style={st.pickerContainer}>
                    <DateTimePicker
                      value={pickerDate}
                      mode="time"
                      display="spinner"
                      minuteInterval={5}
                      themeVariant="dark"
                      accentColor="#D4AF37"
                      onChange={(_, selected) => {
                        if (selected) {
                          Haptics.selectionAsync();
                          const newTime = dateToTimeString(selected);
                          setReminderTime(newTime);
                          setSetting('reminder_time', newTime);
                        }
                      }}
                    />
                  </View>
                )}
              </View>
            )}
          </View>
        </Animated.View>

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
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowAbout(true);
          }}
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

      {/* About Modal */}
      <Modal visible={showAbout} transparent animationType="fade">
        <Pressable style={st.overlayBg} onPress={() => setShowAbout(false)}>
          <Pressable style={st.aboutCard} onPress={() => {}}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={st.aboutHeader}>
                <View style={[st.rowIcon, { backgroundColor: `${theme.colors.accent}15`, width: 48, height: 48, borderRadius: 14 }]}>
                  <Ionicons name="pulse" size={24} color={theme.colors.accent} />
                </View>
                <Text style={st.aboutAppName}>Inflammation Score</Text>
                <Text style={st.aboutVersion}>Version 1.0.0</Text>
              </View>

              <Text style={st.aboutSectionTitle}>WHAT IS THIS APP?</Text>
              <Text style={st.aboutBody}>
                Inflammation Score is your daily wellness companion. It helps you track four key lifestyle factors — Sleep, Stress, Diet, and Exercise — and calculates a personalized wellness score from 0 to 100.
              </Text>

              <Text style={st.aboutSectionTitle}>HOW TO USE</Text>

              <View style={st.aboutStep}>
                <View style={[st.aboutStepDot, { backgroundColor: theme.colors.accent }]} />
                <View style={st.aboutStepContent}>
                  <Text style={st.aboutStepTitle}>Score Tab</Text>
                  <Text style={st.aboutBody}>Rate your four daily factors using the sliders (1-10 each). Tap "Update Score" to save. Your overall wellness score updates instantly in the gauge above.</Text>
                </View>
              </View>

              <View style={st.aboutStep}>
                <View style={[st.aboutStepDot, { backgroundColor: theme.colors.gold }]} />
                <View style={st.aboutStepContent}>
                  <Text style={st.aboutStepTitle}>History Tab</Text>
                  <Text style={st.aboutBody}>View your wellness trend over time with an interactive chart. Filter by individual factors to spot patterns. Tap any day to see the detailed breakdown.</Text>
                </View>
              </View>

              <View style={st.aboutStep}>
                <View style={[st.aboutStepDot, { backgroundColor: theme.colors.cyan }]} />
                <View style={st.aboutStepContent}>
                  <Text style={st.aboutStepTitle}>Settings Tab</Text>
                  <Text style={st.aboutBody}>Set daily reminders, export PDF wellness reports, and manage your data. All your data is stored privately on your device — never shared.</Text>
                </View>
              </View>

              <Text style={st.aboutSectionTitle}>SCORING GUIDE</Text>
              <Text style={st.aboutBody}>
                {'80-100  Excellent — keep it up\n60-79   Good — room for improvement\n40-59   Moderate — focus on weak areas\n20-39   Elevated — consider lifestyle changes\n0-19    High risk — consult a professional'}
              </Text>

              <Text style={st.aboutSectionTitle}>FACTORS EXPLAINED</Text>
              <Text style={st.aboutBody}>
                <Text style={{ fontWeight: '500', color: 'rgba(255,255,255,0.85)' }}>Sleep (1-10):</Text> Rate your sleep quality. 10 = restful, deep sleep.{'\n\n'}
                <Text style={{ fontWeight: '500', color: 'rgba(255,255,255,0.85)' }}>Stress (1-10):</Text> Rate your calmness level. 10 = very calm, 1 = very stressed.{'\n\n'}
                <Text style={{ fontWeight: '500', color: 'rgba(255,255,255,0.85)' }}>Diet (1-10):</Text> Rate your anti-inflammatory diet. 10 = whole foods, omega-3 rich.{'\n\n'}
                <Text style={{ fontWeight: '500', color: 'rgba(255,255,255,0.85)' }}>Exercise (1-10):</Text> Rate your physical activity. 10 = intense workout.
              </Text>

              <Text style={st.aboutSectionTitle}>LEGAL</Text>
              <View style={st.aboutLinks}>
                <Pressable
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL(PRIVACY_URL); }}
                  style={st.aboutLinkRow}
                >
                  <Ionicons name="shield-checkmark-outline" size={16} color={theme.colors.textTertiary} />
                  <Text style={st.aboutLinkText}>Privacy Policy</Text>
                  <Ionicons name="open-outline" size={14} color={theme.colors.textTertiary} />
                </Pressable>
                <Pressable
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL(TERMS_URL); }}
                  style={st.aboutLinkRow}
                >
                  <Ionicons name="document-text-outline" size={16} color={theme.colors.textTertiary} />
                  <Text style={st.aboutLinkText}>Terms of Use (EULA)</Text>
                  <Ionicons name="open-outline" size={14} color={theme.colors.textTertiary} />
                </Pressable>
              </View>

              <Text style={st.aboutFooter}>Made with care for Wellness Warriors.</Text>
            </ScrollView>

            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAbout(false); }}
              style={st.aboutCloseBtn}
            >
              <Text style={st.aboutCloseBtnText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
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

  // --- Subscription Card ---
  subscriptionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderCurve: 'continuous',
    borderWidth: 0.5,
    borderColor: theme.colors.surfaceBorder,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // --- Reminder Card ---
  reminderCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderCurve: 'continuous',
    borderWidth: 0.5,
    borderColor: theme.colors.surfaceBorder,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  reminderToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderDivider: {
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 12,
  },
  pickerWrap: {
    alignItems: 'center',
  },
  timeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  timeLabelText: {
    fontSize: 14,
    fontWeight: '300',
    color: theme.colors.gold,
    letterSpacing: 0.5,
  },
  pickerContainer: {
    marginTop: 4,
    overflow: 'hidden',
  },

  // --- About Modal ---
  aboutCard: {
    backgroundColor: 'rgba(12,12,28,0.97)',
    borderRadius: theme.radius.sheet,
    borderCurve: 'continuous',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: theme.spacing.lg,
    width: '90%',
    maxHeight: '80%',
  },
  aboutHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  aboutAppName: {
    fontSize: 20,
    fontWeight: '300',
    letterSpacing: 3,
    color: '#FFFFFF',
    marginTop: theme.spacing.md,
  },
  aboutVersion: {
    fontSize: 12,
    fontWeight: '300',
    color: theme.colors.textTertiary,
    marginTop: 4,
  },
  aboutSectionTitle: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 3,
    color: theme.colors.gold,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  aboutBody: {
    fontSize: 13,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  aboutStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  aboutStepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    marginRight: theme.spacing.sm,
  },
  aboutStepContent: {
    flex: 1,
  },
  aboutStepTitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  aboutLinks: {
    gap: theme.spacing.sm,
  },
  aboutLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  aboutLinkText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.6)',
  },
  aboutFooter: {
    fontSize: 12,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.25)',
    textAlign: 'center',
    marginTop: theme.spacing.xl,
    letterSpacing: 0.5,
  },
  aboutCloseBtn: {
    marginTop: theme.spacing.md,
    paddingVertical: 14,
    borderRadius: theme.radius.button,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  aboutCloseBtnText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
}));
