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
  dailyCourseNumber?: number; // Which course of the day (1st, 2nd, etc.)
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
    dailyBonus: number;
    dailyMultiplier: string;
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
 * Daily course multipliers - rewards the first courses of the day more
 * 1st course of day: 100% bonus (2x)
 * 2nd course: 50% bonus (1.5x)
 * 3rd course: 25% bonus (1.25x)
 * 4th+ course: no bonus (1x)
 */
export const DAILY_COURSE_MULTIPLIERS: Record<number, number> = {
  1: 2.0,   // First course of day gets 2x
  2: 1.5,   // Second gets 1.5x
  3: 1.25,  // Third gets 1.25x
  4: 1.0,   // Fourth and beyond: no bonus
} as const;

/**
 * Get the daily course multiplier based on how many courses completed today
 */
export function getDailyCourseMultiplier(courseNumberToday: number): number {
  if (courseNumberToday <= 0) return DAILY_COURSE_MULTIPLIERS[1];
  if (courseNumberToday >= 4) return DAILY_COURSE_MULTIPLIERS[4];
  return DAILY_COURSE_MULTIPLIERS[courseNumberToday] ?? 1.0;
}

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
 * - Daily Multiplier = DAILY_COURSE_MULTIPLIERS[dailyCourseNumber] (first course of day gets 2x!)
 * - Perfect Bonus = 20% of base if quiz_score === 100
 * - Final = floor((base * attemptMultiplier * dailyMultiplier) + perfectBonus)
 */
export function calculateQuizCurio(params: CurioCalculationParams): CurioCalculationResult {
  const { intensity, quizScore, attemptNumber, dailyCourseNumber = 4 } = params;

  // Get base curio for this intensity
  const baseCurio = CURIO_BASE_AMOUNTS[intensity];

  // Get attempt multiplier (capped at 4)
  const attemptKey = Math.min(Math.max(attemptNumber, 1), 4);
  const attemptMultiplier = getAttemptMultiplier(attemptKey);

  // Get daily course multiplier (first course of day is worth more!)
  const dailyMultiplier = getDailyCourseMultiplier(dailyCourseNumber);

  // Calculate base amount after both multipliers
  const afterAttemptMultiplier = Math.floor(baseCurio * attemptMultiplier);
  const afterDailyMultiplier = Math.floor(afterAttemptMultiplier * dailyMultiplier);

  // Perfect score bonus: extra 20% for 100% score (also affected by multipliers)
  const perfectBonus = quizScore === 100
    ? Math.floor(baseCurio * PERFECT_SCORE_BONUS * attemptMultiplier * dailyMultiplier)
    : 0;

  // Final curio
  const finalCurio = afterDailyMultiplier + perfectBonus;

  // Calculate penalty and bonus for display purposes
  const attemptPenalty = baseCurio - afterAttemptMultiplier;
  const dailyBonus = afterDailyMultiplier - afterAttemptMultiplier;

  // Combined multiplier for display
  const combinedMultiplier = attemptMultiplier * dailyMultiplier;

  return {
    baseCurio,
    multiplier: combinedMultiplier,
    finalCurio,
    breakdown: {
      difficultyBase: baseCurio,
      attemptMultiplier: `${Math.round(attemptMultiplier * 100)}%`,
      attemptPenalty,
      perfectBonus,
      dailyBonus,
      dailyMultiplier: `${Math.round(dailyMultiplier * 100)}%`,
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
