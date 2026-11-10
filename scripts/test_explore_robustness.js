import { chromium } from '../client/node_modules/@playwright/test/index.mjs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

async function runTests() {
  console.log(`[Test] Launching Playwright Chromium targeting ${BASE_URL}...`);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  let passedCount = 0;
  let failedCount = 0;

  async function runTestCase(name, fn) {
    process.stdout.write(`  ▶ ${name} ... `);
    try {
      await fn();
      console.log('✅ PASSED');
      passedCount++;
    } catch (err) {
      console.log(`❌ FAILED\n    ${err.message}`);
      failedCount++;
    }
  }

  try {
    console.log('\n--- SUITE 1: 8-SECOND SETTLED STABILITY (NO CRASH) ---');

    await runTestCase('Desktop (1280x800) Light Theme - Wait 8s Logged Out', async () => {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        colorScheme: 'light',
      });
      const page = await context.newPage();
      await page.goto(`${BASE_URL}/explore`, { waitUntil: 'domcontentloaded' });

      // Wait 8 seconds (well beyond previous 2-3s crash)
      await page.waitForTimeout(8000);

      // Assert error boundary is NOT triggered
      const errorBoundaryTitle = await page.$("text=Charging View Interrupted");
      if (errorBoundaryTitle) {
        throw new Error('Charging View Interrupted error boundary was triggered!');
      }

      // Assert heading and socket count
      const heading = await page.textContent('h1');
      if (!heading || !heading.includes('Bengaluru Two-Wheeler Bays')) {
        throw new Error(`Expected Bengaluru heading, got: "${heading}"`);
      }

      // Assert charger cards are rendered
      const cards = await page.$$('.rounded-3xl.bg-white, .rounded-3xl.bg-surface');
      if (cards.length === 0) {
        throw new Error('No charger cards rendered');
      }

      // Assert Leaflet map is mounted
      const mapContainer = await page.$('.leaflet-container');
      if (!mapContainer) {
        throw new Error('Leaflet map container not found');
      }

      await context.close();
    });

    await runTestCase('Desktop (1280x800) Dark Theme - Wait 8s Logged Out', async () => {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        colorScheme: 'dark',
      });
      const page = await context.newPage();
      // Set dark theme in localStorage
      await page.addInitScript(() => {
        localStorage.setItem('cs_theme', 'dark');
        document.documentElement.classList.add('dark');
      });
      await page.goto(`${BASE_URL}/explore`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(8000);

      const errorBoundaryTitle = await page.$("text=Charging View Interrupted");
      if (errorBoundaryTitle) {
        throw new Error('Charging View Interrupted error boundary was triggered!');
      }

      const mapContainer = await page.$('.leaflet-container');
      if (!mapContainer) {
        throw new Error('Leaflet map container not found in dark mode');
      }

      await context.close();
    });

    await runTestCase('Mobile (360x780) Light Theme - Wait 8s Logged Out', async () => {
      const context = await browser.newContext({
        viewport: { width: 360, height: 780 },
        isMobile: true,
        hasTouch: true,
      });
      const page = await context.newPage();
      await page.goto(`${BASE_URL}/explore`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(8000);

      const errorBoundaryTitle = await page.$("text=Charging View Interrupted");
      if (errorBoundaryTitle) {
        throw new Error('Charging View Interrupted triggered on mobile!');
      }

      // Check mobile bottom sheet
      const sheetHandle = await page.$('text=Verified Bays in Bengaluru');
      if (!sheetHandle) {
        throw new Error('Mobile bottom sheet summary not found');
      }

      await context.close();
    });

    await runTestCase('Mobile (360x780) Dark Theme - Wait 8s Logged Out', async () => {
      const context = await browser.newContext({
        viewport: { width: 360, height: 780 },
        isMobile: true,
        hasTouch: true,
        colorScheme: 'dark',
      });
      const page = await context.newPage();
      await page.addInitScript(() => {
        localStorage.setItem('cs_theme', 'dark');
        document.documentElement.classList.add('dark');
      });
      await page.goto(`${BASE_URL}/explore`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(8000);

      const errorBoundaryTitle = await page.$("text=Charging View Interrupted");
      if (errorBoundaryTitle) {
        throw new Error('Charging View Interrupted triggered on mobile dark theme!');
      }

      await context.close();
    });

    console.log('\n--- SUITE 2: API ERROR & EDGE CASE MOCKING ---');

    await runTestCase('Mock API: Empty Array -> Shows EmptyState, Never Crashes', async () => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();

      await page.route('**/api/v1/chargers*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, count: 0, total: 0, page: 1, chargers: [] }),
        });
      });

      await page.goto(`${BASE_URL}/explore`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const errorBoundaryTitle = await page.$("text=Charging View Interrupted");
      if (errorBoundaryTitle) {
        throw new Error('Crashed on empty array!');
      }

      const emptyTitle = await page.$("text=No chargers match your criteria");
      if (!emptyTitle) {
        throw new Error('EmptyState title not found');
      }

      await context.close();
    });

    await runTestCase('Mock API: Corrupted & Swapped Coordinates -> Renders Valid Ones, Safe', async () => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();

      const corruptData = {
        success: true,
        chargers: [
          {
            _id: 'bad-1',
            title: 'Corrupt NaN',
            location: { coordinates: [NaN, NaN] },
          },
          {
            _id: 'bad-2',
            title: 'Corrupt Null',
            location: { coordinates: null },
          },
          {
            _id: 'bad-3',
            title: 'Mumbai Outside Geofence',
            location: { coordinates: [72.8258, 19.0596] },
          },
          {
            _id: 'good-swapped',
            title: 'HSR Swapped Latitude Longitude',
            address: 'HSR Sector 2, Bengaluru',
            location: { coordinates: [12.9121, 77.6446] }, // Swapped [lat, lng]
            price: 25,
            powerKW: 3.3,
            status: 'VERIFIED',
          },
          {
            _id: 'good-strings',
            title: 'Indiranagar String Coordinates',
            address: '100ft Road, Indiranagar, Bengaluru',
            location: { coordinates: ['77.6412', '12.9784'] },
            price: '30',
            powerKW: '7.2',
            status: 'VERIFIED',
          },
        ],
      };

      await page.route('**/api/v1/chargers*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(corruptData),
        });
      });

      await page.goto(`${BASE_URL}/explore`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(4000);

      const errorBoundaryTitle = await page.$("text=Charging View Interrupted");
      if (errorBoundaryTitle) {
        throw new Error('Crashed on corrupted coordinates!');
      }

      const validCard = await page.$("text=HSR Swapped Latitude Longitude");
      if (!validCard) {
        throw new Error('Swapped coordinates item was not salvaged and rendered');
      }

      await context.close();
    });

    await runTestCase('Mock API: Missing Fields (no title, address, hostId) -> Renders Defaults', async () => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();

      const sparseData = {
        success: true,
        chargers: [
          {
            _id: 'sparse-1',
            location: { coordinates: [77.5946, 12.9716] },
          },
        ],
      };

      await page.route('**/api/v1/chargers*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(sparseData),
        });
      });

      await page.goto(`${BASE_URL}/explore`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      const errorBoundaryTitle = await page.$("text=Charging View Interrupted");
      if (errorBoundaryTitle) {
        throw new Error('Crashed on missing fields!');
      }

      const defaultTitle = await page.$("text=Bengaluru EV Two-Wheeler Socket");
      if (!defaultTitle) {
        throw new Error('Default title not rendered');
      }

      await context.close();
    });

    await runTestCase('Mock API: 500 Error -> Renders Inline Notice & Retry, No Crash', async () => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();

      await page.route('**/api/v1/chargers*', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Internal Server Error' }),
        });
      });

      await page.goto(`${BASE_URL}/explore`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const errorBoundaryTitle = await page.$("text=Charging View Interrupted");
      if (errorBoundaryTitle) {
        throw new Error('500 Error bubbled to top-level ErrorBoundary!');
      }

      const inlineNotice = await page.$("text=Network Communication Notice");
      if (!inlineNotice) {
        throw new Error('Inline error notice not displayed for 500 status');
      }

      const retryBtn = await page.$("text=Retry Search");
      if (!retryBtn) {
        throw new Error('Retry button not found in inline notice');
      }

      await context.close();
    });

    await runTestCase('Mock API: 401 Unauthorized -> Renders Inline Auth Message, No Crash', async () => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();

      await page.route('**/api/v1/chargers*', (route) => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Unauthorized' }),
        });
      });

      await page.goto(`${BASE_URL}/explore`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const errorBoundaryTitle = await page.$("text=Charging View Interrupted");
      if (errorBoundaryTitle) {
        throw new Error('401 Unauthorized bubbled to top-level ErrorBoundary!');
      }

      const authNotice = await page.$("text=Authentication required to search charging bays.");
      if (!authNotice) {
        throw new Error('Inline 401 notice not displayed');
      }

      await context.close();
    });

    await runTestCase('Mock API: 6-Second Delayed Response -> Skeletons display, Settles cleanly', async () => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();

      await page.route('**/api/v1/chargers*', async (route) => {
        await new Promise((r) => setTimeout(r, 6000));
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            chargers: [
              {
                _id: 'delayed-1',
                title: 'Whitefield Slow Loaded Socket',
                location: { coordinates: [77.7500, 12.9698] },
                price: 25,
                powerKW: 3.3,
                status: 'VERIFIED',
              },
            ],
          }),
        });
      });

      await page.goto(`${BASE_URL}/explore`, { waitUntil: 'domcontentloaded' });

      // Check skeleton exists while waiting
      await page.waitForTimeout(1000);
      const loadingText = await page.$("text=Discovering bays...");
      if (!loadingText) {
        throw new Error('Loading state not shown during delayed response');
      }

      // Wait until response resolves (total ~7s)
      await page.waitForTimeout(6500);

      const errorBoundaryTitle = await page.$("text=Charging View Interrupted");
      if (errorBoundaryTitle) {
        throw new Error('Crashed during slow response handling!');
      }

      const resolvedCard = await page.$("text=Whitefield Slow Loaded Socket");
      if (!resolvedCard) {
        throw new Error('Card not rendered after delayed response');
      }

      await context.close();
    });

  } finally {
    await browser.close();
  }

  console.log(`\n========================================`);
  console.log(`SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log(`========================================`);
  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
