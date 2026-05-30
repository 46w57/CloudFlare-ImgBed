import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { useChatStore } from '@/hooks/useChatStore'
import { sendMessage } from '@/services/api'
import ModelSelector from '@/components/ModelSelector'
import MessageBubble from '@/components/MessageBubble'
import { Send, Trash2, Loader2 } from 'lucide-react'

export default function ChatPage() {
  const messages = useChatStore(s => s.messages)
  const isLoading = useChatStore(s => s.isLoading)
  const isStreaming = useChatStore(s => s.isStreaming)
  const streamingContent = useChatStore(s => s.streamingContent)
  const currentModel = useChatStore(s => s.currentModel)
  const clearMessages = useChatStore(s => s.clearMessages)
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    if (trimmed.startsWith('/model ')) {
      const model = trimmed.slice(7).trim()
      useChatStore.getState().setCurrentModel(model)
      setInput('')
      return
    }

    if (trimmed === '/clear') {
      clearMessages()
      setInput('')
      return
    }

    if (trimmed === '/models') {
      const models = useChatStore.getState().models
      const modelList = models
        .filter(m => m.configured)
        .map(m => `  ${m.id}`)
        .join('\n')
      useChatStore.getState().addMessage({
        role: 'assistant',
        content: `Available models:\n${modelList || '  No models configured. Go to Config page first.'}`,
        model: 'system'
      })
      setInput('')
      return
    }

    sendMessage(trimmed)
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (value: string) => {
    setInput(value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
    }
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-bg-secondary/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <ModelSelector />
        </div>
        <button
          onClick={clearMessages}
          className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-all"
          title="Clear chat"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-6 animate-pulse-glow">
              <span className="text-3xl">⚡</span>
            </div>
            <h2 className="text-2xl font-bold mb-2 glow-text font-mono">Zero Token Gateway</h2>
            <p className="text-text-secondary max-w-md">
              Use AI models without API tokens. Select a model above and start chatting.
            </p>
            <div className="mt-6 text-sm text-text-muted font-mono space-y-1">
              <p>/model &lt;provider/model&gt; — Switch model</p>
              <p>/models — List available models</p>
              <p>/clear — Clear chat</p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isStreaming && streamingContent && (
          <MessageBubble
            message={{
              id: 'streaming',
              role: 'assistant',
              content: streamingContent,
              model: currentModel,
              timestamp: Date.now()
            }}
            isStreaming
          />
        )}

        {isLoading && !streamingContent && (
          <div className="flex items-center gap-2 px-4 py-3 animate-fade-in">
            <Loader2 className="w-4 h-4 text-accent animate-spin" />
            <span className="text-text-secondary text-sm">Thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="px-4 py-3 border-t border-border bg-bg-secondary/50 backdrop-blur-sm">
        <div className="flex items-end gap-3 max-w-4xl mx-auto">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${currentModel}...`}
            rows={1}
            className="flex-1 bg-bg-tertiary border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder-text-muted resize-none focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all font-sans"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-3 rounded-xl bg-accent text-bg-primary hover:bg-accent-dim disabled:opacity-30 disabled:cursor-not-allowed transition-all glow-button shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
