import { useEffect, useState } from 'react';
import { Check, X, RefreshCw, Trash2, ExternalLink, Shield, AlertCircle, Loader2, KeyRound, Download } from 'lucide-react';
import clsx from 'clsx';
import { useSettings } from '@/stores/settings';
import { api, openExternal } from '@/lib/api';
import type { ProviderStatus } from '@/lib/types';

export function SettingsPage() {
  const { providers, loadProviders } = useSettings();
  const [statuses, setStatuses] = useState<Record<string, ProviderStatus>>({});
  const [validating, setValidating] = useState<Record<string, boolean>>({});
  const [onboarding, setOnboarding] = useState<Record<string, 'launching' | 'waiting' | 'capturing' | null>>({});
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [showManual, setShowManual] = useState<Record<string, boolean>>({});
  const [manualJson, setManualJson] = useState<Record<string, string>>({});

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

  const startOnboard = async (name: string) => {
    setOnboarding((s) => ({ ...s, [name]: 'launching' }));
    try {
      await api('/api/onboard/start', {
        method: 'POST',
        body: JSON.stringify({ provider: name, no_launch: false, timeout: 300 }),
      });
      setOnboarding((s) => ({ ...s, [name]: 'waiting' }));
      setMessage({ kind: 'ok', text: `Chrome 已启动，请在浏览器里登录 ${name}。登录完成后点击「立即抓取」` });
    } catch (e: any) {
      setMessage({ kind: 'err', text: e?.message || String(e) });
      setOnboarding((s) => ({ ...s, [name]: null }));
    }
  };

  const captureNow = async (name: string) => {
    setOnboarding((s) => ({ ...s, [name]: 'capturing' }));
    try {
      const r = await api<{ ok: boolean; cookie_count: number; healthy: boolean }>(
        '/api/onboard/capture',
        { method: 'POST', body: JSON.stringify({ provider: name, port: 9222 }) }
      );
      if (r.ok) {
        setMessage({
          kind: r.healthy ? 'ok' : 'err',
          text: r.healthy
            ? `✓ ${name} 抓取并验证通过 (${r.cookie_count} 个 cookies)`
            : `⚠ ${name} 抓取成功 (${r.cookie_count} 个 cookies) 但验证未通过，cookie 可能不完整`,
        });
      }
      setOnboarding((s) => ({ ...s, [name]: null }));
      await loadStatuses();
    } catch (e: any) {
      setMessage({ kind: 'err', text: e?.message || String(e) });
      setOnboarding((s) => ({ ...s, [name]: null }));
    }
  };

  const submitManual = async (name: string) => {
    try {
      const payload = JSON.parse(manualJson[name] || '{}');
      if (!Array.isArray(payload.cookies)) {
        throw new Error('JSON 必须包含 cookies 数组');
      }
      await api('/api/cookies/import', {
        method: 'POST',
        body: JSON.stringify({ provider: name, ...payload }),
      });
      setMessage({ kind: 'ok', text: '手动导入成功' });
      setShowManual((s) => ({ ...s, [name]: false }));
      await loadStatuses();
    } catch (e: any) {
      setMessage({ kind: 'err', text: `导入失败: ${e?.message || e}` });
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
            const ob = onboarding[p.name];
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

                {/* 操作按钮组 */}
                <div className="flex flex-wrap gap-1.5">
                  {ob !== 'waiting' && ob !== 'launching' && (
                    <button
                      onClick={() => startOnboard(p.name)}
                      className="flex items-center gap-1 text-[12px] px-2.5 py-1 rounded bg-accent/15 text-accent hover:bg-accent/25"
                    >
                      <KeyRound className="w-3 h-3" /> 一键登录
                    </button>
                  )}
                  {ob === 'launching' && (
                    <button disabled className="flex items-center gap-1 text-[12px] px-2.5 py-1 rounded bg-bg-panel text-text-muted">
                      <Loader2 className="w-3 h-3 animate-spin" /> 启动 Chrome...
                    </button>
                  )}
                  {ob === 'waiting' && (
                    <button
                      onClick={() => captureNow(p.name)}
                      className="flex items-center gap-1 text-[12px] px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 animate-pulse-soft"
                    >
                      <Download className="w-3 h-3" /> 立即抓取 Cookie
                    </button>
                  )}
                  {ob === 'capturing' && (
                    <button disabled className="flex items-center gap-1 text-[12px] px-2.5 py-1 rounded bg-bg-panel text-text-muted">
                      <Loader2 className="w-3 h-3 animate-spin" /> 抓取中...
                    </button>
                  )}
                  <button
                    onClick={() => openExternal(p.name === 'deepseek' ? 'https://chat.deepseek.com' : 'https://chat.qwen.ai')}
                    className="flex items-center gap-1 text-[12px] px-2.5 py-1 rounded border border-line hover:bg-bg-hover"
                  >
                    <ExternalLink className="w-3 h-3" /> 打开官网
                  </button>
                  {s?.configured && (
                    <>
                      <button
                        onClick={() => validate(p.name)}
                        disabled={validating[p.name]}
                        className="flex items-center gap-1 text-[12px] px-2.5 py-1 rounded border border-line hover:bg-bg-hover disabled:opacity-40"
                      >
                        {validating[p.name] ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        验证
                      </button>
                      <button
                        onClick={() => remove(p.name)}
                        className="flex items-center gap-1 text-[12px] px-2.5 py-1 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-3 h-3" /> 删除
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setShowManual((m) => ({ ...m, [p.name]: !m[p.name] }))}
                    className="flex items-center gap-1 text-[12px] px-2.5 py-1 rounded text-text-muted hover:text-text-primary"
                  >
                    手动导入 JSON
                  </button>
                </div>

                {showManual[p.name] && (
                  <div className="mt-2 space-y-1.5">
                    <textarea
                      className="w-full h-32 bg-bg-panel border border-line rounded p-2 font-mono text-[11px]"
                      placeholder='{"cookies": [{"name": "...", "value": "...", "domain": ".deepseek.com"}], "headers": {}}'
                      value={manualJson[p.name] || ''}
                      onChange={(e) => setManualJson((m) => ({ ...m, [p.name]: e.target.value }))}
                    />
                    <button
                      onClick={() => submitManual(p.name)}
                      className="text-[12px] px-2.5 py-1 rounded bg-accent/15 text-accent hover:bg-accent/25"
                    >
                      提交
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">使用流程</h3>
        <ol className="text-[12px] text-text-secondary space-y-1.5 list-decimal pl-4 leading-relaxed">
          <li>点击「一键登录」，程序会启动一个带调试端口的 Chrome</li>
          <li>在弹出的 Chrome 里登录 DeepSeek / Qwen</li>
          <li>登录完成（看到主界面）后回到本页面，点「立即抓取 Cookie」</li>
          <li>程序自动从浏览器抓 cookie、加密保存</li>
          <li>点「验证」确认能用，然后就可以开聊了</li>
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
