import { useCallback } from "react";
import { useCookieStore, type PollingStatus } from "@/store/cookieStore";
import { autoDetect } from "@/utils/api";

export function useCookies() {
  const store = useCookieStore();

  const refreshCredentials = useCallback(async () => {
    try {
      const res = await fetch("/api/cookies");
      if (!res.ok) throw new Error("获取凭证失败");
      const data = await res.json();
      useCookieStore.setState((s) => {
        const newCreds = { ...s.credentials };
        for (const platform of ["deepseek", "qwen"] as const) {
          const c = data[platform];
          if (c) {
            newCreds[platform] = {
              hasToken: c.hasToken ?? false,
              hasCookies: c.hasCookies ?? false,
              status: c.hasToken ? "valid" : "empty",
              lastChecked: new Date().toISOString(),
            };
          }
        }
        return { credentials: newCreds };
      });
    } catch {
      console.error("刷新凭证失败");
    }
  }, []);

  const handleStartLogin = useCallback(
    async (platform: "deepseek" | "qwen") => {
      await store.startLogin(platform);
    },
    [store]
  );

  const handleAutoDetect = useCallback(
    async (platform: "deepseek" | "qwen") => {
      try {
        useCookieStore.setState((s) => ({
          pollingStatus: { ...s.pollingStatus, [platform]: "polling" as PollingStatus },
        }));
        const result = await autoDetect(platform);
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
      } catch {
        useCookieStore.setState((s) => ({
          pollingStatus: { ...s.pollingStatus, [platform]: "error" as PollingStatus },
        }));
      }
    },
    []
  );

  const handleManualImport = useCallback(
    async (platform: "deepseek" | "qwen", token: string) => {
      await store.manualImport(platform, token);
    },
    [store]
  );

  const handleValidate = useCallback(
    async (platform: "deepseek" | "qwen") => {
      await store.validateCredential(platform);
    },
    [store]
  );

  const handleDelete = useCallback(
    async (platform: "deepseek" | "qwen") => {
      await store.deleteCredential(platform);
    },
    [store]
  );

  return {
    credentials: store.credentials,
    pollingStatus: store.pollingStatus,
    refreshCredentials,
    handleStartLogin,
    handleAutoDetect,
    handleManualImport,
    handleValidate,
    handleDelete,
  };
}
