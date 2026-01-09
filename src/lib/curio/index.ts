/**
 * Curio Economy Module
 *
 * Exports all Curio-related utilities and types.
 *
 * v2: Uses mCurio (micro-curio) for integer-safe calculations.
 * 1 Curio = 1000 mCurio
 */

// ============================================
// Legacy exports (deprecated but kept for compatibility)
// ============================================
export {
  calculateQuizCurio,
  getAttemptMultiplier,
  getDailyCourseMultiplier,
  getAttemptWarning,
  getIntensityLabel,
  formatCurio,
  getCurioRange,
  CURIO_BASE_AMOUNTS,
  ATTEMPT_MULTIPLIERS,
  PERFECT_SCORE_BONUS,
  DAILY_COURSE_MULTIPLIERS,
} from './calculateCurio'

export type {
  Intensity,
  CurioCalculationParams,
  CurioCalculationResult,
} from './calculateCurio'

// ============================================
// v2: mCurio-based scoring system
// ============================================

// Constants
export {
  MCURIO_PER_CURIO,
  QUIZ_BASE_MCURIO,
  QUIZ_PASS_THRESHOLD,
  EXCELLENCE_BONUS_RATE,
  ATTEMPT_MULTIPLIER,
  TRUST_TIER_MULTIPLIER,
  DAILY_COURSE_MULTIPLIER,
  TOPIC_REVISIT_MULTIPLIER,
  DAILY_CHECKIN_MCURIO,
  ELI5_BONUS_MCURIO,
  SECTION_COMPLETE_MCURIO,
  COURSE_START_MCURIO,
  CURIO_CLUB_PERCENTILE,
  CURIO_CLUB_MIN_QUIZZES,
  CURIO_CLUB_MIN_USERS,
  CURIO_EVENT_TYPES,
} from './constants'

export type { CurioEventType } from './constants'

// Types
export type {
  QuizDifficulty,
  TrustTier,
  QuizScoreParams,
  CurioBreakdown,
  AwardMcurioParams,
  AwardResult,
  DailyCheckinResult,
  MonthlyLeaderboardEntry,
  UserMonthlyPosition,
  ELI5Concept,
  ELI5SubmissionResult,
} from './types'

// Calculator
export {
  mcurioToCurio,
  curioToMcurio,
  formatMcurio,
  didPassQuiz,
  calculateQuizMcurio,
  getMcurioRange,
  getAttemptWarning as getMcurioAttemptWarning,
} from './calculateMcurio'

// Award Service
export {
  awardMcurio,
  awardQuizCompletion,
  awardDailyCheckin,
  awardCourseStart,
  awardSectionComplete,
  getUserDailyCourseCount,
  getTopicCompletionCount,
  incrementTopicCompletion,
} from './awardService'
