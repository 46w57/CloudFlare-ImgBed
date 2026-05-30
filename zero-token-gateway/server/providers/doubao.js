export class DoubaoWebProvider {
  constructor() {
    this.displayName = 'Doubao Web';
    this.status = 'tested';
    this.models = [
      { id: 'doubao-seed-2.0', name: 'Doubao Seed 2.0', contextWindow: 64000, maxTokens: 4096 },
      { id: 'doubao-pro', name: 'Doubao Pro', contextWindow: 64000, maxTokens: 4096 }
    ];
    this.authConfig = {
      url: 'https://www.doubao.com',
      cookieDomains: ['www.doubao.com', '.doubao.com', '.volcengine.com'],
      bearerPattern: { urlContains: 'doubao.com' },
      cookieNames: ['sessionid', 'csrf_token']
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
      model: params.model || 'doubao-seed-2.0',
      messages: this.convertMessages(params.messages),
      stream: params.stream !== false
    };

    const response = await fetch('https://www.doubao.com/api/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Doubao Web API error: ${response.status} - ${text}`);
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
