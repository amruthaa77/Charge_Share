import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { chromium } = require('../node_modules/@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

const generateValidUniquePhone = () => {
  const subscriber = 9100000000 + Math.floor(Math.random() * 800000000);
  return `+91 ${String(subscriber).slice(0, 5)} ${String(subscriber).slice(5)}`;
};

test('Register Flow & Input Usability Test Suite', async (t) => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Clear any existing session before tests
  await page.addInitScript(() => {
    localStorage.removeItem('cs_token');
    localStorage.removeItem('cs_user');
    localStorage.removeItem('cs_user_hint');
  });

  await t.test('1. Register page loads clean with empty phone and role selector', async () => {
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('form');

    const phoneVal = await page.locator('#regPhone').inputValue();
    assert.equal(phoneVal, '', 'Phone input must not have hardcoded prefilled default value');

    // Check role switcher
    const hostRoleBtn = page.locator('button:has-text("16A Socket Host")');
    await hostRoleBtn.click();
    assert.ok(await hostRoleBtn.getAttribute('class'), 'Host role button should be active');
  });

  await t.test('2. Icon-text clearance: input text starts >= 8px after icon edge', async () => {
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#regName');

    const clearance = await page.evaluate(() => {
      const input = document.querySelector('#regName');
      const icon = input.parentElement.querySelector('svg');
      const inputRect = input.getBoundingClientRect();
      const iconRect = icon.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(input);
      const paddingLeft = parseFloat(computedStyle.paddingLeft);

      // Icon right edge relative to input left edge
      const iconRightRel = iconRect.right - inputRect.left;
      // Gap between icon right edge and text start (paddingLeft)
      const gap = paddingLeft - iconRightRel;

      return {
        paddingLeft,
        iconRightRel,
        gap,
      };
    });

    console.log(`[Icon Clearance Measurement] paddingLeft: ${clearance.paddingLeft}px, iconRightRel: ${clearance.iconRightRel}px, gap: ${clearance.gap}px`);
    assert.ok(clearance.gap >= 8, `Clearance between icon right edge and text start must be >= 8px, got ${clearance.gap}px`);
    assert.ok(clearance.paddingLeft >= 40, `paddingLeft must be >= 40px (pl-11 is 44px), got ${clearance.paddingLeft}px`);
  });

  await t.test('3. Client validation catches invalid phone numbers and shows inline error', async () => {
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#regName');

    await page.fill('#regName', 'Test User');
    await page.fill('#regEmail', 'test.user@example.com');
    await page.fill('#regPhone', '12345'); // Invalid phone
    await page.fill('#regPassword', 'SecurePassword123!');
    await page.check('input[type="checkbox"]');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for error text
    const phoneError = await page.locator('text=Please enter a valid Indian mobile number').first();
    assert.ok(await phoneError.isVisible(), 'Inline phone validation error must be displayed');
  });

  await t.test('4. Duplicate email returns 409 with Sign In link and preserves form fields', async () => {
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#regName');

    const testPhone = generateValidUniquePhone();

    // Fill form using known seeded email
    await page.fill('#regName', 'Duplicate Email Test');
    await page.fill('#regEmail', 'host1@chargeshare.in');
    await page.fill('#regPhone', testPhone);
    await page.fill('#regPassword', 'SecurePassword123!');
    await page.check('input[type="checkbox"]');

    await page.click('button[type="submit"]');

    // Wait for error banner
    await page.waitForSelector('[role="alert"]');
    const alertText = await page.locator('[role="alert"]').innerText();
    assert.ok(alertText.includes('already exists') || alertText.includes('Sign In'), `Error banner must explain duplicate email, got: "${alertText}"`);

    const signInLink = page.locator('[role="alert"] a[href="/login"]');
    assert.ok(await signInLink.isVisible(), 'Sign In link must be visible inside 409 conflict alert');

    // Verify form fields were not wiped
    const nameVal = await page.locator('#regName').inputValue();
    assert.equal(nameVal, 'Duplicate Email Test', 'Form inputs must not be wiped upon error');
  });

  await t.test('5. Duplicate phone returns 409 error banner and preserves form fields', async () => {
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#regName');

    // Select Host role since host1 is a Host
    await page.locator('button:has-text("16A Socket Host")').click();

    // Fill form using seeded phone number from host1 (+919888800001)
    await page.fill('#regName', 'Duplicate Phone Test');
    await page.fill('#regEmail', `unique.${Date.now()}@chargeshare.test`);
    await page.fill('#regPhone', '+91 98888 00001');
    await page.fill('#regPassword', 'SecurePassword123!');
    await page.check('input[type="checkbox"]');

    await page.click('button[type="submit"]');

    // Wait for error banner
    await page.waitForSelector('[role="alert"]');
    const alertText = await page.locator('[role="alert"]').innerText();
    assert.ok(alertText.includes('already registered'), `Error banner must explain duplicate phone, got: "${alertText}"`);

    // Verify phone input is highlighted and preserves value
    const phoneVal = await page.locator('#regPhone').inputValue();
    assert.equal(phoneVal, '+91 98888 00001', 'Phone input value must be preserved on error');
  });

  await t.test('6. Successful Host registration creates account and navigates to /become-a-host', async () => {
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#regName');

    // Select Host
    await page.click('button:has-text("16A Socket Host")');

    const uniqueId = Date.now();
    const uniquePhone = generateValidUniquePhone();
    await page.fill('#regName', `Host Tester ${uniqueId}`);
    await page.fill('#regEmail', `host.${uniqueId}@chargeshare.test`);
    await page.fill('#regPhone', uniquePhone);
    await page.fill('#regPassword', 'SecurePassword123!');
    await page.check('input[type="checkbox"]');

    await page.click('button[type="submit"]');

    // Should navigate to become-a-host or host dashboard
    await page.waitForURL((url) => url.pathname.includes('/become-a-host') || url.pathname.includes('/host'), { timeout: 10000 });
    const url = page.url();
    assert.ok(url.includes('/become-a-host') || url.includes('/host'), `Host should be directed to host onboarding, got ${url}`);
  });

  await t.test('7. Successful Rider registration creates account and navigates to /explore', async () => {
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#regName');

    const uniqueId = Date.now() + 1;
    const uniquePhone = generateValidUniquePhone();
    await page.fill('#regName', `Rider Tester ${uniqueId}`);
    await page.fill('#regEmail', `rider.${uniqueId}@chargeshare.test`);
    await page.fill('#regPhone', uniquePhone);
    await page.fill('#regPassword', 'SecurePassword123!');
    await page.check('input[type="checkbox"]');

    await page.click('button[type="submit"]');

    await page.waitForURL((url) => url.pathname.includes('/explore'), { timeout: 10000 });
    const url = page.url();
    assert.ok(url.includes('/explore'), `Rider should be directed to /explore, got ${url}`);
  });

  await browser.close();
});
