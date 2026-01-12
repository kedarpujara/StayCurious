'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

interface UseDeepgramReturn {
  isConnected: boolean
  isConnecting: boolean
  isListening: boolean
  transcript: string
  interimTranscript: string
  error: Error | null
  startListening: () => Promise<void>
  stopListening: () => void
  reset: () => void
}

export function useDeepgram(): UseDeepgramReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<Error | null>(null)

  const socketRef = useRef<WebSocket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const cleanup = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (socketRef.current) {
      socketRef.current.close()
      socketRef.current = null
    }
    setIsConnected(false)
    setIsListening(false)
  }, [])

  const startListening = useCallback(async () => {
    try {
      setError(null)
      setIsConnecting(true)

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
      streamRef.current = stream

      // Get Deepgram token from our API
      const tokenResponse = await fetch('/api/voice/token')
      if (!tokenResponse.ok) {
        throw new Error('Failed to get voice token')
      }
      const { token } = await tokenResponse.json()

      // Connect to Deepgram with webm/opus encoding (what MediaRecorder outputs)
      const socket = new WebSocket(
        `wss://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&interim_results=true&punctuate=true`,
        ['token', token]
      )
      socketRef.current = socket

      socket.onopen = () => {
        setIsConnecting(false)
        setIsConnected(true)
        setIsListening(true)

        // Start sending audio data - use webm/opus which Deepgram auto-detects
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm'
        const mediaRecorder = new MediaRecorder(stream, { mimeType })
        mediaRecorderRef.current = mediaRecorder

        mediaRecorder.ondataavailable = async (event) => {
          if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            socket.send(event.data)
          }
        }

        mediaRecorder.start(100) // Send data every 100ms for better responsiveness
      }

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.type === 'Results' && data.channel?.alternatives?.[0]) {
          const text = data.channel.alternatives[0].transcript
          if (data.is_final) {
            setTranscript((prev) => (prev ? prev + ' ' + text : text).trim())
            setInterimTranscript('')
          } else {
            setInterimTranscript(text)
          }
        }
      }

      socket.onerror = (event) => {
        console.error('WebSocket error:', event)
        setError(new Error('Voice connection error'))
        cleanup()
      }

      socket.onclose = () => {
        setIsConnected(false)
        setIsListening(false)
      }
    } catch (err) {
      console.error('Failed to start listening:', err)
      setError(err instanceof Error ? err : new Error('Failed to start listening'))
      setIsConnecting(false)
      cleanup()
    }
  }, [cleanup])

  const stopListening = useCallback(() => {
    setIsListening(false)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.close()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
    }
  }, [])

  const reset = useCallback(() => {
    cleanup()
    setTranscript('')
    setInterimTranscript('')
    setError(null)
  }, [cleanup])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  return {
    isConnected,
    isConnecting,
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    reset,
  }
}
