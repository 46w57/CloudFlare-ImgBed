import { Router } from 'express';
import { config, credentialStore, providerRegistry } from '../index.js';
import { StreamHandler } from '../services/stream-handler.js';
import { shouldInjectTools, injectToolPrompt, parseToolCall, executeToolCall } from '../services/tool-calling.js';

export const chatRouter = Router();

const MAX_TOOL_ROUNDS = 3;

chatRouter.post('/', async (req, res) => {
  try {
    const { model, messages, stream = true, temperature, max_tokens } = req.body;

    if (!model) {
      return res.status(400).json({ error: { message: 'model is required', type: 'invalid_request_error' } });
    }
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: { message: 'messages is required', type: 'invalid_request_error' } });
    }

    const resolved = providerRegistry.resolveModel(model);
    if (!resolved) {
      return res.status(400).json({ error: { message: `Unknown model: ${model}`, type: 'invalid_request_error' } });
    }

    const { providerId, modelId, provider } = resolved;

    const credentials = credentialStore.get(providerId);
    if (!credentials) {
      return res.status(401).json({
        error: {
          message: `No credentials found for ${providerId}. Please run onboarding first.`,
          type: 'authentication_error'
        }
      });
    }

    let processedMessages = [...messages];

    if (shouldInjectTools(messages)) {
      const systemMsg = processedMessages.find(m => m.role === 'system');
      const toolPrompt = injectToolPrompt(systemMsg?.content);
      if (systemMsg) {
        processedMessages = processedMessages.map(m =>
          m.role === 'system' ? { ...m, content: toolPrompt } : m
        );
      } else {
        processedMessages.unshift({ role: 'system', content: toolPrompt });
      }
    }

    const params = {
      model: modelId,
      messages: processedMessages,
      stream,
      temperature,
      max_tokens
    };

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      await handleStreamWithTools(provider, credentials, params, res, providerId, model);
    } else {
      let fullContent = '';
      let toolRounds = 0;

      while (toolRounds < MAX_TOOL_ROUNDS) {
        const response = await provider.chat(credentials, { ...params, stream: false, messages: processedMessages });
        const text = await response.text();
        let content;
        try {
          const parsed = JSON.parse(text);
          content = parsed.choices?.[0]?.message?.content || text;
        } catch {
          content = text;
        }

        const toolCall = parseToolCall(content);
        if (!toolCall) {
          try {
            const parsed = JSON.parse(text);
            return res.json(parsed);
          } catch {
            return res.json(StreamHandler.buildNonStreamResponse(content, model));
          }
        }

        const toolResult = await executeToolCall(toolCall, config.workspace);
        processedMessages.push({ role: 'assistant', content });
        processedMessages.push({
          role: 'user',
          content: `[Tool Result for ${toolCall.tool_name}]: ${toolResult.result}\n\nPlease continue your response based on this tool result.`
        });

        toolRounds++;
      }

      const finalResponse = await provider.chat(credentials, { ...params, stream: false, messages: processedMessages });
      const finalText = await finalResponse.text();
      try {
        const parsed = JSON.parse(finalText);
        res.json(parsed);
      } catch {
        res.json(StreamHandler.buildNonStreamResponse(finalText, model));
      }
    }
  } catch (err) {
    console.error('Chat error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: { message: err.message, type: 'server_error' }
      });
    } else {
      res.write(`data: ${JSON.stringify({ error: { message: err.message } })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
});

async function handleStreamWithTools(provider, credentials, params, res, providerId, model) {
  let toolRounds = 0;
  let currentMessages = [...params.messages];

  while (toolRounds < MAX_TOOL_ROUNDS) {
    const response = await provider.chat(credentials, {
      ...params,
      stream: true,
      messages: currentMessages
    });

    let fullContent = '';
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('text/event-stream') || contentType.includes('application/octet-stream')) {
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
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                const contentChunk = parsed.choices?.[0]?.delta?.content
                  || parsed.delta?.text
                  || '';
                fullContent += contentChunk;
              } catch {}
              try {
                const normalized = StreamHandler.normalizeChunk(
                  JSON.parse(data),
                  providerId
                );
                if (normalized) {
                  res.write(`data: ${JSON.stringify(normalized)}\n\n`);
                }
              } catch {}
            }
          }
        }
      } catch (err) {
        console.error('Stream read error:', err.message);
      }
    } else {
      const text = await response.text();
      try {
        const parsed = JSON.parse(text);
        fullContent = parsed.choices?.[0]?.message?.content || text;
      } catch {
        fullContent = text;
      }
      res.write(`data: ${JSON.stringify(StreamHandler.buildNonStreamResponse(fullContent, model))}\n\n`);
    }

    const toolCall = parseToolCall(fullContent);
    if (!toolCall) {
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    const toolResult = await executeToolCall(toolCall, config.workspace);

    res.write(`data: ${JSON.stringify({
      id: `tool-${Date.now()}`,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{
        index: 0,
        delta: { content: `\n\n${toolResult.display}\n\n` },
        finish_reason: null
      }]
    })}\n\n`);

    currentMessages.push({ role: 'assistant', content: fullContent });
    currentMessages.push({
      role: 'user',
      content: `[Tool Result for ${toolCall.tool_name}]: ${toolResult.result}\n\nPlease continue your response based on this tool result.`
    });

    toolRounds++;
  }

  res.write('data: [DONE]\n\n');
  res.end();
}
