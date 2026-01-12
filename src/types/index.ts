export * from './database'
export * from './blueprint'

// AI Types
export type AIProvider = 'openai' | 'anthropic'

export interface AIExplanationRequest {
  question: string
  provider?: AIProvider
}

export interface CourseGenerationRequest {
  topic: string
  intensity: 'skim' | 'solid' | 'deep'
  timeBudget: 5 | 15 | 30 | 45
  provider?: AIProvider
}

export interface CourseSection {
  id: string
  title: string
  content: string
  example?: string // Pre-generated example, separate from main content
  estimatedMinutes: number
}

export interface CourseContent {
  title?: string
  sections: CourseSection[]
  totalEstimatedMinutes: number
  generatedAt: string
}

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
}

export interface Quiz {
  questions: QuizQuestion[]
}

// Voice Types
export interface TranscriptResult {
  text: string
  isFinal: boolean
  confidence: number
}

// Gamification Types - Curio Economy
export type CurioAction =
  | 'question_asked'
  | 'course_started'
  | 'section_completed'
  | 'lesson_completed'
  | 'quiz_passed'
  | 'eli5_passed'
  | 'streak_maintained'

export interface CurioResult {
  curio: number
  curioEarned: number
  newTitle?: string
  titleUpgraded: boolean
  breakdown?: {
    difficultyBase: number
    attemptMultiplier: string
    attemptPenalty: number
    perfectBonus: number
    dailyBonus: number
    dailyMultiplier: string
  }
}

export interface BadgeRequirement {
  type: 'questions_asked' | 'courses_completed' | 'streak_days' | 'quiz_perfect_score' | 'curio_points' | 'category_mastery'
  count: number
  category?: string
}

// Leaderboard Types
export interface LeaderboardEntry {
  rank: number
  userId: string
  username: string | null
  displayName: string | null
  avatarUrl: string | null
  monthlyCurio: number         // Curio (display value)
  monthlyMcurio?: number       // Raw mCurio value
  quizCount?: number           // Number of quizzes passed this month
  currentTitle: string
  isCurrentUser?: boolean
  isEligible?: boolean         // Met minimum quiz requirement
  isCurioClub?: boolean        // Top 10% and eligible
}

export interface UserLeaderboardPosition {
  rank: number | null
  totalUsers: number
  percentile: number | null
  monthlyCurio: number         // Curio (display value)
  monthlyMcurio?: number       // Raw mCurio value
  quizCount?: number           // Number of quizzes passed this month
  isEligible?: boolean         // Met minimum quiz requirement
  isTopTenPercent: boolean
  isCurioClub?: boolean        // Top 10% and eligible
}

// Curio Circles Types
export interface CurioCircle {
  id: string
  name: string
  description: string | null
  inviteCode: string
  createdBy: string
  maxMembers: number
  memberCount?: number
  createdAt: string
}

export interface CurioCircleMember {
  id: string
  circleId: string
  userId: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: string
  user?: {
    displayName: string | null
    avatarUrl: string | null
    currentTitle: string
  }
}

export interface CircleLeaderboardEntry extends LeaderboardEntry {
  role: 'owner' | 'admin' | 'member'
}

// Pricing Eligibility
export interface PricingEligibility {
  isEligible: boolean
  eligibleUntil: string | null
  currentPercentile: number | null
  requiredPercentile: number // 10 = top 10%
}

// UI Types
export type Intensity = 'skim' | 'solid' | 'deep'
export type TimeBudget = 5 | 15 | 30 | 45

// Almanac Course Depth (standardized for competitive fairness)
export type CourseDepth = 'quick' | 'solid' | 'deep'

export interface DepthConfig {
  label: string
  minutes: number
  sections: number
  description: string
  icon: string
}

export const DEPTH_CONFIG: Record<CourseDepth, DepthConfig> = {
  quick: {
    label: 'Quick',
    minutes: 5,
    sections: 4,
    description: 'Get the essentials in a few minutes',
    icon: '⚡'
  },
  solid: {
    label: 'Solid',
    minutes: 15,
    sections: 6,
    description: 'Balanced understanding with examples',
    icon: '📚'
  },
  deep: {
    label: 'Deep',
    minutes: 30,
    sections: 8,
    description: 'Comprehensive mastery',
    icon: '🎓'
  }
}

