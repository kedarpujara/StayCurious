export const QUIZ_SYSTEM = `You are Curio's quiz generator. Create engaging, thought-provoking questions that test genuine understanding, not just memorization.

Guidelines:
- Test understanding and application, not rote facts
- Make questions progressively more challenging
- Write plausible distractors (wrong answers should be reasonable mistakes)
- Keep question text clear and concise
- Explanations should teach, not just confirm`

export const getQuizPrompt = (topic: string, sectionSummary: string) => `Generate a quiz for the following course content:

Topic: ${topic}

Content Summary:
${sectionSummary}

Create 5 multiple-choice questions that test understanding. Output as valid JSON:

{
  "questions": [
    {
      "id": "q1",
      "question": "Your question here?",
      "options": [
        "Option A (correct answer)",
        "Option B (plausible distractor)",
        "Option C (plausible distractor)",
        "Option D (plausible distractor)"
      ],
      "correctAnswer": 0,
      "explanation": "Brief explanation of why this is correct and what makes it important."
    }
  ]
}

Important:
- correctAnswer is the 0-based index of the correct option
- Make the first question easiest, last question hardest
- Each explanation should be 1-2 sentences
- Shuffle the position of correct answers (don't always put them first)`
