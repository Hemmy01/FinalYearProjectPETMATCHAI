import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (err) => console.log('PAGEERROR:', err.message));

await page.goto(`${BASE}/auth/login`);
await page.fill('input[type="email"]', 'buyer1@hemmykennel.ng');
await page.fill('input[type="password"]', 'Buyer@Lagos2025');
await page.click('button[type="submit"]');
await page.waitForTimeout(2500);

console.log('--- Viewing Bruno (German Shepherd, NGN280k) ---');
await page.goto(`${BASE}/listings/c7f9e88f-0903-4b0e-9076-c732b6051fdb`);
await page.waitForTimeout(2000);

console.log('--- Viewing + saving Bingo (Boerboel, NGN220k) ---');
await page.goto(`${BASE}/listings/54ebf664-c597-4fcf-8212-571b512155b1`);
await page.waitForTimeout(1500);
await page.locator('button:has(svg.lucide-heart)').first().click();
await page.waitForTimeout(1000);

console.log('--- Loading /recommendations ---');
await page.goto(`${BASE}/recommendations`);
await page.waitForTimeout(10000);

const becauseYouViewedHeader = page.locator('h2:has-text("Because you viewed")');
console.log('Because-you-viewed present:', await becauseYouViewedHeader.count() > 0);
if (await becauseYouViewedHeader.count() > 0) console.log('  text:', await becauseYouViewedHeader.textContent());

const similarHeader = page.locator('h2:has-text("Similar to your saved")');
console.log('Similar-to-saved present:', await similarHeader.count() > 0);

const popularHeader = page.locator('h2:has-text("Popular in your area")');
console.log('Popular-in-area present:', await popularHeader.count() > 0);

await page.screenshot({ path: 'verify-contextual2.png', fullPage: true });
await browser.close();
