export class DeepSeekWebProvider {
  constructor() {
    this.displayName = 'DeepSeek Web';
    this.status = 'tested';
    this.models = [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', contextWindow: 64000, maxTokens: 4096 },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', contextWindow: 64000, maxTokens: 8192, reasoning: true },
      { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro (Expert)', contextWindow: 128000, maxTokens: 16384, reasoning: true, expert: true }
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
      'User-Agent': userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Cookie': cookie
    };
    if (bearer) {
      headers['Authorization'] = `Bearer ${bearer}`;
    }

    const body = {
      chat_mode: 'normal',
      model: params.model || 'deepseek-chat',
      messages: this.convertMessages(params.messages),
      stream: params.stream !== false
    };

    if (params.model === 'deepseek-reasoner') {
      body.chat_mode = 'reasoner';
    }

    if (params.model === 'deepseek-v4-pro') {
      body.chat_mode = 'expert';
      body.model = 'deepseek-v4-pro';
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
