export class QwenWebProvider {
  constructor(variant = 'intl') {
    this.variant = variant;
    this.displayName = variant === 'cn' ? 'Qwen Web (China)' : 'Qwen Web (International)';
    this.status = 'tested';
    this.models = [
      { id: 'qwen-max', name: 'Qwen 3.7 Max', contextWindow: 131072, maxTokens: 16384 },
      { id: 'qwen-plus', name: 'Qwen 3.5 Plus', contextWindow: 131072, maxTokens: 8192 },
      { id: 'qwen-turbo', name: 'Qwen 3.5 Turbo', contextWindow: 131072, maxTokens: 8192 }
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
        url: 'https://qwenlm.ai',
        cookieDomains: ['qwenlm.ai', '.qwenlm.ai'],
        bearerPattern: { urlContains: 'qwenlm.ai' },
        cookieNames: ['session', 'token']
      };
    }
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

    const baseUrl = this.variant === 'cn'
      ? 'https://tongyi.aliyun.com/api/qianwen/chat'
      : 'https://qwenlm.ai/api/chat';

    const body = {
      model: params.model || 'qwen-plus',
      messages: this.convertMessages(params.messages),
      stream: params.stream !== false
    };

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
