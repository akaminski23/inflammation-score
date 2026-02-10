import { UnistylesRuntime } from 'react-native-unistyles';

// --- Centralized Empire color mapping ---
// Single source of truth for score/value → color across all screens.

const SCORE_HEX = {
  excellent: '#50C878',
  good: '#7FD858',
  medium: '#FFD700',
  poor: '#FF6B35',
  bad: '#E0115F',
} as const;

const SCORE_RGB = {
  excellent: '80,200,120',
  good: '127,216,88',
  medium: '255,215,0',
  poor: '255,107,53',
  bad: '224,17,95',
} as const;

type ScoreTier = 'excellent' | 'good' | 'medium' | 'poor' | 'bad';

function getTier(score: number): ScoreTier {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'medium';
  if (score >= 20) return 'poor';
  return 'bad';
}

/** Score (0-100) → Empire hex color */
export function getScoreColor(score: number): string {
  return SCORE_HEX[getTier(score)];
}

/** Score (0-100) → rgba with custom alpha (for gradients/fills) */
export function getScoreColorAlpha(score: number, alpha: number): string {
  return `rgba(${SCORE_RGB[getTier(score)]},${alpha})`;
}

/** Theme-aware score color (reads from Unistyles theme) */
export function getScoreColorThemed(score: number): string {
  const theme = UnistylesRuntime.getTheme();
  if (score >= 80) return theme.colors.scoreExcellent;
  if (score >= 60) return theme.colors.scoreGood;
  if (score >= 40) return theme.colors.scoreMedium;
  if (score >= 20) return theme.colors.scorePoor;
  return theme.colors.scoreBad;
}

/** Factor value (1-10) → color, with optional inversion for Stress */
export function getValueColor(value: number, inverted: boolean): string {
  const theme = UnistylesRuntime.getTheme();
  const effective = inverted ? 11 - value : value;
  if (effective >= 8) return theme.colors.scoreExcellent;
  if (effective >= 6) return theme.colors.scoreGood;
  if (effective >= 4) return theme.colors.scoreMedium;
  if (effective >= 2) return theme.colors.scorePoor;
  return theme.colors.scoreBad;
}
