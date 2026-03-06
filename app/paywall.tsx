import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native-unistyles';
import * as Haptics from 'expo-haptics';
import PaywallStep from '../src/screens/onboarding/steps/PaywallStep';

export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <View style={s.screen}>
      {/* Close button */}
      <Pressable
        onPress={handleClose}
        hitSlop={12}
        style={[s.closeBtn, { top: insets.top + 12 }]}
      >
        <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
      </Pressable>

      <PaywallStep onNext={() => router.back()} />
    </View>
  );
}

const s = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
