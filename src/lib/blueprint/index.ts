import type { CourseContent, CourseSection } from '@/types'

// Re-export validation functions
export { validateBlueprint, validateStep, validateQuiz, formatValidationErrors } from './validation'
export type { ValidationResult } from './validation'

// Re-export canonicalization functions
export { canonicalizeBlueprint, hashBlueprintContent } from './canonicalize'

// Re-export renderer functions
export {
  renderStepToMarkdown as renderBlueprintStepToMarkdown,
  renderBlueprintToMarkdown,
  stepToLegacySection,
  blueprintToLegacyContent,
  blueprintToLegacySections,
} from './renderer'

/**
 * Blueprint format has:
 * - steps: array of step objects with id, title, hook, keyIdea, example, etc.
 *
 * Legacy format has:
 * - sections: array of section objects with id, title, content, estimatedMinutes
 *
 * This function converts from blueprint to legacy format, or returns the content
 * as-is if it's already in legacy format.
 */
export function toDisplayFormat(content: unknown): CourseContent {
  if (!content || typeof content !== 'object') {
    return { sections: [], totalEstimatedMinutes: 0, generatedAt: new Date().toISOString() }
  }

  const contentObj = content as Record<string, unknown>

  // If already in legacy format (has sections), return as-is
  if ('sections' in contentObj && Array.isArray(contentObj.sections)) {
    return content as CourseContent
  }

  // Convert blueprint format (has steps) to legacy format
  if ('steps' in contentObj && Array.isArray(contentObj.steps)) {
    const steps = contentObj.steps as Array<Record<string, unknown>>

    const sections: CourseSection[] = steps.map((step) => {
      // Render step to markdown content (without example)
      const content = renderStepToMarkdown(step)
      // Render example separately
      const example = renderExampleToMarkdown(step)

      return {
        id: (step.id as string) || `step_${Math.random().toString(36).slice(2)}`,
        title: (step.title as string) || 'Untitled',
        content,
        example: example || undefined,
        estimatedMinutes: (step.estimatedMinutes as number) || 3,
      }
    })

    return {
      sections,
      totalEstimatedMinutes: (contentObj.totalEstimatedMinutes as number) ||
        sections.reduce((sum, s) => sum + (s.estimatedMinutes || 0), 0),
      generatedAt: (contentObj.generatedAt as string) || new Date().toISOString(),
    }
  }

  // Unknown format, return empty
  return { sections: [], totalEstimatedMinutes: 0, generatedAt: new Date().toISOString() }
}

/**
 * Renders a blueprint step to markdown content (excludes example)
 */
function renderStepToMarkdown(step: Record<string, unknown>): string {
  const lines: string[] = []

  // Section title as markdown heading
  if (step.title) {
    lines.push(`## ${step.title}`)
    lines.push('')
  }

  // Hook paragraph
  if (step.hook) {
    lines.push(step.hook as string)
    lines.push('')
  }

  // Key idea
  const keyIdea = step.keyIdea as Record<string, unknown> | undefined
  if (keyIdea) {
    // Key concept as a sub-heading with definition
    lines.push(`### ${keyIdea.term || 'Key Concept'}`)
    lines.push('')
    if (keyIdea.definition) {
      lines.push(keyIdea.definition as string)
      lines.push('')
    }

    // Bullets
    const bullets = keyIdea.bullets as string[] | undefined
    if (bullets?.length) {
      bullets.forEach((bullet) => {
        lines.push(`- ${bullet}`)
      })
      lines.push('')
    }

    // Nuance
    if (keyIdea.nuance) {
      lines.push(`> **Note:** ${keyIdea.nuance}`)
      lines.push('')
    }
  }

  // Example is now rendered separately via renderExampleToMarkdown

  return lines.join('\n').trim()
}

/**
 * Renders only the example from a blueprint step to markdown
 */
function renderExampleToMarkdown(step: Record<string, unknown>): string {
  const example = step.example as Record<string, unknown> | undefined
  if (!example) return ''

  const lines: string[] = []

  if (example.scenario) {
    lines.push(example.scenario as string)
    lines.push('')
  }

  const exampleBullets = example.bullets as string[] | undefined
  if (exampleBullets?.length) {
    exampleBullets.forEach((bullet, idx) => {
      lines.push(`${idx + 1}. ${bullet}`)
    })
    lines.push('')
  }

  if (example.connection) {
    lines.push(`*${example.connection}*`)
    lines.push('')
  }

  return lines.join('\n').trim()
}

/**
 * Check if content is in blueprint format
 */
export function isBlueprintFormat(content: unknown): boolean {
  if (!content || typeof content !== 'object') return false
  return 'steps' in (content as object)
}

/**
 * Check if content is in legacy format
 */
export function isLegacyFormat(content: unknown): boolean {
  if (!content || typeof content !== 'object') return false
  return 'sections' in (content as object)
}

/**
 * Normalizes section content to have proper markdown formatting.
 * Specifically targets adding bullet points to list-like sequences
 * that are missing the `-` prefix.
 */
export function normalizeContentMarkdown(content: string): string {
  if (!content || typeof content !== 'string') return content

  // If content already has bullets, it's properly formatted
  if (/^\s*[-*]\s/m.test(content) || /^\s*\d+\.\s/m.test(content)) {
    return content
  }

  // Process the content to add bullets to list-like sequences
  return addBulletsToLists(content)
}

/**
 * Detects sequences of short lines that look like bullet points
 * and adds the `-` prefix to them.
 */
function addBulletsToLists(content: string): string {
  // Split by paragraph breaks to preserve structure
  const paragraphs = content.split(/\n\n+/)

  const result = paragraphs.map(paragraph => {
    const lines = paragraph.split('\n')

    // Skip single-line paragraphs or paragraphs that are special markdown
    if (lines.length === 1) return paragraph
    if (paragraph.startsWith('#') || paragraph.startsWith('>') || paragraph.startsWith('```')) {
      return paragraph
    }

    // Check if this paragraph looks like a list (multiple short lines)
    const nonEmptyLines = lines.filter(l => l.trim())
    if (nonEmptyLines.length < 2) return paragraph

    // Detect list pattern: multiple lines, each relatively short, not ending with periods typically
    const looksLikeList = nonEmptyLines.every(line => {
      const trimmed = line.trim()
      // Already a bullet or header - not a plain list
      if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('#')) {
        return false
      }
      // Blockquote
      if (trimmed.startsWith('>')) return false
      // Short enough to be a bullet (under 200 chars)
      return trimmed.length < 200 && trimmed.length > 10
    })

    if (!looksLikeList) return paragraph

    // Convert lines to bullets
    return lines.map(line => {
      const trimmed = line.trim()
      if (!trimmed) return line
      // Don't bullet-ify lines that are already formatted
      if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('#') || trimmed.startsWith('>')) {
        return line
      }
      // Don't bullet-ify very short lines (likely titles)
      if (trimmed.length < 15 && !trimmed.includes(' ')) {
        return line
      }
      return `- ${trimmed}`
    }).join('\n')
  })

  return result.join('\n\n')
}
