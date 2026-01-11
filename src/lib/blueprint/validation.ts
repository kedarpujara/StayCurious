import { z } from 'zod'

// ===========================================
// COMPONENT SCHEMAS
// ===========================================

const QuickCheckChoiceSchema = z.object({
  text: z.string().min(1).max(200),
  isCorrect: z.boolean(),
  explanation: z.string().max(300).optional(),
})

const QuickCheckSchema = z
  .object({
    type: z.enum(['open_ended', 'multiple_choice', 'true_false']),
    question: z.string().min(10).max(300),
    expectedAnswer: z.string().max(500).optional(),
    choices: z.array(QuickCheckChoiceSchema).min(2).max(4).optional(),
    hint: z.string().max(200).optional(),
  })
  .refine(
    (data) => {
      // Multiple choice must have choices
      if (data.type === 'multiple_choice' || data.type === 'true_false') {
        return data.choices && data.choices.length >= 2
      }
      return true
    },
    { message: 'Multiple choice and true/false questions must have choices' }
  )
  .refine(
    (data) => {
      // Must have exactly one correct answer
      if (data.choices) {
        const correctCount = data.choices.filter((c) => c.isCorrect).length
        return correctCount === 1
      }
      return true
    },
    { message: 'Questions with choices must have exactly one correct answer' }
  )

const KeyIdeaSchema = z.object({
  term: z.string().min(1).max(100),
  definition: z.string().min(10).max(500),
  bullets: z.array(z.string().min(5).max(250)).min(2).max(4),
  nuance: z.string().max(300).optional(),
})

const ExampleSchema = z.object({
  scenario: z.string().min(20).max(500),
  bullets: z.array(z.string().min(5).max(250)).min(2).max(4),
  connection: z.string().max(200).optional(),
})

const NextMoveSchema = z.object({
  label: z.string().min(1).max(50),
  targetStepId: z.string().regex(/^step_\d+$/, 'Target step ID must be in format step_N'),
  condition: z.enum(['if_confused', 'if_curious', 'default']).optional(),
})

const StepMetadataSchema = z.object({
  stepType: z.enum(['intro', 'core', 'application', 'summary']).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
})

// ===========================================
// BLUEPRINT STEP SCHEMA
// ===========================================

export const BlueprintStepSchema = z.object({
  id: z.string().regex(/^step_\d+$/, 'Step ID must be in format step_N'),
  title: z.string().min(3).max(100),
  hook: z.string().min(50).max(1000),
  keyIdea: KeyIdeaSchema,
  example: ExampleSchema,
  quickCheck: QuickCheckSchema.optional(),
  nextMoves: z.array(NextMoveSchema).max(3).optional(),
  estimatedMinutes: z.number().min(1).max(15),
  metadata: StepMetadataSchema.optional(),
})

// ===========================================
// COURSE BLUEPRINT SCHEMA
// ===========================================

export const CourseBlueprintSchema = z
  .object({
    version: z.literal(2),
    topic: z.string().min(3).max(200),
    depth: z.enum(['quick', 'solid', 'deep']),
    steps: z.array(BlueprintStepSchema).min(4).max(10),
    totalEstimatedMinutes: z.number().min(3).max(60),
    generatedAt: z.string(),
    canonicalizedAt: z.string().optional(),
  })
  .refine(
    (data) => {
      // Validate step count matches depth
      const expectedCounts = { quick: 4, solid: 6, deep: 8 }
      return data.steps.length === expectedCounts[data.depth]
    },
    { message: 'Step count must match depth: quick=4, solid=6, deep=8' }
  )
  .refine(
    (data) => {
      // Validate step IDs are sequential
      return data.steps.every((step, index) => step.id === `step_${index + 1}`)
    },
    { message: 'Step IDs must be sequential (step_1, step_2, ...)' }
  )

// ===========================================
// QUIZ SCHEMA
// ===========================================

export const BlueprintQuizQuestionSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(10).max(300),
  options: z.array(z.string().min(1).max(200)).length(4),
  correctAnswer: z.number().min(0).max(3),
  explanation: z.string().min(10).max(500),
  relatedStepId: z
    .string()
    .regex(/^step_\d+$/)
    .optional(),
})

export const BlueprintQuizSchema = z.object({
  questions: z.array(BlueprintQuizQuestionSchema).min(3).max(10),
})

// ===========================================
// VALIDATION FUNCTIONS
// ===========================================

export type BlueprintStepInput = z.input<typeof BlueprintStepSchema>
export type BlueprintStepOutput = z.output<typeof BlueprintStepSchema>
export type CourseBlueprintInput = z.input<typeof CourseBlueprintSchema>
export type CourseBlueprintOutput = z.output<typeof CourseBlueprintSchema>

export interface ValidationResult<T> {
  success: boolean
  data?: T
  errors?: z.ZodError
}

export function validateBlueprint(data: unknown): ValidationResult<CourseBlueprintOutput> {
  const result = CourseBlueprintSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, errors: result.error }
}

export function validateStep(data: unknown): ValidationResult<BlueprintStepOutput> {
  const result = BlueprintStepSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, errors: result.error }
}

export function validateQuiz(
  data: unknown
): ValidationResult<z.output<typeof BlueprintQuizSchema>> {
  const result = BlueprintQuizSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, errors: result.error }
}

// ===========================================
// ERROR FORMATTING
// ===========================================

export function formatValidationErrors(errors: z.ZodError): string[] {
  return errors.issues.map((issue) => {
    const path = issue.path.join('.')
    return path ? `${path}: ${issue.message}` : issue.message
  })
}
