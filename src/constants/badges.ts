export interface BadgeDefinition {
  id: string
  name: string
  description: string
  howToEarn: string // Added: explains how to earn the badge
  category: 'curiosity' | 'learning' | 'mastery' | 'streak' | 'milestone' | 'challenge'
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  curioReward: number
  icon: string
}

export const BADGES: BadgeDefinition[] = [
  // ==========================================
  // CURIOSITY BADGES - Asking Questions
  // ==========================================
  {
    id: 'first_question',
    name: 'First Spark',
    description: 'Asked your first question',
    howToEarn: 'Ask any question on the Ask page',
    category: 'curiosity',
    rarity: 'common',
    curioReward: 5,
    icon: '💡',
  },
  {
    id: 'curious_10',
    name: 'Curious Mind',
    description: 'Asked 10 questions',
    howToEarn: 'Ask 10 questions total',
    category: 'curiosity',
    rarity: 'common',
    curioReward: 15,
    icon: '🤔',
  },
  {
    id: 'curious_50',
    name: 'Question Machine',
    description: 'Asked 50 questions',
    howToEarn: 'Ask 50 questions total',
    category: 'curiosity',
    rarity: 'uncommon',
    curioReward: 50,
    icon: '❓',
  },
  {
    id: 'curious_100',
    name: 'Insatiable Curiosity',
    description: 'Asked 100 questions',
    howToEarn: 'Ask 100 questions total',
    category: 'curiosity',
    rarity: 'rare',
    curioReward: 100,
    icon: '🔮',
  },

  // ==========================================
  // LEARNING BADGES - Completing Courses
  // ==========================================
  {
    id: 'first_course',
    name: 'First Steps',
    description: 'Completed your first course',
    howToEarn: 'Finish all sections of any course',
    category: 'learning',
    rarity: 'common',
    curioReward: 20,
    icon: '📚',
  },
  {
    id: 'learner_5',
    name: 'Steady Learner',
    description: 'Completed 5 courses',
    howToEarn: 'Complete 5 courses total',
    category: 'learning',
    rarity: 'uncommon',
    curioReward: 50,
    icon: '🌱',
  },
  {
    id: 'learner_10',
    name: 'Knowledge Builder',
    description: 'Completed 10 courses',
    howToEarn: 'Complete 10 courses total',
    category: 'learning',
    rarity: 'rare',
    curioReward: 100,
    icon: '🏛️',
  },
  {
    id: 'learner_25',
    name: 'Scholar',
    description: 'Completed 25 courses',
    howToEarn: 'Complete 25 courses total',
    category: 'learning',
    rarity: 'epic',
    curioReward: 250,
    icon: '📜',
  },
  {
    id: 'learner_50',
    name: 'Polymath',
    description: 'Completed 50 courses',
    howToEarn: 'Complete 50 courses total',
    category: 'learning',
    rarity: 'legendary',
    curioReward: 500,
    icon: '🎓',
  },

  // ==========================================
  // MASTERY BADGES - Quiz Excellence
  // ==========================================
  {
    id: 'first_quiz',
    name: 'Quiz Taker',
    description: 'Passed your first quiz',
    howToEarn: 'Pass any course quiz',
    category: 'mastery',
    rarity: 'common',
    curioReward: 10,
    icon: '✅',
  },
  {
    id: 'perfect_quiz',
    name: 'Perfect Score',
    description: 'Achieved 100% on a quiz',
    howToEarn: 'Get every question right on a quiz',
    category: 'mastery',
    rarity: 'uncommon',
    curioReward: 25,
    icon: '💯',
  },
  {
    id: 'perfect_quiz_5',
    name: 'Quiz Master',
    description: 'Achieved 100% on 5 quizzes',
    howToEarn: 'Get perfect scores on 5 different quizzes',
    category: 'mastery',
    rarity: 'rare',
    curioReward: 75,
    icon: '🏆',
  },
  {
    id: 'hard_mode_hero',
    name: 'Hard Mode Hero',
    description: 'Passed a quiz on hard difficulty',
    howToEarn: 'Select hard difficulty and pass the quiz',
    category: 'mastery',
    rarity: 'uncommon',
    curioReward: 30,
    icon: '💪',
  },
  {
    id: 'hard_mode_master',
    name: 'Challenge Seeker',
    description: 'Passed 5 quizzes on hard difficulty',
    howToEarn: 'Pass 5 quizzes on hard difficulty',
    category: 'mastery',
    rarity: 'rare',
    curioReward: 100,
    icon: '🔥',
  },
  {
    id: 'first_try',
    name: 'First Try!',
    description: 'Passed a quiz on the first attempt',
    howToEarn: 'Pass any quiz without retrying',
    category: 'mastery',
    rarity: 'common',
    curioReward: 15,
    icon: '🎯',
  },

  // ==========================================
  // CHALLENGE BADGES - ELI5 & Special
  // ==========================================
  {
    id: 'eli5_first',
    name: 'Teacher in Training',
    description: 'Passed your first ELI5 challenge',
    howToEarn: 'Explain a course concept in simple terms',
    category: 'challenge',
    rarity: 'uncommon',
    curioReward: 30,
    icon: '👶',
  },
  {
    id: 'eli5_master',
    name: 'Master Explainer',
    description: 'Passed 5 ELI5 challenges',
    howToEarn: 'Successfully explain 5 different courses simply',
    category: 'challenge',
    rarity: 'rare',
    curioReward: 100,
    icon: '🧠',
  },
  {
    id: 'eli5_legend',
    name: 'Feynman Award',
    description: 'Passed 10 ELI5 challenges',
    howToEarn: 'Master the art of simple explanations',
    category: 'challenge',
    rarity: 'epic',
    curioReward: 200,
    icon: '🏅',
  },
  {
    id: 'full_course',
    name: 'Completionist',
    description: 'Earned all rewards from a single course',
    howToEarn: 'Complete sections + pass quiz + pass ELI5 for one course',
    category: 'challenge',
    rarity: 'uncommon',
    curioReward: 50,
    icon: '⭐',
  },

  // ==========================================
  // STREAK BADGES - Consistency
  // ==========================================
  {
    id: 'streak_3',
    name: 'Getting Started',
    description: '3-day learning streak',
    howToEarn: 'Learn something 3 days in a row',
    category: 'streak',
    rarity: 'common',
    curioReward: 10,
    icon: '🔥',
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: '7-day learning streak',
    howToEarn: 'Learn something 7 days in a row',
    category: 'streak',
    rarity: 'uncommon',
    curioReward: 35,
    icon: '⚡',
  },
  {
    id: 'streak_14',
    name: 'Fortnight Fighter',
    description: '14-day learning streak',
    howToEarn: 'Learn something 14 days in a row',
    category: 'streak',
    rarity: 'rare',
    curioReward: 75,
    icon: '🌟',
  },
  {
    id: 'streak_30',
    name: 'Monthly Master',
    description: '30-day learning streak',
    howToEarn: 'Learn something 30 days in a row',
    category: 'streak',
    rarity: 'epic',
    curioReward: 150,
    icon: '👑',
  },
  {
    id: 'streak_100',
    name: 'Century Club',
    description: '100-day learning streak',
    howToEarn: 'Maintain a 100-day learning streak',
    category: 'streak',
    rarity: 'legendary',
    curioReward: 500,
    icon: '💎',
  },

  // ==========================================
  // MILESTONE BADGES - Curio Points
  // ==========================================
  {
    id: 'curio_100',
    name: 'Rising Star',
    description: 'Earned 100 Curio',
    howToEarn: 'Accumulate 100 Curio from any activities',
    category: 'milestone',
    rarity: 'common',
    curioReward: 0,
    icon: '⭐',
  },
  {
    id: 'curio_500',
    name: 'Knowledge Enthusiast',
    description: 'Earned 500 Curio',
    howToEarn: 'Accumulate 500 Curio total',
    category: 'milestone',
    rarity: 'uncommon',
    curioReward: 0,
    icon: '🌟',
  },
  {
    id: 'curio_1000',
    name: 'Wisdom Seeker',
    description: 'Earned 1,000 Curio',
    howToEarn: 'Accumulate 1,000 Curio total',
    category: 'milestone',
    rarity: 'rare',
    curioReward: 0,
    icon: '💫',
  },
  {
    id: 'curio_5000',
    name: 'Enlightened One',
    description: 'Earned 5,000 Curio',
    howToEarn: 'Accumulate 5,000 Curio total',
    category: 'milestone',
    rarity: 'epic',
    curioReward: 0,
    icon: '🌙',
  },
  {
    id: 'curio_10000',
    name: 'Grand Master',
    description: 'Earned 10,000 Curio',
    howToEarn: 'Accumulate 10,000 Curio total',
    category: 'milestone',
    rarity: 'legendary',
    curioReward: 0,
    icon: '☀️',
  },

  // ==========================================
  // SPECIAL BADGES - Unique Achievements
  // ==========================================
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Completed a course before 8 AM',
    howToEarn: 'Finish a course in the early morning',
    category: 'challenge',
    rarity: 'uncommon',
    curioReward: 20,
    icon: '🌅',
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Completed a course after midnight',
    howToEarn: 'Finish a course late at night',
    category: 'challenge',
    rarity: 'uncommon',
    curioReward: 20,
    icon: '🦉',
  },
  {
    id: 'weekend_scholar',
    name: 'Weekend Scholar',
    description: 'Completed 3 courses in one weekend',
    howToEarn: 'Finish 3 courses on Saturday and Sunday',
    category: 'challenge',
    rarity: 'rare',
    curioReward: 75,
    icon: '📅',
  },
  {
    id: 'speed_learner',
    name: 'Speed Learner',
    description: 'Completed a course in under 10 minutes',
    howToEarn: 'Finish a course quickly (for short courses)',
    category: 'challenge',
    rarity: 'uncommon',
    curioReward: 25,
    icon: '⚡',
  },
  {
    id: 'diverse_mind',
    name: 'Diverse Mind',
    description: 'Completed courses in 5 different categories',
    howToEarn: 'Explore 5 different topic categories',
    category: 'learning',
    rarity: 'rare',
    curioReward: 100,
    icon: '🌈',
  },
]

export function getBadgeById(id: string): BadgeDefinition | undefined {
  return BADGES.find(badge => badge.id === id)
}

export function getBadgesByCategory(category: BadgeDefinition['category']): BadgeDefinition[] {
  return BADGES.filter(badge => badge.category === category)
}

export function getBadgesByRarity(rarity: BadgeDefinition['rarity']): BadgeDefinition[] {
  return BADGES.filter(badge => badge.rarity === rarity)
}

// Rarity colors for UI
export const RARITY_COLORS = {
  common: 'text-slate-500 bg-slate-100 dark:bg-slate-800',
  uncommon: 'text-green-600 bg-green-100 dark:bg-green-900/30',
  rare: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  epic: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
  legendary: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30',
}
