import { useEffect, useState, Component, type ReactNode, type ErrorInfo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native-unistyles';
import { getSetting } from '../src/db/client';
import { RevenueCatProvider } from '../src/providers/RevenueCatProvider';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App ErrorBoundary:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorScreen}>
          <Ionicons name="alert-circle-outline" size={56} color="#E0115F" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorSubtitle}>The app encountered an unexpected error.</Text>
          <Pressable
            onPress={() => this.setState({ hasError: false })}
            style={styles.errorButton}
          >
            <Text style={styles.errorButtonText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const val = getSetting('onboarding_complete');
    const needs = val !== '1';
    setNeedsOnboarding(needs);
    setReady(true);
  }, []);

  // Redirect once on mount — no segments dependency = no loop
  useEffect(() => {
    if (!ready) return;
    if (needsOnboarding) {
      router.replace('/onboarding');
    }
  }, [ready, needsOnboarding, router]);

  if (!ready) {
    return <View style={styles.root} />;
  }

  return (
    <ErrorBoundary>
      <RevenueCatProvider>
        <GestureHandlerRootView style={styles.root}>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="paywall"
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
          </Stack>
        </GestureHandlerRootView>
      </RevenueCatProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  errorScreen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '300',
    letterSpacing: 3,
    color: '#FFFFFF',
    marginTop: 16,
  },
  errorSubtitle: {
    fontSize: 14,
    fontWeight: '300',
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
  errorButton: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: theme.radius.button,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  errorButtonText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
}));
