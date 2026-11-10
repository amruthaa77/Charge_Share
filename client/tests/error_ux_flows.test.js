import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const { chromium } = require('../node_modules/@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const SCREENSHOT_DIR = path.resolve('docs/screenshots/errors');

test('Error UX Flows & Visual Verification Suite', async (t) => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  // 1. Duplicate email conflict with Sign in link & field preservation
  await t.test('1. Form-level conflict banner on duplicate email registration', async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/register`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#regName');

    await page.fill('#regName', 'Priya Duplicate Test');
    await page.fill('#regEmail', 'host1@chargeshare.in'); // Existing seeded email
    await page.fill('#regPhone', '+91 91111 22222');
    await page.fill('#regPassword', 'SecurePassword123!');
    await page.check('input[type="checkbox"]');

    await page.click('button[type="submit"]');

    await page.waitForSelector('[role="alert"]');
    const alert = page.locator('[role="alert"]');
    const alertText = await alert.innerText();

    assert.ok(alertText.includes('already exists') || alertText.includes('Sign In'), 'Alert must explain duplicate email');

    const signInLink = page.locator('[role="alert"] a[href="/login"]');
    assert.ok(await signInLink.isVisible(), 'Sign In link must be visible');

    // Name and phone preserved
    assert.equal(await page.locator('#regName').inputValue(), 'Priya Duplicate Test');
    assert.equal(await page.locator('#regPhone').inputValue(), '+91 91111 22222');

    // Capture visual proof 1
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01_duplicate_email_conflict.png'),
      fullPage: false,
    });

    await context.close();
  });

  // 2. Inline field validation errors (name too short, invalid phone, aria attributes)
  await t.test('2. Inline field validation errors with aria-invalid and descriptions', async () => {
    const context = await browser.newContext({ viewport: { width: 360, height: 740 } }); // Mobile viewport
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/register`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#regName');

    await page.fill('#regName', 'Test Rider');
    await page.fill('#regEmail', 'rider.valid@example.com');
    await page.fill('#regPhone', '12345'); // Invalid phone
    await page.fill('#regPassword', 'SecurePassword123!');
    await page.check('input[type="checkbox"]');

    await page.click('button[type="submit"]');

    // Wait for inline error
    await page.waitForSelector('text=Please enter a valid Indian mobile number');

    const phoneInput = page.locator('#regPhone');
    assert.equal(await phoneInput.getAttribute('aria-invalid'), 'true', 'Invalid input must have aria-invalid="true"');

    // Capture visual proof 2 (mobile viewport)
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02_inline_validation_errors.png'),
      fullPage: false,
    });

    await context.close();
  });

  // 3. Duplicate vehicle error in modal (modal does not close, inline error displayed)
  await t.test('3. Duplicate vehicle error in garage modal does not close modal', async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    // Login as owner1
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.click('button:has-text("Rider")'); // 1-Click demo persona
    await page.waitForURL('**/explore', { waitUntil: 'domcontentloaded' });

    // Route 409 VEHICLE_EXISTS on POST /vehicles to test conflict handling deterministically
    await page.route('**/api/v1/vehicles', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            code: 'VEHICLE_EXISTS',
            message: 'A vehicle with this registration number already exists in your garage.',
            errors: [{ field: 'registrationNumber', message: 'Registration number already added' }],
          }),
        });
      } else {
        route.continue();
      }
    });

    // Navigate to garage
    await page.goto(`${BASE_URL}/vehicles`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('button:has-text("Add Electric Scooter")');

    // Open add modal
    await page.click('button:has-text("Add Electric Scooter")');
    await page.waitForSelector('#vehReg');

    // Fill vehicle details with existing duplicate registration
    await page.fill('#vehReg', 'KA01EQ9999');

    // Submit modal form
    await page.click('button:has-text("Save Vehicle")');

    // Modal should remain open with error alert
    await page.waitForSelector('[role="alert"]');
    const alertText = await page.locator('[role="alert"]').innerText();
    assert.ok(
      alertText.includes('already exists') || alertText.includes('Already Added'),
      `Modal must show vehicle conflict, got: "${alertText}"`
    );

    // Verify modal is still open
    assert.ok(await page.locator('#vehReg').isVisible(), 'Modal input must remain visible and accessible');

    // Capture visual proof 3
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '03_duplicate_vehicle_conflict.png'),
      fullPage: false,
    });

    await context.close();
  });

  // 4. Data screen error state with primary Retry button
  await t.test('4. Data screen error state on network drop with functional Retry button', async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    // Abort network calls to chargers search to simulate offline failure
    await page.route('**/api/v1/chargers*', (route) => route.abort('failed'));

    await page.goto(`${BASE_URL}/explore`, { waitUntil: 'domcontentloaded' });

    // Verify DataErrorState renders
    await page.waitForSelector('[role="alert"]');
    const errorCard = page.locator('[role="alert"]').first();
    assert.ok(await errorCard.isVisible(), 'DataErrorState must be visible upon network drop');

    const retryBtn = page.locator('button:has-text("Retry")').first();
    assert.ok(await retryBtn.isVisible(), 'Retry button must be visible');

    // Capture visual proof 4 (Data Error State)
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '04_data_error_state_retry.png'),
      fullPage: false,
    });

    // Unroute to restore network and click Retry
    await page.unroute('**/api/v1/chargers*');
    await retryBtn.click();

    // Sockets should now load and error alert disappears
    await page.waitForSelector('[role="alert"]', { state: 'detached' });

    await context.close();
  });

  // 5. Server error banner with copyable Reference ID
  await t.test('5. Server error banner with copyable Reference ID', async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    // Simulate 500 internal server error with requestId
    await page.route('**/api/v1/auth/login', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Something went wrong on our side. Please try again.',
          requestId: 'CS-REQ-ERR-99214',
        }),
      });
    });

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.fill('#loginEmail', 'rider@chargeshare.in');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // Wait for alert banner
    await page.waitForSelector('[role="alert"]');
    const alert = page.locator('[role="alert"]');
    const alertText = await alert.innerText();

    assert.ok(alertText.includes('Something went wrong'), 'Must show server error message');
    assert.ok(alertText.includes('CS-REQ-ERR-99214'), 'Must show copyable Reference ID');

    // Capture visual proof 5 (Server Error with Reference ID)
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '05_server_error_reference_id.png'),
      fullPage: false,
    });

    await context.close();
  });

  // 6. Slot conflict during booking ("Someone just booked this slot. Pick another time.")
  await t.test('6. Slot conflict during booking shows inline alert banner', async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    // Mock 409 SLOT_TAKEN on booking hold
    await page.route('**/api/v1/bookings', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            code: 'SLOT_TAKEN',
            message: 'Someone just booked this slot. Pick another time.',
          }),
        });
      } else {
        route.continue();
      }
    });

    // Login as rider
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.click('button:has-text("Rider")');
    await page.waitForURL('**/explore', { waitUntil: 'domcontentloaded' });

    // Go to first charger detail
    await page.goto(`${BASE_URL}/explore`, { waitUntil: 'domcontentloaded' });
    const firstChargerLink = page.locator('a[href^="/chargers/"]').first();
    await firstChargerLink.click();
    await page.waitForSelector('button:has-text("Reserve Bay Now")');

    // Click reserve bay
    await page.click('button:has-text("Reserve Bay Now")');

    // Expect slot taken alert
    await page.waitForSelector('[role="alert"]');
    const alert = page.locator('[role="alert"]').first();
    const alertText = await alert.innerText();
    assert.ok(
      alertText.includes('Someone just booked this slot') || alertText.includes('Slot Unavailable'),
      `Expected slot taken alert, got "${alertText}"`
    );

    // Capture visual proof 3 (slot conflict)
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '03_slot_conflict_booking.png'),
      fullPage: false,
    });

    await context.close();
  });

  await browser.close();
});
