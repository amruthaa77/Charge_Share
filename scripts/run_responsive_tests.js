import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { spawn } from 'child_process';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const { chromium } = require('../client/node_modules/@playwright/test');

const PORT = 5174;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const AFTER_DIR = path.join(__dirname, '..', 'docs', 'screenshots', 'responsive-after');

if (!fs.existsSync(AFTER_DIR)) {
  fs.mkdirSync(AFTER_DIR, { recursive: true });
}

function probePort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/`, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function ensureServer() {
  const isUp = await probePort(PORT);
  if (isUp) {
    console.log(`Server already running on port ${PORT}`);
    return null;
  }

  console.log(`Starting Vite dev server on port ${PORT}...`);
  const isWindows = process.platform === 'win32';
  const cmd = isWindows ? 'cmd.exe' : 'npm';
  const args = isWindows
    ? ['/c', 'npm', '--prefix', 'client', 'run', 'dev', '--', '--port', String(PORT)]
    : ['--prefix', 'client', 'run', 'dev', '--', '--port', String(PORT)];

  const proc = spawn(cmd, args, {
    cwd: path.join(__dirname, '..'),
    stdio: 'ignore',
    detached: true,
  });
  proc.unref();

  // Wait for server to become responsive
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const up = await probePort(PORT);
    if (up) {
      console.log(`Vite server ready on port ${PORT}!`);
      return proc;
    }
  }

  throw new Error(`Timed out waiting for Vite server to start on port ${PORT}`);
}

const DEVICES = [
  { id: 'iphone-se', name: 'iPhone SE', width: 375, height: 667, dpr: 2, isMobile: true },
  { id: 'iphone-14', name: 'iPhone 14', width: 390, height: 844, dpr: 3, isMobile: true },
  { id: 'iphone-14-pro-max', name: 'iPhone 14 Pro Max', width: 430, height: 932, dpr: 3, isMobile: true },
  { id: 'pixel-7', name: 'Pixel 7', width: 412, height: 915, dpr: 2.625, isMobile: true },
  { id: 'galaxy-fold-closed', name: 'Galaxy Fold (Closed)', width: 320, height: 653, dpr: 3, isMobile: true },
  { id: 'phone-landscape', name: 'Phone Landscape', width: 667, height: 375, dpr: 2, isMobile: true },
  { id: 'ipad-mini', name: 'iPad Mini', width: 768, height: 1024, dpr: 2, isMobile: false },
  { id: 'ipad-pro-11', name: 'iPad Pro 11', width: 834, height: 1194, dpr: 2, isMobile: false },
  { id: 'desktop-1280', name: 'Desktop Standard', width: 1280, height: 800, dpr: 1, isMobile: false },
  { id: 'desktop-1920', name: 'Desktop Wide', width: 1920, height: 1080, dpr: 1, isMobile: false },
];

const ROUTES = [
  { path: '/', name: 'landing' },
  { path: '/explore', name: 'explore' },
  { path: '/login', name: 'login' },
  { path: '/register', name: 'register' },
  { path: '/forgot-password', name: 'forgot-password' },
  { path: '/become-a-host', name: 'become-a-host' },
  { path: '/my-bookings', name: 'my-bookings' },
  { path: '/vehicles', name: 'garage' },
  { path: '/host/dashboard', name: 'host-dashboard' },
  { path: '/admin', name: 'admin' },
  { path: '/about', name: 'about' },
  { path: '/contact', name: 'contact' },
  { path: '/terms', name: 'terms' },
  { path: '/privacy', name: 'privacy' },
];

const THEMES = ['dark', 'light'];

async function run() {
  const serverProc = await ensureServer();
  console.log(`Starting responsive verification against ${BASE_URL}...`);
  console.log(`Saving screenshots to ${AFTER_DIR}`);

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const results = [];
  let totalTests = 0;
  let passedTests = 0;
  let overflowCount = 0;

  for (const device of DEVICES) {
    console.log(`\nTesting device: ${device.name} (${device.width}x${device.height})`);

    const context = await browser.newContext({
      viewport: { width: device.width, height: device.height },
      deviceScaleFactor: Math.min(device.dpr, 2),
      isMobile: device.isMobile,
      hasTouch: device.isMobile,
    });

    const page = await context.newPage();

    // Stub external third party scripts and Razorpay to prevent network stalls
    await page.route('**/*', (route) => {
      const url = route.request().url();
      if (
        url.includes('checkout.razorpay.com') ||
        url.includes('lumberjack') ||
        url.includes('clarity.ms') ||
        url.includes('google-analytics')
      ) {
        route.fulfill({
          status: 200,
          contentType: 'application/javascript',
          body: 'window.Razorpay = function() { return { open: () => {} }; };',
        });
        return;
      }
      route.continue();
    });

    for (const theme of THEMES) {
      for (const route of ROUTES) {
        totalTests++;
        const targetUrl = `${BASE_URL}${route.path}`;

        try {
          await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

          // Set theme
          await page.evaluate((th) => {
            if (th === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }, theme);

          await page.waitForTimeout(400);

          // Evaluate layout geometry
          const audit = await page.evaluate(() => {
            const docWidth = document.documentElement.clientWidth;
            const scrollWidth = document.documentElement.scrollWidth;
            const innerWidth = window.innerWidth;
            const hasHorizontalScroll = scrollWidth > innerWidth;

            // Check elements exceeding viewport width
            const overflowingElements = [];
            const allElements = document.querySelectorAll('*');
            for (const el of allElements) {
              const r = el.getBoundingClientRect();
              if (r.right > innerWidth + 1 && r.width > 0 && r.height > 0) {
                const tag = el.tagName.toLowerCase();
                const cls = el.className ? String(el.className).slice(0, 40) : '';
                overflowingElements.push(`${tag}.${cls} (right: ${Math.round(r.right)}px > ${innerWidth}px)`);
                if (overflowingElements.length >= 3) break;
              }
            }

            // Check interactive targets size on touch devices
            let smallTouchCount = 0;
            if (window.innerWidth < 768) {
              const buttons = document.querySelectorAll('button:not([hidden]), a:not([hidden])');
              for (const btn of buttons) {
                const br = btn.getBoundingClientRect();
                if (br.width > 0 && br.height > 0 && br.top < window.innerHeight) {
                  if (br.width < 32 || br.height < 32) {
                    smallTouchCount++;
                  }
                }
              }
            }

            return {
              scrollWidth,
              innerWidth,
              hasHorizontalScroll,
              overflowingElements,
              smallTouchCount,
            };
          });

          // Screenshot filename
          const filename = `${device.id}-${route.name}-${theme}.png`;
          const filepath = path.join(AFTER_DIR, filename);
          await page.screenshot({ path: filepath, fullPage: false });

          if (audit.hasHorizontalScroll) {
            overflowCount++;
            console.log(`  ❌ [${theme}] ${route.path} - Overflow: ${audit.scrollWidth}px > ${audit.innerWidth}px`);
          } else {
            passedTests++;
            console.log(`  ✓ [${theme}] ${route.path} - Width: ${audit.innerWidth}px (OK)`);
          }

          results.push({
            device: device.name,
            viewport: `${device.width}x${device.height}`,
            route: route.path,
            theme,
            scrollWidth: audit.scrollWidth,
            innerWidth: audit.innerWidth,
            hasHorizontalScroll: audit.hasHorizontalScroll,
            overflowingElements: audit.overflowingElements,
            screenshot: filename,
          });
        } catch (err) {
          console.error(`  ⚠️ Error on ${device.name} ${route.path}: ${err.message}`);
          results.push({
            device: device.name,
            viewport: `${device.width}x${device.height}`,
            route: route.path,
            theme,
            error: err.message,
          });
        }
      }
    }

    await context.close();
  }

  await browser.close();

  // Summary JSON report
  const reportPath = path.join(__dirname, '..', 'docs', 'RESPONSIVE_VERIFICATION.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf-8');

  console.log('\n======================================================');
  console.log(`VERIFICATION SUMMARY:`);
  console.log(`Total tests run: ${totalTests}`);
  console.log(`Passed (Zero overflow): ${passedTests}`);
  console.log(`Failed (Horizontal overflow): ${overflowCount}`);
  console.log(`Screenshots captured: ${fs.readdirSync(AFTER_DIR).length}`);
  console.log(`Report written to: ${reportPath}`);
  console.log('======================================================\n');
}

run().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
