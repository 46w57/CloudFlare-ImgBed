import { chromium } from 'playwright';

let browser = null;
let context = null;

export async function connectToChrome(cdpPort = 9222) {
  if (browser && browser.isConnected()) {
    return { browser, context };
  }

  try {
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${cdpPort}`);
    const contexts = browser.contexts();
    context = contexts.length > 0 ? contexts[0] : await browser.newContext();
    console.log(`✅ Connected to Chrome via CDP on port ${cdpPort}`);
    return { browser, context };
  } catch (err) {
    console.error(`❌ Failed to connect to Chrome CDP on port ${cdpPort}:`, err.message);
    throw new Error(`Cannot connect to Chrome debug mode on port ${cdpPort}. Please start Chrome with: google-chrome --remote-debugging-port=${cdpPort}`);
  }
}

export async function captureCredentials(cdpPort, providerConfig) {
  const { browser: b, context: ctx } = await connectToChrome(cdpPort);
  const page = await ctx.newPage();

  const { url, cookieDomains, bearerPattern, cookieNames } = providerConfig;

  const captured = { cookie: '', bearer: '', userAgent: '' };

  const requestHandler = async (request) => {
    const headers = request.headers();
    const reqUrl = request.url();

    if (bearerPattern && reqUrl.includes(bearerPattern.urlContains)) {
      const authHeader = headers['authorization'] || '';
      if (authHeader.startsWith('Bearer ')) {
        captured.bearer = authHeader.replace('Bearer ', '');
      }
    }

    const cookieHeader = headers['cookie'] || '';
    if (cookieHeader && cookieDomains.some(d => reqUrl.includes(d))) {
      if (cookieHeader.length > captured.cookie.length) {
        captured.cookie = cookieHeader;
      }
    }
  };

  page.on('request', requestHandler);

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    if (cookieNames && cookieNames.length > 0) {
      const cookies = await ctx.cookies(cookieDomains);
      const relevantCookies = cookies.filter(c => cookieNames.includes(c.name));
      if (relevantCookies.length > 0) {
        captured.cookie = relevantCookies.map(c => `${c.name}=${c.value}`).join('; ');
      }
    }

    captured.userAgent = await page.evaluate(() => navigator.userAgent);

    const hasCredentials = captured.cookie || captured.bearer;
    if (!hasCredentials) {
      console.warn(`⚠️ No credentials captured for ${url}. Make sure you are logged in.`);
    }

    return captured;
  } finally {
    page.off('request', requestHandler);
    await page.close();
  }
}

export async function refreshCredentials(cdpPort, providerConfig) {
  return captureCredentials(cdpPort, providerConfig);
}

export async function disconnectChrome() {
  if (browser) {
    await browser.close();
    browser = null;
    context = null;
  }
}

export function getChromeStatus() {
  return {
    connected: browser?.isConnected() || false
  };
}
