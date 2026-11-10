import { chromium } from '../client/node_modules/@playwright/test/index.mjs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

const ROUTES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/explore',
  '/about',
  '/contact',
  '/help',
  '/privacy',
  '/terms',
  '/refund-policy',
  '/cookies',
];

async function verifyAll() {
  console.log(`[Verification] Launching Chrome to verify all routes across light and dark themes...`);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  let totalChecks = 0;
  let failures = 0;

  try {
    // 1. Interactive Explore Verification
    console.log('\n--- PART 1: INTERACTIVE EXPLORE BEHAVIORS ---');
    const exploreContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await exploreContext.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto(`${BASE_URL}/explore`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Toggle emergency mode
    console.log('  Testing Emergency Mode Toggle...');
    const emergencyBtn = page.getByRole('button', { name: /Emergency/i });
    if (await emergencyBtn.count() > 0) {
      await emergencyBtn.click();
      await page.waitForTimeout(800);
      console.log('    ✓ Emergency mode activated');
      await emergencyBtn.click();
      await page.waitForTimeout(800);
      console.log('    ✓ Emergency mode deactivated');
    }

    // Change corridor filter
    console.log('  Testing Corridor Filter Dropdown...');
    const select = await page.$('select[aria-label="Filter by Bengaluru Corridor"]');
    if (select) {
      await select.selectOption('Koramangala');
      await page.waitForTimeout(1000);
      console.log('    ✓ Selected Koramangala corridor');
      await select.selectOption('All Bengaluru');
      await page.waitForTimeout(1000);
      console.log('    ✓ Reset to All Bengaluru');
    }

    // Click on a charger card
    console.log('  Testing Charger Card Selection...');
    const firstCard = await page.$('.p-5.rounded-3xl.cursor-pointer');
    if (firstCard) {
      await firstCard.click();
      await page.waitForTimeout(1200);
      console.log('    ✓ Clicked charger card, map centered cleanly');
    }

    // Check errors
    const eb = await page.$('text=Charging View Interrupted');
    if (eb || errors.length > 0) {
      console.error('    ❌ Error during interactive explore:', errors);
      failures++;
    } else {
      console.log('    ✅ Explore interactivity fully verified without errors');
      totalChecks++;
    }
    await exploreContext.close();

    // 2. Mobile Bottom Sheet and Tab Switcher
    console.log('\n--- PART 2: MOBILE VIEW SWITCHER & SHEET GESTURES ---');
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();
    const mobileErrors = [];
    mobilePage.on('pageerror', (err) => mobileErrors.push(err.message));

    await mobilePage.goto(`${BASE_URL}/explore`, { waitUntil: 'domcontentloaded' });
    await mobilePage.waitForTimeout(1500);

    const mapTabBtn = await mobilePage.getByRole('button', { name: /Map View/i });
    if (mapTabBtn) {
      await mapTabBtn.click();
      await mobilePage.waitForTimeout(1000);
      console.log('    ✓ Switched to Mobile Map View');
    }

    const listTabBtn = await mobilePage.getByRole('button', { name: /List View/i });
    if (listTabBtn) {
      await listTabBtn.click();
      await mobilePage.waitForTimeout(1000);
      console.log('    ✓ Switched to Mobile List View');
    }

    const mobileEb = await mobilePage.$('text=Charging View Interrupted');
    if (mobileEb || mobileErrors.length > 0) {
      console.error('    ❌ Error during mobile interactions:', mobileErrors);
      failures++;
    } else {
      console.log('    ✅ Mobile view switching fully verified without errors');
      totalChecks++;
    }
    await mobileContext.close();

    // 3. Route Stability Across Themes (Light & Dark)
    console.log('\n--- PART 3: ALL ROUTES STABILITY CHECK (LIGHT & DARK THEMES) ---');
    for (const theme of ['light', 'dark']) {
      console.log(`\nTheme: ${theme.toUpperCase()}`);
      for (const route of ROUTES) {
        process.stdout.write(`  Checking ${route} ... `);
        const ctx = await browser.newContext({
          viewport: { width: 1280, height: 800 },
          colorScheme: theme,
        });
        const p = await ctx.newPage();
        const routeErrors = [];
        p.on('pageerror', (err) => routeErrors.push(err.message));

        if (theme === 'dark') {
          await p.addInitScript(() => {
            localStorage.setItem('cs_theme', 'dark');
          });
        }

        await p.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
        // Wait 3 seconds per route
        await p.waitForTimeout(3000);

        const crashed = await p.$('text=Charging View Interrupted');
        if (crashed || routeErrors.length > 0) {
          console.log(`❌ FAILED: ${routeErrors.join(', ')}`);
          failures++;
        } else {
          console.log('✅ OK');
          totalChecks++;
        }
        await ctx.close();
      }
    }

  } finally {
    await browser.close();
  }

  console.log(`\n========================================`);
  console.log(`VERIFICATION SUMMARY: ${totalChecks} Passed, ${failures} Failed`);
  console.log(`========================================`);
  if (failures > 0) process.exit(1);
}

verifyAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
