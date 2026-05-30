import { Router } from 'express';
import { getCredentialStore, getProviderRegistry } from '../services/app-context.js';

export const askonceRouter = Router();

askonceRouter.post('/', async (req, res) => {
  try {
    const credentialStore = getCredentialStore();
    const providerRegistry = getProviderRegistry();
    const { message, providers, stream = true } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const configuredProviders = Object.keys(credentialStore.list());
    const targetProviders = providers?.length > 0
      ? providers.filter(p => configuredProviders.includes(p))
      : configuredProviders;

    if (targetProviders.length === 0) {
      return res.status(400).json({ error: 'No configured providers available' });
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      await Promise.allSettled(
        targetProviders.map(async (providerId) => {
          const provider = providerRegistry.get(providerId);
          const credentials = credentialStore.get(providerId);
          if (!provider || !credentials) return;

          const defaultModel = provider.models[0]?.id;
          try {
            const response = await provider.chat(credentials, {
              model: defaultModel,
              messages: [{ role: 'user', content: message }],
              stream: false
            });

            const text = await response.text();
            let content;
            try {
              const parsed = JSON.parse(text);
              content = parsed.choices?.[0]?.message?.content
                || parsed.choices?.[0]?.delta?.content
                || parsed.message?.content
                || text;
            } catch {
              content = text;
            }

            res.write(`data: ${JSON.stringify({
              provider: providerId,
              model: defaultModel,
              content,
              done: true
            })}\n\n`);
          } catch (err) {
            res.write(`data: ${JSON.stringify({
              provider: providerId,
              model: defaultModel,
              error: err.message,
              done: true
            })}\n\n`);
          }
        })
      );

      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      const results = {};

      await Promise.allSettled(
        targetProviders.map(async (providerId) => {
          const provider = providerRegistry.get(providerId);
          const credentials = credentialStore.get(providerId);
          if (!provider || !credentials) return;

          const defaultModel = provider.models[0]?.id;
          try {
            const response = await provider.chat(credentials, {
              model: defaultModel,
              messages: [{ role: 'user', content: message }],
              stream: false
            });

            const text = await response.text();
            let content;
            try {
              const parsed = JSON.parse(text);
              content = parsed.choices?.[0]?.message?.content
                || parsed.choices?.[0]?.delta?.content
                || parsed.message?.content
                || text;
            } catch {
              content = text;
            }

            results[providerId] = { model: defaultModel, content };
          } catch (err) {
            results[providerId] = { model: defaultModel, error: err.message };
          }
        })
      );

      res.json({ results });
    }
  } catch (err) {
    console.error('AskOnce error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});
