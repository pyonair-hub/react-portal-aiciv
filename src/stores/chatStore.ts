import { create } from 'zustand'
import { fetchChatHistory, sendChatMessage, sendReaction } from '../api/chat'
import { chatWs } from '../api/websocket'
import type { ChatMessage } from '../types/chat'

let wsCleanup: (() => void) | null = null
let wsOpenCleanup: (() => void) | null = null

// Merge a fresh history snapshot into the current message list without
// dropping optimistic local-* messages and without creating duplicates.
// Server messages win on id collisions. Local optimistic user messages are
// kept only if the server snapshot does not already contain an equivalent
// (same role + text) message.
function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>()
  for (const m of incoming) byId.set(m.id, m)

  // Keep any still-pending local optimistic messages not yet echoed by server.
  for (const m of current) {
    if (!m.id.startsWith('local-')) continue
    const echoed = incoming.some(s => s.role === m.role && s.text === m.text)
    if (!echoed) byId.set(m.id, m)
  }

  // Order by timestamp so a re-sync keeps chronological order; fall back to
  // insertion order for equal timestamps.
  return Array.from(byId.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
}

interface ChatState {
  messages: ChatMessage[]
  loading: boolean
  sending: boolean
  wsConnected: boolean
  error: string | null
  loadHistory: () => Promise<void>
  resync: () => Promise<void>
  send: (text: string) => Promise<void>
  react: (msgId: string, emoji: string, msgText: string, msgRole: 'user' | 'assistant') => Promise<void>
  connectWs: () => void
  disconnectWs: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  loading: false,
  sending: false,
  wsConnected: false,
  error: null,

  loadHistory: async () => {
    set({ loading: true, error: null })
    try {
      const data = await fetchChatHistory(200)
      const msgs = data.messages || []
      set({ messages: msgs, loading: false })
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : 'Failed to load chat' })
    }
  },

  // Non-destructive re-fetch used after a WS reconnect or tab re-focus.
  // Recovers any assistant replies that were pushed while the socket was down,
  // WITHOUT clearing the screen or showing the loading spinner. This is the
  // core fix for "new prompts stop showing up until you refresh the page".
  resync: async () => {
    try {
      const data = await fetchChatHistory(200)
      const msgs = data.messages || []
      set(s => ({ messages: mergeMessages(s.messages, msgs) }))
    } catch (e) {
      console.error('[chat] resync failed:', e)
    }
  },

  send: async (text: string) => {
    set({ sending: true })
    try {
      await sendChatMessage(text)
      const userMsg: ChatMessage = {
        id: `local-${Date.now()}`,
        text,
        role: 'user',
        timestamp: Date.now() / 1000,
      }
      set(s => ({ messages: [...s.messages, userMsg], sending: false }))
    } catch (e) {
      console.error('[chat] send failed:', e)
      set({ sending: false })
    }
  },

  react: async (msgId: string, emoji: string, msgText: string, msgRole: 'user' | 'assistant') => {
    try {
      await sendReaction({
        msg_id: msgId,
        emoji,
        action: 'add',
        msg_preview: msgText.slice(0, 200),
        msg_role: msgRole,
      })
    } catch (e) {
      console.error('[chat] reaction failed:', e)
    }
  },

  connectWs: () => {
    if (wsCleanup) {
      wsCleanup()
      wsCleanup = null
    }
    if (wsOpenCleanup) {
      wsOpenCleanup()
      wsOpenCleanup = null
    }

    // When the socket (re)opens after having been connected before, we may
    // have missed live pushes. Re-sync history non-destructively to recover
    // them — this is what previously required a manual page refresh.
    wsOpenCleanup = chatWs.onOpen((wasReconnect) => {
      if (wasReconnect) {
        void useChatStore.getState().resync()
      }
    })

    chatWs.connect()
    set({ wsConnected: true })

    wsCleanup = chatWs.onMessage((msg) => {
      set((s) => {
        // Check if message already exists by ID
        const idx = s.messages.findIndex(m => m.id === msg.id)
        if (idx >= 0) {
          const updated = [...s.messages]
          updated[idx] = msg
          return { messages: updated }
        }

        // Check if this is a server echo of an optimistic local message:
        // same role + same text content → replace the local one
        if (msg.role === 'user') {
          const localIdx = s.messages.findIndex(
            m => m.id.startsWith('local-') && m.role === 'user' && m.text === msg.text
          )
          if (localIdx >= 0) {
            const updated = [...s.messages]
            updated[localIdx] = msg
            return { messages: updated }
          }
        }

        return { messages: [...s.messages, msg] }
      })
    })
  },

  disconnectWs: () => {
    if (wsCleanup) {
      wsCleanup()
      wsCleanup = null
    }
    if (wsOpenCleanup) {
      wsOpenCleanup()
      wsOpenCleanup = null
    }
    chatWs.disconnect()
    set({ wsConnected: false })
  },
}))
