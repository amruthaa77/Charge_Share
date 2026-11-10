import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { chromium } = require('../client/node_modules/@playwright/test');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenshotDir = path.join(__dirname, '../docs/screenshots/register');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

const BASE_URL = 'http://localhost:5173';

const run = async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  // 1. Desktop Dark Theme - Host Form Clean
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('cs_theme', 'dark');
      localStorage.removeItem('cs_token');
      localStorage.removeItem('cs_user');
      localStorage.removeItem('cs_user_hint');
    });
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle' });
    // Select host
    await page.click('button:has-text("16A Socket Host")');
    await page.fill('#regName', 'Vikram Batra');
    await page.fill('#regEmail', 'vikram.host@example.com');
    await page.fill('#regPhone', '+91 98765 43210');
    await page.fill('#regPassword', 'SecurePass123!');
    await page.check('input[type="checkbox"]');
    await page.waitForTimeout(300);

    const outPath = path.join(screenshotDir, 'host_register_desktop_dark.png');
    await page.screenshot({ path: outPath, fullPage: true });
    console.log(`Saved screenshot: ${outPath}`);
    await context.close();
  }

  // 2. Desktop Light Theme - Host Form Clean
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('cs_theme', 'light');
      localStorage.removeItem('cs_token');
      localStorage.removeItem('cs_user');
      localStorage.removeItem('cs_user_hint');
    });
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle' });
    await page.click('button:has-text("16A Socket Host")');
    await page.fill('#regName', 'Vikram Batra');
    await page.fill('#regEmail', 'vikram.host@example.com');
    await page.fill('#regPhone', '+91 98765 43210');
    await page.fill('#regPassword', 'SecurePass123!');
    await page.check('input[type="checkbox"]');
    await page.waitForTimeout(300);

    const outPath = path.join(screenshotDir, 'host_register_desktop_light.png');
    await page.screenshot({ path: outPath, fullPage: true });
    console.log(`Saved screenshot: ${outPath}`);
    await context.close();
  }

  // 3. Mobile 360px Dark Theme - With 409 Conflict Error Banner & Sign In Link
  {
    const context = await browser.newContext({ viewport: { width: 360, height: 800 } });
    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('cs_theme', 'dark');
      localStorage.removeItem('cs_token');
      localStorage.removeItem('cs_user');
      localStorage.removeItem('cs_user_hint');
    });
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle' });
    await page.click('button:has-text("16A Socket Host")');
    await page.fill('#regName', 'Vikram Batra');
    await page.fill('#regEmail', 'host1@chargeshare.in'); // duplicate email
    await page.fill('#regPhone', '+91 91234 56789');
    await page.fill('#regPassword', 'SecurePass123!');
    await page.check('input[type="checkbox"]');
    await page.click('button[type="submit"]');
    await page.waitForSelector('[role="alert"]');
    await page.waitForTimeout(300);

    const outPath = path.join(screenshotDir, 'host_register_mobile_dark.png');
    await page.screenshot({ path: outPath, fullPage: true });
    console.log(`Saved screenshot: ${outPath}`);
    await context.close();
  }

  // 4. Mobile 360px Light Theme - With Inline Field Validation Errors
  {
    const context = await browser.newContext({ viewport: { width: 360, height: 800 } });
    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('cs_theme', 'light');
      localStorage.removeItem('cs_token');
      localStorage.removeItem('cs_user');
      localStorage.removeItem('cs_user_hint');
    });
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle' });
    await page.click('button:has-text("16A Socket Host")');
    await page.fill('#regName', 'Vikram Batra');
    await page.fill('#regEmail', 'vikram@example.com');
    await page.fill('#regPhone', '12345'); // invalid phone
    await page.fill('#regPassword', 'SecurePassword123!');
    await page.check('input[type="checkbox"]');
    await page.click('button[type="submit"]');
    await page.waitForSelector('[role="alert"]');
    await page.waitForTimeout(300);

    const outPath = path.join(screenshotDir, 'host_register_mobile_light.png');
    await page.screenshot({ path: outPath, fullPage: true });
    console.log(`Saved screenshot: ${outPath}`);
    await context.close();
  }

  await browser.close();
  console.log('All screenshots captured successfully.');
};

run().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
