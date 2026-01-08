import type { BadgeRequirement } from '@/types'

export interface BadgeDefinition {
  id: string
  name: string
  description: string
  category: 'curiosity' | 'learning' | 'streak' | 'milestone'
  requirements: BadgeRequirement
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  curioReward: number
  icon: string
}

export const BADGES: BadgeDefinition[] = [
  // Curiosity badges
  {
    id: 'first_question',
    name: 'First Spark',
    description: 'Asked your first question',
    category: 'curiosity',
    requirements: { type: 'questions_asked', count: 1 },
    rarity: 'common',
    curioReward: 5,
    icon: '💡',
  },
  {
    id: 'curious_10',
    name: 'Curious Mind',
    description: 'Asked 10 questions',
    category: 'curiosity',
    requirements: { type: 'questions_asked', count: 10 },
    rarity: 'common',
    curioReward: 15,
    icon: '🤔',
  },
  {
    id: 'curious_50',
    name: 'Question Machine',
    description: 'Asked 50 questions',
    category: 'curiosity',
    requirements: { type: 'questions_asked', count: 50 },
    rarity: 'uncommon',
    curioReward: 50,
    icon: '❓',
  },
  {
    id: 'curious_100',
    name: 'Insatiable Curiosity',
    description: 'Asked 100 questions',
    category: 'curiosity',
    requirements: { type: 'questions_asked', count: 100 },
    rarity: 'rare',
    curioReward: 100,
    icon: '🔮',
  },

  // Learning badges
  {
    id: 'first_course',
    name: 'First Steps',
    description: 'Completed your first course',
    category: 'learning',
    requirements: { type: 'courses_completed', count: 1 },
    rarity: 'common',
    curioReward: 20,
    icon: '📚',
  },
  {
    id: 'learner_5',
    name: 'Steady Learner',
    description: 'Completed 5 courses',
    category: 'learning',
    requirements: { type: 'courses_completed', count: 5 },
    rarity: 'uncommon',
    curioReward: 50,
    icon: '🎓',
  },
  {
    id: 'learner_10',
    name: 'Knowledge Builder',
    description: 'Completed 10 courses',
    category: 'learning',
    requirements: { type: 'courses_completed', count: 10 },
    rarity: 'rare',
    curioReward: 100,
    icon: '🏛️',
  },
  {
    id: 'learner_25',
    name: 'Scholar',
    description: 'Completed 25 courses',
    category: 'learning',
    requirements: { type: 'courses_completed', count: 25 },
    rarity: 'epic',
    curioReward: 250,
    icon: '📜',
  },

  // Quiz badges
  {
    id: 'perfect_quiz',
    name: 'Perfect Score',
    description: 'Got 100% on a quiz',
    category: 'learning',
    requirements: { type: 'quiz_perfect_score', count: 1 },
    rarity: 'uncommon',
    curioReward: 25,
    icon: '💯',
  },
  {
    id: 'perfect_quiz_5',
    name: 'Quiz Master',
    description: 'Got 100% on 5 quizzes',
    category: 'learning',
    requirements: { type: 'quiz_perfect_score', count: 5 },
    rarity: 'rare',
    curioReward: 75,
    icon: '🏆',
  },

  // Streak badges
  {
    id: 'streak_3',
    name: 'Getting Started',
    description: '3-day learning streak',
    category: 'streak',
    requirements: { type: 'streak_days', count: 3 },
    rarity: 'common',
    curioReward: 10,
    icon: '🔥',
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: '7-day learning streak',
    category: 'streak',
    requirements: { type: 'streak_days', count: 7 },
    rarity: 'uncommon',
    curioReward: 35,
    icon: '⚡',
  },
  {
    id: 'streak_30',
    name: 'Monthly Master',
    description: '30-day learning streak',
    category: 'streak',
    requirements: { type: 'streak_days', count: 30 },
    rarity: 'epic',
    curioReward: 150,
    icon: '👑',
  },

  // Milestone badges
  {
    id: 'curio_100',
    name: 'Rising Star',
    description: 'Earned 100 Curio',
    category: 'milestone',
    requirements: { type: 'curio_points', count: 100 },
    rarity: 'common',
    curioReward: 0, // No reward for curio milestone (would be circular)
    icon: '⭐',
  },
  {
    id: 'curio_500',
    name: 'Knowledge Enthusiast',
    description: 'Earned 500 Curio',
    category: 'milestone',
    requirements: { type: 'curio_points', count: 500 },
    rarity: 'uncommon',
    curioReward: 0,
    icon: '🌟',
  },
  {
    id: 'curio_1000',
    name: 'Wisdom Seeker',
    description: 'Earned 1000 Curio',
    category: 'milestone',
    requirements: { type: 'curio_points', count: 1000 },
    rarity: 'rare',
    curioReward: 0,
    icon: '💫',
  },

  // Category mastery badges
  {
    id: 'science_master',
    name: 'Science Explorer',
    description: 'Completed 5 Science & Engineering courses',
    category: 'learning',
    requirements: { type: 'category_mastery', count: 5, category: 'science' },
    rarity: 'rare',
    curioReward: 75,
    icon: '🔬',
  },
  {
    id: 'history_master',
    name: 'History Buff',
    description: 'Completed 5 History & Civilization courses',
    category: 'learning',
    requirements: { type: 'category_mastery', count: 5, category: 'history' },
    rarity: 'rare',
    curioReward: 75,
    icon: '🏺',
  },
  {
    id: 'philosophy_master',
    name: 'Deep Thinker',
    description: 'Completed 5 Philosophy & Ethics courses',
    category: 'learning',
    requirements: { type: 'category_mastery', count: 5, category: 'philosophy' },
    rarity: 'rare',
    curioReward: 75,
    icon: '🦉',
  },
]

export function getBadgeById(id: string): BadgeDefinition | undefined {
  return BADGES.find(badge => badge.id === id)
}

export function getBadgesByCategory(category: BadgeDefinition['category']): BadgeDefinition[] {
  return BADGES.filter(badge => badge.category === category)
}
