import { chromium } from '../client/node_modules/@playwright/test/index.mjs';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const OUTPUT_DIR = path.resolve('docs/screenshots/audit-after');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { width: 360, height: 740, name: '360' },
  { width: 768, height: 1024, name: '768' },
  { width: 1280, height: 800, name: '1280' },
  { width: 1440, height: 900, name: '1440' },
];

const PUBLIC_ROUTES = [
  { path: '/', name: 'landing' },
  { path: '/explore', name: 'explore' },
  { path: '/chargers/6ae6279dfda1e21feec937e4', name: 'charger-detail' },
  { path: '/login', name: 'login' },
  { path: '/register', name: 'register' },
  { path: '/forgot-password', name: 'forgot-password' },
  { path: '/reset-password?token=sample-test-token', name: 'reset-password' },
  { path: '/about', name: 'about' },
  { path: '/contact', name: 'contact' },
  { path: '/help', name: 'help' },
  { path: '/privacy', name: 'privacy' },
  { path: '/terms', name: 'terms' },
  { path: '/refund-policy', name: 'refund-policy' },
  { path: '/cookies', name: 'cookies' },
  { path: '/404', name: 'not-found' },
];

const AUTH_ROUTES = [
  { path: '/my-bookings', name: 'my-bookings', role: 'owner' },
  { path: '/vehicles', name: 'vehicles', role: 'owner' },
  { path: '/host/dashboard', name: 'host-dashboard', role: 'host' },
  { path: '/become-a-host', name: 'become-a-host', role: 'host' },
  { path: '/admin', name: 'admin', role: 'admin' },
];

