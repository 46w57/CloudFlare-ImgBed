import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { useChatStore } from '@/hooks/useChatStore'
import ChatPage from '@/pages/Chat'
import AskOncePage from '@/pages/AskOnce'
import ConfigPage from '@/pages/Config'
import Sidebar from '@/components/Sidebar'

export default function App() {
  const fetchModels = useChatStore(s => s.fetchModels)
  const fetchProviders = useChatStore(s => s.fetchProviders)

  useEffect(() => {
    fetchModels()
    fetchProviders()
  }, [fetchModels, fetchProviders])

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-bg-primary text-text-primary">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<ChatPage />} />
            <Route path="/askonce" element={<AskOncePage />} />
            <Route path="/config" element={<ConfigPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
