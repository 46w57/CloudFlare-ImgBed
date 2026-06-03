import { Sparkles, Brain, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { useSettings } from '@/stores/settings';
import type { ChatSession } from '@/stores/sessions';
import { useState, useEffect } from 'react';

export function Topbar({
  session,
  backendUrl,
}: {
  session: ChatSession | null;
  backendUrl: string | null;
}) {
  const { providers, setDefaults } = useSettings();
  const [, force] = useState(0);
  useEffect(() => {
    const handler = () => force((x) => x + 1);
    window.addEventListener('claw-session-updated', handler);
    return () => window.removeEventListener('claw-session-updated', handler);
  }, []);

  const provider = providers.find((p) => p.name === (session?.provider || 'deepseek'));
  const supportsExpert = provider?.supports_expert_mode ?? false;
  const expertLabel = provider?.expert_mode_label || '专家模式';

  return (
    <div className="h-12 px-4 flex items-center gap-3 border-b border-line bg-bg-panel flex-shrink-0">
      {session ? (
        <>
          <div className="text-sm font-medium truncate flex-1">{session.title || '新对话'}</div>
          <div className="flex items-center gap-2">
            <select
              className="bg-bg-subtle border border-line rounded px-2 py-1 text-xs text-text-primary"
              value={session.provider}
              onChange={(e) => {
                const newProv = e.target.value;
                session.provider = newProv;
                if (newProv === 'deepseek') session.model = 'deepseek-v4-pro';
                else if (newProv === 'qwen') session.model = 'qwen3.7-max';
                const p = providers.find((p) => p.name === newProv);
                if (p && !p.supports_expert_mode) session.expertMode = false;
                setDefaults({ defaultProvider: newProv, defaultModel: session.model });
                window.dispatchEvent(new Event('claw-session-updated'));
              }}
            >
              {providers.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.display_name}
                </option>
              ))}
            </select>
            {supportsExpert && (
              <button
                onClick={() => {
                  session.expertMode = !session.expertMode;
                  window.dispatchEvent(new Event('claw-session-updated'));
                }}
                className={clsx(
                  'flex items-center gap-1.5 px-2 py-1 rounded text-xs border transition-colors',
                  session.expertMode
                    ? 'bg-accent/15 border-accent text-accent'
                    : 'border-line text-text-secondary hover:bg-bg-hover'
                )}
                title={session.expertMode ? `已启用 ${expertLabel}` : '点击启用'}
              >
                <Brain className="w-3.5 h-3.5" />
                {session.expertMode ? expertLabel : '普通模式'}
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="text-sm text-text-muted">Claw - Zero Token</div>
      )}
      <div className="flex-1" />
      <div
        className={clsx(
          'flex items-center gap-1.5 text-xs',
          backendUrl ? 'text-text-muted' : 'text-amber-400'
        )}
        title={backendUrl ? `后端: ${backendUrl}` : '后端未连接'}
      >
        {backendUrl ? <Sparkles className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
        {backendUrl ? '已连接' : '后端离线'}
      </div>
    </div>
  );
}
