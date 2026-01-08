export const COURSE_SYSTEM = `You are Curio, an expert learning content creator. You generate engaging, structured crash courses that help curious minds truly understand topics.

Guidelines:
- Be engaging and conversational, like explaining to a curious friend
- Use analogies and concrete examples that make concepts click
- Avoid jargon or explain it when necessary
- Make content memorable and sticky
- Adjust depth and detail based on intensity level
- Each section should flow naturally into the next

CRITICAL - Comprehensive Coverage:
- Before generating content, identify ALL major types, categories, or mechanisms within the topic
- For natural phenomena: cover DIFFERENT causes (e.g., for waves: wind-driven, tidal/gravitational, seismic)
- For concepts: cover different schools of thought, approaches, or applications
- Explicitly distinguish between commonly confused subtypes (e.g., "tidal waves" vs "tsunamis" vs "wind waves")
- In the Key Concepts section, organize by TYPE or CATEGORY, not just a list of random facts
- If a topic has multiple distinct mechanisms or causes, each deserves its own explanation`

export const getCoursePrompt = (
  topic: string,
  intensity: 'skim' | 'solid' | 'deep',
  timeBudget: number
) => {
  const intensityGuide = {
    skim: {
      description: 'Brief overviews, hitting the key points quickly. Keep explanations concise and punchy.',
      sectionCount: 4,
    },
    solid: {
      description: 'Good explanations with examples and context. Balance depth with accessibility.',
      sectionCount: 6,
    },
    deep: {
      description: 'Thorough coverage with nuances, edge cases, examples, and deeper context.',
      sectionCount: 8,
    },
  }

  const guide = intensityGuide[intensity]

  // Section structures based on intensity
  const skimSections = `[
    { "id": "why_it_matters", "title": "Why It Matters", "content": "Hook with real-world relevance...", "estimatedMinutes": X },
    { "id": "key_concepts", "title": "Key Concepts", "content": "Essential building blocks (2-3 key points)...", "estimatedMinutes": X },
    { "id": "quick_example", "title": "Quick Example", "content": "One memorable illustration...", "estimatedMinutes": X },
    { "id": "takeaway", "title": "Key Takeaway", "content": "The main thing to remember + quiz prep...", "estimatedMinutes": X }
  ]`

  const solidSections = `[
    { "id": "why_it_matters", "title": "Why It Matters", "content": "Hook with real-world relevance...", "estimatedMinutes": X },
    { "id": "mental_model", "title": "Mental Model", "content": "Framework for thinking about this...", "estimatedMinutes": X },
    { "id": "key_concepts", "title": "Key Concepts", "content": "Essential building blocks (3-4 concepts)...", "estimatedMinutes": X },
    { "id": "concrete_example", "title": "Concrete Example", "content": "Memorable real-world illustration...", "estimatedMinutes": X },
    { "id": "common_pitfalls", "title": "Common Pitfalls", "content": "What people often get wrong...", "estimatedMinutes": X },
    { "id": "summary", "title": "Summary & Next Steps", "content": "TL;DR + practical tips + quiz prep...", "estimatedMinutes": X }
  ]`

  const deepSections = `[
    { "id": "why_it_matters", "title": "Why It Matters", "content": "Hook with real-world relevance and context...", "estimatedMinutes": X },
    { "id": "mental_model", "title": "Mental Model", "content": "Framework for thinking about this topic...", "estimatedMinutes": X },
    { "id": "key_concepts", "title": "Key Concepts", "content": "Essential building blocks (4-5 concepts with depth)...", "estimatedMinutes": X },
    { "id": "concrete_example", "title": "Concrete Example", "content": "Detailed real-world illustration...", "estimatedMinutes": X },
    { "id": "misconceptions", "title": "Common Misconceptions", "content": "What people often get wrong and why...", "estimatedMinutes": X },
    { "id": "practical_application", "title": "Practical Application", "content": "How to actually use this knowledge...", "estimatedMinutes": X },
    { "id": "edge_cases", "title": "Nuances & Edge Cases", "content": "When things get tricky...", "estimatedMinutes": X },
    { "id": "summary", "title": "Summary & Quiz Prep", "content": "TL;DR + what to focus on for the quiz...", "estimatedMinutes": X }
  ]`

  const sectionTemplate = intensity === 'skim' ? skimSections : intensity === 'solid' ? solidSections : deepSections

  return `Generate a structured crash course on: "${topic}"

Intensity Level: ${intensity.toUpperCase()}
- ${guide.description}
- Target: ${guide.sectionCount} sections
- Time Budget: ${timeBudget} minutes total (distribute across sections)

IMPORTANT: Output ONLY valid JSON with no additional text. Use this exact structure:

{
  "sections": ${sectionTemplate},
  "totalEstimatedMinutes": ${timeBudget}
}

Replace X with appropriate minute values that sum to approximately ${timeBudget}. Replace placeholder content with actual, engaging course content.

Content Guidelines:
- Use short paragraphs and clear language
- Include specific examples, not vague descriptions
- Make it feel like a smart friend explaining
- End with content that prepares them for a quiz

IMPORTANT - Topic Decomposition:
- First, mentally list all major subtypes/categories within "${topic}"
- Ensure Key Concepts covers EACH major subtype, not just the most common one
- If the topic involves natural phenomena, cover ALL major causes/mechanisms (not just one)
- Example: "ocean waves" should cover wind waves AND tidal waves AND tsunamis
- Example: "learning styles" should cover visual, auditory, kinesthetic, AND reading/writing`
}
