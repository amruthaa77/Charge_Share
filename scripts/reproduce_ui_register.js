import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('../client/node_modules/@playwright/test');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen to network requests and console
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  page.on('requestfailed', (req) => console.log('REQ FAILED:', req.url(), req.failure()?.errorText));
  page.on('response', async (res) => {
    if (res.url().includes('/auth/register')) {
      console.log('API RESPONSE status:', res.status());
      try {
        const body = await res.json();
        console.log('API RESPONSE body:', JSON.stringify(body, null, 2));
      } catch (err) {
        console.log('API RESPONSE text:', await res.text());
      }
    }
  });

  await page.goto('http://localhost:5173/register', { waitUntil: 'networkidle' });

  // 1. First test: Rider registration
  console.log('=== Attempting Rider Registration ===');
  await page.click('button:has-text("🛵 EV Scooter Rider")');
  await page.fill('#regName', 'Rider User');
  await page.fill('#regEmail', `rider_${Date.now()}@test.com`);
  await page.fill('#regPhone', '9876543210');
  await page.fill('#regPassword', 'SuperSecret123!');
  await page.check('input[type="checkbox"]');

  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  console.log('Current URL after Rider register:', page.url());

  // Log out or clear token to test Host
  await page.evaluate(() => {
    localStorage.clear();
  });

  // 2. Second test: Host registration with typical inputs
  console.log('\n=== Attempting Host Registration with 10-digit phone 9876543210 ===');
  await page.goto('http://localhost:5173/register', { waitUntil: 'networkidle' });
  await page.click('button:has-text("🔌 16A Socket Host")');
  await page.fill('#regName', 'Host User');
  await page.fill('#regEmail', `host_${Date.now()}@test.com`);
  await page.fill('#regPhone', '9876543210');
  await page.fill('#regPassword', 'SuperSecret123!');
  await page.check('input[type="checkbox"]');

  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  console.log('Current URL after Host register:', page.url());

  const errorText = await page.locator('.bg-rose-500\\/10').textContent().catch(() => null);
  console.log('Host Error message displayed in UI:', errorText);

  // 3. Third test: What if phone is already in DB? E.g. "+919876543210" or "9876543210"?
  console.log('\n=== Attempting Host Registration with DUPLICATE phone or email ===');
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.goto('http://localhost:5173/register', { waitUntil: 'networkidle' });
  await page.click('button:has-text("🔌 16A Socket Host")');
  await page.fill('#regName', 'Host Duplicate Test');
  // Use existing email host1@chargeshare.in
  await page.fill('#regEmail', 'host1@chargeshare.in');
  await page.fill('#regPhone', '9876543210');
  await page.fill('#regPassword', 'SuperSecret123!');
  await page.check('input[type="checkbox"]');

  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  const errorTextDup = await page.locator('.bg-rose-500\\/10').textContent().catch(() => null);
  console.log('Duplicate Email Error message displayed in UI:', errorTextDup);

  // 4. Fourth test: Host registration with duplicate phone if phone had unique index or validation
  // What about weak password or invalid phone in UI?
  console.log('\n=== Attempting Registration with invalid phone "12345" ===');
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.goto('http://localhost:5173/register', { waitUntil: 'networkidle' });
  await page.click('button:has-text("🔌 16A Socket Host")');
  await page.fill('#regName', 'Host Invalid Phone');
  await page.fill('#regEmail', `host_invalid_${Date.now()}@test.com`);
  await page.fill('#regPhone', '12345');
  await page.fill('#regPassword', 'SuperSecret123!');
  await page.check('input[type="checkbox"]');

  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  const errorTextInvalidPhone = await page.locator('.bg-rose-500\\/10').textContent().catch(() => null);
  console.log('Invalid Phone Error message displayed in UI:', errorTextInvalidPhone);

  await browser.close();
})();
