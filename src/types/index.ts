export * from './database'

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
  estimatedMinutes: number
}

export interface CourseContent {
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

// Gamification Types
export type KarmaAction =
  | 'question_asked'
  | 'course_started'
  | 'section_completed'
  | 'quiz_passed'
  | 'streak_maintained'

export interface KarmaResult {
  karma: number
  karmaEarned: number
  newTitle?: string
  titleUpgraded: boolean
}

export interface BadgeRequirement {
  type: 'questions_asked' | 'courses_completed' | 'streak_days' | 'quiz_perfect_score' | 'karma_points' | 'category_mastery'
  count: number
  category?: string
}

// UI Types
export type Intensity = 'skim' | 'solid' | 'deep'
export type TimeBudget = 5 | 15 | 30 | 45

export interface Category {
  id: string
  name: string
  icon: string
  color: string
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
  karmaEarned: number
}
