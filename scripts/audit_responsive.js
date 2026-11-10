const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('../client/node_modules/@playwright/test');

const distDir = path.resolve(__dirname, '../client/dist');
const outDir = path.resolve(__dirname, '../docs/screenshots/responsive-before');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  let filePath = path.join(distDir, reqPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, 'index.html');
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

const PORT = 5174;

const viewports = [
  // Phones portrait
  { name: 'phone_320x568', width: 320, height: 568, isMobile: true, hasTouch: true },
  { name: 'phone_360x740', width: 360, height: 740, isMobile: true, hasTouch: true },
  { name: 'phone_375x667', width: 375, height: 667, isMobile: true, hasTouch: true },
  { name: 'phone_390x844', width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: 'phone_430x932', width: 430, height: 932, isMobile: true, hasTouch: true },
  { name: 'phone_412x915', width: 412, height: 915, isMobile: true, hasTouch: true },
  { name: 'phone_344x882', width: 344, height: 882, isMobile: true, hasTouch: true },
  // Phones landscape
  { name: 'phone_ls_667x375', width: 667, height: 375, isMobile: true, hasTouch: true },
  { name: 'phone_ls_844x390', width: 844, height: 390, isMobile: true, hasTouch: true },
  { name: 'phone_ls_915x412', width: 915, height: 412, isMobile: true, hasTouch: true },
  // Tablets
  { name: 'tablet_768x1024', width: 768, height: 1024, isMobile: true, hasTouch: true },
  { name: 'tablet_820x1180', width: 820, height: 1180, isMobile: true, hasTouch: true },
  { name: 'tablet_1024x1366', width: 1024, height: 1366, isMobile: true, hasTouch: true },
  { name: 'tablet_800x1280', width: 800, height: 1280, isMobile: true, hasTouch: true },
  // Tablets landscape
  { name: 'tablet_ls_1024x768', width: 1024, height: 768, isMobile: true, hasTouch: true },
  { name: 'tablet_ls_1180x820', width: 1180, height: 820, isMobile: true, hasTouch: true },
  { name: 'tablet_ls_1366x1024', width: 1366, height: 1024, isMobile: true, hasTouch: true },
  { name: 'tablet_ls_1280x800', width: 1280, height: 800, isMobile: true, hasTouch: true },
  // Desktops
  { name: 'desktop_1280x720', width: 1280, height: 720, isMobile: false, hasTouch: false },
  { name: 'desktop_1366x768', width: 1366, height: 768, isMobile: false, hasTouch: false },
  { name: 'desktop_1440x900', width: 1440, height: 900, isMobile: false, hasTouch: false },
  { name: 'desktop_1920x1080', width: 1920, height: 1080, isMobile: false, hasTouch: false },
  { name: 'desktop_2560x1440', width: 2560, height: 1440, isMobile: false, hasTouch: false },
  // Zoom & text scale on 360px
  { name: 'zoom_200_360px', width: 360, height: 740, isMobile: true, hasTouch: true, zoom: 2.0 },
  { name: 'text_scale_130_360px', width: 360, height: 740, isMobile: true, hasTouch: true, textScale: 1.3 },
];

const routes = [
  { name: 'landing', path: '/' },
  { name: 'login', path: '/login' },
  { name: 'register', path: '/register' },
  { name: 'forgot-password', path: '/forgot-password' },
  { name: 'reset-password', path: '/reset-password?token=mock_123' },
  { name: 'explore', path: '/explore' },
  { name: 'charger-detail', path: '/chargers/demo-charger' },
  { name: 'my-bookings', path: '/my-bookings', authRole: 'EV_OWNER' },
  { name: 'vehicles', path: '/vehicles', authRole: 'EV_OWNER' },
  { name: 'host-dashboard', path: '/host/dashboard', authRole: 'HOST' },
  { name: 'become-a-host', path: '/become-a-host', authRole: 'HOST' },
  { name: 'admin', path: '/admin', authRole: 'ADMIN' },
  { name: 'about', path: '/about' },
  { name: 'contact', path: '/contact' },
  { name: 'help', path: '/help' },
  { name: 'privacy', path: '/privacy' },
  { name: 'terms', path: '/terms' },
  { name: 'refund-policy', path: '/refund-policy' },
  { name: 'cookies', path: '/cookies' },
  { name: 'not-found', path: '/page-404-check' },
];

