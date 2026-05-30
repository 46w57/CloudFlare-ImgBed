export class QwenWebProvider {
  constructor(variant = 'intl') {
    this.variant = variant;
    this.displayName = variant === 'cn' ? 'Qwen Web (China)' : 'Qwen Web (International)';
    this.status = 'tested';
    this.models = [
      { id: 'qwen3.7-max', name: 'Qwen 3.7 Max', contextWindow: 1000000, maxTokens: 384000, reasoning: true },
      { id: 'qwen-max', name: 'Qwen Max', contextWindow: 131072, maxTokens: 8192 },
      { id: 'qwen-plus', name: 'Qwen Plus', contextWindow: 131072, maxTokens: 8192 },
      { id: 'qwen-turbo', name: 'Qwen Turbo', contextWindow: 131072, maxTokens: 8192 }
    ];

    if (variant === 'cn') {
      this.authConfig = {
        url: 'https://tongyi.aliyun.com/qianwen',
        cookieDomains: ['tongyi.aliyun.com', '.aliyun.com'],
        bearerPattern: { urlContains: 'tongyi.aliyun.com' },
        cookieNames: ['login_tongyi', 'token', 'aliyungfjt']
      };
    } else {
      this.authConfig = {
        url: 'https://chat.qwen.ai',
        cookieDomains: ['chat.qwen.ai', '.qwen.ai', '.qwenlm.ai'],
        bearerPattern: { urlContains: 'qwen.ai' },
        cookieNames: ['session', 'token']
      };
    }
  }

  async chat(credentials, params) {
    const { cookie, bearer, userAgent } = credentials;
    const model = params.model || 'qwen3.7-max';

    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      'Cookie': cookie,
      'Accept': 'text/event-stream'
    };
    if (bearer) {
      headers['Authorization'] = `Bearer ${bearer}`;
    }

    let baseUrl;
    if (this.variant === 'cn') {
      baseUrl = 'https://tongyi.aliyun.com/api/qianwen/chat';
    } else {
      baseUrl = 'https://chat.qwen.ai/api/chat/completions';
    }

    const body = {
      model: model,
      messages: this.convertMessages(params.messages),
      stream: params.stream !== false
    };

    if (model === 'qwen3.7-max') {
      body.thinking = { type: 'enabled' };
      body.reasoning_effort = 'high';
    }

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Qwen Web API error: ${response.status} - ${text}`);
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
