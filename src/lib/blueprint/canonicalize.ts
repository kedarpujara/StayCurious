import type {
  CourseBlueprint,
  BlueprintStep,
  KeyIdea,
  Example,
  QuickCheck,
  NextMove,
} from '@/types/blueprint'

// ===========================================
// STRING CANONICALIZATION
// ===========================================

/**
 * Canonicalizes a string for consistent storage:
 * - Trims leading/trailing whitespace
 * - Normalizes multiple spaces to single space
 * - Normalizes smart quotes to straight quotes
 * - Normalizes ellipsis to three periods
 * - Removes zero-width characters
 */
function canonicalizeString(str: string): string {
  return str
    .trim()
    .replace(/\s+/g, ' ') // Normalize all whitespace to single space
    .replace(/[\u201C\u201D]/g, '"') // Smart double quotes → straight
    .replace(/[\u2018\u2019]/g, "'") // Smart single quotes → straight
    .replace(/\u2026/g, '...') // Ellipsis → three periods
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width chars
    .replace(/\u00A0/g, ' ') // Non-breaking space → regular space
}

/**
 * Canonicalizes an array of strings
 */
function canonicalizeStringArray(arr: string[]): string[] {
  return arr.map(canonicalizeString)
}

// ===========================================
// COMPONENT CANONICALIZATION
// ===========================================

function canonicalizeKeyIdea(keyIdea: KeyIdea): KeyIdea {
  return {
    term: canonicalizeString(keyIdea.term),
    definition: canonicalizeString(keyIdea.definition),
    bullets: canonicalizeStringArray(keyIdea.bullets),
    nuance: keyIdea.nuance ? canonicalizeString(keyIdea.nuance) : undefined,
  }
}

function canonicalizeExample(example: Example): Example {
  return {
    scenario: canonicalizeString(example.scenario),
    bullets: canonicalizeStringArray(example.bullets),
    connection: example.connection ? canonicalizeString(example.connection) : undefined,
  }
}

function canonicalizeQuickCheck(quickCheck: QuickCheck): QuickCheck {
  return {
    type: quickCheck.type,
    question: canonicalizeString(quickCheck.question),
    expectedAnswer: quickCheck.expectedAnswer
      ? canonicalizeString(quickCheck.expectedAnswer)
      : undefined,
    hint: quickCheck.hint ? canonicalizeString(quickCheck.hint) : undefined,
    choices: quickCheck.choices?.map((choice) => ({
      text: canonicalizeString(choice.text),
      isCorrect: choice.isCorrect,
      explanation: choice.explanation ? canonicalizeString(choice.explanation) : undefined,
    })),
  }
}

function canonicalizeNextMove(nextMove: NextMove): NextMove {
  return {
    label: canonicalizeString(nextMove.label),
    targetStepId: nextMove.targetStepId, // Don't modify IDs
    condition: nextMove.condition,
  }
}

// ===========================================
// STEP CANONICALIZATION
// ===========================================

function canonicalizeStep(step: BlueprintStep): BlueprintStep {
  return {
    id: step.id, // Don't modify IDs
    title: canonicalizeString(step.title),
    hook: canonicalizeString(step.hook),
    keyIdea: canonicalizeKeyIdea(step.keyIdea),
    example: canonicalizeExample(step.example),
    quickCheck: step.quickCheck ? canonicalizeQuickCheck(step.quickCheck) : undefined,
    nextMoves: step.nextMoves ? step.nextMoves.map(canonicalizeNextMove) : undefined,
    estimatedMinutes: step.estimatedMinutes,
    metadata: step.metadata, // Pass through unchanged
  }
}

// ===========================================
// BLUEPRINT CANONICALIZATION
// ===========================================

/**
 * Canonicalizes a course blueprint for consistent storage.
 *
 * This ensures that the same content always produces the same stored representation,
 * regardless of minor variations in whitespace, quotes, or unicode characters.
 *
 * @param blueprint - The raw course blueprint to canonicalize
 * @returns A new blueprint with canonicalized content and a timestamp
 */
export function canonicalizeBlueprint(blueprint: CourseBlueprint): CourseBlueprint {
  return {
    version: blueprint.version,
    topic: canonicalizeString(blueprint.topic),
    depth: blueprint.depth,
    steps: blueprint.steps.map(canonicalizeStep),
    totalEstimatedMinutes: blueprint.totalEstimatedMinutes,
    generatedAt: blueprint.generatedAt,
    canonicalizedAt: new Date().toISOString(),
  }
}

// ===========================================
// CONTENT HASH (for cache invalidation)
// ===========================================

/**
 * Generates a simple hash of the blueprint content for cache invalidation.
 * This is NOT cryptographically secure - just for comparison purposes.
 */
export function hashBlueprintContent(blueprint: CourseBlueprint): string {
  const contentString = JSON.stringify({
    topic: blueprint.topic,
    depth: blueprint.depth,
    steps: blueprint.steps,
  })

  // Simple djb2 hash
  let hash = 5381
  for (let i = 0; i < contentString.length; i++) {
    hash = (hash * 33) ^ contentString.charCodeAt(i)
  }

  return (hash >>> 0).toString(16)
}
