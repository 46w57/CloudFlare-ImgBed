import { useCallback } from "react";
import { useCookieStore, type PollingStatus } from "@/store/cookieStore";
import { autoDetect } from "@/utils/api";

export function useCookies() {
  const credentials = useCookieStore((s) => s.credentials);
  const pollingStatus = useCookieStore((s) => s.pollingStatus);

  const refreshCredentials = useCallback(async () => {
    await useCookieStore.getState().fetchCredentials();
  }, []);

  const handleStartLogin = useCallback(
    async (platform: "deepseek" | "qwen") => {
      await useCookieStore.getState().startLogin(platform);
    },
    []
  );

  const handleAutoDetect = useCallback(
    async (platform: "deepseek" | "qwen") => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15_000);
      try {
        useCookieStore.setState((s) => ({
          pollingStatus: { ...s.pollingStatus, [platform]: "polling" as PollingStatus },
        }));
        const result = await autoDetect(platform, controller.signal);
        if (result.found) {
          useCookieStore.setState((s) => ({
            pollingStatus: { ...s.pollingStatus, [platform]: "found" as PollingStatus },
            credentials: {
              ...s.credentials,
              [platform]: {
                hasToken: !!result.token,
                hasCookies: !!result.cookies,
                status: "valid",
                lastChecked: new Date().toISOString(),
              },
            },
          }));
        } else {
          useCookieStore.setState((s) => ({
            pollingStatus: { ...s.pollingStatus, [platform]: "timeout" as PollingStatus },
          }));
        }
      } catch (err) {
        const isTimeout = err instanceof DOMException && err.name === "AbortError";
        const message = isTimeout
          ? `自动检测 ${platform} 超时（15秒），浏览器 cookie 读取可能被阻塞，请尝试手动导入`
          : `自动检测 ${platform} 失败: ${err instanceof Error ? err.message : "未知错误"}`;
        console.warn(`[autoDetect] ${message}`, err);
        useCookieStore.setState((s) => ({
          pollingStatus: {
            ...s.pollingStatus,
            [platform]: "error" as PollingStatus,
          },
        }));
      } finally {
        clearTimeout(timeoutId);
      }
    },
    []
  );

  const handleManualImport = useCallback(
    async (platform: "deepseek" | "qwen", token: string) => {
      await useCookieStore.getState().manualImport(platform, token);
    },
    []
  );

  const handleValidate = useCallback(
    async (platform: "deepseek" | "qwen") => {
      await useCookieStore.getState().validateCredential(platform);
    },
    []
  );

  const handleDelete = useCallback(
    async (platform: "deepseek" | "qwen") => {
      await useCookieStore.getState().deleteCredential(platform);
    },
    []
  );

  return {
    credentials,
    pollingStatus,
    refreshCredentials,
    handleStartLogin,
    handleAutoDetect,
    handleManualImport,
    handleValidate,
    handleDelete,
  };
}
