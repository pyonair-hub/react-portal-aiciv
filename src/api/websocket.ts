import { AUTH_TOKEN_KEY } from '../utils/constants'
import type { ChatMessage } from '../types/chat'

type MessageHandler = (msg: ChatMessage) => void
type OpenHandler = (wasReconnect: boolean) => void

export class ChatWebSocket {
  private ws: WebSocket | null = null
  private handlers: Set<MessageHandler> = new Set()
  private openHandlers: Set<OpenHandler> = new Set()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay = 1000
  private maxReconnectDelay = 30000
  private _connected = false
  // True once we have connected at least once — any later open is a reconnect
  // and means we may have missed live messages while the socket was down.
  private hasConnectedBefore = false

  get connected(): boolean {
    return this._connected
  }

  connect(): void {
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    if (!token) return

    // Guard against stacking sockets: tear down any existing one first.
    if (this.ws) {
      try {
        this.ws.onopen = null
        this.ws.onmessage = null
        this.ws.onclose = null
        this.ws.onerror = null
        this.ws.close()
      } catch {
        // ignore
      }
      this.ws = null
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${proto}//${window.location.host}/ws/chat?token=${token}`

    try {
      this.ws = new WebSocket(url)
    } catch {
      this.scheduleReconnect()
      return
    }

    this.ws.onopen = () => {
      this._connected = true
      this.reconnectDelay = 1000
      const wasReconnect = this.hasConnectedBefore
      this.hasConnectedBefore = true
      // On a reconnect, messages may have been pushed while we were offline.
      // Tell listeners so they can re-sync history (fixes "prompts stop
      // showing up until you refresh the page").
      this.openHandlers.forEach(h => h(wasReconnect))
    }

    this.ws.onmessage = (event) => {
      try {
        const msg: ChatMessage = JSON.parse(event.data)
        this.handlers.forEach(h => h(msg))
      } catch {
        // ignore malformed messages
      }
    }

    this.ws.onclose = (event) => {
      this._connected = false
      if (event.code !== 4401) {
        this.scheduleReconnect()
      }
    }

    this.ws.onerror = () => {
      this.ws?.close()
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.ws?.close()
    this.ws = null
    this._connected = false
    this.hasConnectedBefore = false
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  onOpen(handler: OpenHandler): () => void {
    this.openHandlers.add(handler)
    return () => this.openHandlers.delete(handler)
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay)
      this.connect()
    }, this.reconnectDelay)
  }
}

export const chatWs = new ChatWebSocket()
