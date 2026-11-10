// @ts-check
import { test, expect } from '@playwright/test';

const ROUTES = [
  '/',
  '/login',
  '/register',
  '/explore',
  '/about',
  '/contact',
  '/terms',
  '/privacy',
  '/forgot-password',
];

for (const route of ROUTES) {
  test.describe(`Responsive checks for route: ${route}`, () => {
    test('Zero horizontal overflow and responsive geometry', async ({ page }) => {
      // Mock third-party tracking & Razorpay scripts
      await page.route('**/*', (routeReq) => {
        const url = routeReq.request().url();
        if (url.includes('razorpay') || url.includes('clarity') || url.includes('analytics')) {
          routeReq.fulfill({
            status: 200,
            contentType: 'application/javascript',
            body: 'window.Razorpay = function() { return { open: () => {} }; };',
          });
          return;
        }
        routeReq.continue();
      });

      await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(600);

      // (a) Verify document.documentElement.scrollWidth <= window.innerWidth
      const overflowMetrics = await page.evaluate(() => {
        const docWidth = document.documentElement.clientWidth;
        const scrollWidth = document.documentElement.scrollWidth;
        const windowWidth = window.innerWidth;
        return {
          docWidth,
          scrollWidth,
          windowWidth,
          hasOverflow: scrollWidth > windowWidth,
        };
      });

      expect(overflowMetrics.hasOverflow, `Page ${route} has horizontal overflow: scrollWidth ${overflowMetrics.scrollWidth} > windowWidth ${overflowMetrics.windowWidth}`).toBe(false);

      // (b) Verify interactive target touch areas on mobile
      const smallTargets = await page.evaluate(() => {
        const isMobile = window.innerWidth < 768;
        if (!isMobile) return [];
        const interactiveElements = Array.from(document.querySelectorAll('button:not([hidden]), a:not([hidden]), input:not([type="hidden"])'));
        const issues = [];
        for (const el of interactiveElements) {
          const rect = el.getBoundingClientRect();
          // Filter out elements that are invisible or zero size
          if (rect.width === 0 || rect.height === 0 || rect.top > window.innerHeight * 2) continue;
          if (rect.width < 32 || rect.height < 32) {
            issues.push({
              tag: el.tagName,
              text: el.textContent?.trim().slice(0, 30),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            });
          }
        }
        return issues;
      });

      expect(smallTargets.length, `Route ${route} has too small touch targets: ${JSON.stringify(smallTargets.slice(0, 3))}`).toBeLessThanOrEqual(5);
    });
  });
}
