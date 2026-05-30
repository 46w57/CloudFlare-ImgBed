import { app, BrowserWindow, ipcMain, session, shell, dialog, Menu } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, '.data');
const CREDENTIALS_DIR = path.join(DATA_DIR, 'credentials');

for (const dir of [DATA_DIR, CREDENTIALS_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

let mainWindow = null;
let serverInstance = null;
let loginWindows = new Map();

async function startServer() {
  const { default: express } = await import('express');
  const { default: cors } = await import('cors');

  const { CredentialStore } = await import('../server/services/credential-store.js');
  const { ProviderRegistry } = await import('../server/providers/index.js');
  const { initAppContext } = await import('../server/services/app-context.js');
  const { registerRoutes } = await import('../server/routes/index.js');

  const credentialStore = new CredentialStore(CREDENTIALS_DIR);
  await credentialStore.load();

  const providerRegistry = new ProviderRegistry();

  const config = {
    gateway: { port: 0, token: 'zero-token-gateway' },
    chrome: { cdpPort: 0 },
    workspace: path.join(DATA_DIR, 'workspace'),
  };

  initAppContext(config, credentialStore, providerRegistry);

  const serverApp = express();
  serverApp.use(cors());
  serverApp.use(express.json({ limit: '10mb' }));

  registerRoutes(serverApp);

  const clientDist = path.join(ROOT_DIR, 'client', 'dist');
  if (fs.existsSync(clientDist)) {
    serverApp.use(express.static(clientDist));
    serverApp.get('*', (req, res) => {
      if (!req.path.startsWith('/api') && !req.path.startsWith('/v1')) {
        res.sendFile(path.join(clientDist, 'index.html'));
      }
    });
  }

  return new Promise((resolve) => {
    const server = serverApp.listen(0, () => {
      const port = server.address().port;
      console.log(`📡 Internal server on port ${port}`);
      resolve({ server, port, credentialStore, providerRegistry, config });
    });
  });
}

function createMainWindow(serverPort) {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'Zero Token Gateway',
    backgroundColor: '#0a0a0f',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(ROOT_DIR, 'assets', 'icon.png'),
  });

  mainWindow.loadURL(`http://localhost:${serverPort}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuTemplate = [
    {
      label: 'Zero Token',
      submenu: [
        { label: 'About Zero Token Gateway', click: () => showAbout() },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Providers',
      submenu: [
        { label: 'Login to DeepSeek', click: () => openLoginWindow('deepseek-web', 'https://chat.deepseek.com') },
        { label: 'Login to Qwen (Intl)', click: () => openLoginWindow('qwen-web', 'https://chat.qwen.ai') },
        { label: 'Login to Qwen (CN)', click: () => openLoginWindow('qwen-cn-web', 'https://tongyi.aliyun.com/qianwen') },
        { label: 'Login to Claude', click: () => openLoginWindow('claude-web', 'https://claude.ai') },
        { label: 'Login to ChatGPT', click: () => openLoginWindow('chatgpt-web', 'https://chatgpt.com') },
        { label: 'Login to Gemini', click: () => openLoginWindow('gemini-web', 'https://gemini.google.com') },
        { label: 'Login to Kimi', click: () => openLoginWindow('kimi-web', 'https://kimi.moonshot.cn') },
        { label: 'Login to Doubao', click: () => openLoginWindow('doubao-web', 'https://www.doubao.com') },
        { label: 'Login to Grok', click: () => openLoginWindow('grok-web', 'https://grok.x.ai') },
        { label: 'Login to GLM', click: () => openLoginWindow('glm-web', 'https://chatglm.cn') },
        { label: 'Login to Xiaomi MiMo', click: () => openLoginWindow('xiaomi-web', 'https://mimo.xiaomi.com') },
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
}

function showAbout() {
  dialog.showMessageBoxSync(mainWindow, {
    type: 'info',
    title: 'About Zero Token Gateway',
    message: 'Zero Token Gateway v1.0.0',
    detail: 'Use LLMs without API tokens.\n\nLog in via browser once, then call\nDeepSeek, Claude, ChatGPT, Gemini,\nQwen, Kimi, and more for free\nthrough a unified gateway.\n\nMIT License'
  });
}

async function openLoginWindow(providerId, url) {
  if (loginWindows.has(providerId)) {
    loginWindows.get(providerId).focus();
    return;
  }

  const loginWin = new BrowserWindow({
    width: 1200,
    height: 800,
    title: `Login - ${providerId}`,
    webPreferences: {
      partition: `persist:${providerId}`,
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  loginWindows.set(providerId, loginWin);

  loginWin.on('closed', () => {
    loginWindows.delete(providerId);
  });

  await loginWin.loadURL(url);
}

async function captureCredentialsFromPartition(providerId, providerConfig) {
  const ses = session.fromPartition(`persist:${providerId}`);
  const { cookieDomains, cookieNames } = providerConfig;

  const cookies = await ses.cookies.get({ domain: cookieDomains[0] });
  const allCookies = [];
  for (const domain of cookieDomains) {
    const domainCookies = await ses.cookies.get({ domain });
    allCookies.push(...domainCookies);
  }

  let cookieStr = '';
  if (cookieNames && cookieNames.length > 0) {
    const relevant = allCookies.filter(c => cookieNames.includes(c.name));
    cookieStr = relevant.map(c => `${c.name}=${c.value}`).join('; ');
  }
  if (!cookieStr && allCookies.length > 0) {
    cookieStr = allCookies.map(c => `${c.name}=${c.value}`).join('; ');
  }

  return {
    cookie: cookieStr,
    bearer: '',
    userAgent: '',
    updatedAt: Date.now()
  };
}

function setupIPC(serverInfo) {
  const { credentialStore, providerRegistry, port } = serverInfo;

  ipcMain.handle('get-server-port', () => port);

  ipcMain.handle('open-login-window', async (event, providerId) => {
    const provider = providerRegistry.get(providerId);
    if (!provider) return { error: 'Provider not found' };
    await openLoginWindow(providerId, provider.authConfig.url);
    return { success: true };
  });

  ipcMain.handle('capture-credentials', async (event, providerId) => {
    const provider = providerRegistry.get(providerId);
    if (!provider) return { error: 'Provider not found' };

    const credentials = await captureCredentialsFromPartition(providerId, provider.authConfig);

    if (!credentials.cookie && !credentials.bearer) {
      return {
        error: 'No credentials captured. Make sure you are logged in to the provider.',
        hint: 'Use Providers menu → Login to open the login window first.'
      };
    }

    credentialStore.save(providerId, credentials);

    if (mainWindow) {
      mainWindow.webContents.send('credentials-updated', { providerId });
    }

    return {
      success: true,
      providerId,
      hasCookie: !!credentials.cookie,
      hasBearer: !!credentials.bearer
    };
  });

  ipcMain.handle('refresh-credentials', async (event, providerId) => {
    const provider = providerRegistry.get(providerId);
    if (!provider) return { error: 'Provider not found' };

    const credentials = await captureCredentialsFromPartition(providerId, provider.authConfig);
    credentialStore.save(providerId, credentials);

    if (mainWindow) {
      mainWindow.webContents.send('credentials-updated', { providerId });
    }

    return { success: true, providerId };
  });

  ipcMain.handle('get-app-version', () => app.getVersion());

  ipcMain.handle('open-external', (event, url) => {
    shell.openExternal(url);
  });
}

app.whenReady().then(async () => {
  try {
    const serverInfo = await startServer();
    serverInstance = serverInfo;

    createMainWindow(serverInfo.port);
    setupIPC(serverInfo);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow(serverInfo.port);
      }
    });
  } catch (err) {
    console.error('Failed to start:', err);
    dialog.showErrorBox('Startup Error', err.message);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverInstance?.server) {
    serverInstance.server.close();
  }
});
