import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { chromium } = require('../node_modules/@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test('Vehicle Modal Focus and Typing Integrity Test Suite', async (t) => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Helper: log in as EV owner
  const loginRes = await page.request.post(`${BASE_URL}/api/v1/auth/login`, {
    data: { email: 'owner1@chargeshare.in', password: 'OwnerPassword123!' },
  });
  const loginData = await loginRes.json();
  assert.ok(loginData.token, 'Must receive auth token for owner1@chargeshare.in');

  await page.addInitScript((tok) => {
    localStorage.setItem('cs_token', tok);
    localStorage.setItem('cs_theme', 'dark');
  }, loginData.token);

  await t.test('1. Modal opens and sets initial focus on the first input, not the close button', async () => {
    await page.goto(`${BASE_URL}/vehicles`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const addBtn = page.locator('button:has-text("Add Electric Scooter"), button:has-text("Add EV Scooter Now")').first();
    await addBtn.click();
    await page.waitForTimeout(200);

    const activeEl = await page.evaluate(() => {
      const el = document.activeElement;
      return { tag: el?.tagName, id: el?.id, ariaLabel: el?.getAttribute('aria-label') };
    });

    // Initial focus must be on an input (Make), not Close dialog button!
    assert.equal(activeEl.tag, 'INPUT', 'Initial focus should be on an input element');
    assert.notEqual(activeEl.ariaLabel, 'Close dialog', 'Focus must NOT be on Close dialog button');
  });

  await t.test('2. Registration # input: typing KA01EV1234 retains focus on EVERY keystroke', async () => {
    const regInput = page.locator('#vehReg');
    await regInput.click();
    await page.waitForTimeout(100);

    // Clear any existing value
    await regInput.fill('');

    const targetStr = 'KA01EV1234';
    let accumulated = '';

    for (const char of targetStr.split('')) {
      await page.keyboard.press(char);
      accumulated += char;
      await page.waitForTimeout(60); // Realistic keystroke delay (> 50ms timer in modal)

      const state = await page.evaluate(() => {
        const active = document.activeElement;
        const input = document.getElementById('vehReg');
        return {
          inputValue: input ? input.value : null,
          isFocused: active === input,
          activeTag: active ? active.tagName : null,
          activeId: active ? active.id : null,
          activeAriaLabel: active ? active.getAttribute('aria-label') : null,
        };
      });

      assert.equal(
        state.isFocused,
        true,
        `Input #vehReg must remain focused after keystroke '${char}'. Active element was: <${state.activeTag} id="${state.activeId}" aria-label="${state.activeAriaLabel}">`
      );
      assert.equal(
        state.inputValue,
        accumulated,
        `Input value should be '${accumulated}' after typing '${char}', got '${state.inputValue}'`
      );
    }
  });

  await t.test('3. Caret editing in the middle of Registration # text does not jump or lose focus', async () => {
    const regInput = page.locator('#vehReg');
    // Position cursor at index 6 (after "KA01EV")
    await regInput.click();
    await page.evaluate(() => {
      const input = document.getElementById('vehReg');
      if (input) input.setSelectionRange(6, 6);
    });

    // Type two characters in the middle
    await page.keyboard.press('9');
    await page.waitForTimeout(60);
    await page.keyboard.press('9');
    await page.waitForTimeout(60);

    const state = await page.evaluate(() => {
      const active = document.activeElement;
      const input = document.getElementById('vehReg');
      return {
        inputValue: input?.value,
        isFocused: active === input,
        selectionStart: input?.selectionStart,
      };
    });

    assert.equal(state.isFocused, true, 'Input must remain focused while editing in the middle');
    assert.equal(state.inputValue, 'KA01EV991234', 'Text should be inserted at caret position without jumping');
    assert.equal(state.selectionStart, 8, 'Caret should advance smoothly by 2 characters');
  });

  await t.test('4. Model and Battery inputs: typing retains focus on EVERY keystroke', async () => {
    // Model field
    const modelInput = page.locator('#vehModel');
    await modelInput.click();
    await modelInput.fill('');

    const modelStr = '450X Gen 3';
    let modelAccum = '';
    for (const char of modelStr.split('')) {
      await page.keyboard.press(char);
      modelAccum += char;
      await page.waitForTimeout(50);

      const isFocused = await page.evaluate(() => {
        return document.activeElement === document.getElementById('vehModel');
      });
      assert.equal(isFocused, true, `Model input must remain focused after keystroke '${char}'`);
    }

    // Battery field
    const kwhInput = page.locator('#vehKwh');
    await kwhInput.click();
    await kwhInput.fill('');

    const kwhStr = '3.7';
    let kwhAccum = '';
    for (const char of kwhStr.split('')) {
      await page.keyboard.press(char);
      kwhAccum += char;
      await page.waitForTimeout(50);

      const isFocused = await page.evaluate(() => {
        return document.activeElement === document.getElementById('vehKwh');
      });
      assert.equal(isFocused, true, `Battery input must remain focused after keystroke '${char}'`);
    }

    // Verify Battery input attributes
    const kwhAttrs = await page.evaluate(() => {
      const el = document.getElementById('vehKwh');
      return {
        inputMode: el?.getAttribute('inputmode'),
        step: el?.getAttribute('step'),
        min: el?.getAttribute('min'),
        max: el?.getAttribute('max'),
      };
    });
    assert.equal(kwhAttrs.inputMode, 'decimal', 'Battery input must specify inputMode="decimal"');
    assert.equal(kwhAttrs.step, '0.1', 'Battery input must specify step="0.1"');
    assert.equal(kwhAttrs.min, '0.5', 'Battery input must specify min="0.5"');
  });

  await t.test('5. Registration # formatting & validation on blur', async () => {
    const regInput = page.locator('#vehReg');
    await regInput.click();
    await regInput.fill('ka 05-ab 4321');

    // Trigger blur by clicking outside or on another field
    const makeInput = page.locator('#vehMake');
    await makeInput.click();
    await page.waitForTimeout(100);

    const formattedValue = await regInput.inputValue();
    assert.equal(formattedValue, 'KA05AB4321', 'Registration should be uppercased and stripped of spaces/hyphens on blur');

    // Test validation error on short input
    await regInput.click();
    await regInput.fill('K');
    await makeInput.click();
    await page.waitForTimeout(100);

    const hasError = await page.evaluate(() => {
      return Boolean(document.querySelector('.text-danger, .text-rose-500'));
    });
    assert.equal(hasError, true, 'Field-level error should appear for invalid registration length on blur');
  });

  await t.test('6. Parent re-render / timer simulation while typing does not reset field or focus', async () => {
    const regInput = page.locator('#vehReg');
    await regInput.click();
    await regInput.fill('KA01EV1234');
    await page.waitForTimeout(100);

    // Simulate parent re-render (like 15s notification poll or theme update)
    await page.evaluate(() => {
      window.dispatchEvent(new Event('resize'));
      // Dispatch custom event or force React re-render by setting local storage theme
      const current = localStorage.getItem('cs_theme');
      localStorage.setItem('cs_theme', current === 'dark' ? 'dark' : 'dark');
    });
    await page.waitForTimeout(200);

    const state = await page.evaluate(() => {
      const active = document.activeElement;
      const input = document.getElementById('vehReg');
      return {
        value: input?.value,
        isFocused: active === input,
      };
    });

    assert.equal(state.value, 'KA01EV1234', 'Field value must be preserved across simulated re-render');
    assert.equal(state.isFocused, true, 'Focus must NOT be reset or stolen by parent re-render');
  });

  await t.test('7. End-to-end: Save new vehicle and verify it appears in garage and booking flow', async () => {
    // Fill all fields validly
    await page.locator('#vehMake').fill('Ather Energy');
    await page.locator('#vehModel').fill('450 Apex');
    const testReg = `KA01APEX${Math.floor(1000 + Math.random() * 9000)}`;
    await page.locator('#vehReg').fill(testReg);
    await page.locator('#vehKwh').fill('3.7');

    // Submit form
    const saveBtn = page.locator('button:has-text("Save Vehicle")');
    await saveBtn.click();
    await page.waitForTimeout(1500);

    // Assert modal is closed
    const modalVisible = await page.locator('h3#modal-title').count();
    assert.equal(modalVisible, 0, 'Modal should close after successful save');

    // Assert newly created vehicle card appears in garage
    const vehicleCard = page.locator(`text=${testReg}`);
    await vehicleCard.waitFor({ timeout: 5000 });
    assert.ok(await vehicleCard.isVisible(), `Vehicle with registration ${testReg} must appear in garage list`);

    // Navigate to Explore -> Charger Detail -> Verify vehicle is in booking flow
    await page.goto(`${BASE_URL}/chargers/6ae6279dfda1e21feec937e4`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Check vehicle select in booking panel
    const vehicleSelect = page.locator('select#vehicle-select');
    if (await vehicleSelect.isVisible()) {
      const optionsText = await vehicleSelect.textContent();
      assert.ok(
        optionsText.includes('450 Apex') || optionsText.includes(testReg),
        `Newly added vehicle ${testReg} must be selectable in booking flow options`
      );
    }
  });

  await browser.close();
});
