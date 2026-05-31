import { useCallback } from "react";
import { useCookieStore, type PollingStatus } from "@/store/cookieStore";
import {
  startLogin,
  pollLogin,
  autoDetect,
  getCredentials,
} from "@/utils/api";

export function useCookies() {
  const store = useCookieStore();

  const refreshCredentials = useCallback(async () => {
    try {
      const data = await getCredentials();
      const creds = data.credentials;
      const deepseek = creds.find((c) => c.platform === "deepseek");
      const qwen = creds.find((c) => c.platform === "qwen");
      useCookieStore.setState((s) => ({
        credentials: {
          deepseek: deepseek || s.credentials.deepseek,
          qwen: qwen || s.credentials.qwen,
        },
      }));
    } catch {
      console.error("刷新凭证失败");
    }
  }, []);

  const handleStartLogin = useCallback(
    async (platform: "deepseek" | "qwen") => {
      try {
        useCookieStore.setState((s) => ({
          pollingStatus: { ...s.pollingStatus, [platform]: "polling" as PollingStatus },
        }));
        const data = await startLogin(platform);
        const taskId = data.taskId;

        const maxAttempts = 150;
        let attempt = 0;

        const poll = async () => {
          if (attempt >= maxAttempts) {
            useCookieStore.setState((s) => ({
              pollingStatus: { ...s.pollingStatus, [platform]: "timeout" as PollingStatus },
            }));
            return;
          }
          attempt++;
          try {
            const result = await pollLogin(taskId);
            if (result.status === "found") {
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
              return;
            }
            if (result.status === "error") {
              useCookieStore.setState((s) => ({
                pollingStatus: { ...s.pollingStatus, [platform]: "error" as PollingStatus },
              }));
              return;
            }
            setTimeout(poll, 2000);
          } catch {
            setTimeout(poll, 2000);
          }
        };
        poll();
      } catch {
        useCookieStore.setState((s) => ({
          pollingStatus: { ...s.pollingStatus, [platform]: "error" as PollingStatus },
        }));
      }
    },
    []
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
