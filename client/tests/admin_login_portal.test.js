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
    ? path.join(process.cwd(), '../docs/screenshots/admin-login')
    : path.join(process.cwd(), 'docs/screenshots/admin-login')
);

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test('Dedicated Admin Login Portal & Security End-to-End Suite', async (t) => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  const cookieConsent = JSON.stringify({
    categories: { necessary: true, preferences: true, analytics: false },
    timestamp: new Date().toISOString(),
    version: '1.0',
  });

  // Test 1: /admin/login renders without public navbar, demo controls or register link
  await t.test('/admin/login renders isolated minimal UI with no public navbar or demo buttons', async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    try {
      await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);

      // Verify Title
      const pageTitle = await page.textContent('h1');
      assert.ok(pageTitle?.includes('Admin sign in'), `Expected "Admin sign in" but got "${pageTitle}"`);

      // Verify no register link
      const registerLinks = await page.$$('a[href="/register"]');
      assert.strictEqual(registerLinks.length, 0, 'Should not render any /register link');

      // Verify no forgot password link
      const forgotLinks = await page.$$('a[href="/forgot-password"]');
      assert.strictEqual(forgotLinks.length, 0, 'Should not render any /forgot-password link');

      // Verify no demo buttons
      const demoButtons = await page.$$('button:has-text("Demo"), button:has-text("Rider"), button:has-text("Host")');
      assert.strictEqual(demoButtons.length, 0, 'Should not render any demo persona buttons');

      // Verify no public navbar (e.g. "Find Bays", "Become a Host")
      const navLinks = await page.$$('nav a:has-text("Find Bays"), nav a:has-text("Become a Host")');
      assert.strictEqual(navLinks.length, 0, 'Public navbar must be absent');
    } finally {
      await page.close();
      await context.close();
    }
  });

  // Test 2: Logged-out visit to /admin redirects to /admin/login
  await t.test('Logged-out visitor to /admin redirects to /admin/login', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);
      assert.ok(page.url().includes('/admin/login'), `Expected redirect to /admin/login but got ${page.url()}`);
    } finally {
      await page.close();
      await context.close();
    }
  });

  // Test 3: Logged-in rider visiting /admin sees friendly 403 Forbidden page
  await t.test('Rider accessing /admin sees friendly 403 Forbidden screen', async () => {
    // Acquire rider token
    const authPage = await browser.newPage();
    let riderToken = null;
    try {
      const res = await authPage.request.post(`${BASE_URL}/api/v1/auth/login`, {
        data: { email: 'owner1@chargeshare.in', password: 'OwnerPassword123!' },
      });
      const data = await res.json();
      riderToken = data.token;
    } finally {
      await authPage.close();
    }

    const context = await browser.newContext();
    await context.addInitScript(
      ({ token, consent }) => {
        localStorage.setItem('cs_token', token);
        localStorage.setItem('cs_cookie_consent', consent);
        localStorage.setItem(
          'cs_user_hint',
          JSON.stringify({ name: 'Rider User', role: 'EV_OWNER', email: 'owner1@chargeshare.in' })
        );
      },
      { token: riderToken, consent: cookieConsent }
    );

    const page = await context.newPage();
    try {
      await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);

      const content = await page.content();
      assert.ok(
        content.includes('403') || content.includes('Access Restricted'),
        'Rider must see 403 Forbidden screen on /admin'
      );
    } finally {
      await page.close();
      await context.close();
    }
  });

  // Test 4: Logged-in rider visiting /admin/login can access the portal and switch to admin without being bounced away
  await t.test('Logged-in rider visiting /admin/login can view portal and sign in as admin', async () => {
    const authPage = await browser.newPage();
    let riderToken = null;
    try {
      const res = await authPage.request.post(`${BASE_URL}/api/v1/auth/login`, {
        data: { email: 'owner1@chargeshare.in', password: 'OwnerPassword123!' },
      });
      const data = await res.json();
      riderToken = data.token;
    } finally {
      await authPage.close();
    }

    const context = await browser.newContext();
    await context.addInitScript(
      ({ token, consent }) => {
        localStorage.setItem('cs_token', token);
        localStorage.setItem('cs_cookie_consent', consent);
        localStorage.setItem(
          'cs_user_hint',
          JSON.stringify({ name: 'Rider User', role: 'EV_OWNER', email: 'owner1@chargeshare.in' })
        );
      },
      { token: riderToken, consent: cookieConsent }
    );

    const page = await context.newPage();
    try {
      await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);

      // Must NOT redirect away to /explore
      assert.ok(
        page.url().includes('/admin/login'),
        `Expected to stay on /admin/login but was redirected to ${page.url()}`
      );

      // Must render admin sign in form
      const emailInput = page.locator('#adminEmail');
      await emailInput.waitFor({ state: 'visible', timeout: 5000 });
      assert.ok(await emailInput.isVisible(), 'Admin email input must be visible for logged-in rider');

      // Rider can submit admin credentials to switch directly to admin session
      await emailInput.fill('admin@chargeshare.in');
      await page.fill('#adminPassword', 'AdminPassword123!');
      await page.click('button[type="submit"]');

      await page.waitForFunction(
        () => window.location.pathname.startsWith('/admin') && !window.location.pathname.includes('/admin/login'),
        { timeout: 8000 }
      );
      assert.ok(page.url().includes('/admin'), `Expected navigation to /admin, got ${page.url()}`);
    } finally {
      await page.close();
      await context.close();
    }
  });

  // Test 5: Wrong password displays neutral error message
  await t.test('Wrong credentials show neutral error message on /admin/login', async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    try {
      await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);

      await page.fill('#adminEmail', 'admin@chargeshare.in');
      await page.fill('#adminPassword', 'WrongPassword123!');
      await page.click('button[type="submit"]');

      await page.waitForSelector('[role="alert"]', { timeout: 6000 });
      const alertText = await page.textContent('[role="alert"]');
      assert.ok(
        alertText?.includes('Invalid email or password') || alertText?.includes('locked'),
        `Expected neutral invalid credentials error but got "${alertText}"`
      );
    } finally {
      await page.close();
      await context.close();
    }
  });

  // Test 6: Capture Visual Screenshots across viewports (1280px & 360px) and themes (dark & light)
  await t.test('Capture Visual Screenshots of /admin/login in Light & Dark (1280 & 360)', async () => {
    const viewports = [
      { name: '1280', width: 1280, height: 800 },
      { name: '360', width: 360, height: 740 },
    ];

    for (const vp of viewports) {
      for (const theme of ['light', 'dark']) {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
        });

        await context.addInitScript(
          ({ themeVal, consent }) => {
            localStorage.setItem('theme', themeVal);
            localStorage.setItem('cs_cookie_consent', consent);
            if (themeVal === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          },
          { themeVal: theme, consent: cookieConsent }
        );

        const page = await context.newPage();
        try {
          await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(600);

          if (theme === 'dark') {
            await page.evaluate(() => document.documentElement.classList.add('dark'));
          } else {
            await page.evaluate(() => document.documentElement.classList.remove('dark'));
          }
          await page.waitForTimeout(400);

          const shotPath = path.join(SCREENSHOT_DIR, `admin_login_${vp.name}_${theme}.png`);
          await page.screenshot({ path: shotPath, fullPage: true });
          assert.ok(fs.existsSync(shotPath), `Screenshot saved at ${shotPath}`);
        } finally {
          await page.close();
          await context.close();
        }
      }
    }
  });

  // Test 7: Capture First-Login Forced Password Rotation Screen
  await t.test('Capture First-Login Password Change Modal Screenshot', async () => {
    // Acquire admin token
    const authPage = await browser.newPage();
    let adminToken = null;
    try {
      const res = await authPage.request.post(`${BASE_URL}/api/v1/admin/auth/login`, {
        data: { email: 'admin@chargeshare.in', password: 'AdminPassword123!' },
      });
      const data = await res.json();
      adminToken = data.token;
    } finally {
      await authPage.close();
    }

    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.addInitScript(
      ({ token, consent }) => {
        localStorage.setItem('cs_token', token);
        localStorage.setItem('cs_cookie_consent', consent);
        localStorage.setItem(
          'cs_user_hint',
          JSON.stringify({
            name: 'Platform Administrator',
            role: 'ADMIN',
            email: 'admin@chargeshare.in',
            mustChangePassword: true,
          })
        );
      },
      { token: adminToken, consent: cookieConsent }
    );

    const page = await context.newPage();
    try {
      await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);

      const shotPath = path.join(SCREENSHOT_DIR, 'admin_first_login_password_change.png');
      await page.screenshot({ path: shotPath, fullPage: false });
      assert.ok(fs.existsSync(shotPath), `Screenshot saved at ${shotPath}`);
    } finally {
      await page.close();
      await context.close();
    }
  });

  await browser.close();
});
