// ===========================================
// BLUEPRINT COURSE TYPES
// Structured content format for deterministic rendering
// ===========================================

import type { CourseDepth } from './index'

// ===========================================
// QUICK CHECK TYPES
// ===========================================

export type QuickCheckType = 'open_ended' | 'multiple_choice' | 'true_false'

export interface QuickCheckChoice {
  text: string
  isCorrect: boolean
  explanation?: string
}

export interface QuickCheck {
  type: QuickCheckType
  question: string
  expectedAnswer?: string // For open_ended type
  choices?: QuickCheckChoice[] // For multiple_choice and true_false
  hint?: string
}

// ===========================================
// STEP COMPONENTS
// ===========================================

export interface KeyIdea {
  term: string
  definition: string
  bullets: string[] // 2-4 supporting points
  nuance?: string // Edge cases, caveats, "but actually..."
}

export interface Example {
  scenario: string
  bullets: string[] // 2-4 step breakdown
  connection?: string // How this ties back to the key idea
}

export interface NextMove {
  label: string
  targetStepId: string
  condition?: 'if_confused' | 'if_curious' | 'default'
}

// ===========================================
// STEP METADATA
// ===========================================

export type StepType = 'intro' | 'core' | 'application' | 'summary'
export type StepDifficulty = 'easy' | 'medium' | 'hard'

export interface StepMetadata {
  stepType?: StepType
  difficulty?: StepDifficulty
}

// ===========================================
// BLUEPRINT STEP
// ===========================================

export interface BlueprintStep {
  id: string // "step_1", "step_2", etc.
  title: string
  hook: string // 1-2 engaging paragraphs
  keyIdea: KeyIdea
  example: Example
  quickCheck?: QuickCheck // Included based on depth
  nextMoves?: NextMove[] // Metadata only, for deep courses
  estimatedMinutes: number
  metadata?: StepMetadata
}

// ===========================================
// COURSE BLUEPRINT
// ===========================================

export interface CourseBlueprint {
  version: 2
  topic: string
  depth: CourseDepth
  steps: BlueprintStep[]
  totalEstimatedMinutes: number
  generatedAt: string
  canonicalizedAt?: string
}

// ===========================================
// QUIZ (Separate from quick checks)
// ===========================================

export interface BlueprintQuizQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: number // 0-based index
  explanation: string
  relatedStepId?: string // Links to relevant step
}

export interface BlueprintQuiz {
  questions: BlueprintQuizQuestion[]
}

// ===========================================
// DEPTH CONFIGURATION
// ===========================================

export interface DepthStepConfig {
  depth: CourseDepth
  stepCount: number
  stepTypes: StepType[]
  includeQuickChecks: boolean
  includeNextMoves: boolean
  estimatedMinutes: number
}

export const DEPTH_STEP_CONFIG: Record<CourseDepth, DepthStepConfig> = {
  quick: {
    depth: 'quick',
    stepCount: 4,
    stepTypes: ['intro', 'core', 'core', 'summary'],
    includeQuickChecks: false,
    includeNextMoves: false,
    estimatedMinutes: 5,
  },
  solid: {
    depth: 'solid',
    stepCount: 6,
    stepTypes: ['intro', 'core', 'core', 'application', 'core', 'summary'],
    includeQuickChecks: true,
    includeNextMoves: false,
    estimatedMinutes: 15,
  },
  deep: {
    depth: 'deep',
    stepCount: 8,
    stepTypes: ['intro', 'core', 'core', 'application', 'core', 'application', 'core', 'summary'],
    includeQuickChecks: true,
    includeNextMoves: true,
    estimatedMinutes: 30,
  },
}

// ===========================================
// TYPE GUARDS
// ===========================================

export function isCourseBlueprint(content: unknown): content is CourseBlueprint {
  return (
    typeof content === 'object' &&
    content !== null &&
    'version' in content &&
    (content as { version: number }).version === 2 &&
    'steps' in content &&
    Array.isArray((content as { steps: unknown[] }).steps)
  )
}