server.listen(PORT, async () => {
  console.log(`Audit server listening at http://localhost:${PORT}`);
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const auditReport = {
    timestamp: new Date().toISOString(),
    routesChecked: routes.length,
    viewportsChecked: viewports.length,
    findings: [],
    screenshotsCaptured: 0,
  };

  try {
    for (const vp of viewports) {
      console.log(`Auditing viewport: ${vp.name} (${vp.width}x${vp.height})...`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.isMobile,
        hasTouch: vp.hasTouch,
        deviceScaleFactor: 1,
      });

      // Mock API responses for clean offline auditing and mock external scripts
      await context.route('**/*', async (route) => {
        const url = route.request().url();
        if (url.includes('razorpay.com') || url.includes('lumberjack')) {
          if (url.includes('checkout.js')) {
            await route.fulfill({
              status: 200,
              contentType: 'application/javascript',
              body: 'window.Razorpay = function(opts) { return { open: function() {} }; };',
            });
            return;
          }
          await route.abort();
          return;
        }

        if (url.includes('/api/v1/')) {
          if (url.includes('/auth/me')) {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                user: {
                _id: 'u1',
                name: 'Ananya Sharma',
                email: 'ananya@chargeshare.in',
                role: 'EV_OWNER',
                phone: '+919876543210',
              },
            }),
          });
        } else if (url.includes('/chargers/demo-charger') || url.includes('/chargers/6')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              charger: {
                _id: 'demo-charger',
                title: 'Indiranagar 16A Smart Socket',
                address: '100ft Road, Indiranagar',
                city: 'Bengaluru',
                price: 14,
                pricingType: 'PER_HOUR',
                powerKW: 3.3,
                connectorType: '3-pin',
                status: 'AVAILABLE',
                availableNow: true,
                hostId: { name: 'Rajesh Kumar', phone: '+919876543211' },
                photos: ['https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800'],
                location: { coordinates: [77.6412, 12.9719] },
              },
            }),
          });
        } else if (url.includes('/chargers')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              chargers: [
                {
                  _id: 'demo-charger-1',
                  title: 'Indiranagar 16A Smart Socket',
                  address: '100ft Road, Indiranagar',
                  city: 'Bengaluru',
                  price: 14,
                  pricingType: 'PER_HOUR',
                  powerKW: 3.3,
                  connectorType: '3-pin',
                  status: 'AVAILABLE',
                  availableNow: true,
                  hostId: { name: 'Rajesh Kumar' },
                  photos: ['https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800'],
                  location: { coordinates: [77.6412, 12.9719] },
                },
                {
                  _id: 'demo-charger-2',
                  title: 'Koramangala 4th Block Socket',
                  address: '80ft Road, Koramangala',
                  city: 'Bengaluru',
                  price: 15,
                  pricingType: 'PER_HOUR',
                  powerKW: 3.3,
                  connectorType: '3-pin',
                  status: 'AVAILABLE',
                  availableNow: true,
                  hostId: { name: 'Vikram Rao' },
                  photos: ['https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800'],
                  location: { coordinates: [77.6256, 12.9345] },
                },
              ],
            }),
          });
        } else if (url.includes('/bookings')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              bookings: [
                {
                  _id: 'b1',
                  bookingCode: 'CS-84920',
                  status: 'CONFIRMED',
                  slotStart: new Date().toISOString(),
                  slotEnd: new Date(Date.now() + 3600000).toISOString(),
                  totalAmount: 14,
                  isEmergency: false,
                  chargerId: {
                    title: 'Indiranagar 16A Socket',
                    address: '100ft Road, Indiranagar',
                  },
                },
              ],
            }),
          });
        } else if (url.includes('/vehicles')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              vehicles: [
                { _id: 'v1', make: 'Ather', model: '450X Gen 3', registrationNumber: 'KA 03 EQ 1234', connectorType: '3-pin' },
              ],
            }),
          });
        } else if (url.includes('/admin/stats')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              stats: { totalUsers: 142, totalChargers: 48, totalBookings: 612, totalKWh: 1840 },
            }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true }),
          });
        }
        return;
      }

      await route.continue();
    });

      const page = await context.newPage();

      for (const r of routes) {
        // Set auth state if needed
        if (r.authRole) {
          await page.addInitScript((role) => {
            localStorage.setItem('cs_token', 'mock_jwt_token');
            localStorage.setItem(
              'cs_user_hint',
              JSON.stringify({ name: 'Ananya Sharma', role: role, email: 'ananya@chargeshare.in' })
            );
          }, r.authRole);
        } else {
          await page.addInitScript(() => {
            localStorage.removeItem('cs_token');
            localStorage.removeItem('cs_user_hint');
          });
        }

        const consoleErrors = [];
        page.on('console', (msg) => {
          if (msg.type() === 'error') consoleErrors.push(msg.text());
        });

        const targetUrl = `http://localhost:${PORT}${r.path}`;
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

        // Apply zoom or text scale if specified
        if (vp.zoom) {
          await page.evaluate((z) => {
            document.body.style.zoom = z;
          }, vp.zoom);
        }
        if (vp.textScale) {
          await page.evaluate((s) => {
            document.documentElement.style.fontSize = `${16 * s}px`;
          }, vp.textScale);
        }

        await page.waitForTimeout(500);

        // Analyze page
        const evalResult = await page.evaluate(() => {
          const winWidth = window.innerWidth;
          const scrollWidth = document.documentElement.scrollWidth;
          const hasHorizontalScroll = scrollWidth > winWidth + 1;

          // Find overflowing elements
          const overflowElements = [];
          const allEls = document.querySelectorAll('*');
          for (const el of allEls) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              if (rect.right > winWidth + 2) {
                const tag = el.tagName.toLowerCase();
                const cls = (el.className || '').toString().slice(0, 80);
                const id = el.id ? `#${el.id}` : '';
                overflowElements.push({
                  selector: `${tag}${id}.${cls.split(' ').slice(0, 3).join('.')}`,
                  right: Math.round(rect.right),
                  width: Math.round(rect.width),
                  winWidth,
                });
                if (overflowElements.length >= 5) break;
              }
            }
          }

          // Check small touch targets on touch viewports
          let smallTouchTargets = 0;
          if (window.matchMedia('(pointer: coarse)').matches) {
            const interactive = document.querySelectorAll('button, a, input, select, textarea');
            for (const el of interactive) {
              const rect = el.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                if (rect.width < 44 || rect.height < 44) {
                  smallTouchTargets++;
                }
              }
            }
          }

          // Check clipped text
          let clippedTextCount = 0;
          const textContainers = document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, label');
          for (const el of textContainers) {
            if (el.scrollWidth > el.clientWidth + 2) {
              const overflowStyle = window.getComputedStyle(el).overflow;
              const textOverflow = window.getComputedStyle(el).textOverflow;
              if (overflowStyle !== 'hidden' && textOverflow !== 'ellipsis') {
                clippedTextCount++;
              }
            }
          }

          return {
            winWidth,
            scrollWidth,
            hasHorizontalScroll,
            overflowElements,
            smallTouchTargets,
            clippedTextCount,
          };
        });

        // Key screenshots to save (subset across devices to avoid 500+ images)
        const shouldSaveScreenshot =
          ['phone_320x568', 'phone_360x740', 'phone_ls_667x375', 'tablet_768x1024', 'desktop_1280x720', 'desktop_2560x1440', 'zoom_200_360px', 'text_scale_130_360px'].includes(vp.name) ||
          evalResult.hasHorizontalScroll;

        if (shouldSaveScreenshot) {
          const shotName = `${r.name}_${vp.name}.png`;
          const shotPath = path.join(outDir, shotName);
          await page.screenshot({ path: shotPath, fullPage: false });
          auditReport.screenshotsCaptured++;
        }

        if (evalResult.hasHorizontalScroll || evalResult.smallTouchTargets > 0 || evalResult.clippedTextCount > 0 || consoleErrors.length > 0) {
          auditReport.findings.push({
            route: r.name,
            path: r.path,
            viewport: vp.name,
            dimensions: `${vp.width}x${vp.height}`,
            hasHorizontalScroll: evalResult.hasHorizontalScroll,
            scrollWidth: evalResult.scrollWidth,
            winWidth: evalResult.winWidth,
            overflowElements: evalResult.overflowElements,
            smallTouchTargets: evalResult.smallTouchTargets,
            clippedTextCount: evalResult.clippedTextCount,
            consoleErrors: consoleErrors.slice(0, 3),
          });
        }
      }
      await context.close();
    }

    const reportPath = path.resolve(__dirname, '../docs/audit_findings.json');
    fs.writeFileSync(reportPath, JSON.stringify(auditReport, null, 2));
    console.log(`Audit complete. Captured ${auditReport.screenshotsCaptured} screenshots.`);
    console.log(`Found ${auditReport.findings.length} issue occurrences. Saved raw findings to ${reportPath}`);
  } catch (err) {
    console.error('Audit failed with error:', err);
  } finally {
    await browser.close();
    server.close();
  }
});
