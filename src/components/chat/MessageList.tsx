import { useEffect, useRef, useState, useCallback } from 'react'
import { MessageBubble } from './MessageBubble'
import type { ChatMessage } from '../../types/chat'
import './MessageList.css'

interface MessageListProps {
  messages: ChatMessage[]
  onReact: (msgId: string, emoji: string, text: string, role: 'user' | 'assistant') => void
  highlightIds?: Set<string>
  onPreviewArtifact?: (content: string, language: string) => void
}

export function MessageList({ messages, onReact, highlightIds, onPreviewArtifact }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef(true)
  const didInitialScroll = useRef(false)
  // "Jump to latest" button visibility — shown ONLY when scrolled up away from
  // the bottom (standard chat UX). Jord: "it starts so high… need a down button".
  const [showJump, setShowJump] = useState(false)

  const scrollToBottom = useCallback((smooth = false) => {
    const el = containerRef.current
    if (!el) return
    // Scroll the message container itself (not scrollIntoView, which can scroll
    // ancestor/page elements and steal the input's focus on mobile).
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
    autoScrollRef.current = true
    setShowJump(false)
    // BUG (2026-06-20 mobile QA): after a SMOOTH jump-to-latest, onScroll fires
    // mid-animation and re-sets showJump(true) because the list is momentarily
    // far from the bottom; on iOS the final at-bottom scroll event can be
    // coalesced/missed, leaving the FAB stuck visible. Re-assert hidden once the
    // smooth scroll has settled at the bottom.
    if (smooth) {
      const settle = () => {
        const e = containerRef.current
        if (!e) return
        if (e.scrollHeight - e.scrollTop - e.clientHeight <= 60) setShowJump(false)
      }
      setTimeout(settle, 400)
      setTimeout(settle, 800)
    }
  }, [])

  // On NEW messages: if the user is pinned at the bottom, follow. Otherwise
  // leave them where they are but surface the jump button.
  useEffect(() => {
    if (autoScrollRef.current) {
      // rAF so layout (bubbles/markdown) settles before we measure scrollHeight.
      requestAnimationFrame(() => scrollToBottom(false))
    } else {
      setShowJump(true)
    }
  }, [messages, scrollToBottom])

  // On FIRST load of history, land at the BOTTOM (newest) — the fix for
  // "loads scrolled up / so high". Runs once when the first messages arrive;
  // double rAF + a short timeout so it sticks even after async content layout.
  useEffect(() => {
    if (didInitialScroll.current || messages.length === 0) return
    didInitialScroll.current = true
    requestAnimationFrame(() => requestAnimationFrame(() => scrollToBottom(false)))
    const t = setTimeout(() => scrollToBottom(false), 200)
    return () => clearTimeout(t)
  }, [messages.length, scrollToBottom])

  const handleScroll = () => {
    const el = containerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    // "pinned at bottom" stays generous (100px) so new messages still auto-
    // follow, but SHOW the jump FAB as soon as she's scrolled up a little
    // (>60px) so it's discoverable — Jord never noticed the old subtle one.
    autoScrollRef.current = distanceFromBottom < 100
    setShowJump(distanceFromBottom > 60)
  }

  return (
    <div className="msg-list-wrap">
      <div className="msg-list" ref={containerRef} onScroll={handleScroll} role="log" aria-live="polite" aria-label="Chat messages">
        <div className="msg-list-inner">
          {messages.map(msg => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onReact={(emoji) => onReact(msg.id, emoji, msg.text, msg.role)}
              highlight={highlightIds?.has(msg.id)}
              onPreviewArtifact={onPreviewArtifact}
            />
          ))}
        </div>
      </div>
      {showJump && (
        <button
          type="button"
          className="msg-jump-latest"
          onClick={() => scrollToBottom(true)}
          aria-label="Jump to latest message"
          title="Jump to latest"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}
    </div>
  )
}
