import { Router } from 'express';
import { config, credentialStore, providerRegistry } from '../index.js';
import { StreamHandler } from '../services/stream-handler.js';
import { shouldInjectTools, injectToolPrompt } from '../services/tool-calling.js';

export const chatRouter = Router();

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

    const response = await provider.chat(credentials, params);

    if (stream) {
      await StreamHandler.handleStream(response, res, providerId);
    } else {
      const text = await response.text();
      try {
        const parsed = JSON.parse(text);
        res.json(parsed);
      } catch {
        res.json(StreamHandler.buildNonStreamResponse(text, model));
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
