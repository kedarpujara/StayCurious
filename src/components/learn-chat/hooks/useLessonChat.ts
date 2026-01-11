import { useReducer, useCallback, useMemo } from 'react'
import type { ChatMode, CourseContent } from '@/types'

export interface ChatMessage {
  id: string
  role: 'assistant' | 'user'
  content: string
  type: 'lesson' | 'clarification' | 'example' | 'action'
  timestamp: Date
}

export interface LessonChatState {
  mode: ChatMode
  currentSectionIndex: number
  messages: ChatMessage[]
  isStreaming: boolean
  isComplete: boolean
  exampleVisible: boolean // Track if example is currently shown
  exampleLoaded: boolean // Track if example has been loaded for this section
}

type LessonChatActionType =
  | { type: 'START_STREAMING' }
  | { type: 'ADD_MESSAGE'; message: ChatMessage }
  | { type: 'UPDATE_STREAMING_MESSAGE'; content: string }
  | { type: 'FINISH_STREAMING' }
  | { type: 'NEXT_SECTION' }
  | { type: 'ENTER_CLARIFICATION' }
  | { type: 'EXIT_CLARIFICATION' }
  | { type: 'COMPLETE_COURSE' }
  | { type: 'SHOW_EXAMPLE' }
  | { type: 'HIDE_EXAMPLE' }
  | { type: 'MARK_EXAMPLE_LOADED' }
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

    case 'NEXT_SECTION':
      return {
        ...state,
        currentSectionIndex: state.currentSectionIndex + 1,
        mode: 'guided',
        exampleVisible: false,
        exampleLoaded: false,
      }

    case 'ENTER_CLARIFICATION':
      return { ...state, mode: 'clarification' }

    case 'EXIT_CLARIFICATION':
      return { ...state, mode: 'guided' }

    case 'COMPLETE_COURSE':
      return { ...state, isComplete: true }

    case 'SHOW_EXAMPLE':
      return { ...state, exampleVisible: true }

    case 'HIDE_EXAMPLE':
      return { ...state, exampleVisible: false }

    case 'MARK_EXAMPLE_LOADED':
      return { ...state, exampleLoaded: true }

    case 'RESET':
      return initialState

    default:
      return state
  }
}

function getInitialState(initialSectionIndex: number = 0): LessonChatState {
  return {
    mode: 'guided',
    currentSectionIndex: initialSectionIndex,
    messages: [],
    isStreaming: false,
    isComplete: false,
    exampleVisible: false,
    exampleLoaded: false,
  }
}

const initialState = getInitialState()

export function useLessonChat(courseContent: CourseContent | undefined, initialSectionIndex: number = 0) {
  const [state, dispatch] = useReducer(lessonChatReducer, getInitialState(initialSectionIndex))

  const totalSections = courseContent?.sections.length ?? 0
  const currentSection = courseContent?.sections[state.currentSectionIndex]
  const isLastSection = state.currentSectionIndex >= totalSections - 1
  // Check if current section has a pre-stored example
  const hasStoredExample = !!currentSection?.example

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

  const nextSection = useCallback(() => {
    dispatch({ type: 'NEXT_SECTION' })
  }, [])

  const enterClarification = useCallback(() => {
    dispatch({ type: 'ENTER_CLARIFICATION' })
  }, [])

  const exitClarification = useCallback(() => {
    dispatch({ type: 'EXIT_CLARIFICATION' })
  }, [])

  const showExample = useCallback(() => {
    dispatch({ type: 'SHOW_EXAMPLE' })
  }, [])

  const hideExample = useCallback(() => {
    dispatch({ type: 'HIDE_EXAMPLE' })
  }, [])

  const markExampleLoaded = useCallback(() => {
    dispatch({ type: 'MARK_EXAMPLE_LOADED' })
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
      nextSection,
      enterClarification,
      exitClarification,
      showExample,
      hideExample,
      markExampleLoaded,
      reset,
    }),
    [
      startStreaming,
      addMessage,
      updateStreamingMessage,
      finishStreaming,
      nextSection,
      enterClarification,
      exitClarification,
      showExample,
      hideExample,
      markExampleLoaded,
      reset,
    ]
  )

  return {
    state,
    currentSection,
    isLastSection,
    totalSections,
    hasStoredExample,
    actions,
  }
}
