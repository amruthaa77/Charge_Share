import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { chromium } = require('../client/node_modules/@playwright/test');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const beforeDir = path.join(projectRoot, 'docs', 'screenshots', 'header-before');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

const ROLES = [
  { role: 'logged_out', email: null, password: null },
  { role: 'rider', email: 'owner1@chargeshare.in', password: 'OwnerPassword123!' },
  { role: 'host', email: 'host1@chargeshare.in', password: 'HostPassword123!' },
  { role: 'admin', email: 'admin@chargeshare.in', password: 'AdminPassword123!' },
];

const WIDTHS = [360, 768, 1024, 1280, 1366, 1440, 1920];

const ROUTES_PER_ROLE = {
  logged_out: ['/explore'],
  rider: ['/explore', '/my-bookings', '/vehicles', '/settings'],
  host: ['/host/dashboard', '/explore', '/my-bookings', '/settings'],
  admin: ['/admin', '/host/dashboard', '/explore', '/settings'],
};

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const auditResults = [];

  // Pre-fetch tokens for each authenticated role
  const tokens = {};
  for (const r of ROLES) {
    if (r.email) {
      const page = await browser.newPage();
      try {
        const res = await page.request.post(`${BASE_URL}/api/v1/auth/login`, {
          data: { email: r.email, password: r.password },
        });
        const data = await res.json();
        tokens[r.role] = data.token;
      } catch (err) {
        console.error(`Login failed for ${r.role}`, err);
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

  for (const { role } of ROLES) {
    const token = tokens[role] || null;
    const context = await browser.newContext();
    const page = await context.newPage();

    const routes = ROUTES_PER_ROLE[role] || ['/explore'];

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 800 });

      for (const theme of ['dark', 'light']) {
        for (const route of routes) {
          // Go to login to seed storage
          await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
          await page.evaluate(
            ({ tok, thm, consent }) => {
              if (tok) {
                localStorage.setItem('cs_token', tok);
              } else {
                localStorage.removeItem('cs_token');
                localStorage.removeItem('cs_user_hint');
              }
              localStorage.setItem('cs_theme', thm);
              localStorage.setItem('cs_cookie_consent', consent);
              document.documentElement.setAttribute('data-theme', thm);
            },
            { tok: token, thm: theme, consent: consentPayload }
          );

          await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(600);

          // Measure navbar and header geometry
          const metrics = await page.evaluate(() => {
            const header = document.querySelector('header');
            const headerContainer = header ? header.querySelector('div') : null;
            const nav = header ? header.querySelector('nav') : null;
            const navItems = nav ? Array.from(nav.querySelectorAll('a, button')) : [];
            const userChip = document.querySelector('#user-menu-button');
            const pageHeader = document.querySelector('[class*="border-b"][class*="bg-bg-raised"]');
            const pageTitle = pageHeader ? pageHeader.querySelector('h1') : document.querySelector('h1');

            const headerRect = header ? header.getBoundingClientRect() : null;
            const userChipRect = userChip ? userChip.getBoundingClientRect() : null;

            return {
              headerHeight: header ? header.offsetHeight : 0,
              headerScrollWidth: header ? header.scrollWidth : 0,
              headerClientWidth: header ? header.clientWidth : 0,
              containerScrollWidth: headerContainer ? headerContainer.scrollWidth : 0,
              containerClientWidth: headerContainer ? headerContainer.clientWidth : 0,
              navItemCount: navItems.length,
              navItemLabels: navItems.map(item => item.textContent.trim()),
              hasPageHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth,
              userChipRight: userChipRect ? userChipRect.right : null,
              windowWidth: window.innerWidth,
              isUserChipClipped: userChipRect ? userChipRect.right > window.innerWidth : false,
              pageTitleText: pageTitle ? pageTitle.textContent.trim() : '',
              pageHeaderHeight: pageHeader ? pageHeader.offsetHeight : 0,
            };
          });

          const filename = `${role}_${route.replace(/\//g, '_')}_${width}px_${theme}.png`;
          const screenshotPath = path.join(beforeDir, filename);

          // Only take screenshots of key representative combinations to keep storage reasonable
          const isKeyScreenshot =
            (width === 360 || width === 1280 || width === 1440) &&
            (route === '/explore' || route === '/host/dashboard' || route === '/admin');

          if (isKeyScreenshot) {
            await page.screenshot({ path: screenshotPath });
          }

          auditResults.push({
            role,
            route,
            width,
            theme,
            ...metrics,
            screenshot: isKeyScreenshot ? filename : null,
          });
        }
      }
    }
    await page.close();
    await context.close();
  }

  await browser.close();

  fs.writeFileSync(
    path.join(projectRoot, 'docs', 'header_audit_raw.json'),
    JSON.stringify(auditResults, null, 2)
  );

  console.log(`Audit complete! Tested ${auditResults.length} viewport/role combinations.`);
}

main().catch(err => {
  console.error('Audit error:', err);
  process.exit(1);
});
