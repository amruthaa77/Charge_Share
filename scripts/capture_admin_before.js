import { chromium } from '../client/node_modules/@playwright/test/index.mjs';
import path from 'path';
import fs from 'fs';

const OUT_DIR = path.resolve('docs/screenshots/admin-before');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function capture() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  const viewports = [
    { name: '1280', width: 1280, height: 800 },
    { name: '360', width: 360, height: 740 },
  ];

  for (const vp of viewports) {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });
      const page = await context.newPage();

      // Login as Admin
      await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('button:has-text("Admin")');
      await page.click('button:has-text("Admin")');
      await page.waitForURL('**/admin');
      await page.waitForTimeout(1000);

      // Set theme
      await page.evaluate((t) => {
        if (t === 'dark') {
          document.documentElement.classList.add('dark');
          localStorage.setItem('theme', 'dark');
        } else {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('theme', 'light');
        }
      }, theme);
      await page.waitForTimeout(500);

      const filename = `admin_before_${vp.name}_${theme}.png`;
      await page.screenshot({
        path: path.join(OUT_DIR, filename),
        fullPage: true,
      });
      console.log(`Captured ${filename}`);
      await context.close();
    }
  }

  await browser.close();
  console.log('Admin before screenshots completed successfully.');
}

capture().catch((err) => {
  console.error('Error capturing admin before screenshots:', err);
  process.exit(1);
});
