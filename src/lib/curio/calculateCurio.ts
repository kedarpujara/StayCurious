/**
 * Curio Calculation Logic
 *
 * Pure functions for calculating Curio earned from course completions.
 * Based on intensity (difficulty) and quiz attempt number.
 */

export type Intensity = 'skim' | 'solid' | 'deep';

export interface CurioCalculationParams {
  intensity: Intensity;
  quizScore: number; // 0-100 percentage
  attemptNumber: number; // 1, 2, 3, 4+
}

export interface CurioCalculationResult {
  baseCurio: number;
  multiplier: number;
  finalCurio: number;
  breakdown: {
    difficultyBase: number;
    attemptMultiplier: string;
    attemptPenalty: number;
    perfectBonus: number;
  };
}

/**
 * Base Curio amounts by intensity (difficulty)
 * skim (Easy): 10 Curio
 * solid (Medium): 25 Curio
 * deep (Hard): 60 Curio
 */
export const CURIO_BASE_AMOUNTS: Record<Intensity, number> = {
  skim: 10,
  solid: 25,
  deep: 60,
} as const;

/**
 * Attempt multipliers - rewards first-try mastery
 * 1st attempt: 100%
 * 2nd attempt: 50%
 * 3rd attempt: 25%
 * 4+ attempts: 0%
 */
export const ATTEMPT_MULTIPLIERS: Record<number, number> = {
  1: 1.0,
  2: 0.5,
  3: 0.25,
  4: 0,
} as const;

/**
 * Perfect score bonus - extra 20% for 100% quiz score
 */
export const PERFECT_SCORE_BONUS = 0.2;

/**
 * Get the multiplier for a given attempt number
 */
export function getAttemptMultiplier(attemptNumber: number): number {
  if (attemptNumber <= 0) return 1.0; // Invalid, default to full
  if (attemptNumber >= 4) return 0;
  return ATTEMPT_MULTIPLIERS[attemptNumber] ?? 0;
}

/**
 * Calculate Curio earned from completing a course quiz
 *
 * Formula:
 * - Base = CURIO_BASE_AMOUNTS[intensity]
 * - Attempt Multiplier = ATTEMPT_MULTIPLIERS[attemptNumber]
 * - Perfect Bonus = 20% of base if quiz_score === 100
 * - Final = floor(base * multiplier) + perfectBonus
 */
export function calculateQuizCurio(params: CurioCalculationParams): CurioCalculationResult {
  const { intensity, quizScore, attemptNumber } = params;

  // Get base curio for this intensity
  const baseCurio = CURIO_BASE_AMOUNTS[intensity];

  // Get attempt multiplier (capped at 4)
  const attemptKey = Math.min(Math.max(attemptNumber, 1), 4);
  const multiplier = getAttemptMultiplier(attemptKey);

  // Calculate base amount after multiplier
  const afterMultiplier = Math.floor(baseCurio * multiplier);

  // Perfect score bonus: extra 20% for 100% score (also affected by attempt multiplier)
  const perfectBonus = quizScore === 100
    ? Math.floor(baseCurio * PERFECT_SCORE_BONUS * multiplier)
    : 0;

  // Final curio
  const finalCurio = afterMultiplier + perfectBonus;

  // Calculate penalty for display purposes
  const attemptPenalty = baseCurio - afterMultiplier;

  return {
    baseCurio,
    multiplier,
    finalCurio,
    breakdown: {
      difficultyBase: baseCurio,
      attemptMultiplier: `${Math.round(multiplier * 100)}%`,
      attemptPenalty,
      perfectBonus,
    },
  };
}

/**
 * Get a human-readable difficulty label for an intensity
 */
export function getIntensityLabel(intensity: Intensity): string {
  const labels: Record<Intensity, string> = {
    skim: 'Easy',
    solid: 'Medium',
    deep: 'Hard',
  };
  return labels[intensity];
}

/**
 * Get attempt warning message to show before quiz
 */
export function getAttemptWarning(currentAttempts: number): string | null {
  if (currentAttempts === 0) {
    return null; // First attempt, no warning
  }
  if (currentAttempts === 1) {
    return 'Second attempt: You will earn 50% of the base Curio';
  }
  if (currentAttempts === 2) {
    return 'Third attempt: You will earn 25% of the base Curio';
  }
  return 'No Curio will be earned on 4th+ attempts (learning only)';
}

/**
 * Format Curio amount for display
 */
export function formatCurio(amount: number): string {
  return `${amount} Curio`;
}

/**
 * Calculate potential Curio range for a course (for preview)
 */
export function getCurioRange(intensity: Intensity): { min: number; max: number; maxWithBonus: number } {
  const base = CURIO_BASE_AMOUNTS[intensity];
  return {
    min: 0, // 4+ attempts
    max: base, // 1st attempt
    maxWithBonus: base + Math.floor(base * PERFECT_SCORE_BONUS), // 1st attempt + perfect score
  };
}
