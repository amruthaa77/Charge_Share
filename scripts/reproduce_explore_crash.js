import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const { chromium } = require('../client/node_modules/@playwright/test');

async function reproduce() {
  console.log('Launching headless Chrome in fresh incognito context...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  const consoleLogs = [];
  const networkRequests = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    const text = msg.text();
    const type = msg.type();
    consoleLogs.push({ time: Date.now(), type, text });
    console.log(`[Browser ${type.toUpperCase()}]`, text);
  });

  page.on('pageerror', (err) => {
    pageErrors.push({
      time: Date.now(),
      message: err.message,
      stack: err.stack,
    });
    console.error('[Browser PageError]', err.message, err.stack);
  });

  page.on('request', (req) => {
    networkRequests.push({
      id: req._url + Date.now(),
      url: req.url(),
      method: req.method(),
      startTime: Date.now(),
    });
  });

  page.on('response', async (res) => {
    const matching = networkRequests.find((r) => r.url === res.url());
    const timing = matching ? Date.now() - matching.startTime : 0;
    let body = '';
    try {
      body = await res.text();
    } catch {
      body = '<binary or inaccessible>';
    }
    console.log(`[Network ${res.status()}] ${res.url()} (${timing}ms)`);
    if (matching) {
      matching.status = res.status();
      matching.timing = timing;
      matching.responseBody = body.slice(0, 500);
    }
  });

  console.log('Navigating to http://localhost:5173/explore...');
  const startTime = Date.now();
  await page.goto('http://localhost:5173/explore', { waitUntil: 'domcontentloaded' });

  // Record at intervals
  const timeline = [];
  for (let s = 0; s <= 6; s++) {
    const elapsed = Date.now() - startTime;
    const isErrorBoundary = await page.evaluate(() => {
      return document.body.innerText.includes('Charging View Interrupted');
    });
    const textSnippet = await page.evaluate(() => {
      const h1 = document.querySelector('h1')?.innerText || '';
      const h2 = document.querySelector('h2')?.innerText || '';
      return { h1, h2, title: document.title };
    });

    timeline.push({
      second: s,
      elapsedMs: elapsed,
      isErrorBoundary,
      textSnippet,
    });

    console.log(`[Timeline ${s}s (${elapsed}ms)] ErrorBoundary: ${isErrorBoundary} | Heading: "${textSnippet.h1 || textSnippet.h2}"`);
    await page.waitForTimeout(1000);
  }

  await browser.close();

  const report = {
    timeline,
    consoleLogs,
    pageErrors,
    networkRequests,
  };

  fs.writeFileSync(
    path.join(__dirname, '..', 'docs', 'explore_crash_raw.json'),
    JSON.stringify(report, null, 2),
    'utf-8'
  );
  console.log('Saved raw crash report to docs/explore_crash_raw.json');
}

reproduce().catch(console.error);
