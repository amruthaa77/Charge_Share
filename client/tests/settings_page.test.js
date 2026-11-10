import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { chromium } = require('../node_modules/@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test('Account Settings Route & Interaction Comprehensive Test Suite', async (t) => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // 1. Initial Login
  const loginRes = await page.request.post(`${BASE_URL}/api/v1/auth/login`, {
    data: { email: 'owner1@chargeshare.in', password: 'OwnerPassword123!' },
  });
  const loginData = await loginRes.json();
  assert.ok(loginData.token, 'Must receive auth token for owner1@chargeshare.in');

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok) => {
    localStorage.setItem('cs_token', tok);
    localStorage.setItem('cs_theme', 'dark');
    localStorage.setItem('cs_cookie_consent', JSON.stringify({
      categories: { necessary: true, preferences: true, analytics: false },
      timestamp: new Date().toISOString(),
      version: '1.0',
    }));
  }, loginData.token);



  await t.test('1. User Menu: Open, Escape returns focus to avatar, and click Account Settings navigates to /settings', async () => {
    await page.goto(`${BASE_URL}/explore`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const avatarBtn = page.locator('#user-menu-button');
    await avatarBtn.click();
    await page.waitForTimeout(200);

    // Verify aria-expanded and menu presence
    const expanded = await avatarBtn.getAttribute('aria-expanded');
    assert.equal(expanded, 'true', 'Avatar button must indicate menu is open');

    // Test Escape key closes menu and returns focus
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    const isClosed = await avatarBtn.getAttribute('aria-expanded');
    assert.equal(isClosed, 'false', 'Escape should close menu');

    const activeIdAfterEscape = await page.evaluate(() => document.activeElement?.id);
    assert.equal(activeIdAfterEscape, 'user-menu-button', 'Escape should return focus to avatar button');

    // Re-open and click Account Settings
    await avatarBtn.click();
    await page.waitForTimeout(200);
    const settingsLink = page.locator('a[role="menuitem"]:has-text("Account Settings")');
    await settingsLink.click();
    await page.waitForTimeout(500);

    assert.ok(page.url().includes('/settings'), `URL must be /settings, got ${page.url()}`);
  });

  await t.test('2. /settings layout: Heading is visible and fully inside viewport (not occluded by navbar)', async () => {
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const navBox = await page.locator('header').boundingBox();
    assert.ok(navBox, 'Navbar header must be present');

    const heading = page.locator('h1:has-text("Account & Security Settings")');
    await heading.waitFor({ timeout: 5000 });
    const headingBox = await heading.boundingBox();
    assert.ok(headingBox, 'Settings heading must be present and rendered');

    // Heading must be physically BELOW the navbar bottom
    assert.ok(
      headingBox.y >= navBox.y + navBox.height - 2,
      `Heading top (${headingBox.y}) must be below navbar bottom (${navBox.y + navBox.height})`
    );
  });

  await t.test('3. Profile Update: Edit full name and see navbar update immediately', async () => {
    const updatedName = `Rohit QA ${Math.floor(100 + Math.random() * 900)}`;
    const nameInput = page.locator('#profileName');
    await nameInput.fill(updatedName);

    const saveBtn = page.locator('button:has-text("Save Profile Changes")');
    await saveBtn.click();
    await page.waitForTimeout(1500);

    // Check navbar name text
    const navbarUserName = await page.locator('#user-menu-button span.truncate').textContent();
    assert.ok(
      navbarUserName?.includes(updatedName.slice(0, 8)),
      `Navbar must immediately reflect updated name. Expected ${updatedName}, found ${navbarUserName}`
    );
  });

  await t.test('4. Password Change: Wrong current password shows error; correct current password succeeds', async () => {
    // A. Wrong current password
    await page.locator('#currentPassword').fill('WrongPassword999!');
    await page.locator('#newPassword').fill('SuperSecret123!');
    await page.locator('#confirmPassword').fill('SuperSecret123!');

    const updateBtn = page.locator('button:has-text("Update Password")');
    await updateBtn.click();
    await page.waitForTimeout(1000);

    const errorAlert = page.locator('section[aria-labelledby="password-heading"] div[role="alert"]');
    assert.ok(await errorAlert.isVisible(), 'Error alert must be visible for incorrect current password');

    // B. Correct password change
    await page.locator('#currentPassword').fill('OwnerPassword123!');
    await page.locator('#newPassword').fill('OwnerPassword123!'); // change back/keep same secure
    await page.locator('#confirmPassword').fill('OwnerPassword123!');
    await updateBtn.click();
    await page.waitForTimeout(1500);

    const toastSuccess = page.locator('text=Password changed successfully').first();
    assert.ok(await toastSuccess.isVisible(), 'Success toast must appear on successful password update');
  });

  await t.test('5. Active Device Sessions: "Log Out of All Devices" modal and session maintenance', async () => {
    const logoutAllTrigger = page.locator('button:has-text("Log Out of All Devices")');
    await logoutAllTrigger.click();
    await page.waitForTimeout(300);

    // Check confirmation modal appears
    const modalHeading = page.locator('h3:has-text("Log Out of All Devices")');
    assert.ok(await modalHeading.isVisible(), 'Confirmation modal must appear');

    // Click confirm
    const confirmBtn = page.locator('button:has-text("Confirm Session Invalidation")');
    await confirmBtn.click();
    await page.waitForTimeout(1500);

    // User must remain signed in
    assert.ok(await page.locator('#user-menu-button').isVisible(), 'Current user must remain logged in');
  });

  await t.test('6. Data Deletion: Confirmation requires typing DELETE exactly', async () => {
    const deleteBtn = page.locator('button:has-text("Delete Account & Anonymize Data")');
    await deleteBtn.click();
    await page.waitForTimeout(300);

    const deleteModal = page.locator('h3:has-text("Confirm Permanent Deletion")');
    assert.ok(await deleteModal.isVisible(), 'Deletion modal must open');

    const confirmActionBtn = page.locator('button:has-text("Confirm Account Erasure")');
    assert.equal(await confirmActionBtn.isDisabled(), true, 'Confirm button must be disabled when input is empty');

    const deleteInput = page.locator('#confirmDeleteInput');
    await deleteInput.fill('DEL');
    assert.equal(await confirmActionBtn.isDisabled(), true, 'Confirm button must be disabled if not DELETE');

    await deleteInput.fill('DELETE');
    assert.equal(await confirmActionBtn.isDisabled(), false, 'Confirm button must be enabled when DELETE is typed');

    // Cancel modal to keep test user intact
    await page.locator('button:has-text("Cancel")').last().click();
    await page.waitForTimeout(500);
    const modalCount = await page.locator('h3:has-text("Confirm Permanent Deletion")').count();
    assert.equal(modalCount, 0, 'Modal should close on cancel');
  });

  await t.test('7. Auth Redirects: Logged-out visit to /settings redirects to /login and back; logged-in to /login redirects away', async () => {
    // Clear tokens
    await page.evaluate(() => {
      localStorage.removeItem('cs_token');
      localStorage.removeItem('cs_user_hint');
    });

    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    assert.ok(page.url().includes('/login'), `Unauthenticated visit to /settings must redirect to /login, got ${page.url()}`);
    assert.ok(page.url().includes('redirect=%2Fsettings') || page.url().includes('redirect=/settings'));

    // Log back in
    await page.locator('#loginEmail').fill('owner1@chargeshare.in');
    await page.locator('#loginPassword').fill('OwnerPassword123!');
    await page.locator('button[type="submit"]:has-text("Sign In")').click();
    await page.waitForTimeout(2000);

    assert.ok(page.url().includes('/settings'), `After login, user must return to /settings, got ${page.url()}`);

    // Now visit /login while already logged in
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    assert.ok(!page.url().endsWith('/login'), `Logged-in user visiting /login must be redirected away, got ${page.url()}`);
  });

  await t.test('8. Mobile (360px) & Theme Verification', async () => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Assert zero horizontal overflow at 360px
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 1;
    });
    assert.equal(overflow, false, 'There must be no horizontal overflow at 360px viewport');

    // Test theme toggle button in appearance section
    const lightThemeCard = page.locator('button:has-text("Light Theme")');
    await lightThemeCard.scrollIntoViewIfNeeded();
    await lightThemeCard.click();
    await page.waitForTimeout(400);

    const themeAfterLight = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    assert.equal(themeAfterLight, 'light', 'Theme should switch to light');

    const darkThemeCard = page.locator('button:has-text("Dark Theme")');
    await darkThemeCard.scrollIntoViewIfNeeded();
    await darkThemeCard.click();
    await page.waitForTimeout(400);

    const themeAfterDark = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    assert.equal(themeAfterDark, 'dark', 'Theme should switch back to dark');
  });

  await browser.close();
});
