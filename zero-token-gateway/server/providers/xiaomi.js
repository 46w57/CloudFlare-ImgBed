export class XiaomiWebProvider {
  constructor() {
    this.displayName = 'Xiaomi MiMo Web';
    this.status = 'tested';
    this.models = [
      { id: 'mimo-2.0', name: 'MiMo 2.0', contextWindow: 64000, maxTokens: 4096 },
      { id: 'mimo-2.5-pro', name: 'MiMo 2.5 Pro', contextWindow: 128000, maxTokens: 8192 }
    ];
    this.authConfig = {
      url: 'https://mimo.xiaomi.com',
      cookieDomains: ['mimo.xiaomi.com', '.xiaomi.com'],
      bearerPattern: { urlContains: 'mimo.xiaomi.com' },
      cookieNames: ['session', 'token']
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
      model: params.model || 'mimo-2.5-pro',
      messages: this.convertMessages(params.messages),
      stream: params.stream !== false
    };

    const response = await fetch('https://mimo.xiaomi.com/api/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Xiaomi MiMo API error: ${response.status} - ${text}`);
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
