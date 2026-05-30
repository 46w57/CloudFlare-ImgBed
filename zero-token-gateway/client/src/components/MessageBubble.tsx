import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Bot, User, Wrench, ChevronDown, ChevronRight, Brain } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  model?: string
  timestamp: number
  toolDisplay?: string
}

interface Props {
  message: Message
  isStreaming?: boolean
}

function extractThinkingAndContent(text: string): { thinking: string | null; content: string } {
  const thinkMatch = text.match(/^💭([\s\S]*?)<\/think>/)
  if (thinkMatch) {
    return {
      thinking: thinkMatch[1].trim(),
      content: text.slice(thinkMatch[0].length).trim()
    }
  }
  return { thinking: null, content: text }
}

export default function MessageBubble({ message, isStreaming }: Props) {
  const isUser = message.role === 'user'
  const isTool = message.role === 'tool'
  const [showThinking, setShowThinking] = useState(false)

  const { thinking, content } = extractThinkingAndContent(message.content)
  const hasThinking = !!thinking

  return (
    <div className={`flex gap-3 animate-fade-in ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
        isUser
          ? 'bg-accent/20'
          : isTool
            ? 'bg-warning/20'
            : 'bg-bg-tertiary border border-border'
      }`}>
        {isUser ? (
          <User className="w-4 h-4 text-accent" />
        ) : isTool ? (
          <Wrench className="w-4 h-4 text-warning" />
        ) : (
          <Bot className="w-4 h-4 text-text-secondary" />
        )}
      </div>

      <div className={`max-w-[75%] ${isUser ? 'text-right' : ''}`}>
        {!isUser && message.model && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono text-text-muted">
              {message.model}
            </span>
            {hasThinking && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent/10 text-accent">
                THINKING
              </span>
            )}
          </div>
        )}

        {hasThinking && (
          <button
            onClick={() => setShowThinking(!showThinking)}
            className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-lg bg-bg-tertiary/50 text-text-muted text-xs font-mono hover:text-accent hover:bg-accent/5 transition-all"
          >
            <Brain className="w-3 h-3" />
            {showThinking ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            {showThinking ? 'Hide thinking' : 'Show thinking'}
          </button>
        )}

        {showThinking && thinking && (
          <div className="mb-2 p-3 rounded-xl bg-accent/5 border border-accent/10 text-xs text-text-secondary font-mono max-h-60 overflow-y-auto">
            <div className="markdown-body text-xs">
              <ReactMarkdown>{thinking}</ReactMarkdown>
            </div>
          </div>
        )}

        <div className={`rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-accent/10 border border-accent/20 text-text-primary'
            : isTool
              ? 'bg-warning/5 border border-warning/20 text-text-secondary'
              : 'bg-bg-secondary border border-border'
        }`}>
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className={`markdown-body ${isStreaming && !hasThinking ? 'typing-cursor' : ''}`}>
              <ReactMarkdown>{content || message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {message.toolDisplay && (
          <div className="mt-1 text-xs font-mono text-accent/70">
            {message.toolDisplay}
          </div>
        )}
      </div>
    </div>
  )
}
