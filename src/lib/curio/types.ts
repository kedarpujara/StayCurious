/**
 * Curio Scoring System Types
 */

// ============================================
// Core Types
// ============================================

export type QuizDifficulty = 'easy' | 'medium' | 'hard'
export type TrustTier = 'vetted' | 'verified' | 'unverified'

// ============================================
// Calculation Types
// ============================================

/** Parameters for calculating quiz mCurio */
export interface QuizScoreParams {
  /** Quiz difficulty level */
  quizDifficulty: QuizDifficulty
  /** Number of correct answers */
  score: number
  /** Total number of questions */
  totalQuestions: number
  /** Which attempt this is (1, 2, 3, 4+) */
  attemptNumber: number
  /** Content trust tier */
  trustTier: TrustTier
  /** How many courses user has completed today (UTC) */
  coursesCompletedToday: number
  /** How many times user has completed this topic this month */
  topicCompletionsThisMonth: number
}

/** Full breakdown of mCurio calculation */
export interface CurioBreakdown {
  /** Base mCurio for quiz difficulty */
  baseMcurio: number
  /** Bonus mCurio for perfect/near-perfect score */
  excellenceBonus: number
  /** Multiplier applied for attempt number (0-1) */
  attemptMultiplier: number
  /** Multiplier for content trust tier (0-1) */
  trustTierMultiplier: number
  /** Multiplier for daily course count (0-1) */
  dailyCourseMultiplier: number
  /** Multiplier for topic revisit in month (0-1) */
  topicRevisitMultiplier: number
  /** Final mCurio after all multipliers */
  finalMcurio: number
  /** Intermediate values for debugging */
  components: {
    afterExcellence: number
    afterAttempt: number
    afterTrust: number
    afterDaily: number
    afterTopicRevisit: number
  }
  /** Whether quiz was passed */
  passed: boolean
  /** Human-readable summary */
  summary: string
}

// ============================================
// Award Types
// ============================================

/** Parameters for awarding mCurio */
export interface AwardMcurioParams {
  userId: string
  eventType: string
  mcurio: number
  breakdown: CurioBreakdown | Record<string, unknown>
  idempotencyKey: string
  courseId?: string
  quizAttempt?: number
  topicKey?: string
}

/** Result of awarding mCurio */
export interface AwardResult {
  success: boolean
  newTotalMcurio: number
  alreadyAwarded: boolean
  mcurioAwarded: number
}

// ============================================
// Daily Check-in Types
// ============================================

export interface DailyCheckinResult {
  success: boolean
  mcurioAwarded: number
  alreadyCheckedIn: boolean
  dateUtc: string
}

// ============================================
// Leaderboard Types
// ============================================

export interface MonthlyLeaderboardEntry {
  rank: number
  userId: string
  displayName: string | null
  avatarUrl: string | null
  monthlyMcurio: number
  monthlyCurio: number
  quizPasses: number
  currentTitle: string
  isCurioClub: boolean
}

export interface UserMonthlyPosition {
  rank: number
  totalUsers: number
  percentile: number
  monthlyMcurio: number
  monthlyCurio: number
  quizPasses: number
  isEligible: boolean
  isCurioClub: boolean
}

// ============================================
// ELI5 Types
// ============================================

export interface ELI5Concept {
  concept: string
  transcript?: string
  evaluation?: {
    pass: boolean
    reason: string
    simplicityScore: number
    correctnessScore: number
    completenessScore: number
  }
}

export interface ELI5SubmissionResult {
  success: boolean
  passed: boolean
  mcurioAwarded: number
  conceptResults: ELI5Concept[]
}
