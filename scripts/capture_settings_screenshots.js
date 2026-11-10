import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { chromium } = require('../client/node_modules/@playwright/test');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const screenshotsDir = path.join(projectRoot, 'docs', 'screenshots');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Obtain auth token
  const res = await page.request.post(`${BASE_URL}/api/v1/auth/login`, {
    data: { email: 'owner1@chargeshare.in', password: 'OwnerPassword123!' },
  });
  const data = await res.json();
  const token = data.token;
  if (!token) throw new Error('Failed to obtain login token');

  const consentPayload = JSON.stringify({
    categories: { necessary: true, preferences: true, analytics: false },
    timestamp: new Date().toISOString(),
    version: '1.0',
  });

  const setupPage = async (viewport, theme) => {
    await page.setViewportSize(viewport);
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(
      ({ tok, thm, consent }) => {
        localStorage.setItem('cs_token', tok);
        localStorage.setItem('cs_theme', thm);
        localStorage.setItem('cs_cookie_consent', consent);
        document.documentElement.setAttribute('data-theme', thm);
      },
      { tok: token, thm: theme, consent: consentPayload }
    );
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1:has-text("Account & Security Settings")');
    await page.waitForTimeout(1000);
  };

  // 1. Desktop Dark
  console.log('Capturing settings-dark-desktop.png...');
  await setupPage({ width: 1280, height: 800 }, 'dark');
  await page.screenshot({
    path: path.join(screenshotsDir, 'settings-dark-desktop.png'),
    fullPage: true,
  });

  // 2. Desktop Light
  console.log('Capturing settings-light-desktop.png...');
  await setupPage({ width: 1280, height: 800 }, 'light');
  await page.screenshot({
    path: path.join(screenshotsDir, 'settings-light-desktop.png'),
    fullPage: true,
  });

  // 3. Mobile Dark (360px)
  console.log('Capturing settings-dark-360px.png...');
  await setupPage({ width: 360, height: 740 }, 'dark');
  await page.screenshot({
    path: path.join(screenshotsDir, 'settings-dark-360px.png'),
    fullPage: true,
  });

  // 4. Mobile Light (360px)
  console.log('Capturing settings-light-360px.png...');
  await setupPage({ width: 360, height: 740 }, 'light');
  await page.screenshot({
    path: path.join(screenshotsDir, 'settings-light-360px.png'),
    fullPage: true,
  });

  await browser.close();
  console.log('All 4 settings screenshots captured successfully!');
}

main().catch((err) => {
  console.error('Screenshot error:', err);
  process.exit(1);
});
