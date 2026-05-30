import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { CredentialStore } from './services/credential-store.js';
import { ProviderRegistry } from './providers/index.js';
import { initAppContext } from './services/app-context.js';
import { registerRoutes } from './routes/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, '.data');
const CREDENTIALS_DIR = path.join(DATA_DIR, 'credentials');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');

for (const dir of [DATA_DIR, CREDENTIALS_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const DEFAULT_CONFIG = {
  gateway: {
    port: 3001,
    token: 'zero-token-gateway'
  },
  chrome: {
    cdpPort: 9222,
    userDataDir: path.join(DATA_DIR, 'chrome-profile')
  },
  providers: {}
};

function loadConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) };
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
  return DEFAULT_CONFIG;
}

export const config = loadConfig();
export const credentialStore = new CredentialStore(CREDENTIALS_DIR);
export const providerRegistry = new ProviderRegistry();

initAppContext(config, credentialStore, providerRegistry);

async function main() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  await credentialStore.load();

  registerRoutes(app);

  const clientDist = path.join(ROOT_DIR, 'client', 'dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api') && !req.path.startsWith('/v1')) {
        res.sendFile(path.join(clientDist, 'index.html'));
      }
    });
  }

  const port = config.gateway.port || 3001;
  app.listen(port, () => {
    console.log(`\n🚀 Zero Token Gateway running at http://localhost:${port}`);
    console.log(`📡 API endpoint: http://localhost:${port}/v1/chat/completions`);
    console.log(`🔑 Gateway token: ${config.gateway.token}\n`);
  });
}

main().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
