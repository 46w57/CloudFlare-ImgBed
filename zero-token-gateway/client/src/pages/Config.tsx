import { useState, useEffect } from 'react'
import { useChatStore } from '@/hooks/useChatStore'
import { captureCredentials, refreshCredentials, deleteCredentials, getChromeStatus } from '@/services/api'
import { Settings, RefreshCw, Trash2, Download, Wifi, WifiOff, CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react'

const isElectron = !!(window as any).electronAPI

export default function ConfigPage() {
  const providers = useChatStore(s => s.providers)
  const fetchProviders = useChatStore(s => s.fetchProviders)
  const fetchModels = useChatStore(s => s.fetchModels)
  const [chromeConnected, setChromeConnected] = useState(isElectron)
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null)

  useEffect(() => {
    if (!isElectron) {
      checkChrome()
    }
  }, [])

  const checkChrome = async () => {
    try {
      const status = await getChromeStatus()
      setChromeConnected(status.connected)
    } catch {
      setChromeConnected(false)
    }
  }

  const handleLogin = async (providerId: string, url: string) => {
    if (isElectron) {
      const api = (window as any).electronAPI
      await api.openLoginWindow(providerId)
    } else {
      window.open(url, '_blank')
    }
  }

  const handleCapture = async (providerId: string) => {
    setLoadingProvider(providerId)
    try {
      let result
      if (isElectron) {
        const api = (window as any).electronAPI
        result = await api.captureCredentials(providerId)
      } else {
        result = await captureCredentials(providerId)
      }

      if (result.success) {
        await fetchProviders()
        await fetchModels()
      } else {
        alert(result.error || 'Failed to capture credentials')
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoadingProvider(null)
    }
  }

  const handleRefresh = async (providerId: string) => {
    setLoadingProvider(providerId)
    try {
      if (isElectron) {
        const api = (window as any).electronAPI
        await api.refreshCredentials(providerId)
      } else {
        await refreshCredentials(providerId)
      }
      await fetchProviders()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoadingProvider(null)
    }
  }

  const handleDelete = async (providerId: string) => {
    if (!confirm(`Remove credentials for ${providerId}?`)) return
    try {
      await deleteCredentials(providerId)
      await fetchProviders()
      await fetchModels()
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <header className="px-6 py-3 border-b border-border bg-bg-secondary/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-accent" />
            <h1 className="text-lg font-bold font-mono glow-text">Configuration</h1>
          </div>
          <div className="flex items-center gap-2">
            {isElectron ? (
              <div className="flex items-center gap-1.5 text-accent text-sm">
                <Wifi className="w-4 h-4" />
                <span className="font-mono">Desktop Mode</span>
              </div>
            ) : chromeConnected ? (
              <div className="flex items-center gap-1.5 text-accent text-sm">
                <Wifi className="w-4 h-4" />
                <span className="font-mono">Chrome Connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-danger text-sm">
                <WifiOff className="w-4 h-4" />
                <span className="font-mono">Chrome Disconnected</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {!isElectron && !chromeConnected && (
          <div className="mb-6 bg-warning/10 border border-warning/30 rounded-xl p-4 animate-fade-in">
            <h3 className="text-warning font-bold mb-2">⚠️ Chrome not connected</h3>
            <p className="text-text-secondary text-sm mb-2">
              Start Chrome in debug mode first:
            </p>
            <code className="block bg-bg-primary rounded-lg p-3 text-sm font-mono text-accent">
              google-chrome --remote-debugging-port=9222
            </code>
          </div>
        )}

        {isElectron && (
          <div className="mb-6 bg-accent/5 border border-accent/20 rounded-xl p-4 animate-fade-in">
            <h3 className="text-accent font-bold mb-2">🖥️ Desktop Mode</h3>
            <p className="text-text-secondary text-sm">
              Click <strong>Login</strong> to open a login window for each provider. After logging in, click <strong>Capture</strong> to save credentials.
              No external Chrome needed — the app uses its built-in browser.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map(p => (
            <div
              key={p.id}
              className={`bg-bg-secondary border rounded-xl p-4 transition-all animate-fade-in ${
                p.configured ? 'border-accent/20' : 'border-border'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {p.configured ? (
                    <CheckCircle className="w-4 h-4 text-accent" />
                  ) : (
                    <XCircle className="w-4 h-4 text-text-muted" />
                  )}
                  <h3 className="font-mono text-sm font-bold">{p.name}</h3>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  p.configured
                    ? 'bg-accent/10 text-accent'
                    : 'bg-bg-tertiary text-text-muted'
                }`}>
                  {p.configured ? 'READY' : 'NOT CONFIGURED'}
                </span>
              </div>

              <div className="text-xs text-text-muted mb-3">
                {p.models.map(m => m.name).join(', ')}
              </div>

              {p.credentialInfo && (
                <div className="text-xs text-text-muted mb-3 font-mono">
                  Cookie: {p.credentialInfo.hasCookie ? '✅' : '❌'} | Bearer: {p.credentialInfo.hasBearer ? '✅' : '❌'}
                  <br />
                  Updated: {new Date(p.credentialInfo.updatedAt).toLocaleString()}
                </div>
              )}

              <div className="flex gap-2">
                {!p.configured ? (
                  <>
                    {isElectron && (
                      <button
                        onClick={() => handleLogin(p.id, p.authConfig?.url)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-tertiary text-text-secondary text-xs font-mono hover:text-accent hover:bg-accent/10 transition-all"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Login
                      </button>
                    )}
                    <button
                      onClick={() => handleCapture(p.id)}
                      disabled={loadingProvider === p.id || (!isElectron && !chromeConnected)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-mono hover:bg-accent/20 disabled:opacity-30 transition-all"
                    >
                      {loadingProvider === p.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Download className="w-3 h-3" />
                      )}
                      Capture
                    </button>
                  </>
                ) : (
                  <>
                    {isElectron && (
                      <button
                        onClick={() => handleLogin(p.id, p.authConfig?.url)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-tertiary text-text-secondary text-xs font-mono hover:text-accent hover:bg-accent/10 transition-all"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Login
                      </button>
                    )}
                    <button
                      onClick={() => handleRefresh(p.id)}
                      disabled={loadingProvider === p.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-tertiary text-text-secondary text-xs font-mono hover:text-accent hover:bg-accent/10 disabled:opacity-30 transition-all"
                    >
                      {loadingProvider === p.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                      Refresh
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-tertiary text-text-muted text-xs font-mono hover:text-danger hover:bg-danger/10 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
