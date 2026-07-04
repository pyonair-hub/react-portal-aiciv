import { useState, useRef, useCallback } from 'react'

interface SpeechRecognitionHook {
  isListening: boolean
  isTranscribing: boolean
  isSupported: boolean
  transcript: string        // live, growing transcript (final + interim) — updates AS YOU SPEAK
  error: string | null
  start: () => void
  stop: () => void
}

/**
 * LIVE-STREAMING speech recognition — ported from the team-chat.html mic that
 * Jord validated (2026-06-18). The OLD React mic was record-then-transcribe:
 * it stayed silent during speech, dumped the words only after Stop, and the
 * UI double-sent / left text stuck in the box. THIS version streams raw 16k
 * PCM to Deepgram over a browser WebSocket with interim_results=true, so the
 * `transcript` updates word-by-word live, and the caller sends ONCE on stop.
 *
 * Flow: tap mic -> getUserMedia -> fetch /api/deepgram-token -> open
 * wss://api.deepgram.com -> stream PCM -> transcript grows live -> stop ->
 * caller sends the final transcript exactly once.
 */
const TARGET_SAMPLE_RATE = 16000

function resampleTo16k(input: Float32Array, fromRate: number): Int16Array {
  if (fromRate === TARGET_SAMPLE_RATE) {
    const buf = new Int16Array(input.length)
    for (let i = 0; i < input.length; i++) {
      buf[i] = Math.max(-32768, Math.min(32767, Math.round(input[i] * 32767)))
    }
    return buf
  }
  const ratio = fromRate / TARGET_SAMPLE_RATE
  const newLength = Math.round(input.length / ratio)
  const buf = new Int16Array(newLength)
  for (let i = 0; i < newLength; i++) {
    const srcIdx = i * ratio
    const idx = Math.floor(srcIdx)
    const frac = srcIdx - idx
    const s0 = input[idx] || 0
    const s1 = input[idx + 1] || s0
    const sample = s0 + frac * (s1 - s0)
    buf[i] = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)))
  }
  return buf
}

export function useSpeechRecognition(): SpeechRecognitionHook {
  const [isListening, setIsListening] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const finalRef = useRef('')   // accumulated FINAL segments (source of truth)

  const isSupported = typeof navigator !== 'undefined'
    && !!navigator.mediaDevices?.getUserMedia
    && typeof WebSocket !== 'undefined'

  const teardown = useCallback(() => {
    try { processorRef.current?.disconnect() } catch { /* noop */ }
    try { sourceRef.current?.disconnect() } catch { /* noop */ }
    try { void audioCtxRef.current?.close() } catch { /* noop */ }
    processorRef.current = null
    sourceRef.current = null
    audioCtxRef.current = null
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  const start = useCallback(async () => {
    setError(null)
    setTranscript('')
    finalRef.current = ''

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })
    } catch {
      setError('Microphone access was blocked. Allow mic permission and retry.')
      return
    }
    streamRef.current = stream

    let dgKey = ''
    try {
      const resp = await fetch('/api/deepgram-token')
      const data = await resp.json()
      dgKey = data.key || ''
      if (!dgKey) throw new Error('no key')
    } catch {
      teardown()
      setError('Voice transcription is unavailable right now.')
      return
    }

    setIsListening(true)
    setIsTranscribing(true)

    const url = `wss://api.deepgram.com/v1/listen?model=nova-3&language=en`
      + `&smart_format=true&interim_results=true&utterance_end_ms=1500`
      + `&encoding=linear16&sample_rate=${TARGET_SAMPLE_RATE}&channels=1`
    const socket = new WebSocket(url, ['token', dgKey])
    socketRef.current = socket

    socket.onopen = () => {
      const Ctx = window.AudioContext
        || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new Ctx()
      // Mobile (Samsung Internet / Chrome Android) starts the AudioContext
      // SUSPENDED under the autoplay policy → onaudioprocess never fires → no
      // audio streamed → no transcript ("mic looks dead / same as old"). Resume
      // it; this runs inside the mic-tap gesture chain so it's allowed.
      if (ctx.state === 'suspended') { void ctx.resume() }
      const nativeRate = ctx.sampleRate
      const source = ctx.createMediaStreamSource(stream)
      const processor = ctx.createScriptProcessor(4096, 1, 1)
      source.connect(processor)
      processor.connect(ctx.destination)
      processor.onaudioprocess = (e) => {
        if (socket.readyState === WebSocket.OPEN) {
          const input = e.inputBuffer.getChannelData(0)
          socket.send(resampleTo16k(input, nativeRate).buffer)
        }
      }
      audioCtxRef.current = ctx
      sourceRef.current = source
      processorRef.current = processor
    }

    socket.onmessage = (e) => {
      try {
        const result = JSON.parse(e.data)
        const t: string = result.channel?.alternatives?.[0]?.transcript || ''
        if (!t) return
        if (result.is_final) {
          finalRef.current += (finalRef.current ? ' ' : '') + t
          setTranscript(finalRef.current)
        } else {
          // interim: show live, appended to whatever is already final
          setTranscript(finalRef.current + (finalRef.current ? ' ' : '') + t)
        }
      } catch { /* noop */ }
    }

    socket.onclose = (ev) => {
      setIsListening(false)
      setIsTranscribing(false)
      // 1008 = bad key (policy), 1006 = abnormal/connection failed
      if (ev.code === 1008 || ev.code === 1006) {
        setError('Voice transcription is unavailable right now.')
      }
      teardown()
    }

    socket.onerror = () => {
      setError('Voice transcription failed. Check your connection.')
      setIsListening(false)
      setIsTranscribing(false)
      teardown()
    }
  }, [teardown])

  const stop = useCallback(() => {
    const socket = socketRef.current
    if (socket && socket.readyState === WebSocket.OPEN) {
      try { socket.send(JSON.stringify({ type: 'CloseStream' })) } catch { /* noop */ }
      try { socket.close() } catch { /* noop */ }
    }
    socketRef.current = null
    setIsListening(false)
    setIsTranscribing(false)
    teardown()
  }, [teardown])

  return { isListening, isTranscribing, isSupported, transcript, error, start, stop }
}
