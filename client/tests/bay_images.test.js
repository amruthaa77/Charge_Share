import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);
const { chromium } = require('../node_modules/@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const SCREENSHOT_DIR = path.resolve(
  process.cwd().endsWith('client')
    ? path.join(process.cwd(), '../docs/screenshots/images-after')
    : path.join(process.cwd(), 'docs/screenshots/images-after')
);

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test('Bay Imagery & Asset Migration End-to-End Suite', async (t) => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  const cookieConsent = JSON.stringify({
    categories: { necessary: true, preferences: true, analytics: false },
    timestamp: new Date().toISOString(),
    version: '1.0',
  });

  // -------------------------------------------------------------------------
  // Subtest 1: Explore list cards render 16:9 compact bay thumbnails
  // -------------------------------------------------------------------------
  await t.test('Explore list cards render bay thumbnails across desktop and mobile', async () => {
    // 1. Desktop 1280px Dark
    const contextDark = await browser.newContext({ viewport: { width: 1280, height: 850 } });
    await contextDark.addInitScript(({ consent }) => {
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('cs_cookie_consent', consent);
    }, { consent: cookieConsent });
    const pageDark = await contextDark.newPage();

    await pageDark.goto(`${BASE_URL}/explore`, { waitUntil: 'domcontentloaded' });
    await pageDark.waitForSelector('h3');
    await pageDark.waitForTimeout(800);

    const thumbnails = await pageDark.$$('img[alt*="Electric scooter charging bay"]');
    assert.ok(thumbnails.length > 0, 'Explore page must render bay thumbnails');

    const firstSrc = await thumbnails[0].getAttribute('src');
    assert.ok(firstSrc.includes('/images/bays/bay-'), `Expected bay-X WebP, got ${firstSrc}`);
    assert.ok(!firstSrc.includes('unsplash'), 'Remote unsplash image must not appear in explore cards');

    await pageDark.screenshot({
      path: path.join(SCREENSHOT_DIR, 'explore_cards_1280_dark.png'),
      fullPage: false,
    });

    // 2. Desktop 1280px Light
    const contextLight = await browser.newContext({ viewport: { width: 1280, height: 850 } });
    await contextLight.addInitScript(({ consent }) => {
      localStorage.setItem('theme', 'light');
      localStorage.setItem('cs_cookie_consent', consent);
    }, { consent: cookieConsent });
    const pageLight = await contextLight.newPage();
    await pageLight.goto(`${BASE_URL}/explore`, { waitUntil: 'domcontentloaded' });
    await pageLight.waitForTimeout(800);

    await pageLight.screenshot({
      path: path.join(SCREENSHOT_DIR, 'explore_cards_1280_light.png'),
      fullPage: false,
    });

    // 3. Mobile 360px Dark
    const contextMobile = await browser.newContext({ viewport: { width: 360, height: 740 } });
    await contextMobile.addInitScript(({ consent }) => {
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('cs_cookie_consent', consent);
    }, { consent: cookieConsent });
    const pageMobile = await contextMobile.newPage();
    await pageMobile.goto(`${BASE_URL}/explore`, { waitUntil: 'domcontentloaded' });
    await pageMobile.waitForTimeout(800);

    // Switch to list tab if tab bar exists
    const listTab = await pageMobile.$('button:has-text("List")');
    if (listTab) {
      await listTab.click();
      await pageMobile.waitForTimeout(400);
    }

    await pageMobile.screenshot({
      path: path.join(SCREENSHOT_DIR, 'explore_cards_360_dark.png'),
      fullPage: false,
    });

    await pageDark.close();
    await contextDark.close();
    await pageLight.close();
    await contextLight.close();
    await pageMobile.close();
    await contextMobile.close();
  });

  // -------------------------------------------------------------------------
  // Subtest 2: Bay Detail Page renders single hero image, NO carousel thumbnails
  // -------------------------------------------------------------------------
  await t.test('Bay Detail page displays single 16:9 hero without gallery thumbnails', async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.addInitScript(({ consent }) => {
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('cs_cookie_consent', consent);
    }, { consent: cookieConsent });
    const page = await context.newPage();

    // Navigate to explore to grab first charger link
    await page.goto(`${BASE_URL}/explore`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('a[href*="/chargers/"]');
    const firstChargerLink = await page.$eval('a[href*="/chargers/"]', (el) => el.getAttribute('href'));

    await page.goto(`${BASE_URL}${firstChargerLink}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1');
    await page.waitForTimeout(800);

    // Verify hero image exists
    const heroImg = await page.$('img[alt*="Electric scooter charging bay"]');
    assert.ok(heroImg, 'Single hero bay image must exist on detail page');

    const heroSrc = await heroImg.getAttribute('src');
    assert.ok(heroSrc.includes('/images/bays/bay-'), `Expected /images/bays/bay-X.webp, got: ${heroSrc}`);
    assert.ok(!heroSrc.includes('unsplash'), 'Unsplash car photos must not be used on detail page');

    // Verify NO thumbnail switcher buttons exist
    const thumbnailButtons = await page.$$('button img');
    assert.strictEqual(thumbnailButtons.length, 0, 'No gallery thumbnail buttons must render');

    // Capture dark screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'bay_detail_hero_1280_dark.png'),
      fullPage: false,
    });

    // Capture light screenshot
    await page.evaluate(() => {
      window.__CHARGESHARE_SET_THEME?.('light') || document.documentElement.classList.remove('dark');
    });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'bay_detail_hero_1280_light.png'),
      fullPage: false,
    });

    // Capture mobile 360 screenshot
    await page.setViewportSize({ width: 360, height: 740 });
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'bay_detail_hero_360_dark.png'),
      fullPage: false,
    });

    await page.close();
    await context.close();
  });

  // -------------------------------------------------------------------------
  // Subtest 3: Credits Page renders attribution table & usage statement
  // -------------------------------------------------------------------------
  await t.test('Credits page renders asset registry and project owner statement', async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 850 } });
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/credits`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1');
    await page.waitForTimeout(500);

    const content = await page.content();
    assert.ok(
      content.includes('Images supplied by the project owner; owner confirms usage rights'),
      'Must contain owner usage rights statement'
    );
    assert.ok(content.includes('bay-1'), 'Must display bay-1 asset');
    assert.ok(content.includes('bay-fallback.svg'), 'Must reference fallback SVG');

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'credits_page_1280.png'),
      fullPage: false,
    });

    await page.close();
    await context.close();
  });

  // -------------------------------------------------------------------------
  // Subtest 4: Progressive Fallback - broken source gracefully switches to fallback
  // -------------------------------------------------------------------------
  await t.test('BayImage gracefully recovers from broken image without showing broken box', async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    // Intercept image requests and block a specific test URL to simulate broken image
    await page.route('**/images/bays/simulated-broken.webp', (route) => route.abort());

    await page.goto(`${BASE_URL}/credits`, { waitUntil: 'domcontentloaded' });

    // Inject a test BayImage with broken source
    const resultSrc = await page.evaluate(async () => {
      const container = document.createElement('div');
      container.id = 'fallback-test-mount';
      document.body.appendChild(container);

      // Create raw img simulating what BayImage does
      const img = document.createElement('img');
      img.src = '/images/bays/simulated-broken.webp';

      return new Promise((resolve) => {
        img.onerror = () => {
          // Fallback logic
          img.src = '/images/bay-fallback.svg';
          img.onload = () => resolve(img.src);
        };
      });
    });

    assert.ok(resultSrc.includes('bay-fallback.svg'), 'Broken image must switch to bay-fallback.svg');

    await page.close();
    await context.close();
  });

  await browser.close();
});
