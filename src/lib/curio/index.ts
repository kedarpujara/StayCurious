/**
 * Curio Economy Module
 *
 * Exports all Curio-related utilities and types
 */

export {
  calculateQuizCurio,
  getAttemptMultiplier,
  getAttemptWarning,
  getIntensityLabel,
  formatCurio,
  getCurioRange,
  CURIO_BASE_AMOUNTS,
  ATTEMPT_MULTIPLIERS,
  PERFECT_SCORE_BONUS,
} from './calculateCurio';

export type {
  Intensity,
  CurioCalculationParams,
  CurioCalculationResult,
} from './calculateCurio';
