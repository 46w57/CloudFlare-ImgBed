import { useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ChatPanel } from '@/components/ChatPanel';
import { Topbar } from '@/components/Topbar';
import { useSettings } from '@/stores/settings';
import { useSessions } from '@/stores/sessions';

export default function App() {
  const { loadProviders, backendUrl } = useSettings();
  const { currentId, sessions } = useSessions();

  useEffect(() => {
    void loadProviders();
  }, [loadProviders]);

  const current = currentId ? sessions[currentId] : null;

  return (
    <div className="flex h-screen w-screen bg-bg text-text-primary">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          session={current}
          backendUrl={backendUrl}
        />
        <main className="flex-1 min-h-0">
          {current ? (
            <ChatPanel session={current} />
          ) : (
            <EmptyState onBackendDown={!backendUrl} />
          )}
        </main>
      </div>
    </div>
  );
}

function EmptyState({ onBackendDown }: { onBackendDown: boolean }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-accent/10 flex items-center justify-center text-3xl">
          🦀
        </div>
        <h1 className="text-2xl font-semibold mb-2">Claw Zero Token</h1>
        <p className="text-text-secondary mb-6 leading-relaxed">
          {onBackendDown
            ? '无法连接后端服务。请先在终端运行 python -m app.main 启动。'
            : '点击左上角"新建对话"开始聊天。在「设置」中配置你的 DeepSeek / Qwen Cookie。'}
        </p>
        {onBackendDown && (
          <code className="block text-xs text-text-muted bg-bg-panel px-3 py-2 rounded font-mono">
            cd backend &amp;&amp; python -m app.main
          </code>
        )}
      </div>
    </div>
  );
}
