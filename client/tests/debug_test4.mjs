import { chromium } from '@playwright/test';

async function test4() {
  const browser = await chromium.launch({ headless: true });
  const authPage = await browser.newPage();
  const res = await authPage.request.post('http://localhost:5173/api/v1/auth/login', {
    data: { email: 'owner1@chargeshare.in', password: 'OwnerPassword123!' }
  });
  const data = await res.json();
  const riderToken = data.token;
  await authPage.close();

  const context = await browser.newContext();
  await context.addInitScript(({ token }) => {
    localStorage.setItem('cs_token', token);
    localStorage.setItem('cs_user_hint', JSON.stringify({ name: 'Rider User', role: 'EV_OWNER', email: 'owner1@chargeshare.in' }));
  }, { token: riderToken });

  const page = await context.newPage();
  page.on('console', msg => console.log('LOG:', msg.text()));
  page.on('response', res => {
    if (res.status() >= 400) console.log('HTTP FAIL:', res.status(), res.url());
  });

  await page.goto('http://localhost:5173/admin/login');
  await page.waitForTimeout(600);
  console.log('Page URL initially:', page.url());

  await page.fill('#adminEmail', 'admin@chargeshare.in');
  await page.fill('#adminPassword', 'AdminPassword123!');
  console.log('Clicking submit...');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  console.log('Page URL after submit:', page.url());
  const alerts = await page.$$eval('[role="alert"], .text-rose-700', els => els.map(e => e.textContent));
  console.log('Alerts on page:', alerts);
  await browser.close();
}
test4().catch(console.error);
