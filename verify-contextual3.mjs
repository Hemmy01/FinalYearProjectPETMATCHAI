import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (err) => console.log('PAGEERROR:', err.message));
page.on('console', (msg) => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });
page.on('response', async (res) => {
  if (res.url().includes('/view') || res.url().includes('/api/matches')) {
    console.log('RESP', res.request().method(), res.url(), res.status());
  }
});

await page.goto(`${BASE}/auth/login`);
await page.fill('input[type="email"]', 'buyer1@hemmykennel.ng');
await page.fill('input[type="password"]', 'Buyer@Lagos2025');
await page.click('button[type="submit"]');
await page.waitForTimeout(2500);

console.log('--- Viewing Bruno ---');
await page.goto(`${BASE}/listings/c7f9e88f-0903-4b0e-9076-c732b6051fdb`);
await page.waitForTimeout(3000);

console.log('--- Viewing + saving Bingo ---');
await page.goto(`${BASE}/listings/54ebf664-c597-4fcf-8212-571b512155b1`);
await page.waitForTimeout(2000);
const heartBtn = page.locator('button:has(svg.lucide-heart)').first();
console.log('heart button count:', await heartBtn.count());
await heartBtn.click();
await page.waitForTimeout(1500);

await browser.close();
