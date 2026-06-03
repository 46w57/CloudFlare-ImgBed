/**
 * 后端 API base URL。
 *
 * - Tauri 桌面端：通过 Tauri command 拿到（`backend_base_url`）
 * - 浏览器开发：默认 `http://127.0.0.1:8765`
 */

let _cached: string | null = null;

export async function getBackendBaseUrl(): Promise<string> {
  if (_cached) return _cached;

  // 尝试 Tauri
  try {
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      const { invoke } = await import('@tauri-apps/api/core');
      _cached = await invoke<string>('backend_base_url');
      return _cached;
    }
  } catch {
    /* ignore */
  }
  _cached = 'http://127.0.0.1:8765';
  return _cached;
}

export async function api<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const base = await getBackendBaseUrl();
  const resp = await fetch(`${base}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${text}`);
  }
  return resp.json() as Promise<T>;
}

export async function openExternal(url: string): Promise<void> {
  try {
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_external', { url });
      return;
    }
  } catch {
    /* ignore */
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
