import { Router } from 'express';
import { getConfig, getCredentialStore, getProviderRegistry } from '../services/app-context.js';
import { captureCredentials, refreshCredentials, getChromeStatus } from '../cdp/chrome.js';

export const authRouter = Router();

authRouter.get('/providers', (req, res) => {
  const providerRegistry = getProviderRegistry();
  const credentialStore = getCredentialStore();
  const providers = providerRegistry.list();
  const credentials = credentialStore.list();
  res.json({
    providers: providers.map(p => ({
      ...p,
      configured: !!credentials[p.id],
      credentialInfo: credentials[p.id] || null
    }))
  });
});

authRouter.post('/capture', async (req, res) => {
  try {
    const providerRegistry = getProviderRegistry();
    const config = getConfig();
    const credentialStore = getCredentialStore();
    const { providerId } = req.body;
    if (!providerId) {
      return res.status(400).json({ error: 'providerId is required' });
    }

    const provider = providerRegistry.get(providerId);
    if (!provider) {
      return res.status(404).json({ error: `Provider not found: ${providerId}` });
    }

    const cdpPort = config.chrome?.cdpPort || 9222;
    const credentials = await captureCredentials(cdpPort, provider.authConfig);

    if (!credentials.cookie && !credentials.bearer) {
      return res.status(400).json({
        error: 'No credentials captured. Make sure you are logged in to the provider in Chrome debug mode.',
        hint: 'Start Chrome with: google-chrome --remote-debugging-port=9222'
      });
    }

    credentialStore.save(providerId, credentials);

    res.json({
      success: true,
      providerId,
      hasCookie: !!credentials.cookie,
      hasBearer: !!credentials.bearer
    });
  } catch (err) {
    console.error('Auth capture error:', err);
    res.status(500).json({ error: err.message });
  }
});

authRouter.post('/refresh', async (req, res) => {
  try {
    const providerRegistry = getProviderRegistry();
    const config = getConfig();
    const credentialStore = getCredentialStore();
    const { providerId } = req.body;
    if (!providerId) {
      return res.status(400).json({ error: 'providerId is required' });
    }

    const provider = providerRegistry.get(providerId);
    if (!provider) {
      return res.status(404).json({ error: `Provider not found: ${providerId}` });
    }

    const cdpPort = config.chrome?.cdpPort || 9222;
    const credentials = await refreshCredentials(cdpPort, provider.authConfig);
    credentialStore.save(providerId, credentials);

    res.json({
      success: true,
      providerId,
      hasCookie: !!credentials.cookie,
      hasBearer: !!credentials.bearer
    });
  } catch (err) {
    console.error('Auth refresh error:', err);
    res.status(500).json({ error: err.message });
  }
});

authRouter.delete('/:providerId', (req, res) => {
  const credentialStore = getCredentialStore();
  const { providerId } = req.params;
  credentialStore.remove(providerId);
  res.json({ success: true });
});

authRouter.get('/chrome-status', (req, res) => {
  res.json(getChromeStatus());
});

authRouter.get('/credentials', (req, res) => {
  const credentialStore = getCredentialStore();
  const list = credentialStore.list();
  res.json(list);
});
