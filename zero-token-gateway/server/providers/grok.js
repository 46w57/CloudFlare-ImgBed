export class GrokWebProvider {
  constructor() {
    this.displayName = 'Grok Web';
    this.status = 'tested';
    this.models = [
      { id: 'grok-1', name: 'Grok 1', contextWindow: 128000, maxTokens: 4096 },
      { id: 'grok-2', name: 'Grok 2', contextWindow: 128000, maxTokens: 4096 }
    ];
    this.authConfig = {
      url: 'https://grok.x.ai',
      cookieDomains: ['grok.x.ai', '.x.ai'],
      bearerPattern: { urlContains: 'grok.x.ai' },
      cookieNames: ['sso', 'sso-rw']
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
      model: params.model || 'grok-2',
      messages: this.convertMessages(params.messages),
      stream: params.stream !== false
    };

    const response = await fetch('https://grok.x.ai/api/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Grok Web API error: ${response.status} - ${text}`);
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
