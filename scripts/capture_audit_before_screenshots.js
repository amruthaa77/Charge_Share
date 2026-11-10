import { chromium } from '../client/node_modules/@playwright/test/index.mjs';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const OUTPUT_DIR = path.resolve('docs/screenshots/audit-before');

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
  { path: '/login', name: 'login' },
  { path: '/register', name: 'register' },
  { path: '/forgot-password', name: 'forgot-password' },
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

async function capture() {
  console.log(`[Audit] Launching Chrome to capture BEFORE audit screenshots at ${BASE_URL}...`);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  try {
    for (const theme of ['light', 'dark']) {
      for (const vp of VIEWPORTS) {
        console.log(`\nCapturing Theme: ${theme.toUpperCase()} @ ${vp.name}px...`);

        // 1. Capture Public Routes
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
            const fileName = `${route.name}-${theme}-${vp.name}px.png`;
            await p.screenshot({ path: path.join(OUTPUT_DIR, fileName), fullPage: false });
            process.stdout.write(`  ✓ ${route.name}`);
          } catch (e) {
            process.stdout.write(`  ✕ ${route.name} (${e.message})`);
          }
        }
        await publicCtx.close();

        // 2. Capture Authenticated Routes (Host / Admin / Owner)
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

          // Perform API login to establish auth cookie & cs_token in localStorage
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
              const fileName = `${route.name}-${theme}-${vp.name}px.png`;
              await authPage.screenshot({ path: path.join(OUTPUT_DIR, fileName), fullPage: false });
              process.stdout.write(`  ✓ ${route.name}`);
            } catch (e) {
              process.stdout.write(`  ✕ ${route.name} (${e.message})`);
            }
          }
          await authCtx.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
  console.log(`\n\n[Audit] Successfully saved audit screenshots into ${OUTPUT_DIR}`);
}

capture().catch((err) => {
  console.error('Fatal capture error:', err);
  process.exit(1);
});
