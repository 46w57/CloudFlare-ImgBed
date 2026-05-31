import { useCallback } from "react";
import { useCookieStore, type PollingStatus } from "@/store/cookieStore";
import { autoDetect } from "@/utils/api";

export function useCookies() {
  const store = useCookieStore();

  const refreshCredentials = useCallback(async () => {
    await store.fetchCredentials();
  }, [store]);

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
