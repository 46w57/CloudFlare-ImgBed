import { useEffect, useState } from 'react';
import { Check, X, RefreshCw, Trash2, ExternalLink, Shield, AlertCircle, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { useSettings } from '@/stores/settings';
import { api, openExternal } from '@/lib/api';
import type { ProviderStatus } from '@/lib/types';

export function SettingsPage() {
  const { providers, refreshStatus, loadProviders } = useSettings();
  const [statuses, setStatuses] = useState<Record<string, ProviderStatus>>({});
  const [validating, setValidating] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    void loadProviders();
    void loadStatuses();
  }, [loadProviders]);

  const loadStatuses = async () => {
    const out: Record<string, ProviderStatus> = {};
    for (const p of ['deepseek', 'qwen']) {
      try {
        out[p] = await api<ProviderStatus>(`/api/cookies/${p}`);
      } catch (e) {
        console.warn(e);
      }
    }
    setStatuses(out);
  };

  const validate = async (name: string) => {
    setValidating((v) => ({ ...v, [name]: true }));
    try {
      const r = await api<{ healthy: boolean }>(`/api/providers/${name}/validate`, {
        method: 'POST',
      });
      setMessage({
        kind: r.healthy ? 'ok' : 'err',
        text: r.healthy ? `${name} cookie 有效` : `${name} cookie 验证失败，可能已过期`,
      });
    } catch (e: any) {
      setMessage({ kind: 'err', text: e?.message || String(e) });
    } finally {
      setValidating((v) => ({ ...v, [name]: false }));
      void loadStatuses();
    }
  };

  const remove = async (name: string) => {
    if (!confirm(`删除 ${name} 的 cookie？下次需要重新登录。`)) return;
    try {
      await api(`/api/cookies/${name}`, { method: 'DELETE' });
      setMessage({ kind: 'ok', text: '已删除' });
      await loadStatuses();
    } catch (e: any) {
      setMessage({ kind: 'err', text: e?.message || String(e) });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
      {message && (
        <div
          className={clsx(
            'flex items-start gap-2 px-3 py-2 rounded text-xs',
            message.kind === 'ok'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
          )}
        >
          {message.kind === 'ok' ? <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
          <span className="flex-1 break-all">{message.text}</span>
          <button onClick={() => setMessage(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <section>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" /> 模型账号
        </h3>
        <div className="space-y-2">
          {providers.map((p) => {
            const s = statuses[p.name];
            return (
              <div
                key={p.name}
                className="border border-line rounded-lg p-3 bg-bg-subtle"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium text-text-primary">{p.display_name}</div>
                    <div className="text-[11px] text-text-muted">{p.domains.join(', ')}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    {s?.configured ? (
                      <span className={clsx(
                        'inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full',
                        s.healthy
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-amber-500/15 text-amber-300'
                      )}>
                        <span className={clsx('w-1.5 h-1.5 rounded-full', s.healthy ? 'bg-emerald-400' : 'bg-amber-400')} />
                        {s.healthy ? '已登录' : '可能过期'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-bg-panel text-text-muted">
                        <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
                        未配置
                      </span>
                    )}
                  </div>
                </div>
                {s?.configured && (
                  <div className="text-[11px] text-text-muted mb-2 space-y-0.5">
                    <div>Cookie: {s.cookie_count ?? 0} 个 · 域 {s.domains?.join(', ')}</div>
                    {s.updated_at && <div>更新于 {new Date(s.updated_at).toLocaleString()}</div>}
                    {s.user_id && <div>用户: {s.user_id}</div>}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => openExternal(p.name === 'deepseek' ? 'https://chat.deepseek.com' : 'https://chat.qwen.ai')}
                    className="flex items-center gap-1 text-[12px] px-2.5 py-1 rounded border border-line hover:bg-bg-hover"
                  >
                    <ExternalLink className="w-3 h-3" /> 打开官网
                  </button>
                  <button
                    onClick={() => validate(p.name)}
                    disabled={validating[p.name] || !s?.configured}
                    className="flex items-center gap-1 text-[12px] px-2.5 py-1 rounded border border-line hover:bg-bg-hover disabled:opacity-40"
                  >
                    {validating[p.name] ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    验证
                  </button>
                  {s?.configured && (
                    <button
                      onClick={() => remove(p.name)}
                      className="flex items-center gap-1 text-[12px] px-2.5 py-1 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-3 h-3" /> 删除
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
          首次配置步骤
        </h3>
        <ol className="text-[12px] text-text-secondary space-y-1.5 list-decimal pl-4 leading-relaxed">
          <li>在 PowerShell / 终端运行：
            <code className="block mt-1 px-2 py-1 bg-bg-subtle border border-line rounded font-mono text-[11px]">
              cd backend &amp;&amp; python -m scripts.bootstrap_chrome --provider deepseek
            </code>
          </li>
          <li>弹出的 Chrome 窗口里登录 DeepSeek / Qwen</li>
          <li>回到终端按 Enter，后端会通过 CDP 抓取 Cookie 并加密保存</li>
          <li>点上方「验证」按钮测试是否可用</li>
        </ol>
      </section>

      <section>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">安全说明</h3>
        <p className="text-[11px] text-text-muted leading-relaxed">
          Cookie 文件使用 AES-256-GCM 加密，Windows 上主密钥额外用 DPAPI（绑定当前用户）保护。
          文件位于 <code className="text-text-secondary">%USERPROFILE%\.claw\cookies.enc</code>。
        </p>
      </section>
    </div>
  );
}
