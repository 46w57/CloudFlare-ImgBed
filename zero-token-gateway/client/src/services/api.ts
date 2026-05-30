import { useChatStore } from '@/hooks/useChatStore'

export async function sendMessage(content: string) {
  const store = useChatStore.getState()
  const { currentModel, messages } = store

  store.addMessage({ role: 'user', content })
  store.setLoading(true)
  store.setStreaming(true)
  store.setStreamingContent('')

  const apiMessages = [...messages, { role: 'user' as const, content }].map(m => ({
    role: m.role,
    content: m.content
  }))

  try {
    const res = await fetch('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: currentModel,
        messages: apiMessages,
        stream: true
      })
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: { message: res.statusText } }))
      store.addMessage({
        role: 'assistant',
        content: `❌ Error: ${errData.error?.message || res.statusText}`,
        model: currentModel
      })
      store.setLoading(false)
      store.setStreaming(false)
      return
    }

    const reader = res.body?.getReader()
    if (!reader) {
      store.setLoading(false)
      store.setStreaming(false)
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta?.content || ''
            if (delta) {
              store.appendStreamingContent(delta)
            }
          } catch {}
        }
      }
    }

    store.finalizeStreaming()
  } catch (err: any) {
    store.addMessage({
      role: 'assistant',
      content: `❌ Connection error: ${err.message}`,
      model: currentModel
    })
    store.setLoading(false)
    store.setStreaming(false)
  } finally {
    store.setLoading(false)
  }
}

export async function sendAskOnce(message: string, providers?: string[]) {
  try {
    const res = await fetch('/api/askonce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, providers, stream: false })
    })
    return await res.json()
  } catch (err: any) {
    console.error('AskOnce error:', err)
    return { error: err.message }
  }
}

export async function captureCredentials(providerId: string) {
  const res = await fetch('/api/auth/capture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ providerId })
  })
  return await res.json()
}

export async function refreshCredentials(providerId: string) {
  const res = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ providerId })
  })
  return await res.json()
}

export async function deleteCredentials(providerId: string) {
  const res = await fetch(`/api/auth/${providerId}`, { method: 'DELETE' })
  return await res.json()
}

export async function getChromeStatus() {
  const res = await fetch('/api/auth/chrome-status')
  return await res.json()
}
