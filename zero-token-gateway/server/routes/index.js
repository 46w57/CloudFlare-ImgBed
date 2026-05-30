import { chatRouter } from './chat.js';
import { modelsRouter } from './models.js';
import { authRouter } from './auth.js';
import { askonceRouter } from './askonce.js';

export function registerRoutes(app) {
  app.use('/v1/chat/completions', chatRouter);
  app.use('/v1/models', modelsRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/askonce', askonceRouter);

  app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', version: '1.0.0' });
  });
}
