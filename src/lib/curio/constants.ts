/**
 * Curio Scoring System Constants
 *
 * All values are in mCurio (micro-curio) for integer-safe calculations.
 * 1 Curio = 1000 mCurio
 */

// ============================================
// Core Constants
// ============================================

/** Conversion factor: 1 Curio = 1000 mCurio */
export const MCURIO_PER_CURIO = 1000

// ============================================
// Quiz Difficulty Configuration
// ============================================

/** Base mCurio rewards by quiz difficulty */
export const QUIZ_BASE_MCURIO = {
  easy: 15_000,   // 15 Curio
  medium: 30_000, // 30 Curio
  hard: 75_000,   // 75 Curio
} as const

/** Pass thresholds by difficulty */
export const QUIZ_PASS_THRESHOLD = {
  easy: { required: 4, total: 5 },
  medium: { required: 4, total: 5 },
  hard: { required: 8, total: 10 },
} as const

/** Excellence bonus rates (fraction of base mCurio) */
export const EXCELLENCE_BONUS_RATE = {
  easy: {
    perfect: 0.10,  // 5/5 = +10%
  },
  medium: {
    perfect: 0.15,  // 5/5 = +15%
  },
  hard: {
    near: 0.15,     // 9/10 = +15%
    perfect: 0.25,  // 10/10 = +25%
  },
} as const

// ============================================
// Multipliers
// ============================================

/** Attempt multipliers - rewards first-try mastery */
export const ATTEMPT_MULTIPLIER: Record<number, number> = {
  1: 1.0,   // 100% on first attempt
  2: 0.5,   // 50% on second attempt
  3: 0.25,  // 25% on third attempt
  4: 0,     // 0% on 4+ attempts
}

/** Trust tier multipliers - content quality factor */
export const TRUST_TIER_MULTIPLIER = {
  vetted: 1.0,      // Staff curated
  verified: 0.6,    // Community proven
  unverified: 0.2,  // New/community
} as const

/** Daily course completion multipliers - anti-grind */
export const DAILY_COURSE_MULTIPLIER: Record<number, number> = {
  1: 1.0,   // 100% - first course of day
  2: 0.75,  // 75% - second course
  3: 0.75,  // 75% - third course
  4: 0.05,  // 5% - fourth+ courses
}

/** Topic revisit multipliers per month - anti-farm */
export const TOPIC_REVISIT_MULTIPLIER: Record<number, number> = {
  1: 1.0,   // 100% - first time this month
  2: 0.25,  // 25% - second time
  3: 0.10,  // 10% - third+ times
}

// ============================================
// Fixed Rewards
// ============================================

/** Daily check-in reward in mCurio */
export const DAILY_CHECKIN_MCURIO = 30_000 // 30 Curio

/** ELI5 voice explanation bonus in mCurio */
export const ELI5_BONUS_MCURIO = 25_000 // 25 Curio

/** Section completion reward in mCurio */
export const SECTION_COMPLETE_MCURIO = 3_000 // 3 Curio

/** Course start reward in mCurio */
export const COURSE_START_MCURIO = 5_000 // 5 Curio

// ============================================
// Curio Club Configuration
// ============================================

/** Percentile threshold for Curio Club (top 10% = 90th percentile) */
export const CURIO_CLUB_PERCENTILE = 90

/** Minimum quiz passes required for eligibility */
export const CURIO_CLUB_MIN_QUIZZES = 5

/** Minimum monthly active users before activating Curio Club perks */
export const CURIO_CLUB_MIN_USERS = 10

// ============================================
// Event Types
// ============================================

export const CURIO_EVENT_TYPES = {
  QUIZ_PASS: 'quiz_pass',
  DAILY_CHECKIN: 'daily_checkin',
  ELI5_BONUS: 'eli5_bonus',
  SECTION_COMPLETED: 'section_completed',
  COURSE_STARTED: 'course_started',
  STREAK_MAINTAINED: 'streak_maintained',
} as const

export type CurioEventType = typeof CURIO_EVENT_TYPES[keyof typeof CURIO_EVENT_TYPES]
