/**
 * Curio Scoring Engine
 *
 * Calculates mCurio (micro-curio) awards for quiz completions.
 * All calculations use integer mCurio to avoid floating-point issues.
 */

import {
  MCURIO_PER_CURIO,
  QUIZ_BASE_MCURIO,
  QUIZ_PASS_THRESHOLD,
  EXCELLENCE_BONUS_RATE,
  ATTEMPT_MULTIPLIER,
  TRUST_TIER_MULTIPLIER,
  DAILY_COURSE_MULTIPLIER,
  TOPIC_REVISIT_MULTIPLIER,
} from './constants'
import type { QuizDifficulty, TrustTier, QuizScoreParams, CurioBreakdown } from './types'

// ============================================
// Conversion Utilities
// ============================================

/**
 * Convert mCurio to Curio for display
 */
export function mcurioToCurio(mcurio: number): number {
  return mcurio / MCURIO_PER_CURIO
}

/**
 * Convert Curio to mCurio for storage
 */
export function curioToMcurio(curio: number): number {
  return Math.floor(curio * MCURIO_PER_CURIO)
}

/**
 * Format mCurio as display string (e.g., "30.5 Curio")
 */
export function formatMcurio(mcurio: number, decimals: number = 1): string {
  const curio = mcurioToCurio(mcurio)
  return `${curio.toFixed(decimals)} Curio`
}

// ============================================
// Quiz Scoring
// ============================================

/**
 * Check if quiz score meets pass threshold
 */
export function didPassQuiz(
  score: number,
  totalQuestions: number,
  difficulty: QuizDifficulty
): boolean {
  const threshold = QUIZ_PASS_THRESHOLD[difficulty]
  // Normalize to the expected question count
  if (totalQuestions === threshold.total) {
    return score >= threshold.required
  }
  // For non-standard question counts, use 80% threshold
  return score / totalQuestions >= 0.8
}

/**
 * Calculate excellence bonus mCurio
 */
function calculateExcellenceBonus(
  baseMcurio: number,
  score: number,
  totalQuestions: number,
  difficulty: QuizDifficulty
): number {
  const percentage = score / totalQuestions

  if (difficulty === 'hard') {
    const hardRates = EXCELLENCE_BONUS_RATE.hard
    if (percentage === 1.0) {
      return Math.floor(baseMcurio * hardRates.perfect)
    }
    if (score === 9 && totalQuestions === 10) {
      return Math.floor(baseMcurio * hardRates.near)
    }
    return 0
  }

  // Easy and Medium: perfect score only
  if (percentage === 1.0) {
    const rate = difficulty === 'medium'
      ? EXCELLENCE_BONUS_RATE.medium.perfect
      : EXCELLENCE_BONUS_RATE.easy.perfect
    return Math.floor(baseMcurio * rate)
  }

  return 0
}

/**
 * Get attempt multiplier for given attempt number
 */
function getAttemptMultiplier(attemptNumber: number): number {
  if (attemptNumber >= 4) return ATTEMPT_MULTIPLIER[4]
  return ATTEMPT_MULTIPLIER[attemptNumber] ?? ATTEMPT_MULTIPLIER[4]
}

/**
 * Get daily course multiplier
 */
function getDailyCourseMultiplier(coursesCompletedToday: number): number {
  // coursesCompletedToday is count BEFORE this one, so add 1
  const courseNumber = coursesCompletedToday + 1
  if (courseNumber >= 4) return DAILY_COURSE_MULTIPLIER[4]
  return DAILY_COURSE_MULTIPLIER[courseNumber] ?? DAILY_COURSE_MULTIPLIER[4]
}

/**
 * Get topic revisit multiplier
 */
function getTopicRevisitMultiplier(topicCompletionsThisMonth: number): number {
  // topicCompletionsThisMonth is count BEFORE this one, so add 1
  const completionNumber = topicCompletionsThisMonth + 1
  if (completionNumber >= 3) return TOPIC_REVISIT_MULTIPLIER[3]
  return TOPIC_REVISIT_MULTIPLIER[completionNumber] ?? TOPIC_REVISIT_MULTIPLIER[3]
}

/**
 * Calculate total mCurio for a quiz completion
 *
 * Formula:
 * 1. Start with base mCurio for difficulty
 * 2. Add excellence bonus if applicable
 * 3. Apply attempt multiplier
 * 4. Apply trust tier multiplier
 * 5. Apply daily course multiplier
 * 6. Apply topic revisit multiplier
 */
