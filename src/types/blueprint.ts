export interface KeyIdea {
  term: string
  definition: string
  bullets: string[]
  nuance?: string
}

export interface Example {
  scenario: string
  bullets: string[]
  connection?: string
}

export interface QuickCheckChoice {
  text: string
  isCorrect: boolean
  explanation?: string
}

export interface QuickCheck {
  type: 'open_ended' | 'multiple_choice' | 'true_false'
  question: string
  expectedAnswer?: string
  choices?: QuickCheckChoice[]
  hint?: string
}

export interface NextMove {
  label: string
  targetStepId: string
  condition?: 'if_confused' | 'if_curious' | 'default'
}

export interface StepMetadata {
  stepType?: 'intro' | 'core' | 'application' | 'summary'
  difficulty?: 'easy' | 'medium' | 'hard'
}

export interface BlueprintStep {
  id: string
  title: string
  hook: string
  keyIdea: KeyIdea
  example: Example
  quickCheck?: QuickCheck
  nextMoves?: NextMove[]
  estimatedMinutes: number
  metadata?: StepMetadata
}

export type CourseDepth = 'quick' | 'solid' | 'deep'

export interface CourseBlueprint {
  version: 2
  topic: string
  depth: CourseDepth
  steps: BlueprintStep[]
  totalEstimatedMinutes: number
  generatedAt: string
  canonicalizedAt?: string
}

// Depth configuration for course generation
export interface DepthConfig {
  stepCount: number
  estimatedMinutes: number
  includeQuickChecks: boolean
  includeNextMoves: boolean
  stepTypes: ('intro' | 'core' | 'application' | 'summary')[]
}

export const DEPTH_STEP_CONFIG: Record<CourseDepth, DepthConfig> = {
  quick: {
    stepCount: 4,
    estimatedMinutes: 10,
    includeQuickChecks: false,
    includeNextMoves: false,
    stepTypes: ['intro', 'core', 'application', 'summary'],
  },
  solid: {
    stepCount: 6,
    estimatedMinutes: 20,
    includeQuickChecks: true,
    includeNextMoves: false,
    stepTypes: ['intro', 'core', 'core', 'application', 'application', 'summary'],
  },
  deep: {
    stepCount: 8,
    estimatedMinutes: 35,
    includeQuickChecks: true,
    includeNextMoves: true,
    stepTypes: ['intro', 'core', 'core', 'core', 'application', 'application', 'application', 'summary'],
  },
}

// Type guard to check if content is a CourseBlueprint
export function isCourseBlueprint(content: unknown): content is CourseBlueprint {
  return (
    typeof content === 'object' &&
    content !== null &&
    'version' in content &&
    (content as CourseBlueprint).version === 2 &&
    'steps' in content &&
    Array.isArray((content as CourseBlueprint).steps)
  )
}

