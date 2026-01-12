import { generateText } from 'ai'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getModel, getDefaultProvider } from '@/lib/ai/providers'

// Generate 5 key concepts for a topic that the user should be able to explain
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, courseId, topic, concepts, explanations } = await request.json() as {
      action: 'generate' | 'evaluate'
      courseId?: string
      topic: string
      concepts?: string[]
      explanations?: string[]
    }

    const model = getModel(getDefaultProvider())

    if (action === 'generate') {
      // Get course content if available
      let courseContext = ''
      if (courseId) {
        const { data: course } = await supabase
          .from('course_catalog')
          .select('content')
          .eq('id', courseId)
          .single()

        if (course?.content?.sections) {
          courseContext = course.content.sections
            .map((s: any) => `${s.title}: ${s.content.substring(0, 500)}`)
            .join('\n\n')
        }
      }

      const { text } = await generateText({
        model,
        system: `You are an educational assistant helping users consolidate their learning.
Generate exactly 5 key concepts from the given topic that the user should be able to explain simply.
Each concept should be:
- A core idea that demonstrates understanding of the topic
- Something that can be explained in simple terms (like explaining to a 5 year old)
- Progressively building from simpler to more complex ideas

Return ONLY a JSON object with this exact structure:
{
  "concepts": [
    {
      "id": "concept-1",
      "title": "Short concept title",
      "hint": "A brief hint about what to cover in the explanation"
    },
    // ... 5 concepts total
  ]
}`,
        prompt: `Topic: ${topic}
${courseContext ? `\nCourse Content:\n${courseContext}` : ''}

Generate 5 key concepts that someone who learned about "${topic}" should be able to explain simply.`
      })

      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const result = JSON.parse(jsonMatch[0])
      return NextResponse.json(result)
    }

    if (action === 'evaluate') {
      if (!concepts || !explanations || concepts.length !== explanations.length) {
        return NextResponse.json({ error: 'Invalid evaluation request' }, { status: 400 })
      }

      const { text } = await generateText({
        model,
        system: `You are an educational evaluator assessing how well users can explain concepts simply.
You're evaluating "Explain Like I'm 5" (ELI5) explanations.

Score each explanation on these criteria:
1. SIMPLICITY (1-5): Does it use simple words a child could understand? Avoids jargon?
2. CLARITY (1-5): Is it clear and easy to follow? Good analogies?
3. ACCURACY (1-5): Is it factually correct despite being simple?
4. COMPLETENESS (1-5): Does it cover the key point of the concept?

For each explanation, provide:
- Individual scores for each criterion
- Overall score (average)
- Brief feedback (1-2 sentences)
- A "gold star" boolean if it's an exceptional ELI5 explanation

Return ONLY a JSON object with this exact structure:
{
  "evaluations": [
    {
      "conceptId": "concept-1",
      "scores": {
        "simplicity": 4,
        "clarity": 5,
        "accuracy": 4,
        "completeness": 3
      },
      "overallScore": 4.0,
      "feedback": "Great use of the cookie jar analogy! Could explain the 'why' a bit more.",
      "goldStar": true
    },
    // ... one evaluation per concept
  ],
  "totalScore": 85,
  "bonusPoints": 25,
  "overallFeedback": "Excellent job explaining complex ideas simply!"
}

Bonus points calculation:
- Base: sum of all overall scores * 5
- Gold star bonus: +5 points per gold star
- Perfect simplicity bonus: +10 if all simplicity scores are 5`,
        prompt: `Topic: ${topic}

Here are the concepts and user explanations to evaluate:

${concepts.map((concept, i) => `
Concept ${i + 1}: ${concept}
User's Explanation: ${explanations[i] || '(No explanation provided)'}
`).join('\n')}

Evaluate each explanation on how well it explains the concept like you're explaining to a 5 year old.`
      })

      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in evaluation response')
      }

      const result = JSON.parse(jsonMatch[0])

      // Award karma if they did well
      if (result.bonusPoints > 0) {
        await supabase.rpc('add_karma', {
          p_user_id: user.id,
          p_amount: result.bonusPoints,
          p_action: 'teach_back_bonus',
          p_metadata: { topic, score: result.totalScore }
        })
      }

      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[Teach Back] Error:', error)
    return NextResponse.json(
      { error: 'Failed to process teach back request' },
      { status: 500 }
    )
  }
}
