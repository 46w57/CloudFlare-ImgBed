import { create } from "zustand";

export type PollingStatus = "idle" | "polling" | "found" | "timeout" | "error";

export interface CredentialInfo {
  hasToken: boolean;
  hasCookies: boolean;
  status: "valid" | "expired" | "unknown" | "empty";
  lastChecked: string;
}

interface CookieState {
  credentials: {
    deepseek: CredentialInfo;
    qwen: CredentialInfo;
  };
  pollingStatus: {
    deepseek: PollingStatus;
    qwen: PollingStatus;
  };
  taskId: {
    deepseek: string | null;
    qwen: string | null;
  };
  fetchCredentials: () => Promise<void>;
  startLogin: (platform: "deepseek" | "qwen") => Promise<void>;
  pollStatus: (platform: "deepseek" | "qwen", taskId: string) => Promise<void>;
  manualImport: (platform: "deepseek" | "qwen", token: string) => Promise<void>;
  validateCredential: (platform: "deepseek" | "qwen") => Promise<void>;
  deleteCredential: (platform: "deepseek" | "qwen") => Promise<void>;
  setPollingStatus: (platform: "deepseek" | "qwen", status: PollingStatus) => void;
  resetPolling: () => void;
}

const defaultCredential: CredentialInfo = {
  hasToken: false,
  hasCookies: false,
  status: "empty",
  lastChecked: "",
};

export const useCookieStore = create<CookieState>()((set, get) => ({
  credentials: {
    deepseek: { ...defaultCredential },
    qwen: { ...defaultCredential },
  },
  pollingStatus: {
    deepseek: "idle",
    qwen: "idle",
  },
  taskId: {
    deepseek: null,
    qwen: null,
  },

  fetchCredentials: async () => {
    try {
      const res = await fetch("/api/cookies");
      if (!res.ok) throw new Error("获取凭证失败");
      const data = await res.json();
      set((state) => {
        const newCreds = { ...state.credentials };
        for (const platform of ["deepseek", "qwen"] as const) {
          const c = data[platform];
          if (c) {
            newCreds[platform] = {
              hasToken: c.hasToken ?? false,
              hasCookies: c.hasCookies ?? false,
              status: c.hasToken ? "valid" : "empty",
              lastChecked: c.lastChecked || "",
            };
          }
        }
        return { credentials: newCreds };
      });
    } catch {
      console.error("获取凭证失败");
    }
  },

  startLogin: async (platform) => {
    try {
      set((s) => ({
        pollingStatus: { ...s.pollingStatus, [platform]: "polling" },
      }));
      const res = await fetch("/api/cookies/start-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      if (!res.ok) throw new Error("启动登录失败");
      const data = await res.json();
      const taskId = (data.task_id || data.taskId) as string;
      set((s) => ({ taskId: { ...s.taskId, [platform]: taskId } }));
      get().pollStatus(platform, taskId);
    } catch {
      set((s) => ({
        pollingStatus: { ...s.pollingStatus, [platform]: "error" },
      }));
    }
  },

  pollStatus: async (platform, taskId) => {
    const maxAttempts = 150;
    let attempt = 0;
    const poll = async () => {
      if (attempt >= maxAttempts) {
        set((s) => ({
          pollingStatus: { ...s.pollingStatus, [platform]: "timeout" },
        }));
        return;
      }
      attempt++;
      try {
        const res = await fetch(`/api/cookies/poll/${taskId}`);
        if (!res.ok) throw new Error("轮询失败");
        const data = await res.json();
        if (data.status === "found") {
          set((s) => ({
            pollingStatus: { ...s.pollingStatus, [platform]: "found" },
            credentials: {
              ...s.credentials,
              [platform]: {
                hasToken: !!data.token,
                hasCookies: !!data.cookies,
                status: "valid",
                lastChecked: new Date().toISOString(),
              },
            },
          }));
          return;
        }
        if (data.status === "error") {
          set((s) => ({
            pollingStatus: { ...s.pollingStatus, [platform]: "error" },
          }));
          return;
        }
        setTimeout(poll, 2000);
      } catch {
        setTimeout(poll, 2000);
      }
    };
    poll();
  },

  manualImport: async (platform, token) => {
    try {
      const res = await fetch("/api/cookies/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, token }),
      });
      if (!res.ok) throw new Error("手动导入失败");
      set((s) => ({
        credentials: {
          ...s.credentials,
          [platform]: {
            hasToken: true,
            hasCookies: false,
            status: "unknown",
            lastChecked: new Date().toISOString(),
          },
        },
      }));
      await get().validateCredential(platform);
    } catch {
      console.error("手动导入失败");
    }
  },

  validateCredential: async (platform) => {
    try {
      const res = await fetch("/api/cookies/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      if (!res.ok) throw new Error("验证失败");
      const data = await res.json();
      set((s) => ({
        credentials: {
          ...s.credentials,
          [platform]: {
            ...s.credentials[platform],
            status: data.valid ? "valid" : "expired",
            lastChecked: new Date().toISOString(),
          },
        },
      }));
    } catch {
      set((s) => ({
        credentials: {
          ...s.credentials,
          [platform]: {
            ...s.credentials[platform],
            status: "unknown",
            lastChecked: new Date().toISOString(),
          },
        },
      }));
    }
  },

  deleteCredential: async (platform) => {
    try {
      const res = await fetch(`/api/cookies/${platform}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("删除凭证失败");
      set((s) => ({
        credentials: {
          ...s.credentials,
          [platform]: { ...defaultCredential },
        },
        pollingStatus: { ...s.pollingStatus, [platform]: "idle" },
      }));
    } catch {
      console.error("删除凭证失败");
    }
  },

  setPollingStatus: (platform, status) => {
    set((s) => ({
      pollingStatus: { ...s.pollingStatus, [platform]: status },
    }));
  },

  resetPolling: () => {
    set({
      pollingStatus: { deepseek: "idle", qwen: "idle" },
      taskId: { deepseek: null, qwen: null },
    });
  },
}));
