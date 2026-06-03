/** 通用类型定义。 */

export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface Message {
  id: string;
  role: Role;
  content: string;
  /** 思考内容（用于 expert_mode）。 */
  thinking?: string;
  /** 时间戳。 */
  ts: number;
  /** 工具调用结果（如有）。 */
  toolResult?: { name: string; result: string };
  /** 出错信息（如有）。 */
  error?: string;
}

export interface ProviderInfo {
  name: string;
  display_name: string;
  domains: string[];
  supports_expert_mode: boolean;
  expert_mode_label: string;
  configured: boolean;
  healthy: boolean;
}

export interface ProviderStatus {
  provider: string;
  configured: boolean;
  cookie_count?: number;
  domains?: string[];
  user_id?: string;
  updated_at?: string;
  expires_at?: string;
  healthy?: boolean;
}

export interface ChatRequestBody {
  provider: string;
  model?: string;
  messages: Array<{ role: Role; content: string; name?: string; tool_call_id?: string }>;
  expert_mode?: boolean;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  enable_tools?: boolean;
}
