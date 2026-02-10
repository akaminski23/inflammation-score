import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native-unistyles';
import { getSetting } from '../src/db/client';

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
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
}));
