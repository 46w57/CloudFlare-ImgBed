const API_BASE = "/api";

async function fetchAPI<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const errorBody = await res.text().catch(() => "未知错误");
    throw new Error(errorBody || `请求失败: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface ChatRequest {
  platform: "deepseek" | "qwen";
  model: string;
  messages: Array<{
    role: "system" | "user" | "assistant" | "tool";
    content: string;
    toolCallId?: string;
  }>;
  stream?: boolean;
  enableSearch?: boolean;
  enableThinking?: boolean;
  expertMode?: boolean;
  chatSessionId?: string;
  parentMessageId?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  platform: "deepseek" | "qwen";
  supportsThinking: boolean;
  supportsSearch: boolean;
  supportsTools: boolean;
}

export interface CredentialInfo {
  platform: "deepseek" | "qwen";
  hasToken: boolean;
  hasCookies: boolean;
  status: "valid" | "expired" | "unknown" | "empty";
  lastChecked: string;
}

export async function sendChatMessage(
  request: ChatRequest
): Promise<Response> {
  const url = `${API_BASE}/chat`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...request, stream: true }),
  });
  if (!res.ok) {
    const errorBody = await res.text().catch(() => "未知错误");
    throw new Error(errorBody || `聊天请求失败: ${res.status}`);
  }
  return res;
}

export async function startLogin(platform: "deepseek" | "qwen") {
  return fetchAPI<{ task_id: string; taskId?: string; status: string }>("/cookies/start-login", {
    method: "POST",
    body: JSON.stringify({ platform }),
  });
}

export async function pollLogin(taskId: string) {
  return fetchAPI<{
    task_id: string;
    platform: string;
    status: "polling" | "found" | "timeout" | "error";
    result?: { platform: string; token?: string; cookies?: string; source?: string };
    elapsed: number;
  }>(`/cookies/poll/${taskId}`);
}

export async function autoDetect(platform: "deepseek" | "qwen") {
  return fetchAPI<{
    found: boolean;
    token?: string;
    cookies?: string;
    source?: string;
  }>("/cookies/auto-detect", {
    method: "POST",
    body: JSON.stringify({ platform }),
  });
}

export async function manualImport(
  platform: "deepseek" | "qwen",
  token: string
) {
  return fetchAPI<{ success: boolean }>("/cookies/manual", {
    method: "POST",
    body: JSON.stringify({ platform, token }),
  });
}

export async function getCredentials() {
  return fetchAPI<Record<string, CredentialInfo>>("/cookies");
}

export async function validateCredential(platform: "deepseek" | "qwen") {
  return fetchAPI<{ valid: boolean }>("/cookies/validate", {
    method: "POST",
    body: JSON.stringify({ platform }),
  });
}

export async function deleteCredential(platform: "deepseek" | "qwen") {
  return fetchAPI<{ success: boolean }>(`/cookies/${platform}`, {
    method: "DELETE",
  });
}

export async function getModels() {
  return fetchAPI<{ models: ModelInfo[] }>("/models");
}

export async function executeTool(
  toolName: string,
  args: Record<string, string>
) {
  return fetchAPI<{ result: string }>("/tools/execute", {
    method: "POST",
    body: JSON.stringify({ tool: toolName, args }),
  });
}
