import ReactMarkdown from 'react-markdown'
import { Bot, User, Wrench } from 'lucide-react'

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

export default function MessageBubble({ message, isStreaming }: Props) {
  const isUser = message.role === 'user'
  const isTool = message.role === 'tool'

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
          <div className="text-[11px] font-mono text-text-muted mb-1">
            {message.model}
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
            <div className={`markdown-body ${isStreaming ? 'typing-cursor' : ''}`}>
              <ReactMarkdown>{message.content}</ReactMarkdown>
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
