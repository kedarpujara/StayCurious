import type { StepKind, LessonChatAction } from '@/types'

export const LESSON_CHAT_SYSTEM = `You are Curio, a friendly and engaging tutor guiding a student through a lesson step by step.

## Your Role
- Present concepts one at a time in a conversational way
- Use encouraging, warm language - like a smart friend explaining things
- Never lecture - have a dialogue
- Make the student feel smart for asking questions

## Response Format
CRITICAL - Markdown Formatting Rules:
- Use **bold** for key terms and important concepts
- Add a BLANK LINE between EVERY paragraph (this is essential!)
- Add a BLANK LINE before and after any bullet list
- Add a BLANK LINE before and after any numbered list
- Each list item must be on its own line
- Keep paragraphs short (2-3 sentences max)
- Use headers (##) sparingly, only for major topic shifts

Example of CORRECT formatting:

**Key term** is the main concept here.

Here's why it matters:

1) **First point** - explanation here

2) **Second point** - more details

3) **Third point** - context added

This connects to what we'll explore next...

## Response Length Guidelines
- Intro steps: 40-60 words - set the stage warmly
- Content steps: 80-120 words - explain with clarity
- Check steps: 30-50 words - quick comprehension prompt
- Summary steps: 40-60 words - concise takeaway
- Clarifications: 60-100 words - answer then guide back
- Examples: 80-120 words - concrete and memorable

## Conversation Style
- End guided steps with a natural invitation to continue
- In clarification mode: answer the question, then smoothly guide back to the lesson
- Use simple analogies and concrete examples
- Celebrate curiosity - every question is a good question`

export const getStepPrompt = (
  courseTopic: string,
  sectionTitle: string,
  sectionContent: string,
  stepKind: StepKind,
  stepIndex: number,
  totalStepsInSection: number
): string => {
  const stepInstructions = {
    intro: `Introduce the concept of "${sectionTitle}" in a warm, inviting way.
Briefly explain why this matters and what we'll explore together.
End with something like "Ready to dive in?" or "Let's explore this together."`,

    content: `Explain the core ideas from this section clearly and conversationally.
Break complex ideas into digestible pieces.
Use **bold** for key terms.
Add a blank line between different ideas.
End with a thought that connects to what comes next.`,

    check: `Ask the student a simple question to check their understanding of "${sectionTitle}".
This should be conversational, not quiz-like.
Something like "Quick check - can you think of..." or "What do you think would happen if..."`,

    summary: `Wrap up "${sectionTitle}" with the key takeaway.
Keep it memorable and concise.
Connect it to what's next or how they can use this knowledge.
End with encouragement about their progress.`,
  }

  return `Course Topic: ${courseTopic}

## Current Section: ${sectionTitle}
${sectionContent}

## Your Task
Generate step ${stepIndex + 1} of ${totalStepsInSection} for this section.
Step type: ${stepKind.toUpperCase()}

${stepInstructions[stepKind]}

Remember to use markdown formatting with proper spacing between paragraphs.`
}

export const getClarificationPrompt = (
  courseTopic: string,
  sectionTitle: string,
  sectionContent: string,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[],
  userQuestion: string
): string => {
  const historyText =
    conversationHistory.length > 0
      ? `\n## Recent Conversation:\n${conversationHistory
          .slice(-4)
          .map((m) => `${m.role === 'user' ? 'Student' : 'Curio'}: ${m.content}`)
          .join('\n\n')}\n`
      : ''

  return `Course Topic: ${courseTopic}
Current Section: ${sectionTitle}

## Section Content for Context:
${sectionContent}
${historyText}
## Student's Question:
"${userQuestion}"

## Your Task
Answer their question helpfully and conversationally.
Stay within the scope of the current topic when possible.
If the question is off-topic, briefly answer then gently guide back.

After answering, add a line break and then a brief transition like:
"Now, ready to continue with the lesson?" or "Great question! Want to keep going?"

Use markdown formatting for clarity.`
}

export const getExamplePrompt = (
  courseTopic: string,
  sectionTitle: string,
  sectionContent: string,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[]
): string => {
  const historyText =
    conversationHistory.length > 0
      ? `\n## What we've discussed:\n${conversationHistory
          .slice(-3)
          .map((m) => `${m.role === 'user' ? 'Student' : 'Curio'}: ${m.content}`)
          .join('\n\n')}\n`
      : ''

  return `Course Topic: ${courseTopic}
Current Section: ${sectionTitle}

## Section Content:
${sectionContent}
${historyText}
## Your Task
Provide a **concrete, memorable example** that illustrates the concepts in "${sectionTitle}".

Guidelines:
- Make it relatable to everyday life when possible
- Be specific - names, numbers, scenarios
- Walk through the example step by step
- Use **bold** for the key concept being demonstrated
- End with how this example connects back to the main idea

Use markdown formatting with proper paragraph breaks.`
}

export const getActionPrompt = (
  action: LessonChatAction,
  courseTopic: string,
  sectionTitle: string,
  sectionContent: string,
  stepKind: StepKind,
  stepIndex: number,
  totalStepsInSection: number,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[],
  userMessage?: string
): string => {
  switch (action) {
    case 'start':
    case 'next':
      return getStepPrompt(
        courseTopic,
        sectionTitle,
        sectionContent,
        stepKind,
        stepIndex,
        totalStepsInSection
      )
    case 'clarify':
      return getClarificationPrompt(
        courseTopic,
        sectionTitle,
        sectionContent,
        conversationHistory,
        userMessage || 'Can you explain this differently?'
      )
    case 'example':
      return getExamplePrompt(courseTopic, sectionTitle, sectionContent, conversationHistory)
    default:
      return getStepPrompt(
        courseTopic,
        sectionTitle,
        sectionContent,
        stepKind,
        stepIndex,
        totalStepsInSection
      )
  }
}
