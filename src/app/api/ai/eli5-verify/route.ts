import { generateText } from 'ai'
import { NextResponse } from 'next/server'
import { getModel, getDefaultProvider } from '@/lib/ai/providers'

interface ConceptExplanation {
  concept: string
  explanation: string
}

interface VerificationResult {
  concept: string
  passed: boolean
  feedback: string
  score: number // 1-5 scale
}

const ELI5_VERIFICATION_SYSTEM = `You are a friendly, encouraging evaluator helping learners explain concepts simply.

Your task is to verify if an explanation demonstrates understanding and uses reasonably simple language - think "ELI10" (explain to a 10-year-old) rather than strictly "ELI5".

## Core Philosophy:
- The act of attempting to explain IS valuable - be encouraging!
- We want to PASS people who genuinely tried, even if not perfect
- Only fail explanations that are totally off, incomprehensible, or completely wrong

## Evaluation Criteria (score 1-5):

5 - Excellent: Clear, uses simple language or analogies, shows real understanding
4 - Good: Demonstrates understanding, reasonably accessible, minor jargon is OK
3 - Acceptable: Gets the core idea across, even if could be simpler
2 - Needs work: Confusing, misses the main point, or has significant errors
1 - Off track: Completely wrong, nonsensical, or shows no understanding

## Rules:
- Passing score is 3, 4, or 5 (be lenient!)
- Give credit for effort and partial understanding
- Some technical terms are fine if the explanation is otherwise clear
- Short explanations are OK if they capture the essence
- Only fail (1-2) if the explanation is fundamentally wrong or incomprehensible
- Encourage simplicity in feedback, but don't penalize heavily for not being perfect

For each concept, evaluate and respond with JSON only:
{
  "results": [
    {
      "concept": "concept name",
      "passed": true/false,
      "score": 1-5,
      "feedback": "Brief encouraging feedback - celebrate what worked, gently suggest how to be even simpler"
    }
  ],
  "overallPassed": true/false (true if ALL concepts scored 3+)
}

Remember: Be encouraging! The goal is to reward effort and understanding, not perfection. If they tried and got the core idea, they pass.`

export async function POST(request: Request) {
  try {
    const { explanations, courseTopic } = await request.json() as {
      explanations: ConceptExplanation[]
      courseTopic: string
    }

    if (!explanations || explanations.length === 0) {
      return NextResponse.json({ error: 'No explanations provided' }, { status: 400 })
    }

    const prompt = `Course Topic: "${courseTopic}"

Please verify these ELI5 explanations:

${explanations.map((e: ConceptExplanation, i: number) => `
${i + 1}. Concept: "${e.concept}"
   Explanation: "${e.explanation}"
`).join('\n')}

Evaluate each explanation and respond with JSON only.`

    const provider = getDefaultProvider()
    const model = getModel(provider)

    const { text } = await generateText({
      model,
      system: ELI5_VERIFICATION_SYSTEM,
      prompt,
    })

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Could not parse verification response')
    }

    const verification = JSON.parse(jsonMatch[0]) as {
      results: VerificationResult[]
      overallPassed: boolean
    }

    return NextResponse.json(verification)
  } catch (error) {
    console.error('ELI5 verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify explanation' },
      { status: 500 }
    )
  }
}
