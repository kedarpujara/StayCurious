export interface TitleDefinition {
  id: string
  name: string
  description: string
  karmaRequired: number
  tier: number
}

export const TITLES: TitleDefinition[] = [
  {
    id: 'curious_newcomer',
    name: 'Curious Newcomer',
    description: 'Every expert was once a beginner. Welcome to the journey!',
    karmaRequired: 0,
    tier: 1,
  },
  {
    id: 'question_asker',
    name: 'Question Asker',
    description: "You're not afraid to ask. That's the first step to wisdom.",
    karmaRequired: 25,
    tier: 2,
  },
  {
    id: 'knowledge_seeker',
    name: 'Knowledge Seeker',
    description: "You're building something valuable — your understanding.",
    karmaRequired: 75,
    tier: 3,
  },
  {
    id: 'dedicated_learner',
    name: 'Dedicated Learner',
    description: 'Consistency is your superpower. Keep showing up!',
    karmaRequired: 150,
    tier: 4,
  },
  {
    id: 'curious_explorer',
    name: 'Curious Explorer',
    description: "You've wandered into fascinating territory.",
    karmaRequired: 300,
    tier: 5,
  },
  {
    id: 'rising_scholar',
    name: 'Rising Scholar',
    description: "Your knowledge is growing. People are noticing!",
    karmaRequired: 500,
    tier: 6,
  },
  {
    id: 'insight_hunter',
    name: 'Insight Hunter',
    description: 'You seek understanding, not just answers.',
    karmaRequired: 750,
    tier: 7,
  },
  {
    id: 'wisdom_gatherer',
    name: 'Wisdom Gatherer',
    description: "You're becoming someone people learn from.",
    karmaRequired: 1000,
    tier: 8,
  },
  {
    id: 'polymath_training',
    name: 'Polymath in Training',
    description: 'Your curiosity knows no bounds. Impressive!',
    karmaRequired: 1500,
    tier: 9,
  },
  {
    id: 'knowledge_architect',
    name: 'Knowledge Architect',
    description: "You're building a cathedral of understanding.",
    karmaRequired: 2500,
    tier: 10,
  },
]

export function getTitleForKarma(karma: number): TitleDefinition {
  // Find the highest tier title the user qualifies for
  const qualifiedTitles = TITLES.filter(t => t.karmaRequired <= karma)
  return qualifiedTitles[qualifiedTitles.length - 1] || TITLES[0]
}

export function getNextTitle(currentKarma: number): TitleDefinition | null {
  const nextTitle = TITLES.find(t => t.karmaRequired > currentKarma)
  return nextTitle || null
}

export function getProgressToNextTitle(currentKarma: number): { current: number; required: number; percentage: number } | null {
  const currentTitle = getTitleForKarma(currentKarma)
  const nextTitle = getNextTitle(currentKarma)

  if (!nextTitle) return null

  const progressStart = currentTitle.karmaRequired
  const progressEnd = nextTitle.karmaRequired
  const current = currentKarma - progressStart
  const required = progressEnd - progressStart

  return {
    current,
    required,
    percentage: Math.min(100, Math.round((current / required) * 100)),
  }
}
