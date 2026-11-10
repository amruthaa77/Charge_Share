// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Explore Page Crash Immunity and Robustness', () => {
  test('Settled 8-second stability: renders cleanly without crashing on desktop', async ({ page }) => {
    await page.goto('/explore', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);

    const errorBoundary = await page.$('text=Charging View Interrupted');
    expect(errorBoundary).toBeNull();

    const heading = await page.textContent('h1');
    expect(heading).toContain('Bengaluru Two-Wheeler Bays');

    const map = await page.$('.leaflet-container');
    expect(map).not.toBeNull();
  });

  test('Settled 8-second stability: renders cleanly without crashing on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/explore', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);

    const errorBoundary = await page.$('text=Charging View Interrupted');
    expect(errorBoundary).toBeNull();

    const summary = await page.$('text=Verified Bays in Bengaluru');
    expect(summary).not.toBeNull();
  });

  test('Mock API empty array displays graceful EmptyState', async ({ page }) => {
    await page.route('**/api/v1/chargers*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, count: 0, total: 0, page: 1, chargers: [] }),
      });
    });

    await page.goto('/explore', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const errorBoundary = await page.$('text=Charging View Interrupted');
    expect(errorBoundary).toBeNull();

    const empty = await page.$('text=No chargers match your criteria');
    expect(empty).not.toBeNull();
  });

  test('Mock API 500 error displays inline error notice and does not trigger root ErrorBoundary', async ({ page }) => {
    await page.route('**/api/v1/chargers*', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error' }),
      });
    });

    await page.goto('/explore', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const errorBoundary = await page.$('text=Charging View Interrupted');
    expect(errorBoundary).toBeNull();

    const inlineNotice = await page.$('text=Network Communication Notice');
    expect(inlineNotice).not.toBeNull();
  });
});
