export class GeminiWebProvider {
  constructor() {
    this.displayName = 'Gemini Web';
    this.status = 'tested';
    this.models = [
      { id: 'gemini-pro', name: 'Gemini Pro', contextWindow: 128000, maxTokens: 8192 },
      { id: 'gemini-ultra', name: 'Gemini Ultra', contextWindow: 128000, maxTokens: 8192 }
    ];
    this.authConfig = {
      url: 'https://gemini.google.com',
      cookieDomains: ['gemini.google.com', '.google.com'],
      bearerPattern: { urlContains: 'gemini.google.com' },
      cookieNames: ['__Secure-1PSID', '__Secure-1PSIDTS', '__Secure-1PSIDCC']
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
      model: params.model || 'gemini-pro',
      messages: this.convertMessages(params.messages),
      stream: params.stream !== false
    };

    const response = await fetch('https://gemini.google.com/api/generate', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini Web API error: ${response.status} - ${text}`);
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
