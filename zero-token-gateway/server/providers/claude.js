export class ClaudeWebProvider {
  constructor() {
    this.displayName = 'Claude Web';
    this.status = 'tested';
    this.models = [
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', contextWindow: 195000, maxTokens: 8192 },
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', contextWindow: 195000, maxTokens: 8192 },
      { id: 'claude-haiku-4-6', name: 'Claude Haiku 4.6', contextWindow: 195000, maxTokens: 8192 }
    ];
    this.authConfig = {
      url: 'https://claude.ai',
      cookieDomains: ['claude.ai', '.claude.ai', '.anthropic.com'],
      bearerPattern: { urlContains: 'claude.ai' },
      cookieNames: ['sessionKey', '__cf_bm', 'cf_clearance']
    };
  }

  async chat(credentials, params) {
    const { cookie, bearer, userAgent } = credentials;
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Cookie': cookie,
      'Accept': 'text/event-stream'
    };
    if (bearer) {
      headers['Authorization'] = `Bearer ${bearer}`;
    }

    const body = {
      model: params.model || 'claude-sonnet-4-6',
      messages: this.convertMessages(params.messages),
      stream: params.stream !== false
    };

    const response = await fetch('https://claude.ai/api/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Claude Web API error: ${response.status} - ${text}`);
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
