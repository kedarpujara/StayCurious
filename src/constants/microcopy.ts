// Encouragement messages for various interactions

export const CURIOSITY_ENCOURAGEMENTS = [
  "Nice question 👀",
  "Curiosity sparked! ✨",
  "Good thinking! 🧠",
  "Interesting question!",
  "Love that curiosity!",
  "Great question!",
  "Curious minds unite! 🤝",
]

export const LEARNING_REMINDERS = [
  "Quick answers are great — real learning happens when you spend time with it.",
  "Answers are cheap, understanding is earned.",
  "Curiosity is the spark. Learning is the journey.",
  "Want to really remember this? Add it to your backlog.",
]

export const SECTION_COMPLETIONS = [
  "You're getting sharper! 📈",
  "One step closer to understanding!",
  "Knowledge unlocked! 🔓",
  "Keep going, you're doing great!",
  "Another piece of the puzzle! 🧩",
  "Building that mental model! 🏗️",
]

export const QUIZ_ENCOURAGEMENTS = {
  correct: [
    "Nailed it! 🎯",
    "Exactly right!",
    "You've got this!",
    "Perfect! 💯",
  ],
  incorrect: [
    "Not quite — but you're learning!",
    "Close! Here's what happened...",
    "Let's see why that's tricky...",
    "Good try! Learning in progress...",
  ],
  passed: [
    "You did it! 🎉",
    "Knowledge earned! 🏆",
    "Course complete! You're amazing!",
    "Congratulations, learner! 🌟",
  ],
  retry: [
    "Almost there! Give it another shot.",
    "Learning takes practice. Try again!",
    "You're so close! One more time?",
  ],
}

export const CURIO_MESSAGES = {
  question_asked: "+1 Curio",
  course_started: "+5 Curio",
  section_completed: "+3 Curio",
  quiz_passed: "Curio earned!",
  streak_maintained: "+2 Curio",
}

export const TITLE_DESCRIPTIONS: Record<string, string> = {
  'Curious Newcomer': "Every expert was once a beginner. Welcome to the journey!",
  'Question Asker': "You're not afraid to ask. That's the first step to wisdom.",
  'Knowledge Seeker': "You're building something valuable — your understanding.",
  'Dedicated Learner': "Consistency is your superpower. Keep showing up!",
  'Curious Explorer': "You've wandered into fascinating territory.",
  'Rising Scholar': "Your knowledge is growing. People are noticing!",
  'Insight Hunter': "You seek understanding, not just answers.",
  'Wisdom Gatherer': "You're becoming someone people learn from.",
  'Polymath in Training': "Your curiosity knows no bounds. Impressive!",
  'Knowledge Architect': "You're building a cathedral of understanding.",
}

export function getRandomEncouragement(array: string[]): string {
  return array[Math.floor(Math.random() * array.length)]
}

// Legacy alias for backward compatibility
/** @deprecated Use CURIO_MESSAGES instead */
export const KARMA_MESSAGES = CURIO_MESSAGES
