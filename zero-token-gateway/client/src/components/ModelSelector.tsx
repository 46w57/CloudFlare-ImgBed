import { useChatStore } from '@/hooks/useChatStore'
import { ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export default function ModelSelector() {
  const models = useChatStore(s => s.models)
  const currentModel = useChatStore(s => s.currentModel)
  const setCurrentModel = useChatStore(s => s.setCurrentModel)
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const configuredModels = models.filter(m => m.configured)
  const grouped = configuredModels.reduce((acc, m) => {
    if (!acc[m.provider]) acc[m.provider] = []
    acc[m.provider].push(m)
    return acc
  }, {} as Record<string, typeof configuredModels>)

  const currentModelInfo = models.find(m => m.id === currentModel)

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-tertiary border border-border hover:border-accent/30 transition-all text-sm"
      >
        <span className={`w-2 h-2 rounded-full ${currentModelInfo?.configured ? 'bg-accent' : 'bg-warning'}`} />
        <span className="font-mono text-text-primary max-w-[200px] truncate">
          {currentModelInfo?.name || currentModel}
        </span>
        <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-bg-secondary border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
          <div className="max-h-80 overflow-y-auto p-2">
            {Object.entries(grouped).map(([provider, providerModels]) => (
              <div key={provider} className="mb-2">
                <div className="px-3 py-1.5 text-xs font-mono text-text-muted uppercase tracking-wider">
                  {provider}
                </div>
                {providerModels.map(m => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setCurrentModel(m.id)
                      setOpen(false)
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${
                      m.id === currentModel
                        ? 'bg-accent/10 text-accent'
                        : 'text-text-primary hover:bg-bg-tertiary'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${m.id === currentModel ? 'bg-accent' : 'bg-text-muted'}`} />
                    <span className="font-mono">{m.name}</span>
                    {m.reasoning && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent font-mono">
                        REASON
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))}
            {configuredModels.length === 0 && (
              <div className="px-3 py-4 text-center text-text-muted text-sm">
                No models configured. Go to Config page.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
