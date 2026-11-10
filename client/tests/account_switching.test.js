import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);
const { chromium } = require('../node_modules/@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_URL = process.env.API_URL || 'http://localhost:5000';
const SCREENSHOT_DIR = path.resolve(
  process.cwd().endsWith('client')
    ? path.join(process.cwd(), '../docs/screenshots/switch-account')
    : path.join(process.cwd(), 'docs/screenshots/switch-account')
);

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test('Account Switching & Session Replacement End-to-End Suite', async (t) => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  const cookieConsent = JSON.stringify({
    categories: { necessary: true, preferences: true, analytics: false },
    timestamp: new Date().toISOString(),
    version: '1.0',
  });

  // Helper to get fresh tokens
  async function getTokens(email, password, endpoint = '/api/v1/auth/login') {
    const page = await browser.newPage();
    try {
      const res = await page.request.post(`${API_URL}${endpoint}`, {
        data: { email, password },
      });
      const data = await res.json();
      return { token: data.token, user: data.user };
    } finally {
      await page.close();
    }
  }

  // -------------------------------------------------------------------------
  // Test 1: Log in as host, open /admin/login: notice renders; captures screenshots
  // -------------------------------------------------------------------------
  await t.test('Host visiting /admin/login sees notice and captures screenshots (1280 & 360, light & dark)', async () => {
    const hostAuth = await getTokens('host1@chargeshare.in', 'HostPassword123!');

    const viewports = [
      { name: '1280', width: 1280, height: 800 },
      { name: '360', width: 360, height: 740 },
    ];

    for (const vp of viewports) {
      for (const theme of ['light', 'dark']) {
        const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
        await context.addInitScript(
          ({ token, user, themeVal, consent }) => {
            localStorage.setItem('cs_token', token);
            localStorage.setItem('cs_user_hint', JSON.stringify({ name: user.name, role: user.role, email: user.email }));
            localStorage.setItem('theme', themeVal);
            localStorage.setItem('cs_cookie_consent', consent);
            if (themeVal === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          },
          { token: hostAuth.token, user: hostAuth.user, themeVal: theme, consent: cookieConsent }
        );

        const page = await context.newPage();
        try {
          await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(600);

          // Must remain on /admin/login
          assert.ok(page.url().includes('/admin/login'), `Expected to stay on /admin/login but got ${page.url()}`);

          // Notice must be present
          const notice = await page.locator('[data-testid="signed-in-notice"]');
          await notice.waitFor({ state: 'visible', timeout: 5000 });
          const text = await notice.textContent();
          assert.ok(text?.includes('Rajesh Kumar'), `Notice must mention Rajesh Kumar, got ${text}`);
          assert.ok(text?.includes('Host'), `Notice must mention Host role, got ${text}`);
          assert.ok(text?.includes('Signing in as admin will sign you out of this account'), `Expected warning text, got ${text}`);

          // Screenshot capture
          const shotPath = path.join(SCREENSHOT_DIR, `admin_login_notice_${vp.name}_${theme}.png`);
          await page.screenshot({ path: shotPath, fullPage: true });
          assert.ok(fs.existsSync(shotPath), `Screenshot saved at ${shotPath}`);
        } finally {
          await page.close();
          await context.close();
        }
      }
    }
  });

  // -------------------------------------------------------------------------
  // Test 2: Host submits wrong admin credentials: error shown, host session stays intact
  // -------------------------------------------------------------------------
  await t.test('Submitting wrong admin credentials preserves host session', async () => {
    const hostAuth = await getTokens('host1@chargeshare.in', 'HostPassword123!');
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.addInitScript(
      ({ token, user, consent }) => {
        localStorage.setItem('cs_token', token);
        localStorage.setItem('cs_user_hint', JSON.stringify({ name: user.name, role: user.role, email: user.email }));
        localStorage.setItem('cs_cookie_consent', consent);
      },
      { token: hostAuth.token, user: hostAuth.user, consent: cookieConsent }
    );

    const page = await context.newPage();
    try {
      await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);

      await page.fill('#adminEmail', 'admin@chargeshare.in');
      await page.fill('#adminPassword', 'WrongPass123!');
      await page.click('button[type="submit"]');

      await page.waitForSelector('[role="alert"]', { timeout: 6000 });
      const errorText = await page.textContent('[role="alert"]');
      assert.ok(errorText?.includes('Invalid email or password'), `Expected neutral error, got ${errorText}`);

      // Verify host token is still present in localStorage
      const currentToken = await page.evaluate(() => localStorage.getItem('cs_token'));
      assert.strictEqual(currentToken, hostAuth.token, 'Host token must remain intact in localStorage');

      // Reload page and confirm host notice is still there
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);
      const notice = await page.locator('[data-testid="signed-in-notice"]');
      assert.ok(await notice.isVisible(), 'Host session notice must persist after failed attempt');
    } finally {
      await page.close();
      await context.close();
    }
  });

  // -------------------------------------------------------------------------
  // Test 3: Host submits correct admin credentials: replaces session cleanly
  // -------------------------------------------------------------------------
  await t.test('Host submitting correct admin credentials lands on /admin and purges host state', async () => {
    const hostAuth = await getTokens('host1@chargeshare.in', 'HostPassword123!');
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.addInitScript(
      ({ token, user, consent }) => {
        localStorage.setItem('cs_token', token);
        localStorage.setItem('cs_user_hint', JSON.stringify({ name: user.name, role: user.role, email: user.email }));
        localStorage.setItem('cs_cookie_consent', consent);
      },
      { token: hostAuth.token, user: hostAuth.user, consent: cookieConsent }
    );

    const page = await context.newPage();
    try {
      await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);

      await page.fill('#adminEmail', 'admin@chargeshare.in');
      await page.fill('#adminPassword', 'AdminPassword123!');
      await page.click('button[type="submit"]');

      await page.waitForFunction(
        () => window.location.pathname.startsWith('/admin') && !window.location.pathname.includes('/admin/login'),
        { timeout: 8000 }
      );
      assert.ok(page.url().includes('/admin'), `Expected navigation to /admin, got ${page.url()}`);

      // Host tokens must be purged from storage
      const hostTokenInStorage = await page.evaluate(() => localStorage.getItem('cs_token'));
      const hostHintInStorage = await page.evaluate(() => localStorage.getItem('cs_user_hint'));
      const adminTokenInStorage = await page.evaluate(() => localStorage.getItem('cs_admin_token'));

      assert.strictEqual(hostTokenInStorage, null, 'cs_token must be removed');
      assert.strictEqual(hostHintInStorage, null, 'cs_user_hint must be removed');
      assert.ok(adminTokenInStorage, 'cs_admin_token must be active');

      // Visiting /host/dashboard now must redirect away (since user is admin, not host)
      await page.goto(`${BASE_URL}/host/dashboard`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);
      const isRestricted = await page.content();
      assert.ok(
        isRestricted.includes('Admin Account Restriction') || page.url().includes('/admin'),
        'Admin must not access host dashboard'
      );
    } finally {
      await page.close();
      await context.close();
    }
  });

  // -------------------------------------------------------------------------
  // Test 4: Rider visits /admin/login and switches to admin cleanly
  // -------------------------------------------------------------------------
  await t.test('Rider visiting /admin/login sees Rider notice and can switch to admin', async () => {
    const riderAuth = await getTokens('owner1@chargeshare.in', 'OwnerPassword123!');
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.addInitScript(
      ({ token, user, consent }) => {
        localStorage.setItem('cs_token', token);
        localStorage.setItem('cs_user_hint', JSON.stringify({ name: user.name, role: user.role, email: user.email }));
        localStorage.setItem('cs_cookie_consent', consent);
      },
      { token: riderAuth.token, user: riderAuth.user, consent: cookieConsent }
    );

    const page = await context.newPage();
    try {
      await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);

      const notice = await page.locator('[data-testid="signed-in-notice"]');
      assert.ok(await notice.isVisible(), 'Rider notice must be visible');
      const text = await notice.textContent();
      assert.ok(text?.includes('Rider') || text?.includes('EV_OWNER'), 'Notice must identify Rider role');

      await page.fill('#adminEmail', 'admin@chargeshare.in');
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

  // -------------------------------------------------------------------------
  // Test 5: Host visiting /admin/audit sees enhanced 403 page with 3 actions & screenshots
  // -------------------------------------------------------------------------
  await t.test('Host visiting /admin/audit sees 403 page with 3 actions and captures screenshots', async () => {
    const hostAuth = await getTokens('host1@chargeshare.in', 'HostPassword123!');

    const viewports = [
      { name: '1280', width: 1280, height: 800 },
      { name: '360', width: 360, height: 740 },
    ];

    for (const vp of viewports) {
      for (const theme of ['light', 'dark']) {
        const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
        await context.addInitScript(
          ({ token, user, themeVal, consent }) => {
            localStorage.setItem('cs_token', token);
            localStorage.setItem('cs_user_hint', JSON.stringify({ name: user.name, role: user.role, email: user.email }));
            localStorage.setItem('theme', themeVal);
            localStorage.setItem('cs_cookie_consent', consent);
            if (themeVal === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          },
          { token: hostAuth.token, user: hostAuth.user, themeVal: theme, consent: cookieConsent }
        );

        const page = await context.newPage();
        try {
          await page.goto(`${BASE_URL}/admin/audit`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(600);

          // Must show 403 Access Restricted
          const content = await page.content();
          assert.ok(content.includes('Access Restricted (403)'), '403 header must be visible');
          assert.ok(content.includes('Signed in as'), 'Signed in as info must be visible');
          assert.ok(content.includes('Rajesh Kumar'), 'Must show user name');
          assert.ok(content.includes('Host'), 'Must show user role');

          // Verify 3 distinct action buttons
          const signInAdminBtn = page.locator('a:has-text("Sign in as admin")');
          const signOutBtn = page.locator('button:has-text("Sign out")');
          const homeBtn = page.locator('a:has-text("Return to ChargeShare Home")');

          assert.ok(await signInAdminBtn.isVisible(), 'Sign in as admin button must be visible');
          assert.ok(await signOutBtn.isVisible(), 'Sign out button must be visible');
          assert.ok(await homeBtn.isVisible(), 'Return to Home button must be visible');

          // Capture screenshot
          const shotPath = path.join(SCREENSHOT_DIR, `admin_403_page_${vp.name}_${theme}.png`);
          await page.screenshot({ path: shotPath, fullPage: true });
          assert.ok(fs.existsSync(shotPath), `Screenshot saved at ${shotPath}`);

          // Test "Sign in as admin" carries redirect path
          if (vp.name === '1280' && theme === 'light') {
            const href = await signInAdminBtn.getAttribute('href');
            assert.ok(href?.includes('redirect=%2Fadmin%2Faudit') || href?.includes('redirect=/admin/audit'), 'Href must carry redirect query');
          }
        } finally {
          await page.close();
          await context.close();
        }
      }
    }
  });

  // -------------------------------------------------------------------------
  // Test 6: Two tabs: login in tab 1 updates tab 2 immediately via BroadcastChannel
  // -------------------------------------------------------------------------
  await t.test('Multi-tab sync: logging in as admin in tab 1 synchronizes tab 2', async () => {
    const hostAuth = await getTokens('host1@chargeshare.in', 'HostPassword123!');
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.addInitScript(
      ({ token, user, consent }) => {
        localStorage.setItem('cs_token', token);
        localStorage.setItem('cs_user_hint', JSON.stringify({ name: user.name, role: user.role, email: user.email }));
        localStorage.setItem('cs_cookie_consent', consent);
      },
      { token: hostAuth.token, user: hostAuth.user, consent: cookieConsent }
    );

    const tab2 = await context.newPage();
    await tab2.goto(`${BASE_URL}/explore`, { waitUntil: 'domcontentloaded' });
    await tab2.waitForTimeout(600);

    const tab1 = await context.newPage();
    await tab1.goto(`${BASE_URL}/admin/login`, { waitUntil: 'domcontentloaded' });
    await tab1.waitForTimeout(600);

    // Sign in as admin in tab 1
    await tab1.fill('#adminEmail', 'admin@chargeshare.in');
    await tab1.fill('#adminPassword', 'AdminPassword123!');
    await tab1.click('button[type="submit"]');

    await tab1.waitForFunction(
      () => window.location.pathname.startsWith('/admin') && !window.location.pathname.includes('/admin/login'),
      { timeout: 8000 }
    );

    // Tab 2 should now have synchronized state without a manual reload
    await tab2.waitForTimeout(1000);
    const tab2AdminToken = await tab2.evaluate(() => localStorage.getItem('cs_admin_token'));
    const tab2HostToken = await tab2.evaluate(() => localStorage.getItem('cs_token'));

    assert.ok(tab2AdminToken, 'Tab 2 must reflect new admin session');
    assert.strictEqual(tab2HostToken, null, 'Tab 2 must have cleared host session');

    await tab1.close();
    await tab2.close();
    await context.close();
  });

  // -------------------------------------------------------------------------
  // Test 7: Admin visiting /login sees admin switch notice and can switch to rider
  // -------------------------------------------------------------------------
  await t.test('Admin visiting /login sees notice and can switch to rider session', async () => {
    const adminAuth = await getTokens('admin@chargeshare.in', 'AdminPassword123!', '/api/v1/admin/auth/login');
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.addInitScript(
      ({ token, user, consent }) => {
        localStorage.setItem('cs_admin_token', token);
        localStorage.setItem('cs_admin_hint', JSON.stringify({ name: user.name, role: user.role, email: user.email }));
        localStorage.setItem('cs_cookie_consent', consent);
      },
      { token: adminAuth.token, user: adminAuth.user, consent: cookieConsent }
    );

    const page = await context.newPage();
    try {
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);

      // Must stay on /login (not bounced away)
      assert.ok(page.url().includes('/login'), `Expected to stay on /login but got ${page.url()}`);

      // Notice must appear
      const notice = page.locator('[data-testid="admin-signed-in-notice"]');
      await notice.waitFor({ state: 'visible', timeout: 5000 });
      const text = await notice.textContent();
      assert.ok(text?.includes('You are signed in as Admin'), `Notice must say signed in as Admin, got ${text}`);
      assert.ok(text?.includes('Signing in as another user will sign you out of the admin session'), `Notice must explain sign out, got ${text}`);

      // Capture screenshot
      const shotPath = path.join(SCREENSHOT_DIR, 'public_login_admin_notice.png');
      await page.screenshot({ path: shotPath, fullPage: true });
      assert.ok(fs.existsSync(shotPath), `Screenshot saved at ${shotPath}`);

      // Log in as rider
      await page.fill('input[type="email"]', 'owner1@chargeshare.in');
      await page.fill('input[type="password"]', 'OwnerPassword123!');
      await page.click('button[type="submit"]');

      await page.waitForFunction(
        () => !window.location.pathname.includes('/login'),
        { timeout: 8000 }
      );

      // Admin tokens must be cleared
      const adminToken = await page.evaluate(() => localStorage.getItem('cs_admin_token'));
      const riderToken = await page.evaluate(() => localStorage.getItem('cs_token'));

      assert.strictEqual(adminToken, null, 'cs_admin_token must be cleared on rider login');
      assert.ok(riderToken, 'cs_token must be set on rider login');
    } finally {
      await page.close();
      await context.close();
    }
  });

  // -------------------------------------------------------------------------
  // Test 8: Logged-out visit to /admin redirects to /admin/login
  // -------------------------------------------------------------------------
  await t.test('Logged-out visitor to /admin redirects to /admin/login', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);
      assert.ok(page.url().includes('/admin/login'), `Expected redirect to /admin/login, got ${page.url()}`);
    } finally {
      await page.close();
      await context.close();
    }
  });

  await browser.close();
});
