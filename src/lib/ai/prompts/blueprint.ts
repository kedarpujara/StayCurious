import type { CourseDepth } from '@/types'
import { DEPTH_STEP_CONFIG } from '@/types/blueprint'

// ===========================================
// BLUEPRINT SYSTEM PROMPT
// ===========================================

export const BLUEPRINT_SYSTEM = `You are Curio, a structured curriculum architect. You generate course blueprints as strict JSON.

CRITICAL RULES:
1. Output ONLY valid JSON - no markdown, no explanations, no text outside the JSON structure
2. Every required field must be populated - no nulls, no empty strings
3. Arrays must have the exact count specified (bullets: 2-4 items)
4. Step IDs must be sequential: step_1, step_2, step_3, etc.
5. All text content must be plain text - NO markdown formatting within field values

CONTENT GUIDELINES:
- Hook: 1-2 engaging paragraphs that create curiosity and relevance
- Key Idea: ONE clear concept per step, not multiple concepts
- Definition: A clear, jargon-free explanation anyone can understand
- Bullets: Concise supporting points (not mini-paragraphs)
- Example: A concrete, real-world scenario that illustrates the concept
- Nuance: "But actually..." moments that deepen understanding without confusion

VOICE:
- Conversational and warm, like explaining to a curious friend
- Use analogies to connect new concepts to familiar experiences
- Avoid academic language - be accessible without being simplistic
- Make it memorable and sticky`

// ===========================================
// STEP SCHEMA TEMPLATE
// ===========================================

function getStepSchema(includeQuickCheck: boolean, includeNextMoves: boolean): string {
  let schema = `{
  "id": "step_N",
  "title": "Step Title",
  "hook": "One to two engaging paragraphs that draw the reader in and establish relevance. This should make them curious to learn more.",
  "keyIdea": {
    "term": "The Key Term",
    "definition": "A clear, accessible definition that anyone can understand.",
    "bullets": [
      "First supporting point that elaborates on the concept",
      "Second supporting point with additional context",
      "Third supporting point (2-4 total)"
    ],
    "nuance": "An optional edge case, caveat, or 'but actually' insight"
  },
  "example": {
    "scenario": "A concrete, relatable scenario that illustrates this concept in action...",
    "bullets": [
      "Step 1 or observation from the example",
      "Step 2 or insight from the example",
      "Step 3 or conclusion (2-4 total)"
    ],
    "connection": "How this example connects back to the key idea"
  },`

  if (includeQuickCheck) {
    schema += `
  "quickCheck": {
    "type": "multiple_choice",
    "question": "A question that tests understanding, not memorization?",
    "choices": [
      { "text": "Option A - a plausible wrong answer", "isCorrect": false },
      { "text": "Option B - the correct answer", "isCorrect": true },
      { "text": "Option C - another plausible wrong answer", "isCorrect": false }
    ],
    "hint": "Optional hint to guide thinking"
  },`
  }

  if (includeNextMoves) {
    schema += `
  "nextMoves": [
    { "label": "Dive deeper into X", "targetStepId": "step_N" },
    { "label": "Continue to next topic", "targetStepId": "step_N+1" }
  ],`
  }

  schema += `
  "estimatedMinutes": N,
  "metadata": {
    "stepType": "intro|core|application|summary",
    "difficulty": "easy|medium|hard"
  }
}`

  return schema
}

// ===========================================
// BLUEPRINT GENERATION PROMPT
// ===========================================

export function getBlueprintPrompt(topic: string, depth: CourseDepth): string {
  const config = DEPTH_STEP_CONFIG[depth]
  const stepSchema = getStepSchema(config.includeQuickChecks, config.includeNextMoves)

  // Build step type instructions
  const stepTypeInstructions = config.stepTypes
    .map((type, i) => `  Step ${i + 1}: ${type}`)
    .join('\n')

  return `Generate a ${depth.toUpperCase()} depth course blueprint for: "${topic}"

CONFIGURATION:
- Total steps: ${config.stepCount}
- Estimated time: ${config.estimatedMinutes} minutes
- Include quick checks: ${config.includeQuickChecks}
- Include next moves: ${config.includeNextMoves}

STEP TYPES (follow this sequence):
${stepTypeInstructions}

Step Type Guidelines:
- intro: Hook the reader, explain why this topic matters, set the stage
- core: Teach a fundamental concept with depth and clarity
- application: Show how to apply the concept in real situations
- summary: Tie everything together, reinforce key takeaways

OUTPUT FORMAT - Return this exact JSON structure:
{
  "version": 2,
  "topic": "${topic}",
  "depth": "${depth}",
  "steps": [
    ${stepSchema}
  ],
  "totalEstimatedMinutes": ${config.estimatedMinutes},
  "generatedAt": "ISO timestamp"
}

REQUIREMENTS:
1. Generate exactly ${config.stepCount} steps
2. Step IDs must be: step_1, step_2, step_3, ... step_${config.stepCount}
3. Each step's metadata.stepType must match: ${config.stepTypes.join(', ')}
4. Time distribution should total approximately ${config.estimatedMinutes} minutes
5. Each keyIdea.bullets array must have 2-4 items
6. Each example.bullets array must have 2-4 items
7. ${config.includeQuickChecks ? 'EVERY step must include a quickCheck' : 'Do NOT include quickCheck in any step'}
8. ${config.includeNextMoves ? 'EVERY step (except the last) should include nextMoves' : 'Do NOT include nextMoves in any step'}

TOPIC ANALYSIS:
Before generating, identify the ${config.stepCount} key concepts within "${topic}".
Consider:
- What makes this topic fascinating or relevant?
- What are the core ideas someone MUST understand?
- What common misconceptions should be addressed?
- What practical applications make this knowledge useful?

Now generate the complete blueprint JSON for "${topic}".`
}

// ===========================================
// QUIZ GENERATION PROMPT (for blueprint courses)
// ===========================================

export const BLUEPRINT_QUIZ_SYSTEM = `You are Curio, generating end-of-course assessment questions.

Output ONLY valid JSON - no markdown, no explanations.

Question Guidelines:
- Focus on understanding and application, not memorization
- Each question should test a different concept from the course
- Distractors (wrong answers) should be plausible but clearly incorrect
- Explanations should reinforce learning, not just say "this is correct"
- Progress from easier to harder questions`

export function getBlueprintQuizPrompt(topic: string, stepSummaries: string[]): string {
  const summaryList = stepSummaries.map((s, i) => `Step ${i + 1}: ${s}`).join('\n')

  return `Generate a 5-question quiz for the course on: "${topic}"

COURSE CONTENT COVERED:
${summaryList}

OUTPUT FORMAT - Return this exact JSON structure:
{
  "questions": [
    {
      "id": "q1",
      "question": "The question text?",
      "options": [
        "Option A",
        "Option B - correct",
        "Option C",
        "Option D"
      ],
      "correctAnswer": 1,
      "explanation": "Why this answer is correct and what to learn from it",
      "relatedStepId": "step_1"
    }
  ]
}

REQUIREMENTS:
1. Generate exactly 5 questions
2. Questions should progress from easier (q1) to harder (q5)
3. correctAnswer is 0-indexed (0, 1, 2, or 3)
4. Each question should relate to a different step
5. Explanations should teach, not just confirm
6. Avoid "all of the above" or "none of the above" options`
}