export interface AlmanacCourse {
  id: string
  showcase_topic_id: string
  depth: CourseDepth
  content: CourseContent
  quiz_questions: Quiz
  estimated_minutes: number
  section_count: number
  generated_at: string
  topic?: AlmanacTopic
}

export interface Category {
  id: string
  name: string
  icon: string
  color: string
}

// Almanac Hierarchical Categories
export interface AlmanacCategory {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string | null
  parent_id: string | null
  display_order: number
  children?: AlmanacCategory[]
  topics?: AlmanacTopic[]
  topic_count?: number
}

export interface AlmanacTopic {
  id: string
  topic: string
  description: string
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimated_minutes: number
  display_order: number
  subcategory_id: string | null
  existingCourseId?: string | null
  inBacklog?: boolean
}

export const CATEGORIES: Category[] = [
  { id: 'science', name: 'Science & Engineering', icon: '🔬', color: 'blue' },
  { id: 'history', name: 'History & Civilization', icon: '🏛️', color: 'amber' },
  { id: 'philosophy', name: 'Philosophy & Ethics', icon: '🤔', color: 'purple' },
  { id: 'economics', name: 'Economics & Society', icon: '📊', color: 'green' },
  { id: 'mind', name: 'Mind & Learning', icon: '🧠', color: 'pink' },
  { id: 'misc', name: 'Curiosity / Misc', icon: '✨', color: 'slate' },
]

// Daily Curio Types
export type DailyCategory = 'science' | 'history' | 'philosophy' | 'economics' | 'mind' | 'misc'

export interface DailyTopic {
  id: string
  date: string
  topic: string
  description: string | null
  category: DailyCategory | null
  ai_provider: string
  generated_at: string
}

export interface DailyCourse {
  id: string
  daily_topic_id: string
  date: string
  content: CourseContent
  quiz_questions: Quiz
  intensity: 'skim'
  time_budget: 5
  created_at: string
}

export interface DailyCompletion {
  id: string
  user_id: string
  daily_course_id: string
  date: string
  quiz_answers: number[] | null
  quiz_score: number | null
  unlocked: boolean
  started_at: string
  completed_at: string | null
}

export interface DailyStatus {
  available: boolean
  hasStarted: boolean
  hasCompleted: boolean
  score: number | null
  unlocked: boolean
  streak: number
  longestStreak: number
}

export interface DailyCurioData {
  dailyCourse: DailyCourse & {
    daily_topic: DailyTopic
  }
  completion: DailyCompletion | null
  hasCompleted: boolean
  hasStarted: boolean
}

export interface DailyQuizResult {
  success: boolean
  score: number
  totalQuestions: number
  unlocked: boolean
  streak: number
  curioEarned: number
}

// Legacy aliases for backward compatibility during migration
/** @deprecated Use CurioAction instead */
export type KarmaAction = CurioAction
/** @deprecated Use CurioResult instead */
export type KarmaResult = CurioResult & { karma: number; karmaEarned: number }

// Chat-First Learning Types
export type ChatMode = 'guided' | 'clarification'
export type StepKind = 'intro' | 'content' | 'check' | 'summary'
export type LessonChatAction = 'start' | 'next' | 'clarify' | 'example'

export interface ChatState {
  mode: ChatMode
  currentSectionIndex: number
  currentStepIndex: number
  messagesCount: number
  lastStepKind: StepKind
  lastUpdated: string
}

export interface ChatMessage {
  id: string
  role: 'assistant' | 'user'
  content: string
  type: 'lesson' | 'clarification' | 'action'
  timestamp: Date
}

export interface LessonStep {
  kind: StepKind
  content: string
  sectionIndex: number
  stepIndex: number
}

export interface LessonChatRequest {
  courseId: string
  action: LessonChatAction
  sectionIndex: number
  stepIndex: number
  userMessage?: string
  conversationHistory: { role: 'user' | 'assistant'; content: string }[]
}
