export class GLMWebProvider {
  constructor(variant = 'cn') {
    this.variant = variant;
    this.displayName = variant === 'cn' ? 'GLM Web (Zhipu)' : 'GLM Web (International)';
    this.status = 'tested';
    this.models = [
      { id: 'glm-4-plus', name: 'GLM-4 Plus', contextWindow: 128000, maxTokens: 4096 },
      { id: 'glm-4-think', name: 'GLM-4 Think', contextWindow: 128000, maxTokens: 8192, reasoning: true }
    ];

    if (variant === 'cn') {
      this.authConfig = {
        url: 'https://chatglm.cn',
        cookieDomains: ['chatglm.cn', '.chatglm.cn'],
        bearerPattern: { urlContains: 'chatglm.cn' },
        cookieNames: ['chatglm_token', 'csrf_token']
      };
    } else {
      this.authConfig = {
        url: 'https://chatglm.com',
        cookieDomains: ['chatglm.com', '.chatglm.com'],
        bearerPattern: { urlContains: 'chatglm.com' },
        cookieNames: ['chatglm_token', 'csrf_token']
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
      ? 'https://chatglm.cn/api/chat/completions'
      : 'https://chatglm.com/api/chat/completions';

    const body = {
      model: params.model || 'glm-4-plus',
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
      throw new Error(`GLM Web API error: ${response.status} - ${text}`);
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
