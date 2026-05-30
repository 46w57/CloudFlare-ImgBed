export class ChatGPTWebProvider {
  constructor() {
    this.displayName = 'ChatGPT Web';
    this.status = 'tested';
    this.models = [
      { id: 'gpt-4', name: 'GPT-4', contextWindow: 128000, maxTokens: 4096 },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', contextWindow: 128000, maxTokens: 4096 },
      { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000, maxTokens: 4096 },
      { id: 'o3', name: 'o3', contextWindow: 128000, maxTokens: 8192, reasoning: true }
    ];
    this.authConfig = {
      url: 'https://chatgpt.com',
      cookieDomains: ['chatgpt.com', '.chatgpt.com', '.openai.com'],
      bearerPattern: { urlContains: 'chatgpt.com' },
      cookieNames: ['__Secure-next-auth.session-token', '_puid']
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
      action: 'next',
      messages: this.convertMessages(params.messages),
      model: params.model || 'gpt-4o',
      stream: params.stream !== false
    };

    const response = await fetch('https://chatgpt.com/backend-api/conversation', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`ChatGPT Web API error: ${response.status} - ${text}`);
    }

    return response;
  }

  convertMessages(messages) {
    return messages.map(m => ({
      id: crypto.randomUUID(),
      author: { role: m.role },
      content: { content_type: 'text', parts: [m.content] }
    }));
  }
}
