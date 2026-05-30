export class StreamHandler {
  static async handleStream(response, res, provider) {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('text/event-stream') || contentType.includes('application/octet-stream')) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') {
                res.write('data: [DONE]\n\n');
                continue;
              }
              try {
                const parsed = JSON.parse(data);
                const normalized = StreamHandler.normalizeChunk(parsed, provider);
                res.write(`data: ${JSON.stringify(normalized)}\n\n`);
              } catch {
                res.write(`data: ${data}\n\n`);
              }
            }
          }
        }
      } catch (err) {
        console.error('Stream error:', err.message);
      } finally {
        res.end();
      }
    } else {
      const text = await response.text();
      try {
        const parsed = JSON.parse(text);
        res.json(parsed);
      } catch {
        res.send(text);
      }
    }
  }

  static normalizeChunk(chunk, provider) {
    switch (provider) {
      case 'deepseek-web':
        return StreamHandler.normalizeDeepSeek(chunk);
      case 'claude-web':
        return StreamHandler.normalizeClaude(chunk);
      case 'chatgpt-web':
        return StreamHandler.normalizeChatGPT(chunk);
      case 'gemini-web':
        return StreamHandler.normalizeGemini(chunk);
      case 'qwen-web':
      case 'qwen-cn-web':
        return StreamHandler.normalizeQwen(chunk);
      case 'kimi-web':
        return StreamHandler.normalizeKimi(chunk);
      case 'doubao-web':
        return StreamHandler.normalizeDoubao(chunk);
      case 'grok-web':
        return StreamHandler.normalizeGrok(chunk);
      case 'glm-web':
      case 'glm-intl-web':
        return StreamHandler.normalizeGLM(chunk);
      case 'xiaomi-web':
        return StreamHandler.normalizeXiaomi(chunk);
      default:
        return chunk;
    }
  }

  static normalizeDeepSeek(chunk) {
    if (chunk.choices?.[0]?.delta) {
      return {
        id: chunk.id || 'chatcmpl-zero',
        object: 'chat.completion.chunk',
        created: chunk.created || Math.floor(Date.now() / 1000),
        model: chunk.model || 'deepseek-web',
        choices: [{
          index: 0,
          delta: { content: chunk.choices[0].delta.content || '' },
          finish_reason: chunk.choices[0].finish_reason || null
        }]
      };
    }
    return chunk;
  }

  static normalizeClaude(chunk) {
    if (chunk.type === 'content_block_delta') {
      return {
        id: 'chatcmpl-claude',
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: 'claude-web',
        choices: [{
          index: 0,
          delta: { content: chunk.delta?.text || '' },
          finish_reason: null
        }]
      };
    }
    if (chunk.type === 'message_stop') {
      return {
        id: 'chatcmpl-claude',
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: 'claude-web',
        choices: [{ index: 0, delta: {}, finish_reason: 'stop' }]
      };
    }
    return null;
  }

  static normalizeChatGPT(chunk) {
    if (chunk.message?.content?.parts) {
      return {
        id: chunk.message_id || 'chatcmpl-gpt',
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: 'chatgpt-web',
        choices: [{
          index: 0,
          delta: { content: chunk.message.content.parts.join('') },
          finish_reason: null
        }]
      };
    }
    return chunk;
  }

  static normalizeGemini(chunk) {
    return chunk;
  }

  static normalizeQwen(chunk) {
    if (chunk.choices?.[0]?.delta) {
      return {
        id: chunk.id || 'chatcmpl-qwen',
        object: 'chat.completion.chunk',
        created: chunk.created || Math.floor(Date.now() / 1000),
        model: 'qwen-web',
        choices: [{
          index: 0,
          delta: { content: chunk.choices[0].delta.content || '' },
          finish_reason: chunk.choices[0].finish_reason || null
        }]
      };
    }
    return chunk;
  }

  static normalizeKimi(chunk) {
    return chunk;
  }

  static normalizeDoubao(chunk) {
    return chunk;
  }

  static normalizeGrok(chunk) {
    return chunk;
  }

  static normalizeGLM(chunk) {
    return chunk;
  }

  static normalizeXiaomi(chunk) {
    return chunk;
  }

  static buildNonStreamResponse(content, model) {
    return {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{
        index: 0,
        message: { role: 'assistant', content },
        finish_reason: 'stop'
      }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    };
  }
}
