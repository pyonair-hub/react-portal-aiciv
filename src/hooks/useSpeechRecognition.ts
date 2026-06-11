import { useState, useRef, useCallback } from 'react'
import { getAuthToken } from '../api/client'

interface SpeechRecognitionHook {
  isListening: boolean
  isSupported: boolean
  transcript: string
  error: string | null
  start: () => void
  stop: () => void
}

/**
 * Speech recognition hook — records audio via MediaRecorder,
 * sends to server for Deepgram Nova-2 transcription.
 * Works on all modern browsers (Chrome, Edge, Safari, Firefox).
 */
export function useSpeechRecognition(): SpeechRecognitionHook {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  // MediaRecorder is supported in all modern browsers
  const isSupported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

  const transcribe = useCallback(async (blob: Blob) => {
    try {
      const token = getAuthToken()
      const res = await fetch(`/api/voice/transcribe?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': blob.type || 'audio/webm' },
        body: blob,
      })
      if (!res.ok) {
        // Surface backend failures (e.g. DEEPGRAM_API_KEY not configured on
        // this container) instead of failing silently, so a broken mic is
        // diagnosable rather than looking like the button does nothing.
        setError('Voice transcription is unavailable right now.')
        return
      }
      const data = await res.json()
      if (data.transcript) {
        setTranscript(data.transcript)
      } else if (data.error) {
        setError('Voice transcription is unavailable right now.')
      }
    } catch {
      setError('Voice transcription failed. Check your connection.')
    }
  }, [])

  const start = useCallback(async () => {
    chunksRef.current = []
    setTranscript('')
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Prefer webm (Chrome/Edge/Firefox), fall back to mp4 (Safari)
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : ''

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
        if (blob.size > 0) {
          transcribe(blob)
        }
        // Release mic
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }

      mediaRecorderRef.current = recorder
      recorder.start(1000) // collect chunks every second
      setIsListening(true)
    } catch {
      setIsListening(false)
      setError('Microphone access was blocked. Allow mic permission and retry.')
    }
  }, [transcribe])

  const stop = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    mediaRecorderRef.current = null
    setIsListening(false)
  }, [])

  return { isListening, isSupported, transcript, error, start, stop }
}
