import { create } from 'zustand'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  model?: string
  timestamp: number
  toolDisplay?: string
}

interface ModelInfo {
  id: string
  provider: string
  name: string
  contextWindow: number
  maxTokens: number
  reasoning: boolean
  configured: boolean
}

interface ProviderInfo {
  id: string
  name: string
  models: Array<{
    id: string
    name: string
    contextWindow: number
    maxTokens: number
    reasoning: boolean
  }>
  status: string
  configured: boolean
  credentialInfo: {
    provider: string
    updatedAt: number
    hasCookie: boolean
    hasBearer: boolean
  } | null
}

interface ChatState {
  messages: Message[]
  currentModel: string
  models: ModelInfo[]
  providers: ProviderInfo[]
  isLoading: boolean
  isStreaming: boolean
  streamingContent: string

  setCurrentModel: (model: string) => void
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void
  updateLastMessage: (content: string) => void
  appendToLastMessage: (content: string) => void
  clearMessages: () => void
  setLoading: (loading: boolean) => void
  setStreaming: (streaming: boolean) => void
  setStreamingContent: (content: string) => void
  appendStreamingContent: (content: string) => void
  finalizeStreaming: () => void
  fetchModels: () => Promise<void>
  fetchProviders: () => Promise<void>
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  currentModel: 'deepseek-web/deepseek-v4-pro',
  models: [],
  providers: [],
  isLoading: false,
  isStreaming: false,
  streamingContent: '',

  setCurrentModel: (model) => set({ currentModel: model }),

  addMessage: (message) => {
    const msg: Message = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now()
    }
    set((state) => ({ messages: [...state.messages, msg] }))
  },

  updateLastMessage: (content) => {
    set((state) => ({
      messages: state.messages.map((msg, i) =>
        i === state.messages.length - 1 ? { ...msg, content } : msg
      )
    }))
  },

  appendToLastMessage: (content) => {
    set((state) => ({
      messages: state.messages.map((msg, i) =>
        i === state.messages.length - 1 ? { ...msg, content: msg.content + content } : msg
      )
    }))
  },

  clearMessages: () => set({ messages: [] }),

  setLoading: (loading) => set({ isLoading: loading }),

  setStreaming: (streaming) => set({ isStreaming: streaming }),

  setStreamingContent: (content) => set({ streamingContent: content }),

  appendStreamingContent: (content) => {
    set((state) => ({ streamingContent: state.streamingContent + content }))
  },

  finalizeStreaming: () => {
    const { streamingContent, currentModel } = get()
    if (streamingContent) {
      get().addMessage({
        role: 'assistant',
        content: streamingContent,
        model: currentModel
      })
    }
    set({ streamingContent: '', isStreaming: false })
  },

  fetchModels: async () => {
    try {
      const res = await fetch('/v1/models')
      const data = await res.json()
      set({ models: data.data || [] })
    } catch (err) {
      console.error('Failed to fetch models:', err)
    }
  },

  fetchProviders: async () => {
    try {
      const res = await fetch('/api/auth/providers')
      const data = await res.json()
      set({ providers: data.providers || [] })
    } catch (err) {
      console.error('Failed to fetch providers:', err)
    }
  }
}))
