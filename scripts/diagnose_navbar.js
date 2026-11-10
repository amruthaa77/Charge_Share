import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);
const { chromium } = require('../client/node_modules/@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const BEFORE_DIR = path.resolve('docs/screenshots/navbar-before');
const AFTER_DIR = path.resolve('docs/screenshots/navbar-after');

[BEFORE_DIR, AFTER_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function runDiagnosis() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = {
    overlaps: [],
    measurements: {},
  };

  // 1. Acquire Host Token
  const authPage = await browser.newPage();
  let hostToken = null;
  let hostUser = null;
  try {
    const res = await authPage.request.post(`${BASE_URL}/api/v1/auth/login`, {
      data: { email: 'host1@chargeshare.in', password: 'HostPassword123!' },
    });
    const data = await res.json();
    hostToken = data.token;
    hostUser = data.user;
  } finally {
    await authPage.close();
  }

  const widths = [1280, 1366, 1440, 1536, 1920];
  const themes = ['light', 'dark'];

  for (const width of widths) {
    results.measurements[width] = {};
    for (const theme of themes) {
      const context = await browser.newContext({
        viewport: { width, height: 800 },
      });

      await context.addInitScript(
        ({ token, user, themeVal }) => {
          localStorage.setItem('cs_token', token);
          localStorage.setItem(
            'cs_user_hint',
            JSON.stringify({ name: user.name, role: user.role, email: user.email })
          );
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
        { token: hostToken, user: hostUser, themeVal: theme }
      );

      const page = await context.newPage();
      try {
        await page.goto(`${BASE_URL}/host/dashboard`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1000);

        if (theme === 'dark') {
          await page.evaluate(() => document.documentElement.classList.add('dark'));
        } else {
          await page.evaluate(() => document.documentElement.classList.remove('dark'));
        }
        await page.waitForTimeout(500);

        // Measure elements in the header
        const data = await page.evaluate(() => {
          const header = document.querySelector('header');
          const headerBox = header ? header.getBoundingClientRect() : null;
          const scrollWidth = header ? header.scrollWidth : 0;
          const clientWidth = header ? header.clientWidth : 0;

          // Logo / Brand Lockup
          const logoLink = document.querySelector('header a[href="/"]');
          const logoBox = logoLink ? logoLink.getBoundingClientRect() : null;

          // Bengaluru badge
          const badge = document.querySelector('header a[href="/"] span.font-sans-ui');
          const badgeBox = badge ? badge.getBoundingClientRect() : null;

          // Center Nav
          const nav = document.querySelector('header nav');
          const navBox = nav ? nav.getBoundingClientRect() : null;

          // Nav links inside nav
          const navLinks = Array.from(document.querySelectorAll('header nav a')).map((a) => {
            const rect = a.getBoundingClientRect();
            return {
              text: a.innerText.trim().replace(/\n/g, ' '),
              href: a.getAttribute('href'),
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
              right: rect.right,
              left: rect.left,
            };
          });

          // Right Zone
          const rightZone = document.querySelector('header .flex.items-center.gap-1\\.5.sm\\:gap-2.shrink-0') ||
            document.querySelector('header > div > div > div:last-child');
          const rightZoneBox = rightZone ? rightZone.getBoundingClientRect() : null;

          // Demo Switcher button
          const demoBtn = Array.from(document.querySelectorAll('header button')).find(
            (b) => b.innerText.includes('Demo') || b.title?.includes('demo')
          );
          const demoBox = demoBtn ? demoBtn.getBoundingClientRect() : null;

          // User chip
          const userBtn = document.getElementById('user-menu-button');
          const userBox = userBtn ? userBtn.getBoundingClientRect() : null;

          return {
            headerBox,
            scrollWidth,
            clientWidth,
            logoBox,
            badgeBox,
            navBox,
            navLinks,
            rightZoneBox,
            demoBox,
            userBox,
          };
        });

        results.measurements[width][theme] = data;

        // Check for specific overlaps:
        // 1. Find Bays vs Badge
        const findBays = data.navLinks.find((l) => l.text.includes('Find Bays'));
        if (findBays && data.badgeBox) {
          const distance = findBays.left - data.badgeBox.right;
          if (distance < 24) {
            results.overlaps.push({
              width,
              theme,
              pair: 'Find Bays vs Bengaluru Badge',
              distance: `${distance.toFixed(1)}px (too close or overlapping < 24px)`,
            });
          }
        }

        // 2. Emergency SOS vs Demo Switcher
        const emergencySos = data.navLinks.find((l) => l.text.includes('Emergency SOS'));
        if (emergencySos && data.demoBox) {
          const overlapX = emergencySos.right - data.demoBox.left;
          if (overlapX > -24) {
            results.overlaps.push({
              width,
              theme,
              pair: 'Emergency SOS vs Demo Switcher',
              detail: overlapX > 0 ? `OVERLAPPING by ${overlapX.toFixed(1)}px` : `Within ${Math.abs(overlapX).toFixed(1)}px (touching)`,
            });
          }
        }

        // 3. Overflow
        if (data.scrollWidth > data.clientWidth) {
          results.overlaps.push({
            width,
            theme,
            pair: 'Header Scroll Overflow',
            detail: `scrollWidth (${data.scrollWidth}px) > clientWidth (${data.clientWidth}px)`,
          });
        }

        // Capture Before Screenshots at 1366 and 1920
        if (width === 1366 || width === 1920) {
          const shotName = `host_navbar_before_${width}_${theme}.png`;
          const shotPath = path.join(BEFORE_DIR, shotName);
          // Screenshot the top portion including the navbar
          await page.screenshot({
            path: shotPath,
            clip: { x: 0, y: 0, width, height: 180 },
          });
          console.log(`📸 Saved screenshot: ${shotPath}`);
        }
      } finally {
        await page.close();
        await context.close();
      }
    }
  }

  await browser.close();

  fs.writeFileSync('docs/navbar_diagnosis.json', JSON.stringify(results, null, 2));
  console.log('✅ Diagnosis complete! Results saved to docs/navbar_diagnosis.json');
}

runDiagnosis().catch((err) => {
  console.error('Diagnosis failed:', err);
  process.exit(1);
});
