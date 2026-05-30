export class KimiWebProvider {
  constructor() {
    this.displayName = 'Kimi Web';
    this.status = 'tested';
    this.models = [
      { id: 'moonshot-v1-8k', name: 'Moonshot v1 8K', contextWindow: 8192, maxTokens: 4096 },
      { id: 'moonshot-v1-32k', name: 'Moonshot v1 32K', contextWindow: 32768, maxTokens: 4096 },
      { id: 'moonshot-v1-128k', name: 'Moonshot v1 128K', contextWindow: 131072, maxTokens: 4096 }
    ];
    this.authConfig = {
      url: 'https://kimi.moonshot.cn',
      cookieDomains: ['kimi.moonshot.cn', '.moonshot.cn'],
      bearerPattern: { urlContains: 'kimi.moonshot.cn' },
      cookieNames: ['kimi-chat', 'access_token', 'refresh_token']
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
      model: params.model || 'moonshot-v1-8k',
      messages: this.convertMessages(params.messages),
      stream: params.stream !== false
    };

    const response = await fetch('https://kimi.moonshot.cn/api/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Kimi Web API error: ${response.status} - ${text}`);
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
