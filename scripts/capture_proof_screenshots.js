import { chromium } from '../client/node_modules/@playwright/test/index.mjs';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const OUTPUT_DIR = path.resolve('docs/screenshots');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function captureProof() {
  console.log('[Capture Proof] Launching browser...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    // 1. Login
    const loginRes = await page.request.post(`${BASE_URL}/api/v1/auth/login`, {
      data: { email: 'owner1@chargeshare.in', password: 'OwnerPassword123!' },
    });
    const loginData = await loginRes.json();
    await page.addInitScript((tok) => {
      localStorage.setItem('cs_token', tok);
      localStorage.setItem('cs_theme', 'dark');
    }, loginData.token);

    // 2. Open /vehicles and open modal
    await page.goto(`${BASE_URL}/vehicles`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const addBtn = page.locator('button:has-text("Add Electric Scooter"), button:has-text("Add EV Scooter Now")').first();
    await addBtn.click();
    await page.waitForTimeout(400);

    // 3. Type into Registration # in one go
    const regInput = page.locator('#vehReg');
    await regInput.click();
    await page.keyboard.type('KA01EV1234', { delay: 60 });
    await page.waitForTimeout(400);

    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'vehicle-modal-typed-in-one-go.png'),
    });
    console.log('✓ Captured vehicle-modal-typed-in-one-go.png');

    // 4. Fill make, model, kwh, and save
    await page.locator('#vehMake').fill('Ather Energy');
    await page.locator('#vehModel').fill('450X Pro');
    await page.locator('#vehKwh').fill('3.7');
    await page.locator('button:has-text("Save Vehicle")').click();
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'vehicle-saved-in-garage.png'),
    });
    console.log('✓ Captured vehicle-saved-in-garage.png');

    // 5. Navigate to charger detail and capture booking flow
    await page.goto(`${BASE_URL}/chargers/6ae6279dfda1e21feec937e4`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'vehicle-in-booking-flow.png'),
    });
    console.log('✓ Captured vehicle-in-booking-flow.png');
  } finally {
    await browser.close();
  }
}

captureProof().catch((err) => {
  console.error('Capture proof failed:', err);
  process.exit(1);
});
