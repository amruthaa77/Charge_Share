import { chromium } from '../client/node_modules/@playwright/test/index.mjs';

const BASE_URL = 'http://localhost:5173';

async function diagnose() {
  console.log('[Diagnose] Launching Chrome to reproduce input focus bug at /vehicles...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    // 1. Authenticate as EV Owner
    console.log('[Diagnose] Logging in as owner1@chargeshare.in...');
    const loginRes = await page.request.post(`${BASE_URL}/api/v1/auth/login`, {
      data: { email: 'owner1@chargeshare.in', password: 'OwnerPassword123!' },
    });
    const loginData = await loginRes.json();
    if (!loginData.token) {
      throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
    }

    await page.addInitScript((tok) => {
      localStorage.setItem('cs_token', tok);
      localStorage.setItem('cs_theme', 'dark');
    }, loginData.token);

    // 2. Navigate to /vehicles
    await page.goto(`${BASE_URL}/vehicles`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // 3. Click "Add Electric Scooter" button
    console.log('[Diagnose] Opening Add EV Two-Wheeler modal...');
    const addBtn = await page.locator('button:has-text("Add Electric Scooter"), button:has-text("Add EV Scooter Now")').first();
    await addBtn.click();
    await page.waitForTimeout(500);

    // 4. Focus Registration # input
    const regInput = page.locator('#vehReg');
    await regInput.click();
    await page.waitForTimeout(200);

    const initialActive = await page.evaluate(() => {
      const el = document.activeElement;
      return { tag: el?.tagName, id: el?.id, text: el?.textContent?.slice(0, 30), className: el?.className };
    });
    console.log('[Diagnose] Initial active element after click:', initialActive);

    // 5. Type "KA01EV1234" character by character and record activeElement
    const chars = 'KA01EV1234'.split('');
    const history = [];

    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      // Dispatch keyboard press
      await page.keyboard.press(char);
      // Wait small tick (100ms) to allow setTimeout (50ms) in Modal to fire
      await page.waitForTimeout(100);

      const state = await page.evaluate(() => {
        const active = document.activeElement;
        const input = document.getElementById('vehReg');
        return {
          inputValue: input ? input.value : null,
          activeTag: active ? active.tagName : null,
          activeId: active ? active.id : null,
          activeClass: active ? active.className?.slice(0, 40) : null,
          activeAriaLabel: active ? active.getAttribute('aria-label') : null,
          activeText: active ? active.textContent?.slice(0, 30) : null,
          isInputFocused: active === input,
        };
      });

      history.push({
        keystroke: char,
        inputValue: state.inputValue,
        isInputFocused: state.isInputFocused,
        activeTag: state.activeTag,
        activeId: state.activeId,
        activeAriaLabel: state.activeAriaLabel,
        activeText: state.activeText,
      });
      console.log(
        `Keystroke '${char}': inputValue="${state.inputValue}", focused=${state.isInputFocused}, activeTag=${state.activeTag}, activeId=${state.activeId}, activeText="${state.activeText}"`
      );
    }

    console.log('\n--- Diagnostic Keystroke History ---');
    console.table(history);
  } finally {
    await browser.close();
  }
}

diagnose().catch((err) => {
  console.error('[Diagnose] Error:', err);
  process.exit(1);
});
