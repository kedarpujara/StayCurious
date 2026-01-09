import type { CourseContent } from '@/types'
import type { CourseBlueprint, BlueprintStep } from '@/types/blueprint'
import { isCourseBlueprint } from '@/types/blueprint'
import { blueprintToLegacyContent } from './renderer'

// ===========================================
// CONTENT SERVICE
//
// Handles detection and conversion between
// blueprint (v2) and legacy (v1) course formats.
// ===========================================

// ===========================================
// TYPE GUARDS & DETECTION
// ===========================================

/**
 * Checks if content is in legacy CourseContent format.
 */
export function isLegacyContent(content: unknown): content is CourseContent {
  return (
    typeof content === 'object' &&
    content !== null &&
    'sections' in content &&
    Array.isArray((content as CourseContent).sections) &&
    !('version' in content)
  )
}

/**
 * Determines the schema version of course content.
 * Returns 1 for legacy, 2 for blueprint, 0 for unknown.
 */
export function detectSchemaVersion(content: unknown): 1 | 2 | 0 {
  if (isCourseBlueprint(content)) {
    return 2
  }
  if (isLegacyContent(content)) {
    return 1
  }
  return 0
}

// ===========================================
// FORMAT CONVERSION
// ===========================================

/**
 * Converts any course content to legacy CourseContent format
 * for backward compatibility with existing UI components.
 *
 * @param content - Course content in any format
 * @param schemaVersion - Optional hint about schema version (from DB)
 * @returns CourseContent in legacy format
 */
export function toDisplayFormat(
  content: CourseBlueprint | CourseContent | unknown,
  schemaVersion?: number
): CourseContent {
  // If explicitly told it's v2, or we detect it as blueprint
  if (schemaVersion === 2 || isCourseBlueprint(content)) {
    return blueprintToLegacyContent(content as CourseBlueprint)
  }

  // Assume legacy format
  return content as CourseContent
}

/**
 * Gets the raw blueprint if content is in v2 format.
 * Returns null for legacy content.
 */
export function getBlueprint(
  content: CourseBlueprint | CourseContent | unknown,
  schemaVersion?: number
): CourseBlueprint | null {
  if (schemaVersion === 2 || isCourseBlueprint(content)) {
    return content as CourseBlueprint
  }
  return null
}

// ===========================================
// STEP-LEVEL ACCESS
// ===========================================

/**
 * Gets structured step data if available (for enhanced UI features).
 * Returns null for legacy content or if step doesn't exist.
 */
export function getStructuredStep(
  content: CourseBlueprint | CourseContent | unknown,
  stepIndex: number,
  schemaVersion?: number
): BlueprintStep | null {
  if (schemaVersion === 2 || isCourseBlueprint(content)) {
    const blueprint = content as CourseBlueprint
    return blueprint.steps[stepIndex] || null
  }
  return null
}

/**
 * Gets the quick check for a specific step.
 * Returns null if content is legacy or step has no quick check.
 */
export function getQuickCheck(
  content: CourseBlueprint | CourseContent | unknown,
  stepIndex: number,
  schemaVersion?: number
) {
  const step = getStructuredStep(content, stepIndex, schemaVersion)
  return step?.quickCheck || null
}

/**
 * Gets next move suggestions for a specific step.
 * Returns empty array if content is legacy or step has no next moves.
 */
export function getNextMoves(
  content: CourseBlueprint | CourseContent | unknown,
  stepIndex: number,
  schemaVersion?: number
) {
  const step = getStructuredStep(content, stepIndex, schemaVersion)
  return step?.nextMoves || []
}

// ===========================================
// METADATA HELPERS
// ===========================================

/**
 * Gets the total number of sections/steps.
 */
export function getSectionCount(content: CourseBlueprint | CourseContent | unknown): number {
  if (isCourseBlueprint(content)) {
    return (content as CourseBlueprint).steps.length
  }
  if (isLegacyContent(content)) {
    return (content as CourseContent).sections.length
  }
  return 0
}

/**
 * Gets the course depth from blueprint content.
 * Returns null for legacy content.
 */
export function getCourseDepth(
  content: CourseBlueprint | CourseContent | unknown
): 'quick' | 'solid' | 'deep' | null {
  if (isCourseBlueprint(content)) {
    return (content as CourseBlueprint).depth
  }
  return null
}

/**
 * Checks if the content supports quick checks.
 */
export function hasQuickChecks(
  content: CourseBlueprint | CourseContent | unknown,
  schemaVersion?: number
): boolean {
  if (schemaVersion === 2 || isCourseBlueprint(content)) {
    const blueprint = content as CourseBlueprint
    return blueprint.steps.some((step) => step.quickCheck !== undefined)
  }
  return false
}

/**
 * Counts total quick checks in the course.
 */
export function countQuickChecks(
  content: CourseBlueprint | CourseContent | unknown,
  schemaVersion?: number
): number {
  if (schemaVersion === 2 || isCourseBlueprint(content)) {
    const blueprint = content as CourseBlueprint
    return blueprint.steps.filter((step) => step.quickCheck !== undefined).length
  }
  return 0
}
