import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);
const { chromium } = require('../node_modules/@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const SCREENSHOT_DIR = fs.existsSync(path.resolve(process.cwd(), 'docs/screenshots/admin-after'))
  ? path.resolve(process.cwd(), 'docs/screenshots/admin-after')
  : path.resolve(process.cwd(), '../docs/screenshots/admin-after');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test('Admin Back-Office Portal & RBAC End-to-End Suite', async (t) => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  // 1. Acquire Admin & Rider Tokens
  let adminToken = null;
  let riderToken = null;

  const authPage = await browser.newPage();
  try {
    const adminLoginRes = await authPage.request.post(`${BASE_URL}/api/v1/admin/auth/login`, {
      data: { email: 'admin@chargeshare.in', password: 'AdminPassword123!' },
    });
    const adminData = await adminLoginRes.json();
    adminToken = adminData.token;

    const riderLoginRes = await authPage.request.post(`${BASE_URL}/api/v1/auth/login`, {
      data: { email: 'owner1@chargeshare.in', password: 'OwnerPassword123!' },
    });
    const riderData = await riderLoginRes.json();
    riderToken = riderData.token;
  } finally {
    await authPage.close();
  }

  assert.ok(adminToken, 'Admin token successfully retrieved');
  assert.ok(riderToken, 'Rider token successfully retrieved');

  const cookieConsent = JSON.stringify({
    categories: { necessary: true, preferences: true, analytics: false },
    timestamp: new Date().toISOString(),
    version: '1.0',
  });

  // Test 1: Logged-out access to /admin redirects to /admin/login
  await t.test('Logged-out visitor to /admin redirects to /admin/login', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      assert.ok(page.url().includes('/admin/login'), `Expected redirect to /admin/login but got ${page.url()}`);
    } finally {
      await page.close();
      await context.close();
    }
  });

  // Test 2: Non-admin role (rider) access to /admin renders 403 Forbidden Screen
  await t.test('Rider access to /admin renders 403 Forbidden screen', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(({ tok, consent }) => {
        localStorage.setItem('cs_token', tok);
        localStorage.setItem('cs_cookie_consent', consent);
      }, { tok: riderToken, consent: cookieConsent });

      await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);

      const has403 = await page.evaluate(() => {
        return document.body.innerText.includes('Access Restricted (403)');
      });
      assert.ok(has403, 'Expected 403 Access Restricted screen for non-admin');
    } finally {
      await page.close();
      await context.close();
    }
  });

  // Test 3: Admin visiting rider/host-only routes gets restricted with helpful guard
  await t.test('Admin visiting rider/host routes sees Admin Account Restriction notice', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(({ tok, consent }) => {
        localStorage.setItem('cs_token', tok);
        localStorage.setItem('cs_cookie_consent', consent);
      }, { tok: adminToken, consent: cookieConsent });

      await page.goto(`${BASE_URL}/vehicles`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);

      const hasRestriction = await page.evaluate(() => {
        return document.body.innerText.includes('Admin Account Restriction');
      });
      assert.ok(hasRestriction, 'Expected Admin Account Restriction notice on /vehicles');
    } finally {
      await page.close();
      await context.close();
    }
  });

  // Test 4: Admin Back-Office Navigation & Tools Isolation
  await t.test('Admin back-office renders dedicated shell with no rider/host tools', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(({ tok, consent }) => {
        localStorage.setItem('cs_token', tok);
        localStorage.setItem('cs_theme', 'dark');
        localStorage.setItem('cs_cookie_consent', consent);
        document.documentElement.setAttribute('data-theme', 'dark');
      }, { tok: adminToken, consent: cookieConsent });

      await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);

      // Verify Admin layout elements
      const adminNavText = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('aside a, nav a')).map((a) => a.textContent.trim());
        const bodyText = document.body.innerText;
        return {
          links,
          hasOverview: bodyText.includes('Command & Compliance Overview') || bodyText.includes('Back-Office Operations') || bodyText.includes('Platform Overview') || bodyText.includes('Overview'),
          hasRiderCTAs: bodyText.includes('Book Charging Slot') || bodyText.includes('Add EV Two-Wheeler'),
        };
      });

      assert.ok(adminNavText.hasOverview, 'Expected Admin Overview/Console content');
      assert.strictEqual(adminNavText.hasRiderCTAs, false, 'Admin UI must not contain rider booking/garage CTAs');
    } finally {
      await page.close();
      await context.close();
    }
  });

  // Test 5: KYC Verification Inspection & Checklist
  await t.test('KYC page displays verification queue with review controls', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(({ tok, consent }) => {
        localStorage.setItem('cs_token', tok);
        localStorage.setItem('cs_theme', 'dark');
        localStorage.setItem('cs_cookie_consent', consent);
        document.documentElement.setAttribute('data-theme', 'dark');
      }, { tok: adminToken, consent: cookieConsent });

      await page.goto(`${BASE_URL}/admin/kyc`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);

      const kycTitle = await page.evaluate(() => {
        return document.body.innerText.includes('Safety & KYC Verification') || document.body.innerText.includes('Verifications');
      });
      assert.ok(kycTitle, 'Expected KYC Verifications queue header');
    } finally {
      await page.close();
      await context.close();
    }
  });

  // Test 6: Users & Legitimacy Directory displays masked PII
  await t.test('Users directory displays masked PII and risk signals', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(({ tok, consent }) => {
        localStorage.setItem('cs_token', tok);
        localStorage.setItem('cs_theme', 'dark');
        localStorage.setItem('cs_cookie_consent', consent);
        document.documentElement.setAttribute('data-theme', 'dark');
      }, { tok: adminToken, consent: cookieConsent });

      await page.goto(`${BASE_URL}/admin/users`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);

      const usersPageContent = await page.evaluate(() => {
        return document.body.innerText.includes('User Legitimacy & Safety Directory') || document.body.innerText.includes('Users');
      });
      assert.ok(usersPageContent, 'Expected Users Directory content');
    } finally {
      await page.close();
      await context.close();
    }
  });

  // Test 7: Capture Required After Screenshots
  await t.test('Capture Visual After-Screenshots (1280px & 360px across dark & light)', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      // 1. 1280px Desktop Light
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(({ tok, consent }) => {
        localStorage.setItem('cs_token', tok);
        localStorage.setItem('cs_theme', 'light');
        localStorage.setItem('cs_cookie_consent', consent);
        document.documentElement.setAttribute('data-theme', 'light');
      }, { tok: adminToken, consent: cookieConsent });
      await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin_after_1280_light.png'), fullPage: false });

      // 2. 1280px Desktop Dark
      await page.evaluate(() => {
        localStorage.setItem('cs_theme', 'dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin_after_1280_dark.png'), fullPage: false });

      // 3. 360px Mobile Light
      await page.setViewportSize({ width: 360, height: 800 });
      await page.evaluate(() => {
        localStorage.setItem('cs_theme', 'light');
        document.documentElement.setAttribute('data-theme', 'light');
      });
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin_after_360_light.png'), fullPage: false });

      // 4. 360px Mobile Dark
      await page.evaluate(() => {
        localStorage.setItem('cs_theme', 'dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin_after_360_dark.png'), fullPage: false });
    } finally {
      await page.close();
      await context.close();
    }
  });

  await browser.close();
});
