import type {
  CourseBlueprint,
  BlueprintStep,
  KeyIdea,
  Example,
  QuickCheck,
} from '@/types/blueprint'
import type { CourseSection, CourseContent } from '@/types'

// ===========================================
// DETERMINISTIC MARKDOWN RENDERER
//
// Converts canonical blueprint JSON to Markdown.
// Same input ALWAYS produces same output.
// No AI involved - pure deterministic transformation.
// ===========================================

// ===========================================
// COMPONENT RENDERERS
// ===========================================

function renderKeyIdea(keyIdea: KeyIdea): string {
  const lines: string[] = []

  // Term and definition
  lines.push(`**${keyIdea.term}**: ${keyIdea.definition}`)
  lines.push('')

  // Bullet points
  if (keyIdea.bullets.length > 0) {
    keyIdea.bullets.forEach((bullet) => {
      lines.push(`- ${bullet}`)
    })
    lines.push('')
  }

  // Nuance (as a blockquote note)
  if (keyIdea.nuance) {
    lines.push(`> **Note:** ${keyIdea.nuance}`)
    lines.push('')
  }

  return lines.join('\n')
}

function renderExample(example: Example): string {
  const lines: string[] = []

  lines.push('### Example')
  lines.push('')
  lines.push(example.scenario)
  lines.push('')

  // Numbered list for example steps
  if (example.bullets.length > 0) {
    example.bullets.forEach((bullet, idx) => {
      lines.push(`${idx + 1}. ${bullet}`)
    })
    lines.push('')
  }

  // Connection back to the concept
  if (example.connection) {
    lines.push(`*${example.connection}*`)
    lines.push('')
  }

  return lines.join('\n')
}

function renderQuickCheck(quickCheck: QuickCheck): string {
  const lines: string[] = []

  lines.push('---')
  lines.push('')
  lines.push(`**Quick Check:** ${quickCheck.question}`)
  lines.push('')

  // Render choices for multiple choice / true-false
  if (quickCheck.choices && quickCheck.choices.length > 0) {
    quickCheck.choices.forEach((choice, idx) => {
      const letter = String.fromCharCode(65 + idx) // A, B, C, D
      lines.push(`- **${letter})** ${choice.text}`)
    })
    lines.push('')
  }

  // Hint in collapsible section
  if (quickCheck.hint) {
    lines.push('<details>')
    lines.push('<summary>Hint</summary>')
    lines.push('')
    lines.push(quickCheck.hint)
    lines.push('')
    lines.push('</details>')
    lines.push('')
  }

  return lines.join('\n')
}

// ===========================================
// STEP RENDERER
// ===========================================

/**
 * Renders a single blueprint step to Markdown.
 * This is the content that goes inside a section.
 */
export function renderStepToMarkdown(step: BlueprintStep): string {
  const lines: string[] = []

  // Hook paragraph(s)
  lines.push(step.hook)
  lines.push('')

  // Key idea section
  lines.push(renderKeyIdea(step.keyIdea))

  // Example section
  lines.push(renderExample(step.example))

  // Quick check (if present)
  if (step.quickCheck) {
    lines.push(renderQuickCheck(step.quickCheck))
  }

  return lines.join('\n').trim()
}

/**
 * Renders a step with its title as a header.
 * Used for full document rendering.
 */
export function renderStepWithTitle(step: BlueprintStep, stepNumber: number): string {
  const lines: string[] = []

  lines.push(`## ${stepNumber}. ${step.title}`)
  lines.push('')
  lines.push(renderStepToMarkdown(step))

  return lines.join('\n')
}

// ===========================================
// FULL COURSE RENDERER
// ===========================================

/**
 * Renders an entire course blueprint to Markdown.
 * Primarily useful for previewing or exporting.
 */
export function renderBlueprintToMarkdown(blueprint: CourseBlueprint): string {
  const lines: string[] = []

  // Course header
  lines.push(`# ${blueprint.topic}`)
  lines.push('')
  lines.push(`*${blueprint.totalEstimatedMinutes} minute ${blueprint.depth} course*`)
  lines.push('')
  lines.push('---')
  lines.push('')

  // Each step
  blueprint.steps.forEach((step, idx) => {
    lines.push(renderStepWithTitle(step, idx + 1))
    lines.push('')
    lines.push('---')
    lines.push('')
  })

  return lines.join('\n').trim()
}

// ===========================================
// LEGACY FORMAT ADAPTER
// ===========================================

/**
 * Converts a blueprint step to legacy CourseSection format.
 * This allows blueprint courses to work with existing UI components.
 */
export function stepToLegacySection(step: BlueprintStep): CourseSection {
  return {
    id: step.id,
    title: step.title,
    content: renderStepToMarkdown(step),
    estimatedMinutes: step.estimatedMinutes,
  }
}

/**
 * Converts a full blueprint to legacy CourseContent format.
 * This is the primary adapter for backward compatibility.
 */
export function blueprintToLegacyContent(blueprint: CourseBlueprint): CourseContent {
  return {
    sections: blueprint.steps.map(stepToLegacySection),
    totalEstimatedMinutes: blueprint.totalEstimatedMinutes,
    generatedAt: blueprint.generatedAt,
  }
}

/**
 * Converts blueprint steps to legacy sections array.
 * Convenience method for partial conversions.
 */
export function blueprintToLegacySections(blueprint: CourseBlueprint): CourseSection[] {
  return blueprint.steps.map(stepToLegacySection)
}
