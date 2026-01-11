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

export interface QuickCheck {
  type: 'multiple_choice' | 'true_false'
  question: string
  choices?: { text: string; isCorrect: boolean }[]
  hint?: string
}

export interface BlueprintStep {
  id: string
  title: string
  hook: string
  keyIdea: KeyIdea
  example: Example
  quickCheck?: QuickCheck
  nextMoves?: { label: string; targetStepId: string }[]
  estimatedMinutes: number
  metadata: {
    stepType: 'intro' | 'core' | 'application' | 'summary'
    difficulty: 'easy' | 'medium' | 'hard'
  }
}

export interface CourseBlueprint {
  version: 2
  topic: string
  steps: BlueprintStep[]
  totalEstimatedMinutes: number
  generatedAt: string
}

