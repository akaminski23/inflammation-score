import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { setSetting } from '../src/db/client';
import OnboardingFlow from '../src/screens/onboarding/OnboardingFlow';

export default function Onboarding() {
  const router = useRouter();

  const handleComplete = useCallback(() => {
    setSetting('onboarding_complete', '1');
    router.replace('/(tabs)');
  }, [router]);

  return <OnboardingFlow onComplete={handleComplete} />;
}
