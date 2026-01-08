import { useReducer, useCallback, useMemo } from 'react'
import type { ChatMode, StepKind, LessonChatAction, CourseContent } from '@/types'

// Step sequence for each section
const STEP_SEQUENCE: StepKind[] = ['intro', 'content', 'check', 'summary']

export interface ChatMessage {
  id: string
  role: 'assistant' | 'user'
  content: string
  type: 'lesson' | 'clarification' | 'action'
  timestamp: Date
}

export interface LessonChatState {
  mode: ChatMode
  currentSectionIndex: number
  currentStepIndex: number
  messages: ChatMessage[]
  isStreaming: boolean
  isComplete: boolean
}

type LessonChatActionType =
  | { type: 'START_STREAMING' }
  | { type: 'ADD_MESSAGE'; message: ChatMessage }
  | { type: 'UPDATE_STREAMING_MESSAGE'; content: string }
  | { type: 'FINISH_STREAMING' }
  | { type: 'ADVANCE_STEP' }
  | { type: 'NEXT_SECTION' }
  | { type: 'ENTER_CLARIFICATION' }
  | { type: 'EXIT_CLARIFICATION' }
  | { type: 'COMPLETE_COURSE' }
  | { type: 'RESET' }

function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

function lessonChatReducer(
  state: LessonChatState,
  action: LessonChatActionType
): LessonChatState {
  switch (action.type) {
    case 'START_STREAMING':
      return { ...state, isStreaming: true }

    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.message],
      }

    case 'UPDATE_STREAMING_MESSAGE': {
      const messages = [...state.messages]
      const lastMessage = messages[messages.length - 1]
      if (lastMessage && lastMessage.role === 'assistant') {
        messages[messages.length - 1] = {
          ...lastMessage,
          content: action.content,
        }
      }
      return { ...state, messages }
    }

    case 'FINISH_STREAMING':
      return { ...state, isStreaming: false }

    case 'ADVANCE_STEP': {
      const nextStepIndex = state.currentStepIndex + 1
      // If we've completed all steps in this section
      if (nextStepIndex >= STEP_SEQUENCE.length) {
        return state // Don't advance past the last step - use NEXT_SECTION instead
      }
      return {
        ...state,
        currentStepIndex: nextStepIndex,
        mode: 'guided',
      }
    }

    case 'NEXT_SECTION':
      return {
        ...state,
        currentSectionIndex: state.currentSectionIndex + 1,
        currentStepIndex: 0,
        mode: 'guided',
      }

    case 'ENTER_CLARIFICATION':
      return { ...state, mode: 'clarification' }

    case 'EXIT_CLARIFICATION':
      return { ...state, mode: 'guided' }

    case 'COMPLETE_COURSE':
      return { ...state, isComplete: true }

    case 'RESET':
      return initialState

    default:
      return state
  }
}

const initialState: LessonChatState = {
  mode: 'guided',
  currentSectionIndex: 0,
  currentStepIndex: 0,
  messages: [],
  isStreaming: false,
  isComplete: false,
}

export function useLessonChat(courseContent: CourseContent | undefined) {
  const [state, dispatch] = useReducer(lessonChatReducer, initialState)

  const totalSections = courseContent?.sections.length ?? 0
  const currentSection = courseContent?.sections[state.currentSectionIndex]
  const currentStepKind = STEP_SEQUENCE[state.currentStepIndex]
  const isLastStepInSection = state.currentStepIndex >= STEP_SEQUENCE.length - 1
  const isLastSection = state.currentSectionIndex >= totalSections - 1

  const startStreaming = useCallback(() => {
    dispatch({ type: 'START_STREAMING' })
  }, [])

  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    dispatch({
      type: 'ADD_MESSAGE',
      message: {
        ...message,
        id: generateId(),
        timestamp: new Date(),
      },
    })
  }, [])

  const updateStreamingMessage = useCallback((content: string) => {
    dispatch({ type: 'UPDATE_STREAMING_MESSAGE', content })
  }, [])

  const finishStreaming = useCallback(() => {
    dispatch({ type: 'FINISH_STREAMING' })
  }, [])

  const advanceStep = useCallback(() => {
    if (isLastStepInSection) {
      if (isLastSection) {
        dispatch({ type: 'COMPLETE_COURSE' })
      } else {
        dispatch({ type: 'NEXT_SECTION' })
      }
    } else {
      dispatch({ type: 'ADVANCE_STEP' })
    }
  }, [isLastStepInSection, isLastSection])

  const enterClarification = useCallback(() => {
    dispatch({ type: 'ENTER_CLARIFICATION' })
  }, [])

  const exitClarification = useCallback(() => {
    dispatch({ type: 'EXIT_CLARIFICATION' })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  // Memoize actions object to prevent unnecessary re-renders
  const actions = useMemo(
    () => ({
      startStreaming,
      addMessage,
      updateStreamingMessage,
      finishStreaming,
      advanceStep,
      enterClarification,
      exitClarification,
      reset,
    }),
    [
      startStreaming,
      addMessage,
      updateStreamingMessage,
      finishStreaming,
      advanceStep,
      enterClarification,
      exitClarification,
      reset,
    ]
  )

  return {
    state,
    currentSection,
    currentStepKind,
    isLastStepInSection,
    isLastSection,
    totalSections,
    stepsPerSection: STEP_SEQUENCE.length,
    actions,
  }
}
