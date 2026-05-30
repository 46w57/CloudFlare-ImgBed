import { Router } from 'express';
import { providerRegistry, credentialStore } from '../index.js';

export const modelsRouter = Router();

modelsRouter.get('/', (req, res) => {
  const allModels = providerRegistry.listModels();
  const credentials = credentialStore.list();

  const data = allModels.map(m => ({
    id: m.id,
    object: 'model',
    created: Math.floor(Date.now() / 1000),
    owned_by: m.provider,
    permission: [],
    root: m.provider,
    parent: null,
    configured: !!credentials[m.provider]
  }));

  res.json({
    object: 'list',
    data
  });
});
