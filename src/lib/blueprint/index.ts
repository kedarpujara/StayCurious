// ===========================================
// BLUEPRINT MODULE
//
// Structured course content system with
// deterministic markdown rendering.
// ===========================================

// Validation
export {
  BlueprintStepSchema,
  CourseBlueprintSchema,
  BlueprintQuizSchema,
  BlueprintQuizQuestionSchema,
  validateBlueprint,
  validateStep,
  validateQuiz,
  formatValidationErrors,
  type ValidationResult,
  type BlueprintStepInput,
  type BlueprintStepOutput,
  type CourseBlueprintInput,
  type CourseBlueprintOutput,
} from './validation'

// Canonicalization
export { canonicalizeBlueprint, hashBlueprintContent } from './canonicalize'

// Renderer
export {
  renderStepToMarkdown,
  renderStepWithTitle,
  renderBlueprintToMarkdown,
  stepToLegacySection,
  blueprintToLegacyContent,
  blueprintToLegacySections,
} from './renderer'

// Content Service
export {
  isLegacyContent,
  detectSchemaVersion,
  toDisplayFormat,
  getBlueprint,
  getStructuredStep,
  getQuickCheck,
  getNextMoves,
  getSectionCount,
  getCourseDepth,
  hasQuickChecks,
  countQuickChecks,
} from './content-service'
