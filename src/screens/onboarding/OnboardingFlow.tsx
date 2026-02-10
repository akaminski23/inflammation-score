import { useCallback, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';
import MeshGradient from './MeshGradient';
import WelcomeStep from './steps/WelcomeStep';
import ProblemStep from './steps/ProblemStep';
import FirstInputStep from './steps/FirstInputStep';
import InsightStep from './steps/InsightStep';
import AnalysisWowMoment from './AnalysisWowMoment';
import PaywallStep from './steps/PaywallStep';

enum OnboardingStep {
  Welcome = 0,
  ProblemIdentification = 1,
  FirstInput = 2,
  InsightSolution = 3,
  AnalysisWowMoment = 4,
  Paywall = 5,
}

const STEP_ORDER: OnboardingStep[] = [
  OnboardingStep.Welcome,
  OnboardingStep.ProblemIdentification,
  OnboardingStep.FirstInput,
  OnboardingStep.InsightSolution,
  OnboardingStep.AnalysisWowMoment,
  OnboardingStep.Paywall,
];

interface OnboardingFlowProps {
  onComplete: () => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<OnboardingStep>(OnboardingStep.Welcome);

  const handleNext = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(step);

    // CRITICAL: Last step → complete onboarding, navigate away. Never loop.
    if (currentIndex >= STEP_ORDER.length - 1) {
      onComplete();
      return;
    }

    setStep(STEP_ORDER[currentIndex + 1]);
  }, [step, onComplete]);

  return (
    <View style={flowStyles.screen}>
      {/* Persistent liquid mesh gradient background */}
      <MeshGradient />

      {/* Step content — only ONE rendered at a time */}
      <Animated.View
        key={step}
        entering={FadeIn.duration(400)}
        exiting={FadeOut.duration(200)}
        style={flowStyles.stepContainer}
      >
        {step === OnboardingStep.Welcome && <WelcomeStep onNext={handleNext} />}
        {step === OnboardingStep.ProblemIdentification && <ProblemStep onNext={handleNext} />}
        {step === OnboardingStep.FirstInput && <FirstInputStep onNext={handleNext} />}
        {step === OnboardingStep.InsightSolution && <InsightStep onNext={handleNext} />}
        {step === OnboardingStep.AnalysisWowMoment && <AnalysisWowMoment onNext={handleNext} />}
        {step === OnboardingStep.Paywall && <PaywallStep onNext={handleNext} />}
      </Animated.View>
    </View>
  );
}

const flowStyles = StyleSheet.create(() => ({
  screen: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
  stepContainer: {
    flex: 1,
  },
}));
