import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { chromium } = require('../node_modules/@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

const ROLES = [
  { role: 'logged_out', email: null, password: null },
  { role: 'rider', email: 'owner1@chargeshare.in', password: 'OwnerPassword123!' },
  { role: 'host', email: 'host1@chargeshare.in', password: 'HostPassword123!' },
  { role: 'admin', email: 'admin@chargeshare.in', password: 'AdminPassword123!' },
];

const VIEWPORTS = [
  { name: '360px Mobile', width: 360, height: 800 },
  { name: '768px Tablet Portrait', width: 768, height: 1024 },
  { name: '1024px Laptop', width: 1024, height: 768 },
  { name: '1280px Desktop Standard', width: 1280, height: 800 },
  { name: '1366px Laptop HD', width: 1366, height: 768 },
  { name: '1440px Desktop Large', width: 1440, height: 900 },
  { name: '1920px Ultrawide', width: 1920, height: 1080 },
];

const ROUTES_PER_ROLE = {
  logged_out: ['/explore'],
  rider: ['/explore', '/my-bookings', '/vehicles', '/settings'],
  host: ['/host/dashboard', '/explore', '/my-bookings', '/settings'],
  admin: ['/admin', '/host/dashboard', '/explore', '/settings'],
};

test('Header & Navigation Cross-Role Responsive Verification Suite', async (t) => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  // 1. Pre-authenticate test personas
  const tokens = {};
  for (const r of ROLES) {
    if (r.email) {
      const page = await browser.newPage();
      try {
        const endpoint = r.role === 'admin' ? `${BASE_URL}/api/v1/admin/auth/login` : `${BASE_URL}/api/v1/auth/login`;
        const res = await page.request.post(endpoint, {
          data: { email: r.email, password: r.password },
        });
        const data = await res.json();
        assert.ok(data.token, `Token acquired for role ${r.role}`);
        tokens[r.role] = data.token;
      } finally {
        await page.close();
      }
    }
  }

  const consentPayload = JSON.stringify({
    categories: { necessary: true, preferences: true, analytics: false },
    timestamp: new Date().toISOString(),
    version: '1.0',
  });

  // 2. Test each role across key viewports and routes
  for (const { role } of ROLES) {
    const token = tokens[role] || null;
    const routes = ROUTES_PER_ROLE[role];

    await t.test(`Role: ${role.toUpperCase()}`, async (roleTest) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      for (const vp of VIEWPORTS) {
        await page.setViewportSize({ width: vp.width, height: vp.height });

        for (const route of routes) {
          // Set authentication and theme cookies/storage
          await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
          await page.evaluate(
            ({ tok, consent }) => {
              if (tok) {
                localStorage.setItem('cs_token', tok);
              } else {
                localStorage.removeItem('cs_token');
                localStorage.removeItem('cs_user_hint');
              }
              localStorage.setItem('cs_theme', 'dark');
              localStorage.setItem('cs_cookie_consent', consent);
              document.documentElement.setAttribute('data-theme', 'dark');
            },
            { tok: token, consent: consentPayload }
          );

          await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(400);

          const metrics = await page.evaluate(() => {
            const header = document.querySelector('header');
            const container = header ? header.querySelector('div') : null;
            const userChip = document.querySelector('#user-menu-button');
            const pageHeader = document.querySelector('[class*="border-b"][class*="bg-bg-raised"]');
            const pageTitle = pageHeader ? pageHeader.querySelector('h1') : null;

            const userChipRect = userChip ? userChip.getBoundingClientRect() : null;

            return {
              headerScrollWidth: header ? header.scrollWidth : 0,
              headerClientWidth: header ? header.clientWidth : 0,
              containerScrollWidth: container ? container.scrollWidth : 0,
              containerClientWidth: container ? container.clientWidth : 0,
              windowWidth: window.innerWidth,
              userChipRight: userChipRect ? userChipRect.right : null,
              hasHorizontalPageScroll: document.documentElement.scrollWidth > window.innerWidth,
              pageTitlePresent: Boolean(pageTitle),
              pageHeaderHeight: pageHeader ? pageHeader.offsetHeight : 0,
            };
          });

          // Assertion 1: Navbar container must never overflow (allow max 1px sub-pixel anti-aliasing)
          assert.ok(
            metrics.containerScrollWidth <= metrics.containerClientWidth + 1.5,
            `Container overflow on ${role} at ${vp.width}px on ${route}: scrollWidth=${metrics.containerScrollWidth} vs clientWidth=${metrics.containerClientWidth}`
          );

          // Assertion 2: Full header must not overflow window
          assert.ok(
            metrics.headerScrollWidth <= metrics.windowWidth + 1.5,
            `Header overflow on ${role} at ${vp.width}px on ${route}`
          );

          // Assertion 3: User chip right boundary must remain strictly within viewport
          if (metrics.userChipRight !== null) {
            assert.ok(
              metrics.userChipRight <= metrics.windowWidth + 1,
              `User chip clipped on ${role} at ${vp.width}px on ${route}: right=${metrics.userChipRight} > windowWidth=${metrics.windowWidth}`
            );
          }

          // Assertion 4: Page must not cause horizontal document scroll
          assert.equal(
            metrics.hasHorizontalPageScroll,
            false,
            `Document horizontal scroll on ${role} at ${vp.width}px on ${route}`
          );
        }
      }

      await page.close();
      await context.close();
    });
  }

  // 3. Test Drawer functionality on mobile (360px)
  await t.test('Mobile Drawer Interactions (< 1024px)', async () => {
    const context = await browser.newContext({ viewport: { width: 360, height: 800 } });
    const page = await context.newPage();

    // Use Host user
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(
      ({ tok, consent }) => {
        localStorage.setItem('cs_token', tok);
        localStorage.setItem('cs_theme', 'dark');
        localStorage.setItem('cs_cookie_consent', consent);
      },
      { tok: tokens.host, consent: consentPayload }
    );

    await page.goto(`${BASE_URL}/host/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // Click Hamburger button
    const menuBtn = page.locator('button[aria-label="Toggle Navigation Menu"]');
    await menuBtn.click();
    await page.waitForTimeout(300);

    // Drawer should be open
    const drawer = page.locator('div[role="dialog"][aria-label="Mobile Navigation"]');
    const isVisible = await drawer.isVisible();
    assert.equal(isVisible, true, 'Drawer must be visible upon clicking hamburger');

    // Body overflow should be locked
    const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
    assert.equal(bodyOverflow, 'hidden', 'Body overflow must be hidden while drawer is open');

    // Press Escape to close
    await page.keyboard.press('Escape');
    await drawer.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
    const isClosed = await drawer.isVisible().catch(() => false);
    assert.equal(isClosed, false, 'Drawer must close on Escape key');

    // Body overflow should be unlocked
    const bodyOverflowAfter = await page.evaluate(() => document.body.style.overflow);
    assert.ok(
      bodyOverflowAfter === 'unset' || bodyOverflowAfter === '',
      'Body scroll must be restored when drawer closes'
    );

    await page.close();
    await context.close();
  });

  // 4. Test User Dropdown & Persona Switching
  await t.test('User Dropdown & Demo Persona Switch', async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    // Start as Rider
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(
      ({ tok, consent }) => {
        localStorage.setItem('cs_token', tok);
        localStorage.setItem('cs_theme', 'dark');
        localStorage.setItem('cs_cookie_consent', consent);
      },
      { tok: tokens.rider, consent: consentPayload }
    );

    await page.goto(`${BASE_URL}/explore`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // Open User menu
    const userBtn = page.locator('#user-menu-button');
    await userBtn.click();
    await page.waitForTimeout(200);

    // Verify role chip says Rider
    const riderChip = page.locator('span:has-text("Rider")');
    assert.ok(await riderChip.isVisible(), 'User menu must display Rider role badge');

    // Switch to Host via Demo Switcher inside dropdown
    const hostBtn = page.locator('button:has-text("🔌 Host")');
    await hostBtn.click();
    await page.waitForURL('**/host/dashboard', { timeout: 8000 });

    const currentUrl = page.url();
    assert.ok(currentUrl.includes('/host/dashboard'), 'Demo switcher must navigate to Host Dashboard');

    await page.close();
    await context.close();
  });

  await browser.close();
});
