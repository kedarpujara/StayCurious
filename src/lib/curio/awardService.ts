/**
 * Curio Award Service
 *
 * Handles idempotent awarding of mCurio via Supabase.
 * All awards are logged in curio_events for auditability.
 */

import { createClient } from '@/lib/supabase/client'
import {
  DAILY_CHECKIN_MCURIO,
  SECTION_COMPLETE_MCURIO,
  COURSE_START_MCURIO,
  CURIO_EVENT_TYPES,
} from './constants'
import type {
  AwardMcurioParams,
  AwardResult,
  DailyCheckinResult,
  QuizScoreParams,
  CurioBreakdown,
} from './types'
import { calculateQuizMcurio } from './calculateMcurio'

// ============================================
// Core Award Function
// ============================================

/**
 * Award mCurio to a user (idempotent via idempotency_key)
 */
export async function awardMcurio(params: AwardMcurioParams): Promise<AwardResult> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('award_mcurio', {
    p_user_id: params.userId,
    p_event_type: params.eventType,
    p_mcurio: params.mcurio,
    p_breakdown: params.breakdown,
    p_idempotency_key: params.idempotencyKey,
    p_course_id: params.courseId ?? null,
    p_quiz_attempt: params.quizAttempt ?? null,
    p_topic_key: params.topicKey ?? null,
  })

  if (error) {
    console.error('[AwardService] Error awarding mCurio:', error)
    return {
      success: false,
      newTotalMcurio: 0,
      alreadyAwarded: false,
      mcurioAwarded: 0,
    }
  }

  const result = data?.[0]
  return {
    success: result?.success ?? false,
    newTotalMcurio: result?.new_total_mcurio ?? 0,
    alreadyAwarded: result?.already_awarded ?? false,
    mcurioAwarded: result?.already_awarded ? 0 : params.mcurio,
  }
}

// ============================================
// Quiz Completion
// ============================================

/**
 * Award mCurio for passing a quiz
 */
export async function awardQuizCompletion(
  userId: string,
  courseId: string,
  topicKey: string,
  params: QuizScoreParams
): Promise<{ result: AwardResult; breakdown: CurioBreakdown }> {
  const breakdown = calculateQuizMcurio(params)

  // Don't award if not passed or no Curio earned
  if (!breakdown.passed || breakdown.finalMcurio === 0) {
    return {
      result: {
        success: true,
        newTotalMcurio: 0,
        alreadyAwarded: false,
        mcurioAwarded: 0,
      },
      breakdown,
    }
  }

  const result = await awardMcurio({
    userId,
    eventType: CURIO_EVENT_TYPES.QUIZ_PASS,
    mcurio: breakdown.finalMcurio,
    breakdown,
    idempotencyKey: `quiz:${userId}:${courseId}:${params.attemptNumber}`,
    courseId,
    quizAttempt: params.attemptNumber,
    topicKey,
  })

  return { result, breakdown }
}

// ============================================
// Daily Check-in
// ============================================

/**
 * Award daily check-in bonus (once per UTC day)
 */
export async function awardDailyCheckin(
  userId: string,
  triggerAction: string
): Promise<DailyCheckinResult> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('daily_checkin', {
    p_user_id: userId,
    p_trigger_action: triggerAction,
  })

  if (error) {
    console.error('[AwardService] Error with daily checkin:', error)
    return {
      success: false,
      mcurioAwarded: 0,
      alreadyCheckedIn: false,
      dateUtc: new Date().toISOString().split('T')[0],
    }
  }

  const result = data?.[0]
  return {
    success: result?.success ?? false,
    mcurioAwarded: result?.mcurio_awarded ?? 0,
    alreadyCheckedIn: result?.already_checked_in ?? false,
    dateUtc: new Date().toISOString().split('T')[0],
  }
}

// ============================================
// Simple Awards
// ============================================

/**
 * Award mCurio for starting a course
 */
export async function awardCourseStart(
  userId: string,
  courseId: string
): Promise<AwardResult> {
  return awardMcurio({
    userId,
    eventType: CURIO_EVENT_TYPES.COURSE_STARTED,
    mcurio: COURSE_START_MCURIO,
    breakdown: { type: 'course_start' },
    idempotencyKey: `course_start:${userId}:${courseId}`,
    courseId,
  })
}

/**
 * Award mCurio for completing a section
 */
export async function awardSectionComplete(
  userId: string,
  courseId: string,
  sectionId: string
): Promise<AwardResult> {
  return awardMcurio({
    userId,
    eventType: CURIO_EVENT_TYPES.SECTION_COMPLETED,
    mcurio: SECTION_COMPLETE_MCURIO,
    breakdown: { type: 'section_complete', sectionId },
    idempotencyKey: `section:${userId}:${courseId}:${sectionId}`,
    courseId,
  })
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get user's courses completed today (for daily multiplier)
 */
export async function getUserDailyCourseCount(userId: string): Promise<number> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_user_daily_course_count', {
    p_user_id: userId,
  })

  if (error) {
    console.error('[AwardService] Error getting daily course count:', error)
    return 0
  }

  return data ?? 0
}

/**
 * Get user's topic completions this month (for topic revisit multiplier)
 */
export async function getTopicCompletionCount(
  userId: string,
  topicKey: string
): Promise<number> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_topic_completion_count', {
    p_user_id: userId,
    p_topic_key: topicKey,
  })

  if (error) {
    console.error('[AwardService] Error getting topic completion count:', error)
    return 0
  }

  return data ?? 0
}

/**
 * Increment topic completion count (call after awarding quiz)
 */
export async function incrementTopicCompletion(
  userId: string,
  topicKey: string
): Promise<number> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('increment_topic_completion', {
    p_user_id: userId,
    p_topic_key: topicKey,
  })

  if (error) {
    console.error('[AwardService] Error incrementing topic completion:', error)
    return 0
  }

  return data ?? 0
}