export function calculateQuizMcurio(params: QuizScoreParams): CurioBreakdown {
  const {
    quizDifficulty,
    score,
    totalQuestions,
    attemptNumber,
    trustTier,
    coursesCompletedToday,
    topicCompletionsThisMonth,
  } = params

  // Check if passed
  const passed = didPassQuiz(score, totalQuestions, quizDifficulty)

  // If not passed, no Curio awarded
  if (!passed) {
    return {
      baseMcurio: 0,
      excellenceBonus: 0,
      attemptMultiplier: 0,
      trustTierMultiplier: 0,
      dailyCourseMultiplier: 0,
      topicRevisitMultiplier: 0,
      finalMcurio: 0,
      components: {
        afterExcellence: 0,
        afterAttempt: 0,
        afterTrust: 0,
        afterDaily: 0,
        afterTopicRevisit: 0,
      },
      passed: false,
      summary: `Quiz not passed (${score}/${totalQuestions})`,
    }
  }

  // 1. Base mCurio
  const baseMcurio = QUIZ_BASE_MCURIO[quizDifficulty]

  // 2. Excellence bonus
  const excellenceBonus = calculateExcellenceBonus(
    baseMcurio,
    score,
    totalQuestions,
    quizDifficulty
  )
  const afterExcellence = baseMcurio + excellenceBonus

  // 3. Attempt multiplier
  const attemptMult = getAttemptMultiplier(attemptNumber)
  const afterAttempt = Math.floor(afterExcellence * attemptMult)

  // 4. Trust tier multiplier
  const trustMult = TRUST_TIER_MULTIPLIER[trustTier]
  const afterTrust = Math.floor(afterAttempt * trustMult)

  // 5. Daily course multiplier
  const dailyMult = getDailyCourseMultiplier(coursesCompletedToday)
  const afterDaily = Math.floor(afterTrust * dailyMult)

  // 6. Topic revisit multiplier
  const topicMult = getTopicRevisitMultiplier(topicCompletionsThisMonth)
  const finalMcurio = Math.floor(afterDaily * topicMult)

  // Build summary
  const summaryParts: string[] = []
  summaryParts.push(`Base: ${formatMcurio(baseMcurio)}`)
  if (excellenceBonus > 0) {
    summaryParts.push(`+${formatMcurio(excellenceBonus)} excellence`)
  }
  if (attemptMult < 1) {
    summaryParts.push(`×${attemptMult} (attempt ${attemptNumber})`)
  }
  if (trustMult < 1) {
    summaryParts.push(`×${trustMult} (${trustTier})`)
  }
  if (dailyMult < 1) {
    summaryParts.push(`×${dailyMult} (course ${coursesCompletedToday + 1} today)`)
  }
  if (topicMult < 1) {
    summaryParts.push(`×${topicMult} (revisit ${topicCompletionsThisMonth + 1})`)
  }
  summaryParts.push(`= ${formatMcurio(finalMcurio)}`)

  return {
    baseMcurio,
    excellenceBonus,
    attemptMultiplier: attemptMult,
    trustTierMultiplier: trustMult,
    dailyCourseMultiplier: dailyMult,
    topicRevisitMultiplier: topicMult,
    finalMcurio,
    components: {
      afterExcellence,
      afterAttempt,
      afterTrust,
      afterDaily,
      afterTopicRevisit: finalMcurio,
    },
    passed: true,
    summary: summaryParts.join(' '),
  }
}

// ============================================
// Preview Utilities
// ============================================

/**
 * Get the range of possible mCurio for a quiz
 */
export function getMcurioRange(
  difficulty: QuizDifficulty,
  trustTier: TrustTier = 'vetted'
): { min: number; max: number; maxWithBonus: number } {
  const base = QUIZ_BASE_MCURIO[difficulty]
  const trustMult = TRUST_TIER_MULTIPLIER[trustTier]

  // Min: 4th attempt, 4th course of day, 3rd topic revisit
  const min = Math.floor(
    base * ATTEMPT_MULTIPLIER[4] * trustMult * DAILY_COURSE_MULTIPLIER[4] * TOPIC_REVISIT_MULTIPLIER[3]
  )

  // Max: 1st attempt, 1st course of day, 1st topic
  const max = Math.floor(base * trustMult)

  // Max with excellence bonus
  const bonusRate = difficulty === 'hard'
    ? EXCELLENCE_BONUS_RATE.hard.perfect
    : difficulty === 'medium'
    ? EXCELLENCE_BONUS_RATE.medium.perfect
    : EXCELLENCE_BONUS_RATE.easy.perfect

  const maxWithBonus = Math.floor((base + base * bonusRate) * trustMult)

  return { min, max, maxWithBonus }
}

/**
 * Get warning message about attempt number
 */
export function getAttemptWarning(currentAttempts: number): string | null {
  if (currentAttempts === 1) {
    return 'Second attempt: 50% Curio'
  }
  if (currentAttempts === 2) {
    return 'Third attempt: 25% Curio'
  }
  if (currentAttempts >= 3) {
    return 'No Curio on retry - you already earned max for this quiz'
  }
  return null
}
