import { useState, useRef, useEffect, useCallback, type FormEvent, type KeyboardEvent } from 'react'
import { useSettingsStore } from '../../stores/settingsStore'
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition'
import { apiGet } from '../../api/client'
import './ChatInput.css'

interface SlashCommand {
  cmd: string
  desc: string
  type: string
}

interface ChatInputProps {
  onSend: (text: string) => void
  onUpload: (file: File) => void
  sending: boolean
}

export function ChatInput({ onSend, onUpload, sending }: ChatInputProps) {
  const [text, setText] = useState('')
  const textRef = useRef(text)
  textRef.current = text
  const [slashCommands, setSlashCommands] = useState<SlashCommand[]>([])
  const [showSlash, setShowSlash] = useState(false)
  const [slashIndex, setSlashIndex] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const quickfirePills = useSettingsStore(s => s.quickfirePills)
  const { isListening, isSupported, transcript, error: micError, start, stop } = useSpeechRecognition()
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fetch slash commands once
  useEffect(() => {
    apiGet<{ slash_commands: SlashCommand[] }>('/api/shortcuts')
      .then(data => setSlashCommands(data.slash_commands || []))
      .catch(() => {})
  }, [])

  // Auto-focus the textarea on mount and whenever the user returns to the tab
  // (tab switch, window re-focus). This is EVENT-DRIVEN, not a polling/interval
  // re-apply — it fires once per real user-intent event (mount, focus,
  // visibilitychange→visible), so the cursor lands in the input without
  // hijacking focus while the user is reading history or filling another field.
  useEffect(() => {
    // Focus on initial mount.
    textareaRef.current?.focus()

    const refocusOnReturn = () => {
      // Only steal focus back if nothing else is focused (e.g. user is not
      // mid-interaction with a button/link). document.body / null means the
      // page itself has focus → safe to land the cursor in the message box.
      const active = document.activeElement
      const nothingFocused = !active || active === document.body
      if (document.visibilityState === 'visible' && nothingFocused) {
        textareaRef.current?.focus()
      }
    }

    document.addEventListener('visibilitychange', refocusOnReturn)
    window.addEventListener('focus', refocusOnReturn)
    return () => {
      document.removeEventListener('visibilitychange', refocusOnReturn)
      window.removeEventListener('focus', refocusOnReturn)
    }
  }, [])

  // Restore focus to the input after a send completes (sending: true → false).
  // We deliberately keep the textarea ENABLED while sending (see render) so the
  // cursor never leaves; this is a belt-and-braces re-focus for the case where
  // a quickfire pill or programmatic send moved focus elsewhere.
  const wasSending = useRef(sending)
  useEffect(() => {
    if (wasSending.current && !sending) {
      textareaRef.current?.focus()
    }
    wasSending.current = sending
  }, [sending])

  // Sync speech transcript into text field — always, even after stop
  useEffect(() => {
    if (transcript) {
      setText(transcript)
    }
  }, [transcript])

  // Recording timer
  useEffect(() => {
    if (isListening) {
      setRecordingSeconds(0)
      timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isListening])

  const filteredCommands = text.startsWith('/')
    ? slashCommands.filter(c => c.cmd.toLowerCase().startsWith(text.toLowerCase()))
    : []

  useEffect(() => {
    setShowSlash(text.startsWith('/') && filteredCommands.length > 0)
    setSlashIndex(0)
  }, [text, filteredCommands.length])

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || sending) return
    onSend(trimmed)
    setText('')
    setShowSlash(false)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const selectSlashCommand = (cmd: string) => {
    setText(cmd + ' ')
    setShowSlash(false)
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSlash) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSlashIndex(i => Math.min(i + 1, filteredCommands.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSlashIndex(i => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault()
        if (filteredCommands[slashIndex]) {
          selectSlashCommand(filteredCommands[slashIndex].cmd)
        }
        return
      }
      if (e.key === 'Escape') {
        setShowSlash(false)
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleInput = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 150) + 'px'
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onUpload(file)
      e.target.value = ''
    }
  }

  const formatTime = useCallback((secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }, [])

  const toggleMic = () => {
    if (isListening) {
      stop()
      // Text is already synced via transcript effect — user can review and send
    } else {
      setText('')
      start()
    }
  }

  const stopAndSend = () => {
    stop()
    // Small delay to let final transcript sync, use ref for latest text
    setTimeout(() => {
      const trimmed = textRef.current.trim()
      if (trimmed) {
        onSend(trimmed)
        setText('')
      }
    }, 300)
  }

  const cancelRecording = () => {
    stop()
    setText('')
  }

  // Paste handler — images from clipboard
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault()
        const file = items[i].getAsFile()
        if (file) onUpload(file)
        return
      }
    }
  }, [onUpload])

  // Drag-and-drop handlers
  const [dragOver, setDragOver] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    const files = e.dataTransfer?.files
    if (files && files.length > 0) {
      onUpload(files[0])
    }
  }, [onUpload])

  return (
    <div
      className={`chat-input-container ${dragOver ? 'chat-input-dragover' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {micError && (
        <div className="chat-mic-error" role="status">{micError}</div>
      )}
      {quickfirePills.length > 0 && (
        <div className="chat-pills">
          {quickfirePills.map((pill) => (
            <button
              key={pill}
              className="chat-pill"
              onClick={() => onSend(pill)}
              disabled={sending}
            >
              {pill}
            </button>
          ))}
        </div>
      )}
      <form className="chat-input-form" onSubmit={handleSubmit}>
        {isListening ? (
          /* Recording mode — Telegram-style bar */
          <div className="chat-recording-bar">
            <button
              type="button"
              className="chat-recording-cancel"
              onClick={cancelRecording}
              title="Cancel recording"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <div className="chat-recording-indicator">
              <span className="chat-recording-dot" />
              <span className="chat-recording-time">{formatTime(recordingSeconds)}</span>
            </div>
            <div className="chat-recording-transcript">
              {transcript || 'Listening...'}
            </div>
            <button
              type="button"
              className="chat-recording-stop"
              onClick={toggleMic}
              title="Stop recording (review before sending)"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <rect x="6" y="6" width="12" height="12" rx="2"/>
              </svg>
            </button>
            <button
              type="button"
              className="chat-recording-send"
              onClick={stopAndSend}
              title="Stop and send"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        ) : (
          /* Normal input mode */
          <>
            <button
              type="button"
              className="chat-upload-btn"
              onClick={() => fileRef.current?.click()}
              title="Attach file"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>
            <input
              type="file"
              ref={fileRef}
              className="sr-only"
              onChange={handleFileChange}
            />
            <div className="chat-textarea-wrap">
              {showSlash && (
                <div className="slash-dropdown">
                  {filteredCommands.map((cmd, i) => (
                    <button
                      key={cmd.cmd}
                      type="button"
                      className={`slash-item ${i === slashIndex ? 'slash-item-active' : ''}`}
                      onClick={() => selectSlashCommand(cmd.cmd)}
                      onMouseEnter={() => setSlashIndex(i)}
                    >
                      <span className="slash-cmd">{cmd.cmd}</span>
                      <span className="slash-desc">{cmd.desc}</span>
                    </button>
                  ))}
                </div>
              )}
              <textarea
                ref={textareaRef}
                className="chat-textarea"
                placeholder="Type a message... (/ for commands)"
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                onInput={handleInput}
                onPaste={handlePaste}
                rows={1}
                /* Native spell-check + suggestions. spellCheck enables the red
                   underline AND the browser's right-click correction menu. We do
                   NOT intercept onContextMenu, so the native suggestion list shows. */
                spellCheck={true}
                autoCorrect="on"
                autoCapitalize="sentences"
                /* Keep the textarea ENABLED while sending so it never loses
                   focus / the cursor (a `disabled` textarea blurs and the cursor
                   jumps out). handleSubmit already guards on `sending`, so the
                   user can keep typing the next message without interruption. */
                aria-busy={sending}
              />
            </div>
            {isSupported && (
              <button
                type="button"
                className={`chat-mic-btn ${isListening ? 'chat-mic-active' : ''}`}
                onClick={toggleMic}
                title="Voice input"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              </button>
            )}
            <button
              type="submit"
              className="chat-send-btn"
              disabled={!text.trim() || sending}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </>
        )}
      </form>
    </div>
  )
}
