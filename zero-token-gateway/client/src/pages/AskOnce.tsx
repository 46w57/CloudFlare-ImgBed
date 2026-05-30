import { useState } from 'react'
import { useChatStore } from '@/hooks/useChatStore'
import { sendAskOnce } from '@/services/api'
import { Send, Loader2, Layers } from 'lucide-react'

export default function AskOncePage() {
  const providers = useChatStore(s => s.providers)
  const [message, setMessage] = useState('')
  const [selectedProviders, setSelectedProviders] = useState<string[]>([])
  const [results, setResults] = useState<Record<string, { model: string; content?: string; error?: string }>>({})
  const [isLoading, setIsLoading] = useState(false)

  const configuredProviders = providers.filter(p => p.configured)

  const toggleProvider = (id: string) => {
    setSelectedProviders(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const handleSend = async () => {
    if (!message.trim() || isLoading) return
    setIsLoading(true)
    setResults({})

    try {
      const data = await sendAskOnce(message, selectedProviders.length > 0 ? selectedProviders : undefined)
      if (data.results) {
        setResults(data.results)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <header className="px-6 py-3 border-b border-border bg-bg-secondary/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-accent" />
          <h1 className="text-lg font-bold font-mono glow-text">AskOnce</h1>
          <span className="text-text-muted text-sm ml-2">One question, all models answer</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {Object.keys(results).length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
              <Layers className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-xl font-bold mb-2">Ask Once, Compare All</h2>
            <p className="text-text-secondary max-w-md">
              Send one question to multiple AI models and compare their answers side by side.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading && configuredProviders.length > 0 && Object.keys(results).length === 0 && (
              configuredProviders.map(p => (
                <div key={p.id} className="bg-bg-secondary border border-border rounded-xl p-4 animate-fade-in">
                  <div className="flex items-center gap-2 mb-3">
                    <Loader2 className="w-4 h-4 text-accent animate-spin" />
                    <span className="font-mono text-sm text-accent">{p.name}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-bg-tertiary rounded animate-pulse" />
                    <div className="h-3 bg-bg-tertiary rounded w-3/4 animate-pulse" />
                  </div>
                </div>
              ))
            )}

            {Object.entries(results).map(([providerId, result]) => (
              <div key={providerId} className="bg-bg-secondary border border-border rounded-xl p-4 animate-fade-in">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-2 h-2 rounded-full ${result.error ? 'bg-danger' : 'bg-accent'}`} />
                  <span className="font-mono text-sm text-accent">{providerId}</span>
                  <span className="text-xs text-text-muted">{result.model}</span>
                </div>
                {result.error ? (
                  <p className="text-danger text-sm">{result.error}</p>
                ) : (
                  <div className="markdown-body text-sm text-text-primary max-h-96 overflow-y-auto">
                    <p className="whitespace-pre-wrap">{result.content}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-border bg-bg-secondary/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto space-y-3">
          {configuredProviders.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {configuredProviders.map(p => (
                <button
                  key={p.id}
                  onClick={() => toggleProvider(p.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                    selectedProviders.includes(p.id) || selectedProviders.length === 0
                      ? 'bg-accent/10 text-accent border border-accent/30'
                      : 'bg-bg-tertiary text-text-muted border border-border hover:border-accent/20'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-3">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="Ask all models..."
              rows={1}
              className="flex-1 bg-bg-tertiary border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder-text-muted resize-none focus:outline-none focus:border-accent/50 transition-all"
            />
            <button
              onClick={handleSend}
              disabled={!message.trim() || isLoading}
              className="p-3 rounded-xl bg-accent text-bg-primary hover:bg-accent-dim disabled:opacity-30 disabled:cursor-not-allowed transition-all glow-button shrink-0"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
