import { StyleSheet } from 'react-native-unistyles';

const empireTheme = {
  colors: {
    bg: '#0A0A1A',
    bgGradientEnd: '#000000',
    surface: 'rgba(255,255,255,0.06)',
    surfaceBorder: 'rgba(255,255,255,0.12)',
    text: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.55)',
    textTertiary: 'rgba(255,255,255,0.35)',
    accent: '#50C878',
    accentDim: 'rgba(80,200,120,0.15)',
    accentGlow: 'rgba(80,200,120,0.40)',
    gold: '#D4AF37',
    ruby: '#E0115F',
    cyan: '#00F5FF',
    warning: '#FF6B35',
    scoreExcellent: '#50C878',
    scoreGood: '#7FD858',
    scoreMedium: '#FFD700',
    scorePoor: '#FF6B35',
    scoreBad: '#E0115F',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radius: {
    badge: 6,
    chip: 8,
    button: 12,
    card: 16,
    modal: 20,
    sheet: 24,
    pill: 1000,
  },
  typography: {
    headerLight: {
      fontWeight: '200' as const,
      letterSpacing: 6,
    },
    headerMedium: {
      fontWeight: '300' as const,
      letterSpacing: 5,
    },
    body: {
      fontWeight: '400' as const,
      letterSpacing: 0.3,
    },
    label: {
      fontWeight: '300' as const,
      letterSpacing: 0.5,
    },
  },
} as const;

type EmpireTheme = typeof empireTheme;

declare module 'react-native-unistyles' {
  export interface UnistylesThemes {
    empire: EmpireTheme;
  }
}

StyleSheet.configure({
  themes: {
    empire: empireTheme,
  },
  settings: {
    initialTheme: 'empire',
  },
});
