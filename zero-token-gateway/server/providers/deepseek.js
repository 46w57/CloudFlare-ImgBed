export class DeepSeekWebProvider {
  constructor() {
    this.displayName = 'DeepSeek Web';
    this.status = 'tested';
    this.models = [
      { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash', contextWindow: 1000000, maxTokens: 384000 },
      { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro (Expert)', contextWindow: 1000000, maxTokens: 384000, reasoning: true, expert: true },
      { id: 'deepseek-chat', name: 'DeepSeek Chat (Legacy)', contextWindow: 64000, maxTokens: 4096 },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner (Legacy)', contextWindow: 64000, maxTokens: 8192, reasoning: true }
    ];
    this.authConfig = {
      url: 'https://chat.deepseek.com',
      cookieDomains: ['chat.deepseek.com', '.deepseek.com'],
      bearerPattern: { urlContains: 'chat.deepseek.com' },
      cookieNames: ['user_token', 'HWWAFSESID', 'HWWAFSESTIME']
    };
  }

  async chat(credentials, params) {
    const { cookie, bearer, userAgent } = credentials;
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      'Cookie': cookie,
      'Accept': 'text/event-stream'
    };
    if (bearer) {
      headers['Authorization'] = `Bearer ${bearer}`;
    }

    const model = params.model || 'deepseek-v4-flash';
    const isExpert = model === 'deepseek-v4-pro';

    const body = {
      chat_mode: isExpert ? 'expert' : 'normal',
      model: model,
      messages: this.convertMessages(params.messages),
      stream: params.stream !== false
    };

    if (model === 'deepseek-reasoner') {
      body.chat_mode = 'reasoner';
    }

    if (params.thinking_enabled || isExpert) {
      body.thinking_enabled = true;
    }

    const response = await fetch('https://chat.deepseek.com/api/v0/chat/completion', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} - ${text}`);
    }

    return response;
  }

  convertMessages(messages) {
    return messages.map(m => ({
      role: m.role,
      content: m.content
    }));
  }
}
