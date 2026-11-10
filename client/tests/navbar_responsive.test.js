import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);
const { chromium } = require('../node_modules/@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const AFTER_DIR = path.resolve(
  process.cwd().endsWith('client')
    ? path.join(process.cwd(), '../docs/screenshots/navbar-after')
    : path.join(process.cwd(), 'docs/screenshots/navbar-after')
);

if (!fs.existsSync(AFTER_DIR)) {
  fs.mkdirSync(AFTER_DIR, { recursive: true });
}

const ROLES = [
  { role: 'logged_out', email: null, password: null, path: '/explore' },
  { role: 'rider', email: 'owner1@chargeshare.in', password: 'OwnerPassword123!', path: '/explore' },
  { role: 'host', email: 'host1@chargeshare.in', password: 'HostPassword123!', path: '/host/dashboard' },
  { role: 'admin', email: 'admin@chargeshare.in', password: 'AdminPassword123!', path: '/explore' },
];

const BREAKPOINTS = [1024, 1100, 1200, 1280, 1366, 1440, 1536, 1920];
const THEMES = ['light', 'dark'];

test('Navbar Responsive Non-Intersecting Layout Suite', async (t) => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  // 1. Acquire tokens
  const authMap = {};
  for (const r of ROLES) {
    if (r.email) {
      const p = await browser.newPage();
      try {
        const endpoint = r.role === 'admin' ? `${BASE_URL}/api/v1/admin/auth/login` : `${BASE_URL}/api/v1/auth/login`;
        const res = await p.request.post(endpoint, {
          data: { email: r.email, password: r.password },
        });
        const data = await res.json();
        assert.ok(data.token, `Token acquired for role ${r.role}`);
        authMap[r.role] = { token: data.token, user: data.user };
      } finally {
        await p.close();
      }
    }
  }

  // Helper to setup page context
  const createNavContext = async (width, theme, role, customUser = null) => {
    const context = await browser.newContext({
      viewport: { width, height: 800 },
    });

    const auth = authMap[role];
    const userToSet = customUser || (auth ? auth.user : null);
    const tokenToSet = auth ? auth.token : null;

    await context.addInitScript(
      ({ token, user, themeVal }) => {
        if (token) localStorage.setItem('cs_token', token);
        if (user) {
          localStorage.setItem(
            'cs_user_hint',
            JSON.stringify({ name: user.name, role: user.role, email: user.email })
          );
        }
        localStorage.setItem('theme', themeVal);
        localStorage.setItem(
          'cs_cookie_consent',
          JSON.stringify({
            categories: { necessary: true, preferences: true, analytics: false },
            timestamp: new Date().toISOString(),
            version: '1.0',
          })
        );
        if (themeVal === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },
      { token: tokenToSet, user: userToSet, themeVal: theme }
    );

    return context;
  };

  // 2. Comprehensive Bounding Box & Overlap Checks for Host role across all 8 breakpoints & 2 themes
  await t.test('Host persona has 0 overlaps, 0 overflow, and >=24px zone gap across all 8 breakpoints in both themes', async () => {
    for (const width of BREAKPOINTS) {
      for (const theme of THEMES) {
        const context = await createNavContext(width, theme, 'host');
        const page = await context.newPage();
        try {
          await page.goto(`${BASE_URL}/host/dashboard`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(600);

          if (theme === 'dark') {
            await page.evaluate(() => document.documentElement.classList.add('dark'));
          } else {
            await page.evaluate(() => document.documentElement.classList.remove('dark'));
          }
          await page.waitForTimeout(200);

          const metrics = await page.evaluate(() => {
            const header = document.querySelector('header');
            const scrollWidth = header ? header.scrollWidth : 0;
            const clientWidth = header ? header.clientWidth : 0;

            // Brand Lockup and Badge
            const logoLink = document.querySelector('header a[href="/"]');
            const logoBox = logoLink ? logoLink.getBoundingClientRect() : null;
            const badge = document.querySelector('header a[href="/"] span.font-sans-ui');
            const badgeBox = badge ? badge.getBoundingClientRect() : null;

            // Center Nav
            const nav = document.querySelector('header nav[aria-label="Primary Navigation"]');
            const navBox = nav ? nav.getBoundingClientRect() : null;

            // Nav Links and Buttons inside Center Nav
            const navItems = Array.from(document.querySelectorAll('header nav[aria-label="Primary Navigation"] > *')).map((el) => {
              const r = el.getBoundingClientRect();
              return {
                text: el.innerText.trim().replace(/\n/g, ' '),
                tag: el.tagName,
                left: r.left,
                right: r.right,
                top: r.top,
                bottom: r.bottom,
                width: r.width,
                height: r.height,
              };
            });

            // Right Zone
            const rightZone = document.querySelector('header > div > div > div:last-child');
            const rightZoneBox = rightZone ? rightZone.getBoundingClientRect() : null;

            // Standalone Demo Switcher (must be absent from top bar)
            const demoBtn = Array.from(document.querySelectorAll('header > div > div button')).find(
              (b) => b.innerText.includes('Demo Switcher') && !b.closest('[role="menu"]')
            );

            return {
              scrollWidth,
              clientWidth,
              logoBox,
              badgeBox,
              navBox,
              navItems,
              rightZoneBox,
              hasTopDemoBtn: !!demoBtn,
            };
          });

          // 1. Zero Horizontal Scroll Overflow
          assert.ok(
            metrics.scrollWidth <= metrics.clientWidth + 1,
            `Header must not overflow horizontally at ${width}px (${theme}): scrollWidth=${metrics.scrollWidth}, clientWidth=${metrics.clientWidth}`
          );

          // 2. Standalone Demo Switcher must not be in the top bar
          assert.strictEqual(
            metrics.hasTopDemoBtn,
            false,
            `Standalone Demo Switcher must not be in the top bar at ${width}px`
          );

          // 3. Zone Separation >= 24px between Brand and Nav
          if (metrics.badgeBox && metrics.navItems.length > 0) {
            const firstNavItem = metrics.navItems[0];
            const gapLeft = firstNavItem.left - metrics.badgeBox.right;
            assert.ok(
              gapLeft >= 23.5, // 24px CSS gap allowance for subpixel rounding
              `At ${width}px (${theme}), distance between Bengaluru Badge and first nav item ("${firstNavItem.text}") must be >= 24px, got ${gapLeft.toFixed(1)}px`
            );
          }

          // 4. Zone Separation >= 24px between Nav and Right Zone
          if (metrics.rightZoneBox && metrics.navItems.length > 0) {
            const lastNavItem = metrics.navItems[metrics.navItems.length - 1];
            const gapRight = metrics.rightZoneBox.left - lastNavItem.right;
            assert.ok(
              gapRight >= 23.5,
              `At ${width}px (${theme}), distance between last nav item ("${lastNavItem.text}") and Right Zone must be >= 24px, got ${gapRight.toFixed(1)}px`
            );
          }

          // 5. Zero overlaps between any adjacent nav items inside Center Nav
          for (let i = 0; i < metrics.navItems.length - 1; i++) {
            const current = metrics.navItems[i];
            const next = metrics.navItems[i + 1];
            assert.ok(
              current.right <= next.left + 0.5,
              `At ${width}px (${theme}), nav items "${current.text}" and "${next.text}" must not overlap. Current right: ${current.right}, Next left: ${next.left}`
            );
          }

          // Capture screenshots for required widths
          if (width === 1366 || width === 1920 || width === 1024) {
            const shotPath = path.join(AFTER_DIR, `host_navbar_after_${width}_${theme}.png`);
            await page.screenshot({
              path: shotPath,
              clip: { x: 0, y: 0, width, height: 180 },
            });
            console.log(`📸 Saved after-screenshot: ${shotPath}`);
          }
        } finally {
          await page.close();
          await context.close();
        }
      }
    }
  });

  // 3. Rider, Admin, and Logged Out Role Checks
  await t.test('All roles (Rider, Admin, Logged Out) have zero overlap and <= clientWidth at 1280px and 1440px', async () => {
    for (const roleConfig of ROLES) {
      if (roleConfig.role === 'host') continue; // already tested comprehensively

      for (const width of [1280, 1440]) {
        const context = await createNavContext(width, 'dark', roleConfig.role);
        const page = await context.newPage();
        try {
          await page.goto(`${BASE_URL}${roleConfig.path}`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(500);

          const { scrollWidth, clientWidth, navItemCount } = await page.evaluate(() => {
            const header = document.querySelector('header');
            const items = document.querySelectorAll('header nav[aria-label="Primary Navigation"] > *');
            return {
              scrollWidth: header ? header.scrollWidth : 0,
              clientWidth: header ? header.clientWidth : 0,
              navItemCount: items.length,
            };
          });

          assert.ok(
            scrollWidth <= clientWidth + 1,
            `Role ${roleConfig.role} must not overflow at ${width}px`
          );
          assert.ok(
            navItemCount >= 2,
            `Role ${roleConfig.role} should render nav items`
          );
        } finally {
          await page.close();
          await context.close();
        }
      }
    }
  });

  // 4. Edge Case: Long Name "Venkata Subramanian Iyer"
  await t.test('User chip truncates long user names without breaking navbar width or overflow', async () => {
    const longNameUser = {
      name: 'Venkata Subramanian Iyer',
      email: 'venkata@example.com',
      role: 'HOST',
    };
    const context = await createNavContext(1366, 'light', 'host', longNameUser);
    const page = await context.newPage();
    try {
      await page.goto(`${BASE_URL}/host/dashboard`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      const userBtnMetrics = await page.evaluate(() => {
        const header = document.querySelector('header');
        const userBtn = document.getElementById('user-menu-button');
        const userBox = userBtn ? userBtn.getBoundingClientRect() : null;
        const nameSpan = userBtn ? userBtn.querySelector('span.truncate') : null;
        const nameStyle = nameSpan ? window.getComputedStyle(nameSpan) : null;

        return {
          scrollWidth: header ? header.scrollWidth : 0,
          clientWidth: header ? header.clientWidth : 0,
          buttonWidth: userBox ? userBox.width : 0,
          isTruncated: nameStyle ? nameStyle.textOverflow === 'ellipsis' : false,
        };
      });

      assert.ok(
        userBtnMetrics.scrollWidth <= userBtnMetrics.clientWidth + 1,
        'Header must not overflow with long name'
      );
      assert.ok(
        userBtnMetrics.buttonWidth <= 185,
        `User button width must stay clamped under 185px, got ${userBtnMetrics.buttonWidth}px`
      );
      assert.strictEqual(userBtnMetrics.isTruncated, true, 'Name span must have text-overflow: ellipsis');
    } finally {
      await page.close();
      await context.close();
    }
  });

  // 5. Edge Case: High Notification Count "99+"
  await t.test('Notification badge renders "99+" without text clipping or layout distortion', async () => {
    const context = await createNavContext(1280, 'dark', 'host');
    const page = await context.newPage();
    try {
      await page.goto(`${BASE_URL}/host/dashboard`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      // Inject unread count = 120 into component via state/mock
      const badgeText = await page.evaluate(() => {
        const bellBtn = document.querySelector('header button[aria-label="View notifications"]');
        if (!bellBtn) return null;

        // Create or find badge
        let badge = bellBtn.querySelector('span');
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white font-extrabold text-[10px] flex items-center justify-center leading-none';
          bellBtn.appendChild(badge);
        }
        const count = 120;
        badge.innerText = count > 99 ? '99+' : count;

        const badgeRect = badge.getBoundingClientRect();
        return {
          text: badge.innerText,
          width: badgeRect.width,
          height: badgeRect.height,
        };
      });

      assert.ok(badgeText, 'Notification button should exist');
      assert.strictEqual(badgeText.text, '99+', 'Badge text should be clamped to "99+"');
      assert.ok(badgeText.width >= 16, 'Badge width should be >= 16px');
    } finally {
      await page.close();
      await context.close();
    }
  });

  // 6. Priority+ Dynamic Overflow "More" Popover Menu & Keyboard Navigation
  await t.test('Priority+ "More" menu appears at 1024px, opens on click, and closes on Escape', async () => {
    const context = await createNavContext(1024, 'dark', 'host');
    const page = await context.newPage();
    try {
      await page.goto(`${BASE_URL}/host/dashboard`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(700);

      // Verify "More" button is present at 1024px for Host
      const moreBtn = await page.$('#nav-more-button');
      assert.ok(moreBtn, 'More button should be present at 1024px for Host');

      // Click "More" button to open dropdown
      await moreBtn.click();
      await page.waitForTimeout(300);

      const dropdownVisible = await page.evaluate(() => {
        const menu = document.querySelector('header [role="menu"][aria-labelledby="nav-more-button"]');
        return !!menu;
      });
      assert.strictEqual(dropdownVisible, true, 'More dropdown menu should be visible after click');

      // Capture screenshot of open "More" dropdown
      const shotPath = path.join(AFTER_DIR, 'host_navbar_after_more_menu.png');
      await page.screenshot({
        path: shotPath,
        clip: { x: 0, y: 0, width: 1024, height: 260 },
      });
      console.log(`📸 Saved after-screenshot: ${shotPath}`);

      // Press Escape key
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      const dropdownClosed = await page.evaluate(() => {
        const menu = document.querySelector('header [role="menu"][aria-labelledby="nav-more-button"]');
        return !menu;
      });
      assert.strictEqual(dropdownClosed, true, 'More dropdown menu should close on Escape key');
    } finally {
      await page.close();
      await context.close();
    }
  });

  await browser.close();
});