// Luminance calculation helper
function parseRgbLuminance(rgbStr) {
  if (!rgbStr) return null;
  const match = rgbStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return null;
  const [, r, g, b] = match.map(Number);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

async function capture() {
  console.log(`[Audit After] Launching Chrome to capture AFTER-FIX audit screenshots at ${BASE_URL}...`);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  const auditReport = {
    totalScreenshots: 0,
    overflowViolations: [],
    luminanceViolations: [],
    brightCardsInDarkMode: [],
  };

  try {
    // ---------------------------------------------------------
    // 1. CAPTURE ALL 20 ROUTES (2 THEMES x 4 VIEWPORTS)
    // ---------------------------------------------------------
    for (const theme of ['light', 'dark']) {
      for (const vp of VIEWPORTS) {
        console.log(`\nCapturing Theme: ${theme.toUpperCase()} @ ${vp.name}px...`);

        // A. Public routes
        const publicCtx = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          isMobile: vp.width < 768,
          hasTouch: vp.width < 768,
        });
        const p = await publicCtx.newPage();

        await p.addInitScript((th) => {
          localStorage.setItem('cs_theme', th);
        }, theme);

        for (const route of PUBLIC_ROUTES) {
          try {
            await p.goto(`${BASE_URL}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await p.waitForTimeout(1000);

            // Audit assertions: Check horizontal overflow
            const overflow = await p.evaluate(() => {
              const docWidth = document.documentElement.scrollWidth;
              const winWidth = window.innerWidth;
              return { docWidth, winWidth, hasOverflow: docWidth > winWidth + 1 };
            });
            if (overflow.hasOverflow) {
              auditReport.overflowViolations.push({
                route: route.name,
                theme,
                viewport: vp.name,
                docWidth: overflow.docWidth,
                winWidth: overflow.winWidth,
              });
            }

            // Audit assertions: Check body background luminance
            const bodyBg = await p.evaluate(() => {
              const bg = window.getComputedStyle(document.body).backgroundColor;
              return bg;
            });
            const lum = parseRgbLuminance(bodyBg);
            if (lum !== null) {
              if (theme === 'dark' && lum > 0.25) {
                auditReport.luminanceViolations.push({ route: route.name, theme, bg: bodyBg, lum });
              } else if (theme === 'light' && lum < 0.75) {
                auditReport.luminanceViolations.push({ route: route.name, theme, bg: bodyBg, lum });
              }
            }

            // Audit assertions: Check dark mode cards
            if (theme === 'dark') {
              const brightCards = await p.evaluate(() => {
                const cards = document.querySelectorAll('.bg-surface, .bg-bg-raised, .bg-surface-elevated, div.rounded-2xl');
                const offending = [];
                cards.forEach((card, idx) => {
                  const bg = window.getComputedStyle(card).backgroundColor;
                  const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                  if (match) {
                    const [, r, g, b] = match.map(Number);
                    const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                    if (l > 0.70) {
                      offending.push({ index: idx, bg, l });
                    }
                  }
                });
                return offending;
              });
              if (brightCards.length > 0) {
                auditReport.brightCardsInDarkMode.push({ route: route.name, cards: brightCards });
              }
            }

            const fileName = `${route.name}-${theme}-${vp.name}px.png`;
            await p.screenshot({ path: path.join(OUTPUT_DIR, fileName), fullPage: false });
            auditReport.totalScreenshots++;
            process.stdout.write(`  ✓ ${route.name}`);
          } catch (e) {
            process.stdout.write(`  ✕ ${route.name} (${e.message})`);
          }
        }
        await publicCtx.close();

        // B. Authenticated routes
        for (const userRole of ['owner', 'host', 'admin']) {
          const email =
            userRole === 'admin'
              ? 'admin@chargeshare.in'
              : userRole === 'host'
              ? 'host1@chargeshare.in'
              : 'owner1@chargeshare.in';
          const password =
            userRole === 'admin'
              ? 'AdminPassword123!'
              : userRole === 'host'
              ? 'HostPassword123!'
              : 'OwnerPassword123!';

          const authCtx = await browser.newContext({
            viewport: { width: vp.width, height: vp.height },
            isMobile: vp.width < 768,
            hasTouch: vp.width < 768,
          });
          const authPage = await authCtx.newPage();

          await authPage.addInitScript((th) => {
            localStorage.setItem('cs_theme', th);
          }, theme);

          try {
            const loginRes = await authPage.request.post(`${BASE_URL}/api/v1/auth/login`, {
              data: { email, password },
            });
            const loginData = await loginRes.json();
            if (loginData.token) {
              await authPage.addInitScript((tok) => {
                localStorage.setItem('cs_token', tok);
              }, loginData.token);
            }
          } catch (loginErr) {
            console.error(`Login error for ${email}:`, loginErr.message);
          }

          const routesForRole = AUTH_ROUTES.filter((r) => r.role === userRole);
          for (const route of routesForRole) {
            try {
              await authPage.goto(`${BASE_URL}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
              await authPage.waitForTimeout(1500);

              // Check overflow
              const overflow = await authPage.evaluate(() => {
                const docWidth = document.documentElement.scrollWidth;
                const winWidth = window.innerWidth;
                return { docWidth, winWidth, hasOverflow: docWidth > winWidth + 1 };
              });
              if (overflow.hasOverflow) {
                auditReport.overflowViolations.push({
                  route: route.name,
                  theme,
                  viewport: vp.name,
                  docWidth: overflow.docWidth,
                  winWidth: overflow.winWidth,
                });
              }

              const fileName = `${route.name}-${theme}-${vp.name}px.png`;
              await authPage.screenshot({ path: path.join(OUTPUT_DIR, fileName), fullPage: false });
              auditReport.totalScreenshots++;
              process.stdout.write(`  ✓ ${route.name}`);
            } catch (e) {
              process.stdout.write(`  ✕ ${route.name} (${e.message})`);
            }
          }
          await authCtx.close();
        }
      }
    }

    // ---------------------------------------------------------
    // 2. CAPTURE SPECIFIC FEATURE PROOF SCREENSHOTS
    // ---------------------------------------------------------
    console.log('\n\n--- Capturing Feature Proof Screenshots ---');

    // Proof 1 & 2 & 3: Scroll Story Scenes 1, 3, 5
    const storyCtx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const storyPage = await storyCtx.newPage();
    await storyPage.addInitScript(() => {
      localStorage.setItem('cs_theme', 'dark');
    });
    await storyPage.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await storyPage.waitForTimeout(2000);

    // Scene 1 Proof (progress ~0.05)
    await storyPage.evaluate(() => {
      window.scrollTo(0, 50);
      if (window.ScrollTrigger) window.ScrollTrigger.update();
    });
    await storyPage.waitForTimeout(800);
    await storyPage.screenshot({
      path: path.join(OUTPUT_DIR, 'scroll-story-scene1.png'),
    });
    console.log('  ✓ Captured scroll-story-scene1.png');

    // Scene 3 Proof (progress ~0.40 - two column layout separation)
    await storyPage.evaluate(() => {
      const hero = document.querySelector('section');
      if (hero && window.ScrollTrigger) {
        const triggers = window.ScrollTrigger.getAll();
        if (triggers.length > 0) {
          const t = triggers[0];
          const target = t.start + (t.end - t.start) * 0.40;
          window.scrollTo(0, target);
          window.ScrollTrigger.update();
        }
      }
    });
    await storyPage.waitForTimeout(1000);
    await storyPage.screenshot({
      path: path.join(OUTPUT_DIR, 'scroll-story-scene3.png'),
    });
    console.log('  ✓ Captured scroll-story-scene3.png (two-column separation proof)');

    // Scene 5 Proof (progress ~0.85 - scene 5 proof with benefits list)
    await storyPage.evaluate(() => {
      if (window.ScrollTrigger) {
        const triggers = window.ScrollTrigger.getAll();
        if (triggers.length > 0) {
          const t = triggers[0];
          const target = t.start + (t.end - t.start) * 0.85;
          window.scrollTo(0, target);
          window.ScrollTrigger.update();
        }
      }
    });
    await storyPage.waitForTimeout(1000);
    await storyPage.screenshot({
      path: path.join(OUTPUT_DIR, 'scroll-story-scene5.png'),
    });
    console.log('  ✓ Captured scroll-story-scene5.png (scene 5 benefit list proof)');
    await storyCtx.close();

    // Proof 4: Map Clean Tiles Dark (No Watermark Proof)
    const mapCtx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const mapPage = await mapCtx.newPage();
    await mapPage.addInitScript(() => {
      localStorage.setItem('cs_theme', 'dark');
    });
    await mapPage.goto(`${BASE_URL}/explore`, { waitUntil: 'domcontentloaded' });
    await mapPage.waitForTimeout(3000); // Allow tiles to load
    await mapPage.screenshot({
      path: path.join(OUTPUT_DIR, 'map-clean-tiles-dark.png'),
    });
    console.log('  ✓ Captured map-clean-tiles-dark.png (no CARTO watermark proof)');
    await mapCtx.close();

    // Proof 5: Host Dashboard Chart Dark (Continuous 6-Month Line Proof)
    const hostCtx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const hostPage = await hostCtx.newPage();
    await hostPage.addInitScript(() => {
      localStorage.setItem('cs_theme', 'dark');
    });
    try {
      const loginRes = await hostPage.request.post(`${BASE_URL}/api/v1/auth/login`, {
        data: { email: 'host1@chargeshare.in', password: 'HostPassword123!' },
      });
      const loginData = await loginRes.json();
      if (loginData.token) {
        await hostPage.addInitScript((tok) => {
          localStorage.setItem('cs_token', tok);
        }, loginData.token);
      }
    } catch (e) {
      console.warn('Host login failed:', e.message);
    }
    await hostPage.goto(`${BASE_URL}/host/dashboard`, { waitUntil: 'domcontentloaded' });
    await hostPage.waitForTimeout(2000);
    await hostPage.screenshot({
      path: path.join(OUTPUT_DIR, 'host-dashboard-chart-dark.png'),
    });
    console.log('  ✓ Captured host-dashboard-chart-dark.png (6-month continuous trend proof)');
    await hostCtx.close();

    // Proof 6: Navbar Logged In 1280px (No Wrapping Proof)
    const navCtx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const navPage = await navCtx.newPage();
    await navPage.addInitScript(() => {
      localStorage.setItem('cs_theme', 'dark');
    });
    try {
      const loginRes = await navPage.request.post(`${BASE_URL}/api/v1/auth/login`, {
        data: { email: 'host1@chargeshare.in', password: 'HostPassword123!' },
      });
      const loginData = await loginRes.json();
      if (loginData.token) {
        await navPage.addInitScript((tok) => {
          localStorage.setItem('cs_token', tok);
        }, loginData.token);
      }
    } catch (e) {
      console.warn('Host login failed:', e.message);
    }
    await navPage.goto(`${BASE_URL}/host/dashboard`, { waitUntil: 'domcontentloaded' });
    await navPage.waitForTimeout(1500);
    const navElement = await navPage.$('nav');
    if (navElement) {
      await navElement.screenshot({
        path: path.join(OUTPUT_DIR, 'navbar-logged-in-1280px.png'),
      });
      console.log('  ✓ Captured navbar-logged-in-1280px.png (clean single-line priority collapse)');
    } else {
      await navPage.screenshot({
        path: path.join(OUTPUT_DIR, 'navbar-logged-in-1280px.png'),
      });
    }
    await navCtx.close();

    console.log('\n========================================');
    console.log('--- AUDIT ASSERTION SUITE SUMMARY ---');
    console.log(`Total Screenshots Captured: ${auditReport.totalScreenshots + 6}`);
    console.log(`Horizontal Overflow Violations: ${auditReport.overflowViolations.length}`);
    if (auditReport.overflowViolations.length > 0) {
      console.table(auditReport.overflowViolations);
    }
    console.log(`Body Luminance Violations: ${auditReport.luminanceViolations.length}`);
    if (auditReport.luminanceViolations.length > 0) {
      console.table(auditReport.luminanceViolations);
    }
    console.log(`Bright Cards in Dark Mode: ${auditReport.brightCardsInDarkMode.length}`);
    if (auditReport.brightCardsInDarkMode.length > 0) {
      console.table(auditReport.brightCardsInDarkMode);
    }
    console.log('========================================\n');

  } finally {
    await browser.close();
  }
}

capture().catch((err) => {
  console.error('Fatal capture error:', err);
  process.exit(1);
});
